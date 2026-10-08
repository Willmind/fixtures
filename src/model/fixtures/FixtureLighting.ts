import * as THREE from "three";
import type { Point } from "../plan.ts";
import { ceilingLighting } from "../arrangements.ts";
import type { FixtureOptions, LightingMode } from "../options.ts";
import type { FixtureBuilderContext } from "./context.ts";

type BuilderContext = Pick<FixtureBuilderContext, "at" | "box" | "material" | "tagRoom"> & {
  materials: Pick<FixtureBuilderContext["materials"], "steel">;
};


/** Circuit state survives view and room changes; only presets/commands reset it. */
export class FixtureLighting {
  private lightingMode?: LightingMode;
  private lightCommandRevision?: number;
  private bedsideLamps: { light: THREE.PointLight; shade: THREE.MeshStandardMaterial;
    bulb: THREE.MeshStandardMaterial; on: boolean }[] = [];
  private fixedLights: { group: THREE.Group; light: THREE.PointLight;
    surface: THREE.MeshStandardMaterial; power: number; on: boolean; ceiling: boolean }[] = [];
  private readonly ctx: BuilderContext;
  private readonly parent: THREE.Group;
  constructor(ctx: BuilderContext, parent: THREE.Group) {
    this.ctx = ctx;
    this.parent = parent;
    this.buildCeilingLights();
  }
  update(options: FixtureOptions) {
    // Only a mode change applies the preset. Room selection and other settings
    // must preserve any lights the user has manually switched off.
    if (this.lightingMode !== options.lightingMode) {
      this.lightingMode = options.lightingMode;
      for (const lamp of [...this.bedsideLamps, ...this.fixedLights]) {
        lamp.on = options.lightingMode === "night";
      }
    }
    if (options.lightCommand && options.lightCommand.revision !== this.lightCommandRevision) {
      this.lightCommandRevision = options.lightCommand.revision;
      for (const lamp of [...this.bedsideLamps, ...this.fixedLights]) {
        lamp.on = options.lightCommand.on;
      }
    }
    for (const lamp of this.fixedLights) {
      if (lamp.ceiling) lamp.group.position.y = options.wallHeight;
      // Keep the top-down floor plan clear; light state survives view changes.
      lamp.group.visible = options.view !== "plan";
    }
    this.syncLighting();
  }

  private buildCeilingLights() {
    const casing = this.ctx.material({ color: "#f5f3ee", roughness: 0.65, side: THREE.DoubleSide });
    const recess = this.ctx.material({ color: "#424546", roughness: 0.8, side: THREE.DoubleSide });
    for (const config of ceilingLighting) {
      const center: Point = [
        config.fixtures.reduce((sum, [x]) => sum + x, 0) / config.fixtures.length,
        config.fixtures.reduce((sum, [, z]) => sum + z, 0) / config.fixtures.length,
      ];
      const group = this.ctx.at(this.parent, center);
      group.name = `${config.id}-ceiling-light`;
      const surface = this.ctx.material({ color: "#eee9dd", roughness: 0.6, side: THREE.DoubleSide,
        emissive: config.color, emissiveIntensity: 0 });
      const add = (parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, y: number) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = y;
        parent.add(mesh);
        return mesh;
      };
      for (const [x, z] of config.fixtures) {
        const fixture = new THREE.Group();
        fixture.position.set(x - center[0], 0, z - center[1]);
        group.add(fixture);
        if (config.kind === "panel") {
          // Thin frame and diffuser keep the light visible in the roofless view.
          for (const side of [-1, 1]) {
            this.ctx.box(fixture, [0.50, 0.055, 0.025], [0, -0.0275, side * 0.1375], casing, 0.004);
            this.ctx.box(fixture, [0.025, 0.055, 0.25], [side * 0.2375, -0.0275, 0], casing, 0.004);
          }
          this.ctx.box(fixture, [0.45, 0.012, 0.25], [0, -0.049, 0], surface, 0.004);
        } else if (config.kind === "pendant") {
          add(fixture, new THREE.CylinderGeometry(0.075, 0.075, 0.035, 24), casing, -0.0175);
          add(fixture, new THREE.CylinderGeometry(0.003, 0.003, 0.65, 8), this.ctx.materials.steel, -0.36);
          add(fixture, new THREE.CylinderGeometry(0.08, 0.23, 0.18, 32, 1, true), casing, -0.77);
          const diffuser = add(fixture, new THREE.CircleGeometry(0.215, 32), surface, -0.858);
          diffuser.rotation.x = Math.PI / 2;
        } else {
          const radius = config.kind === "downlights" ? 0.075 : 0.20;
          add(fixture, new THREE.CylinderGeometry(radius, radius, 0.05, 32, 1, true), casing, -0.025);
          const rim = add(fixture, new THREE.RingGeometry(radius * 0.80, radius, 32), casing, -0.004);
          rim.rotation.x = Math.PI / 2;
          if (config.kind === "downlights") {
            const inner = add(fixture, new THREE.RingGeometry(radius * 0.58, radius * 0.81, 32), recess, -0.028);
            inner.rotation.x = Math.PI / 2;
          }
          const diffuser = add(fixture, new THREE.CircleGeometry(radius * (config.kind === "downlights" ? 0.60 : 0.81), 32), surface, -0.048);
          diffuser.rotation.x = Math.PI / 2;
        }
      }
      // Share one non-shadow-casting light per circuit to keep mobile preview
      // costs bounded; this is a layout preview, not a photometric simulation.
      const light = new THREE.PointLight(config.color, 0, 5, 2);
      light.visible = false;
      light.position.y = config.kind === "pendant" ? -0.90 : -0.10;
      group.add(light);
      this.registerCircuit(group, light, surface, config.power, config.roomId, true);

    }
  }

  private registerCircuit(group: THREE.Group, light: THREE.PointLight, surface: THREE.MeshStandardMaterial,
    power: number, roomId: string, ceiling: boolean, title?: string) {
    const index = this.fixedLights.length;
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.userData.ceilingLightIndex = index;
        if (title) object.userData.fixtureTitle = title;
      }
    });
    this.ctx.tagRoom(group, roomId);
    this.fixedLights.push({ group, light, surface, power, on: false, ceiling });
  }

  addTaskLight(parent: THREE.Group, config: { name: string; title: string; roomId: string;
    position: [number, number, number]; kind: "bar" | "desk"; length?: number }) {
    const group = new THREE.Group();
    group.name = config.name;
    group.position.set(...config.position);
    parent.add(group);
    const casing = this.ctx.material({ color: "#eeeae2", roughness: 0.6 });
    const surface = this.ctx.material({ color: "#fff4dd", roughness: 0.45,
      emissive: "#ffe5be", emissiveIntensity: 0 });
    let diffuser: THREE.Mesh;
    const light = new THREE.PointLight("#ffe5be", 0, config.kind === "desk" ? 1.8 : 2, 2);
    light.visible = false;
    if (config.kind === "desk") {
      this.ctx.box(group, [0.15, 0.025, 0.12], [0, 0.0125, 0], casing, 0.014);
      this.ctx.box(group, [0.018, 0.28, 0.018], [0, 0.165, 0], this.ctx.materials.steel, 0.004);
      this.ctx.box(group, [0.20, 0.018, 0.045], [0.09, 0.31, 0.015], casing, 0.005);
      this.ctx.box(group, [0.12, 0.03, 0.085], [0.17, 0.295, 0.025], casing, 0.009);
      diffuser = this.ctx.box(group, [0.10, 0.005, 0.065], [0.17, 0.2775, 0.025], surface, 0.002);
      light.position.set(0.17, 0.245, 0.025);
    } else {
      const length = config.length ?? 0.6;
      this.ctx.box(group, [length, 0.05, 0.055], [0, 0, 0], casing, 0.006);
      diffuser = this.ctx.box(group, [length - 0.025, 0.024, 0.008], [0, 0, 0.030], surface, 0.003);
      light.position.set(0, -0.03, 0.1);
    }
    // One light per strip; no new shadows or animation loop.
    diffuser.userData.fixtureHintPriority = 1;
    diffuser.castShadow = false;
    group.add(light);
    this.registerCircuit(group, light, surface, config.kind === "desk" ? 0.45 : 0.35,
      config.roomId, false, config.title);
  }

  addBedside(cabinet: THREE.Group, roomId: string) {
    const lamp = new THREE.Group();
    lamp.name = `${roomId}-clickable-bedside-lamp`;
    cabinet.add(lamp);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.024, 24), this.ctx.materials.steel);
    base.position.y = 0.532; lamp.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.23, 12), this.ctx.materials.steel);
    stem.position.y = 0.659; lamp.add(stem);
    const shadeMaterial = this.ctx.material({ color: "#eee3ce", roughness: 0.95,
      side: THREE.DoubleSide, emissive: "#ffd79b", emissiveIntensity: 0 });
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.17, 0.24, 32, 1, true), shadeMaterial);
    shade.position.y = 0.85; lamp.add(shade);
    const bulbMaterial = this.ctx.material({ color: "#fff3db", roughness: 0.3,
      emissive: "#ffe0a6", emissiveIntensity: 0 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), bulbMaterial);
    bulb.position.y = 0.78; lamp.add(bulb);
    const light = new THREE.PointLight("#ffd49b", 0, 2.8, 2);
    light.visible = false;
    light.position.set(0, 0.76, 0); lamp.add(light);
    const index = this.bedsideLamps.length;
    lamp.traverse((object) => {
      if (object instanceof THREE.Mesh) object.userData.bedsideLampIndex = index;
    });
    this.bedsideLamps.push({ light, shade: shadeMaterial, bulb: bulbMaterial, on: false });
  }

  toggleCeilingLight(object: THREE.Object3D) {
    const index = object.userData.ceilingLightIndex;
    if (typeof index !== "number" || !this.fixedLights[index]) return false;
    const lamp = this.fixedLights[index];
    lamp.on = !lamp.on;
    this.syncLighting();
    return true;
  }

  isLightOn(object: THREE.Object3D) {
    const bedside = object.userData.bedsideLampIndex;
    return typeof bedside === "number" ? this.bedsideLamps[bedside]?.on
      : this.fixedLights[object.userData.ceilingLightIndex]?.on;
  }

  get state() {
    const lamps = [...this.bedsideLamps, ...this.fixedLights];
    const count = lamps.filter((lamp) => lamp.on).length;
    return { on: lamps.length > 0 && count === lamps.length, mixed: count > 0 && count < lamps.length };
  }

  toggleBedsideLamp(object: THREE.Object3D) {
    const index = object.userData.bedsideLampIndex;
    if (typeof index !== "number" || !this.bedsideLamps[index]) return false;
    const lamp = this.bedsideLamps[index];
    lamp.on = !lamp.on;
    this.syncLighting();
    return true;
  }

  private syncLighting() {
    const night = this.lightingMode === "night";
    for (const lamp of this.bedsideLamps) {
      lamp.light.visible = lamp.on && this.parent.visible;
      lamp.light.intensity = lamp.light.visible ? (night ? 5 : 2.5) : 0;
      lamp.shade.emissiveIntensity = lamp.on ? 0.45 : 0;
      lamp.bulb.emissiveIntensity = lamp.on ? 2 : 0;
    }
    for (const lamp of this.fixedLights) {
      lamp.light.visible = lamp.on && lamp.group.visible && this.parent.visible;
      lamp.light.intensity = lamp.light.visible ? lamp.power * (night ? 5 : 1) : 0;
      lamp.surface.emissiveIntensity = lamp.on ? 1.1 : 0;
    }
  }
}

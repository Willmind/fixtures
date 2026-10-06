import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { defaults, modelCenter } from "./plan";
import type { Point } from "./plan";
import {
  balconyRoofs,
  balconyChoices,
  balconyWindowRuns,
  bathroomFittings,
  bedroomBeds,
  bedroomAirConditioners,
  curtainColors,
  diningFurniture,
  furnitureSize,
  homeOfficeFurniture,
  kitchenFurniture,
  livingLayouts,
  livingAirConditioner,
  livingPlacement,
  previewPalette,
  roomCurtains,
  utilityEquipment,
} from "./arrangements";
import type { BalconyId, BalconyModes, CurtainColor, LayoutPreview } from "./arrangements";
import { sofaBody, sofaSupport, televisionMounts, televisionParts, televisionWallBackdrop } from "./furniture";
import type { BoxPart, TelevisionMount } from "./furniture";
import { createSlidingCurtainPanel, createCurtainWeave, CurtainTransition } from "./curtains";
import { applySurfaceUVs, createTileSurface } from "./finishes";

export type FixtureOptions = {
  layout: LayoutPreview;
  curtainColor: CurtainColor;
  televisionMount: TelevisionMount;
  balconyRoofs: boolean;
  balconyModes: BalconyModes;
  equipment: boolean;
  cutaway: boolean;
  view: "perspective" | "plan";
  wallHeight: number;
  labels: boolean;
};

/** Lightweight, reusable preview objects. Switching layouts never rebuilds meshes. */
export class HomeFixtures {
  readonly group = new THREE.Group();
  private roofs = new THREE.Group();
  private equipment = new THREE.Group();
  private furnishings = new THREE.Group();
  private hoodChimney?: THREE.Mesh;
  private curtains: {
    group: THREE.Group;
    panels: THREE.Mesh[];
    hooks: { mesh: THREE.Mesh; openX: number; closedX: number }[];
    transition: CurtainTransition;
  }[] = [];
  private airConditioners: { unit: THREE.Group; backdrop: THREE.Mesh }[] = [];
  private layouts = new Map<LayoutPreview, THREE.Group>();
  private enclosures = new Map<BalconyId, THREE.Group>();
  private televisions: { mount: TelevisionMount; group: THREE.Group }[] = [];
  private televisionBackdrops: THREE.Mesh[] = [];
  private mirrorBackdrops: THREE.Mesh[] = [];
  private televisionLabels: CSS2DObject[] = [];
  private labels: CSS2DObject[] = [];
  private equipmentLabels: CSS2DObject[] = [];
  private equipmentPlanLabel?: CSS2DObject;
  private materials = new Set<THREE.Material>();
  private textures = new Set<THREE.Texture>();
  private roofMaterial = this.material({ color: "#d1d0ca", roughness: 0.95 });
  private cabinetMaterial = this.material({ color: previewPalette.tvCabinet, roughness: 0.9 });
  private sofaMaterial = this.material({ color: previewPalette.sofa, roughness: 1 });
  private cushionMaterial = this.material({ color: previewPalette.sofaCushion, roughness: 1 });
  private whiteMaterial = this.material({ color: "#eeeae2", roughness: 0.7 });
  private darkMaterial = this.material({ color: "#38434a", roughness: 0.45 });
  private computerScreenMaterial = this.material({
    color: "#435e73", roughness: 0.3, emissive: "#182d40", emissiveIntensity: 0.25,
  });
  private supportMaterial = this.material({ color: "#343331", roughness: 0.85 });
  private chairMeshMaterial = this.makeChairMeshMaterial();
  private woodMaterial = this.material({ color: previewPalette.lightWalnut, roughness: 0.85 });
  private beddingMaterial = this.material({ color: "#f1ede4", roughness: 1 });
  private blanketMaterial = this.material({ color: "#a7b2ae", roughness: 1 });
  private stoneMaterial = this.material({ color: "#dedbd4", roughness: 0.75 });
  private wetFloorMaterial = this.makeTileMaterial(false);
  private wetWallMaterial = this.makeTileMaterial(true);
  private ceramicMaterial = this.material({ color: "#f5f5f0", roughness: 0.25 });
  private steelMaterial = this.material({ color: "#7c8385", roughness: 0.35, metalness: 0.7 });
  private mirrorMaterial = this.material({ color: "#b8cdd3", roughness: 0.08, metalness: 0.45 });
  private curtainWeave = createCurtainWeave();
  private curtainMaterial = this.makeCurtainMaterial();
  private backdropMaterial = this.material({ color: previewPalette.wall, roughness: 0.96 });
  private windowFrameMaterial = this.material({ color: "#46565b", roughness: 0.6, metalness: 0.25 });
  private windowGlassMaterial = this.material({
    color: "#a8c5cf", roughness: 0.2, transparent: true, opacity: 0.24,
    depthWrite: false, side: THREE.DoubleSide,
  });
  private showerGlassMaterial = this.material({
    color: "#c5dde0", roughness: 0.14, transparent: true, opacity: 0.2,
    depthWrite: false, side: THREE.DoubleSide,
  });

  constructor() {
    this.group.name = "balcony-roofs-and-layout-previews";
    this.group.add(this.roofs, this.equipment, this.furnishings);
    this.buildRoofs();
    this.buildEnclosures();
    for (const layout of livingLayouts) {
      const group = new THREE.Group();
      group.name = layout.id;
      this.group.add(group);
      this.layouts.set(layout.id, group);
      const placement = livingPlacement(layout.id);
      const tv = this.at(group, placement.tv.center, placement.tv.rotation);
      const sofa = this.at(group, placement.sofa.center, placement.sofa.rotation);
      this.buildTelevision(tv);
      this.buildSofa(sofa);
      this.televisionLabels.push(this.label(tv, "电视 / 电视柜", 1.55, "tv"));
      this.label(sofa, "沙发", 1.0, "sofa");
      this.tagRoom(group, "living");
    }
    this.buildEquipment();
    this.buildRoomFurnishings();
  }

  private material(options: THREE.MeshStandardMaterialParameters) {
    const material = new THREE.MeshStandardMaterial(options);
    this.materials.add(material);
    return material;
  }

  private makeCurtainMaterial() {
    const material = new THREE.MeshPhysicalMaterial({
      color: curtainColors[0].color, roughness: 0.96, metalness: 0,
      sheen: 0.65, sheenColor: curtainColors[0].sheen, sheenRoughness: 0.9,
      bumpMap: this.curtainWeave, bumpScale: 0.0006, vertexColors: true,
    });
    this.materials.add(material);
    return material;
  }

  private makeChairMeshMaterial() {
    const data = new Uint8Array(8 * 8 * 4);
    for (let index = 0; index < 64; index++) {
      data.set([255, 255, 255, index % 8 < 2 || Math.floor(index / 8) < 2 ? 255 : 0], index * 4);
    }
    const texture = new THREE.DataTexture(data, 8, 8);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(64, 72);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    this.textures.add(texture);
    return this.material({ color: "#535a5b", map: texture, alphaTest: 0.25, side: THREE.DoubleSide, roughness: 0.95 });
  }

  private makeTileMaterial(wall: boolean) {
    const surface = createTileSurface("white", wall);
    this.textures.add(surface.map).add(surface.bumpMap);
    return this.material({ color: "#ffffff", ...surface });
  }

  private at(parent: THREE.Group, [x, z]: Point, rotation = 0) {
    const group = new THREE.Group();
    group.position.set(x - modelCenter[0], 0, z - modelCenter[1]);
    group.rotation.y = rotation;
    parent.add(group);
    return group;
  }

  private box(
    parent: THREE.Group, size: [number, number, number],
    position: [number, number, number], material: THREE.Material | THREE.Material[], radius = 0,
  ) {
    const geometry = radius
      ? new RoundedBoxGeometry(...size, 2, radius)
      : new THREE.BoxGeometry(...size);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    if ((Array.isArray(material) ? material : [material]).some((item) => item === this.wetWallMaterial || item === this.wetFloorMaterial)) {
      parent.updateWorldMatrix(true, false);
      mesh.updateMatrix();
      applySurfaceUVs(geometry, new THREE.Matrix4().multiplyMatrices(parent.matrixWorld, mesh.matrix));
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private label(parent: THREE.Group, text: string, y: number, kind: string) {
    const element = document.createElement("span");
    element.className = `fixture-label fixture-label-${kind}`;
    element.textContent = text;
    const label = new CSS2DObject(element);
    label.position.y = y;
    parent.add(label);
    this.labels.push(label);
    return label;
  }

  private tagRoom(group: THREE.Group, roomId: string) {
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) object.userData.roomId = roomId;
    });
  }

  private buildRoofs() {
    for (const roof of balconyRoofs) {
      const group = this.at(this.roofs, roof.center);
      const slab = this.box(
        group, [roof.width, roof.thickness, roof.depth],
        [0, roof.thickness / 2, 0], this.roofMaterial,
      );
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: "#91958e", transparent: true, opacity: 0.6,
      });
      this.materials.add(edgeMaterial);
      slab.add(new THREE.LineSegments(new THREE.EdgesGeometry(slab.geometry), edgeMaterial));
      this.tagRoom(group, roof.roomId);
    }
  }

  private buildTelevision(group: THREE.Group) {
    const size = furnitureSize.tvCabinet;
    this.box(group, [size.width, size.height, size.depth],
      [0, size.height / 2, 0], this.cabinetMaterial, 0.025);
    for (const { id: mount } of televisionMounts) {
      const television = new THREE.Group();
      television.name = `television-${mount}`;
      group.add(television);
      this.televisions.push({ mount, group: television });
      const parts = televisionParts[mount];
      this.part(television, parts.screen, this.darkMaterial);
      for (const part of parts.supports) this.part(television, part, this.darkMaterial);
      if (mount === "wall") {
        this.televisionBackdrops.push(this.part(television, televisionWallBackdrop, this.backdropMaterial));
      }
    }
  }

  private part(parent: THREE.Group, part: BoxPart, material: THREE.Material) {
    return this.box(parent, part.size, part.position, material, part.radius);
  }

  private buildEnclosures() {
    for (const balcony of balconyChoices) {
      const group = new THREE.Group();
      group.name = `${balcony.id}-enclosure-preview`;
      this.group.add(group);
      this.enclosures.set(balcony.id, group);
      for (const run of balconyWindowRuns.filter((item) => item.roomId === balcony.id)) {
        const frame = this.at(group, run.from, run.rotation);
        // Unit-height frames scale up to the roof without rebuilding geometry.
        for (const y of [0.006, 0.994]) {
          this.box(frame, [run.length, 0.012, 0.065],
            [run.length / 2, y, 0], this.windowFrameMaterial);
        }
        // One uninterrupted pane per exterior face, with no middle mullions
        // or railing across the view. Frame and glazing meet the floor/roof.
        for (const x of [0, run.length]) {
          this.box(frame, [0.045, 1, 0.065],
            [x, 0.5, 0], this.windowFrameMaterial);
        }
        const pane = new THREE.Mesh(
          new THREE.PlaneGeometry(run.length - 0.045, 0.976), this.windowGlassMaterial,
        );
        pane.position.set(run.length / 2, 0.5, 0);
        frame.add(pane);
      }
      this.tagRoom(group, balcony.id);
    }
  }

  private buildSofa(group: THREE.Group) {
    const { width, depth, height } = furnitureSize.sofa;
    this.part(group, sofaSupport, this.supportMaterial);
    this.part(group, sofaBody, this.sofaMaterial);
    this.box(group, [width, height - 0.2, 0.2],
      [0, (height + 0.2) / 2, -depth / 2 + 0.1], this.sofaMaterial, 0.06);
    for (const x of [-width / 2 + 0.1, width / 2 - 0.1]) {
      this.box(group, [0.2, 0.36, depth], [x, 0.43, 0], this.sofaMaterial, 0.05);
    }
    for (const x of [-0.5, 0.5]) {
      this.box(group, [0.96, 0.16, 0.65], [x, 0.43, 0.1], this.cushionMaterial, 0.05);
      this.box(group, [0.95, 0.34, 0.12], [x, 0.62, -0.23], this.cushionMaterial, 0.04);
    }
  }

  private buildEquipment() {
    const { washer: washerPosition, heater: heaterPosition } = utilityEquipment;
    const washer = this.at(this.equipment, washerPosition.center, washerPosition.rotation);
    this.box(washer, [0.6, 0.85, 0.62], [0, 0.425, 0], this.whiteMaterial, 0.025);
    const door = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 24), this.darkMaterial);
    door.rotation.x = Math.PI / 2;
    door.position.set(0, 0.41, 0.32);
    washer.add(door);
    this.box(washer, [0.44, 0.055, 0.02], [0, 0.75, 0.315], this.darkMaterial);
    this.equipmentLabels.push(this.label(washer, "洗衣机", 1.0, "equipment"));
    this.equipmentPlanLabel = this.label(washer, "洗衣机 / 热水器", 1.0, "equipment");
    // Overhead projection collapses the two heights. Use one label above the zone.
    this.equipmentPlanLabel.center.set(0.5, 2);

    const heater = this.at(this.equipment, heaterPosition.center, heaterPosition.rotation);
    // Only marks the confirmed kitchen-side zone; device type/mounting is not finalized.
    this.box(heater, [0.43, 0.65, 0.26], [0, 1.85, 0], this.whiteMaterial, 0.035);
    this.box(heater, [0.16, 0.08, 0.015], [0, 1.68, 0.14], this.darkMaterial);
    this.equipmentLabels.push(this.label(heater, "热水器位置", 2.33, "equipment"));
    this.buildRobotVacuum();
    this.tagRoom(this.equipment, utilityEquipment.roomId);
  }

  private buildRobotVacuum() {
    const { center, rotation, radius } = utilityEquipment.robot;
    const robot = this.at(this.equipment, center, rotation);
    robot.name = "utility-robot-vacuum-and-dock";
    for (const [r, height, y, material] of [
      [radius, 0.075, 0.05, this.whiteMaterial],
      [radius + 0.002, 0.017, 0.031, this.darkMaterial],
      [radius - 0.014, 0.006, 0.09, this.whiteMaterial],
      [0.043, 0.026, 0.103, this.darkMaterial],
      [0.039, 0.005, 0.118, this.whiteMaterial],
    ] as const) {
      const part = new THREE.Mesh(new THREE.CylinderGeometry(r, r, height, 40), material);
      part.position.y = y;
      part.castShadow = part.receiveShadow = true;
      robot.add(part);
    }
    for (const x of [-0.13, 0.13]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.022, 12), this.supportMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.025, 0);
      robot.add(wheel);
    }
    this.box(robot, [0.04, 0.004, 0.018], [0, 0.096, 0.09], this.darkMaterial, 0.006);
    this.box(robot, [0.3, 0.12, 0.1], [0, 0.06, -0.23], this.whiteMaterial, 0.02);
    this.box(robot, [0.22, 0.052, 0.008], [0, 0.055, -0.178], this.darkMaterial, 0.012);
    this.equipmentLabels.push(this.label(robot, "扫地机器人", 0.29, "equipment"));
  }

  private buildRoomFurnishings() {
    this.furnishings.name = "bedroom-kitchen-bathroom-dining-preview";
    for (const bed of bedroomBeds) {
      const group = this.at(this.furnishings, bed.center, bed.rotation);
      group.name = `${bed.roomId}-bed`;
      this.buildBed(group, bed.width);
      this.tagRoom(group, bed.roomId);
    }
    for (const fitting of bathroomFittings) {
      const vanity = this.at(this.furnishings, fitting.vanity.center, fitting.vanity.rotation);
      vanity.name = `${fitting.roomId}-basin-and-mirror`;
      this.buildVanity(vanity);
      this.tagRoom(vanity, fitting.roomId);
      const toilet = this.at(this.furnishings, fitting.toilet.center, fitting.toilet.rotation);
      toilet.name = `${fitting.roomId}-toilet`;
      this.buildToilet(toilet);
      this.tagRoom(toilet, fitting.roomId);
      const shower = this.at(this.furnishings, fitting.shower.center, fitting.shower.rotation);
      shower.name = `${fitting.roomId}-shower`;
      this.buildShower(shower);
      this.tagRoom(shower, fitting.roomId);
      const enclosure = this.at(this.furnishings, fitting.enclosure.center);
      enclosure.name = `${fitting.roomId}-wet-area-and-glass-door`;
      this.buildShowerEnclosure(enclosure, fitting.enclosure);
      this.tagRoom(enclosure, fitting.roomId);
    }
    this.buildKitchen();
    this.buildHomeOffice();
    this.buildDining();
    this.buildCurtains();
    this.buildAirConditioners();
  }

  private buildBed(group: THREE.Group, width: number) {
    // Recessed plinth touches the floor; mattress and textiles rest on the frame.
    this.box(group, [width - 0.14, 0.15, 1.85], [0, 0.075, 0.02], this.supportMaterial, 0.025);
    this.box(group, [width + 0.1, 0.2, 2.1], [0, 0.24, 0], this.woodMaterial, 0.04);
    this.box(group, [width, 0.22, 2], [0, 0.44, 0], this.beddingMaterial, 0.07);
    this.box(group, [width + 0.12, 0.96, 0.12], [0, 0.48, -1.06], this.woodMaterial, 0.045);
    this.box(group, [width + 0.015, 0.045, 1.26], [0, 0.567, 0.35], this.blanketMaterial, 0.02);
    const pillowWidth = width >= 1.5 ? width / 2 - 0.12 : 0.64;
    const pillows = width >= 1.5 ? [-width / 4, width / 4] : [0];
    for (const x of pillows) {
      this.box(group, [pillowWidth, 0.12, 0.38], [x, 0.60, -0.66], this.beddingMaterial, 0.055);
    }
  }

  private buildToilet(group: THREE.Group) {
    this.box(group, [0.27, 0.25, 0.37], [0, 0.125, 0.04], this.ceramicMaterial, 0.06);
    this.box(group, [0.40, 0.73, 0.19], [0, 0.365, -0.24], this.ceramicMaterial, 0.045);
    this.box(group, [0.075, 0.012, 0.04], [0, 0.735, -0.24], this.steelMaterial, 0.005);
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), this.ceramicMaterial);
    bowl.scale.set(0.22, 0.15, 0.30);
    bowl.position.set(0, 0.31, 0.07);
    bowl.castShadow = true;
    bowl.receiveShadow = true;
    group.add(bowl);
    const opening = new THREE.Mesh(new THREE.CircleGeometry(0.15, 32), this.darkMaterial);
    opening.rotation.x = -Math.PI / 2;
    opening.scale.y = 1.35;
    opening.position.set(0, 0.463, 0.07);
    group.add(opening);
    const seat = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 32), this.ceramicMaterial);
    seat.rotation.x = -Math.PI / 2;
    seat.scale.y = 1.35;
    seat.position.set(0, 0.467, 0.07);
    seat.castShadow = true;
    seat.receiveShadow = true;
    group.add(seat);
  }

  private buildAirConditioners() {
    for (const placement of bedroomAirConditioners) {
      const group = this.at(this.furnishings, placement.center, placement.rotation);
      group.name = `${placement.roomId}-wall-air-conditioner`;
      const unit = new THREE.Group();
      group.add(unit);
      this.box(unit, [0.86, 0.29, 0.21], [0, 0, 0], this.whiteMaterial, 0.055);
      this.box(unit, [0.69, 0.055, 0.015], [0, -0.075, 0.103], this.darkMaterial, 0.015);
      this.box(unit, [0.67, 0.013, 0.035], [0, -0.08, 0.117], this.whiteMaterial, 0.005);
      this.box(unit, [0.04, 0.017, 0.005], [0.29, 0.025, 0.108], this.mirrorMaterial);
      const backdrop = this.box(group, [0.99, 1, defaults.wallThickness],
        [0, 0, -0.205], this.backdropMaterial);
      this.airConditioners.push({ unit, backdrop });
      this.tagRoom(group, placement.roomId);
    }
    const tower = this.at(this.furnishings, livingAirConditioner.center, livingAirConditioner.rotation);
    tower.name = "living-floor-air-conditioner";
    for (const [radius, height, y, material] of [
      [0.20, 0.08, 0.04, this.supportMaterial],
      [0.17, 1.7, 0.92, this.whiteMaterial],
    ] as const) {
      const part = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 32), material);
      part.position.y = y;
      part.castShadow = true;
      part.receiveShadow = true;
      tower.add(part);
    }
    this.box(tower, [0.18, 0.95, 0.03], [0, 1.00, 0.155], this.darkMaterial, 0.04);
    for (let index = 0; index < 10; index++) {
      this.box(tower, [0.15, 0.012, 0.022], [0, 0.65 + index * 0.075, 0.177], this.whiteMaterial);
    }
    this.box(tower, [0.07, 0.04, 0.012], [0, 1.57, 0.165], this.darkMaterial, 0.015);
    this.tagRoom(tower, "living");
  }

  private buildCurtains() {
    for (const placement of roomCurtains) {
      const group = this.at(this.furnishings, placement.center);
      group.name = `${placement.roomId}-curtains`;
      const state = { group, panels: [] as THREE.Mesh[],
        hooks: [] as { mesh: THREE.Mesh; openX: number; closedX: number }[],
        transition: new CurtainTransition() };
      const curtainIndex = this.curtains.length;
      this.curtains.push(state);
      this.box(group, [placement.width + 0.1, 0.014, 0.07], [0, 1.017, 0], this.whiteMaterial, 0.005);
      const panelWidth = Math.min(0.64, placement.width * 0.25);
      for (const side of [-1, 1]) {
        const geometry = createSlidingCurtainPanel(placement.width, side);
        const curtain = new THREE.Mesh(geometry, this.curtainMaterial);
        const centerX = side * (placement.width - panelWidth) / 2;
        curtain.castShadow = true;
        curtain.receiveShadow = true;
        group.add(curtain);
        state.panels.push(curtain);
        const hooks = Math.max(4, Math.round(panelWidth / 0.105));
        for (let index = 0; index <= hooks; index++) {
          const hook = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0025, 5, 12), this.whiteMaterial);
          hook.rotation.y = Math.PI / 2;
          const openX = centerX + (index / hooks - 0.5) * panelWidth * 0.84 + side * panelWidth * 0.08;
          const closedX = side * placement.width / 4 + (index / hooks - 0.5) * placement.width / 2;
          hook.position.set(openX, 1.004, 0.017);
          group.add(hook);
          state.hooks.push({ mesh: hook, openX, closedX });
        }
      }
      this.tagRoom(group, placement.roomId);
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) object.userData.curtainIndex = curtainIndex;
      });
    }
  }

  toggleCurtain(object: THREE.Object3D, now: number, reducedMotion: boolean) {
    const index = object.userData.curtainIndex;
    if (!Number.isInteger(index) || !this.furnishings.visible) return false;
    const curtain = this.curtains[index];
    if (!curtain) return false;
    curtain.transition.toggle(now, reducedMotion);
    return true;
  }

  animateCurtains(now: number) {
    if (!this.furnishings.visible) return false;
    let moving = false;
    for (const { panels, hooks, transition } of this.curtains) {
      moving = transition.advance(now) || moving;
      for (const panel of panels) panel.morphTargetInfluences![0] = transition.value;
      for (const hook of hooks) hook.mesh.position.x = THREE.MathUtils.lerp(hook.openX, hook.closedX, transition.value);
    }
    return moving;
  }

  private buildVanity(group: THREE.Group) {
    this.box(group, [0.56, 0.12, 0.36], [0, 0.06, 0], this.supportMaterial);
    this.box(group, [0.64, 0.59, 0.44], [0, 0.405, 0], this.woodMaterial, 0.025);
    this.box(group, [0.006, 0.55, 0.006], [0, 0.405, 0.222], this.supportMaterial);
    for (const x of [-0.1, 0.1]) {
      this.box(group, [0.12, 0.012, 0.025], [x, 0.625, 0.23], this.steelMaterial);
    }
    this.box(group, [0.68, 0.04, 0.48], [0, 0.72, 0], this.ceramicMaterial, 0.015);
    for (const x of [-0.32, 0.32]) {
      this.box(group, [0.04, 0.10, 0.48], [x, 0.79, 0], this.ceramicMaterial, 0.015);
    }
    for (const z of [-0.22, 0.22]) {
      this.box(group, [0.64, 0.10, 0.04], [0, 0.79, z], this.ceramicMaterial, 0.015);
    }
    const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.004, 16), this.steelMaterial);
    drain.position.set(0, 0.741, 0.03);
    group.add(drain);
    this.pipe(group, [[0, 0.83, -0.205], [0, 1.03, -0.205], [0, 1.06, -0.12], [0, 1.02, 0.02]], 0.014);
    this.box(group, [0.065, 0.018, 0.025], [0.028, 0.9, -0.205], this.steelMaterial);
    this.box(group, [0.68, 0.82, 0.045], [0, 1.53, -0.235], this.woodMaterial, 0.04);
    this.box(group, [0.61, 0.75, 0.008], [0, 1.53, -0.208], this.mirrorMaterial, 0.025);
    // Keep just the supporting wall behind the mirror in cutaway mode.
    this.mirrorBackdrops.push(this.box(group,
      [0.78, 2.0 - defaults.cutHeight, defaults.wallThickness],
      [0, (2.0 + defaults.cutHeight) / 2, -0.36],
      [this.backdropMaterial, this.backdropMaterial, this.backdropMaterial, this.backdropMaterial,
        this.wetWallMaterial, this.backdropMaterial]));
  }

  private pipe(parent: THREE.Group, points: [number, number, number][], radius: number) {
    const path = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 24, radius, 8, false), this.steelMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  private buildShower(group: THREE.Group) {
    this.pipe(group, [[0, 0.85, 0.045], [0, 1.65, 0.045], [0, 2.12, 0.045], [0, 2.16, 0.28]], 0.015);
    for (const y of [0.92, 1.76]) {
      this.box(group, [0.07, 0.05, 0.07], [0, y, 0.025], this.steelMaterial, 0.015);
    }
    this.box(group, [0.24, 0.055, 0.08], [0, 0.88, 0.075], this.steelMaterial, 0.025);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.025, 32), this.steelMaterial);
    head.position.set(0, 2.145, 0.28);
    head.castShadow = true;
    group.add(head);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.097, 0.097, 0.006, 32), this.darkMaterial);
    face.position.set(0, 2.13, 0.28);
    group.add(face);
    this.pipe(group, [[-0.065, 0.88, 0.10], [-0.13, 0.55, 0.12], [-0.24, 0.7, 0.11], [-0.18, 1.37, 0.09]], 0.008);
    this.box(group, [0.035, 0.19, 0.03], [-0.18, 1.39, 0.09], this.steelMaterial, 0.012);
    this.box(group, [0.07, 0.1, 0.025], [-0.18, 1.5, 0.09], this.steelMaterial, 0.025);
  }

  private buildShowerEnclosure(
    group: THREE.Group,
    { width, depth, height, doorWidth }: { width: number; depth: number; height: number; doorWidth: number },
  ) {
    // The floor and drain make the wet area readable even in the top view.
    this.box(group, [width, 0.012, depth], [0, 0.006, -depth / 2], this.wetFloorMaterial);
    this.box(group, [0.13, 0.008, 0.13], [width / 2 - 0.22, 0.016, -depth + 0.22], this.steelMaterial);
    for (let index = 0; index < 4; index++) {
      this.box(group, [0.085, 0.002, 0.006],
        [width / 2 - 0.22, 0.021, -depth + 0.19 + index * 0.02], this.darkMaterial);
    }

    const frame = 0.018;
    for (const x of [-width / 2 + frame / 2, width / 2 - frame / 2]) {
      this.box(group, [frame, height, 0.025], [x, height / 2, 0], this.steelMaterial);
    }
    this.box(group, [width, frame, 0.03], [0, height - frame / 2, 0], this.steelMaterial);
    this.box(group, [width, 0.025, 0.04], [0, 0.0125, 0], this.stoneMaterial);

    const fixedWidth = width - doorWidth - frame * 2 - 0.006;
    const fixedX = -width / 2 + frame + fixedWidth / 2;
    const fixed = new THREE.Mesh(new THREE.PlaneGeometry(fixedWidth, height - 0.045), this.showerGlassMaterial);
    fixed.position.set(fixedX, height / 2, 0);
    group.add(fixed);
    const seamX = fixedX + fixedWidth / 2;
    this.box(group, [0.01, height - 0.03, 0.016], [seamX, height / 2, 0], this.steelMaterial);

    // A separate glazed door on the clear passage side, with hinges and a handle.
    const door = new THREE.Group();
    door.name = "shower-glass-door";
    door.position.x = width / 2 - frame;
    group.add(door);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(doorWidth, height - 0.045), this.showerGlassMaterial);
    glass.position.set(-doorWidth / 2, height / 2, 0);
    door.add(glass);
    for (const y of [0.35, height - 0.35]) {
      this.box(door, [0.065, 0.065, 0.022], [-0.024, y, 0], this.steelMaterial, 0.004);
    }
    for (const y of [0.98, 1.12]) {
      this.box(door, [0.022, 0.022, 0.065], [-doorWidth + 0.1, y, 0], this.steelMaterial);
    }
    for (const z of [-0.033, 0.033]) {
      this.box(door, [0.022, 0.20, 0.022], [-doorWidth + 0.1, 1.05, z], this.steelMaterial, 0.008);
    }
  }

  private buildKitchen() {
    const { hood: placement, counter: size, cooktopOffset, sinkOffset } = kitchenFurniture;
    const hood = this.at(this.furnishings, placement.center, placement.rotation);
    hood.name = "kitchen-range-hood";
    this.box(hood, [0.88, 0.13, 0.54], [0, 1.80, 0], this.steelMaterial, 0.035);
    this.box(hood, [0.68, 0.015, 0.34], [0, 1.73, 0.03], this.darkMaterial);
    this.box(hood, [0.12, 0.025, 0.015], [0.26, 1.8, 0.275], this.darkMaterial, 0.008);
    // Unit-height chimney follows the selected room height without rebuilding.
    this.hoodChimney = this.box(hood, [0.30, 1, 0.24], [0, 0, -0.15], this.steelMaterial);
    this.tagRoom(hood, "kitchen");

    const counter = this.at(this.furnishings, size.center, size.rotation);
    counter.name = "kitchen-counter-stove-and-sink";
    this.box(counter, [size.width - 0.08, 0.15, size.depth - 0.08],
      [0, 0.075, 0], this.supportMaterial);
    // Hollow cabinet sides leave room for the recessed sink rather than filling
    // its bowl with a solid cabinet or countertop underneath.
    for (const z of [-size.depth / 2 + 0.02, size.depth / 2 - 0.02]) {
      this.box(counter, [size.width - 0.04, 0.69, 0.035], [0, 0.495, z], this.woodMaterial);
    }
    for (const x of [-size.width / 2 + 0.02, size.width / 2 - 0.02]) {
      this.box(counter, [0.035, 0.69, size.depth - 0.04], [x, 0.495, 0], this.woodMaterial);
    }
    for (let index = 0; index < 5; index++) {
      const x = -size.width / 2 + (index + 0.5) * size.width / 5;
      this.box(counter, [0.22, 0.015, 0.025], [x, 0.75, size.depth / 2], this.steelMaterial);
      if (index > 0) this.box(counter, [0.006, 0.67, 0.006],
        [x - size.width / 10, 0.495, size.depth / 2 - 0.001], this.supportMaterial);
    }

    const sinkWidth = 0.6, sinkDepth = 0.4, sinkZ = 0.02;
    const leftEdge = sinkOffset - sinkWidth / 2, rightEdge = sinkOffset + sinkWidth / 2;
    const leftWidth = leftEdge + size.width / 2, rightWidth = size.width / 2 - rightEdge;
    this.box(counter, [leftWidth, 0.05, size.depth],
      [-size.width / 2 + leftWidth / 2, 0.865, 0], this.stoneMaterial);
    this.box(counter, [rightWidth, 0.05, size.depth],
      [rightEdge + rightWidth / 2, 0.865, 0], this.stoneMaterial);
    for (const [from, to] of [[-size.depth / 2, sinkZ - sinkDepth / 2], [sinkZ + sinkDepth / 2, size.depth / 2]]) {
      this.box(counter, [sinkWidth, 0.05, to - from],
        [sinkOffset, 0.865, (from + to) / 2], this.stoneMaterial);
    }

    const sink = new THREE.Group();
    sink.position.set(sinkOffset, 0, sinkZ);
    counter.add(sink);
    this.box(sink, [sinkWidth, 0.02, sinkDepth], [0, 0.71, 0], this.steelMaterial);
    for (const x of [-sinkWidth / 2 + 0.009, sinkWidth / 2 - 0.009]) {
      this.box(sink, [0.018, 0.17, sinkDepth], [x, 0.805, 0], this.steelMaterial);
      this.box(sink, [0.03, 0.015, sinkDepth + 0.03], [x, 0.891, 0], this.steelMaterial);
    }
    for (const z of [-sinkDepth / 2 + 0.009, sinkDepth / 2 - 0.009]) {
      this.box(sink, [sinkWidth, 0.17, 0.018], [0, 0.805, z], this.steelMaterial);
      this.box(sink, [sinkWidth + 0.03, 0.015, 0.03], [0, 0.891, z], this.steelMaterial);
    }
    const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.005, 16), this.darkMaterial);
    drain.position.set(0, 0.722, 0);
    sink.add(drain);
    const faucet = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(sinkOffset, 0.89, -0.25),
      new THREE.Vector3(sinkOffset, 1.14, -0.25),
      new THREE.Vector3(sinkOffset, 1.19, -0.14),
      new THREE.Vector3(sinkOffset, 1.13, 0.01),
    ]), 20, 0.015, 8, false), this.steelMaterial);
    faucet.castShadow = true;
    counter.add(faucet);
    this.box(counter, [0.075, 0.025, 0.03], [sinkOffset + 0.035, 0.96, -0.25], this.steelMaterial);

    this.box(counter, [0.74, 0.04, 0.44], [cooktopOffset, 0.91, -0.03], this.darkMaterial, 0.018);
    for (const x of [cooktopOffset - 0.21, cooktopOffset + 0.21]) {
      const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.018, 24), this.steelMaterial);
      burner.position.set(x, 0.938, -0.055);
      counter.add(burner);
      this.box(counter, [0.27, 0.014, 0.025], [x, 0.95, -0.055], this.supportMaterial);
      this.box(counter, [0.025, 0.014, 0.27], [x, 0.95, -0.055], this.supportMaterial);
    }
    for (const x of [cooktopOffset - 0.065, cooktopOffset + 0.065]) {
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.018, 16), this.steelMaterial);
      knob.position.set(x, 0.938, 0.14);
      counter.add(knob);
    }
    this.tagRoom(counter, "kitchen");
    this.buildFridge();
  }

  private buildFridge() {
    const { center, rotation, width, depth, height } = kitchenFurniture.fridge;
    const group = this.at(this.furnishings, center, rotation);
    group.name = "kitchen-fridge";
    const front = depth / 2;
    // Recessed base supports the cabinet; doors and handles stay in its footprint.
    this.box(group, [width - 0.08, 0.055, depth - 0.09], [0, 0.0275, -0.025], this.supportMaterial, 0.012);
    this.box(group, [width, height - 0.055, depth - 0.05],
      [0, (height + 0.055) / 2, -0.025], this.whiteMaterial, 0.025);
    this.box(group, [width - 0.025, height - 0.08, 0.012],
      [0, (height + 0.04) / 2, front - 0.05], this.supportMaterial, 0.018);
    // Upper refrigerator and lower freezer, separated by a slim gasket seam.
    for (const [bottom, top, handleY] of [[0.075, 0.605, 0.55], [0.62, height - 0.02, 0.685]]) {
      this.box(group, [width - 0.02, top - bottom, 0.038],
        [0, (bottom + top) / 2, front - 0.04], this.whiteMaterial, 0.018);
      this.box(group, [0.32, 0.018, 0.022],
        [0, handleY, front - 0.013], this.steelMaterial, 0.008);
    }
    this.box(group, [0.09, 0.12, 0.005], [0.15, 1.40, front - 0.019], this.darkMaterial, 0.008);
    this.tagRoom(group, "kitchen");
  }

  private buildDining() {
    const { width, depth, center, chairs } = diningFurniture;
    const group = this.at(this.furnishings, center);
    group.name = "dining-table-with-four-chairs";
    this.box(group, [width, 0.075, depth], [0, 0.7375, 0], this.woodMaterial, 0.035);
    for (const x of [-width / 2 + 0.1, width / 2 - 0.1]) {
      for (const z of [-depth / 2 + 0.1, depth / 2 - 0.1]) {
        this.box(group, [0.06, 0.70, 0.06], [x, 0.35, z], this.woodMaterial, 0.015);
      }
    }
    for (const placement of chairs) {
      const chair = new THREE.Group();
      chair.position.set(placement.x, 0, placement.z);
      chair.rotation.y = placement.rotation;
      group.add(chair);
      for (const x of [-0.17, 0.17]) {
        for (const z of [-0.17, 0.17]) {
          this.box(chair, [0.045, 0.425, 0.045], [x, 0.2125, z], this.woodMaterial);
        }
      }
      this.box(chair, [0.44, 0.08, 0.44], [0, 0.46, 0], this.woodMaterial, 0.035);
      for (const x of [-0.17, 0.17]) {
        this.box(chair, [0.045, 0.38, 0.045], [x, 0.615, -0.185], this.woodMaterial);
      }
      this.box(chair, [0.44, 0.26, 0.065], [0, 0.755, -0.185], this.woodMaterial, 0.025);
    }
    this.tagRoom(group, "living");
  }

  private buildHomeOffice() {
    const { roomId, desk: size, cabinet } = homeOfficeFurniture;
    const desk = this.at(this.furnishings, size.center, size.rotation);
    desk.name = "study-desk-and-computer";
    this.box(desk, [size.width, 0.055, size.depth],
      [0, size.height - 0.0275, 0], this.woodMaterial, 0.02);
    for (const x of [-size.width / 2 + 0.09, size.width / 2 - 0.09]) {
      for (const z of [-size.depth / 2 + 0.08, size.depth / 2 - 0.08]) {
        this.box(desk, [0.055, size.height - 0.055, 0.055],
          [x, (size.height - 0.055) / 2, z], this.woodMaterial, 0.012);
      }
    }
    this.box(desk, [size.width - 0.16, 0.10, 0.035],
      [0, size.height - 0.105, -size.depth / 2 + 0.06], this.woodMaterial);
    // Monitor base, stem and display remain connected above the tabletop.
    this.box(desk, [0.26, 0.02, 0.18], [-0.18, size.height + 0.01, -0.16], this.supportMaterial, 0.01);
    this.box(desk, [0.045, 0.18, 0.045], [-0.18, size.height + 0.10, -0.19], this.supportMaterial, 0.01);
    this.box(desk, [0.64, 0.38, 0.04], [-0.18, size.height + 0.35, -0.18], this.darkMaterial, 0.016);
    this.box(desk, [0.605, 0.338, 0.005],
      [-0.18, size.height + 0.356, -0.158], this.computerScreenMaterial, 0.006);
    this.box(desk, [0.43, 0.025, 0.14], [-0.18, size.height + 0.0125, 0.16], this.darkMaterial, 0.009);
    for (let row = 0; row < 3; row++) {
      for (let key = 0; key < 11; key++) {
        this.box(desk, [0.028, 0.004, 0.025],
          [-0.355 + key * 0.035, size.height + 0.027, 0.118 + row * 0.034], this.supportMaterial, 0.002);
      }
    }
    this.box(desk, [0.055, 0.035, 0.10], [0.16, size.height + 0.0175, 0.16], this.darkMaterial, 0.02);
    this.box(desk, [0.20, 0.39, 0.37], [0.54, size.height + 0.195, -0.1], this.darkMaterial, 0.018);
    this.box(desk, [0.012, 0.012, 0.005], [0.58, size.height + 0.35, 0.087], this.whiteMaterial);
    this.tagRoom(desk, roomId);

    const display = this.at(this.furnishings, cabinet.center, cabinet.rotation);
    display.name = "study-empty-display-cabinet";
    const { width, height, depth } = cabinet;
    this.box(display, [width - 0.06, 0.08, depth - 0.04], [0, 0.04, 0], this.woodMaterial, 0.01);
    this.box(display, [width, 0.035, depth], [0, height - 0.0175, 0], this.woodMaterial, 0.01);
    this.box(display, [width, height - 0.08, 0.025],
      [0, (height + 0.08) / 2, -depth / 2 + 0.0125], this.woodMaterial);
    for (const x of [-width / 2 + 0.015, width / 2 - 0.015]) {
      this.box(display, [0.03, height - 0.08, depth], [x, (height + 0.08) / 2, 0], this.woodMaterial);
    }
    for (const y of [0.085, 0.43, 0.78, 1.13, 1.48]) {
      this.box(display, [width - 0.06, 0.02, depth - 0.025], [0, y, 0.005], this.woodMaterial);
    }
    const doorWidth = (width - 0.065) / 2;
    for (const side of [-1, 1]) {
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(doorWidth, height - 0.135), this.windowGlassMaterial);
      glass.position.set(side * (doorWidth + 0.005) / 2, (height + 0.065) / 2, depth / 2 + 0.002);
      display.add(glass);
      this.box(display, [0.013, height - 0.12, 0.018],
        [side * 0.009, (height + 0.06) / 2, depth / 2 + 0.005], this.woodMaterial);
      this.box(display, [0.016, 0.14, 0.03], [side * 0.042, 0.98, depth / 2 + 0.022], this.steelMaterial, 0.005);
    }
    this.tagRoom(display, roomId);
    const chair = this.at(this.furnishings, homeOfficeFurniture.chair.center, homeOfficeFurniture.chair.rotation);
    chair.name = "study-ergonomic-chair";
    this.buildOfficeChair(chair);
    this.tagRoom(chair, roomId);
  }

  private buildOfficeChair(group: THREE.Group) {
    for (let index = 0; index < 5; index++) {
      const spoke = new THREE.Group();
      spoke.rotation.y = index * Math.PI * 2 / 5;
      group.add(spoke);
      this.box(spoke, [0.30, 0.035, 0.045], [0.14, 0.12, 0], this.supportMaterial, 0.012);
      this.box(spoke, [0.028, 0.08, 0.045], [0.28, 0.08, 0], this.supportMaterial, 0.008);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.035, 16), this.darkMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(0.28, 0.04, 0);
      wheel.castShadow = true;
      spoke.add(wheel);
    }
    const lift = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.032, 0.27, 16), this.steelMaterial);
    lift.position.y = 0.255;
    group.add(lift);
    this.box(group, [0.22, 0.045, 0.22], [0, 0.405, 0], this.supportMaterial, 0.01);
    this.box(group, [0.48, 0.075, 0.47], [0, 0.4575, 0.015], this.darkMaterial, 0.035);
    this.pipe(group, [[0, 0.39, -0.1], [0, 0.56, -0.23], [0, 0.77, -0.265]], 0.025);
    const back = new THREE.Group();
    back.position.set(0, 0.78, -0.24);
    back.rotation.x = -0.12;
    group.add(back);
    for (const x of [-0.23, 0.23]) this.box(back, [0.035, 0.52, 0.035], [x, 0, 0], this.supportMaterial, 0.016);
    for (const y of [-0.25, 0.25]) this.box(back, [0.46, 0.035, 0.035], [0, y, 0], this.supportMaterial, 0.016);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.49), this.chairMeshMaterial);
    mesh.position.z = 0.004;
    mesh.castShadow = mesh.receiveShadow = true;
    back.add(mesh);
    this.box(back, [0.34, 0.075, 0.055], [0, -0.15, 0.035], this.darkMaterial, 0.025);
    this.box(back, [0.045, 0.20, 0.04], [0, 0.32, -0.015], this.supportMaterial, 0.015);
    this.box(back, [0.28, 0.14, 0.085], [0, 0.42, 0], this.darkMaterial, 0.04);
    for (const x of [-0.25, 0.25]) {
      // One continuous profile joins the arm pad to its support. The foot
      // extends into the rounded seat edge instead of only touching its top.
      const profile = new THREE.Shape();
      profile.moveTo(-0.006, 0.435);
      profile.lineTo(0.036, 0.435);
      profile.lineTo(0.036, 0.602);
      profile.quadraticCurveTo(0.036, 0.632, 0.066, 0.632);
      profile.lineTo(0.182, 0.632);
      profile.quadraticCurveTo(0.2, 0.632, 0.2, 0.65);
      profile.quadraticCurveTo(0.2, 0.668, 0.182, 0.668);
      profile.lineTo(-0.062, 0.668);
      profile.quadraticCurveTo(-0.08, 0.668, -0.08, 0.65);
      profile.quadraticCurveTo(-0.08, 0.632, -0.062, 0.632);
      profile.lineTo(-0.036, 0.632);
      profile.quadraticCurveTo(-0.006, 0.632, -0.006, 0.602);
      profile.closePath();
      const geometry = new THREE.ExtrudeGeometry(profile, {
        depth: 0.052, steps: 1, curveSegments: 6,
        bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 3,
      });
      geometry.translate(0, 0, -0.026);
      geometry.rotateY(-Math.PI / 2);
      const armrest = new THREE.Mesh(geometry, this.darkMaterial);
      armrest.position.x = x;
      armrest.castShadow = armrest.receiveShadow = true;
      group.add(armrest);
    }
  }

  update(options: FixtureOptions) {
    const curtainColor = curtainColors.find((item) => item.id === options.curtainColor) ?? curtainColors[0];
    this.curtainMaterial.color.set(curtainColor.color);
    this.curtainMaterial.sheenColor.set(curtainColor.sheen);
    for (const television of this.televisions) {
      television.group.visible = television.mount === options.televisionMount;
    }
    for (const backdrop of this.televisionBackdrops) {
      backdrop.visible = options.cutaway && options.view !== "plan";
    }
    for (const backdrop of this.mirrorBackdrops) {
      backdrop.visible = options.cutaway && options.view !== "plan";
    }
    const screen = televisionParts[options.televisionMount].screen;
    for (const label of this.televisionLabels) {
      label.position.y = screen.position[1] + screen.size[1] / 2 + 0.12;
      label.element.textContent = options.televisionMount === "wall" ? "挂墙电视 / 电视柜" : "电视 / 电视柜";
    }
    for (const [layout, group] of this.layouts) group.visible = layout === options.layout;
    this.furnishings.visible = options.layout !== "empty";
    for (const { group } of this.curtains) group.scale.y = options.wallHeight - 0.12;
    for (const { unit, backdrop } of this.airConditioners) {
      unit.position.y = options.wallHeight - 0.35;
      const top = unit.position.y + 0.24;
      backdrop.scale.y = top - defaults.cutHeight;
      backdrop.position.y = (top + defaults.cutHeight) / 2;
      backdrop.visible = options.cutaway && options.view !== "plan";
    }
    if (this.hoodChimney) {
      const chimneyBottom = 1.85;
      this.hoodChimney.scale.y = options.wallHeight - chimneyBottom;
      this.hoodChimney.position.y = (options.wallHeight + chimneyBottom) / 2;
    }
    this.equipment.visible = options.equipment;
    this.roofs.visible = options.balconyRoofs;
    this.roofs.position.y = options.wallHeight;
    for (const [id, group] of this.enclosures) {
      group.visible = options.balconyModes[id] === "enclosed";
      group.scale.y = options.wallHeight;
    }
    const transparent = options.cutaway || options.view === "plan";
    const materialChanged = this.roofMaterial.transparent !== transparent;
    this.roofMaterial.transparent = transparent;
    this.roofMaterial.opacity = transparent ? 0.3 : 1;
    this.roofMaterial.depthWrite = !transparent;
    if (materialChanged) this.roofMaterial.needsUpdate = true;
    this.roofs.traverse((object) => {
      if (object instanceof THREE.Mesh) object.castShadow = !transparent;
    });
    for (const label of this.labels) label.visible = options.labels;
    for (const label of this.equipmentLabels) {
      label.visible = options.labels && options.view !== "plan";
    }
    if (this.equipmentPlanLabel) {
      this.equipmentPlanLabel.visible = options.labels && options.view === "plan";
    }
  }

  get selectable() {
    // Raycaster ignores visibility on nested parents too. Exclude hidden TV
    // variants and the cutaway backdrop as well as hidden room arrangements.
    const meshes: THREE.Mesh[] = [];
    this.group.traverseVisible((object) => {
      if (object instanceof THREE.Mesh) meshes.push(object);
    });
    return meshes;
  }

  dispose() {
    // HomeScene owns geometry and CSS label disposal through its scene traversal.
    for (const material of this.materials) material.dispose();
    this.curtainWeave.dispose();
    for (const texture of this.textures) texture.dispose();
  }
}

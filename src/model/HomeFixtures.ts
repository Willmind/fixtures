import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { modelCenter } from "./plan";
import type { Point } from "./plan";
import {
  balconyRoofs,
  balconyChoices,
  balconyWindowRuns,
  balconyWindowSill,
  furnitureSize,
  livingLayouts,
  livingPlacement,
  utilityEquipment,
} from "./arrangements";
import type { BalconyId, BalconyModes, LayoutPreview } from "./arrangements";

export type FixtureOptions = {
  layout: LayoutPreview;
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
  private layouts = new Map<LayoutPreview, THREE.Group>();
  private enclosures = new Map<BalconyId, THREE.Group>();
  private labels: CSS2DObject[] = [];
  private equipmentLabels: CSS2DObject[] = [];
  private equipmentPlanLabel?: CSS2DObject;
  private materials = new Set<THREE.Material>();
  private roofMaterial = this.material({ color: "#d1d0ca", roughness: 0.95 });
  private cabinetMaterial = this.material({ color: "#c3ae91", roughness: 0.9 });
  private sofaMaterial = this.material({ color: "#879b91", roughness: 1 });
  private cushionMaterial = this.material({ color: "#a5b4aa", roughness: 1 });
  private whiteMaterial = this.material({ color: "#eeeae2", roughness: 0.7 });
  private darkMaterial = this.material({ color: "#38434a", roughness: 0.45 });
  private windowFrameMaterial = this.material({ color: "#46565b", roughness: 0.6, metalness: 0.25 });
  private windowGlassMaterial = this.material({
    color: "#a8c5cf", roughness: 0.2, transparent: true, opacity: 0.24,
    depthWrite: false, side: THREE.DoubleSide,
  });

  constructor() {
    this.group.name = "balcony-roofs-and-layout-previews";
    this.group.add(this.roofs, this.equipment);
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
      this.label(tv, "电视 / 电视柜", 1.55, "tv");
      this.label(sofa, "沙发", 1.0, "sofa");
      this.tagRoom(group, "living");
    }
    this.buildEquipment();
  }

  private material(options: THREE.MeshStandardMaterialParameters) {
    const material = new THREE.MeshStandardMaterial(options);
    this.materials.add(material);
    return material;
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
    position: [number, number, number], material: THREE.Material, radius = 0,
  ) {
    const geometry = radius
      ? new RoundedBoxGeometry(...size, 2, radius)
      : new THREE.BoxGeometry(...size);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
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
    this.box(group, [1.45, 0.84, 0.06], [0, 1.06, -0.04], this.darkMaterial, 0.02);
    this.box(group, [0.06, 0.2, 0.06], [0, 0.52, -0.04], this.darkMaterial);
    this.box(group, [0.5, 0.025, 0.18], [0, 0.44, -0.02], this.darkMaterial);
  }

  private buildEnclosures() {
    for (const balcony of balconyChoices) {
      const group = new THREE.Group();
      group.name = `${balcony.id}-enclosure-preview`;
      group.position.y = balconyWindowSill;
      this.group.add(group);
      this.enclosures.set(balcony.id, group);
      for (const run of balconyWindowRuns.filter((item) => item.roomId === balcony.id)) {
        const frame = this.at(group, run.from, run.rotation);
        // Unit-height frames scale up to the roof without rebuilding geometry.
        for (const y of [0.015, 0.985]) {
          this.box(frame, [run.length, 0.03, 0.065],
            [run.length / 2, y, 0], this.windowFrameMaterial);
        }
        const panels = Math.ceil(run.length / 1.05);
        const panelWidth = run.length / panels;
        for (let index = 0; index <= panels; index++) {
          this.box(frame, [0.045, 1, 0.065],
            [index * panelWidth, 0.5, 0], this.windowFrameMaterial);
          if (index === panels) continue;
          const pane = new THREE.Mesh(
            new THREE.PlaneGeometry(panelWidth - 0.045, 0.94), this.windowGlassMaterial,
          );
          pane.position.set((index + 0.5) * panelWidth, 0.5, 0);
          frame.add(pane);
        }
      }
      this.tagRoom(group, balcony.id);
    }
  }

  private buildSofa(group: THREE.Group) {
    const { width, depth, height } = furnitureSize.sofa;
    this.box(group, [width, 0.25, depth], [0, 0.23, 0], this.sofaMaterial, 0.07);
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
    this.tagRoom(this.equipment, utilityEquipment.roomId);
  }

  update(options: FixtureOptions) {
    for (const [layout, group] of this.layouts) group.visible = layout === options.layout;
    this.equipment.visible = options.equipment;
    this.roofs.visible = options.balconyRoofs;
    this.roofs.position.y = options.wallHeight;
    for (const [id, group] of this.enclosures) {
      group.visible = options.balconyModes[id] === "enclosed";
      group.scale.y = options.wallHeight - balconyWindowSill;
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
    // Raycaster does not skip invisible parents: only send displayed variants.
    return [this.roofs, this.equipment, ...this.layouts.values(), ...this.enclosures.values()]
      .filter((group) => group.visible);
  }

  dispose() {
    // HomeScene owns geometry and CSS label disposal through its scene traversal.
    for (const material of this.materials) material.dispose();
  }
}

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { modelCenter } from "./plan";
import type { Point } from "./plan";
import {
  balconyRoofs,
  balconyChoices,
  balconyWindowRuns,
  bathroomToilets,
  bedroomBeds,
  cabinetColors,
  diningFurniture,
  furnitureSize,
  kitchenFurniture,
  livingLayouts,
  livingPlacement,
  sofaColors,
  utilityEquipment,
} from "./arrangements";
import type { BalconyId, BalconyModes, CabinetColor, LayoutPreview, SofaColor } from "./arrangements";
import { sofaBody, sofaSupport, televisionMounts, televisionParts, televisionWallBackdrop } from "./furniture";
import type { BoxPart, TelevisionMount } from "./furniture";

export type FixtureOptions = {
  layout: LayoutPreview;
  sofaColor: SofaColor;
  cabinetColor: CabinetColor;
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
  private layouts = new Map<LayoutPreview, THREE.Group>();
  private enclosures = new Map<BalconyId, THREE.Group>();
  private televisions: { mount: TelevisionMount; group: THREE.Group }[] = [];
  private televisionBackdrops: THREE.Mesh[] = [];
  private televisionLabels: CSS2DObject[] = [];
  private labels: CSS2DObject[] = [];
  private equipmentLabels: CSS2DObject[] = [];
  private equipmentPlanLabel?: CSS2DObject;
  private materials = new Set<THREE.Material>();
  private roofMaterial = this.material({ color: "#d1d0ca", roughness: 0.95 });
  private cabinetMaterial = this.material({ color: cabinetColors[0].color, roughness: 0.9 });
  private sofaMaterial = this.material({ color: sofaColors[0].color, roughness: 1 });
  private cushionMaterial = this.material({ color: sofaColors[0].cushion, roughness: 1 });
  private whiteMaterial = this.material({ color: "#eeeae2", roughness: 0.7 });
  private darkMaterial = this.material({ color: "#38434a", roughness: 0.45 });
  private supportMaterial = this.material({ color: "#343331", roughness: 0.85 });
  private woodMaterial = this.material({ color: "#b8a084", roughness: 0.85 });
  private beddingMaterial = this.material({ color: "#f1ede4", roughness: 1 });
  private blanketMaterial = this.material({ color: "#a7b2ae", roughness: 1 });
  private stoneMaterial = this.material({ color: "#dedbd4", roughness: 0.75 });
  private ceramicMaterial = this.material({ color: "#f5f5f0", roughness: 0.25 });
  private steelMaterial = this.material({ color: "#7c8385", roughness: 0.35, metalness: 0.7 });
  private backdropMaterial = this.material({ color: "#efeee9", roughness: 0.96 });
  private windowFrameMaterial = this.material({ color: "#46565b", roughness: 0.6, metalness: 0.25 });
  private windowGlassMaterial = this.material({
    color: "#a8c5cf", roughness: 0.2, transparent: true, opacity: 0.24,
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
    this.tagRoom(this.equipment, utilityEquipment.roomId);
  }

  private buildRoomFurnishings() {
    this.furnishings.name = "bedroom-kitchen-bathroom-dining-preview";
    for (const bed of bedroomBeds) {
      const group = this.at(this.furnishings, bed.center, bed.rotation);
      group.name = `${bed.roomId}-bed`;
      this.buildBed(group, bed.width);
      this.tagRoom(group, bed.roomId);
    }
    for (const toilet of bathroomToilets) {
      const group = this.at(this.furnishings, toilet.center);
      group.name = `${toilet.roomId}-toilet`;
      this.buildToilet(group);
      this.tagRoom(group, toilet.roomId);
    }
    this.buildKitchen();
    this.buildDining();
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

  private buildKitchen() {
    const { hood: placement, island: size } = kitchenFurniture;
    const hood = this.at(this.furnishings, placement.center, placement.rotation);
    hood.name = "kitchen-range-hood";
    this.box(hood, [0.88, 0.13, 0.54], [0, 1.80, 0], this.steelMaterial, 0.035);
    this.box(hood, [0.68, 0.015, 0.34], [0, 1.73, 0.03], this.darkMaterial);
    this.box(hood, [0.12, 0.025, 0.015], [0.26, 1.8, 0.275], this.darkMaterial, 0.008);
    // Unit-height chimney follows the selected room height without rebuilding.
    this.hoodChimney = this.box(hood, [0.30, 1, 0.24], [0, 0, -0.15], this.steelMaterial);
    this.tagRoom(hood, "kitchen");

    const island = this.at(this.furnishings, size.center);
    island.name = "kitchen-island";
    this.box(island, [size.width - 0.08, 0.1, size.depth - 0.08],
      [0, 0.05, 0], this.supportMaterial);
    this.box(island, [size.width - 0.04, 0.75, size.depth - 0.04],
      [0, 0.465, 0], this.woodMaterial, 0.025);
    this.box(island, [size.width, 0.05, size.depth], [0, 0.865, 0], this.stoneMaterial, 0.02);
    this.tagRoom(island, "kitchen");
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
      this.box(chair, [0.44, 0.08, 0.44], [0, 0.46, 0], this.beddingMaterial, 0.035);
      for (const x of [-0.17, 0.17]) {
        this.box(chair, [0.045, 0.38, 0.045], [x, 0.615, -0.185], this.woodMaterial);
      }
      this.box(chair, [0.44, 0.26, 0.065], [0, 0.755, -0.185], this.woodMaterial, 0.025);
    }
    this.tagRoom(group, "living");
  }

  update(options: FixtureOptions) {
    for (const television of this.televisions) {
      television.group.visible = television.mount === options.televisionMount;
    }
    for (const backdrop of this.televisionBackdrops) {
      backdrop.visible = options.cutaway && options.view !== "plan";
    }
    const screen = televisionParts[options.televisionMount].screen;
    for (const label of this.televisionLabels) {
      label.position.y = screen.position[1] + screen.size[1] / 2 + 0.12;
      label.element.textContent = options.televisionMount === "wall" ? "挂墙电视 / 电视柜" : "电视 / 电视柜";
    }
    const sofa = sofaColors.find((item) => item.id === options.sofaColor) ?? sofaColors[0];
    const cabinet = cabinetColors.find((item) => item.id === options.cabinetColor) ?? cabinetColors[0];
    this.sofaMaterial.color.set(sofa.color);
    this.cushionMaterial.color.set(sofa.cushion);
    this.cabinetMaterial.color.set(cabinet.color);
    for (const [layout, group] of this.layouts) group.visible = layout === options.layout;
    this.furnishings.visible = options.layout !== "empty";
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
  }
}

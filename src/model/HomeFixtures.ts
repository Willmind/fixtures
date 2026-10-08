import * as THREE from "three";
import { isFixtureOperable, fixtureInteractionTarget } from "./fixtures/interactions.ts";
import { BoxGeometryPool } from "./fixtures/BoxGeometryPool.ts";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { defaults, modelCenter, walls } from "./plan.ts";
import type { Point } from "./plan.ts";
import {
  balconyRoofs,
  balconyFurniture,
  balconyChoices,
  balconyWindowRuns,
  bathroomFittings,
  bathroomVanitySize,
  bedroomBeds,
  bedroomStorage,
  curtainColors,
  furnitureSize,
  homeOfficeFurniture,
  kitchenFurniture,
  livingLayouts,
  livingPlacement,
  previewPalette,
  televisionSideDecor,
  roomCurtains,
  utilityEquipment,
  utilityDryingRack,
} from "./arrangements.ts";
import type { BalconyId, LayoutPreview } from "./arrangements.ts";
import { televisionMounts, televisionParts, televisionWallBackdrop } from "./furniture.ts";
import type { BoxPart, TelevisionMount } from "./furniture.ts";
import { createSlidingCurtainPanel, createCurtainWeave, CurtainTransition } from "./curtains.ts";
import { applySurfaceUVs, createTileSurface } from "./finishes.ts";
import { OpenCloseMotion } from "./OpenCloseMotion.ts";
import { storageBed } from "./beds.ts";
import { createPottedTree } from "./plants.ts";
import { createSquatPan } from "./squatToilet.ts";
import { createGasFlameMaterial, createGasFlames, GasBurner } from "./gasBurner.ts";
import { WaterTap } from "./waterTap.ts";
import { RobotRoute } from "./robotRoute.ts";
import { createBathroomMirror } from "./mirrors.ts";
import { ExhaustFan } from "./exhaustFans.ts";
import { floorElevation } from "./drainage.ts";

import type { FixtureOptions } from "./options.ts";
import { fixtureOptionsChanged, fixtureAppearanceChanged } from "./options.ts";
export type { FixtureOptions, LightingMode } from "./options.ts";
import { FurnitureBuilder } from "./fixtures/FurnitureBuilder.ts";
import { OpeningFixtures } from "./fixtures/OpeningFixtures.ts";
import { FixtureLighting } from "./fixtures/FixtureLighting.ts";
import type { FixtureBuilderContext } from "./fixtures/context.ts";

/** Lightweight, reusable preview objects. Switching layouts never rebuilds meshes. */
export class HomeFixtures {
  readonly group = new THREE.Group();
  private roofs = new THREE.Group();
  private equipment = new THREE.Group();
  private furnishings = new THREE.Group();
  private entrances = new THREE.Group();
  private bedDrawers: { group: THREE.Group; closedX: number; side: number;
    travel: number; motion: OpenCloseMotion }[] = [];
  private gasBurners: GasBurner[] = [];
  private gasBurnerLabel?: CSS2DObject;
  private taps: WaterTap[] = [];
  private robot?: { group: THREE.Group; route: RobotRoute; label: CSS2DObject };
  private hoodChimney?: THREE.Mesh;
  private exhaustFans: { group: THREE.Group; backdrop: THREE.Mesh; windowTop: number; motion: ExhaustFan }[] = [];
  private dryingRack?: { group: THREE.Group; frame: THREE.Group; wires: THREE.Mesh[];
    motion: OpenCloseMotion; label: CSS2DObject };
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
  private previousOptions?: FixtureOptions;
  private geometryPool = new BoxGeometryPool();
  private materials = new Set<THREE.Material>();
  private textures = new Set<THREE.Texture>();
  private screens: { on: boolean; material: THREE.MeshBasicMaterial }[] = [];
  private televisionScreen = this.createScreen();
  private computerScreen = this.createScreen();
  private roofMaterial = this.material({ color: "#d1d0ca", roughness: 0.95 });
  private cabinetMaterial = this.material({ color: previewPalette.tvCabinet, roughness: 0.9 });
  private sofaMaterial = this.material({ color: previewPalette.sofa, roughness: 1 });
  private cushionMaterial = this.material({ color: previewPalette.sofaCushion, roughness: 1 });
  private whiteMaterial = this.material({ color: "#eeeae2", roughness: 0.7 });
  private darkMaterial = this.material({ color: "#38434a", roughness: 0.45 });
  private supportMaterial = this.material({ color: "#343331", roughness: 0.85 });
  private chairMeshMaterial = this.makeChairMeshMaterial();
  private woodMaterial = this.material({ color: previewPalette.lightWalnut, roughness: 0.85 });
  private beddingMaterial = this.material({ color: "#f1ede4", roughness: 1 });
  private blanketMaterial = this.material({ color: "#eee7db", roughness: 1 });
  private stoneMaterial = this.material({ color: "#dedbd4", roughness: 0.75 });
  private wetFloorMaterial = this.makeTileMaterial(false);
  private wetWallMaterial = this.makeTileMaterial(true);
  private ceramicMaterial = this.material({ color: "#f5f5f0", roughness: 0.25 });
  private steelMaterial = this.material({ color: "#7c8385", roughness: 0.35, metalness: 0.7 });
  private sinkMaterial = this.makeSinkMaterial();
  private faucetMaterial = this.material({ color: "#b9bec0", roughness: 0.32, metalness: 0.35 });
  private mirrorMaterial = this.material({ color: "#dce8eb", roughness: 0.06, metalness: 0.15,
    emissive: "#c8d9de", emissiveIntensity: 0.12 });
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
  private doorGlassMaterial = this.material({
    color: "#e7f0f2", roughness: 0.1, transparent: true, opacity: 0.15,
    depthWrite: false, side: THREE.DoubleSide,
  });

  private readonly builder: FixtureBuilderContext = {
    box: (...args) => this.box(...args),
    at: (...args) => this.at(...args),
    part: (...args) => this.part(...args),
    pipe: (...args) => this.pipe(...args),
    tagRoom: (...args) => this.tagRoom(...args),
    label: (...args) => this.label(...args),
    material: (...args) => this.material(...args),
    materials: {
      cabinet: this.cabinetMaterial,
      sofa: this.sofaMaterial,
      cushion: this.cushionMaterial,
      white: this.whiteMaterial,
      dark: this.darkMaterial,
      support: this.supportMaterial,
      chairMesh: this.chairMeshMaterial,
      wood: this.woodMaterial,
      wetFloor: this.wetFloorMaterial,
      ceramic: this.ceramicMaterial,
      steel: this.steelMaterial,
      mirror: this.mirrorMaterial,
      backdrop: this.backdropMaterial,
      windowFrame: this.windowFrameMaterial,
      windowGlass: this.windowGlassMaterial,
      doorGlass: this.doorGlassMaterial,
    },
  };
  private readonly furniture = new FurnitureBuilder(this.builder);
  private readonly openings: OpeningFixtures;
  private readonly lighting: FixtureLighting;

  constructor() {
    this.group.name = "balcony-roofs-and-layout-previews";
    this.group.add(this.roofs, this.equipment, this.furnishings, this.entrances);
    this.openings = new OpeningFixtures(this.builder, this.entrances, this.furnishings);
    this.lighting = new FixtureLighting(this.builder, this.furnishings);
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
      const coffeeTable = this.at(group, placement.coffeeTable.center, placement.coffeeTable.rotation);
      this.buildTelevision(tv);
      this.buildTelevisionSideDecor(tv);
      this.furniture.buildSofa(sofa);
      this.furniture.buildCoffeeTable(coffeeTable);
      this.televisionLabels.push(this.label(tv, "电视 / 电视柜", 1.55, "tv"));
      this.label(sofa, "沙发", 1.0, "sofa");
      this.label(coffeeTable, "茶几", furnitureSize.coffeeTable.height + 0.12, "coffee-table");
      this.tagRoom(group, "living");
    }
    this.buildEquipment();
    this.buildRoomFurnishings();
    this.buildUtilityDryingRack();
  }



  toggleDoor(object: THREE.Object3D, now: number, reducedMotion = false) {
    return this.openings.toggleDoor(object, now, reducedMotion);
  }
  animateDoors(now: number) { return this.openings.animateDoors(now); }

  toggleCeilingLight(object: THREE.Object3D) { return this.lighting.toggleCeilingLight(object); }
  toggleBedsideLamp(object: THREE.Object3D) { return this.lighting.toggleBedsideLamp(object); }
  get lightState() { return this.lighting.state; }

  isOperable(object: THREE.Object3D) { return isFixtureOperable(object); }

  interactionInfo(object: THREE.Object3D) {
    const target = fixtureInteractionTarget(object);
    if (!target) return;
    const data = object.userData;
    let on: boolean | undefined;
    let verbs = ["打开", "关闭"];
    switch (target.kind) {
      case "homeDoorIndex":
        on = this.openings.isDoorOpen(object);
        if (target.title === "床头柜抽屉" || target.title === "书房椅子") verbs = ["拉出", "收回"];
        break;
      case "screenIndex": on = this.screens[data.screenIndex]?.on; verbs = ["开机", "关机"]; break;
      case "bedsideLampIndex": case "ceilingLightIndex": on = this.lighting.isLightOn(object); break;
      case "exhaustFanIndex": on = this.exhaustFans[data.exhaustFanIndex]?.motion.on; verbs = ["启动", "停止"]; break;
      case "waterTapIndex": on = this.taps[data.waterTapIndex]?.on; break;
      case "gasBurnerIndex": on = this.gasBurners.every((burner) => burner.on); verbs = ["开火", "关火"]; break;
      case "dryingRack": on = this.dryingRack?.motion.open; verbs = ["下降", "升起"]; break;
      case "curtainIndex": on = !this.curtains[data.curtainIndex]?.transition.closed; verbs = ["展开", "合上"]; break;
      case "bedDrawerIndex": {
        const ids: number[] = data.bedDrawerIds ?? (typeof data.bedDrawerIndex === "number" ? [data.bedDrawerIndex] : undefined);
        on = ids?.every((id) => this.bedDrawers[id]?.motion.open); verbs = ["拉出", "收回"]; break;
      }
      case "robotVacuum": {
        const status = this.robot?.route.status;
        return { ...target, active: status === "running",
          action: status === "running" ? "暂停清扫" : status === "paused" ? "继续清扫" : "开始清扫",
          feedback: status === "running" ? "扫地机器人已开始清扫" : status === "paused" ? "扫地机器人已暂停" : "扫地机器人已回到充电座" };
      }
    }
    if (typeof on !== "boolean") return;
    return { ...target, active: on, action: verbs[Number(on)], feedback: `${target.title}已${verbs[Number(!on)]}` };
  }

  private material(options: THREE.MeshStandardMaterialParameters) {
    const material = new THREE.MeshStandardMaterial(options);
    this.materials.add(material);
    return material;
  }

  private createScreen() {
    const material = new THREE.MeshBasicMaterial({ color: "#151b20", toneMapped: false });
    this.materials.add(material);
    return this.screens.push({ on: false, material }) - 1;
  }

  toggleScreen(object: THREE.Object3D) {
    const screen = this.screens[object.userData.screenIndex];
    if (!screen) return false;
    screen.on = !screen.on;
    screen.material.color.set(screen.on ? "#a6cbdc" : "#151b20");
    return true;
  }

  private tagScreen(object: THREE.Object3D, index: number, title: string) {
    object.traverse((part) => {
      if (!(part instanceof THREE.Mesh)) return;
      part.userData.screenIndex = index;
      part.userData.fixtureTitle = title;
    });
  }

  private makeCurtainMaterial() {
    const material = new THREE.MeshPhysicalMaterial({
      color: curtainColors[0].color, roughness: 0.98, metalness: 0,
      sheen: 0.25, sheenColor: curtainColors[0].sheen, sheenRoughness: 0.95,
      transparent: true, opacity: 0.94, depthWrite: false,
      alphaMap: this.curtainWeave,
      bumpMap: this.curtainWeave, bumpScale: 0.00025, vertexColors: true,
    });
    this.materials.add(material);
    return material;
  }

  private makeSinkMaterial() {
    // Subtle horizontal grain distinguishes brushed steel from the white countertop.
    const pixels = new Uint8Array(64 * 64 * 4);
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const shade = Math.round(236 + 3 * Math.sin(y * 1.9) + 2 * Math.sin(x * 0.17 + y * 3.1));
        pixels.set([shade, shade, shade, 255], (y * 64 + x) * 4);
      }
    }
    const grain = new THREE.DataTexture(pixels, 64, 64);
    grain.colorSpace = THREE.SRGBColorSpace;
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
    grain.magFilter = THREE.LinearFilter;
    grain.minFilter = THREE.LinearMipmapLinearFilter;
    grain.generateMipmaps = true; grain.needsUpdate = true;
    this.textures.add(grain);
    return this.material({ color: "#bdc5cb", map: grain, roughness: 0.28, metalness: 0.6 });
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
    const usesWorldUVs = (Array.isArray(material) ? material : [material]).some(
      (item) => item === this.wetWallMaterial || item === this.wetFloorMaterial,
    );
    const geometry = this.geometryPool.get(size, radius, usesWorldUVs);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    if (usesWorldUVs) {
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
    const actionable = kind === "robot" || kind === "drying-rack" || kind === "gas-burner";
    const element = document.createElement(actionable ? "button" : "span");
    element.className = `fixture-label fixture-label-${kind}${actionable ? " fixture-label-action" : ""}`;
    element.textContent = text;
    const label = new CSS2DObject(element);
    label.position.y = y;
    parent.add(label);
    this.labels.push(label);
    return label;
  }

  private tagRoom(group: THREE.Group, roomId: string) {
    group.userData.roomId = roomId;
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
    const cabinet = new THREE.Group(); cabinet.name = "living-tv-cabinet"; group.add(cabinet);
    this.openings.buildCabinet(cabinet, { width: size.width, depth: size.depth, bottom: 0, top: size.height,
      material: this.cabinetMaterial, title: "电视柜" });
    for (const { id: mount } of televisionMounts) {
      const television = new THREE.Group();
      television.name = `television-${mount}`;
      group.add(television);
      this.televisions.push({ mount, group: television });
      const parts = televisionParts[mount];
      const frame = this.part(television, parts.screen, this.darkMaterial);
      this.tagScreen(frame, this.televisionScreen, "电视");
      const [width, height, depth] = parts.screen.size;
      const [x, y, z] = parts.screen.position;
      const screen = this.box(television, [width - 0.04, height - 0.04, 0.004],
        [x, y, z + depth / 2 + 0.002], this.screens[this.televisionScreen].material, 0.008);
      this.tagScreen(screen, this.televisionScreen, "电视");
      screen.userData.fixtureHintPriority = 1;
      screen.castShadow = false;
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


  private buildEquipment() {
    const { washer: washerPosition, heater: heaterPosition } = utilityEquipment;
    const washer = this.at(this.equipment, washerPosition.center, washerPosition.rotation);
    for (const x of [-0.2875, 0.2875]) {
      this.box(washer, [0.025, 0.85, 0.62], [x, 0.425, 0], this.whiteMaterial, 0.01);
    }
    for (const y of [0.0175, 0.8325]) {
      this.box(washer, [0.6, 0.035, 0.62], [0, y, 0], this.whiteMaterial, 0.012);
    }
    this.box(washer, [0.55, 0.80, 0.025], [0, 0.425, -0.2975], this.whiteMaterial);
    const front = new THREE.Shape();
    front.moveTo(-0.275, 0); front.lineTo(0.275, 0); front.quadraticCurveTo(0.3, 0, 0.3, 0.025);
    front.lineTo(0.3, 0.825); front.quadraticCurveTo(0.3, 0.85, 0.275, 0.85);
    front.lineTo(-0.275, 0.85); front.quadraticCurveTo(-0.3, 0.85, -0.3, 0.825);
    front.lineTo(-0.3, 0.025); front.quadraticCurveTo(-0.3, 0, -0.275, 0);
    const opening = new THREE.Path(); opening.absarc(0, 0.41, 0.17, 0, Math.PI * 2, true);
    front.holes.push(opening);
    const face = new THREE.Mesh(new THREE.ExtrudeGeometry(front, { depth: 0.022, bevelEnabled: false }), this.whiteMaterial);
    face.position.z = 0.29; washer.add(face);
    const drumMaterial = this.material({ color: "#8e989b", roughness: 0.5, side: THREE.DoubleSide });
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.45, 32, 1, true), drumMaterial);
    drum.rotation.x = Math.PI / 2; drum.position.set(0, 0.41, 0.045); washer.add(drum);
    const drumBack = new THREE.Mesh(new THREE.CircleGeometry(0.165, 32), this.darkMaterial);
    drumBack.position.set(0, 0.41, -0.18); washer.add(drumBack);
    const door = new THREE.Group(); door.name = "washer-operable-door";
    door.position.set(-0.205, 0.41, 0.333); washer.add(door);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.184, 0.022, 10, 40), this.whiteMaterial);
    rim.position.x = 0.205; door.add(rim);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.166, 32), this.windowGlassMaterial);
    glass.position.set(0.205, 0, 0.003); door.add(glass);
    this.box(door, [0.035, 0.105, 0.04], [0.385, 0, 0.018], this.whiteMaterial, 0.012);
    this.openings.registerGlazingDoor([door], (value) => { door.rotation.y = -Math.PI * 0.55 * value; });
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
    robot.name = "utility-robot-vacuum";
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
    const dock = this.at(this.equipment, center, rotation);
    dock.name = "robot-fixed-charging-dock";
    this.box(dock, [0.3, 0.12, 0.1], [0, 0.06, -0.23], this.whiteMaterial, 0.02);
    this.box(dock, [0.22, 0.052, 0.008], [0, 0.055, -0.178], this.darkMaterial, 0.012);
    robot.traverse((object) => { if (object instanceof THREE.Mesh) object.userData.robotVacuum = true; });
    const label = this.label(robot, "扫地机器人 · 点击运行", 0.29, "robot");
    label.name = "robot-vacuum-action-label";
    label.userData.robotVacuum = true;
    label.element.dataset.fixtureAction = "robot";
    label.element.setAttribute("type", "button");
    label.element.setAttribute("aria-pressed", "false");
    this.equipmentLabels.push(label);
    this.robot = { group: robot, route: new RobotRoute(), label };
  }

  private buildUtilityDryingRack() {
    const { center, width, depth } = utilityDryingRack;
    const rack = this.at(this.furnishings, center);
    rack.name = "utility-ceiling-drying-rack";
    // Local y=0 touches the underside of the balcony roof.
    this.box(rack, [1.28, 0.08, 0.20], [0, -0.04, 0], this.whiteMaterial, 0.02);
    this.box(rack, [0.64, 0.006, 0.07], [0, -0.083, 0], this.stoneMaterial, 0.003);
    const wires: THREE.Mesh[] = [];
    const wireGeometry = new THREE.CylinderGeometry(0.0025, 0.0025, 1, 8);
    for (const x of [-0.55, 0.55]) {
      this.box(rack, [0.12, 0.06, depth + 0.06], [x, -0.11, 0], this.whiteMaterial, 0.015);
      for (const z of [-depth / 2, depth / 2]) {
        const wire = new THREE.Mesh(wireGeometry, this.steelMaterial);
        wire.position.set(x, 0, z);
        rack.add(wire);
        wires.push(wire);
      }
    }
    const frame = new THREE.Group();
    frame.name = "utility-drying-rack-moving-frame";
    rack.add(frame);
    const railGeometry = new THREE.CylinderGeometry(0.011, 0.011, width, 12);
    const loopGeometry = new THREE.TorusGeometry(0.013, 0.002, 6, 12);
    for (const z of [-depth / 2, depth / 2]) {
      const rail = new THREE.Mesh(railGeometry, this.steelMaterial);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, 0, z);
      rail.castShadow = true;
      frame.add(rail);
      for (let i = 0; i < 9; i++) {
        const loop = new THREE.Mesh(loopGeometry, this.steelMaterial);
        loop.position.set((i - 4) * 0.16, -0.018, z);
        frame.add(loop);
      }
    }
    for (const x of [-width / 2 + 0.035, width / 2 - 0.035]) {
      this.box(frame, [0.06, 0.045, depth + 0.055], [x, 0, 0], this.whiteMaterial, 0.012);
    }
    rack.traverse((object) => {
      if (object instanceof THREE.Mesh) object.userData.dryingRack = true;
    });
    const label = this.label(frame, "晾衣架 · 点击下降", -0.16, "drying-rack");
    label.name = "utility-drying-rack-action-label";
    label.userData.dryingRack = true;
    label.element.dataset.fixtureAction = "drying-rack";
    label.element.setAttribute("type", "button");
    this.dryingRack = { group: rack, frame, wires, motion: new OpenCloseMotion(false), label };
    this.updateDryingRack();
    this.tagRoom(rack, utilityEquipment.roomId);
  }

  toggleDryingRack(object: THREE.Object3D, now: number, reducedMotion = false) {
    if (!object.userData.dryingRack || !this.dryingRack) return false;
    this.dryingRack.motion.toggle(now, reducedMotion);
    this.updateDryingRack();
    return true;
  }

  toggleDryingRackLabel(now: number, reducedMotion = false) {
    return this.dryingRack
      ? this.toggleDryingRack(this.dryingRack.label, now, reducedMotion)
      : false;
  }

  private updateDryingRack() {
    if (!this.dryingRack) return;
    const { frame, wires, motion, label } = this.dryingRack;
    const { drop, loweredDrop } = utilityDryingRack;
    const distance = drop + (loweredDrop - drop) * motion.value;
    frame.position.y = -distance;
    for (const wire of wires) {
      wire.scale.y = distance - 0.14;
      wire.position.y = -(0.14 + distance) / 2;
    }
    label.element.textContent = motion.open ? "晾衣架 · 点击升起" : "晾衣架 · 点击下降";
    label.element.setAttribute("aria-pressed", String(motion.open));
  }

  private buildRoomFurnishings() {
    this.furnishings.name = "bedroom-kitchen-bathroom-dining-preview";
    for (const bed of bedroomBeds) {
      const group = this.at(this.furnishings, bed.center, bed.rotation);
      group.name = `${bed.roomId}-bed`;
      this.buildBed(group, bed.width, bed.roomId);
      this.tagRoom(group, bed.roomId);
    }
    this.buildBedroomStorage();
    for (const fitting of bathroomFittings) {
      const vanity = this.at(this.furnishings, fitting.vanity.center, fitting.vanity.rotation);
      vanity.name = `${fitting.roomId}-basin-and-mirror`;
      this.buildVanity(vanity);
      this.tagRoom(vanity, fitting.roomId);
      const toilet = this.at(this.furnishings, fitting.toilet.center, fitting.toilet.rotation);
      toilet.position.y = floorElevation(fitting.roomId, fitting.toilet.center);
      toilet.name = `${fitting.roomId}-${fitting.toilet.kind}-toilet`;
      if (fitting.toilet.kind === "squat") {
        toilet.add(createSquatPan(this.ceramicMaterial));
        this.box(toilet, [0.36, 0.40, 0.11], [0, 1.02, -0.285], this.ceramicMaterial, 0.025);
        this.box(toilet, [0.065, 0.008, 0.035], [0, 1.224, -0.285], this.faucetMaterial, 0.005);
        this.pipe(toilet, [[0, 0.825, -0.235], [0, 0.12, -0.235], [0, 0.06, -0.28]], 0.014);
      } else {
        const lid = this.furniture.buildToilet(toilet);
        this.openings.registerGlazingDoor([lid], (value) => {
          lid.rotation.x = -Math.PI * 0.47 * value;
        }, false, "马桶盖");
      }
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
    this.furniture.buildDining(this.furnishings);
    this.buildBalconyFurniture();
    this.buildCurtains();
    this.airConditioners = this.furniture.buildAirConditioners(this.furnishings);
  }


  private buildBedroomStorage() {
    for (const { roomId, bedside, wardrobe } of bedroomStorage) {
      const cabinet = this.at(this.furnishings, bedside.center, bedside.rotation);
      cabinet.name = `${roomId}-bedside-cabinet`;
      this.box(cabinet, [0.36, 0.06, 0.34], [0, 0.03, 0], this.supportMaterial, 0.008);
      this.openings.buildBedsideDrawers(cabinet);
      this.lighting.addBedside(cabinet, roomId);
      this.tagRoom(cabinet, roomId);

      const closet = this.at(this.furnishings, wardrobe.center, wardrobe.rotation);
      closet.name = `${roomId}-wardrobe`;
      const { width, depth, doors: doorCount } = wardrobe, height = 2.15;
      const panel = 0.025, bodyHeight = height - 0.08, centerY = (height + 0.08) / 2;
      this.box(closet, [width - 0.06, 0.08, depth - 0.04], [0, 0.04, 0], this.supportMaterial);
      // Narrow front leaves align with the internal storage compartments.
      this.box(closet, [width, bodyHeight, panel],
        [0, centerY, -(depth - panel) / 2], this.woodMaterial);
      for (const side of [-1, 1]) {
        this.box(closet, [panel, bodyHeight, depth],
          [side * (width - panel) / 2, centerY, 0], this.woodMaterial);
      }
      for (const y of [0.08 + panel / 2, height - panel / 2]) {
        this.box(closet, [width - panel * 2, panel, depth], [0, y, 0], this.woodMaterial);
      }
      const innerWidth = width - panel * 2, compartmentWidth = innerWidth / doorCount;
      for (let index = 0; index < doorCount; index++) {
        const x = -innerWidth / 2 + (index + 0.5) * compartmentWidth;
        if (index > 0) {
          this.box(closet, [panel, bodyHeight - panel * 2, depth - panel],
            [-innerWidth / 2 + index * compartmentWidth, centerY, panel / 2], this.woodMaterial);
        }
        const shelfWidth = compartmentWidth - panel;
        const hanging = index < Math.ceil(doorCount / 2);
        for (const y of hanging ? [1.93] : [0.55, 1.05, 1.55, 1.93]) {
          this.box(closet, [shelfWidth, panel, depth - panel * 2], [x, y, 0], this.woodMaterial);
        }
        if (hanging) this.pipe(closet, depth < 0.55
          ? [[x, 1.78, -depth / 2 + panel], [x, 1.78, depth / 2 - panel]]
          : [[x - shelfWidth / 2, 1.78, 0], [x + shelfWidth / 2, 1.78, 0]], 0.012);
      }
      const frontWidth = width - panel, pitch = frontWidth / doorCount, doorWidth = pitch - 0.006;
      const leaves: THREE.Group[] = [];
      for (let index = 0; index < doorCount; index++) {
        const door = new THREE.Group();
        door.name = `${roomId}-wardrobe-door-${index}`;
        door.position.set(-frontWidth / 2 + index * pitch + 0.003, 0, depth / 2 + 0.014);
        closet.add(door);
        this.box(door, [doorWidth, height - 0.13, 0.022],
          [doorWidth / 2, centerY, 0], this.woodMaterial, 0.005);
        this.box(door, [0.014, 0.30, 0.020],
          [doorWidth - 0.03, 1.05, 0.023], this.steelMaterial, 0.004);
        leaves.push(door);
      }
      // Parallel hinges keep neighbouring leaves from overlapping when open.
      this.openings.registerGlazingDoor(leaves, (value) => {
        for (const door of leaves) door.rotation.y = -Math.PI / 2 * value;
      });
      this.tagRoom(closet, roomId);
    }
  }


  private buildBed(group: THREE.Group, width: number, roomId: string) {
    const bed = storageBed(width, roomId);
    // A hollow base, supported at floor level; no solid block inside the drawers.
    this.box(group, [width - 0.10, 0.04, 1.95], [0, 0.02, 0], this.supportMaterial, 0.008);
    this.box(group, [bed.frameWidth, 0.02, bed.length], [0, 0.038, 0], this.woodMaterial);
    this.box(group, [bed.frameWidth, 0.03, bed.length], [0, 0.325, 0], this.woodMaterial, 0.006);
    for (const z of [-bed.length / 2 + 0.0125, 0, bed.length / 2 - 0.0125]) {
      this.box(group, [bed.frameWidth, 0.28, 0.025], [0, 0.17, z], this.woodMaterial);
    }
    if (bed.sides.length === 2) {
      this.box(group, [0.035, 0.28, bed.length - 0.05], [0, 0.17, 0], this.woodMaterial);
    } else {
      const closedSide = -bed.sides[0];
      this.box(group, [0.025, 0.28, bed.length], [closedSide * (bed.frameWidth / 2 - 0.0125), 0.17, 0], this.woodMaterial);
    }
    for (const side of bed.sides) {
      this.box(group, [0.025, 0.28, bed.headPanelLength],
        [side * (bed.frameWidth / 2 - 0.0125), 0.17, bed.headPanelZ], this.woodMaterial);
    }
    const drawerIds: number[] = [];
    for (const placement of bed.drawers) {
      const drawer = new THREE.Group();
      drawer.name = `${roomId}-bed-drawer-${placement.side}-${placement.z}`;
      drawer.position.set(placement.closedX, 0, placement.z);
      drawer.rotation.y = placement.side * Math.PI / 2;
      group.add(drawer);
      const w = bed.drawerWidth, d = bed.drawerDepth;
      this.box(drawer, [w - 0.028, 0.018, d - 0.03], [0, 0.061, 0], this.woodMaterial);
      for (const x of [-w / 2 + 0.008, w / 2 - 0.008]) {
        this.box(drawer, [0.016, 0.22, d - 0.032], [x, 0.175, 0], this.woodMaterial);
      }
      this.box(drawer, [w, 0.22, 0.016], [0, 0.175, -d / 2 + 0.008], this.woodMaterial);
      this.box(drawer, [w + 0.016, 0.246, 0.022], [0, 0.178, d / 2 - 0.011], this.woodMaterial, 0.004);
      this.box(drawer, [0.20, 0.018, 0.006], [0, 0.257, d / 2 + 0.001], this.supportMaterial, 0.004);
      const runners = new THREE.Group();
      runners.position.copy(drawer.position);
      runners.rotation.copy(drawer.rotation);
      group.add(runners);
      for (const side of [-1, 1]) {
        this.box(runners, [0.008, 0.03, d - 0.05], [side * (w / 2 + 0.006), 0.13, 0], this.steelMaterial);
        this.box(drawer, [0.006, 0.018, d - 0.06], [side * (w / 2 + 0.001), 0.14, 0], this.steelMaterial);
      }
      const index = this.bedDrawers.length;
      drawer.traverse((object) => { if (object instanceof THREE.Mesh) object.userData.bedDrawerIndex = index; });
      this.bedDrawers.push({ group: drawer, closedX: placement.closedX, side: placement.side,
        travel: bed.travel, motion: new OpenCloseMotion(false) });
      drawerIds.push(index);
    }
    const mattress = this.box(group, [width, 0.22, 2], [0, 0.44, 0], this.beddingMaterial, 0.07);
    mattress.userData.bedDrawerIds = drawerIds;
    const blanket = this.box(group, [width + 0.015, 0.045, 1.26], [0, 0.567, 0.35], this.blanketMaterial, 0.02);
    blanket.userData.bedDrawerIds = drawerIds;
    const pillowWidth = width >= 1.5 ? width / 2 - 0.12 : 0.64;
    const pillows = width >= 1.5 ? [-width / 4, width / 4] : [0];
    for (const x of pillows) {
      const pillow = this.box(group, [pillowWidth, 0.12, 0.38], [x, 0.60, -0.66], this.beddingMaterial, 0.055);
      pillow.userData.bedDrawerIds = drawerIds;
    }
    // Every part of this bed shares one action, including drawer fronts and handles.
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) object.userData.bedDrawerIds = drawerIds;
    });
  }

  toggleBedDrawer(object: THREE.Object3D, now: number, reducedMotion = false) {
    const index = object.userData.bedDrawerIndex;
    const ids: number[] | undefined = object.userData.bedDrawerIds ?? (typeof index === "number" ? [index] : undefined);
    if (!ids?.length) return false;
    const drawers = ids.map((id) => this.bedDrawers[id]).filter((drawer) => !!drawer);
    const open = !drawers.every((drawer) => drawer.motion.open);
    for (const drawer of drawers) {
      drawer.motion.setOpen(open, now, reducedMotion);
      drawer.group.position.x = drawer.closedX + drawer.side * drawer.travel * drawer.motion.value;
    }
    return drawers.length > 0;
  }

  animateBedDrawers(now: number) {
    let moving = false;
    for (const drawer of this.bedDrawers) {
      moving = drawer.motion.advance(now) || moving;
      drawer.group.position.x = drawer.closedX + drawer.side * drawer.travel * drawer.motion.value;
    }
    return moving;
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
        curtain.castShadow = false;
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
    const { width, depth, sideInset, backInset } = bathroomVanitySize;
    const wallZ = -depth / 2;
    const fixture = new THREE.Group();
    // Seat the flat backs slightly into the tile face to avoid daylight seams
    // from rounded rear edges, floating-point precision and shadow bias.
    fixture.position.set(-sideInset, 0, -backInset);
    group.add(fixture);
    // Wall-hung cabinet: keep the basin height and leave 0.30 m clear below.
    // The left cabinet side follows the basin edge; only the free right side overhangs.
    const cabinet = new THREE.Group(); cabinet.name = "bathroom-vanity-cabinet";
    cabinet.position.set(-0.01, 0, wallZ + 0.22); fixture.add(cabinet);
    this.openings.buildCabinet(cabinet, { width: width - 0.02, depth: 0.44, bottom: 0.30, top: 0.70, title: "浴室柜" });
    this.box(fixture, [width, 0.04, depth], [0, 0.72, 0], this.ceramicMaterial);
    for (const side of [-1, 1]) {
      this.box(fixture, [0.04, 0.10, depth], [side * (width / 2 - 0.02), 0.79, 0],
        this.ceramicMaterial, side === -1 ? 0 : 0.015);
    }
    // A wider rear deck supports the faucet base instead of leaving it over the bowl.
    this.box(fixture, [width, 0.10, 0.08], [0, 0.79, wallZ + 0.04], this.ceramicMaterial);
    this.box(fixture, [0.64, 0.10, 0.04], [0, 0.79, 0.22], this.ceramicMaterial, 0.015);
    const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.004, 16), this.steelMaterial);
    drain.position.set(0, 0.741, 0.03);
    fixture.add(drain);
    this.buildBasinFaucet(fixture);
    // Keep the frameless surface just in front of its thin backing.
    this.box(fixture, [width, 0.82, 0.006], [0, 1.53, wallZ + 0.003], this.ceramicMaterial, 0.002);
    const mirror = createBathroomMirror(width, 0.82);
    this.materials.add(mirror.material);
    mirror.position.set(0, 1.53, wallZ + 0.0065);
    fixture.add(mirror);
    // Keep just the supporting wall behind the mirror in cutaway mode.
    this.mirrorBackdrops.push(this.box(group,
      [0.78, 2.0 - defaults.cutHeight, defaults.wallThickness],
      [0, (2.0 + defaults.cutHeight) / 2, wallZ - defaults.wallThickness / 2],
      [this.backdropMaterial, this.backdropMaterial, this.backdropMaterial, this.backdropMaterial,
        this.wetWallMaterial, this.backdropMaterial]));
  }

  private buildBasinFaucet(parent: THREE.Group) {
    const faucet = new THREE.Group();
    faucet.name = "basin-rounded-elbow-faucet";
    parent.add(faucet);
    const cylinder = (radius: number, height: number, y: number, z: number) => {
      const part = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 20), this.faucetMaterial);
      part.position.set(0, y, z);
      part.castShadow = part.receiveShadow = true;
      faucet.add(part);
    };
    cylinder(0.024, 0.012, 0.846, -0.20);
    cylinder(0.019, 0.122, 0.913, -0.20);
    // Explicit lines and circular-looking elbows prevent spline overshoot and
    // give the spout a horizontal reach followed by a downward outlet.
    const path = new THREE.CurvePath<THREE.Vector3>();
    path.add(new THREE.LineCurve3(new THREE.Vector3(0, 0.965, -0.20), new THREE.Vector3(0, 0.98, -0.20)));
    path.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.98, -0.20),
      new THREE.Vector3(0, 1.01, -0.20), new THREE.Vector3(0, 1.01, -0.17)));
    path.add(new THREE.LineCurve3(new THREE.Vector3(0, 1.01, -0.17), new THREE.Vector3(0, 1.01, -0.05)));
    path.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 1.01, -0.05),
      new THREE.Vector3(0, 1.01, -0.03), new THREE.Vector3(0, 0.99, -0.03)));
    const spout = new THREE.Mesh(new THREE.TubeGeometry(path, 32, 0.012, 12, false), this.faucetMaterial);
    spout.castShadow = spout.receiveShadow = true;
    faucet.add(spout);
    cylinder(0.014, 0.022, 0.985, -0.03);
    const outlet = new THREE.Mesh(new THREE.CircleGeometry(0.009, 16), this.darkMaterial);
    outlet.rotation.x = Math.PI / 2;
    outlet.position.set(0, 0.9735, -0.03);
    faucet.add(outlet);
    cylinder(0.017, 0.009, 0.9785, -0.20);
    const handle = new THREE.Group(); handle.position.set(0, 0.9785, -0.20); faucet.add(handle);
    this.box(handle, [0.018, 0.013, 0.06], [0, 0.0115, 0.015], this.faucetMaterial, 0.006);
    this.registerWaterTap(faucet, new THREE.Vector3(0, 0.9735, -0.03), 0.744, handle);
  }

  private buildKitchenFaucet(group: THREE.Group) {
    group.name = "kitchen-high-arc-faucet";
    const cylinder = (radius: number, height: number, y: number, z = 0) => {
      const part = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), this.faucetMaterial);
      part.position.set(0, y, z);
      part.castShadow = part.receiveShadow = true;
      group.add(part);
    };
    // Base sits on the rear countertop, with the outlet above the sink centre.
    cylinder(0.027, 0.012, 0.006);
    cylinder(0.022, 0.15, 0.083);
    const path = new THREE.CurvePath<THREE.Vector3>();
    path.add(new THREE.LineCurve3(new THREE.Vector3(0, 0.15, 0), new THREE.Vector3(0, 0.205, 0)));
    path.add(new THREE.CubicBezierCurve3(new THREE.Vector3(0, 0.205, 0),
      new THREE.Vector3(0, 0.405, 0), new THREE.Vector3(0, 0.405, 0.245),
      new THREE.Vector3(0, 0.25, 0.245)));
    path.add(new THREE.LineCurve3(new THREE.Vector3(0, 0.25, 0.245), new THREE.Vector3(0, 0.225, 0.245)));
    const neck = new THREE.Mesh(new THREE.TubeGeometry(path, 40, 0.015, 16, false), this.faucetMaterial);
    neck.castShadow = neck.receiveShadow = true;
    group.add(neck);
    cylinder(0.017, 0.026, 0.226, 0.245);
    const outlet = new THREE.Mesh(new THREE.CircleGeometry(0.012, 20), this.darkMaterial);
    outlet.rotation.x = Math.PI / 2;
    outlet.position.set(0, 0.2125, 0.245);
    group.add(outlet);
    // A side lever joins the body rather than hovering beside the curved neck.
    this.box(group, [0.041, 0.028, 0.028], [0.023, 0.087, 0], this.faucetMaterial, 0.009);
    const handle = new THREE.Group(); handle.position.set(0.041, 0.087, 0); group.add(handle);
    this.box(handle, [0.018, 0.051, 0.022], [0, 0.023, 0], this.faucetMaterial, 0.006);
    this.box(handle, [0.019, 0.014, 0.075], [0, 0.052, 0.026], this.faucetMaterial, 0.006);
    this.registerWaterTap(group, new THREE.Vector3(0, 0.2125, 0.245), -0.165, handle);
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
    { width, height, doorWidth }: { width: number; depth: number; height: number; doorWidth: number },
  ) {
    // The sloped tiled floor and drain now belong to the room architecture.
    const frame = 0.018;
    for (const x of [-width / 2 + frame / 2, width / 2 - frame / 2]) {
      this.box(group, [frame, height, 0.025], [x, height / 2, 0], this.steelMaterial);
    }
    this.box(group, [width, frame, 0.03], [0, height - frame / 2, 0], this.steelMaterial);
    this.box(group, [width, 0.075, 0.04], [0, -0.0125, 0], this.stoneMaterial);

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
    // Hinge on the right, opening into the wet area rather than the toilet aisle.
    this.openings.registerGlazingDoor([door], (value) => { door.rotation.y = -Math.PI / 2 * value; });
  }

  private buildBalconyFurniture() {
    const plants = new THREE.Group();
    plants.name = "balcony-terracotta-potted-trees";
    this.furnishings.add(plants);
    const materials = {
      bark: this.material({ color: "#796049", roughness: 1 }),
      foliage: this.material({ color: "#ffffff", vertexColors: true, roughness: 0.86, side: THREE.DoubleSide }),
      pot: this.material({ color: "#b97551", roughness: 0.92 }),
      soil: this.material({ color: "#42382b", roughness: 1 }),
    };
    for (const placement of balconyFurniture.plants) {
      const group = this.at(plants, placement.center);
      group.position.y = floorElevation("balcony", placement.center);
      group.add(createPottedTree(placement, materials));
    }
    this.tagRoom(plants, "balcony");
  }

  private buildKitchen() {
    this.buildExhaustFans();
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
    counter.position.y = floorElevation("kitchen", size.center);
    counter.name = "kitchen-counter-stove-and-sink";
    this.box(counter, [size.width - 0.08, 0.15, size.depth - 0.08],
      [0, 0.075, 0], this.supportMaterial);
    // Hollow cabinet sides leave room for the recessed sink rather than filling
    // its bowl with a solid cabinet or countertop underneath.
    const cabinet = new THREE.Group(); cabinet.name = "kitchen-base-cabinet"; counter.add(cabinet);
    this.openings.buildCabinet(cabinet, { width: size.width - 0.04, depth: size.depth - 0.04,
      bottom: 0.15, top: 0.84, doors: 5, title: "厨房橱柜" });

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
    sink.name = "kitchen-stainless-steel-sink";
    sink.position.set(sinkOffset, 0, sinkZ);
    counter.add(sink);
    this.box(sink, [sinkWidth, 0.02, sinkDepth], [0, 0.71, 0], this.sinkMaterial);
    for (const x of [-sinkWidth / 2 + 0.009, sinkWidth / 2 - 0.009]) {
      this.box(sink, [0.018, 0.17, sinkDepth], [x, 0.805, 0], this.sinkMaterial);
      this.box(sink, [0.03, 0.015, sinkDepth + 0.03], [x, 0.891, 0], this.sinkMaterial);
    }
    for (const z of [-sinkDepth / 2 + 0.009, sinkDepth / 2 - 0.009]) {
      this.box(sink, [sinkWidth, 0.17, 0.018], [0, 0.805, z], this.sinkMaterial);
      this.box(sink, [sinkWidth + 0.03, 0.015, 0.03], [0, 0.891, z], this.sinkMaterial);
    }
    const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.005, 16), this.sinkMaterial);
    drain.position.set(0, 0.722, 0);
    sink.add(drain);
    const faucet = new THREE.Group();
    faucet.position.set(sinkOffset, 0.89, -0.24);
    counter.add(faucet);
    this.buildKitchenFaucet(faucet);

    this.box(counter, [0.74, 0.04, 0.44], [cooktopOffset, 0.91, -0.03], this.darkMaterial, 0.018);
    for (const side of [-1, 1]) {
      const outerFlame = createGasFlameMaterial(false, side * 1.7);
      const innerFlame = createGasFlameMaterial(true, side * 1.7 + 0.4);
      this.materials.add(outerFlame).add(innerFlame);
      const burner = new THREE.Group();
      burner.name = `kitchen-${side === -1 ? "left" : "right"}-gas-burner`;
      burner.position.set(cooktopOffset + side * 0.21, 0.938, -0.055);
      counter.add(burner);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.018, 24), this.steelMaterial);
      burner.add(cap);
      this.box(burner, [0.27, 0.014, 0.025], [0, 0.012, 0], this.supportMaterial);
      this.box(burner, [0.025, 0.014, 0.27], [0, 0.012, 0], this.supportMaterial);
      const flames = createGasFlames(outerFlame, innerFlame);
      flames.position.y = 0.012;
      burner.add(flames);
      const knob = new THREE.Group();
      knob.name = `${burner.name}-control`;
      knob.position.set(cooktopOffset + side * 0.065, 0.938, 0.14);
      counter.add(knob);
      knob.add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.018, 16), this.steelMaterial));
      this.box(knob, [0.008, 0.004, 0.022], [0, 0.011, 0.005], this.whiteMaterial, 0.002);
      const index = this.gasBurners.length;
      for (const part of [burner, knob]) part.traverse((object) => {
        if (object instanceof THREE.Mesh) object.userData.gasBurnerIndex = index;
      });
      this.gasBurners.push(new GasBurner(flames, knob));
    }
    const label = this.label(counter, "燃气灶 · 点击开火", 1.15, "gas-burner");
    label.name = "kitchen-gas-burner-action-label";
    label.position.x = cooktopOffset;
    label.position.z = 0.20;
    label.element.dataset.fixtureAction = "gas-burner";
    label.element.setAttribute("type", "button");
    this.gasBurnerLabel = label;
    this.updateGasBurnerLabel();
    this.tagRoom(counter, "kitchen");
    this.buildFridge();
  }

  toggleGasBurner(object: THREE.Object3D, now: number, reducedMotion = false) {
    const index = object.userData.gasBurnerIndex;
    if (typeof index !== "number" || !this.gasBurners[index]) return false;
    return this.toggleGasBurnerLabel(now, reducedMotion);
  }

  toggleGasBurnerLabel(now: number, reducedMotion = false) {
    if (!this.gasBurners.length) return false;
    const turnOn = !this.gasBurners.every((burner) => burner.on);
    for (const burner of this.gasBurners) {
      if (burner.on !== turnOn) burner.toggle(now, reducedMotion);
    }
    this.updateGasBurnerLabel();
    return true;
  }

  private updateGasBurnerLabel() {
    if (!this.gasBurnerLabel) return;
    const on = this.gasBurners.some((burner) => burner.on);
    this.gasBurnerLabel.element.textContent = on ? "燃气灶 · 点击关火" : "燃气灶 · 点击开火";
    this.gasBurnerLabel.element.setAttribute("aria-pressed", String(on));
  }

  animateGasBurners(now: number) {
    if (!this.furnishings.visible) return false;
    let moving = false;
    for (const burner of this.gasBurners) moving = burner.advance(now) || moving;
    return moving;
  }

  private registerWaterTap(group: THREE.Group, outlet: THREE.Vector3, bottomY: number, handle: THREE.Group) {
    const water = new THREE.MeshBasicMaterial({ color: "#a1dbea", transparent: true, opacity: 0.48,
      depthWrite: false, toneMapped: false });
    this.materials.add(water);
    const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 1, 10), water);
    stream.position.set(outlet.x, outlet.y, outlet.z); group.add(stream);
    const splash = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.002, 5, 20), water);
    splash.rotation.x = -Math.PI / 2; splash.position.set(outlet.x, bottomY + 0.002, outlet.z); group.add(splash);
    const index = this.taps.length;
    group.traverse((object) => { if (object instanceof THREE.Mesh) object.userData.waterTapIndex = index; });
    this.taps.push(new WaterTap(stream, splash, handle, outlet.y, bottomY));
  }

  toggleWaterTap(object: THREE.Object3D, now: number, reducedMotion = false) {
    const index = object.userData.waterTapIndex;
    if (typeof index !== "number" || !this.taps[index]) return false;
    this.taps[index].toggle(now, reducedMotion); return true;
  }

  setRobotRoomScope(roomId: string | undefined, now: number) {
    this.robot?.route.setRoomScope(roomId, now);
    this.updateRobot();
  }

  toggleRobot(object: THREE.Object3D, now: number) {
    if (!object.userData.robotVacuum || !this.robot) return false;
    this.robot.route.toggle(now); this.updateRobot(); return true;
  }

  toggleRobotLabel(now: number) {
    return this.robot ? this.toggleRobot(this.robot.label, now) : false;
  }

  private updateRobot() {
    if (!this.robot) return;
    const { group, route, label } = this.robot;
    group.position.set(route.position[0] - modelCenter[0], 0, route.position[1] - modelCenter[1]);
    group.rotation.y = route.heading;
    label.element.textContent = route.status === "running" ? "清扫中 · 点击暂停"
      : route.status === "paused" ? "已暂停 · 点击继续" : "扫地机器人 · 点击运行";
    label.element.setAttribute("aria-pressed", String(route.status === "running"));
  }

  animateAppliances(now: number) {
    let moving = false;
    if (this.dryingRack) {
      moving = this.dryingRack.motion.advance(now) || moving;
      this.updateDryingRack();
    }
    if (this.furnishings.visible) {
      for (const fan of this.exhaustFans) moving = fan.motion.advance(now) || moving;
    }
    for (const tap of this.taps) moving = tap.advance(now) || moving;
    if (this.robot) {
      if (!this.equipment.visible) this.robot.route.pause(now);
      moving = this.robot.route.advance(now) || moving;
      this.updateRobot();
    }
    return moving;
  }

  private buildTelevisionSideDecor(group: THREE.Group) {
    const { cabinet, plant } = televisionSideDecor;
    const sideCabinet = new THREE.Group(); sideCabinet.position.set(cabinet.center[0], 0, cabinet.center[1]);
    sideCabinet.name = "tv-left-storage-cabinet"; group.add(sideCabinet);
    this.box(sideCabinet, [cabinet.width - 0.05, 0.08, cabinet.depth - 0.04], [0, 0.04, 0], this.supportMaterial, 0.008);
    this.openings.buildCabinet(sideCabinet, { ...cabinet, bottom: 0.08, top: cabinet.height, title: "客厅边柜" });
    const tree = createPottedTree(plant, {
      bark: this.material({ color: "#796049", roughness: 1 }),
      foliage: this.material({ color: "#ffffff", vertexColors: true, roughness: 0.86, side: THREE.DoubleSide }),
      pot: this.stoneMaterial, soil: this.material({ color: "#42382b", roughness: 1 }),
    });
    tree.position.set(plant.center[0], 0, plant.center[1]); tree.name = "tv-right-potted-tree"; group.add(tree);
  }

  toggleExhaustFan(object: THREE.Object3D, now: number, reducedMotion = false) {
    const index = object.userData.exhaustFanIndex;
    if (typeof index !== "number" || !this.exhaustFans[index]) return false;
    this.exhaustFans[index].motion.toggle(now, reducedMotion);
    return true;
  }

  private buildExhaustFans() {
    for (const roomId of ["kitchen", "bath", "ensuite"]) {
      const wall = walls.find(({ id }) => id === `${roomId}-north`)!;
      const opening = wall.openings!.find(({ kind }) => kind === "window")!;
      const group = this.at(this.furnishings,
        [wall.from[0] + (opening.start + opening.end) / 2, wall.from[1] + 0.14]);
      group.name = `${roomId}-window-exhaust-fan`;
      this.box(group, [0.32, 0.32, 0.08], [0, 0, 0], this.whiteMaterial, 0.018);
      const recess = new THREE.Mesh(new THREE.CircleGeometry(0.126, 32), this.darkMaterial);
      recess.position.z = 0.041;
      group.add(recess);
      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(0.025, 0);
      bladeShape.quadraticCurveTo(0.075, -0.055, 0.113, -0.018);
      bladeShape.quadraticCurveTo(0.117, 0.005, 0.096, 0.024);
      bladeShape.quadraticCurveTo(0.066, 0.046, 0.021, 0.022);
      bladeShape.closePath();
      const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.004, bevelEnabled: false });
      const rotor = new THREE.Group();
      rotor.name = `${roomId}-exhaust-fan-rotor`;
      group.add(rotor);
      for (let i = 0; i < 5; i++) {
        const blade = new THREE.Mesh(bladeGeometry, this.faucetMaterial);
        blade.rotation.z = i / 5 * Math.PI * 2;
        blade.position.z = 0.047;
        rotor.add(blade);
      }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.004, 6, 40), this.whiteMaterial);
      ring.position.z = 0.06;
      group.add(ring);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.015, 20), this.whiteMaterial);
      hub.rotation.x = Math.PI / 2;
      hub.position.z = 0.057;
      group.add(hub);
      for (const y of [-0.10, -0.075, -0.05, -0.025, 0, 0.025, 0.05, 0.075, 0.10]) {
        this.box(group, [2 * Math.sqrt(0.12 ** 2 - y ** 2), 0.005, 0.005],
          [0, y, 0.07], this.whiteMaterial);
      }
      const indicatorMaterial = new THREE.MeshBasicMaterial({ color: "#819190", toneMapped: false });
      this.materials.add(indicatorMaterial);
      const indicator = new THREE.Mesh(new THREE.CircleGeometry(0.006, 12), indicatorMaterial);
      indicator.position.set(0.125, -0.125, 0.041);
      group.add(indicator);
      const index = this.exhaustFans.length;
      group.traverse((object) => { if (object instanceof THREE.Mesh) object.userData.exhaustFanIndex = index; });
      // A lintel patch makes the wall mounting readable when the room walls are cut away.
      const backdrop = this.box(group, [0.40, 0.44, defaults.wallThickness], [0, 0, -0.14],
        [this.backdropMaterial, this.backdropMaterial, this.backdropMaterial, this.backdropMaterial,
          this.wetWallMaterial, this.backdropMaterial]);
      this.exhaustFans.push({ group, backdrop, windowTop: opening.top, motion: new ExhaustFan(rotor, indicatorMaterial) });
      this.tagRoom(group, roomId);
    }
  }

  private buildFridge() {
    const { center, rotation, width, depth, height } = kitchenFurniture.fridge;
    const group = this.at(this.furnishings, center, rotation);
    group.name = "kitchen-fridge";
    group.position.y = floorElevation("kitchen", center);
    const front = depth / 2;
    // Recessed base supports the cabinet; doors and handles stay in its footprint.
    this.box(group, [width - 0.08, 0.055, depth - 0.09], [0, 0.0275, -0.025], this.supportMaterial, 0.012);
    // Hollow shell, so opening the doors reveals the compartments and shelves.
    for (const x of [-width / 2 + 0.0135, width / 2 - 0.0135]) {
      this.box(group, [0.027, height - 0.055, depth - 0.05],
        [x, (height + 0.055) / 2, -0.025], this.whiteMaterial, 0.01);
    }
    this.box(group, [width - 0.054, height - 0.055, 0.03],
      [0, (height + 0.055) / 2, -depth / 2 + 0.015], this.whiteMaterial);
    for (const y of [0.07, 0.61, height - 0.015]) {
      this.box(group, [width, 0.03, depth - 0.05], [0, y, -0.025], this.whiteMaterial, 0.008);
    }
    for (const y of [0.29, 0.49, 0.82, 1.10, 1.40]) {
      this.box(group, [width - 0.065, 0.012, depth - 0.21], [0, y, -0.055], this.windowGlassMaterial);
      this.box(group, [width - 0.065, 0.018, 0.012], [0, y, 0.14], this.whiteMaterial, 0.004);
    }
    // Upper refrigerator and lower freezer, separated by a slim gasket seam.
    for (const [bottom, top, handleY] of [[0.075, 0.605, 0.55], [0.62, height - 0.02, 0.685]]) {
      const doorWidth = width - 0.02;
      const door = new THREE.Group();
      door.name = bottom > 0.6 ? "fridge-operable-refrigerator-door" : "fridge-operable-freezer-door";
      // Hinge on the wall side; the open leaf stays clear of the kitchen aisle.
      door.position.set(-doorWidth / 2, 0, front - 0.04);
      group.add(door);
      for (const x of [-doorWidth / 2 + 0.006, doorWidth / 2 - 0.006]) {
        this.box(group, [0.012, top - bottom, 0.009], [x, (bottom + top) / 2, front - 0.062], this.supportMaterial);
      }
      for (const y of [bottom + 0.006, top - 0.006]) {
        this.box(group, [doorWidth, 0.012, 0.009], [0, y, front - 0.062], this.supportMaterial);
      }
      this.box(door, [doorWidth, top - bottom, 0.038],
        [doorWidth / 2, (bottom + top) / 2, 0], this.whiteMaterial, 0.018);
      this.box(door, [0.32, 0.018, 0.022],
        [doorWidth / 2, handleY, 0.027], this.steelMaterial, 0.008);
      // Shallow door bins remain behind the shelf fronts when closed.
      const bins = bottom > 0.6 ? [0.94, 1.32] : [0.27];
      for (const y of bins) {
        this.box(door, [doorWidth - 0.08, 0.012, 0.05],
          [doorWidth / 2, y, -0.044], this.whiteMaterial, 0.004);
        this.box(door, [doorWidth - 0.08, 0.075, 0.007],
          [doorWidth / 2, y + 0.0375, -0.065], this.windowGlassMaterial, 0.003);
      }
      if (bottom > 0.6) {
        this.box(door, [0.09, 0.12, 0.005], [doorWidth / 2 + 0.15, 1.40, 0.021], this.darkMaterial, 0.008);
      }
      this.openings.registerGlazingDoor([door], (value) => { door.rotation.y = -Math.PI / 2 * value; });
    }
    this.tagRoom(group, "kitchen");
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
    const monitor = new THREE.Group(); monitor.name = "study-operable-monitor"; desk.add(monitor);
    this.box(monitor, [0.26, 0.02, 0.18], [-0.18, size.height + 0.01, -0.16], this.supportMaterial, 0.01);
    this.box(monitor, [0.045, 0.18, 0.045], [-0.18, size.height + 0.10, -0.19], this.supportMaterial, 0.01);
    this.box(monitor, [0.64, 0.38, 0.04], [-0.18, size.height + 0.35, -0.18], this.darkMaterial, 0.016);
    const screen = this.box(monitor, [0.605, 0.338, 0.005],
      [-0.18, size.height + 0.356, -0.158], this.screens[this.computerScreen].material, 0.006);
    screen.userData.fixtureHintPriority = 1;
    screen.castShadow = false;
    this.tagScreen(monitor, this.computerScreen, "电脑");
    this.box(desk, [0.43, 0.025, 0.14], [-0.18, size.height + 0.0125, 0.16], this.darkMaterial, 0.009);
    for (let row = 0; row < 3; row++) {
      for (let key = 0; key < 11; key++) {
        this.box(desk, [0.028, 0.004, 0.025],
          [-0.355 + key * 0.035, size.height + 0.027, 0.118 + row * 0.034], this.supportMaterial, 0.002);
      }
    }
    this.box(desk, [0.055, 0.035, 0.10], [0.16, size.height + 0.0175, 0.16], this.darkMaterial, 0.02);
    const tower = this.box(desk, [0.20, 0.39, 0.37], [0.54, size.height + 0.195, -0.1], this.darkMaterial, 0.018);
    this.tagScreen(tower, this.computerScreen, "电脑");
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
    const doorHeight = height - 0.12, doorCentreY = (height + 0.06) / 2;
    const leaves: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const direction = -side;
      const door = new THREE.Group();
      door.name = `study-display-cabinet-${side === -1 ? "left" : "right"}-door`;
      // Hinges at the outer jambs; the leaves open out into the room.
      door.position.set(side * (width / 2 - 0.029), 0, depth / 2 + 0.025);
      display.add(door);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(doorWidth - 0.026, doorHeight - 0.03), this.windowGlassMaterial);
      glass.position.set(direction * doorWidth / 2, doorCentreY, 0);
      door.add(glass);
      for (const x of [direction * 0.0065, direction * (doorWidth - 0.0065)]) {
        this.box(door, [0.013, doorHeight, 0.018], [x, doorCentreY, 0], this.woodMaterial);
      }
      for (const y of [doorCentreY - doorHeight / 2 + 0.0075, doorCentreY + doorHeight / 2 - 0.0075]) {
        this.box(door, [doorWidth, 0.015, 0.018], [direction * doorWidth / 2, y, 0], this.woodMaterial);
      }
      this.box(door, [0.016, 0.14, 0.03],
        [direction * (doorWidth - 0.038), 0.98, 0.022], this.steelMaterial, 0.005);
      for (const y of [0.28, height - 0.27]) {
        const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.06, 12), this.steelMaterial);
        hinge.position.set(0, y, 0);
        door.add(hinge);
      }
      // Reuse glass-door picking, cursor feedback and reversible motion.
      leaves.push(door);
    }
    this.openings.registerGlazingDoor(leaves, (value) => {
      leaves[0].rotation.y = -Math.PI / 2 * value;
      leaves[1].rotation.y = Math.PI / 2 * value;
    });
    this.tagRoom(display, roomId);
    const chair = this.at(this.furnishings, homeOfficeFurniture.chair.center, homeOfficeFurniture.chair.rotation);
    chair.name = "study-ergonomic-chair";
    this.furniture.buildOfficeChair(chair);
    const tucked = chair.position.clone();
    // Move along the desk's outward normal, keeping the passage clear.
    const direction = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), size.rotation);
    tucked.addScaledVector(direction, -0.22);
    this.openings.registerGlazingDoor([chair], (value) => {
      chair.position.copy(tucked).addScaledVector(direction, 0.45 * value);
    }, false, "书房椅子");
    this.tagRoom(chair, roomId);
  }

  update(options: FixtureOptions) {
    const previous = this.previousOptions;
    if (previous && !fixtureOptionsChanged(previous, options)) return;
    this.previousOptions = options;
    this.updateLabels(options);
    // Label-only changes do not require updating fixture geometry or materials.
    if (previous && !fixtureAppearanceChanged(previous, options)) return;
    this.openings.update(options);
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
    this.lighting.update(options);
    if (this.dryingRack) this.dryingRack.group.position.y = options.wallHeight;
    for (const { group } of this.curtains) group.scale.y = options.wallHeight - 0.12;
    for (const { unit, backdrop } of this.airConditioners) {
      unit.position.y = options.wallHeight - 0.35;
      const top = unit.position.y + 0.24;
      backdrop.scale.y = top - defaults.cutHeight;
      backdrop.position.y = (top + defaults.cutHeight) / 2;
      backdrop.visible = options.cutaway && options.view !== "plan";
    }
    for (const { group, backdrop, windowTop } of this.exhaustFans) {
      // Keep the entire preview above the window and below the adjustable ceiling.
      const scale = Math.min(1, Math.max(0.1, (options.wallHeight - windowTop - 0.04) / 0.44));
      group.scale.set(scale, scale, 1);
      group.position.y = windowTop + 0.02 + 0.22 * scale;
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
  }

  private updateLabels(options: FixtureOptions) {
    for (const label of this.labels) label.visible = options.labels && !label.element.dataset.fixtureAction;
    for (const label of this.equipmentLabels) {
      label.visible = options.labels && options.view !== "plan" && !label.element.dataset.fixtureAction;
    }
    if (this.equipmentPlanLabel) {
      this.equipmentPlanLabel.visible = options.labels && options.view === "plan";
    }
  }

  setHintMode(enabled: boolean) {
    if (enabled) for (const label of this.labels) label.visible = false;
    else if (this.previousOptions) this.updateLabels(this.previousOptions);
  }

  dispose() {
    this.geometryPool.clear();
    // HomeScene owns geometry and CSS label disposal through its scene traversal.
    for (const material of this.materials) material.dispose();
    this.curtainWeave.dispose();
    for (const texture of this.textures) texture.dispose();
  }
}

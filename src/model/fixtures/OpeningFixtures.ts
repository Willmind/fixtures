import * as THREE from "three";
import { defaults, walls } from "../plan.ts";
import { entryCorridor, homeDoors } from "../doors.ts";
import { balconyEntryDoor } from "../arrangements.ts";
import { OpenCloseMotion } from "../OpenCloseMotion.ts";
import { createSlidingWindow } from "../windows.ts";
import { bayWindowFor } from "../bayWindows.ts";
import { openingRooms } from "../roomView.ts";
import type { FixtureOptions } from "../options.ts";
import type { FixtureBuilderContext } from "./context.ts";

type BuilderContext = Pick<FixtureBuilderContext, "at" | "box" | "tagRoom" | "label"> & {
  materials: Pick<FixtureBuilderContext["materials"], "cabinet" | "white" | "wood" | "windowFrame" | "dark" | "steel" | "doorGlass" | "windowGlass" | "wetFloor" | "backdrop" | "support">;
};


/** Operable leaves are registered here, including appliance and cabinet doors. */
export class OpeningFixtures {
  private entranceWall?: THREE.Mesh;
  private doors: {
    body: THREE.Group; height: number; header: THREE.Mesh;
    handles: THREE.Group[]; motion: OpenCloseMotion; apply: (value: number) => void;
  }[] = [];
  private glazingDoors: { motion: OpenCloseMotion; apply: (value: number) => void }[] = [];
  private windows: ReturnType<typeof createSlidingWindow>[] = [];
  private readonly ctx: BuilderContext;
  private readonly entrances: THREE.Group;
  private readonly furnishings: THREE.Group;
  constructor(ctx: BuilderContext, entrances: THREE.Group, furnishings: THREE.Group) {
    this.ctx = ctx;
    this.entrances = entrances;
    this.furnishings = furnishings;
    this.buildDoors();
    this.buildWindows();
    this.buildBalconyEntryDoor();
    this.buildEntranceCorridor();
  }
  update(options: Pick<FixtureOptions, "wallHeight" | "cutaway">) {
    const visibleHeight = options.cutaway ? defaults.cutHeight : options.wallHeight;
    for (const window of this.windows) window.setVisibleHeight(visibleHeight);
    for (const door of this.doors) {
      const height = Math.min(visibleHeight, door.height), scale = height / door.height;
      door.body.scale.y = scale;
      door.header.visible = visibleHeight >= door.height;
      for (const handle of door.handles) {
        handle.position.y = Math.min(1, height - 0.12) / scale;
        handle.scale.y = 1 / scale;
      }
    }
    if (this.entranceWall) {
      this.entranceWall.scale.y = visibleHeight;
      this.entranceWall.position.y = visibleHeight / 2;
    }
  }

  private buildDoors() {
    for (const placement of homeDoors) {
      const { wall, opening, frame, gap, kind } = placement;
      const body = this.ctx.at(this.entrances, wall.from, placement.rotation);
      body.name = `${wall.id}-operable-door`;
      body.userData.roomIds = openingRooms(wall, opening);
      const width = opening.end - opening.start, height = opening.top;
      const thickness = wall.thickness ?? defaults.wallThickness;
      const material = kind === "entry" ? this.ctx.materials.cabinet
        : kind === "bathroom" ? this.ctx.materials.white : this.ctx.materials.wood;
      const frameMaterial = kind === "sliding" ? this.ctx.materials.windowFrame : material;
      for (const x of [opening.start + frame / 2, opening.end - frame / 2]) {
        this.ctx.box(body, [frame, height, thickness + 0.025], [x, height / 2, 0], frameMaterial);
      }
      const header = this.ctx.box(body, [width, frame, thickness + 0.025],
        [(opening.start + opening.end) / 2, height - frame / 2, 0], frameMaterial);
      const handles: THREE.Group[] = [];
      const addHandle = (parent: THREE.Group, x: number, z: number, direction: number) => {
        const handle = new THREE.Group();
        handle.position.set(x, 1, z);
        parent.add(handle);
        this.ctx.box(handle, [0.04, kind === "entry" ? 0.19 : 0.11, 0.016],
          [0, 0, 0], kind === "entry" ? this.ctx.materials.dark : this.ctx.materials.steel, 0.008);
        this.ctx.box(handle, [0.105, 0.018, 0.025], [-direction * 0.035, 0, Math.sign(z) * 0.018],
          this.ctx.materials.steel, 0.008);
        handles.push(handle);
      };
      let apply: (value: number) => void;
      if (kind === "sliding") {
        const clearWidth = width - frame * 2 - gap * 2;
        const left = opening.start + frame + gap;
        const panel = new THREE.Group();
        // Park the open panel along the kitchen-side wall, leaving the whole
        // doorway clear instead of reducing a 1.2 m opening to half its width.
        panel.position.set(left, 0, thickness / 2 + 0.055);
        body.add(panel);
        for (const x of [0.012, clearWidth - 0.012]) {
          this.ctx.box(panel, [0.024, height - frame - 0.025, 0.03],
            [x, (height - frame + 0.025) / 2, 0], frameMaterial);
        }
        for (const y of [0.04, height - frame - 0.015]) {
          this.ctx.box(panel, [clearWidth, 0.03, 0.03], [clearWidth / 2, y, 0], frameMaterial);
        }
        this.ctx.box(panel, [clearWidth - 0.048, height - frame - 0.085, 0.006],
          [clearWidth / 2, (height - frame + 0.025) / 2, 0], this.ctx.materials.doorGlass);
        for (const side of [-1, 1]) addHandle(panel, clearWidth - 0.075, side * 0.032, 1);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(clearWidth * 2 + 0.05, 0.04, 0.06), frameMaterial);
        rail.position.set(-clearWidth / 2, 0.065, thickness / 2 + 0.055);
        header.add(rail);
        apply = (value) => { panel.position.x = left - (clearWidth + gap) * value; };
      } else {
        const direction = placement.hinge === "start" ? 1 : -1;
        const leafWidth = width - frame * 2 - gap * 2;
        const pivot = new THREE.Group();
        pivot.position.x = direction === 1 ? opening.start + frame + gap : opening.end - frame - gap;
        // Put the hinge at the room-facing edge so the open leaf clears the jamb.
        pivot.position.z = -placement.swing * direction * (thickness / 2 + 0.03);
        body.add(pivot);
        this.ctx.box(pivot, [leafWidth, height - frame - 0.025, 0.045],
          [direction * leafWidth / 2, (height - frame + 0.025) / 2, 0], material, 0.004);
        for (const side of [-1, 1]) addHandle(pivot, direction * (leafWidth - 0.085), side * 0.032, direction);
        for (const y of [0.25, height - 0.3]) {
          const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.09, 12), this.ctx.materials.steel);
          hinge.position.set(0, y, 0);
          pivot.add(hinge);
        }
        apply = (value) => { pivot.rotation.y = placement.swing * Math.PI / 2 * value; };
      }
      const motion = new OpenCloseMotion();
      apply(motion.value);
      const index = this.doors.length;
      body.traverse((object) => { if (object instanceof THREE.Mesh) object.userData.homeDoorIndex = index; });
      this.doors.push({ body, height, header, handles, motion, apply });
    }
  }

  private buildWindows() {
    for (const wall of walls) {
      const rotation = -Math.atan2(wall.to[1] - wall.from[1], wall.to[0] - wall.from[0]);
      const windows = (wall.openings ?? []).filter(({ kind }) => kind === "window");
      if (!windows.length) continue;
      const wallGroup = this.ctx.at(this.entrances, wall.from, rotation);
      wallGroup.name = `${wall.id}-operable-windows`;
      for (const opening of windows) {
        const bay = bayWindowFor(wall.id);
        const window = createSlidingWindow(opening, {
          frame: this.ctx.materials.windowFrame, glass: this.ctx.materials.windowGlass, handle: this.ctx.materials.steel,
        }, bay?.panes ?? 2);
        if (bay) window.group.position.z = bay.outside * bay.projection;
        window.group.userData.roomIds = openingRooms(wall, opening);
        wallGroup.add(window.group);
        this.windows.push(window);
        this.registerGlazingDoor([window.group], window.apply);
      }
    }
  }

  private buildEntranceCorridor() {
    const { from, to, shoeCabinet: cabinet } = entryCorridor;
    const width = to[0] - from[0], depth = to[1] - from[1];
    const corridor = this.ctx.at(this.entrances, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]);
    corridor.name = "exterior-entry-corridor-preview";
    this.ctx.box(corridor, [width, 0.16, depth], [0, -0.08, 0], this.ctx.materials.wetFloor);
    this.entranceWall = this.ctx.box(corridor, [width, 1, 0.12], [0, 0.5, depth / 2], this.ctx.materials.backdrop);
    this.ctx.label(corridor, "门外走廊 · 示意", 0.05, "corridor");
    const cabinetGroup = this.ctx.at(this.furnishings, cabinet.center, cabinet.rotation);
    cabinetGroup.name = "entry-shoe-cabinet";
    this.ctx.box(cabinetGroup, [cabinet.width - 0.08, 0.1, cabinet.depth - 0.06],
      [0, 0.05, 0], this.ctx.materials.support, 0.01);
    const panel = 0.03;
    const bodyHeight = cabinet.height - 0.1;
    const bodyCenterY = (cabinet.height + 0.1) / 2;
    this.ctx.box(cabinetGroup, [cabinet.width, bodyHeight, panel],
      [0, bodyCenterY, -(cabinet.depth - panel) / 2], this.ctx.materials.wood);
    for (const side of [-1, 1]) {
      this.ctx.box(cabinetGroup, [panel, bodyHeight, cabinet.depth],
        [side * (cabinet.width - panel) / 2, bodyCenterY, 0], this.ctx.materials.wood);
    }
    for (const y of [0.1 + panel / 2, cabinet.height - panel / 2]) {
      this.ctx.box(cabinetGroup, [cabinet.width - panel * 2, panel, cabinet.depth],
        [0, y, 0], this.ctx.materials.wood);
    }
    for (const y of [0.34, 0.58, 0.82]) {
      this.ctx.box(cabinetGroup, [cabinet.width - panel * 2, 0.022, cabinet.depth - 0.06],
        [0, y, -0.005], this.ctx.materials.wood);
    }
    const hingeX = (cabinet.width - panel) / 2;
    const doorWidth = hingeX - 0.006;
    for (const side of [-1, 1]) {
      const door = new THREE.Group();
      door.name = `shoe-cabinet-door-${side < 0 ? "left" : "right"}`;
      door.position.set(side * hingeX, 0, cabinet.depth / 2 + 0.014);
      cabinetGroup.add(door);
      this.ctx.box(door, [doorWidth, cabinet.height - 0.15, 0.022],
        [-side * doorWidth / 2, bodyCenterY, 0], this.ctx.materials.wood, 0.008);
      this.ctx.box(door, [0.015, 0.15, 0.025],
        [-side * (doorWidth - 0.03), 0.83, 0.023], this.ctx.materials.steel, 0.005);
      this.registerGlazingDoor([door], (value) => { door.rotation.y = side * Math.PI / 2 * value; });
    }
    this.ctx.label(cabinetGroup, "鞋柜", cabinet.height + 0.12, "shoe-cabinet");
  }

  registerGlazingDoor(parts: THREE.Group[], apply: (value: number) => void, initialOpen = false) {
    const index = this.glazingDoors.length;
    const motion = new OpenCloseMotion(initialOpen);
    for (const part of parts) part.traverse((object) => {
      if (object instanceof THREE.Mesh) object.userData.glazingDoorIndex = index;
    });
    this.glazingDoors.push({ motion, apply });
    apply(motion.value);
  }

  private buildBalconyEntryDoor() {
    const { center, width, height } = balconyEntryDoor;
    const group = this.ctx.at(this.entrances, center);
    group.name = "main-balcony-sliding-glass-door";
    group.userData.roomIds = ["living", "balcony"];
    for (const x of [-width / 2, width / 2]) {
      this.ctx.box(group, [0.035, height, 0.1], [x, height / 2, 0], this.ctx.materials.windowFrame);
    }
    for (const y of [0.02, height - 0.02]) {
      this.ctx.box(group, [width, 0.04, 0.1], [0, y, 0], this.ctx.materials.windowFrame);
    }
    const panelWidth = width / 4;
    const panels: THREE.Group[] = [];
    for (let i = 0; i < 4; i++) {
      const panel = new THREE.Group();
      panel.position.set(-width / 2 + panelWidth * (i + 0.5), 0, i === 1 || i === 2 ? -0.045 : 0.015);
      group.add(panel);
      this.ctx.box(panel, [panelWidth - 0.045, height - 0.1, 0.008],
        [0, height / 2, 0], this.ctx.materials.windowGlass);
      for (const x of [-panelWidth / 2 + 0.012, panelWidth / 2 - 0.012]) {
        this.ctx.box(panel, [0.024, height - 0.08, 0.028], [x, height / 2, 0], this.ctx.materials.windowFrame);
      }
      for (const y of [0.045, height - 0.045]) {
        this.ctx.box(panel, [panelWidth, 0.024, 0.028], [0, y, 0], this.ctx.materials.windowFrame);
      }
      if (i === 1 || i === 2) {
        const x = (i === 1 ? 1 : -1) * (panelWidth / 2 - 0.085);
        for (const z of [-0.035, 0.035]) {
          this.ctx.box(panel, [0.02, 0.22, 0.025], [x, 1.05, z], this.ctx.materials.steel, 0.006);
        }
        panels.push(panel);
      }
    }
    this.registerGlazingDoor(panels, (value) => {
      panels[0].position.x = -panelWidth / 2 - (panelWidth - 0.035) * value;
      panels[1].position.x = panelWidth / 2 + (panelWidth - 0.035) * value;
    }, true);
    this.ctx.tagRoom(group, "balcony");
  }

  toggleDoor(object: THREE.Object3D, now: number, reducedMotion = false) {
    const glazingIndex = object.userData.glazingDoorIndex;
    if (typeof glazingIndex === "number") {
      const door = this.glazingDoors[glazingIndex];
      if (!door) return false;
      door.motion.toggle(now, reducedMotion);
      door.apply(door.motion.value);
      return true;
    }
    const index = object.userData.homeDoorIndex;
    if (typeof index !== "number") return false;
    const door = this.doors[index];
    if (!door) return false;
    door.motion.toggle(now, reducedMotion);
    door.apply(door.motion.value);
    return true;
  }

  isDoorOpen(object: THREE.Object3D) {
    const glazing = object.userData.glazingDoorIndex;
    return typeof glazing === "number" ? this.glazingDoors[glazing]?.motion.open
      : this.doors[object.userData.homeDoorIndex]?.motion.open;
  }

  animateDoors(now: number) {
    let moving = false;
    for (const door of [...this.doors, ...this.glazingDoors]) {
      moving = door.motion.advance(now) || moving;
      door.apply(door.motion.value);
    }
    return moving;
  }
}

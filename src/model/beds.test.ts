import test from "node:test";
import assert from "node:assert/strict";
import { storageBed } from "./beds.ts";
import { bedroomBeds, bedroomStorage } from "./arrangements.ts";
import { defaults, rooms, walls } from "./plan.ts";
import type { Point } from "./plan.ts";
import { homeDoors } from "./doors.ts";
import { OpenCloseMotion } from "./OpenCloseMotion.ts";

function footprint(center: Point, rotation: number, minX: number, maxX: number, minZ: number, maxZ: number) {
  const corners = [minX, maxX].flatMap((x) => [minZ, maxZ].map((z) => [
    center[0] + Math.cos(rotation) * x + Math.sin(rotation) * z,
    center[1] - Math.sin(rotation) * x + Math.cos(rotation) * z,
  ]));
  return { minX: Math.min(...corners.map(([x]) => x)), maxX: Math.max(...corners.map(([x]) => x)),
    minZ: Math.min(...corners.map(([, z]) => z)), maxZ: Math.max(...corners.map(([, z]) => z)) };
}
function overlaps(a: ReturnType<typeof footprint>, b: ReturnType<typeof footprint>) {
  return a.minX < b.maxX - 1e-6 && a.maxX > b.minX + 1e-6
    && a.minZ < b.maxZ - 1e-6 && a.maxZ > b.minZ + 1e-6;
}

test("双人床床头贴实墙且两侧留通道，单人床留出南侧通道", () => {
  for (const placement of bedroomBeds) {
    const bed = storageBed(placement.width, placement.roomId);
    const wall = walls.find(({ id }) => id === (placement.roomId === "study" ? "bath-east" : "bedrooms-divider"))!;
    const head = footprint(placement.center, placement.rotation,
      -bed.frameWidth / 2, bed.frameWidth / 2, -bed.length / 2, -bed.length / 2);
    const innerFace = wall.from[0] + (placement.roomId === "parents" ? -1 : 1) * defaults.wallThickness / 2;
    assert.ok(Math.abs(head.minX - innerFace) < 0.02, `${placement.roomId}: 床头贴实墙`);
    assert.ok(head.minZ > wall.from[1] && head.maxZ < wall.to[1]);
    const bounds = footprint(placement.center, placement.rotation,
      -bed.frameWidth / 2, bed.frameWidth / 2, -bed.length / 2, bed.length / 2);
    if (placement.roomId === "study") {
      const wardrobe = bedroomStorage.find(({ roomId }) => roomId === "study")!.wardrobe;
      assert.ok(wardrobe.center[1] - wardrobe.depth / 2 - 0.045 - bounds.maxZ >= 0.85);
    } else {
      const north = 5.25;
      assert.ok(bounds.minZ - north >= 0.60, `${placement.roomId}: 北侧通道`);
      assert.ok(8.55 - bounds.maxZ >= 0.60, `${placement.roomId}: 南侧通道`);
    }
  }
  const parents = bedroomBeds.find(({ roomId }) => roomId === "parents")!;
  const wardrobe = bedroomStorage.find(({ roomId }) => roomId === "parents")!.wardrobe;
  const footX = parents.center[0] - storageBed(parents.width, parents.roomId).length / 2;
  assert.ok(footX - (wardrobe.center[0] + wardrobe.depth / 2 + 0.045) >= 0.60,
    "父母房床尾至衣柜把手留约 60 cm");
});

test("床底抽屉开合不碰床头柜、衣柜，家具和展开抽屉不挡房门开合", () => {
  const doorIds: Record<string, string> = { master: "master-entry", parents: "bedroom-a-north", study: "study-south" };
  for (const placement of bedroomBeds) {
    const bed = storageBed(placement.width, placement.roomId);
    const { bedside, wardrobe } = bedroomStorage.find(({ roomId }) => roomId === placement.roomId)!;
    const cabinets = [
      footprint(bedside.center, bedside.rotation, -0.20, 0.20, -0.19, 0.23),
      footprint(wardrobe.center, wardrobe.rotation, -wardrobe.width / 2, wardrobe.width / 2,
        -wardrobe.depth / 2, wardrobe.depth / 2 + 0.045),
    ];
    const bedBounds = footprint(placement.center, placement.rotation,
      -bed.frameWidth / 2, bed.frameWidth / 2, -bed.length / 2, bed.length / 2);
    const objects = [...cabinets, bedBounds];
    for (const cabinet of cabinets) assert.ok(!overlaps(cabinet, bedBounds));
    for (const drawer of bed.drawers) {
      for (const open of [0, 0.5, 1]) {
        const x = drawer.closedX + drawer.side * bed.travel * open;
        const bounds = footprint(placement.center, placement.rotation,
          x - bed.drawerDepth / 2 - 0.015, x + bed.drawerDepth / 2 + 0.015,
          drawer.z - bed.drawerWidth / 2 - 0.015, drawer.z + bed.drawerWidth / 2 + 0.015);
        for (const cabinet of cabinets) assert.ok(!overlaps(bounds, cabinet),
          `${placement.roomId}: 抽屉 ${drawer.side}/${drawer.z} 与柜子冲突`);
        objects.push(bounds);
      }
    }
    const door = homeDoors.find(({ wall }) => wall.id === doorIds[placement.roomId])!;
    const { wall, opening, frame, gap, rotation, swing } = door;
    const direction = door.hinge === "start" ? 1 : -1;
    const pivotX = direction === 1 ? opening.start + frame + gap : opening.end - frame - gap;
    const pivotZ = -swing * direction * ((wall.thickness ?? defaults.wallThickness) / 2 + 0.03);
    const width = opening.end - opening.start - 2 * (frame + gap);
    for (let step = 0; step <= 30; step++) {
      const angle = swing * Math.PI / 2 * step / 30;
      for (let fraction = 0; fraction <= 20; fraction++) for (const face of [-0.05, 0.05]) {
        const x = pivotX + Math.cos(angle) * direction * width * fraction / 20 + Math.sin(angle) * face;
        const z = pivotZ - Math.sin(angle) * direction * width * fraction / 20 + Math.cos(angle) * face;
        const worldX = wall.from[0] + Math.cos(rotation) * x + Math.sin(rotation) * z;
        const worldZ = wall.from[1] - Math.sin(rotation) * x + Math.cos(rotation) * z;
        for (const object of objects) assert.ok(
          !(worldX > object.minX && worldX < object.maxX && worldZ > object.minZ && worldZ < object.maxZ),
          `${placement.roomId}: 房门开启 ${step}/30 时碰家具或抽屉`);
      }
    }
  }
});

test("三张床的抽屉从关闭到全开都留在卧室净空间内，贴墙侧不设抽屉", () => {
  for (const placement of bedroomBeds) {
    const bed = storageBed(placement.width, placement.roomId);
    const room = rooms.find(({ id }) => id === placement.roomId)!;
    const xs = room.polygon.map(([x]) => x), zs = room.polygon.map(([, z]) => z);
    // The master bed sits entirely in its southern rectangular sleeping area.
    const west = Math.min(...xs) + defaults.wallThickness / 2;
    const east = Math.max(...xs) - (placement.roomId === "master" ? 0.12 : defaults.wallThickness / 2);
    const north = placement.roomId === "master" ? 4.35 : Math.min(...zs) + defaults.wallThickness / 2;
    const south = Math.max(...zs) - defaults.wallThickness / 2;
    assert.ok(bed.travel > 0 && bed.travel < bed.drawerDepth - 0.05);
    for (const drawer of bed.drawers) {
      for (const open of [0, 0.5, 1]) {
        const centerX = drawer.closedX + drawer.side * bed.travel * open;
        for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
          const x = centerX + dx * (bed.drawerDepth / 2 + 0.005);
          const z = drawer.z + dz * (bed.drawerWidth / 2 + 0.015);
          const worldX = placement.center[0] + Math.cos(placement.rotation) * x + Math.sin(placement.rotation) * z;
          const worldZ = placement.center[1] - Math.sin(placement.rotation) * x + Math.cos(placement.rotation) * z;
          assert.ok(worldX > west && worldX < east && worldZ > north && worldZ < south,
            `${placement.roomId}, side ${drawer.side}, open ${open}`);
        }
      }
    }
    if (placement.roomId === "study") assert.deepEqual(bed.sides, [-1]);
  }
});

test("抽屉默认关闭，整床同步操作可统一混合状态且不会影响另一张床", () => {
  const a = new OpenCloseMotion(false), b = new OpenCloseMotion(false), other = new OpenCloseMotion(false);
  assert.equal(a.advance(0), false);
  assert.equal(a.value, 0);
  a.toggle(0);
  a.advance(180);
  const inFlight = a.value;
  assert.ok(inFlight > 0 && inFlight < 1);
  a.setOpen(false, 180);
  assert.equal(a.value, inFlight);
  a.advance(1000);
  assert.equal(a.value, 0);
  for (const drawer of [a, b]) drawer.setOpen(true, 1001, true);
  assert.equal(a.value, 1);
  assert.equal(b.value, 1);
  assert.equal(other.value, 0);
  assert.equal(a.advance(1002), false);
});

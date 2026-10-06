import test from "node:test";
import assert from "node:assert/strict";
import { storageBed } from "./beds.ts";
import { bedroomBeds } from "./arrangements.ts";
import { defaults, rooms } from "./plan.ts";
import { OpenCloseMotion } from "./OpenCloseMotion.ts";

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
    if (placement.roomId === "study") assert.deepEqual(bed.sides, [1]);
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

import test from "node:test";
import assert from "node:assert/strict";
import { balconyFurniture, balconyEntryDoor, balconyRoofs, balconyWindowRuns, furnitureSize, livingLayouts, livingPlacement, utilityEquipment } from "./arrangements.ts";
import { rooms, walls } from "./plan.ts";

test("两种方案交换电视和沙发的墙侧，并保持相向且不堵阳台通道", () => {
  for (const layout of livingLayouts) {
    const { tv, sofa } = livingPlacement(layout.id);
    const west = layout.tvSide === "guest";
    assert.equal(tv.center[0] < sofa.center[0], west);
    assert.equal(Math.sign(Math.sin(tv.rotation)), west ? 1 : -1);
    assert.equal(Math.sign(Math.sin(sofa.rotation)), west ? -1 : 1);
    for (const [object, size] of [[tv, furnitureSize.tvCabinet], [sofa, furnitureSize.sofa]] as const) {
      // World depth/width swap when rotated by 90 degrees; leave the north
      // bedroom corridor and south balcony doorway clear in both variants.
      assert.ok(object.center[0] - size.depth / 2 > 2.7);
      assert.ok(object.center[0] + size.depth / 2 < 6.7);
      assert.ok(object.center[1] - size.width / 2 > 5.5);
      assert.ok(object.center[1] + size.width / 2 < 8.15);
    }
  }
});

test("封窗只覆盖阳台开敞外沿，不封住室内入口或厨房侧墙", () => {
  const main = balconyWindowRuns.filter((run) => run.roomId === "balcony");
  const utility = balconyWindowRuns.filter((run) => run.roomId === "utility");
  assert.equal(main.length, 3);
  assert.equal(utility.length, 2);
  for (const run of [...main, ...utility]) {
    assert.ok(run.length > 0);
    // Transforming a frame's local endpoint must land on its real world edge.
    assert.ok(Math.abs(run.from[0] + Math.cos(run.rotation) * run.length - run.to[0]) < 1e-9);
    assert.ok(Math.abs(run.from[1] - Math.sin(run.rotation) * run.length - run.to[1]) < 1e-9);
  }
  assert.ok(main.every((run) => !(run.from[1] === 8.65 && run.to[1] === 8.65)));
  assert.ok(utility.every((run) => !(run.from[1] === 1.2 && run.to[1] === 1.2)));
  assert.ok(utility.every((run) => !(run.from[0] === 2.6 && run.to[0] === 2.6)));
});

test("两块顶板覆盖对应阳台，厨房侧保留实墙和餐厅入口", () => {
  assert.deepEqual(balconyRoofs.map((roof) => roof.roomId).sort(), ["balcony", "utility"]);
  for (const roof of balconyRoofs) {
    const room = rooms.find((item) => item.id === roof.roomId)!;
    for (const [x, z] of room.polygon) {
      assert.ok(Math.abs(x - roof.center[0]) <= roof.width / 2 + 1e-9);
      assert.ok(Math.abs(z - roof.center[1]) <= roof.depth / 2 + 1e-9);
    }
  }
  const wall = walls.find((item) => item.id === "kitchen-east")!;
  assert.ok(wall.openings?.length);
  assert.ok(wall.openings.every((opening) => opening.start >= 1.2));
  assert.ok(wall.openings.some((opening) => opening.kind === "door" && opening.start > 1.2));
  for (const appliance of [utilityEquipment.washer, utilityEquipment.heater]) {
    assert.ok(appliance.center[0] > 2.7 && appliance.center[0] < 3.5);
    assert.ok(appliance.center[1] > 0 && appliance.center[1] < 1.2);
  }
});


test("主阳台躺椅留在净空间内，中间保留至少八十厘米入口通道", () => {
  const balcony = rooms.find(({ id }) => id === "balcony")!;
  const xs = balcony.polygon.map(([x]) => x), zs = balcony.polygon.map(([, z]) => z);
  const west = Math.min(...xs) + 0.1, east = Math.max(...xs) - 0.1;
  const north = Math.min(...zs) + 0.1, south = Math.max(...zs) - 0.1;
  const { chairs, plants, chairLength, chairWidth } = balconyFurniture;
  for (const [x, z] of chairs) {
    assert.ok(x - chairLength / 2 > west && x + chairLength / 2 < east);
    assert.ok(z - chairWidth / 2 > north && z + chairWidth / 2 < south);
  }
  const aisleLeft = chairs[0][0] + chairLength / 2;
  const aisleRight = chairs[1][0] - chairLength / 2;
  assert.ok(aisleRight - aisleLeft >= 0.8);
  // The open four-panel door leaves the centre accessible between the recliners.
  const openHalfWidth = balconyEntryDoor.width / 4 - 0.035;
  assert.ok(aisleLeft > balconyEntryDoor.center[0] - openHalfWidth);
  assert.ok(aisleRight < balconyEntryDoor.center[0] + openHalfWidth);
  for (const [x, z] of plants) {
    assert.ok(x - 0.13 >= west && x + 0.13 <= east);
    assert.ok(z - 0.13 >= north && z + 0.13 <= south);
    for (const [chairX, chairZ] of chairs) {
      assert.ok(Math.abs(x - chairX) >= chairLength / 2 + 0.13
        || Math.abs(z - chairZ) >= chairWidth / 2 + 0.13);
    }
  }
});

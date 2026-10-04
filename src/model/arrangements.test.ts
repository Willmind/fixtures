import test from "node:test";
import assert from "node:assert/strict";
import { balconyRoofs, furnitureSize, livingLayouts, livingPlacement, utilityEquipment } from "./arrangements.ts";
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

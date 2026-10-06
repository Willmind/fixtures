import test from "node:test";
import * as THREE from "three";
import { createPottedTree } from "./plants.ts";
import assert from "node:assert/strict";
import { bathroomFittings, bathroomVanitySize, balconyFurniture, balconyEntryDoor, balconyRoofs, balconyWindowRuns, furnitureSize, livingLayouts, livingPlacement, utilityEquipment } from "./arrangements.ts";
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


test("主阳台盆栽的树冠留在净空间内，避开玻璃门与中间入口", () => {
  const balcony = rooms.find(({ id }) => id === "balcony")!;
  const xs = balcony.polygon.map(([x]) => x), zs = balcony.polygon.map(([, z]) => z);
  const west = Math.min(...xs) + 0.1, east = Math.max(...xs) - 0.1;
  const north = Math.min(...zs) + 0.1, south = Math.max(...zs) - 0.1;
  const clearLeft = balconyEntryDoor.center[0] - 0.5;
  const clearRight = balconyEntryDoor.center[0] + 0.5;
  for (const { center: [x, z], canopyRadius: radius, potRadius, height } of balconyFurniture.plants) {
    assert.ok(x - radius > west && x + radius < east);
    assert.ok(z - radius > north && z + radius < south);
    assert.ok(x + radius < clearLeft || x - radius > clearRight);
    assert.ok(potRadius * 1.15 < radius);
    assert.ok(height < 2.8);
    const material = new THREE.MeshStandardMaterial();
    const tree = createPottedTree({ ...balconyFurniture.plants.find((plant) => plant.center[0] === x)! },
      { bark: material, foliage: material, pot: material, soil: material });
    const bounds = new THREE.Box3().setFromObject(tree);
    assert.ok(bounds.min.x >= -radius && bounds.max.x <= radius, "实际叶片不得越过侧墙");
    assert.ok(bounds.min.z >= -radius && bounds.max.z <= radius, "实际树冠不得穿入玻璃门或外侧封窗");
    assert.ok(bounds.min.y >= 0 && bounds.max.y <= height);
    tree.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.dispose();
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    material.dispose();
  }
});


test("两个洗手台的背面和左侧同时贴墙，前沿避开卫生间门洞", () => {
  const { width, depth, sideInset, backInset } = bathroomVanitySize;
  for (const fitting of bathroomFittings) {
    const room = rooms.find(({ id }) => id === fitting.roomId)!;
    const west = Math.min(...room.polygon.map(([x]) => x)) + 0.1;
    const south = Math.max(...room.polygon.map(([, z]) => z)) - 0.1;
    const [x, z] = fitting.vanity.center;
    const rotation = fitting.vanity.rotation;
    const world = (localX: number, localZ: number) => [
      x + Math.cos(rotation) * (localX - sideInset) + Math.sin(rotation) * (localZ - backInset),
      z - Math.sin(rotation) * (localX - sideInset) + Math.cos(rotation) * (localZ - backInset),
    ];
    const back = world(0, -depth / 2), left = world(-width / 2, 0);
    assert.ok(Math.abs(back[0] - west + backInset) < 1e-9);
    assert.ok(Math.abs(left[1] - south - sideInset) < 1e-9, "左侧不能保留原来的十三厘米空位");
    const doorWall = walls.find(({ id }) => id === `${fitting.roomId}-south`)!;
    const opening = doorWall.openings!.find(({ kind }) => kind === "door")!;
    assert.ok(world(0, depth / 2)[0] < doorWall.from[0] + opening.start,
      "贴侧墙后仍要完整保留门洞");
  }
});

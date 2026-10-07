import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { bayWindows, bayPortal, createBayWindow } from "./bayWindows.ts";
import { defaults, walls, modelCenter } from "./plan.ts";
import { bedroomBeds } from "./arrangements.ts";
import { storageBed } from "./beds.ts";
import { splitWall } from "./geometry.ts";

const material = new THREE.MeshBasicMaterial();
const materials = { wall: material, sill: material, railing: material };

test("实拍的三个卧室补宽窗台，书房和主卧内侧普通窗保持原样；凹位不被原墙堵住", () => {
  assert.deepEqual(bayWindows.map(({ roomId }) => roomId), ["master", "parents", "study"]);
  for (const bay of bayWindows) {
    const wall = walls.find(({ id }) => id === bay.wallId)!;
    const opening = wall.openings!.find(({ kind }) => kind === "window")!;
    assert.equal(opening.sill, bay.sill);
    assert.ok(bay.start < opening.start && bay.end > opening.end);
    const pieces = splitWall(Math.hypot(wall.to[0] - wall.from[0], wall.to[1] - wall.from[1]),
      defaults.wallHeight, [bayPortal(bay, opening)]);
    assert.ok(!pieces.some((piece) => piece.start < bay.end && piece.end > bay.start
      && piece.bottom < opening.top && piece.top > bay.sill));
  }
});

test("飘窗外扩方向正确，台面与玻璃底齐平，半高墙保留窗台且没有高处悬空护栏", () => {
  for (const bay of bayWindows) {
    const wall = walls.find(({ id }) => id === bay.wallId)!;
    for (const height of [defaults.wallHeight, defaults.cutHeight, 0.3]) {
      const group = createBayWindow(wall, bay, height, materials);
      group.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(group);
      assert.ok(bounds.max.y <= height + 1e-6);
      const slab = group.getObjectByName("bay-sill");
      if (height >= bay.sill) {
        assert.ok(slab);
        const sillBounds = new THREE.Box3().setFromObject(slab);
        assert.ok(Math.abs(sillBounds.max.y - bay.sill) < 1e-6);
        assert.ok(Math.abs((bay.outside === 1 ? sillBounds.max.z : -sillBounds.min.z)
          - bay.projection) < 1e-6);
        assert.ok(Math.abs((bay.outside === 1 ? -sillBounds.min.z : sillBounds.max.z)
          - bay.inward) < 1e-6);
      }
      if (height <= defaults.cutHeight) assert.equal(group.getObjectByName("bay-guard-top"), undefined);
      group.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    }
  }
});

test("补回飘窗后窗台不穿入已有床架及完全展开的床底抽屉", () => {
  for (const bay of bayWindows) {
    const wall = walls.find(({ id }) => id === bay.wallId)!;
    const group = createBayWindow(wall, bay, defaults.wallHeight, materials);
    group.position.set(wall.from[0] - modelCenter[0], 0, wall.from[1] - modelCenter[1]);
    group.updateMatrixWorld(true);
    const sill = new THREE.Box3().setFromObject(group.getObjectByName("bay-sill")!);
    const placement = bedroomBeds.find(({ roomId }) => roomId === bay.roomId)!;
    const bed = storageBed(placement.width, placement.roomId);
    const body = new THREE.Box3(new THREE.Vector3(-bed.frameWidth / 2, 0, -bed.length / 2),
      new THREE.Vector3(bed.frameWidth / 2, 0.65, bed.length / 2));
    const transform = new THREE.Matrix4().makeRotationY(placement.rotation);
    transform.setPosition(placement.center[0] - modelCenter[0], 0, placement.center[1] - modelCenter[1]);
    assert.equal(sill.intersectsBox(body.applyMatrix4(transform)), false, `${bay.roomId}: 床架`);
    for (const drawer of bed.drawers) {
      const x = drawer.closedX + drawer.side * bed.travel;
      const bounds = new THREE.Box3(new THREE.Vector3(x - bed.drawerDepth / 2 - 0.015, 0,
        drawer.z - bed.drawerWidth / 2 - 0.015), new THREE.Vector3(x + bed.drawerDepth / 2 + 0.015,
        0.4, drawer.z + bed.drawerWidth / 2 + 0.015)).applyMatrix4(transform);
      assert.equal(sill.intersectsBox(bounds), false, `${bay.roomId}: 展开抽屉`);
    }
    group.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
  }
});

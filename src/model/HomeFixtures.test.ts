import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { HomeFixtures } from "./HomeFixtures.ts";
import { ceilingLighting, bedroomStorage } from "./arrangements.ts";
import { toggleFixture, animateFixtures } from "./fixtures/interactions.ts";
import type { FixtureOptions } from "./options.ts";
import { indexRoomLayers, roomLayer } from "./roomView.ts";
import { bayWindows } from "./bayWindows.ts";

const options: FixtureOptions = {
  lightingMode: "night", layout: "tv-guest", curtainColor: "cream", televisionMount: "cabinet",
  balconyRoofs: true, balconyModes: { balcony: "original", utility: "enclosed" },
  equipment: true, cutaway: true, view: "perspective", wallHeight: 2.8, labels: true,
};

function findMesh(root: THREE.Object3D, predicate: (mesh: THREE.Mesh) => boolean) {
  let result: THREE.Mesh | undefined;
  root.traverse((object) => { if (!result && object instanceof THREE.Mesh && predicate(object)) result = object; });
  assert.ok(result);
  return result;
}

test("拆分后的家具、灯光和开合控制共同工作，界面更新不重置手动状态", async (t) => {
  // Fixtures only create CSS label elements, not a canvas/WebGL renderer.
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement: () => ({ style: {}, dataset: {}, setAttribute() {}, textContent: "" }),
  } as unknown as Document;
  const fixtures = new HomeFixtures();
  t.after(() => {
    const geometries = new Set<THREE.BufferGeometry>();
    fixtures.group.traverse((object) => { if (object instanceof THREE.Mesh) geometries.add(object.geometry); });
    for (const geometry of geometries) geometry.dispose();
    fixtures.dispose();
    if (previousDocument) globalThis.document = previousDocument;
    else Reflect.deleteProperty(globalThis, "document");
  });
  fixtures.update(options);

  await t.test("飘窗外侧的活动窗扇和房门随所在房间展示，切换范围不重建家具", () => {
    indexRoomLayers([fixtures.group]);
    for (const bay of bayWindows) {
      const window = fixtures.group.getObjectByName(`${bay.wallId}-operable-windows`)!;
      assert.ok(window);
      window.traverse((object) => {
        if (object instanceof THREE.Mesh) assert.ok(object.layers.isEnabled(roomLayer(bay.roomId)));
      });
    }
    const door = fixtures.group.getObjectByName("bedroom-a-north-operable-door")!;
    const sharedRooms = door.userData.roomIds;
    assert.deepEqual(new Set(sharedRooms), new Set(["living", "parents"]));
    const leaves: THREE.Mesh[] = [];
    door.traverse((object) => { if (object instanceof THREE.Mesh) leaves.push(object); });
    for (const leaf of leaves) {
      assert.ok(leaf.layers.isEnabled(roomLayer("parents")));
      assert.ok(leaf.layers.isEnabled(roomLayer("living")));
    }
  });

  await t.test("灯光预设及手动开关在房间选择、标签和视角变化后保持", () => {
    const lights: THREE.PointLight[] = [];
    fixtures.group.traverse((object) => { if (object instanceof THREE.PointLight) lights.push(object); });
    assert.equal(lights.length, ceilingLighting.length + bedroomStorage.length);
    assert.ok(lights.every((light) => light.visible && !light.castShadow));
    const ceiling = findMesh(fixtures.group, (mesh) => mesh.userData.ceilingLightIndex === 0);
    assert.equal(toggleFixture(fixtures, ceiling, 0, true), true);
    assert.equal(lights.filter((light) => light.visible).length, lights.length - 1);
    fixtures.update({ ...options, labels: false });
    fixtures.update({ ...options, view: "plan" });
    fixtures.update({ ...options, view: "perspective" });
    assert.equal(lights.filter((light) => light.visible).length, lights.length - 1);
    fixtures.update({ ...options, lightCommand: { on: true, revision: 1 } });
    assert.ok(lights.every((light) => light.visible));
  });

  await t.test("同值选项和纯标签变化不刷新镜面，也不触发家具高度更新", () => {
    fixtures.update(options);
    const invalidate = t.mock.method(fixtures, "invalidateReflections");
    fixtures.update({ ...options, balconyModes: { ...options.balconyModes } });
    fixtures.update({ ...options, labels: false });
    assert.equal(invalidate.mock.callCount(), 0);
    fixtures.update({ ...options, wallHeight: 3.1 });
    assert.equal(invalidate.mock.callCount(), 1);
    invalidate.mock.restore();
    fixtures.update(options);
  });

  await t.test("门的开合继续由同一命中目标触发，普通设置更新保留打开状态", () => {
    const door = findMesh(fixtures.group, (mesh) => mesh.userData.homeDoorIndex === 0 && mesh.parent?.name !== "entry-operable-door");
    fixtures.group.updateMatrixWorld(true);
    const closed = door.matrixWorld.clone();
    assert.equal(fixtures.isOperable(door), true);
    assert.equal(toggleFixture(fixtures, door, 0, true), true);
    animateFixtures(fixtures, 1000);
    fixtures.group.updateMatrixWorld(true);
    assert.notDeepEqual(door.matrixWorld.elements, closed.elements);
    fixtures.update({ ...options, curtainColor: "honey" });
    assert.equal(toggleFixture(fixtures, door, 2000, true), true);
    fixtures.group.updateMatrixWorld(true);
    assert.deepEqual(door.matrixWorld.elements, closed.elements);
  });

  await t.test("不同视角和空家具方案正确显示或隐藏灯光，恢复后保留回路状态", () => {
    fixtures.update({ ...options, layout: "empty" });
    const lights: THREE.PointLight[] = [];
    fixtures.group.traverse((object) => { if (object instanceof THREE.PointLight) lights.push(object); });
    assert.ok(lights.every((light) => !light.visible));
    fixtures.update(options);
    assert.ok(lights.every((light) => light.visible));
  });
});

test("一个动画仍在运行时，其他家具动画也必须推进同一帧", () => {
  const calls: string[] = [];
  const host = {
    animateCurtains: () => { calls.push("curtains"); return true; },
    animateDoors: () => { calls.push("doors"); return false; },
    animateBedDrawers: () => { calls.push("drawers"); return true; },
    animateGasBurners: () => { calls.push("burners"); return false; },
    animateAppliances: () => { calls.push("appliances"); return false; },
  };
  assert.equal(animateFixtures(host, 1000), true);
  assert.deepEqual(calls, ["curtains", "doors", "drawers", "burners", "appliances"]);
});

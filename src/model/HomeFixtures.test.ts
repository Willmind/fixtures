import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { HomeFixtures } from "./HomeFixtures.ts";
import { ceilingLighting, bedroomStorage, utilityDryingRack } from "./arrangements.ts";
import { toggleFixture, animateFixtures } from "./fixtures/interactions.ts";
import type { FixtureOptions } from "./options.ts";
import { indexRoomLayers, roomLayer } from "./roomView.ts";
import { bayWindows } from "./bayWindows.ts";
import { FixtureHints } from "./FixtureHints.ts";

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
    createElement: (tag: string) => {
      const attributes = new Map<string, string>();
      return { tagName: tag.toUpperCase(), style: {}, dataset: {}, textContent: "",
        append: () => {},
        remove: () => {},
        ownerDocument: { defaultView: { Element: Object } },
        setAttribute: (name: string, value: string) => attributes.set(name, String(value)),
        getAttribute: (name: string) => attributes.get(name) ?? null };
    },
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

  await t.test("燃气灶文字与两侧炉头状态同步，房间交互模式统一隐藏文字标签", () => {
    const label = fixtures.group.getObjectByName("kitchen-gas-burner-action-label") as CSS2DObject;
    const left = fixtures.group.getObjectByName("kitchen-left-gas-burner")!;
    const right = fixtures.group.getObjectByName("kitchen-right-gas-burner")!;
    const leftFlames = left.getObjectByName("blue-gas-flame-ring")!;
    const rightFlames = right.getObjectByName("blue-gas-flame-ring")!;
    const leftCap = findMesh(left, (mesh) => typeof mesh.userData.gasBurnerIndex === "number");
    const rightCap = findMesh(right, (mesh) => typeof mesh.userData.gasBurnerIndex === "number");
    assert.equal(label.element.tagName, "BUTTON");
    assert.equal(label.element.dataset.fixtureAction, "gas-burner");
    assert.equal(label.element.textContent, "燃气灶 · 点击开火");
    assert.equal(fixtures.toggleGasBurnerLabel(0, true), true);
    assert.ok(leftFlames.visible && rightFlames.visible);
    assert.equal(label.element.textContent, "燃气灶 · 点击关火");
    assert.equal(label.element.getAttribute("aria-pressed"), "true");
    toggleFixture(fixtures, leftCap, 100, true);
    assert.ok(!leftFlames.visible && rightFlames.visible);
    assert.equal(label.element.textContent, "燃气灶 · 点击关火");
    fixtures.update({ ...options, labels: false });
    assert.equal(label.visible, false);
    fixtures.toggleGasBurnerLabel(200, true);
    assert.ok(!leftFlames.visible && !rightFlames.visible);
    toggleFixture(fixtures, rightCap, 300, true);
    assert.equal(label.element.textContent, "燃气灶 · 点击关火");
    fixtures.toggleGasBurnerLabel(400, true);
    assert.ok(!leftFlames.visible && !rightFlames.visible);
    assert.equal(label.element.textContent, "燃气灶 · 点击开火");
    assert.equal(label.element.getAttribute("aria-pressed"), "false");
    indexRoomLayers([fixtures.group]);
    assert.ok(label.layers.isEnabled(roomLayer("kitchen")));
    fixtures.update(options);
  });

  await t.test("交互圆点复用原物品目标，按房间和显示状态过滤并在操作后更新动作", () => {
    const hints = new FixtureHints(fixtures);
    const labels: CSS2DObject[] = [];
    fixtures.group.traverse((object) => {
      if (object.name.startsWith("fixture-hint-") && object instanceof CSS2DObject) labels.push(object);
    });
    assert.ok(labels.length > 20);
    assert.equal(new Set(labels.map((label) => label.element.dataset.fixtureHint)).size, labels.length);
    for (const label of labels.filter((item) => item.element.dataset.fixtureHint?.startsWith("gasBurnerIndex:"))) {
      const target = hints.targetFor(label.element.dataset.fixtureHint!)!;
      assert.ok(target.visible);
      assert.equal(fixtures.interactionInfo(target)?.action, "开火");
      assert.notEqual(target.parent?.name, "blue-gas-flame-ring");
    }
    indexRoomLayers([fixtures.group]);
    const camera = new THREE.OrthographicCamera(-15, 15, 15, -15, 0.1, 100);
    camera.position.set(0, 20, 20);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    camera.layers.set(roomLayer("master"));
    hints.update(camera, [], 10000, 10000, true);
    const visible = labels.filter((label) => label.visible);
    assert.ok(visible.length > 0);
    assert.ok(visible.every((label) => label.layers.isEnabled(roomLayer("master"))));
    hints.update(camera, [], 44, 44, true);
    assert.ok(labels.filter((label) => label.visible).length <= 1);
    const wardrobe = labels.find((label) => {
      const target = hints.targetFor(label.element.dataset.fixtureHint!);
      return target?.userData.roomId === "master" && fixtures.interactionInfo(target)?.title === "衣柜门";
    })!;
    assert.ok(wardrobe);
    const target = hints.targetFor(wardrobe.element.dataset.fixtureHint!)!;
    assert.equal(fixtures.interactionInfo(target)?.action, "打开");
    toggleFixture(fixtures, target, 0, true);
    hints.refresh();
    assert.equal(fixtures.interactionInfo(target)?.feedback, "衣柜门已打开");
    assert.equal(wardrobe.element.getAttribute("aria-label"), "衣柜门 · 关闭");
    assert.equal(wardrobe.element.getAttribute("aria-pressed"), "true");
    hints.update(camera, [], 10000, 10000, false);
    assert.ok(labels.every((label) => !label.visible));
    assert.equal(fixtures.interactionInfo(target)?.action, "关闭");
    hints.update(camera, [new THREE.Plane(new THREE.Vector3(1, 0, 0), -100)], 10000, 10000, true);
    assert.ok(labels.every((label) => !label.visible));
    fixtures.update({ ...options, layout: "empty" });
    hints.update(camera, [], 10000, 10000, true);
    assert.ok(labels.filter((label) => label.visible).every((label) => {
      const object = hints.targetFor(label.element.dataset.fixtureHint!)!;
      return fixtures.interactionInfo(object)?.kind === "homeDoorIndex";
    }));
    fixtures.update(options);
    toggleFixture(fixtures, target, 1, true);
    hints.dispose();
    assert.ok(labels.every((label) => !label.parent));
  });

  await t.test("晾衣架平滑升降并可途中反向，钢丝两端持续连接且切换设置不重置", () => {
    const rack = fixtures.group.getObjectByName("utility-ceiling-drying-rack")!;
    const frame = rack.getObjectByName("utility-drying-rack-moving-frame")!;
    const label = rack.getObjectByName("utility-drying-rack-action-label") as CSS2DObject;
    const rail = findMesh(frame, () => true);
    const motor = rack.children[0];
    const wires = rack.children.filter((object): object is THREE.Mesh => object instanceof THREE.Mesh
      && object.geometry instanceof THREE.CylinderGeometry && object.geometry.parameters.height === 1);
    assert.equal(wires.length, 4);
    const checkWires = () => {
      for (const wire of wires) {
        assert.ok(Math.abs(wire.position.y + wire.scale.y / 2 + 0.14) < 1e-10);
        assert.ok(Math.abs(wire.position.y - wire.scale.y / 2 - frame.position.y) < 1e-10);
      }
    };
    assert.equal(frame.position.y, -utilityDryingRack.drop);
    assert.equal(label.element.tagName, "BUTTON");
    assert.ok(fixtures.isOperable(rail));
    assert.ok(fixtures.isOperable(motor));
    assert.equal(toggleFixture(fixtures, rail, 0, false), true);
    assert.equal(fixtures.animateAppliances(210), true);
    assert.ok(frame.position.y < -utilityDryingRack.drop && frame.position.y > -utilityDryingRack.loweredDrop);
    const halfway = frame.position.y;
    checkWires();
    assert.equal(fixtures.toggleDryingRackLabel(210), true);
    assert.equal(frame.position.y, halfway);
    fixtures.animateAppliances(500);
    assert.equal(frame.position.y, -utilityDryingRack.drop);
    assert.equal(toggleFixture(fixtures, motor, 600, true), true);
    assert.equal(frame.position.y, -utilityDryingRack.loweredDrop);
    assert.equal(label.element.textContent, "晾衣架 · 点击升起");
    fixtures.update({ ...options, view: "plan", wallHeight: 3.1 });
    assert.equal(rack.position.y, 3.1);
    assert.equal(frame.position.y, -utilityDryingRack.loweredDrop);
    indexRoomLayers([fixtures.group]);
    assert.ok(rail.layers.isEnabled(roomLayer("utility")));
    checkWires();
    fixtures.toggleDryingRackLabel(700, true);
    assert.equal(frame.position.y, -utilityDryingRack.drop);
    assert.equal(label.element.textContent, "晾衣架 · 点击下降");
    assert.equal(label.element.getAttribute("aria-pressed"), "false");
    checkWires();
    fixtures.update(options);
  });

  await t.test("三个卧室衣柜两扇门独立开合，动画和房间切换保留状态", () => {
    for (const { roomId } of bedroomStorage) {
      const closet = fixtures.group.getObjectByName(`${roomId}-wardrobe`)!;
      const left = closet.getObjectByName(`${roomId}-wardrobe-left-door`)!;
      const right = closet.getObjectByName(`${roomId}-wardrobe-right-door`)!;
      const panel = findMesh(left, () => true);
      const handle = left.children[1];
      const rightPanel = findMesh(right, () => true);
      assert.ok(fixtures.isOperable(panel));
      assert.ok(fixtures.isOperable(handle));
      assert.notEqual(panel.userData.glazingDoorIndex, rightPanel.userData.glazingDoorIndex);
      assert.equal(Math.abs(left.rotation.y), 0);
      assert.equal(right.rotation.y, 0);
      assert.equal(toggleFixture(fixtures, panel, 0, false), true);
      assert.equal(fixtures.animateDoors(210), true);
      assert.ok(left.rotation.y < 0 && left.rotation.y > -Math.PI / 2);
      assert.equal(right.rotation.y, 0);
      fixtures.animateDoors(500);
      assert.equal(left.rotation.y, -Math.PI / 2);
      fixtures.update({ ...options, labels: false, view: "plan" });
      indexRoomLayers([fixtures.group]);
      assert.equal(left.rotation.y, -Math.PI / 2);
      assert.ok(panel.layers.isEnabled(roomLayer(roomId)));
      assert.equal(toggleFixture(fixtures, rightPanel, 500, true), true);
      assert.equal(right.rotation.y, Math.PI / 2);
      assert.equal(toggleFixture(fixtures, handle, 600, true), true);
      assert.equal(Math.abs(left.rotation.y), 0);
      assert.equal(right.rotation.y, Math.PI / 2);
      toggleFixture(fixtures, rightPanel, 600, true);
      assert.equal(right.rotation.y, 0);
    }
    fixtures.update(options);
  });

  await t.test("机器人文字按钮与模型共享运行、暂停、继续状态，暂停后不移动", () => {
    const label = fixtures.group.getObjectByName("robot-vacuum-action-label") as CSS2DObject;
    const robot = fixtures.group.getObjectByName("utility-robot-vacuum")!;
    const body = findMesh(robot, (mesh) => mesh.userData.robotVacuum === true);
    assert.equal(label.element.tagName, "BUTTON");
    assert.equal(label.element.getAttribute("type"), "button");
    assert.equal(label.element.dataset.fixtureAction, "robot");
    assert.equal(label.element.getAttribute("aria-pressed"), "false");
    const docked = robot.position.clone();
    assert.equal(fixtures.toggleRobotLabel(0), true);
    assert.equal(label.element.textContent, "清扫中 · 点击暂停");
    assert.equal(label.element.getAttribute("aria-pressed"), "true");
    fixtures.animateAppliances(100);
    assert.notDeepEqual(robot.position.toArray(), docked.toArray());
    assert.equal(toggleFixture(fixtures, body, 100, true), true);
    const paused = robot.position.clone();
    assert.equal(label.element.textContent, "已暂停 · 点击继续");
    assert.equal(label.element.getAttribute("aria-pressed"), "false");
    fixtures.animateAppliances(200);
    assert.deepEqual(robot.position.toArray(), paused.toArray());
    assert.equal(fixtures.toggleRobotLabel(300), true);
    fixtures.animateAppliances(400);
    assert.notDeepEqual(robot.position.toArray(), paused.toArray());
    fixtures.toggleRobotLabel(400);
  });

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

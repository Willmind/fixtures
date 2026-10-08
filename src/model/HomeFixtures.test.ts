import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { HomeFixtures } from "./HomeFixtures.ts";
import { ceilingLighting, bedroomStorage, utilityDryingRack, utilityEquipment } from "./arrangements.ts";
import { modelCenter } from "./plan.ts";
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
      const children: unknown[] = [];
      return { tagName: tag.toUpperCase(), style: {}, dataset: {}, textContent: "",
        children,
        append: (...nodes: unknown[]) => { children.push(...nodes); },
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

  await t.test("燃气灶一个控制点同步开关两侧炉头，文字和状态一致", () => {
    const label = fixtures.group.getObjectByName("kitchen-gas-burner-action-label") as CSS2DObject;
    const left = fixtures.group.getObjectByName("kitchen-left-gas-burner")!;
    const right = fixtures.group.getObjectByName("kitchen-right-gas-burner")!;
    const leftFlames = left.getObjectByName("blue-gas-flame-ring")!;
    const rightFlames = right.getObjectByName("blue-gas-flame-ring")!;
    const leftCap = findMesh(left, (mesh) => typeof mesh.userData.gasBurnerIndex === "number");
    const rightCap = findMesh(right, (mesh) => typeof mesh.userData.gasBurnerIndex === "number");
    assert.equal(fixtures.interactionInfo(leftCap)?.key, fixtures.interactionInfo(rightCap)?.key);
    assert.equal(label.element.tagName, "BUTTON");
    assert.equal(label.element.dataset.fixtureAction, "gas-burner");
    assert.equal(label.element.textContent, "燃气灶 · 点击开火");
    assert.equal(fixtures.toggleGasBurnerLabel(0, true), true);
    assert.ok(leftFlames.visible && rightFlames.visible);
    assert.equal(label.element.textContent, "燃气灶 · 点击关火");
    assert.equal(label.element.getAttribute("aria-pressed"), "true");
    toggleFixture(fixtures, leftCap, 100, true);
    assert.ok(!leftFlames.visible && !rightFlames.visible);
    assert.equal(label.element.textContent, "燃气灶 · 点击开火");
    fixtures.update({ ...options, labels: false });
    assert.equal(label.visible, false);
    fixtures.toggleGasBurnerLabel(200, true);
    assert.ok(leftFlames.visible && rightFlames.visible);
    toggleFixture(fixtures, rightCap, 300, true);
    assert.equal(label.element.textContent, "燃气灶 · 点击开火");
    assert.ok(!leftFlames.visible && !rightFlames.visible);
    fixtures.toggleGasBurnerLabel(400, true);
    assert.ok(leftFlames.visible && rightFlames.visible);
    // Reverse through the other knob mid-animation; both flames still end together.
    toggleFixture(fixtures, leftCap, 500, false);
    fixtures.animateGasBurners(680);
    const height = leftFlames.scale.y;
    toggleFixture(fixtures, rightCap, 680, false);
    assert.equal(leftFlames.scale.y, height);
    assert.equal(rightFlames.scale.y, height);
    fixtures.animateGasBurners(1200);
    assert.equal(leftFlames.scale.y, 1);
    assert.equal(rightFlames.scale.y, 1);
    fixtures.toggleGasBurnerLabel(1300, true);
    assert.equal(label.element.textContent, "燃气灶 · 点击开火");
    assert.equal(label.element.getAttribute("aria-pressed"), "false");
    indexRoomLayers([fixtures.group]);
    assert.ok(label.layers.isEnabled(roomLayer("kitchen")));
    fixtures.update(options);
    for (const name of ["kitchen-gas-burner-action-label", "utility-drying-rack-action-label", "robot-vacuum-action-label"]) {
      assert.equal(fixtures.group.getObjectByName(name)?.visible, false);
    }
  });

  await t.test("交互圆点复用原物品目标，按房间和显示状态过滤并在操作后更新动作", (sub) => {
    sub.mock.timers.enable({ apis: ["setTimeout"] });
    let expiries = 0;
    const hints = new FixtureHints(fixtures, () => { expiries++; });
    const labels: CSS2DObject[] = [];
    fixtures.group.traverse((object) => {
      if (object.name.startsWith("fixture-hint-") && object instanceof CSS2DObject) labels.push(object);
    });
    assert.ok(labels.length > 20);
    assert.equal(new Set(labels.map((label) => label.element.dataset.fixtureHint)).size, labels.length);
    assert.equal(labels.filter((label) => label.element.dataset.fixtureHint === "gasBurnerIndex:all").length, 1);
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
    hints.update(camera, [], 10000, 10000, true);
    assert.equal(hints.showFeedback(target), true);
    assert.equal(wardrobe.element.dataset.feedback, "true");
    assert.equal(wardrobe.element.children[2].textContent, "衣柜门已打开");
    hints.update(camera, [], 44, 44, true);
    assert.equal(wardrobe.visible, true);
    sub.mock.timers.tick(1500);
    hints.showFeedback(target);
    sub.mock.timers.tick(1000);
    assert.equal(wardrobe.element.dataset.feedback, "true");
    assert.equal(expiries, 0);
    sub.mock.timers.tick(1200);
    assert.equal(wardrobe.element.dataset.feedback, undefined);
    assert.equal(expiries, 1);
    hints.showFeedback(target);
    hints.update(camera, [], 10000, 10000, false);
    assert.ok(labels.every((label) => !label.visible));
    assert.equal(wardrobe.element.dataset.feedback, undefined);
    assert.equal(hints.showFeedback(target), false);
    sub.mock.timers.tick(2200);
    assert.equal(expiries, 1);
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
    hints.update(camera, [], 10000, 10000, true);
    hints.showFeedback(target);
    hints.dispose();
    sub.mock.timers.tick(2200);
    assert.equal(expiries, 1);
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

  await t.test("卧室衣柜分成三至四扇窄门，一个控制点同步开合且状态保留", () => {
    for (const { roomId, wardrobe } of bedroomStorage) {
      const closet = fixtures.group.getObjectByName(`${roomId}-wardrobe`)!;
      const leaves = closet.children.filter((object) => object.name.startsWith(`${roomId}-wardrobe-door-`));
      assert.equal(leaves.length, wardrobe.doors);
      const panels = leaves.map((door) => findMesh(door, () => true));
      const handle = leaves[0].children[1];
      assert.ok(fixtures.isOperable(handle));
      assert.equal(new Set(panels.map((mesh) => fixtures.interactionInfo(mesh)?.key)).size, 1);
      let previousRight = -Infinity;
      for (let index = 0; index < panels.length; index++) {
        const mesh = panels[index];
        mesh.geometry.computeBoundingBox();
        const bounds = mesh.geometry.boundingBox!;
        const width = bounds.max.x - bounds.min.x;
        assert.ok(width > 0.35 && width < 0.5, "每扇门约 40～46 cm 宽");
        const left = leaves[index].position.x + mesh.position.x + bounds.min.x;
        const right = leaves[index].position.x + mesh.position.x + bounds.max.x;
        assert.ok(left > previousRight, "关闭时门扇之间留缝且不重叠");
        assert.ok(left > -wardrobe.width / 2 && right < wardrobe.width / 2);
        previousRight = right;
      }
      toggleFixture(fixtures, panels[0], 0, false);
      fixtures.animateDoors(210);
      assert.ok(leaves.every((door) => door.rotation.y < 0 && door.rotation.y > -Math.PI / 2));
      const inFlight = leaves.map((door) => door.rotation.y);
      toggleFixture(fixtures, panels.at(-1)!, 210, false);
      assert.deepEqual(leaves.map((door) => door.rotation.y), inFlight);
      fixtures.animateDoors(500);
      assert.ok(leaves.every((door) => Math.abs(door.rotation.y) === 0));
      toggleFixture(fixtures, handle, 600, true);
      assert.ok(leaves.every((door) => door.rotation.y === -Math.PI / 2));
      fixtures.update({ ...options, labels: false, view: "plan" });
      indexRoomLayers([fixtures.group]);
      assert.ok(leaves.every((door) => door.rotation.y === -Math.PI / 2));
      assert.ok(panels.every((panel) => panel.layers.isEnabled(roomLayer(roomId))));
      toggleFixture(fixtures, panels.at(-1)!, 700, true);
      assert.ok(leaves.every((door) => Math.abs(door.rotation.y) === 0));
    }
    fixtures.update(options);
  });

  await t.test("书房椅子沿桌前方向抽拉，任意部位共用控制且可中途反向", () => {
    const chair = fixtures.group.getObjectByName("study-ergonomic-chair");
    assert.ok(chair);
    const seat = findMesh(chair, (mesh) => mesh.parent === chair && typeof mesh.userData.glazingDoorIndex === "number");
    const wheel = findMesh(chair, (mesh) => mesh.geometry instanceof THREE.CylinderGeometry);
    const tucked = chair.position.clone();
    assert.equal(fixtures.interactionInfo(seat)?.action, "拉出");
    assert.equal(fixtures.interactionInfo(wheel)?.key, fixtures.interactionInfo(seat)?.key);
    toggleFixture(fixtures, seat, 0, false);
    animateFixtures(fixtures, 180);
    assert.ok(chair.position.x > tucked.x && chair.position.x < tucked.x + 0.45);
    assert.ok(Math.abs(chair.position.z - tucked.z) < 1e-6);
    const inFlight = chair.position.clone();
    toggleFixture(fixtures, wheel, 180, false);
    assert.deepEqual(chair.position.toArray(), inFlight.toArray());
    animateFixtures(fixtures, 1000);
    assert.deepEqual(chair.position.toArray(), tucked.toArray());
    toggleFixture(fixtures, wheel, 1100, true);
    assert.ok(Math.abs(chair.position.x - tucked.x - 0.45) < 1e-6);
    fixtures.update({ ...options, labels: false });
    assert.equal(fixtures.interactionInfo(seat)?.feedback, "书房椅子已拉出");
    toggleFixture(fixtures, seat, 1200, true);
    fixtures.update(options);
  });

  await t.test("电脑和电视分别亮屏，电视跨布局及安装方式保留开关且不改变照明", () => {
    const screens: THREE.Mesh[] = [];
    fixtures.group.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData.fixtureHintPriority === 1 &&
        typeof object.userData.screenIndex === "number") screens.push(object);
    });
    const computer = screens.find((mesh) => mesh.userData.fixtureTitle === "电脑");
    const televisions = screens.filter((mesh) => mesh.userData.fixtureTitle === "电视");
    assert.ok(computer);
    assert.equal(televisions.length, 4);
    const tv = televisions[0];
    const tvMaterial = tv.material as THREE.MeshBasicMaterial;
    const computerMaterial = computer.material as THREE.MeshBasicMaterial;
    const dark = tvMaterial.color.clone();
    const lightState = fixtures.lightState;
    assert.equal(fixtures.interactionInfo(tv)?.active, false);
    toggleFixture(fixtures, tv, 0, true);
    assert.equal(fixtures.interactionInfo(tv)?.action, "关机");
    assert.ok(!tvMaterial.color.equals(dark));
    assert.equal(computerMaterial.color.equals(dark), true);
    assert.ok(televisions.every((mesh) => mesh.material === tvMaterial));
    fixtures.update({ ...options, layout: "tv-bedroom-a", televisionMount: "wall" });
    assert.ok(televisions.every((mesh) => fixtures.interactionInfo(mesh)?.active));
    toggleFixture(fixtures, computer, 100, true);
    assert.equal(fixtures.interactionInfo(computer)?.feedback, "电脑已开机");
    toggleFixture(fixtures, televisions[3], 200, true);
    assert.equal(tvMaterial.color.equals(dark), true);
    assert.equal(fixtures.interactionInfo(computer)?.active, true);
    assert.deepEqual(fixtures.lightState, lightState);
    assert.equal(tvMaterial.toneMapped, false);
    toggleFixture(fixtures, computer, 300, true);
    fixtures.update(options);
  });

  await t.test("主卫马桶盖可平滑开合和中途反向，设置更新保留状态且只有一个提示", () => {
    const toilet = fixtures.group.getObjectByName("ensuite-seated-toilet");
    assert.ok(toilet);
    const lid = toilet.getObjectByName("toilet-operable-lid");
    assert.ok(lid);
    const cover = findMesh(lid, () => true);
    assert.equal(fixtures.interactionInfo(cover)?.title, "马桶盖");
    assert.equal(fixtures.interactionInfo(cover)?.action, "打开");
    assert.equal(Math.abs(lid.rotation.x), 0);
    toggleFixture(fixtures, cover, 0, false);
    animateFixtures(fixtures, 180);
    assert.ok(lid.rotation.x < 0 && lid.rotation.x > -Math.PI * 0.47);
    const inFlight = lid.rotation.x;
    toggleFixture(fixtures, cover, 180, false);
    assert.equal(lid.rotation.x, inFlight);
    animateFixtures(fixtures, 1000);
    assert.equal(Math.abs(lid.rotation.x), 0);
    toggleFixture(fixtures, cover, 1100, true);
    assert.equal(lid.rotation.x, -Math.PI * 0.47);
    fixtures.update({ ...options, labels: false, wallHeight: 3.1 });
    assert.equal(lid.rotation.x, -Math.PI * 0.47);
    assert.equal(fixtures.interactionInfo(cover)?.feedback, "马桶盖已打开");
    const hints = new FixtureHints(fixtures);
    try {
      const key = fixtures.interactionInfo(cover)!.key;
      const labels: CSS2DObject[] = [];
      fixtures.group.traverse((object) => {
        if (object instanceof CSS2DObject && object.element.dataset.fixtureHint === key) labels.push(object);
      });
      assert.equal(labels.length, 1);
      indexRoomLayers([fixtures.group]);
      assert.ok(cover.layers.isEnabled(roomLayer("ensuite")));
      const squat = fixtures.group.getObjectByName("bath-squat-toilet");
      assert.ok(squat);
      assert.equal(squat.getObjectByName("toilet-operable-lid"), undefined);
    } finally { hints.dispose(); }
    toggleFixture(fixtures, cover, 1200, true);
    fixtures.update(options);
  });

  await t.test("鞋柜和展示柜两门同步，电视柜、边柜、浴室柜、厨房橱柜均可整组开合", () => {
    const cabinets: THREE.Object3D[] = [];
    const names = new Set(["entry-shoe-cabinet", "study-empty-display-cabinet", "living-tv-cabinet",
      "tv-left-storage-cabinet", "bathroom-vanity-cabinet", "kitchen-base-cabinet"]);
    fixtures.group.traverse((object) => { if (names.has(object.name)) cabinets.push(object); });
    assert.equal(cabinets.length, 9); // Two alternative living layouts each own their TV and side cabinet.
    for (const cabinet of cabinets) {
      const leaves = cabinet.children.filter((object) => object instanceof THREE.Group &&
        object.children.some((child) => typeof child.userData.glazingDoorIndex === "number"));
      assert.equal(leaves.length, cabinet.name === "kitchen-base-cabinet" ? 5 : 2);
      const targets = leaves.map((leaf) => findMesh(leaf, (mesh) => typeof mesh.userData.glazingDoorIndex === "number"));
      assert.equal(new Set(targets.map((target) => fixtures.interactionInfo(target)?.key)).size, 1);
      assert.equal(toggleFixture(fixtures, targets[0], 0, false), true);
      fixtures.animateDoors(180);
      assert.ok(leaves.every((leaf) => Math.abs(leaf.rotation.y) > 0 && Math.abs(leaf.rotation.y) < Math.PI / 2));
      // Reverse through the opposite door while the opening animation is in progress.
      const inFlight = leaves.map((leaf) => leaf.rotation.y);
      toggleFixture(fixtures, targets.at(-1)!, 180, false);
      assert.deepEqual(leaves.map((leaf) => leaf.rotation.y), inFlight);
      fixtures.animateDoors(1000);
      assert.ok(leaves.every((leaf) => Math.abs(leaf.rotation.y) === 0));
      toggleFixture(fixtures, targets[0], 1000, true);
      assert.ok(leaves.every((leaf) => Math.abs(leaf.rotation.y) === Math.PI / 2));
      fixtures.update({ ...options, view: "plan" });
      assert.ok(leaves.every((leaf) => Math.abs(leaf.rotation.y) === Math.PI / 2));
      toggleFixture(fixtures, targets.at(-1)!, 1100, true);
      assert.ok(leaves.every((leaf) => Math.abs(leaf.rotation.y) === 0));
    }
    fixtures.update(options);
  });

  await t.test("每张床只显示一个抽屉按钮，点击任一抽屉联动整床，不影响其他床", () => {
    const hints = new FixtureHints(fixtures);
    try {
      for (const { roomId } of bedroomStorage) {
        const bed = fixtures.group.getObjectByName(`${roomId}-bed`)!;
        const drawers = bed.children.filter((object) => object.name.startsWith(`${roomId}-bed-drawer-`));
        const positions = drawers.map((drawer) => drawer.position.x);
        const front = findMesh(drawers[0], (mesh) => typeof mesh.userData.bedDrawerIndex === "number");
        const key = fixtures.interactionInfo(front)!.key;
        const labels: CSS2DObject[] = [];
        bed.traverse((object) => {
          if (object instanceof CSS2DObject && object.element.dataset.fixtureHint === key) labels.push(object);
        });
        assert.equal(labels.length, 1);
        const target = hints.targetFor(key)!;
        const other = fixtures.group.getObjectByName(`${roomId === "master" ? "parents" : "master"}-bed`)!;
        const otherPositions = other.children.map((child) => child.position.toArray());
        assert.equal(toggleFixture(fixtures, target, 0, true), true);
        assert.ok(drawers.every((drawer, index) => drawer.position.x !== positions[index]));
        assert.equal(fixtures.interactionInfo(front)?.action, "收回");
        assert.deepEqual(other.children.map((child) => child.position.toArray()), otherPositions);
        toggleFixture(fixtures, front, 100, true);
        assert.deepEqual(drawers.map((drawer) => drawer.position.x), positions);
      }
    } finally { hints.dispose(); }
  });

  await t.test("每个床头柜一个按钮同时拉出两个真实抽屉，床头灯保持独立", () => {
    const hints = new FixtureHints(fixtures);
    try {
      for (const { roomId } of bedroomStorage) {
        const cabinet = fixtures.group.getObjectByName(`${roomId}-bedside-cabinet`)!;
        const drawers = cabinet.children.filter((object) => object.name.startsWith(`${roomId}-bedside-cabinet-drawer-`));
        assert.equal(drawers.length, 2);
        const target = findMesh(drawers[0], (mesh) => typeof mesh.userData.glazingDoorIndex === "number");
        const key = fixtures.interactionInfo(target)!.key;
        const labels: CSS2DObject[] = [];
        cabinet.traverse((object) => {
          if (object instanceof CSS2DObject && object.element.dataset.fixtureHint === key) labels.push(object);
        });
        assert.equal(labels.length, 1);
        const lamp = findMesh(cabinet, (mesh) => typeof mesh.userData.bedsideLampIndex === "number");
        assert.equal(hints.targetFor(key)?.userData.fixtureHintPriority, 1); // Anchor on the visible front, not the interior floor.
        const lampState = fixtures.interactionInfo(lamp)?.active;
        toggleFixture(fixtures, hints.targetFor(key)!, 0, true);
        assert.ok(drawers.every((drawer) => drawer.position.z === 0.24));
        assert.equal(fixtures.interactionInfo(lamp)?.active, lampState);
        toggleFixture(fixtures, findMesh(drawers[1], () => true), 100, true);
        assert.ok(drawers.every((drawer) => drawer.position.z === 0));
      }
    } finally { hints.dispose(); }
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

  await t.test("阳台视图下机器人留在阳台内，清扫结束模型与按钮同步回充", () => {
    const robot = fixtures.group.getObjectByName("utility-robot-vacuum")!;
    const label = fixtures.group.getObjectByName("robot-vacuum-action-label") as CSS2DObject;
    fixtures.setRobotRoomScope("utility", 500);
    assert.equal(fixtures.toggleRobotLabel(500), true);
    for (let now = 600; now <= 10500; now += 100) {
      fixtures.animateAppliances(now);
      assert.ok(robot.position.z + modelCenter[1] >= 0.32);
      assert.ok(robot.position.z + modelCenter[1] <= 0.88);
    }
    assert.deepEqual(robot.position.toArray(), [utilityEquipment.robot.center[0] - modelCenter[0], 0,
      utilityEquipment.robot.center[1] - modelCenter[1]]);
    assert.equal(label.element.textContent, "扫地机器人 · 点击运行");
    assert.equal(label.element.getAttribute("aria-pressed"), "false");
    fixtures.setRobotRoomScope(undefined, 10500);
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
    assert.equal(lights.length, ceilingLighting.length + bedroomStorage.length + 4);
    assert.ok(lights.every((light) => light.visible && !light.castShadow));
    assert.deepEqual(fixtures.lightState, { on: true, mixed: false });
    const ceiling = findMesh(fixtures.group, (mesh) => mesh.userData.ceilingLightIndex === 0);
    assert.equal(toggleFixture(fixtures, ceiling, 0, true), true);
    assert.equal(lights.filter((light) => light.visible).length, lights.length - 1);
    assert.deepEqual(fixtures.lightState, { on: false, mixed: true });
    fixtures.update({ ...options, labels: false });
    fixtures.update({ ...options, view: "plan" });
    fixtures.update({ ...options, view: "perspective" });
    assert.equal(lights.filter((light) => light.visible).length, lights.length - 1);
    assert.deepEqual(fixtures.lightState, { on: false, mixed: true });
    fixtures.update({ ...options, lightCommand: { on: true, revision: 1 } });
    assert.ok(lights.every((light) => light.visible));
    assert.deepEqual(fixtures.lightState, { on: true, mixed: false });
    fixtures.update({ ...options, lightCommand: { on: false, revision: 2 } });
    assert.deepEqual(fixtures.lightState, { on: false, mixed: false });
    const bedside = findMesh(fixtures.group, (mesh) => mesh.userData.bedsideLampIndex === 0);
    toggleFixture(fixtures, bedside, 100, true);
    assert.deepEqual(fixtures.lightState, { on: false, mixed: true });
    fixtures.update({ ...options, lightingMode: "day" });
    assert.deepEqual(fixtures.lightState, { on: false, mixed: false });
    fixtures.update(options);
    assert.deepEqual(fixtures.lightState, { on: true, mixed: false });
  });

  await t.test("同值选项和纯标签变化保留家具位置，改变墙高才更新顶部设备", () => {
    fixtures.update(options);
    const rack = fixtures.group.getObjectByName("utility-ceiling-drying-rack");
    assert.ok(rack);
    const height = rack.position.y;
    fixtures.update({ ...options, balconyModes: { ...options.balconyModes } });
    fixtures.update({ ...options, labels: false });
    assert.equal(rack.position.y, height);
    fixtures.update({ ...options, wallHeight: 3.1 });
    assert.ok(Math.abs(rack.position.y - height - 0.3) < 1e-6);
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

  await t.test("局部照明保持安装高度，可独立开关且参与全屋控制，主阳台有两盏顶灯", () => {
    fixtures.update({ ...options, lightingMode: "day" });
    const tasks = [
      ["kitchen-counter-task-light", "kitchen", "厨房操作灯"],
      ["bath-mirror-task-light", "bath", "镜前灯"],
      ["ensuite-mirror-task-light", "ensuite", "镜前灯"],
      ["study-desk-task-light", "guest", "书房台灯"],
    ];
    const groups = tasks.map(([name]) => fixtures.group.getObjectByName(name)!);
    assert.ok(groups.every(Boolean));
    const positions = groups.map((group) => group.position.toArray());
    const targets = groups.map((group) => findMesh(group, (mesh) => mesh.userData.fixtureHintPriority === 1));
    indexRoomLayers([fixtures.group]);
    targets.forEach((target, index) => {
      assert.equal(fixtures.interactionInfo(target)?.title, tasks[index][2]);
      assert.ok(target.layers.isEnabled(roomLayer(tasks[index][1])));
      assert.equal(fixtures.interactionInfo(target)?.active, false);
      const lamps = groups[index].children.filter((object) => object instanceof THREE.PointLight);
      assert.equal(lamps.length, 1);
      assert.equal(lamps[0].castShadow, false);
    });
    toggleFixture(fixtures, targets[0], 0, true);
    assert.deepEqual(targets.map((target) => fixtures.interactionInfo(target)?.active), [true, false, false, false]);
    fixtures.update({ ...options, lightingMode: "day", wallHeight: 3.2, labels: false });
    assert.deepEqual(groups.map((group) => group.position.toArray()), positions);
    assert.equal(fixtures.interactionInfo(targets[0])?.active, true);
    fixtures.update({ ...options, lightingMode: "day", lightCommand: { on: true, revision: 301 } });
    assert.ok(targets.every((target) => fixtures.interactionInfo(target)?.active));
    fixtures.update({ ...options, lightingMode: "day", lightCommand: { on: false, revision: 302 } });
    assert.ok(targets.every((target) => !fixtures.interactionInfo(target)?.active));
    const balcony = fixtures.group.getObjectByName("balcony-ceiling-light")!;
    const lamps = balcony.children.filter((object) => object instanceof THREE.Group);
    assert.equal(lamps.length, 2);
    assert.ok(Math.abs(lamps[1].position.x - lamps[0].position.x - 2.1) < 1e-6);
    fixtures.update(options);
    assert.ok(targets.every((target) => fixtures.interactionInfo(target)?.active));
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

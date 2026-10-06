import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { walls, defaults } from "./plan.ts";
import { createSlidingWindow } from "./windows.ts";

const openings = walls.flatMap((wall) => (wall.openings ?? []).filter(({ kind }) => kind === "window"));
const material = new THREE.MeshBasicMaterial();
const makeWindow = (opening: (typeof openings)[number]) => createSlidingWindow(opening,
  { frame: material, glass: material, handle: material });
const dispose = (window: ReturnType<typeof createSlidingWindow>) => window.group.traverse((object) => {
  if (object instanceof THREE.Mesh) object.geometry.dispose();
});

test("所有原有窗洞默认关闭，推拉过程不超出窗洞，全开时留出半侧通风口", () => {
  assert.equal(openings.length, 8);
  for (const opening of openings) {
    const window = makeWindow(opening);
    const moving = window.group.getObjectByName("sliding-window-panel")!;
    const fixed = window.group.getObjectByName("fixed-window-panel")!;
    window.group.updateMatrixWorld(true);
    const fixedBounds = new THREE.Box3().setFromObject(fixed);
    const closedBounds = new THREE.Box3().setFromObject(moving);
    assert.ok(closedBounds.min.x < fixedBounds.max.x, "关闭时中缝有搭接");
    assert.ok(Math.abs(closedBounds.max.x - (opening.end - 0.025)) < 1e-6);
    for (const value of [0, 0.25, 0.5, 0.75, 1]) {
      window.apply(value);
      window.group.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(moving);
      assert.ok(bounds.min.x >= opening.start + 0.025 - 1e-6);
      assert.ok(bounds.max.x <= opening.end - 0.025 + 1e-6);
    }
    const openedBounds = new THREE.Box3().setFromObject(moving);
    assert.ok(Math.abs(openedBounds.min.x - fixedBounds.min.x) < 1e-6);
    assert.ok(Math.abs(openedBounds.max.x - fixedBounds.max.x) < 1e-6);
    assert.ok(opening.end - 0.025 - openedBounds.max.x > (opening.end - opening.start) * 0.4);
    dispose(window);
  }
});

test("半高墙保留窗台位置，高窗隐藏；恢复完整墙后窗扇仍保持原开合状态", () => {
  for (const opening of openings) {
    const window = makeWindow(opening);
    const moving = window.group.getObjectByName("sliding-window-panel")!;
    window.apply(0.65);
    const position = moving.position.x;
    window.setVisibleHeight(defaults.cutHeight);
    assert.equal(window.group.visible, opening.sill < defaults.cutHeight);
    assert.equal(window.group.position.y, opening.sill);
    if (window.group.visible) {
      assert.ok(Math.abs(window.group.scale.y * (opening.top - opening.sill)
        - (defaults.cutHeight - opening.sill)) < 1e-9);
    }
    window.setVisibleHeight(defaults.wallHeight);
    assert.equal(window.group.visible, true);
    assert.equal(window.group.scale.y, 1);
    assert.equal(moving.position.x, position);
    dispose(window);
  }
});

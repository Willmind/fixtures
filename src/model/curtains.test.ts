import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createSlidingCurtainPanel, CurtainTransition } from "./curtains.ts";
import { roomCurtains } from "./arrangements.ts";

test("窗帘默认拉开，每扇窗独立开合，过渡结束停止重绘", () => {
  const curtain = new CurtainTransition(), other = new CurtainTransition();
  assert.equal(curtain.value, 0);
  curtain.toggle(100);
  assert.equal(curtain.advance(375), true);
  assert.ok(Math.abs(curtain.value - 0.5) < 1e-9);
  assert.equal(curtain.advance(650), false);
  assert.equal(curtain.value, 1);
  assert.equal(other.value, 0);
  curtain.toggle(700);
  assert.equal(curtain.advance(1250), false);
  assert.equal(curtain.value, 0);
});

test("连续点击可从当前位置反向，减少动态效果时立即切换", () => {
  const curtain = new CurtainTransition();
  curtain.toggle(100);
  curtain.advance(300);
  const halfway = curtain.value;
  curtain.toggle(300);
  assert.equal(curtain.value, halfway);
  curtain.advance(350);
  assert.ok(curtain.value < halfway);
  assert.equal(curtain.advance(900), false);
  assert.equal(curtain.value, 0);
  curtain.toggle(1000, true);
  assert.equal(curtain.value, 1);
  assert.equal(curtain.advance(1000), false);
  curtain.toggle(1001, true);
  assert.equal(curtain.value, 0);
});

test("书房已配置窗帘，合上后覆盖中央且仍可点击重新拉开", () => {
  assert.ok(roomCurtains.some((curtain) => curtain.roomId === "guest"));
  const material = new THREE.MeshBasicMaterial();
  for (const width of new Set(roomCurtains.map((curtain) => curtain.width))) {
    for (const side of [-1, 1]) {
      const geometry = createSlidingCurtainPanel(width, side);
      const curtain = new THREE.Mesh(geometry, material);
      const ray = new THREE.Raycaster(new THREE.Vector3(side * 0.08, 0.5, 1), new THREE.Vector3(0, 0, -1));
      assert.equal(ray.intersectObject(curtain).length, 0, "拉开时窗口中央留空");
      curtain.morphTargetInfluences![0] = 1;
      assert.ok(ray.intersectObject(curtain).length > 0, "合上后中央可点到布片");
      const closed = geometry.morphAttributes.position![0];
      let innerEdge = Infinity;
      for (let index = 0; index < closed.count; index++) {
        const x = closed.getX(index);
        assert.ok(Number.isFinite(x));
        assert.ok(side * x >= -1e-6 && Math.abs(x) <= width / 2 + 1e-6);
        innerEdge = Math.min(innerEdge, Math.abs(x));
      }
      assert.ok(innerEdge < 1e-6, "两片窗帘在中心合拢，避免顶部仍留大缝");
      curtain.morphTargetInfluences![0] = 0;
      assert.equal(ray.intersectObject(curtain).length, 0);
      geometry.dispose();
    }
  }
  material.dispose();
});

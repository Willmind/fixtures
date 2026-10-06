import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { applySurfaceUVs, wallTileSides } from "./finishes.ts";
import { walls } from "./plan.ts";

test("共用墙的瓷砖只朝向厨卫，反向建墙也能正确区分内外", () => {
  for (const [id, expected] of [
    ["kitchen-east", { positive: true, negative: false }],
    ["bath-east", { positive: true, negative: false }],
    ["study-east", { positive: false, negative: true }],
    ["ensuite-north", { positive: true, negative: false }],
    ["bedrooms-divider", { positive: false, negative: false }],
  ] as const) {
    const wall = walls.find((item) => item.id === id)!;
    assert.deepEqual(wallTileSides(wall), expected, id);
    assert.deepEqual(wallTileSides({ ...wall, from: wall.to, to: wall.from }), {
      positive: expected.negative, negative: expected.positive,
    }, `${id} reversed`);
  }
});

test("旋转墙体分段后仍按米铺砖，半高墙与上方墙片接缝连续", () => {
  const wall = new THREE.Matrix4().makeRotationY(-Math.PI / 2);
  wall.setPosition(-4.2, 0, -4.6);
  const vertices = (bottom: number, top: number) => {
    const geometry = new THREE.BoxGeometry(2, top - bottom, 0.2);
    const transform = wall.clone().multiply(new THREE.Matrix4().makeTranslation(1, (bottom + top) / 2, 0));
    applySurfaceUVs(geometry, transform);
    const uv = geometry.getAttribute("uv");
    const position = geometry.getAttribute("position");
    // BoxGeometry's +Z face becomes the room's -X face after rotation.
    const face = Array.from({ length: 4 }, (_, offset) => {
      const index = 16 + offset;
      const point = new THREE.Vector3().fromBufferAttribute(position, index).applyMatrix4(transform);
      assert.ok(Math.abs(uv.getX(index) - point.z) < 1e-6);
      assert.ok(Math.abs(uv.getY(index) - point.y) < 1e-6);
      return [uv.getX(index), uv.getY(index)];
    });
    geometry.dispose();
    return face;
  };
  const lower = vertices(0, 1.05), upper = vertices(1.05, 2.8);
  assert.ok(Math.abs(Math.max(...lower.map(([u]) => u)) - Math.min(...lower.map(([u]) => u)) - 2) < 1e-6);
  const seam = (face: number[][]) => face.filter(([, v]) => Math.abs(v - 1.05) < 1e-6).sort(([a], [b]) => a - b);
  assert.equal(seam(lower).length, 2);
  assert.deepEqual(seam(lower), seam(upper));
});

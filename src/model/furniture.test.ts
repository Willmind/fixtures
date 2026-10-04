import test from "node:test";
import assert from "node:assert/strict";
import { furnitureSize, livingLayouts, livingPlacement } from "./arrangements.ts";
import { defaults } from "./plan.ts";
import { sofaBody, sofaSupport, televisionParts, televisionWallBackdrop, televisionWallZ } from "./furniture.ts";
import type { BoxPart } from "./furniture.ts";

const min = (part: BoxPart, axis: number) => part.position[axis] - part.size[axis] / 2;
const max = (part: BoxPart, axis: number) => part.position[axis] + part.size[axis] / 2;
function connected(a: BoxPart, b: BoxPart) {
  for (const axis of [0, 1, 2]) {
    assert.ok(max(a, axis) >= min(b, axis) - 1e-9);
    assert.ok(max(b, axis) >= min(a, axis) - 1e-9);
  }
}

test("沙发底座从地面连接到主体，坐垫高度不受接地修复影响", () => {
  assert.equal(min(sofaSupport, 1), 0);
  connected(sofaSupport, sofaBody);
  assert.ok(min(sofaSupport, 0) > min(sofaBody, 0));
  assert.ok(max(sofaSupport, 0) < max(sofaBody, 0));
  assert.ok(Math.abs(max(sofaBody, 1) - 0.355) < 1e-9);
});

test("柜上电视的柜面、底座、支架和屏幕连续接触", () => {
  const { screen, supports: [base, stem] } = televisionParts.cabinet;
  assert.ok(Math.abs(min(base, 1) - furnitureSize.tvCabinet.height) < 1e-9);
  connected(base, stem);
  connected(stem, screen);
  assert.ok(max(base, 2) <= furnitureSize.tvCabinet.depth / 2);
  assert.ok(min(base, 2) >= -furnitureSize.tvCabinet.depth / 2);
});

test("挂墙电视在两种布局下均贴合对应墙面，挂架连接屏幕", () => {
  const { screen, supports: [plate, arm] } = televisionParts.wall;
  assert.ok(Math.abs(min(plate, 2) - televisionWallZ) < 1e-9);
  connected(plate, arm);
  connected(arm, screen);
  assert.ok(min(screen, 1) > furnitureSize.tvCabinet.height);
  assert.ok(Math.abs(min(televisionWallBackdrop, 1) - defaults.cutHeight) < 1e-9);
  assert.ok(max(televisionWallBackdrop, 1) > max(screen, 1));
  assert.ok(Math.abs(max(televisionWallBackdrop, 2) - min(plate, 2)) < 1e-9);
  for (const layout of livingLayouts) {
    const { tv } = livingPlacement(layout.id);
    const wallX = tv.center[0] + Math.sin(tv.rotation) * min(plate, 2);
    assert.ok(Math.abs(wallX - (layout.tvSide === "guest" ? 2.7 : 6.7)) < 1e-9);
  }
});

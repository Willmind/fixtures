import test from "node:test";
import assert from "node:assert/strict";
import { ShadowUpdates } from "./ShadowUpdates.ts";

test("静态房屋旋转多个视角复用阴影贴图，不反复重绘", () => {
  const shadows = new ShadowUpdates();
  assert.equal(shadows.consume(false), true);
  for (let i = 0; i < 120; i++) assert.equal(shadows.consume(false), false);
});

test("家具摆位和墙体变化合并刷新，立即开关也不能遗漏新阴影", () => {
  const shadows = new ShadowUpdates();
  shadows.consume(false);
  shadows.invalidate();
  shadows.invalidate();
  assert.equal(shadows.consume(false), true);
  assert.equal(shadows.consume(false), false);
  shadows.invalidate();
  assert.equal(shadows.consume(false), true);
});

test("家具运动期间刷新，并在动画结束后补上最终位置的阴影", () => {
  const shadows = new ShadowUpdates();
  shadows.consume(false);
  for (let i = 0; i < 20; i++) assert.equal(shadows.consume(true), true);
  assert.equal(shadows.consume(false), true);
  assert.equal(shadows.consume(false), false);
});

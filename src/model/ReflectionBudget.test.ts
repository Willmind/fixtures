import test from "node:test";
import assert from "node:assert/strict";
import { ReflectionBudget } from "./ReflectionBudget.ts";

test("拖动及惯性转动期间完全复用反射贴图，不触发额外场景渲染", () => {
  const budget = new ReflectionBudget();
  for (let now = 0; now < 1000; now += 16) {
    budget.beginFrame(true);
    assert.equal(budget.allow(0, now, true), false);
    assert.equal(budget.allow(1, now, true), false);
    assert.equal(budget.needsAnotherFrame, false);
  }
});

test("停下后分两帧更新镜子，第二帧结束后不产生后台刷新循环", () => {
  const budget = new ReflectionBudget();
  budget.beginFrame(false);
  assert.equal(budget.allow(0, 0, false), true);
  assert.equal(budget.allow(1, 0, false), false);
  assert.equal(budget.needsAnotherFrame, true);
  budget.beginFrame(false);
  assert.equal(budget.allow(0, 16, false), false);
  assert.equal(budget.allow(1, 16, false), true);
  assert.equal(budget.needsAnotherFrame, false);
  budget.beginFrame(true);
  assert.equal(budget.allow(0, 20, true), false);
  budget.beginFrame(false);
  assert.equal(budget.allow(0, 32, false), true, "停下后无需等满 250 ms");
  assert.equal(budget.allow(1, 32, false), false);
  budget.beginFrame(false);
  assert.equal(budget.allow(1, 48, false), true);
  assert.equal(budget.needsAnotherFrame, false);
});

test("静止视角下风扇等动画不让镜子每帧重绘，开关灯和动画结束可立即更新", () => {
  const budget = new ReflectionBudget();
  budget.beginFrame(false);
  budget.allow(0, 0, false);
  budget.beginFrame(false);
  budget.allow(1, 16, false);
  for (let now = 32; now < 250; now += 16) {
    budget.beginFrame(false);
    assert.equal(budget.allow(0, now, false), false);
    assert.equal(budget.allow(1, now, false), false);
    assert.equal(budget.needsAnotherFrame, false);
  }
  budget.beginFrame(false);
  assert.equal(budget.allow(0, 250, false), true);
  assert.equal(budget.allow(1, 250, false), false);
  budget.beginFrame(false);
  assert.equal(budget.allow(1, 266, false), true);
  budget.invalidate();
  budget.beginFrame(false);
  assert.equal(budget.allow(0, 280, false), true);
  assert.equal(budget.allow(1, 280, false), false);
  assert.equal(budget.needsAnotherFrame, true);
  budget.beginFrame(false);
  assert.equal(budget.allow(1, 296, false), true);
  assert.equal(budget.needsAnotherFrame, false);
});

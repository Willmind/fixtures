import test from "node:test";
import assert from "node:assert/strict";
import { fixtureAppearanceChanged, fixtureOptionsChanged, viewOptionsChanged } from "./options.ts";
import type { ViewOptions } from "./options.ts";

const base: ViewOptions = {
  lightingMode: "day", layout: "tv-guest", curtainColor: "cream", televisionMount: "cabinet",
  balconyRoofs: true, balconyModes: { balcony: "original", utility: "enclosed" },
  equipment: true, cutaway: true, view: "perspective", wallHeight: 2.8, labels: true,
  dimensions: true, grid: true, selected: null, drainage: false,
};

test("重新创建同值选项不会触发模型更新，切换房间或辅助线不刷新家具", () => {
  const equivalent = { ...base, balconyModes: { ...base.balconyModes } };
  assert.equal(viewOptionsChanged(base, equivalent), false);
  for (const change of [{ selected: "guest" }, { focusedRoom: "guest" }, { dimensions: false }, { grid: false }, { drainage: true }]) {
    const next = { ...base, ...change };
    assert.equal(viewOptionsChanged(base, next), true);
    assert.equal(fixtureOptionsChanged(base, next), false);
  }
  assert.equal(fixtureOptionsChanged(base, { ...base, labels: false }), true);
  assert.equal(fixtureAppearanceChanged(base, { ...base, labels: false }), false);
});

test("材质、门窗高度、阳台方案和重复灯光命令仍能触发真正的更新", () => {
  for (const change of [
    { curtainColor: "honey" as const }, { wallHeight: 3 }, { cutaway: false },
    { lightingMode: "night" as const }, { layout: "empty" as const },
    { televisionMount: "wall" as const }, { view: "plan" as const },
    { balconyRoofs: false }, { equipment: false },
    { balconyModes: { balcony: "enclosed" as const, utility: "enclosed" as const } },
  ]) assert.equal(fixtureAppearanceChanged(base, { ...base, ...change }), true);
  const first = { ...base, lightCommand: { on: true, revision: 1 } };
  assert.equal(fixtureOptionsChanged(first, { ...first, lightCommand: { ...first.lightCommand } }), false);
  assert.equal(fixtureOptionsChanged(first, { ...first, lightCommand: { on: true, revision: 2 } }), true);
});

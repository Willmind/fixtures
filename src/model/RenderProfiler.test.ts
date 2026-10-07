import test from "node:test";
import assert from "node:assert/strict";
import { RenderProfiler } from "./RenderProfiler.ts";

const sample = { frameWorkMs: 0, drawCalls: 100, triangles: 500, renderPasses: 2,
  geometries: 50, textures: 6, programs: 5, lighting: "night" as const, moving: true };

test("性能记录有容量上限，统计实际渲染耗时且对外提供副本", () => {
  const profiler = new RenderProfiler(3);
  for (const frameWorkMs of [50, 1, 2, 3]) profiler.record({ ...sample, frameWorkMs });
  profiler.noteUpdate(false); profiler.noteUpdate(true);
  const summary = profiler.summary();
  assert.equal(summary.frames, 4); assert.equal(summary.samples, 3);
  assert.equal(summary.medianFrameWorkMs, 2); assert.equal(summary.p95FrameWorkMs, 3);
  assert.equal(summary.updates, 2); assert.equal(summary.wallRebuilds, 1);
  summary.latest!.drawCalls = 999;
  assert.equal(profiler.summary().latest!.drawCalls, 100);
  profiler.reset();
  assert.equal(profiler.summary().samples, 0); assert.equal(profiler.summary().latest, null);
  assert.equal(profiler.summary().updates, 0);
});

import test from "node:test";
import assert from "node:assert/strict";
import { OnDemandFrames } from "./OnDemandFrames.ts";

function fakeFrames() {
  let next = 0;
  const callbacks = new Map<number, FrameRequestCallback>();
  return {
    request(callback: FrameRequestCallback) {
      const id = next++;
      callbacks.set(id, callback);
      return id;
    },
    cancel(id: number) { callbacks.delete(id); },
    get pending() { return callbacks.size; },
    tick(now: number) {
      const ready = [...callbacks.values()];
      callbacks.clear();
      for (const callback of ready) callback(now);
    },
  };
}

test("同一帧的多次更新合并一次绘制，静止后不生成空闲帧", () => {
  const frames = fakeFrames();
  const times: number[] = [];
  const loop = new OnDemandFrames((now) => times.push(now), frames);
  for (let i = 0; i < 100; i++) loop.request();
  assert.equal(frames.pending, 1);
  frames.tick(16);
  frames.tick(32);
  assert.deepEqual(times, [16]);
  assert.equal(frames.pending, 0);
});

test("持续动画切到后台立即停止，返回后继续一次刷新", () => {
  const frames = fakeFrames();
  const times: number[] = [];
  const loop = new OnDemandFrames((now) => {
    times.push(now);
    loop.request();
  }, frames);
  loop.request();
  frames.tick(16);
  assert.equal(frames.pending, 1);
  loop.setVisible(false);
  for (let i = 0; i < 100; i++) loop.request();
  frames.tick(32);
  assert.equal(frames.pending, 0);
  assert.deepEqual(times, [16]);
  loop.setVisible(true);
  loop.setVisible(true);
  assert.equal(frames.pending, 1);
  frames.tick(1000);
  assert.deepEqual(times, [16, 1000]);
  loop.dispose();
});

test("后台初始化不绘制，页面离开后待执行帧不访问已释放的模型", () => {
  const frames = fakeFrames();
  let draws = 0;
  const loop = new OnDemandFrames(() => draws++, frames, false);
  loop.request();
  assert.equal(frames.pending, 0);
  loop.setVisible(true);
  assert.equal(frames.pending, 1);
  loop.dispose();
  frames.tick(16);
  loop.request();
  loop.setVisible(false);
  loop.setVisible(true);
  assert.equal(frames.pending, 0);
  assert.equal(draws, 0);
});

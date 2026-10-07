import test from "node:test";
import assert from "node:assert/strict";
import { ScrollPositionWriter } from "../src/ScrollPositionWriter.ts";

function setup() {
  let now = 0, nextId = 0;
  const tasks = new Map(), writes = [];
  const writer = new ScrollPositionWriter((top) => writes.push(top), {
    schedule(callback, delay) { const id = ++nextId; tasks.set(id, { callback, at: now + delay }); return id; },
    cancel(id) { tasks.delete(id); },
  });
  function advance(ms) {
    now += ms;
    for (const [id, task] of [...tasks]) if (task.at <= now) { tasks.delete(id); task.callback(); }
  }
  return { writer, advance, writes, tasks };
}

test("连续滚动合并写入最新位置，不随每个事件写历史；停止后保留最终位置", () => {
  const { writer, advance, writes, tasks } = setup();
  for (let i = 1; i <= 100; i++) writer.record(i);
  assert.equal(tasks.size, 1); assert.deepEqual(writes, []);
  advance(199); assert.deepEqual(writes, []);
  advance(1); assert.deepEqual(writes, [100]);
  writer.record(120); writer.record(140);
  writer.flush();
  assert.deepEqual(writes, [100, 140]); assert.equal(tasks.size, 0);
  advance(1000); assert.deepEqual(writes, [100, 140]);
});

test("页面切换取消旧写入，下一页可以保存相同高度且不被旧位置覆盖", () => {
  const { writer, advance, writes } = setup();
  writer.record(100); writer.flush();
  writer.record(800); writer.cancel();
  advance(1000); assert.deepEqual(writes, [100]);
  writer.record(100); advance(200);
  assert.deepEqual(writes, [100, 100]);
});

test("重复高度不写历史，离开页面时立即保存尚未提交的最新位置", () => {
  const { writer, advance, writes } = setup();
  writer.record(20); advance(200);
  writer.record(20); advance(200);
  writer.flush(); assert.deepEqual(writes, [20]);
  writer.record(30); writer.flush();
  assert.deepEqual(writes, [20, 30]);
});

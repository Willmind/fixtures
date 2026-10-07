import test from "node:test";
import assert from "node:assert/strict";
import { SelectionGesture } from "./SelectionGesture.ts";

const pointer = (
  pointerId: number,
  clientX = 100,
  clientY = 100,
  button = 0,
) => ({ pointerId, clientX, clientY, button });

test("单指轻触允许少量手抖，右键不选择房间", () => {
  const gesture = new SelectionGesture();
  gesture.start(pointer(1));
  assert.equal(gesture.end(pointer(1, 103, 101)), true);
  gesture.start(pointer(1, 100, 100, 2));
  assert.equal(gesture.end(pointer(1, 100, 100, 2)), false);
});

test("拖动后回到起点仍不能被误判为点击", () => {
  const gesture = new SelectionGesture();
  gesture.start(pointer(1));
  gesture.move(pointer(1, 140));
  gesture.move(pointer(1));
  assert.equal(gesture.end(pointer(1)), false);
});

test("双指手势无论哪根手指先抬起，都不触发选择", () => {
  for (const order of [
    [1, 2],
    [2, 1],
  ]) {
    const gesture = new SelectionGesture();
    gesture.start(pointer(1));
    gesture.start(pointer(2));
    assert.equal(gesture.end(pointer(order[0])), false);
    assert.equal(gesture.end(pointer(order[1])), false);
    gesture.start(pointer(3));
    assert.equal(gesture.end(pointer(3)), true);
  }
});

test("取消的手势不选择房间，下一次轻触可正常选择", () => {
  const gesture = new SelectionGesture();
  gesture.start(pointer(1));
  gesture.cancel(1);
  assert.equal(gesture.end(pointer(1)), false);
  gesture.start(pointer(2));
  assert.equal(gesture.end(pointer(2)), true);
});

test("名称按钮允许十像素以内的轻微位移，仍只激活一次", () => {
  const gesture = new SelectionGesture(10);
  gesture.start(pointer(1));
  gesture.move(pointer(1, 106, 102));
  assert.equal(gesture.end(pointer(1, 108, 103)), true);
  assert.equal(gesture.end(pointer(1, 108, 103)), false);
});

test("名称按钮的拖动或双指仍取消激活，之后的轻触可正常使用", () => {
  const gesture = new SelectionGesture(10);
  gesture.start(pointer(1));
  gesture.move(pointer(1, 111));
  assert.equal(gesture.end(pointer(1)), false);
  gesture.start(pointer(2));
  gesture.start(pointer(3));
  assert.equal(gesture.end(pointer(2)), false);
  assert.equal(gesture.end(pointer(3)), false);
  gesture.start(pointer(4));
  assert.equal(gesture.end(pointer(4)), true);
});

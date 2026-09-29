import test from "node:test";
import assert from "node:assert/strict";
import { splitWall, polygonArea } from "./geometry.ts";
import { defaults, rooms, walls } from "./plan.ts";

test("门洞真正贯通地面，墙体体积等于整墙减去开口", () => {
  const pieces = splitWall(4, 2.8, [
    { kind: "door", start: 1, end: 2, sill: 0, top: 2.2 },
  ]);
  const area = pieces.reduce(
    (n, p) => n + (p.end - p.start) * (p.top - p.bottom),
    0,
  );
  assert.ok(Math.abs(area - (4 * 2.8 - 2.2)) < 1e-10);
  assert.ok(pieces.every((p) => p.end <= 1 || p.start >= 2 || p.bottom >= 2.2));
});
test("半高墙模式保留窗台，去除高于截断面的墙体", () => {
  const pieces = splitWall(3, 1.05, [
    { kind: "window", start: 0.5, end: 2.5, sill: 0.9, top: 2.2 },
  ]);
  assert.ok(pieces.every((p) => p.top <= 1.05 && p.top > p.bottom));
  assert.ok(pieces.some((p) => p.start === 0.5 && p.top === 0.9));
});
test("无效开口失败而非产生倒置几何", () => {
  assert.throws(() =>
    splitWall(2, 2.8, [{ kind: "door", start: 1, end: 3, sill: 0, top: 2.2 }]),
  );
});
test("所有户型墙体在完整与截断模式下均可生成", () => {
  for (const wall of walls) {
    const length = Math.hypot(
      wall.to[0] - wall.from[0],
      wall.to[1] - wall.from[1],
    );
    for (const height of [defaults.cutHeight, 2.4, defaults.wallHeight, 3.4]) {
      assert.doesNotThrow(
        () => splitWall(length, height, wall.openings),
        wall.id,
      );
    }
  }
  assert.equal(rooms.filter((r) => r.kind === "bedroom").length, 4);
  assert.equal(rooms.filter((r) => r.kind === "bathroom").length, 2);
  assert.equal(rooms.filter((r) => r.kind === "balcony").length, 2);
  assert.ok(rooms.every((r) => polygonArea(r.polygon) > 0));
});

test("门窗任何尺寸为 NaN 或无穷大时明确拒绝", () => {
  for (const field of ["start", "end", "sill", "top"] as const) {
    for (const value of [NaN, Infinity, -Infinity]) {
      assert.throws(
        () =>
          splitWall(4, 2.8, [
            {
              kind: "window",
              start: 1,
              end: 2,
              sill: 0.9,
              top: 2.2,
              [field]: value,
            },
          ]),
        /尺寸无效/,
      );
    }
  }
});

test("门窗重叠或起点越界时明确拒绝", () => {
  assert.throws(() =>
    splitWall(4, 2.8, [
      { kind: "door", start: 1, end: 2, sill: 0, top: 2.2 },
      { kind: "window", start: 1.5, end: 3, sill: 0.9, top: 2.2 },
    ]),
  );
  assert.throws(() =>
    splitWall(4, 2.8, [
      { kind: "door", start: -0.1, end: 1, sill: 0, top: 2.2 },
    ]),
  );
});

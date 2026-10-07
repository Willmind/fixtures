import test from "node:test";
import assert from "node:assert/strict";
import { BoxGeometryPool } from "./fixtures/BoxGeometryPool.ts";

test("相同家具构件复用几何，圆角和尺寸不同不混用，瓷砖 UV 保持独立", () => {
  const pool = new BoxGeometryPool();
  const first = pool.get([0.4, 0.2, 0.3], 0.02);
  assert.equal(first, pool.get([0.4, 0.2, 0.3], 0.02));
  const otherRadius = pool.get([0.4, 0.2, 0.3], 0.03);
  const otherSize = pool.get([0.4, 0.3, 0.3], 0.02);
  assert.notEqual(first, otherRadius); assert.notEqual(first, otherSize);
  const tile = pool.get([0.4, 0.2, 0.3], 0.02, true);
  const otherTile = pool.get([0.4, 0.2, 0.3], 0.02, true);
  tile.getAttribute("uv").setXY(0, 100, 200);
  assert.notEqual(otherTile.getAttribute("uv").getX(0), 100);
  assert.notEqual(first.getAttribute("uv").getX(0), 100);
  pool.clear();
  const recreated = pool.get([0.4, 0.2, 0.3], 0.02);
  assert.notEqual(recreated, first);
  for (const geometry of [first, otherRadius, otherSize, tile, otherTile, recreated]) geometry.dispose();
});

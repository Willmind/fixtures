import test from "node:test";
import { OpenCloseMotion } from "./OpenCloseMotion.ts";
import assert from "node:assert/strict";
import { entryCorridor, homeDoors } from "./doors.ts";
import { defaults, rooms } from "./plan.ts";
import type { Point } from "./plan.ts";

test("每扇门独立平滑开合，连续点击从当前位置反向，静止后停止重绘", () => {
  const front = new OpenCloseMotion(), bedroom = new OpenCloseMotion();
  front.toggle(100);
  assert.equal(front.advance(250), true);
  const halfway = front.value;
  assert.ok(halfway > 0 && halfway < 1);
  front.toggle(250);
  assert.equal(front.value, halfway);
  front.advance(700);
  assert.equal(front.value, 1);
  assert.equal(front.advance(701), false);
  front.toggle(800, true);
  assert.equal(front.value, 0);
  assert.equal(front.advance(800), false);
  assert.equal(bedroom.value, 1);
  front.toggle(900);
  assert.equal(front.advance(1500), false);
  assert.equal(front.value, 1);
});

test("平开门的整个开启范围落在对应室内，不占门外走廊或公共过道", () => {
  const roomForDoor: Record<string, string> = {
    entry: "living", "guest-north": "guest", "bedroom-a-north": "parents",
    "study-south": "study", "master-entry": "master", "bath-south": "bath", "ensuite-south": "ensuite",
  };
  const inside = ([x, z]: Point, polygon: readonly Point[]) => {
    let hit = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, zi] = polygon[i], [xj, zj] = polygon[j];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit;
    }
    return hit;
  };
  for (const door of homeDoors.filter(({ kind }) => kind !== "sliding")) {
    const { wall, opening, frame, gap, rotation, swing } = door;
    const room = rooms.find(({ id }) => id === roomForDoor[wall.id])!;
    const direction = door.hinge === "start" ? 1 : -1;
    const pivotX = direction === 1 ? opening.start + frame + gap : opening.end - frame - gap;
    const pivotZ = -swing * direction * ((wall.thickness ?? defaults.wallThickness) / 2 + 0.03);
    const width = opening.end - opening.start - 2 * (frame + gap);
    for (let step = 0; step <= 12; step++) {
      const angle = swing * Math.PI / 2 * step / 12;
      for (const length of [0, width]) {
        for (const face of [-0.0225, 0.0225]) {
          const x = pivotX + Math.cos(angle) * direction * length + Math.sin(angle) * face;
          const z = pivotZ - Math.sin(angle) * direction * length + Math.cos(angle) * face;
          const point: Point = [wall.from[0] + Math.cos(rotation) * x + Math.sin(rotation) * z,
            wall.from[1] - Math.sin(rotation) * x + Math.cos(rotation) * z];
          assert.ok(inside(point, room.polygon), `${wall.id}, opening step ${step}`);
        }
      }
    }
  }
});

test("门外走廊沿进门方向延伸并对准门洞，鞋柜靠侧墙保留直行通道", () => {
  const { from, to, shoeCabinet: cabinet } = entryCorridor;
  const entry = homeDoors.find(({ kind }) => kind === "entry")!;
  assert.ok(to[0] - from[0] > to[1] - from[1], "走廊长边沿进门方向，不能沿门所在墙横向延伸");
  const doorStart = entry.wall.from[1] + entry.opening.start;
  const doorEnd = entry.wall.from[1] + entry.opening.end;
  assert.ok(Math.abs((from[1] + to[1]) / 2 - (doorStart + doorEnd) / 2) < 1e-9);
  assert.equal(cabinet.rotation, Math.PI);
  assert.ok(cabinet.center[0] - cabinet.width / 2 > from[0]);
  assert.ok(cabinet.center[0] + cabinet.width / 2 < to[0]);
  assert.ok(cabinet.center[1] - cabinet.depth / 2 > doorEnd, "鞋柜不能占入门洞向外的直行区域");
  assert.ok(Math.abs(cabinet.center[1] + cabinet.depth / 2 - (to[1] - 0.06)) < 1e-9,
    "鞋柜背面贴走廊侧墙内表面");
  assert.equal(to[0], entry.wall.from[0]);
});

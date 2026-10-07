import test from "node:test";
import assert from "node:assert/strict";
import { roomIdentity, isRoomId } from "../house/rooms.ts";
import { rooms } from "./plan.ts";
import { roomGuides } from "../guide/content.ts";
import { roomVisits } from "../visit/content.ts";
import { emptyNotebook, emptyRecord, parseNotebook } from "../notes/records.ts";

test("模型、图纸说明和实拍的房间身份保持一致，历史 ID 不随用途改名", () => {
  const ids = Object.keys(roomIdentity).sort();
  for (const values of [rooms.map(({ id }) => id), roomGuides.map(({ id }) => id), roomVisits.map(({ roomId }) => roomId)]) {
    assert.deepEqual(values.sort(), ids);
  }
  for (const room of rooms) assert.equal(room.name, roomIdentity[room.id].name);
  for (const guide of roomGuides) {
    assert.equal(guide.name, roomIdentity[guide.id].name);
    assert.equal(guide.original, roomIdentity[guide.id].originalName);
  }
  assert.equal(roomIdentity.guest.name, "书房"); assert.equal(roomIdentity.study.name, "次卧 B");
  assert.equal(isRoomId("toString"), false);
  const legacy = emptyNotebook();
  legacy.rooms.guest = { ...emptyRecord(), notes: "书房电脑插座" };
  legacy.rooms.study = { ...emptyRecord(), notes: "单人床尺寸" };
  assert.deepEqual(parseNotebook(JSON.stringify(legacy)), legacy);
});

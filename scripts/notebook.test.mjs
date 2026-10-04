import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyNotebook,
  emptyRecord,
  hasRecord,
  mergeNotebook,
  parseNotebook,
  readNotebook,
  writeNotebook,
  tasksForRoom,
  STORAGE_KEY,
  MAX_IMPORT_BYTES,
} from "../src/notes/records.ts";
import { roomGuides } from "../src/guide/content.ts";

function example(purpose = "书房") {
  const data = emptyNotebook();
  data.rooms.study = {
    ...emptyRecord(),
    purpose,
    notes: "双显示器，先复核窗台高度",
    length: "3600",
    updatedAt: "2026-10-04T08:00:00.000Z",
    done: { [tasksForRoom("study")[0].id]: true },
  };
  return data;
}
test("准备记录可完整导出再导入，含尺寸、备注与确认状态", () => {
  assert.deepEqual(parseNotebook(JSON.stringify(example())), example());
  assert.equal(hasRecord(emptyRecord()), false);
  for (const room of roomGuides) {
    const tasks = tasksForRoom(room.id);
    assert.equal(new Set(tasks.map((task) => task.id)).size, tasks.length);
  }
});
test("拒绝错误版本、错误房间、超大与不完整文件", () => {
  for (const value of [
    { ...example(), version: 2 },
    { ...example(), format: "other" },
    { ...example(), rooms: { unknown: emptyRecord() } },
    { ...example(), rooms: { study: { purpose: "bad" } } },
  ])
    assert.throws(() => parseNotebook(JSON.stringify(value)));
  assert.throws(() => parseNotebook("x".repeat(MAX_IMPORT_BYTES + 1)));
  assert.throws(() =>
    parseNotebook(
      '{"format":"fixtures-home-notebook","version":1,"rooms":{"__proto__":{}}}',
    ),
  );
});
test("退休的确认项不误算成新待办，错误布尔值被拒绝", () => {
  const data = example();
  data.rooms.study.done["retired-task"] = true;
  assert.deepEqual(parseNotebook(JSON.stringify(data)), example());
  data.rooms.study.done[tasksForRoom("study")[0].id] = "true";
  assert.throws(() => parseNotebook(JSON.stringify(data)));
});
test("默认导入保留重复房间，明确替换仅影响导入的非空房间", () => {
  const local = example("爸妈房");
  local.rooms.master = { ...emptyRecord(), purpose: "主卧" };
  const incoming = example("书房");
  incoming.rooms.kitchen = { ...emptyRecord(), notes: "增加洗碗机" };
  incoming.rooms.master = emptyRecord();
  const safe = mergeNotebook(local, incoming, false);
  assert.equal(safe.rooms.study.purpose, "爸妈房");
  assert.equal(safe.rooms.kitchen.notes, "增加洗碗机");
  assert.equal(safe.rooms.master.purpose, "主卧");
  const replaced = mergeNotebook(local, incoming, true);
  assert.equal(replaced.rooms.study.purpose, "书房");
  assert.equal(replaced.rooms.master.purpose, "主卧");
  assert.equal(local.rooms.study.purpose, "爸妈房");
});
test("保存失败会返回失败；坏的本机数据不会被读取操作覆盖", () => {
  const writes = [];
  const storage = {
    getItem: () => "{broken",
    setItem: (...args) => writes.push(args),
  };
  assert.ok(readNotebook(storage).error);
  assert.equal(writes.length, 0);
  assert.equal(
    writeNotebook(
      {
        setItem() {
          throw new Error("quota");
        },
      },
      example(),
    ),
    false,
  );
  assert.equal(writeNotebook(storage, example()), true);
  assert.equal(writes[0][0], STORAGE_KEY);
  assert.deepEqual(parseNotebook(writes[0][1]), example());
});

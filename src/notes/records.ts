import { roomGuides } from "../guide/content.ts";
import { roomVisits } from "../visit/content.ts";

export const STORAGE_KEY = "fixtures-room-notes-v1";
export const MAX_IMPORT_BYTES = 200_000;
export type RoomRecord = {
  purpose: string;
  length: string;
  width: string;
  height: string;
  notes: string;
  done: Record<string, boolean>;
  updatedAt: string;
};
export type Notebook = {
  format: "fixtures-home-notebook";
  version: 1;
  rooms: Record<string, RoomRecord>;
};
export const emptyNotebook = (): Notebook => ({
  format: "fixtures-home-notebook",
  version: 1,
  rooms: {},
});
export const emptyRecord = (): RoomRecord => ({
  purpose: "",
  length: "",
  width: "",
  height: "",
  notes: "",
  done: {},
  updatedAt: "",
});
// Text-based identities survive reordering without marking the wrong task complete.
function taskId(kind: string, text: string) {
  let hash = 2166136261;
  for (const char of text)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `${kind}-${(hash >>> 0).toString(16)}`;
}
export const tasksForRoom = (roomId: string) => [
  ...roomGuides
    .find((room) => room.id === roomId)!
    .questions.map((text) => ({
      id: taskId("decide", text),
      kind: "decide" as const,
      text,
    })),
  ...roomVisits
    .find((room) => room.roomId === roomId)!
    .measure.map((text) => ({
      id: taskId("measure", text),
      kind: "measure" as const,
      text,
    })),
];
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const roomIds = new Set(roomGuides.map((room) => room.id));

export function parseNotebook(text: string): Notebook {
  if (text.length > MAX_IMPORT_BYTES)
    throw new Error("文件太大，请选择本网站导出的准备记录。");
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error("无法读取这份备份，请选择本站导出的完整 JSON 文件。");
  }
  if (
    !isObject(input) ||
    input.format !== "fixtures-home-notebook" ||
    input.version !== 1 ||
    !isObject(input.rooms)
  )
    throw new Error("不是受支持的房屋准备记录文件。");
  const result = emptyNotebook();
  for (const [id, value] of Object.entries(input.rooms)) {
    if (!roomIds.has(id) || !isObject(value))
      throw new Error("文件中包含无法识别的房间。");
    const record = emptyRecord();
    for (const field of [
      "purpose",
      "length",
      "width",
      "height",
      "notes",
      "updatedAt",
    ] as const) {
      const limit = field === "notes" ? 4000 : field === "purpose" ? 100 : 50;
      if (typeof value[field] !== "string" || value[field].length > limit)
        throw new Error("记录内容或格式不完整。");
      record[field] = value[field];
    }
    if (record.updatedAt && !Number.isFinite(Date.parse(record.updatedAt)))
      throw new Error("记录时间格式不正确。");
    if (!isObject(value.done) || Object.keys(value.done).length > 100)
      throw new Error("确认清单格式不正确。");
    const known = new Set(tasksForRoom(id).map((task) => task.id));
    for (const [task, done] of Object.entries(value.done)) {
      if (typeof done !== "boolean") throw new Error("确认状态格式不正确。");
      // Retired/reworded tasks do not silently confirm a new question.
      if (known.has(task)) record.done[task] = done;
    }
    result.rooms[id] = record;
  }
  return result;
}

export function hasRecord(record: RoomRecord | undefined): boolean {
  return (
    !!record &&
    (!!record.purpose ||
      !!record.length ||
      !!record.width ||
      !!record.height ||
      !!record.notes ||
      Object.values(record.done).some(Boolean))
  );
}
export function mergeNotebook(
  local: Notebook,
  imported: Notebook,
  replaceConflicts: boolean,
): Notebook {
  const rooms = { ...local.rooms };
  for (const [id, record] of Object.entries(imported.rooms)) {
    if (!hasRecord(record)) continue;
    if (replaceConflicts || !hasRecord(rooms[id])) rooms[id] = record;
  }
  return { ...local, rooms };
}
export function readNotebook(storage: Pick<Storage, "getItem">): {
  data: Notebook;
  error: string;
} {
  try {
    const text = storage.getItem(STORAGE_KEY);
    return { data: text ? parseNotebook(text) : emptyNotebook(), error: "" };
  } catch {
    return {
      data: emptyNotebook(),
      error: "暂时无法读取本机记录。原有存储未覆盖，请先导出本次填写的内容。",
    };
  }
}
export function writeNotebook(
  storage: Pick<Storage, "setItem">,
  data: Notebook,
): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

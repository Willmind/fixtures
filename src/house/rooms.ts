/** Stable IDs also key saved notes, photos and URLs. Never rename them to match a new use. */
export const roomIdentity = {
  living: { id: "living", name: "客餐厅", originalName: "客厅、餐厅、玄关", use: "起居与用餐" },
  master: { id: "master", name: "主卧", originalName: "主人房", use: "双人卧室" },
  parents: { id: "parents", name: "次卧 A", originalName: "女孩房", use: "父母房候选" },
  study: { id: "study", name: "次卧 B", originalName: "男孩房", use: "单人卧室" },
  guest: { id: "guest", name: "书房", originalName: "客房", use: "办公与收藏" },
  kitchen: { id: "kitchen", name: "厨房", originalName: "厨房", use: "烹饪" },
  bath: { id: "bath", name: "公卫", originalName: "卫7a", use: "公共洗漱与淋浴" },
  ensuite: { id: "ensuite", name: "主卫", originalName: "卫9", use: "主卧洗漱与淋浴" },
  balcony: { id: "balcony", name: "主阳台", originalName: "普通阳台", use: "休闲与绿植" },
  utility: { id: "utility", name: "生活阳台", originalName: "给水阳台", use: "洗衣与设备" },
} as const;
export type RoomId = keyof typeof roomIdentity;
export function isRoomId(value: string): value is RoomId {
  return Object.hasOwn(roomIdentity, value);
}

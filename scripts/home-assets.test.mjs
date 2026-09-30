import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import DxfParser from "dxf-viewer/src/parser/DxfParser.js";
import { roomGuides, sheets } from "../src/guide/content.ts";
import { rooms } from "../src/model/plan.ts";

const raw = fs.readFileSync(
  new URL("../public/house/d-electrical.dxf", import.meta.url),
  "utf8",
);
const dxf = new DxfParser().parseSync(raw);
const unicode = (text) =>
  text.replace(/\\U\+([0-9A-F]{4})/gi, (_, code) =>
    String.fromCharCode(parseInt(code, 16)),
  );

test("默认电气资产确为 D 户型 ZD11，不混入其他户型图签", () => {
  const titles = dxf.entities
    .filter((e) => e.type === "ATTRIB")
    .map((e) => unicode(e.text || ""));
  assert.ok(titles.includes("D户型电气平面图"));
  assert.ok(titles.includes("ZD11"));
  assert.ok(!titles.some((t) => /^[ABC]户型/.test(t)));
  assert.ok(dxf.entities.length > 500);
  assert.ok(Buffer.byteLength(raw) < 3 * 1024 * 1024);
});

test("提取的 CAD 实体所引用图块完整，图层保留中文信息", () => {
  for (const e of [
    ...dxf.entities,
    ...Object.values(dxf.blocks).flatMap((b) => b.entities || []),
  ]) {
    if (e.type === "INSERT")
      assert.ok(dxf.blocks[e.name], `缺失图块：${e.name}`);
  }
  const names = Object.keys(dxf.tables.layer.layers).map(unicode);
  for (const name of ["EQUIP-照明", "WIRE-照明", "EQUIP-插座", "WIRE-通讯"])
    assert.ok(names.includes(name));
});

test("房间讲解与三维房间对应，全部来源图在发布目录中", () => {
  assert.deepEqual(
    roomGuides.map((r) => r.id).sort(),
    rooms.map((r) => r.id).sort(),
  );
  assert.equal(new Set(roomGuides.map((r) => r.id)).size, roomGuides.length);
  for (const room of roomGuides)
    assert.ok(sheets.some((s) => s.page === room.page));
  for (const sheet of sheets) {
    const bytes = fs.readFileSync(
      new URL(`../public/house/d-sheet-${sheet.page}.webp`, import.meta.url),
    );
    assert.equal(bytes.subarray(8, 12).toString(), "WEBP");
    const preview = fs.readFileSync(
      new URL(
        `../public/house/thumbnails/d-sheet-${sheet.page}.webp`,
        import.meta.url,
      ),
    );
    assert.equal(preview.subarray(8, 12).toString(), "WEBP");
    assert.ok(
      preview.length < bytes.length / 3,
      "卡片缩略图应明显小于高清原图",
    );
  }
  assert.ok(
    fs.statSync(new URL("../public/house/d-plan.webp", import.meta.url)).size >
      10000,
  );
});

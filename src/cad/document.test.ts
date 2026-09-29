import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeDxf,
  filterLayerNames,
  prepareDxfLayers,
  validateCadFile,
} from "./document.ts";
const encode = (text: string) => new TextEncoder().encode(text).buffer;
test("拒绝空文件、超大文件和非图纸文件", () => {
  assert.throws(() => validateCadFile("a.dwg", 0));
  assert.throws(() => validateCadFile("a.pdf", 100));
  assert.throws(() => validateCadFile("a.dxf", 33 * 1024 * 1024));
  assert.doesNotThrow(() => validateCadFile("住宅.DWG", 3309082));
});
test("保留 UTF-8 中文标注并拒绝截断文件", () => {
  const text = "0\nSECTION\n2\nENTITIES\n1\n插座\n0\nENDSEC\n0\nEOF\n";
  assert.equal(decodeDxf(encode(text)), text);
  assert.throws(() => decodeDxf(encode(text.replace("EOF", ""))));
  assert.throws(() => decodeDxf(encode("AutoCAD Binary DXF\r\n")));
});
test("按 DXF 的 ANSI_936 声明解码 GBK 中文", () => {
  const header = new TextEncoder().encode(
    "0\nSECTION\n9\n$DWGCODEPAGE\n3\nANSI_936\n1\n",
  );
  const tail = new TextEncoder().encode("\n0\nENDSEC\n0\nEOF\n");
  const bytes = new Uint8Array([...header, 0xcd, 0xbc, 0xb2, 0xe3, ...tail]);
  assert.ok(decodeDxf(bytes.buffer).includes("图层"));
});
test("图层筛选兼容中文、大小写和空白", () => {
  const names = ["AXIS", "P-家具", "EQUIP-插座"];
  assert.deepEqual(filterLayerNames(names, " axis "), ["AXIS"]);
  assert.deepEqual(filterLayerNames(names, "插座"), ["EQUIP-插座"]);
  assert.deepEqual(filterLayerNames(names, ""), names);
});
test("冻结图层可准备几何，保留原始显隐并且不修改实体标志", () => {
  const source =
    "0\r\nSECTION\r\n2\r\nTABLES\r\n0\r\nLAYER\r\n2\r\n\\U+7A97\r\n70\r\n5\r\n62\r\n-4\r\n0\r\nLINE\r\n70\r\n1\r\n0\r\nEOF\r\n";
  const result = prepareDxfLayers(source);
  assert.deepEqual([...result.frozen], ["窗"]);
  assert.ok(result.text.includes("70\n4\n62\n-4"));
  assert.ok(result.text.includes("LINE\n70\n1"));
  assert.ok(source.includes("70\r\n5"));
});

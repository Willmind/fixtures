// SPDX-License-Identifier: GPL-3.0-or-later
// Standalone local conversion tool; never included in the browser bundle.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { LibreDwg, Dwg_File_Type } from "@mlightcad/libredwg-web";
import { restoreLayerVisibility } from "./dxf-layer-state.mjs";

const [input, output = "local-reference/cad"] = process.argv.slice(2);
if (!input) throw new Error('用法：npm run cad:convert -- "/路径/图纸.dwg"');
const bytes = await readFile(input);
if (!/^AC\d{4}$/.test(bytes.subarray(0, 6).toString()))
  throw new Error("文件不是可识别的 DWG。");
if (bytes.length > 32 * 1024 * 1024) throw new Error("DWG 文件超过 32 MB。");
const require = createRequire(import.meta.url);
const wasm = path.resolve(
  path.dirname(require.resolve("@mlightcad/libredwg-web")),
  "../wasm",
);
const reader = await LibreDwg.create(wasm);
const data = bytes.buffer.slice(
  bytes.byteOffset,
  bytes.byteOffset + bytes.byteLength,
);
let warningCode = 0;
const warn = console.warn;
console.warn = (...args) => {
  if (args[0] === "Open dwg file with error code:")
    warningCode = Number(args[1]);
  warn(...args);
};
const pointer = reader.dwg_read_data(data, Dwg_File_Type.DWG);
if (!pointer) throw new Error("无法解析 DWG 数据库。");
let report;
let layers;
try {
  const { database, stats } = reader.convertEx(pointer);
  layers = database.tables.LAYER.entries;
  report = {
    name: path.basename(input),
    layerCount: database.tables.LAYER.entries.length,
    blockCount: database.tables.BLOCK_RECORD.entries.length,
    entityCount: database.entities.length,
    unsupportedCount: stats.unknownEntityCount,
    warningCode,
  };
} finally {
  reader.dwg_free(pointer);
  console.warn = warn;
}
const dxf = reader.dwg_write_dxf(data);
if (!dxf) throw new Error("DWG 转换为 DXF 失败。");
const restored = restoreLayerVisibility(dxf, layers);
report.restoredLayerCount = restored.changed;
await mkdir(output, { recursive: true });
await writeFile(path.join(output, "current.dxf"), restored.bytes);
await writeFile(
  path.join(output, "current.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
console.log("已生成 " + path.resolve(output, "current.dxf"));

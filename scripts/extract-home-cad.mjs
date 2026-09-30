// Extract only the reviewed D-type sheet from the locally converted DWG.
// Source coordinates come from frame 1598C and title attribute 15991 (ZD11).
import fs from "node:fs";

const db = JSON.parse(
  fs.readFileSync("local-reference/cad/drawing.json", "utf8"),
).database;
const decoded = new TextDecoder("gb18030").decode(
  fs.readFileSync("local-reference/cad/current.dxf"),
);
const lines = decoded.replace(/\r/g, "").trimEnd().split("\n");
const pairs = [];
for (let i = 0; i < lines.length; i += 2)
  pairs.push([Number(lines[i].trim()), lines[i + 1]]);
const sections = new Map();
for (let i = 0; i < pairs.length; i++) {
  if (pairs[i][0] !== 0 || pairs[i][1] !== "SECTION") continue;
  const name = pairs[++i][1];
  const data = [];
  while (++i < pairs.length && !(pairs[i][0] === 0 && pairs[i][1] === "ENDSEC"))
    data.push(pairs[i]);
  sections.set(name, data);
}
function records(data) {
  const out = [];
  for (const pair of data) {
    if (pair[0] === 0) out.push([]);
    out.at(-1)?.push(pair);
  }
  return out;
}
const field = (record, code) => record.find((p) => p[0] === code)?.[1];
const inside = (p) =>
  p && p.x >= 113100 && p.x <= 172700 && p.y >= -304250 && p.y <= -262100;
// Insert anchors, text anchors and primitive vertices all use model coordinates.
const selected = new Set(
  db.entities
    .filter((e) => {
      const p =
        e.insertionPoint ??
        e.startPoint ??
        e.center ??
        e.vertices?.[0] ??
        e.text?.startPoint;
      return inside(p);
    })
    .map((e) => e.handle.toUpperCase()),
);
if (!selected.has("15990")) throw new Error("D 户型标题缺失，停止导出");
const entityRecords = records(sections.get("ENTITIES"));
let keepSequence = false;
const entities = entityRecords.filter((record) => {
  const type = record[0][1];
  if (type === "SEQEND") {
    const keep = keepSequence;
    keepSequence = false;
    return keep;
  }
  const keep = selected.has(field(record, 5)?.toUpperCase());
  if (type === "INSERT" || type === "POLYLINE") keepSequence = keep;
  return keep || (type === "VERTEX" && keepSequence);
});
const blocks = new Map();
let current;
for (const record of records(sections.get("BLOCKS"))) {
  if (record[0][1] === "BLOCK") {
    current = [];
    blocks.set(field(record, 2), current);
  }
  current?.push(record);
}
const needed = new Set();
function visit(list) {
  for (const record of list) {
    if (!["INSERT", "DIMENSION"].includes(record[0][1])) continue;
    const name = field(record, 2);
    if (!name || needed.has(name)) continue;
    needed.add(name);
    if (blocks.has(name)) visit(blocks.get(name));
  }
}
visit(entities);
const output = [];
function section(name, data) {
  output.push([0, "SECTION"], [2, name], ...data, [0, "ENDSEC"]);
}
section("HEADER", sections.get("HEADER"));
// Unused block definitions (and all unrelated drawings) are omitted.
const tables = records(sections.get("TABLES")).filter(
  (r) =>
    r[0][1] !== "BLOCK_RECORD" ||
    needed.has(field(r, 2)) ||
    /^\*(MODEL|PAPER)_SPACE/.test(field(r, 2)),
);
section("TABLES", tables.flat());
section(
  "BLOCKS",
  [...needed].flatMap((n) => blocks.get(n)?.flat() ?? []),
);
section("ENTITIES", entities.flat());
output.push([0, "EOF"]);
// ASCII escapes keep the original codepage declaration valid in other readers.
const ascii = output
  .map(([code, value]) => `${code}\n${value}\n`)
  .join("")
  .replace(
    /[^\x00-\x7F]/g,
    (c) => "\\U+" + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0"),
  );
fs.mkdirSync("public/house", { recursive: true });
fs.writeFileSync("public/house/d-electrical.dxf", ascii);
console.log(
  JSON.stringify({
    entities: entities.length,
    blocks: needed.size,
    bytes: ascii.length,
  }),
);

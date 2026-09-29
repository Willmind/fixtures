import assert from "node:assert/strict";
import test from "node:test";
import { restoreLayerVisibility } from "./dxf-layer-state.mjs";

test("按 DWG 句柄恢复开关，保留 GBK 字节、冻结标志和实体颜色", () => {
  const source = Buffer.concat([
    Buffer.from("0\r\nLAYER\r\n5\r\naF\r\n2\r\n"),
    Buffer.from([0xcd, 0xbc, 0xb2, 0xe3]),
    Buffer.from(
      "\r\n70\r\n1\r\n62\r\n-7\r\n0\r\nLAYER\r\n5\r\nB0\r\n62\r\n3\r\n0\r\nLINE\r\n62\r\n-4\r\n0\r\nEOF\r\n",
    ),
  ]);
  const result = restoreLayerVisibility(source, [
    { handle: "AF", off: false },
    { handle: "B0", off: true },
  ]);
  assert.equal(result.changed, 2);
  assert.ok(result.bytes.includes(Buffer.from([0xcd, 0xbc, 0xb2, 0xe3])));
  const text = result.bytes.toString("latin1");
  assert.ok(text.includes("70\r\n1\r\n62\r\n7"));
  assert.ok(text.includes("B0\r\n62\r\n-3"));
  assert.ok(text.includes("LINE\r\n62\r\n-4"));
});

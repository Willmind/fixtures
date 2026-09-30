import assert from "node:assert/strict";
import test from "node:test";
import { gzipSync } from "node:zlib";
import { fetchHomeDrawing } from "./homeDrawing.ts";

const drawing = "0\nSECTION\n2\nENTITIES\n1\n插座\n0\nENDSEC\n0\nEOF\n";

test("默认图纸优先下载压缩资产并还原中文内容", async (t) => {
  const requests: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: string) => {
    requests.push(input);
    return new Response(new Uint8Array(gzipSync(drawing)));
  });
  assert.equal(new TextDecoder().decode(await fetchHomeDrawing()), drawing);
  assert.deepEqual(requests, ["/house/d-electrical.dxf.gz"]);
});

test("压缩资源缺失或损坏时回退原图", async (t) => {
  for (const missing of [true, false]) {
    const requests: string[] = [];
    const fetchMock = t.mock.method(
      globalThis,
      "fetch",
      async (input: string) => {
        requests.push(input);
        if (input.endsWith(".gz"))
          return new Response("invalid gzip", { status: missing ? 404 : 200 });
        return new Response(drawing);
      },
    );
    assert.equal(new TextDecoder().decode(await fetchHomeDrawing()), drawing);
    assert.deepEqual(requests, [
      "/house/d-electrical.dxf.gz",
      "/house/d-electrical.dxf",
    ]);
    fetchMock.mock.restore();
  }
});

test("离开页面取消下载后不再请求回退图纸", async (t) => {
  const controller = new AbortController();
  const requests: string[] = [];
  const reason = new DOMException("Aborted", "AbortError");
  t.mock.method(globalThis, "fetch", async (input: string) => {
    requests.push(input);
    controller.abort(reason);
    throw reason;
  });
  await assert.rejects(fetchHomeDrawing(controller.signal), {
    name: "AbortError",
  });
  assert.equal(requests.length, 1);
});

test("不支持浏览器解压时直接加载原图", async (t) => {
  const descriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "DecompressionStream",
  )!;
  const requests: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: string) => {
    requests.push(input);
    return new Response(drawing);
  });
  try {
    Object.defineProperty(globalThis, "DecompressionStream", {
      configurable: true,
      value: undefined,
    });
    assert.equal(new TextDecoder().decode(await fetchHomeDrawing()), drawing);
    assert.deepEqual(requests, ["/house/d-electrical.dxf"]);
  } finally {
    Object.defineProperty(globalThis, "DecompressionStream", descriptor);
  }
});

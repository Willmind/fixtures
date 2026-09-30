const drawingUrl = "/house/d-electrical.dxf";

export async function fetchHomeDrawing(
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  // Static hosting can serve the small gzip file without an Nginx configuration change.
  if (typeof DecompressionStream !== "undefined") {
    try {
      const response = await fetch(`${drawingUrl}.gz`, { signal });
      if (!response.ok || !response.body) throw new Error("压缩图纸暂不可用");
      return await new Response(
        response.body.pipeThrough(new DecompressionStream("gzip")),
      ).arrayBuffer();
    } catch (cause) {
      if (signal?.aborted) throw cause;
      // An old browser, missing compressed asset or failed decompression can use the source DXF.
    }
  }
  const response = await fetch(drawingUrl, { signal });
  if (!response.ok)
    throw new Error("家里的图纸暂时加载失败，请点击“重新加载我家图纸”。");
  return response.arrayBuffer();
}

export type CadReport = {
  name: string;
  layerCount: number;
  blockCount: number;
  entityCount: number;
  unsupportedCount: number;
  warningCode: number;
};

export function validateCadFile(name: string, size: number) {
  if (!/\.(dwg|dxf)$/i.test(name))
    throw new Error("请选择 DWG 或 DXF 图纸文件。");
  if (size === 0) throw new Error("这个文件是空的，请重新选择。");
  if (size > 32 * 1024 * 1024) throw new Error("请使用小于 32 MB 的图纸文件。");
}

export function decodeDxf(bytes: ArrayBuffer): string {
  const data = new Uint8Array(bytes);
  if (
    new TextDecoder().decode(data.slice(0, 22)).startsWith("AutoCAD Binary DXF")
  ) {
    throw new Error("暂不支持二进制 DXF，请导出为 ASCII DXF。");
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    const header = new TextDecoder("latin1").decode(data.slice(0, 65536));
    const page = header.match(/\$DWGCODEPAGE\s+3\s+(\S+)/)?.[1];
    const encodings: Record<string, string> = {
      ANSI_936: "gb18030",
      ANSI_950: "big5",
      ANSI_932: "shift_jis",
      ANSI_1252: "windows-1252",
    };
    const encoding = page && encodings[page];
    if (!encoding)
      throw new Error("无法确认图纸文字编码，请转换为 UTF-8 DXF 后再导入。");
    text = new TextDecoder(encoding, { fatal: true }).decode(data);
  }
  if (!/\bSECTION\b/.test(text) || !/\bEOF\s*$/.test(text))
    throw new Error("文件内容不是完整的 ASCII DXF。");
  return text;
}

export function filterLayerNames(names: string[], query: string) {
  const needle = query.trim().toLocaleLowerCase();
  return names.filter((name) => name.toLocaleLowerCase().includes(needle));
}

// Prepare frozen layers too, so the user can reveal them without reloading.
// The original DXF is retained separately for export.
export function prepareDxfLayers(text: string) {
  const lines = text.split(/\r?\n/);
  const frozen = new Set<string>();
  for (let start = 0; start + 1 < lines.length; start += 2) {
    if (lines[start].trim() !== "0" || lines[start + 1] !== "LAYER") continue;
    let name = "",
      flags = -1;
    for (
      let i = start + 2;
      i + 1 < lines.length && lines[i].trim() !== "0";
      i += 2
    ) {
      if (lines[i].trim() === "2")
        name = lines[i + 1].replace(/\\U\+([0-9a-f]{4})/gi, (_, code) =>
          String.fromCharCode(parseInt(code, 16)),
        );
      if (lines[i].trim() === "70") flags = i + 1;
    }
    if (flags >= 0 && Number(lines[flags]) & 1) {
      frozen.add(name);
      lines[flags] = String(Number(lines[flags]) & ~1);
    }
  }
  return { text: lines.join("\n"), frozen };
}

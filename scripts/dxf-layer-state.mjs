// SPDX-License-Identifier: GPL-3.0-or-later
// Correct LibreDWG's exported layer visibility using its original DWG table.
export function restoreLayerVisibility(bytes, layers) {
  // Latin-1 is a byte-preserving mapping: do not change the DXF's original encoding.
  const text = Buffer.from(bytes).toString("latin1");
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const byHandle = new Map(
    layers.map((layer) => [layer.handle.toUpperCase(), layer]),
  );
  let changed = 0;
  for (let start = 0; start + 1 < lines.length; start += 2) {
    if (lines[start].trim() !== "0" || lines[start + 1] !== "LAYER") continue;
    let handle, color;
    for (
      let i = start + 2;
      i + 1 < lines.length && lines[i].trim() !== "0";
      i += 2
    ) {
      if (lines[i].trim() === "5") handle = lines[i + 1].trim().toUpperCase();
      if (lines[i].trim() === "62") color = i + 1;
    }
    const layer = byHandle.get(handle);
    if (!layer || color === undefined) continue;
    const value = Math.abs(Number(lines[color])) * (layer.off ? -1 : 1);
    if (Number(lines[color]) !== value) {
      lines[color] = String(value);
      changed++;
    }
  }
  return { bytes: Buffer.from(lines.join(newline), "latin1"), changed };
}

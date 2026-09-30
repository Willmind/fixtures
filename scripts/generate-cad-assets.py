"""Generate lossless DXF transport and a drawing-specific font. Requires fonttools."""

import gzip
import json
from pathlib import Path
import subprocess

from fontTools import subset
from fontTools.ttLib import TTFont


def main():
    root = Path(__file__).resolve().parent.parent
    drawing = root / "public/house/d-electrical.dxf"
    font_path = root / "public/fonts/fixtures-cad-sans.ttf"
    output_font = root / "public/fonts/fixtures-home-cad.ttf"
    # Use the viewer's decoder, including Unicode and CAD special-character escapes.
    characters = json.loads(subprocess.check_output([
        "node", "--input-type=module", "-e", """
        import fs from 'node:fs';
        import { ParseSpecialChars } from 'dxf-viewer/src/TextRenderer.js';
        const text = ParseSpecialChars(fs.readFileSync('public/house/d-electrical.dxf', 'utf8'));
        const chars = new Set([...text, ...'°±∅Ø×⌀−',
          ...Array.from({length: 95}, (_, i) => String.fromCodePoint(i + 32))]);
        console.log(JSON.stringify([...chars].map(c => c.codePointAt(0)).filter(c => c >= 32)));
        """,
    ], cwd=root, text=True))

    font = TTFont(font_path, recalcTimestamp=False)
    options = subset.Options()
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.name_legacy = True
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=characters)
    subsetter.subset(font)
    # Preserve copyright/license records and give the subset its own family name.
    names = {
        1: "Fixtures Home CAD", 2: "Regular", 3: "FixturesHomeCAD-Regular-1",
        4: "Fixtures Home CAD Regular", 6: "FixturesHomeCAD-Regular",
        16: "Fixtures Home CAD", 17: "Regular", 18: "Fixtures Home CAD Regular",
    }
    for record in font["name"].names:
        if record.nameID in names:
            record.string = names[record.nameID].encode(record.getEncoding())
    font.save(output_font)
    font.close()

    compressed = drawing.with_suffix(".dxf.gz")
    compressed.write_bytes(gzip.compress(drawing.read_bytes(), compresslevel=9, mtime=0))
    print(f"Font: {font_path.stat().st_size:,} -> {output_font.stat().st_size:,} bytes")
    print(f"Drawing: {drawing.stat().st_size:,} -> {compressed.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()

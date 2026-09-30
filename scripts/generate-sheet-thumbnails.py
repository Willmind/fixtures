"""Generate card previews from the published drawings. Requires Pillow."""

from pathlib import Path

from PIL import Image


def main():
    house = Path(__file__).resolve().parent.parent / "public" / "house"
    target = house / "thumbnails"
    target.mkdir(exist_ok=True)
    originals = sorted(house.glob("d-sheet-*.webp"))
    if not originals:
        raise SystemExit("No drawing images found in public/house")

    for source in originals:
        with Image.open(source) as image:
            image.thumbnail((720, 720), Image.Resampling.LANCZOS)
            destination = target / source.name
            image.save(destination, "WEBP", quality=78, method=6)
            print(f"{destination.name}: {destination.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()

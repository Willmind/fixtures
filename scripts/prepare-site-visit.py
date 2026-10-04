"""Create web copies of a local site visit. Original media is never modified.
Usage: python3 scripts/prepare-site-visit.py /path/to/实拍图片-毛坯
Requires macOS 15+, Swift command-line tools, sips, FFmpeg, and Pillow.
"""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('--ffmpeg', default='ffmpeg', help='FFmpeg binary with libx264 and libwebp')
parser.add_argument('--video-only', action='store_true')
args = parser.parse_args()
encoders = subprocess.run(
    [args.ffmpeg, '-hide_banner', '-encoders'],
    check=True, capture_output=True, text=True,
).stdout
if not all(codec in encoders for codec in ('libx264', 'libwebp')):
    parser.error('FFmpeg 需要 libx264 和 libwebp；请通过 --ffmpeg 指定完整版本。')
if not args.video_only:
    from PIL import Image, ImageOps
root = Path(__file__).resolve().parent.parent
manifest = root / 'src/visit/photos.json'
photos = json.loads(manifest.read_text())
destination = root / 'public/site-visit'
(destination / 'thumbs').mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix='fixtures-visit-') as temp:
    for photo in ([] if args.video_only else photos):
        source = args.source / photo['source']
        decoded = Path(temp) / f"{photo['id']}.jpg"
        subprocess.run(['sips', '-s', 'format', 'jpeg', '--resampleHeightWidthMax', '1800', str(source), '--out', str(decoded)], check=True, stdout=subprocess.DEVNULL)
        with Image.open(decoded) as image:
            full = ImageOps.exif_transpose(image).convert('RGB')
            if max(channel[1] for channel in full.getextrema()) == 0:
                raise RuntimeError(f'HEIC decoding produced a black image: {source.name}')
            photo['width'], photo['height'] = full.size
            # Saving fresh WebP files omits EXIF/GPS metadata.
            full.save(destination / f"{photo['id']}.webp", quality=80, method=6)
            full.thumbnail((520, 520), Image.Resampling.LANCZOS)
            full.save(destination / 'thumbs' / f"{photo['id']}.webp", quality=74, method=6)
if not args.video_only:
    manifest.write_text(json.dumps(photos, ensure_ascii=False, indent=2) + '\n')
# Let AVFoundation convert Dolby Vision / HLG to SDR using Apple's H.264 preset.
# The previous custom zscale + Mobius mapping visibly lifted the interior midtones.
# FFmpeg only compresses the already-SDR export; never apply a second tone map.
video = destination / 'walkthrough.mp4'
with tempfile.TemporaryDirectory(prefix='fixtures-video-') as temp:
    native = Path(temp) / 'native-sdr.mp4'
    compressed = Path(temp) / 'walkthrough.mp4'
    poster = Path(temp) / 'video-poster.webp'
    subprocess.run([
        'swift', '-module-cache-path', str(Path(temp) / 'swift-cache'),
        str(root / 'scripts/export-site-video.swift'),
        str(args.source / '实拍视频.MOV'), str(native),
    ], check=True)
    subprocess.run([
        args.ffmpeg, '-v', 'error', '-y', '-i', str(native),
        '-map', '0:v:0', '-an', '-map_metadata', '-1',
        '-vf', 'fps=24,format=yuv420p,sidedata=mode=delete',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '27',
        '-color_primaries', 'bt709', '-color_trc', 'bt709',
        '-colorspace', 'bt709', '-color_range', 'tv',
        '-movflags', '+faststart', str(compressed),
    ], check=True)
    subprocess.run([
        args.ffmpeg, '-v', 'error', '-y', '-ss', '8', '-i', str(compressed),
        '-frames:v', '1', '-vf', 'scale=520:-2', '-c:v', 'libwebp', str(poster),
    ], check=True)
    # Keep the current assets intact if either conversion step fails.
    video.write_bytes(compressed.read_bytes())
    (destination / 'video-poster.webp').write_bytes(poster.read_bytes())
print(f"{len(photos)} photos, video {video.stat().st_size / 1e6:.1f} MB, total {sum(p.stat().st_size for p in destination.rglob('*') if p.is_file()) / 1e6:.1f} MB")

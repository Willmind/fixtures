"""Create web copies of a local site visit. Original media is never modified.
Usage: python3 scripts/prepare-site-visit.py /path/to/实拍图片-毛坯
Requires macOS sips, FFmpeg with zscale, and Pillow.
"""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile
from PIL import Image, ImageOps

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('--ffmpeg', default='ffmpeg', help='FFmpeg binary with zscale support')
parser.add_argument('--video-only', action='store_true')
args = parser.parse_args()
filters = subprocess.run(
    [args.ffmpeg, '-hide_banner', '-filters'],
    check=True, capture_output=True, text=True,
).stdout
if 'zscale' not in filters:
    parser.error('FFmpeg 缺少 zscale；请通过 --ffmpeg 指定支持 HDR 转 SDR 的版本。')
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
manifest.write_text(json.dumps(photos, ensure_ascii=False, indent=2) + '\n')
# HDR HLG capture -> SDR H.264, silent, with metadata removed and fast-start playback.
# Use zscale's 203-nit nominal peak instead of 100 to avoid lifting interior midtones.
# Keep this a display-format conversion; do not add exposure/brightness enhancements.
video = destination / 'walkthrough.mp4'
subprocess.run([args.ffmpeg, '-v', 'error', '-y', '-i', str(args.source / '实拍视频.MOV'), '-map', '0:v:0', '-an', '-map_metadata', '-1', '-vf', 'zscale=t=linear:npl=203,format=gbrpf32le,tonemap=tonemap=mobius:desat=0,zscale=p=bt709:t=bt709:m=bt709:r=limited,scale=720:-2,fps=24,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '27', '-movflags', '+faststart', str(video)], check=True)
subprocess.run([args.ffmpeg, '-v', 'error', '-y', '-ss', '8', '-i', str(video), '-frames:v', '1', '-vf', 'scale=520:-2', str(destination / 'video-poster.webp')], check=True)
print(f"{len(photos)} photos, video {video.stat().st_size / 1e6:.1f} MB, total {sum(p.stat().st_size for p in destination.rglob('*') if p.is_file()) / 1e6:.1f} MB")

#!/usr/bin/env bash
# Joins the rendered frames (promo/out/frames/f00000.jpg ...) with the song into an MP4.
# Usage: bash promo/make-video.sh [frames-folder] [song.wav] [out.mp4]
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
frames="${1:-$here/out/frames}"
song="${2:-D:/CodeGen/Oh Hell/renders/xmasWords.wav}"
out="${3:-$here/out/vector-space-christmas.mp4}"
len=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$song")
ffmpeg -hide_banner -loglevel warning -y -framerate 30 -i "$frames/f%05d.jpg" -i "$song" \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart \
  -c:a aac -b:a 256k -af "afade=t=out:st=$(awk "BEGIN{print $len-2.5}"):d=2.5" -t "$len" "$out"
echo "wrote $out"

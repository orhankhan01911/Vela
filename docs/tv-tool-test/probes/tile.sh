#!/usr/bin/env bash
# Tile the sweep's canvas screenshots into one numbered sheet: bash tile.sh OUT  ->  OUT/sheet.png
# (OUT = the folder given to sweep-probe.mjs; it holds <tool>.png and <tool>-dialog.png.)
set -euo pipefail
OUT=$1
T=$(mktemp -d)
i=0
for f in "$OUT"/*.png; do
  case "$f" in *-dialog.png|*/sheet.png) continue ;; esac
  cp "$f" "$T/in$(printf %02d $i).png"; echo "$i $(basename "$f" .png)"; i=$((i+1))
done
ffmpeg -loglevel error -y -i "$T/in%02d.png" -vf "scale=420:270,tile=6x$(( (i+5)/6 ))" -frames:v 1 "$OUT/sheet.png"
rm -f "$T"/in*.png
rmdir "$T"
echo "sheet: $OUT/sheet.png"

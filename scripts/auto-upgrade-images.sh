#!/bin/bash
# Auto-upgrade: replaces BMP placeholders with real AI images
# Exits when all events have JPEGs or after 48 hours
set -e

cd /home/team/shared/site
DEADLINE=$(($(date +%s) + 172800))  # 48 hours
WAIT=900  # 15 min between attempts (scales up)

while [ $(date +%s) -lt $DEADLINE ]; do
  # Count BMP-linked events
  BMP_COUNT=$(python3 -c "
import json
with open('src/data/curated_events.json') as f:
    events = json.load(f)['events']
print(sum(1 for e in events if (e.get('imageUrl') or '').endswith('.bmp')))
")
  
  if [ "$BMP_COUNT" -eq 0 ]; then
    echo "[$(date)] ✅ All images upgraded! Exiting."
    exit 0
  fi

  echo "[$(date)] 🎯 $BMP_COUNT BMPs remain — running upgrade..."
  bun run scripts/batch-generate-images.ts 2>&1 | tail -5
  
  # Check if progress was made
  NEW_COUNT=$(python3 -c "
import json
with open('src/data/curated_events.json') as f:
    events = json.load(f)['events']
print(sum(1 for e in events if (e.get('imageUrl') or '').endswith('.bmp')))
")
  
  if [ "$NEW_COUNT" -lt "$BMP_COUNT" ]; then
    echo "[$(date)] 📈 Progress: $BMP_COUNT → $NEW_COUNT ($((BMP_COUNT - NEW_COUNT)) upgraded)"
    WAIT=900  # reset wait on progress
  else
    echo "[$(date)] ⚠️ No progress — backing off ${WAIT}s"
    WAIT=$((WAIT * 2))
    [ $WAIT -gt 7200 ] && WAIT=7200  # cap at 2 hours
  fi

  sleep $WAIT
done

echo "[$(date)] ⏰ 48-hour deadline reached. $BMP_COUNT BMPs remain."

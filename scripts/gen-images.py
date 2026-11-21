#!/usr/bin/env python3
"""Generate real JPEGs for all events missing them, one at a time with delays."""
import json, time, urllib.request, urllib.parse, os, sys

EVENTS_PATH = "src/data/curated_events.json"
IMAGES_DIR = "public/images/events"
DELAY = 4  # seconds between requests
TIMEOUT = 60

os.chdir("/home/team/shared/site")

with open(EVENTS_PATH) as f:
    data = json.load(f)

events = data["events"]

# Find events that need real images
needs_image = []
for e in events:
    url = e.get("imageUrl") or ""
    if not url or url.endswith(".webp") or "_ph" in url:
        needs_image.append(e)

print(f"Total: {len(events)} | Need images: {len(needs_image)} | Have: {len(events) - len(needs_image)}")

if not needs_image:
    print("All done!")
    sys.exit(0)

ok = 0
fail = 0
start = time.time()

for i, e in enumerate(needs_image):
    title = e["title"]
    desc = (e.get("description") or "")[:150]
    prompt = f"dark cinematic photograph of {title}, {desc}, haunting atmospheric dim lighting dark theme historical"
    
    # Slugify
    slug = title.lower()
    slug = "".join(c for c in slug if c.isalnum() or c in " -")
    slug = slug.strip().replace(" ", "-").replace("--", "-")[:80]
    
    url = f"https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt)}?width=800&height=600&seed={int(time.time()*1000)}"
    
    print(f"[{i+1}/{len(needs_image)}] {title[:60]}...")
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "PastShadows/1.0"})
        resp = urllib.request.urlopen(req, timeout=TIMEOUT)
        ct = resp.headers.get("Content-Type", "")
        body = resp.read()
        
        # Validate: must be an image, not JSON
        if "json" in ct or (len(body) < 500 and body[:1] == b"{"):
            print(f"  SKIP: JSON response (rate limited)")
            fail += 1
            time.sleep(DELAY * 2)
            continue
        
        if len(body) < 500:
            print(f"  SKIP: too small ({len(body)} bytes)")
            fail += 1
            time.sleep(DELAY)
            continue
        
        # Save
        fname = f"{slug}.jpg"
        # Deduplicate
        fpath = os.path.join(IMAGES_DIR, fname)
        if os.path.exists(fpath):
            fname = f"{slug}-{e['id'][:8]}.jpg"
            fpath = os.path.join(IMAGES_DIR, fname)
        
        with open(fpath, "wb") as f:
            f.write(body)
        
        e["imageUrl"] = f"/images/events/{fname}"
        ok += 1
        print(f"  OK: {len(body)} bytes -> {fname}")
        
    except Exception as ex:
        print(f"  FAIL: {ex}")
        fail += 1
        time.sleep(DELAY)
    
    # Save periodically
    if (i + 1) % 10 == 0:
        data["metadata"] = {**data.get("metadata", {}), "images_ok": ok, "images_fail": fail}
        with open(EVENTS_PATH, "w") as f:
            json.dump(data, f, indent=2)
        elapsed = int(time.time() - start)
        print(f"  [SAVED] {ok} ok, {fail} fail, {elapsed}s")
    
    time.sleep(DELAY)

# Final save
data["metadata"] = {**data.get("metadata", {}), "images_ok": ok, "images_fail": fail, "last_gen": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
with open(EVENTS_PATH, "w") as f:
    json.dump(data, f, indent=2)

elapsed = int(time.time() - start)
print(f"\nDONE: {ok} images, {fail} failed in {elapsed}s")

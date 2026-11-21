import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const EVENTS_PATH = join(import.meta.dir, "..", "src", "data", "curated_events.json");
const PROGRESS_PATH = join(import.meta.dir, "..", "src", "data", ".batch_progress.json");
const IMAGES_DIR = join(import.meta.dir, "..", "public", "images", "events");
const TIMEOUT_MS = 15000;
const BATCH_SIZE = 10;

interface Event { id: string; title: string; description?: string; imageUrl?: string | null; [key: string]: any; }

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

async function generateImage(event: Event): Promise<string | null> {
  const desc = (event.description || "").slice(0, 200);
  const promptText = "dark cinematic photograph of " + event.title + ", " + desc + ", haunting, atmospheric, dim lighting, dark theme, historical";
  const url = "https://image.pollinations.ai/prompt/" + encodeURIComponent(promptText) + "?width=800&height=600&seed=" + Date.now();
  const controller = new AbortController();
  const timer = setTimeout(function() { controller.abort(); }, TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    const buf = await res.arrayBuffer();
    if (ct.includes("json") || buf.byteLength < 500) {
      if (buf.byteLength < 500) {
        const text = new TextDecoder().decode(buf.slice(0, Math.min(buf.byteLength, 200)));
        if (text.includes("Queue full") || text.includes("Too Many")) return null;
      }
      return null;
    }
    const slug = slugify(event.title);
    let filepath = join(IMAGES_DIR, slug + ".jpg");
    if (existsSync(filepath)) filepath = join(IMAGES_DIR, slug + "-" + event.id.slice(0, 8) + ".jpg");
    await Bun.write(filepath, new Uint8Array(buf));
    return "/images/events/" + filepath.split("/").pop();
  } catch { return null; } finally { clearTimeout(timer); }
}

async function main() {
  mkdirSync(IMAGES_DIR, { recursive: true });
  const data = JSON.parse(readFileSync(EVENTS_PATH, "utf-8"));
  const events: Event[] = data.events || [];
  const todo = events.filter(function(e) { return !e.imageUrl || (e.imageUrl && e.imageUrl.endsWith("_ph.bmp")); });
  const done = events.length - todo.length;
  console.log("Total: " + events.length + " | AI: " + done + " | Need: " + todo.length);
  console.log("Sequential | " + (TIMEOUT_MS/1000) + "s timeout | save every " + BATCH_SIZE);
  console.log("");

  if (todo.length === 0) { console.log("All done!"); return; }

  let startIdx = 0, success = 0, failed = 0;
  if (existsSync(PROGRESS_PATH)) {
    try {
      const p = JSON.parse(readFileSync(PROGRESS_PATH, "utf-8"));
      startIdx = p.lastIndex || 0; success = p.success || 0; failed = p.failed || 0;
      if (startIdx > 0) console.log("Resuming from " + startIdx + "/" + todo.length + "\n");
    } catch(e) {}
  }

  const t0 = Date.now();
  for (let i = startIdx; i < todo.length; i++) {
    const event = todo[i];
    const num = i + 1;
    const elapsed = ((Date.now() - t0)/1000).toFixed(0);
    const rate = (success / (Number(elapsed)||1)).toFixed(2);
    console.log("[" + num + "/" + todo.length + "] " + elapsed + "s " + rate + "/s " + event.title.slice(0, 50));

    const imgUrl = await generateImage(event);
    if (imgUrl) { event.imageUrl = imgUrl; success++; }
    else { failed++; }

    if (num % BATCH_SIZE === 0 || num === todo.length) {
      data.events = events;
      data.metadata = Object.assign({}, data.metadata, {
        images_generated: success, images_failed: failed, last_generation: new Date().toISOString()
      });
      writeFileSync(EVENTS_PATH, JSON.stringify(data, null, 2));
      writeFileSync(PROGRESS_PATH, JSON.stringify({ lastIndex: num, success: success, failed: failed, total: todo.length }));
      console.log("   Saved | OK:" + success + " FAIL:" + failed + "\n");
    }
  }
  console.log("\nComplete! OK:" + success + " FAIL:" + failed + " in " + ((Date.now()-t0)/1000).toFixed(0) + "s");
}

main().catch(function(e) { console.error("Fatal:", e); process.exit(1); });

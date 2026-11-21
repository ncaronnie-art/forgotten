/**
 * Fast local placeholder image generator for Past Shadows events.
 * Creates dark-themed gradient WebP images via sharp.
 * Used as fallback when Pollinations.ai is unavailable or rate-limited.
 *
 * Usage: bun run scripts/generate-placeholders.ts
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const EVENTS_PATH = join(import.meta.dir, "..", "src", "data", "curated_events.json");
const IMAGES_DIR = join(import.meta.dir, "..", "public", "images", "events");

// Category-based dark color schemes
const CATEGORY_COLORS: Record<string, [number, number, number]> = {
  crime: [139, 0, 0],         // dark red
  death: [60, 60, 60],        // dark gray
  disaster: [139, 69, 19],    // dark brown
  cemetery: [40, 40, 50],     // dark blue-gray
  war_conflict: [80, 20, 20], // dark maroon
  execution: [100, 20, 20],   // blood red
  riot: [120, 60, 20],        // dark orange
  mystery: [30, 20, 60],      // dark purple
  prison: [50, 50, 55],       // steel gray
  historical: [50, 40, 30],   // dark sepia
  local_legends: [40, 20, 60], // dark violet
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

// Generate a dark gradient placeholder and encode it as WebP (quality 82)
function buildGradientPixels(width: number, height: number, r: number, g: number, b: number): Buffer {
  const pixels = Buffer.alloc(width * height * 3);

  // Create a gradient from dark to slightly lighter
  for (let y = 0; y < height; y++) {
    const brightness = 0.4 + (y / height) * 0.3; // 0.4 to 0.7
    const pr = Math.min(255, Math.floor(r * brightness));
    const pg = Math.min(255, Math.floor(g * brightness));
    const pb = Math.min(255, Math.floor(b * brightness));

    // Add subtle noise
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      const noise = Math.floor((Math.random() - 0.5) * 20);
      pixels[idx] = Math.max(0, Math.min(255, pr + noise));
      pixels[idx + 1] = Math.max(0, Math.min(255, pg + noise));
      pixels[idx + 2] = Math.max(0, Math.min(255, pb + noise));
    }
  }

  return pixels;
}

async function writePlaceholderWebP(
  filepath: string,
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
): Promise<void> {
  const pixels = buildGradientPixels(width, height, r, g, b);
  await sharp(pixels, { raw: { width, height, channels: 3 } })
    .webp({ quality: 82 })
    .toFile(filepath);
}

async function main() {
  console.log("📖 Reading curated_events.json...");
  const raw = readFileSync(EVENTS_PATH, "utf-8");
  const data = JSON.parse(raw);
  const allEvents = data.events || [];
  const metadata = data.metadata || {};
  
  const missing = allEvents.filter((e: any) => !e.imageUrl);
  const alreadyHave = allEvents.length - missing.length;
  
  console.log(`📊 Total: ${allEvents.length} | ✅ ${alreadyHave} | 🎯 ${missing.length} need placeholders`);
  
  if (missing.length === 0) {
    console.log("✨ All events already have images!");
    return;
  }
  
  mkdirSync(IMAGES_DIR, { recursive: true });
  
  let generated = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < missing.length; i++) {
    const event = missing[i];
    const category = event.category || "historical";
    const [r, g, b] = CATEGORY_COLORS[category] || [50, 50, 55];
    
    const slug = slugify(event.title);
    let filename = `${slug}_ph.webp`; // _ph suffix = placeholder, can be replaced by AI later
    let filepath = join(IMAGES_DIR, filename);
    
    // Handle duplicates
    if (existsSync(filepath)) {
      filename = `${slug}-${event.id.slice(0, 8)}_ph.webp`;
      filepath = join(IMAGES_DIR, filename);
    }
    
    await writePlaceholderWebP(filepath, 400, 300, r, g, b);
    
    event.imageUrl = `/images/events/${filename}`;
    generated++;
    
    if (generated % 50 === 0 || i === missing.length - 1) {
      data.events = allEvents;
      data.metadata = {
        ...metadata,
        placeholders_generated: generated,
        last_generation: new Date().toISOString(),
      };
      writeFileSync(EVENTS_PATH, JSON.stringify(data, null, 2));
      console.log(`   💾 ${generated}/${missing.length} placeholders generated`);
    }
  }
  
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ ${generated} placeholder images generated in ${elapsed}s`);
  console.log(`📁 ${IMAGES_DIR}`);
  console.log(`\n💡 Tip: Run 'bun run scripts/batch-generate-images.ts' to replace placeholders with AI images`);
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});

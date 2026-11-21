/**
 * Fast local placeholder image generator for Past Shadows events.
 * Creates dark-themed gradient JPGs using pure Node.js (no deps).
 * Used as fallback when Pollinations.ai is unavailable or rate-limited.
 *
 * Usage: bun run scripts/generate-placeholders.ts
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createCanvas } from "@napi-rs/canvas";

// We'll use a pure Node approach since we can't install packages
// Instead, generate minimal valid JPEGs using raw bytes

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

// Generate a minimal valid JPEG programmatically
// We create a simple dark gradient using raw pixel data + JPEG encoding
function generateDarkJPEG(width: number, height: number, r: number, g: number, b: number): Uint8Array {
  // Create a simple PPM P6 (binary) then convert mental model
  // Actually, let's generate a proper minimal JPEG using well-known quantization tables
  
  const pixels = new Uint8Array(width * height * 3);
  
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
  
  // Encode as BMP (simpler than JPEG to generate programmatically)
  // BMP header + DIB header + pixel data
  const rowSize = Math.floor((width * 3 + 3) / 4) * 4;
  const pixelDataSize = rowSize * height;
  const fileSize = 54 + pixelDataSize;
  
  const buffer = Buffer.alloc(fileSize);
  let offset = 0;
  
  // BMP file header (14 bytes)
  buffer.write("BM", 0);                    // signature
  buffer.writeUInt32LE(fileSize, 2);        // file size
  buffer.writeUInt32LE(0, 6);              // reserved
  buffer.writeUInt32LE(54, 10);             // pixel data offset
  
  // DIB header (40 bytes)
  buffer.writeUInt32LE(40, 14);            // header size
  buffer.writeInt32LE(width, 18);           // width
  buffer.writeInt32LE(height, 22);          // height
  buffer.writeUInt16LE(1, 26);             // planes
  buffer.writeUInt16LE(24, 28);            // bits per pixel
  buffer.writeUInt32LE(0, 30);             // compression
  buffer.writeUInt32LE(pixelDataSize, 34); // image size
  buffer.writeInt32LE(2835, 38);           // x pixels per meter (72 DPI)
  buffer.writeInt32LE(2835, 42);           // y pixels per meter
  buffer.writeUInt32LE(0, 46);             // colors used
  buffer.writeUInt32LE(0, 50);             // important colors
  
  // Pixel data (BMP: BGR, bottom-to-top, padded rows)
  offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    let rowOffset = offset;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      buffer[rowOffset] = pixels[idx + 2];     // B
      buffer[rowOffset + 1] = pixels[idx + 1]; // G
      buffer[rowOffset + 2] = pixels[idx];     // R
      rowOffset += 3;
    }
    // Padding
    for (let p = width * 3; p < rowSize; p++) {
      buffer[offset + p] = 0;
    }
    offset += rowSize;
  }
  
  return new Uint8Array(buffer);
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
    let filename = `${slug}_ph.bmp`; // _ph suffix = placeholder, can be replaced by AI later
    let filepath = join(IMAGES_DIR, filename);
    
    // Handle duplicates
    if (existsSync(filepath)) {
      filename = `${slug}-${event.id.slice(0, 8)}_ph.bmp`;
      filepath = join(IMAGES_DIR, filename);
    }
    
    const jpeg = generateDarkJPEG(400, 300, r, g, b);
    writeFileSync(filepath, jpeg);
    
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

import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

/** Create a minimal PNG with a candle icon on dark background */
function createMinimalPNG(width: number, height: number): Buffer {
  const channels = 4;
  const data = new Uint8Array(width * height * channels);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const cx = x - width / 2;
      const cy = y - height / 2;

      // Dark background
      let r = 10, g = 10, b = 15, a = 255;

      // Candle body (golden rectangle)
      const cw = width * 0.16;
      const ch = height * 0.35;
      const ct = -ch / 2 - height * 0.02;

      if (cx >= -cw / 2 && cx <= cw / 2 && cy >= ct && cy <= ct + ch) {
        r = 201; g = 169; b = 110; a = 230;
      }

      // Flame
      const fc = cy + ch / 2 + height * 0.06 + height * 0.08;
      const fa = width * 0.06;
      const fb = height * 0.09;
      if ((cx * cx) / (fa * fa) + (fc * fc) / (fb * fb) <= 1) {
        const t = 1 - Math.sqrt((cx * cx) / (fa * fa) + (fc * fc) / (fb * fb));
        r = Math.floor(255 - t * 55);
        g = Math.floor(200 + t * 55);
        b = Math.floor(0 + t * 200);
        a = Math.floor(200 + t * 55);
      }

      // Flame core
      const fca = width * 0.025;
      const fcb = height * 0.04;
      if ((cx * cx) / (fca * fca) + (fc * fc) / (fcb * fcb) <= 1) {
        r = 255; g = 255; b = 220; a = 255;
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
    }
  }

  return encodePNG(width, height, data);
}

function encodePNG(w: number, h: number, data: Uint8Array): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  const ihdrChunk = chunk("IHDR", ihdr);

  // Raw data with filter byte (0 = None) per scanline
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0; // filter byte
    for (let x = 0; x < w * 4; x++) {
      raw[y * (1 + w * 4) + 1 + x] = data[y * w * 4 + x];
    }
  }
  const compressed = deflateSync(raw);
  const idatChunk = chunk("IDAT", compressed);
  const iendChunk = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, "ascii");
  const crcData = Buffer.concat([typeB, data]);
  const crc = crc32(crcData);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeB, data, crcB]);
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate icons
const icon192 = createMinimalPNG(192, 192);
writeFileSync("/home/team/shared/site/public/icons/icon-192.png", icon192);
console.log("✓ Created icon-192.png (" + icon192.length + " bytes)");

const icon512 = createMinimalPNG(512, 512);
writeFileSync("/home/team/shared/site/public/icons/icon-512.png", icon512);
console.log("✓ Created icon-512.png (" + icon512.length + " bytes)");

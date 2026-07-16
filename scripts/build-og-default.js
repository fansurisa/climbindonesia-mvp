#!/usr/bin/env node
/*
 * Generate assets/og-default.png — a branded 1200x630 fallback OG image.
 * Pure Node (zlib only, no deps). Navy->blue gradient with a white triangle.
 * Used when a tour has no image (currently none, but future-proof).
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 1200, H = 630;
const out = path.resolve(__dirname, '..', 'assets', 'og-default.png');
fs.mkdirSync(path.dirname(out), { recursive: true });

// palette
const navy = [11, 31, 58];
const blue = [29, 111, 224];

// point-in-triangle
function inTri(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

// build raw RGB (no alpha) rows, top-to-bottom
const raw = Buffer.alloc((W * 3 + 1) * H);
let o = 0;
for (let y = 0; y < H; y++) {
  raw[o++] = 0; // filter type 0
  for (let x = 0; x < W; x++) {
    // gradient left(navy)->right(blue)
    const t = x / (W - 1);
    let r = Math.round(navy[0] + (blue[0] - navy[0]) * t);
    let g = Math.round(navy[1] + (blue[1] - navy[1]) * t);
    let b = Math.round(navy[2] + (blue[2] - navy[2]) * t);
    // center triangle (white, ~28% size)
    if (inTri(x, y, W / 2, H * 0.32, W * 0.40, H * 0.66, W * 0.60, H * 0.66)) {
      r = 255; g = 255; b = 255;
    }
    raw[o++] = r; raw[o++] = g; raw[o++] = b;
  }
}

// PNG chunks
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c;
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 2;  // color type RGB
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const idat = zlib.deflateSync(raw);
const png = Buffer.concat([
  sig,
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0))
]);
fs.writeFileSync(out, png);
console.log('Wrote', out, '(' + png.length + ' bytes)');

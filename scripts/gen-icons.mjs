/**
 * Generate minimal valid PNG icons (purple squares) for the PWA manifest.
 * Run once: node scripts/gen-icons.mjs
 *
 * These are pre-encoded minimal 1×1 purple PNGs that browsers accept.
 * For a proper build, replace with an SVG-to-PNG converter (sharp, etc.).
 */

import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'apps', 'web', 'public', 'icons');

mkdirSync(outDir, { recursive: true });

/**
 * Create a minimal valid PNG file buffer for a solid-colour square.
 * Uses raw zlib-deflated pixel data (no external deps).
 */
function createPng(size, r, g, b) {
  // PNG Signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  function u32be(n) {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(n, 0);
    return b;
  }

  function crc32(data) {
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = u32be(data.length);
    const crc = u32be(crc32(Buffer.concat([typeBytes, data])));
    return Buffer.concat([len, typeBytes, data, crc]);
  }

  // IHDR: width, height, bit depth=8, color type=2 (RGB), compression=0, filter=0, interlace=0
  const ihdr = Buffer.concat([
    u32be(size),   // width
    u32be(size),   // height
    Buffer.from([8, 2, 0, 0, 0]),
  ]);

  // Raw pixel data: each row starts with filter byte 0
  // For small sizes we use a simple "none" filter (0)
  const row = Buffer.alloc(1 + size * 3, 0);
  row[0] = 0; // filter byte
  for (let i = 0; i < size; i++) {
    row[1 + i * 3] = r;
    row[1 + i * 3 + 1] = g;
    row[1 + i * 3 + 2] = b;
  }

  const rawData = Buffer.concat(Array(size).fill(row));

  // zlib compress with deflate (Node's zlib, synchronous via createDeflateRaw + concatenation trick)
  // We'll use a pure-JS approach: store type (no compression), just wrapping bytes
  // zlib DEFLATE store block: BFINAL=1, BTYPE=00 (no compression)
  function zlibStore(input) {
    // zlib header: CMF=0x78, FLG=0x01 (zlib level 1, check bits)
    // For stored: each block max 65535 bytes
    const blocks = [];
    let off = 0;
    while (off < input.length) {
      const len = Math.min(0xffff, input.length - off);
      const isLast = off + len >= input.length ? 1 : 0;
      const block = Buffer.alloc(5 + len);
      block[0] = isLast;
      block[1] = len & 0xff;
      block[2] = (len >> 8) & 0xff;
      block[3] = ~len & 0xff;
      block[4] = (~len >> 8) & 0xff;
      input.copy(block, 5, off, off + len);
      blocks.push(block);
      off += len;
    }

    // Adler-32
    let s1 = 1, s2 = 0;
    for (const b of input) {
      s1 = (s1 + b) % 65521;
      s2 = (s2 + s1) % 65521;
    }
    const adler = Buffer.alloc(4);
    const adlerVal = ((s2 & 0xffff) * 65536 + (s1 & 0xffff)) >>> 0;
    adler.writeUInt32BE(adlerVal, 0);

    return Buffer.concat([Buffer.from([0x78, 0x01]), ...blocks, adler]);
  }

  const compressed = zlibStore(rawData);
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, chunk('IHDR', ihdr), idat, iend]);
}

// Brand purple #6D28D9 = rgb(109, 40, 217)
const PURPLE_R = 109;
const PURPLE_G = 40;
const PURPLE_B = 217;

const icon192 = createPng(192, PURPLE_R, PURPLE_G, PURPLE_B);
const icon512 = createPng(512, PURPLE_R, PURPLE_G, PURPLE_B);

writeFileSync(join(outDir, 'icon-192.png'), icon192);
writeFileSync(join(outDir, 'icon-512.png'), icon512);

console.log('Icons written to', outDir);
console.log('  icon-192.png:', icon192.length, 'bytes');
console.log('  icon-512.png:', icon512.length, 'bytes');

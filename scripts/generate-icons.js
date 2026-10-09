import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, drawFn) {
  // RGBA buffer
  const buffer = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      buffer[idx] = r;
      buffer[idx + 1] = g;
      buffer[idx + 2] = b;
      buffer[idx + 3] = a;
    }
  }

  // Scanlines with filter byte 0
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  let srcOffset = 0;
  let dstOffset = 0;
  for (let y = 0; y < height; y++) {
    scanlines[dstOffset++] = 0; // Filter 0 (None)
    buffer.copy(scanlines, dstOffset, srcOffset, srcOffset + width * 4);
    dstOffset += width * 4;
    srcOffset += width * 4;
  }

  const compressed = zlib.deflateSync(scanlines, { level: 9 });

  // CRC32 table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(typeStr, data) {
    const len = data.length;
    const chunk = Buffer.alloc(8 + len + 4);
    chunk.writeUInt32BE(len, 0);
    chunk.write(typeStr, 4, 4, 'ascii');
    data.copy(chunk, 8);
    const crc = crc32(chunk.subarray(4, 8 + len));
    chunk.writeUInt32BE(crc, 8 + len);
    return chunk;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Brand icon drawer
function drawMedicalIcon(x, y, w, h, isMaskable = false) {
  const nx = x / w; // 0..1
  const ny = y / h; // 0..1
  const cx = 0.5;
  const cy = 0.5;
  const dx = nx - cx;
  const dy = ny - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background deep navy #0a192f -> #0f2b46 gradient
  const bgR = Math.round(10 + ny * 5);
  const bgG = Math.round(25 + ny * 18);
  const bgB = Math.round(47 + ny * 23);

  // Center teal shield rounded rect
  // For maskable icon, keep within safe zone (center 0.6)
  const boxScale = isMaskable ? 0.32 : 0.28;
  const inBoxX = Math.abs(dx) <= boxScale;
  const inBoxY = Math.abs(dy) <= boxScale;

  // Cross dimensions
  const crossThick = isMaskable ? 0.05 : 0.045;
  const crossLen = isMaskable ? 0.22 : 0.20;

  const inVertCross = Math.abs(dx) <= crossThick && Math.abs(dy) <= crossLen;
  const inHorizCross = Math.abs(dy) <= crossThick && Math.abs(dx) <= crossLen;

  // Pulse center circle
  const inCenterCircle = dist <= (isMaskable ? 0.038 : 0.035);
  const inPulseDot = dist <= (isMaskable ? 0.020 : 0.018);

  // Check if inside inner rounded rect container
  // Corner radius calculation
  const cornerR = isMaskable ? 0.08 : 0.07;
  const cornerDx = Math.max(0, Math.abs(dx) - (boxScale - cornerR));
  const cornerDy = Math.max(0, Math.abs(dy) - (boxScale - cornerR));
  const inRoundedBox = (cornerDx * cornerDx + cornerDy * cornerDy) <= (cornerR * cornerR);

  if (inPulseDot) {
    return [20, 184, 166, 255]; // teal-500
  }
  if (inCenterCircle) {
    return [10, 25, 47, 255]; // navy center
  }
  if (inVertCross || inHorizCross) {
    return [255, 255, 255, 255]; // white medical cross
  }
  if (inRoundedBox) {
    // Teal gradient #0d9488 -> #14b8a6
    const tealFactor = (nx + ny) / 2;
    const tr = Math.round(13 + tealFactor * 7);
    const tg = Math.round(148 + tealFactor * 36);
    const tb = Math.round(136 + tealFactor * 30);
    return [tr, tg, tb, 255];
  }

  // Outer glowing ring
  const ringDist = Math.abs(dist - (isMaskable ? 0.38 : 0.36));
  if (ringDist <= 0.008) {
    return [20, 184, 166, 120];
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 192x192
const p192 = createPNG(192, 192, (x, y, w, h) => drawMedicalIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), p192);

// 512x512
const p512 = createPNG(512, 512, (x, y, w, h) => drawMedicalIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), p512);

// 512x512 maskable (with 15% safe padding)
const pMask = createPNG(512, 512, (x, y, w, h) => drawMedicalIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pMask);

// 180x180 apple touch icon
const pApple = createPNG(180, 180, (x, y, w, h) => drawMedicalIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pApple);

console.log('Successfully generated PWA PNG icons!');

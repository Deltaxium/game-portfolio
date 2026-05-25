import fs from 'node:fs';
import zlib from 'node:zlib';

const sourcePath = 'src/game/assets/sprites/sprites.png';
const targetWidth = 160;
const targetHeight = 112;

const outputs = [
  { name: 'horse-brass-hoof.png', region: { x: 52, y: 16, width: 156, height: 150 } },
  { name: 'horse-ghost-pepper.png', region: { x: 52, y: 278, width: 156, height: 150 } },
  { name: 'horse-comet.png', region: { x: 52, y: 538, width: 156, height: 150 } },
];

function readUInt32(buffer, offset) {
  return buffer.readUInt32BE(offset);
}

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function parsePng(filePath) {
  const buffer = fs.readFileSync(filePath);
  const signature = buffer.subarray(0, 8);
  if (signature.toString('hex') !== '89504e470d0a1a0a') throw new Error('Not a PNG file.');

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = readUInt32(buffer, offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === 'IHDR') {
      width = readUInt32(data, 0);
      height = readUInt32(data, 4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (bitDepth !== 8 || colorType !== 6) throw new Error('Expected 8-bit RGBA PNG.');
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const pixels = Buffer.alloc(width * height * 4);
  let source = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[source];
    source += 1;
    const row = Buffer.from(inflated.subarray(source, source + stride));
    source += stride;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 4 ? row[x - 4] : 0;
      const up = previous[x] || 0;
      const upLeft = x >= 4 ? previous[x - 4] : 0;
      if (filter === 1) row[x] = (row[x] + left) & 255;
      else if (filter === 2) row[x] = (row[x] + up) & 255;
      else if (filter === 3) row[x] = (row[x] + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        row[x] = (row[x] + predictor) & 255;
      } else if (filter !== 0) {
        throw new Error(`Unsupported PNG filter ${filter}.`);
      }
    }
    row.copy(pixels, y * stride);
    previous = row;
  }

  return { width, height, pixels };
}

function writePng(filePath, width, height, pixels) {
  const signature = Buffer.from('89504e470d0a1a0a', 'hex');
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 4 + 1);
    rows[rowOffset] = 0;
    pixels.copy(rows, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const chunks = [
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
    makeChunk('IEND', Buffer.alloc(0)),
  ];
  fs.writeFileSync(filePath, Buffer.concat([signature, ...chunks]));
}

function makeChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return chunk;
}

function findAlphaBounds(image, region) {
  let minX = region.x + region.width;
  let minY = region.y + region.height;
  let maxX = region.x;
  let maxY = region.y;
  for (let y = region.y; y < region.y + region.height; y += 1) {
    for (let x = region.x; x < region.x + region.width; x += 1) {
      const alpha = image.pixels[(y * image.width + x) * 4 + 3];
      if (alpha <= 12) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function sampleNearest(image, x, y) {
  const sx = Math.max(0, Math.min(image.width - 1, Math.round(x)));
  const sy = Math.max(0, Math.min(image.height - 1, Math.round(y)));
  const offset = (sy * image.width + sx) * 4;
  return image.pixels.subarray(offset, offset + 4);
}

function renderSprite(image, bounds) {
  const out = Buffer.alloc(targetWidth * targetHeight * 4);
  const scale = Math.min(148 / bounds.width, 102 / bounds.height);
  const drawWidth = Math.round(bounds.width * scale);
  const drawHeight = Math.round(bounds.height * scale);
  const offsetX = Math.floor((targetWidth - drawWidth) / 2);
  const offsetY = targetHeight - drawHeight - 4;

  for (let y = 0; y < drawHeight; y += 1) {
    for (let x = 0; x < drawWidth; x += 1) {
      const sourceX = bounds.x + x / scale;
      const sourceY = bounds.y + y / scale;
      const color = sampleNearest(image, sourceX, sourceY);
      const target = ((offsetY + y) * targetWidth + offsetX + x) * 4;
      out[target] = color[0];
      out[target + 1] = color[1];
      out[target + 2] = color[2];
      out[target + 3] = color[3];
    }
  }

  return out;
}

const sheet = parsePng(sourcePath);
for (const output of outputs) {
  const bounds = findAlphaBounds(sheet, output.region);
  const pixels = renderSprite(sheet, bounds);
  writePng(`src/game/assets/sprites/${output.name}`, targetWidth, targetHeight, pixels);
  console.log(`${output.name}: ${bounds.width}x${bounds.height} from ${bounds.x},${bounds.y}`);
}

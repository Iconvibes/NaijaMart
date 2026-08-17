// Generates vendor brand-mark logos as real PNG files.
// No image libraries: encodes PNG manually with Node's zlib.
// Run: node scripts/generate-vendor-logos.mjs
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// 5x7 pixel glyphs (1 = ink)
const GLYPHS = {
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  S: ['01110', '10001', '10000', '01110', '00001', '10001', '01110'],
  M: ['10001', '11011', '10101', '10001', '10001', '10001', '10001'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
}

// hex -> [r, g, b]
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]

const VENDORS = [
  { file: 'vendor-techhub.png', glyph: 'T', color: '#FF9900', name: 'TechHub NG' },
  { file: 'vendor-slot.png', glyph: 'S', color: '#2E2E2E', name: 'Slot Limited' },
  { file: 'vendor-mixtra.png', glyph: 'M', color: '#00B517', name: 'Mixtra NG' },
  { file: 'vendor-3chub.png', glyph: '3', color: '#D32F2F', name: '3CHub' },
  { file: 'vendor-solemate.png', glyph: 'S', color: '#1565C0', name: 'SoleMate NG' },
]

function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  let crc = -1
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
  return (crc ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc(height * (1 + width * 4))
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0 // filter: none
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function makeLogo(glyphKey, colorHex) {
  const size = 256
  const radius = 48
  const [br, bg, bb] = hex(colorHex)
  const glyph = GLYPHS[glyphKey]
  const scale = 24 // glyph cell -> px
  const gw = glyph[0].length * scale
  const gh = glyph.length * scale
  const ox = Math.floor((size - gw) / 2)
  const oy = Math.floor((size - gh) / 2)

  const px = Buffer.alloc(size * size * 4)
  const inside = (x, y) => {
    const rx = Math.min(x, size - 1 - x)
    const ry = Math.min(y, size - 1 - y)
    const cx = Math.min(rx, size - 1 - rx)
    const cy = Math.min(ry, size - 1 - ry)
    return cx >= radius || cy >= radius || (cx - radius) ** 2 + (cy - radius) ** 2 <= radius ** 2
  }
  const ink = (x, y) => {
    const gx = Math.floor((x - ox) / scale)
    const gy = Math.floor((y - oy) / scale)
    if (gx < 0 || gy < 0 || gx >= glyph[0].length || gy >= glyph.length) return false
    return glyph[gy][gx] === '1'
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      if (!inside(x, y)) {
        px[i + 3] = 0 // transparent corner
      } else if (ink(x, y)) {
        px[i] = 255; px[i + 1] = 255; px[i + 2] = 255; px[i + 3] = 255
      } else {
        px[i] = br; px[i + 1] = bg; px[i + 2] = bb; px[i + 3] = 255
      }
    }
  }
  return encodePng(size, size, px)
}

mkdirSync(join(root, 'public', 'images', 'vendors'), { recursive: true })
for (const v of VENDORS) {
  const out = join(root, 'public', 'images', 'vendors', v.file)
  writeFileSync(out, makeLogo(v.glyph, v.color))
  console.log('wrote', v.file, '-', v.name)
}

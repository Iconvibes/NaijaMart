#!/usr/bin/env node
// Generates PNG icons at various sizes from the SVG source.
// Usage: node scripts/generate-icons.js
// Requires: npm install sharp (already a dev dependency if not, install it)

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgPath = join(__dirname, '..', 'public', 'icons', 'icon.svg')
const outDir = join(__dirname, '..', 'public', 'icons')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

async function generate() {
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    console.error('sharp is not installed. Run: npm install sharp')
    process.exit(1)
  }

  const svg = readFileSync(svgPath)
  mkdirSync(outDir, { recursive: true })

  for (const size of sizes) {
    const outPath = join(outDir, `icon-${size}.png`)
    await sharp(svg).resize(size, size).png().toFile(outPath)
    console.log(`  ✓ icon-${size}.png`)
  }

  // Also generate the favicon
  const faviconPath = join(dirname(outDir), 'favicon.svg')
  writeFileSync(faviconPath, svg)
  console.log('  ✓ favicon.svg')
}

generate().catch((err) => {
  console.error(err)
  process.exit(1)
})

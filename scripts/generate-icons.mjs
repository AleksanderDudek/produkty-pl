// Rasterizes public/icons/mark.svg into the PNG icons the web manifest names.
// Run after changing the mark: `pnpm icons` (outputs are committed).
import { readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const OUT = new URL('../public/icons/', import.meta.url)
const master = await readFile(new URL('mark.svg', OUT))

/** Regular icons get rounded corners; maskable and Apple icons stay full-bleed squares. */
function roundedMask(size) {
  const r = Math.round(size * 0.22)
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="#fff"/></svg>`)
}

async function render(file, size, { rounded = false } = {}) {
  let buffer = await sharp(master, { density: 384 }).resize(size, size).png().toBuffer()
  if (rounded) buffer = await sharp(buffer).composite([{ input: roundedMask(size), blend: 'dest-in' }]).png().toBuffer()
  await sharp(buffer).png({ compressionLevel: 9 }).toFile(new URL(file, OUT).pathname)
  console.log('wrote', file)
}

await render('pwa-64x64.png', 64, { rounded: true })
await render('pwa-192x192.png', 192, { rounded: true })
await render('pwa-512x512.png', 512, { rounded: true })
await render('maskable-icon-512x512.png', 512)
await render('apple-touch-icon-180x180.png', 180)

// The favicon: the same mark with the rounded corners, as SVG.
const favicon = master
  .toString()
  .replace('<rect width="512" height="512" fill="#047857"/>', '<rect width="512" height="512" rx="112" fill="#047857"/>')
await writeFile(new URL('favicon.svg', OUT), favicon)
console.log('wrote favicon.svg')

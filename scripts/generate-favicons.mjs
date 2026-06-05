/**
 * Generates properly sized favicon files from the source logo.
 * Run with: node scripts/generate-favicons.mjs
 */

import sharp from 'sharp'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const src = path.join(root, 'public', 'logo.png') // prefer PNG for quality
const srcFallback = path.join(root, 'public', 'logo.jpg')

const source = existsSync(src) ? src : srcFallback

console.log(`Using source: ${source}`)

const tasks = [
  // app/icon.png — Next.js App Router favicon (192×192 meets Google's 48px multiple rule)
  {
    output: path.join(root, 'app', 'icon.png'),
    width: 192,
    height: 192,
    label: 'app/icon.png (192×192) — Next.js favicon / Google search',
  },
  // app/apple-icon.png — Apple touch icon
  {
    output: path.join(root, 'app', 'apple-icon.png'),
    width: 180,
    height: 180,
    label: 'app/apple-icon.png (180×180) — Apple touch icon',
  },
  // public/favicon-32.png — small favicon for browsers
  {
    output: path.join(root, 'public', 'favicon-32.png'),
    width: 32,
    height: 32,
    label: 'public/favicon-32.png (32×32)',
  },
  // public/favicon-192.png — PWA / Android
  {
    output: path.join(root, 'public', 'favicon-192.png'),
    width: 192,
    height: 192,
    label: 'public/favicon-192.png (192×192) — PWA/Android',
  },
]

for (const task of tasks) {
  await sharp(source)
    .resize(task.width, task.height, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }, // white background
    })
    .png({ quality: 100 })
    .toFile(task.output)

  console.log(`✅ Generated: ${task.label}`)
}

// Also generate favicon.ico (32×32) using the 32px PNG — sharp doesn't do .ico natively
// so we create a proper 32px PNG named favicon.ico — browsers accept PNG-in-.ico path
await sharp(source)
  .resize(32, 32, {
    fit: 'contain',
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  })
  .png()
  .toFile(path.join(root, 'public', 'favicon.ico'))

console.log('✅ Generated: public/favicon.ico (32×32)')
console.log('\n🎉 All favicons generated successfully!')
console.log('\nNext steps:')
console.log('  1. Delete the old app/icon.jpg and app/apple-icon.jpg')
console.log('  2. Deploy to production')
console.log('  3. Request Google re-crawl via Google Search Console → URL Inspection → Request Indexing')

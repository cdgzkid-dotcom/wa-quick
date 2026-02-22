// Generates all PWA icon sizes from an SVG design using sharp
const sharp = require('sharp')
const path  = require('path')

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Dark background with rounded corners -->
  <rect width="512" height="512" rx="115" fill="#0a0a0a"/>

  <!-- Glowing border — outer soft ring -->
  <rect x="4" y="4" width="504" height="504" rx="111"
    fill="none" stroke="#25D366" stroke-width="20" opacity="0.12"/>
  <!-- Glowing border — middle ring -->
  <rect x="7" y="7" width="498" height="498" rx="109"
    fill="none" stroke="#25D366" stroke-width="10" opacity="0.25"/>
  <!-- Glowing border — crisp ring -->
  <rect x="11" y="11" width="490" height="490" rx="106"
    fill="none" stroke="#25D366" stroke-width="3" opacity="0.9"/>

  <!-- Lightning bolt ⚡ centered at (258, 257) -->
  <path d="M296 65 L154 284 H249 L192 450 L363 227 H264 Z"
    fill="#25D366" filter="url(#glow)"/>
</svg>`

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const outDir = path.join(__dirname, '../public/icons')

;(async () => {
  const buf = Buffer.from(svgIcon)
  for (const s of sizes) {
    await sharp(buf)
      .resize(s, s)
      .png({ compressionLevel: 9 })
      .toFile(path.join(outDir, `icon-${s}x${s}.png`))
    console.log(`✓ icon-${s}x${s}.png`)
  }
  console.log('All icons generated.')
})().catch((e) => { console.error(e); process.exit(1) })

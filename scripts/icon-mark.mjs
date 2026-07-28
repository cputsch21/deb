// Font: Fraunces 144pt Medium (SIL OFL — © 2020 The Fraunces Project Authors,
// github.com/undercasetype/Fraunces); kept beside this script so the set
// regenerates from the real face, never a stand-in.
//
// The brand mark (July 28 ruling): "d." — lowercase d in real Fraunces (the
// display cut, Medium — her voice's own face), warm ink on warm paper, the
// silver dot as its period at baseline right of the bowl. Rendered from the
// actual font file at every raster size via fontkit (true outlines + metrics)
// + resvg (path rasterization) — no system-serif stand-ins, no downscaling.
//
// Run: node scripts/icon-mark.mjs   (regenerates public/ icons + splashes)
import { writeFileSync } from 'node:fs'
import * as fontkit from 'fontkit'
import { Resvg } from '@resvg/resvg-js'

const FONT = new URL('./Fraunces-144pt-Medium.ttf', import.meta.url).pathname
const font = fontkit.openSync(FONT)
const UPEM = font.unitsPerEm // 2000
const glyph = font.layout('d').glyphs[0]
const D_PATH = glyph.path.toSVG() // font units, y-up — placed via transform
const BB = glyph.bbox // ink: x 48..987, y -20..1478

const PAPER = '#FAF8F4'
const INK = '#191713'
const SILVER = ['#C8CCD4', '#8A8F98'] // light-scheme silver (the home dot)
const SILVER_DARK = ['#D8DCE2', '#9BA1AC']

/**
 * Compose the mark on a w×h canvas.
 * inkH    — the letter's ink height in px
 * dotK    — dot radius as a fraction of font size (the per-size cheat:
 *           small sizes grow the period so it never vanishes)
 * nudgeX  — optical horizontal nudge in px (+right) — eye over geometry
 */
function markSvg({ w, h, inkH, dotK = 0.085, gapK = 0.1, nudgeX = 0, dark = false, radius = 0 }) {
  const F = (inkH * UPEM) / (BB.maxY - BB.minY) // font size from ink height
  const s = F / UPEM
  const inkW = (BB.maxX - BB.minX) * s
  const r = dotK * F
  const gap = gapK * F
  const unitW = inkW + gap + 2 * r
  const unitX = (w - unitW) / 2 + nudgeX
  const baseline = h / 2 + ((BB.maxY + BB.minY) / 2) * s // ink vertically centered
  const penX = unitX - BB.minX * s
  const cx = unitX + inkW + gap + r
  const cy = baseline - r // the period sits on the baseline
  const [c1, c2] = dark ? SILVER_DARK : SILVER
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="dot" cx="35%" cy="32%" r="78%">
      <stop stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" rx="${radius}" fill="${dark ? INK : PAPER}"/>
  <g transform="translate(${penX.toFixed(3)}, ${baseline.toFixed(3)}) scale(${s.toFixed(6)}, ${(-s).toFixed(6)})">
    <path d="${D_PATH}" fill="${dark ? PAPER : INK}"/>
  </g>
  <circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="url(#dot)"/>
</svg>`
}

const rasterize = (svg) => new Resvg(svg).render().asPng()
const out = (name, buf) => {
  writeFileSync(new URL(`../public/${name}`, import.meta.url).pathname, buf)
  console.log(name, buf.length, 'bytes')
}

// ---- icons: letter generous but inside the maskable safe zone (central 80%).
// 192/180 raise dotK — the period must survive Spotlight (~29pt).
const ICONS = [
  { file: 'icon-512.png', S: 512, dotK: 0.085 },
  { file: 'icon-192.png', S: 192, dotK: 0.098 },
  { file: 'icon-180.png', S: 180, dotK: 0.098 },
]
for (const { file, S, dotK } of ICONS) {
  const opts = { w: S, h: S, inkH: 0.54 * S, dotK, nudgeX: -0.012 * S }
  out(file, rasterize(markSvg(opts)))
  out(file.replace('.png', '-dark.png'), rasterize(markSvg({ ...opts, dark: true })))
}

// ---- splashes: the mark small and centered, light on paper / dark on charcoal
const SPLASHES = [
  ['375x667@2x', 750, 1334],
  ['375x812@3x', 1125, 2436],
  ['390x844@3x', 1170, 2532],
  ['393x852@3x', 1179, 2556],
  ['428x926@3x', 1284, 2778],
  ['430x932@3x', 1290, 2796],
]
for (const [label, w, h] of SPLASHES) {
  const opts = { w, h, inkH: 0.09 * w, dotK: 0.09, nudgeX: -0.001 * w }
  out(`splash-${label}.png`, rasterize(markSvg(opts)))
  out(`splash-${label}-dark.png`, rasterize(markSvg({ ...opts, dark: true })))
}

// ---- favicon.svg: the same outlines embedded (no font needed at render
// time), light/dark via prefers-color-scheme, the period grown for 16px.
function faviconSvg() {
  const w = 64
  const F = (0.5 * 64 * UPEM) / (BB.maxY - BB.minY)
  const s = F / UPEM
  const inkW = (BB.maxX - BB.minX) * s
  const r = 0.14 * F // the small-size cheat: the period must survive 16px
  const gap = 0.1 * F
  const unitW = inkW + gap + 2 * r
  const unitX = (w - unitW) / 2 - 0.012 * w
  const baseline = w / 2 + ((BB.maxY + BB.minY) / 2) * s
  const penX = unitX - BB.minX * s
  const cx = unitX + inkW + gap + r
  const cy = baseline - r
  const g = (fill, cls) =>
    `<g class="${cls}" transform="translate(${penX.toFixed(3)}, ${baseline.toFixed(3)}) scale(${s.toFixed(6)}, ${(-s).toFixed(6)})"><path d="${D_PATH}" fill="${fill}"/></g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <!-- The brand mark (July 28 ruling): "d." - Fraunces d, silver-gradient period.
       Nothing else may serve as the logo. Outlines embedded; dark via media query. -->
  <defs>
    <radialGradient id="dot" cx="35%" cy="32%" r="78%">
      <stop stop-color="#C8CCD4"/>
      <stop offset="1" stop-color="#8A8F98"/>
    </radialGradient>
    <radialGradient id="dot-dark" cx="35%" cy="32%" r="78%">
      <stop stop-color="#D8DCE2"/>
      <stop offset="1" stop-color="#9BA1AC"/>
    </radialGradient>
  </defs>
  <style>
    .paper { fill: #FAF8F4; }
    .dark-only { display: none; }
    @media (prefers-color-scheme: dark) {
      .paper { fill: #191713; }
      .light-only { display: none; }
      .dark-only { display: inline; }
    }
  </style>
  <rect class="paper" width="64" height="64" rx="14"/>
  ${g('#191713', 'light-only')}
  ${g('#FAF8F4', 'dark-only')}
  <circle class="light-only" cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="url(#dot)"/>
  <circle class="dark-only" cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="url(#dot-dark)"/>
</svg>
`
}
writeFileSync(new URL('../public/favicon.svg', import.meta.url).pathname, faviconSvg())
console.log('favicon.svg written')

// ---- proof sheet for the eye: 512, a simulated 60, a simulated 29, dark 512
const proofDir = new URL('./', import.meta.url).pathname
const proof = (name, svg, width) =>
  writeFileSync(
    proofDir + name,
    new Resvg(svg, width ? { fitTo: { mode: 'width', value: width } } : undefined).render().asPng(),
  )
proof('proof-512.png', markSvg({ w: 512, h: 512, inkH: 0.54 * 512, dotK: 0.085, nudgeX: -0.012 * 512 }))
proof('proof-512-dark.png', markSvg({ w: 512, h: 512, inkH: 0.54 * 512, dotK: 0.085, nudgeX: -0.012 * 512, dark: true }))
proof('proof-60.png', markSvg({ w: 192, h: 192, inkH: 0.54 * 192, dotK: 0.098, nudgeX: -0.012 * 192 }), 60)
proof('proof-29.png', markSvg({ w: 180, h: 180, inkH: 0.54 * 180, dotK: 0.098, nudgeX: -0.012 * 180 }), 29)
console.log('proofs written')

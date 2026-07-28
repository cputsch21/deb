import { create } from 'zustand'

/**
 * Arc (M6 T1; rebuilt July 28 under the legibility ruling) — the app lit
 * by the real sun. The sky keyframes SURFACES only; every text token is
 * pushed, at every tick, to a fixed contrast floor against the current
 * surfaces — legibility by construction, not by inspection. Interpolation
 * runs in OKLCH so in-between states stay on the warm path the endpoints
 * define (naive RGB blending detours through gray-green — the 5:53am bug).
 *
 * The deep constraint (July 28 DECISIONS): against a background of
 * mid luminance (~0.10–0.32) NO text color can reach 7:1 — so the surface
 * path itself must step across that band, never linger inside it. The
 * gate below enforces that; the 350ms body transition smooths the step.
 *
 * Location: asked for once (cached); denied or unavailable falls back to a
 * quiet 6:30 / 19:30 approximation — the sky still breathes, just not to
 * the minute.
 */

type RGBA = [number, number, number, number]
type Palette = Record<string, RGBA>

/* ---------- the contract: fixed floors, enforced every tick ---------- */

/** Text tokens and the contrast each must hold against EVERY surface it
 *  can sit on (bg, the wells over it, the card). Ruled July 28. `dim`
 *  carries the eyebrow's 4.5 floor (it is the eyebrow token; placeholders
 *  ride the same token and land above their 3:1 floor for free). */
export const TEXT_TARGETS = {
  ink: 7,
  muted: 4.5,
  dim: 4.5,
  silver: 4.5, // the accent's text-bearing uses
  ok: 4.5,
  bad: 4.5,
} as const

/* ---------- the four keyframes (Warm Glass values) ----------
   DAY's text tokens are pre-clamped to the floors (so noon is byte-equal
   to the manual light theme in index.css — one system). Dawn and dusk are
   rebuilt on the warm axis (July 28 ruling 4): warm paper faintly first-
   lit / last-lit, close to the day palette with a low warm tint — the
   bloom carries the mood, never the text. */

const DAY: Palette = {
  bg: [250, 248, 244, 1],
  ink: [43, 40, 35, 1],
  muted: [109, 105, 97, 1],
  dim: [110, 105, 96, 1],
  fill: [43, 40, 35, 0.045],
  fill2: [43, 40, 35, 0.07],
  hair: [43, 40, 35, 0.06],
  bloom: [140, 133, 121, 0.09],
  silver: [101, 106, 113, 1],
  ok: [84, 112, 81, 1],
  bad: [168, 75, 58, 1],
  card: [255, 255, 255, 1],
}

const NIGHT: Palette = {
  bg: [25, 23, 19, 1],
  ink: [237, 233, 225, 1],
  muted: [181, 175, 164, 1],
  dim: [156, 149, 138, 1],
  fill: [255, 255, 255, 0.055],
  fill2: [255, 255, 255, 0.09],
  hair: [255, 255, 255, 0.07],
  bloom: [237, 233, 225, 0.05],
  silver: [185, 190, 199, 1],
  ok: [143, 174, 139, 1],
  bad: [217, 138, 119, 1],
  card: [34, 31, 26, 1],
}

/** Dawn: warm paper faintly first-lit — the rose lives in the bloom. */
const DAWN: Palette = {
  ...DAY,
  bg: [250, 245, 237, 1],
  ink: [46, 40, 35, 1],
  muted: [112, 104, 95, 1],
  dim: [113, 104, 94, 1],
  fill: [60, 40, 30, 0.05],
  fill2: [60, 40, 30, 0.075],
  hair: [60, 40, 30, 0.065],
  bloom: [214, 150, 120, 0.14],
  silver: [104, 106, 116, 1],
  card: [255, 253, 250, 1],
}

/** Dusk: warm paper last-lit — the amber lives in the bloom. */
const DUSK: Palette = {
  ...DAY,
  bg: [250, 244, 232, 1],
  ink: [44, 38, 32, 1],
  muted: [110, 101, 89, 1],
  dim: [111, 102, 90, 1],
  fill: [70, 50, 25, 0.05],
  fill2: [70, 50, 25, 0.075],
  hair: [70, 50, 25, 0.065],
  bloom: [216, 166, 90, 0.13],
  silver: [104, 104, 110, 1],
  card: [255, 252, 245, 1],
}

const KEYS = Object.keys(DAY)

/* ---------- color math: sRGB ↔ OKLab/OKLCH · WCAG contrast ---------- */

const srgbToLin = (c: number): number => {
  const x = c / 255
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}
const linToSrgb = (x: number): number => {
  const v = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
  return Math.min(255, Math.max(0, Math.round(v * 255)))
}

type Oklab = [number, number, number]

function rgbToOklab(c: RGBA): Oklab {
  const R = srgbToLin(c[0])
  const G = srgbToLin(c[1])
  const B = srgbToLin(c[2])
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

function oklabToRgb(c: Oklab, alpha: number): RGBA {
  const l = (c[0] + 0.3963377774 * c[1] + 0.2158037573 * c[2]) ** 3
  const m = (c[0] - 0.1055613458 * c[1] - 0.0638541728 * c[2]) ** 3
  const s = (c[0] - 0.0894841775 * c[1] - 1.291485548 * c[2]) ** 3
  return [
    linToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    alpha,
  ]
}

/** WCAG relative luminance of an opaque color. */
export function luminance(c: RGBA): number {
  return 0.2126 * srgbToLin(c[0]) + 0.7152 * srgbToLin(c[1]) + 0.0722 * srgbToLin(c[2])
}

/** WCAG contrast ratio between two opaque colors. */
export function contrastRatio(a: RGBA, b: RGBA): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** An alpha overlay composited onto an opaque surface (how the wells render). */
export function composite(fg: RGBA, bg: RGBA): RGBA {
  const a = fg[3]
  return [
    Math.round(a * fg[0] + (1 - a) * bg[0]),
    Math.round(a * fg[1] + (1 - a) * bg[1]),
    Math.round(a * fg[2] + (1 - a) * bg[2]),
    1,
  ]
}

/** Every opaque surface a text token can sit on, from a derived palette. */
export function surfacesOf(p: Palette): RGBA[] {
  return [p.bg, composite(p.fill, p.bg), composite(p.fill2, p.bg), p.card]
}

/* ---------- interpolation: OKLCH, hue on the shortest arc ---------- */

export function lerpColor(a: RGBA, b: RGBA, t: number): RGBA {
  const u = Math.max(0, Math.min(1, t))
  return [
    Math.round(a[0] + (b[0] - a[0]) * u),
    Math.round(a[1] + (b[1] - a[1]) * u),
    Math.round(a[2] + (b[2] - a[2]) * u),
    +(a[3] + (b[3] - a[3]) * u).toFixed(4),
  ]
}

function mixOklch(a: RGBA, b: RGBA, t: number): RGBA {
  const u = Math.max(0, Math.min(1, t))
  if (u <= 0) return a
  if (u >= 1) return b
  const [La, aa, ba] = rgbToOklab(a)
  const [Lb, ab, bb] = rgbToOklab(b)
  const Ca = Math.hypot(aa, ba)
  const Cb = Math.hypot(ab, bb)
  let Ha = Math.atan2(ba, aa)
  let Hb = Math.atan2(bb, ab)
  // near-achromatic endpoints have no meaningful hue — borrow the other's
  if (Ca < 1e-4) Ha = Hb
  if (Cb < 1e-4) Hb = Ha
  let dH = Hb - Ha
  if (dH > Math.PI) dH -= 2 * Math.PI
  if (dH < -Math.PI) dH += 2 * Math.PI
  const L = La + (Lb - La) * u
  const C = Ca + (Cb - Ca) * u
  const H = Ha + dH * u
  return oklabToRgb([L, C * Math.cos(H), C * Math.sin(H)], +(a[3] + (b[3] - a[3]) * u).toFixed(4))
}

function mix(a: Palette, b: Palette, t: number): Palette {
  const out: Palette = {}
  for (const k of KEYS) out[k] = mixOklch(a[k], b[k], t)
  return out
}

/* ---------- legibility by construction (July 28 ruling) ---------- */

/** Against a background of luminance inside (BAND_DARK, BAND_LIGHT), no
 *  text color at all can reach ink's 7:1 — the band edges are where white
 *  (resp. black) text hits exactly 7:1, with a little margin. Surfaces
 *  must step across, never linger inside. */
const BAND_DARK = 0.09
const BAND_LIGHT = 0.32
const BAND_MID = Math.sqrt(BAND_DARK * BAND_LIGHT)

/** Move a color's OKLab lightness (hue kept) until its WCAG luminance
 *  satisfies `test`; binary search toward `pole` (0 = black, 1 = white). */
function adjustL(c: RGBA, pole: 0 | 1, test: (candidate: RGBA) => boolean): RGBA {
  if (test(c)) return c
  const lab = rgbToOklab(c)
  let lo = lab[0]
  let hi: number = pole
  let best: RGBA = oklabToRgb([pole, 0, 0], c[3]) // the pole always satisfies, or nothing does
  for (let i = 0; i < 28; i++) {
    const m = (lo + hi) / 2
    // chroma tapers toward the pole so extremes stay clean
    const k = Math.abs(pole - m) / Math.max(1e-6, Math.abs(pole - lab[0]))
    const cand = oklabToRgb([m, lab[1] * k, lab[2] * k], c[3])
    if (test(cand)) {
      best = cand
      hi = m
    } else {
      lo = m
    }
  }
  return best
}

/** Keep the background — INCLUDING the wells composited over it, which
 *  brighten or darken it — out of the forbidden band, on the given side. */
function gateBg(p: Palette, side: 'dark' | 'light'): RGBA {
  const clear = (bg: RGBA): boolean => {
    const lums = [
      luminance(bg),
      luminance(composite(p.fill, bg)),
      luminance(composite(p.fill2, bg)),
    ]
    return side === 'dark'
      ? Math.max(...lums) <= BAND_DARK
      : Math.min(...lums) >= BAND_LIGHT
  }
  if (clear(p.bg)) return p.bg
  return adjustL(p.bg, side === 'dark' ? 0 : 1, clear)
}

/** The card carries no wells — a single-luminance gate. */
function gateCard(c: RGBA, side: 'dark' | 'light'): RGBA {
  const lum = luminance(c)
  if (lum <= BAND_DARK || lum >= BAND_LIGHT) return c
  return side === 'dark'
    ? adjustL(c, 0, (x) => luminance(x) <= BAND_DARK)
    : adjustL(c, 1, (x) => luminance(x) >= BAND_LIGHT)
}

/**
 * The invariant, applied: gate bg (and card, in lockstep — a split would
 * demand two opposite inks at once), then push every text token to its
 * floor against the worst surface it can sit on. Tokens already at their
 * floor pass through byte-identical — the approved day and night looks
 * do not move.
 */
export function derive(p: Palette): Palette {
  const side: 'dark' | 'light' = luminance(p.bg) < BAND_MID ? 'dark' : 'light'
  const bg = gateBg(p, side)
  const card = gateCard(p.card, side)
  const out: Palette = { ...p, bg, card }
  const surfaces = surfacesOf(out)
  const worst = (c: RGBA) => Math.min(...surfaces.map((s) => contrastRatio(c, s)))
  const pole: 0 | 1 = side === 'light' ? 0 : 1 // text runs opposite the surfaces
  for (const [token, target] of Object.entries(TEXT_TARGETS)) {
    out[token] = adjustL(p[token], pole, (cand) => worst(cand) >= target)
  }
  return out
}

/**
 * The sky's schedule, in minutes relative to sunrise (sr) and sunset (ss):
 *   …·sr−40  night · sr−40‥+20 night→dawn · +20‥+90 dawn→day ·
 *   day ‥ ss−90 · ss−90‥−15 day→dusk · ss−15‥+45 dusk→night · night…
 * Returns the DERIVED palette (floors enforced) and how far toward night
 * we are (for scheme bits).
 */
export function paletteAt(
  now: number,
  sunrise: number,
  sunset: number,
): { palette: Palette; nightness: number } {
  const min = (ms: number) => ms / 60000
  const t = min(now)
  const sr = min(sunrise)
  const ss = min(sunset)

  if (t < sr - 40) return { palette: derive(NIGHT), nightness: 1 }
  if (t < sr + 20) {
    const u = (t - (sr - 40)) / 60
    return { palette: derive(mix(NIGHT, DAWN, u)), nightness: 1 - u * 0.6 }
  }
  if (t < sr + 90) {
    const u = (t - (sr + 20)) / 70
    return { palette: derive(mix(DAWN, DAY, u)), nightness: 0.4 - u * 0.4 }
  }
  if (t < ss - 90) return { palette: derive(DAY), nightness: 0 }
  if (t < ss - 15) {
    const u = (t - (ss - 90)) / 75
    return { palette: derive(mix(DAY, DUSK, u)), nightness: u * 0.35 }
  }
  if (t < ss + 45) {
    const u = (t - (ss - 15)) / 60
    return { palette: derive(mix(DUSK, NIGHT, u)), nightness: 0.35 + u * 0.65 }
  }
  return { palette: derive(NIGHT), nightness: 1 }
}

/* ---------- the sun (NOAA-style, ±minutes is plenty) ---------- */

export function sunTimes(
  date: Date,
  lat: number,
  lng: number,
): { sunrise: Date; sunset: Date } | null {
  const rad = Math.PI / 180
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const day = Math.floor((date.getTime() - start) / 864e5)
  const gamma = ((2 * Math.PI) / 365) * (day - 1 + (date.getUTCHours() - 12) / 24)
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma))
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma)
  const cosHa =
    Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) -
    Math.tan(lat * rad) * Math.tan(decl)
  if (cosHa < -1 || cosHa > 1) return null // polar day or night
  const ha = Math.acos(cosHa) / rad
  const base = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return {
    sunrise: new Date(base + (720 - 4 * (lng + ha) - eqtime) * 60000),
    sunset: new Date(base + (720 - 4 * (lng - ha) - eqtime) * 60000),
  }
}

/* ---------- location: once, cached, honest fallback ---------- */

const GEO_KEY = 'deb-geo'

type Geo = { lat: number; lng: number } | 'denied'

function storedGeo(): Geo | null {
  try {
    const raw = localStorage.getItem(GEO_KEY)
    if (!raw) return null
    if (raw === 'denied') return 'denied'
    const v = JSON.parse(raw) as { lat?: number; lng?: number }
    if (typeof v.lat === 'number' && typeof v.lng === 'number') return { lat: v.lat, lng: v.lng }
    return null
  } catch {
    return null
  }
}

function requestGeo(onFound: () => void): void {
  if (!('geolocation' in navigator)) {
    localStorage.setItem(GEO_KEY, 'denied')
    return
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      localStorage.setItem(
        GEO_KEY,
        JSON.stringify({ lat: +pos.coords.latitude.toFixed(3), lng: +pos.coords.longitude.toFixed(3) }),
      )
      onFound()
    },
    () => localStorage.setItem(GEO_KEY, 'denied'),
    { timeout: 10000, maximumAge: 86_400_000 },
  )
}

/** Today's sun, local — real when we know where we are, honest approximation otherwise. */
function todaysSun(): { sunrise: number; sunset: number } {
  const geo = storedGeo()
  if (geo && geo !== 'denied') {
    const t = sunTimes(new Date(), geo.lat, geo.lng)
    if (t) return { sunrise: t.sunrise.getTime(), sunset: t.sunset.getTime() }
  }
  // the approximation: 6:30 / 19:30 local — the sky still breathes
  const d = new Date()
  const at = (h: number, m: number) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime()
  return { sunrise: at(6, 30), sunset: at(19, 30) }
}

/** The margin's sun line (↑ 6:14  ↓ 8:37) — set by the engine each tick. */
export const useSunTimes = create<{ sunrise: number | null; sunset: number | null }>(() => ({
  sunrise: null,
  sunset: null,
}))

/* ---------- the engine ---------- */

const css = (c: RGBA) =>
  c[3] >= 1 ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3]})`

let timer: ReturnType<typeof setInterval> | null = null

function tick(): void {
  const { sunrise, sunset } = todaysSun()
  useSunTimes.setState({ sunrise, sunset })
  const { palette, nightness } = paletteAt(Date.now(), sunrise, sunset)
  const root = document.documentElement
  for (const k of KEYS) root.style.setProperty(`--t-${k}`, css(palette[k]))
  // scheme-dependent bits (card shadows etc.) follow the darker half
  root.classList.toggle('dark', nightness > 0.5)
  root.classList.remove('light')
}

export function startArc(): void {
  if (timer) return
  if (!storedGeo()) requestGeo(tick) // ask once; fallback covers denial
  tick()
  timer = setInterval(tick, 60_000)
}

export function stopArc(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  const root = document.documentElement
  for (const k of KEYS) root.style.removeProperty(`--t-${k}`)
  root.classList.remove('dark')
  useSunTimes.setState({ sunrise: null, sunset: null })
}

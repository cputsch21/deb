import { create } from 'zustand'

/**
 * Arc (M6 T1) — the app lit by the real sun. From local sunrise/sunset the
 * palette breathes through the day: dawn warmth → full paper at midday →
 * amber at dusk → the charcoal night. Continuous interpolation between
 * keyframe palettes, never a switch; Arc moves the Warm Glass token VALUES
 * (inline on :root, winning over the stylesheet), never the system.
 *
 * Location: asked for once (cached); denied or unavailable falls back to a
 * quiet 6:30 / 19:30 approximation — the sky still breathes, just not to
 * the minute.
 */

type RGBA = [number, number, number, number]
type Palette = Record<string, RGBA>

/* ---------- the four keyframes (Warm Glass values) ---------- */

const DAY: Palette = {
  bg: [250, 248, 244, 1],
  ink: [43, 40, 35, 1],
  muted: [110, 106, 97, 1],
  dim: [140, 133, 121, 1],
  fill: [43, 40, 35, 0.045],
  fill2: [43, 40, 35, 0.07],
  hair: [43, 40, 35, 0.06],
  bloom: [140, 133, 121, 0.09],
  silver: [126, 131, 140, 1],
  ok: [95, 127, 92, 1],
  bad: [168, 75, 58, 1],
  purple: [138, 110, 168, 1],
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
  purple: [169, 143, 201, 1],
  card: [34, 31, 26, 1],
}

/** Dawn: the light set warmed toward rose, bloom flushed. */
const DAWN: Palette = {
  ...DAY,
  bg: [249, 242, 236, 1],
  ink: [46, 39, 35, 1],
  muted: [113, 103, 94, 1],
  dim: [146, 133, 122, 1],
  fill: [60, 40, 30, 0.05],
  fill2: [60, 40, 30, 0.075],
  hair: [60, 40, 30, 0.065],
  bloom: [214, 150, 120, 0.14],
  silver: [138, 131, 144, 1],
  card: [255, 253, 251, 1],
}

/** Dusk: the light set sunk toward amber, bloom low and gold. */
const DUSK: Palette = {
  ...DAY,
  bg: [248, 241, 227, 1],
  ink: [44, 38, 32, 1],
  muted: [111, 101, 87, 1],
  dim: [143, 130, 113, 1],
  fill: [70, 50, 25, 0.05],
  fill2: [70, 50, 25, 0.075],
  hair: [70, 50, 25, 0.065],
  bloom: [216, 166, 90, 0.13],
  silver: [141, 133, 120, 1],
  card: [255, 252, 245, 1],
}

const KEYS = Object.keys(DAY)

/* ---------- interpolation ---------- */

export function lerpColor(a: RGBA, b: RGBA, t: number): RGBA {
  const u = Math.max(0, Math.min(1, t))
  return [
    Math.round(a[0] + (b[0] - a[0]) * u),
    Math.round(a[1] + (b[1] - a[1]) * u),
    Math.round(a[2] + (b[2] - a[2]) * u),
    +(a[3] + (b[3] - a[3]) * u).toFixed(4),
  ]
}

const css = (c: RGBA) =>
  c[3] >= 1 ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3]})`

function mix(a: Palette, b: Palette, t: number): Palette {
  const out: Palette = {}
  for (const k of KEYS) out[k] = lerpColor(a[k], b[k], t)
  return out
}

/**
 * The sky's schedule, in minutes relative to sunrise (sr) and sunset (ss):
 *   …·sr−40  night · sr−40‥+20 night→dawn · +20‥+90 dawn→day ·
 *   day ‥ ss−90 · ss−90‥−15 day→dusk · ss−15‥+45 dusk→night · night…
 * Returns the palette and how far toward night we are (for scheme bits).
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

  if (t < sr - 40) return { palette: NIGHT, nightness: 1 }
  if (t < sr + 20) {
    const u = (t - (sr - 40)) / 60
    return { palette: mix(NIGHT, DAWN, u), nightness: 1 - u * 0.6 }
  }
  if (t < sr + 90) {
    const u = (t - (sr + 20)) / 70
    return { palette: mix(DAWN, DAY, u), nightness: 0.4 - u * 0.4 }
  }
  if (t < ss - 90) return { palette: DAY, nightness: 0 }
  if (t < ss - 15) {
    const u = (t - (ss - 90)) / 75
    return { palette: mix(DAY, DUSK, u), nightness: u * 0.35 }
  }
  if (t < ss + 45) {
    const u = (t - (ss - 15)) / 60
    return { palette: mix(DUSK, NIGHT, u), nightness: 0.35 + u * 0.65 }
  }
  return { palette: NIGHT, nightness: 1 }
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

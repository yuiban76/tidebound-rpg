// Every attack effect. An effect is drawn from left to right; the fight tray turns it to fly from the attacker's name to
// the target's, so it only has to know how to travel right and what happens when it lands.
import type { Effect } from '../../packages/world/strikes.ts'

export type G = {
  c: CanvasRenderingContext2D, W: number, H: number, ground: number
  /** Where the attacker's name and the front of the blow are, and the middle of the target's name. */
  sx: number, sy: number, ax: number, ay: number, tx: number, ty: number
  power: number, seed: number, now: number
}
export type Fx = {
  /** Melee blows carry the attacker's name along; ranged ones are fired from where it stands. */
  ranged?: boolean
  /** core, main and deep colour. */
  hue: [string, string, string]
  charge?: (g: G, p: number) => void
  travel?: (g: G, p: number) => void
  burst?: (g: G, q: number) => void
  /** Extra weight of the blow (screen shake, hang time). */
  heavy?: number
  /** Fills the tray with its colour as it lands. */
  flood?: string
}

const TAU = Math.PI * 2
export const rnd = (seed: number, i: number) => { const x = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453; return x - Math.floor(x) }
const ease = (t: number) => 1 - (1 - t) ** 3
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const fade = (q: number) => Math.max(0, 1 - q)

function light(c: CanvasRenderingContext2D, alpha: number, draw: () => void) {
  c.save()
  c.globalCompositeOperation = 'lighter'
  c.globalAlpha = Math.max(0, Math.min(1, alpha))
  draw()
  c.restore()
}
function soft(c: CanvasRenderingContext2D, alpha: number, draw: () => void) {
  c.save()
  c.globalAlpha = Math.max(0, Math.min(1, alpha))
  draw()
  c.restore()
}
export function glow(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1) {
  if (r <= 0) return
  light(c, alpha, () => {
    const paint = c.createRadialGradient(x, y, 0, x, y, r)
    paint.addColorStop(0, color)
    paint.addColorStop(1, 'transparent')
    c.fillStyle = paint
    c.fillRect(x - r, y - r, r * 2, r * 2)
  })
}
export function ring(c: CanvasRenderingContext2D, x: number, y: number, r: number, width: number, color: string, alpha = 1, squash = 1) {
  if (r <= 0 || width <= 0) return
  soft(c, alpha, () => { c.beginPath(); c.ellipse(x, y, r, r * squash, 0, 0, TAU); c.lineWidth = width; c.strokeStyle = color; c.stroke() })
}
/** The jagged white star of a manga impact. */
export function star(c: CanvasRenderingContext2D, x: number, y: number, r: number, spikes: number, color: string, seed: number, edge?: string) {
  c.beginPath()
  for (let i = 0; i < spikes * 2; i++) {
    const a = i / (spikes * 2) * TAU
    const d = i % 2 ? r * .38 : r * (.7 + rnd(seed, i) * .6)
    c.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d)
  }
  c.closePath()
  c.fillStyle = color
  c.fill()
  if (edge) { c.lineWidth = 3; c.strokeStyle = edge; c.lineJoin = 'round'; c.stroke() }
}
export function sparks(g: G, q: number, x: number, y: number, colors: string[], count: number, reach: number, size = 4, gravity = 60) {
  const { c } = g
  for (let i = 0; i < count; i++) {
    const a = rnd(g.seed, i) * TAU
    const far = reach * (.35 + rnd(g.seed, i + 99) * .65) * ease(Math.min(1, q * 1.15))
    const [px, py] = [x + Math.cos(a) * far, y + Math.sin(a) * far + gravity * q * q]
    c.globalAlpha = fade(q)
    c.fillStyle = colors[i % colors.length]
    const s = size * (.5 + rnd(g.seed, i + 7)) * fade(q * .7)
    c.beginPath()
    c.moveTo(px + Math.cos(a) * s * 3, py + Math.sin(a) * s * 3)
    c.lineTo(px + Math.cos(a + 2) * s, py + Math.sin(a + 2) * s)
    c.lineTo(px + Math.cos(a - 2) * s, py + Math.sin(a - 2) * s)
    c.fill()
  }
  c.globalAlpha = 1
}
/** A blade's path: a crescent that is thick in the middle. */
export function crescent(c: CanvasRenderingContext2D, x: number, y: number, r: number, from: number, to: number, width: number, core: string, rim: string, alpha = 1) {
  soft(c, alpha, () => {
    for (const [w, color] of [[width * 1.7, rim], [width, core]] as const) {
      c.beginPath()
      c.arc(x, y, r, from, to)
      c.arc(x - Math.cos((from + to) / 2) * w, y - Math.sin((from + to) / 2) * w, r, to, from, true)
      c.closePath()
      c.fillStyle = color
      c.fill()
    }
  })
}
/** A straight cut through (x, y), widest in the middle. */
export function cut(c: CanvasRenderingContext2D, x: number, y: number, angle: number, length: number, width: number, core: string, rim: string, alpha = 1) {
  soft(c, alpha, () => {
    c.translate(x, y)
    c.rotate(angle)
    for (const [w, color] of [[width * 2.1, rim], [width, core]] as const) {
      c.beginPath()
      c.moveTo(-length, 0)
      c.quadraticCurveTo(0, -w, length, 0)
      c.quadraticCurveTo(0, w, -length, 0)
      c.fillStyle = color
      c.fill()
    }
  })
}
export function bolt(g: G, x1: number, y1: number, x2: number, y2: number, width: number, core: string, rim: string, seed: number, jag = 26) {
  const { c } = g
  const n = 9
  const points = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    const off = i === 0 || i === n ? 0 : (rnd(seed + Math.floor(g.now / 45), i) - .5) * jag * 2
    const [dx, dy] = [x2 - x1, y2 - y1]
    const len = Math.hypot(dx, dy) || 1
    return [x1 + dx * t - dy / len * off, y1 + dy * t + dx / len * off]
  })
  c.save()
  c.lineJoin = 'round'
  c.lineCap = 'round'
  for (const [w, color, a] of [[width * 3.4, rim, .35], [width * 1.7, rim, .9], [width * .75, core, 1]] as const) {
    c.globalAlpha = a
    c.beginPath()
    points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y))
    c.lineWidth = w
    c.strokeStyle = color
    c.stroke()
  }
  c.restore()
}
function puffs(g: G, q: number, x: number, y: number, color: string, count: number, reach: number, size: number, rise = 40) {
  for (let i = 0; i < count; i++) {
    const a = rnd(g.seed, i + 31) * TAU
    const far = reach * rnd(g.seed, i + 61) * ease(q)
    soft(g.c, fade(q) * .8, () => {
      g.c.fillStyle = color
      g.c.beginPath()
      g.c.arc(x + Math.cos(a) * far, y + Math.sin(a) * far * .7 - rise * q, size * (.5 + rnd(g.seed, i + 3) * .8) * (.5 + q), 0, TAU)
      g.c.fill()
    })
  }
}
function flame(g: G, x: number, y: number, r: number, hue: [string, string, string], alpha = 1) {
  const flick = (i: number) => 1 + Math.sin(g.now / 40 + i * 2.1) * .14
  soft(g.c, alpha, () => {
    ;[[1.25, hue[2]], [1, hue[1]], [.55, hue[0]]].forEach(([k, color], i) => {
      const s = r * (k as number) * flick(i)
      g.c.beginPath()
      g.c.moveTo(x - s * .7, y + s * .4)
      g.c.quadraticCurveTo(x - s * .9, y - s * .5, x - s * .2, y - s * .8)
      g.c.quadraticCurveTo(x - s * .1, y - s * 1.1, x + s * .1, y - s * 1.5)
      g.c.quadraticCurveTo(x + s * .25, y - s * .9, x + s * .5, y - s * .9)
      g.c.quadraticCurveTo(x + s * .95, y - s * .4, x + s * .7, y + s * .4)
      g.c.quadraticCurveTo(x, y + s * .95, x - s * .7, y + s * .4)
      g.c.fillStyle = color as string
      g.c.fill()
    })
  })
}
function blast(g: G, q: number, x: number, y: number, r: number, hue: [string, string, string]) {
  const { c } = g
  const k = ease(Math.min(1, q * 1.5))
  glow(c, x, y, r * 1.9 * k, hue[1], fade(q))
  for (let i = 0; i < 26; i++) {
    const a = rnd(g.seed, i) * TAU
    const far = r * k * rnd(g.seed, i + 50)
    const size = r * .5 * (.45 + rnd(g.seed, i + 20) * .75) * (q < .2 ? q * 5 : fade((q - .2) / .8) * .85 + .15)
    const [px, py] = [x + Math.cos(a) * far, y + Math.sin(a) * far - q * 30]
    // Hot in the middle of each billow, dark smoke at its edge as it cools.
    soft(c, fade(q * .95), () => {
      const paint = c.createRadialGradient(px, py - size * .2, size * .1, px, py, size)
      paint.addColorStop(0, q > .45 && i % 3 ? hue[1] : hue[0])
      paint.addColorStop(.55, i % 3 ? hue[1] : hue[2])
      paint.addColorStop(1, 'transparent')
      c.fillStyle = paint
      c.beginPath(); c.arc(px, py, size, 0, TAU); c.fill()
    })
  }
  ring(c, x, y, r * 1.5 * k, 10 * fade(q), hue[0], fade(q))
}
/** Cracks in the air or the ground, running out from a point. */
function cracks(g: G, q: number, x: number, y: number, reach: number, color: string, width: number, count = 9, spread = TAU, from = 0) {
  const { c } = g
  soft(c, fade(q * q), () => {
    c.strokeStyle = color
    c.lineCap = 'round'
    for (let i = 0; i < count; i++) {
      let a = from + i / count * spread + (rnd(g.seed, i) - .5) * .5
      let [px, py] = [x, y]
      const steps = 5
      const grow = Math.min(1, q * 4)
      for (let s = 0; s < steps; s++) {
        if (s / steps > grow) break
        a += (rnd(g.seed + i, s) - .5) * 1.1
        const len = reach / steps * (.6 + rnd(g.seed + i * 3, s) * .8)
        c.lineWidth = Math.max(.8, width * (1 - s / steps))
        c.beginPath(); c.moveTo(px, py)
        px += Math.cos(a) * len; py += Math.sin(a) * len
        c.lineTo(px, py); c.stroke()
      }
    }
  })
}
function fistShape(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, edge = '#14181c') {
  c.save()
  c.translate(x, y)
  c.lineWidth = Math.max(2, r * .09)
  c.lineJoin = 'round'
  c.strokeStyle = edge
  c.fillStyle = color
  c.beginPath(); c.roundRect(-r, -r * .82, r * 1.75, r * 1.62, r * .38); c.fill(); c.stroke()
  for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(r * .42, -r * .82 + i * r * .405, r * .62, r * .41, r * .17); c.fill(); c.stroke() }
  c.beginPath(); c.roundRect(-r * .25, r * .22, r * 1.02, r * .48, r * .2); c.fill(); c.stroke()
  c.restore()
}
function along(g: G, p: number, lift = 0): [number, number] {
  return [lerp(g.ax, g.tx, p), lerp(g.ay, g.ty, p) - Math.sin(p * Math.PI) * lift]
}
/** Streaks that trail behind something moving right. */
function trail(g: G, x: number, y: number, length: number, width: number, color: string, alpha = .8, lines = 5) {
  soft(g.c, alpha, () => {
    for (let i = 0; i < lines; i++) {
      const dy = (rnd(g.seed + 5, i) - .5) * width
      const len = length * (.5 + rnd(g.seed + 9, i) * .6)
      const paint = g.c.createLinearGradient(x - len, 0, x, 0)
      paint.addColorStop(0, 'transparent')
      paint.addColorStop(1, color)
      g.c.fillStyle = paint
      g.c.beginPath(); g.c.moveTo(x - len, y + dy); g.c.lineTo(x, y + dy - width * .09); g.c.lineTo(x, y + dy + width * .09); g.c.fill()
    }
  })
}
function spikesUp(g: G, q: number, from: number, to: number, count: number, height: number, colors: [string, string], lean = .25) {
  const { c } = g
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const grown = Math.max(0, Math.min(1, (q - t * .5) * 5))
    if (!grown) continue
    const x = lerp(from, to, t) + (rnd(g.seed, i) - .5) * 14
    const h = height * (.5 + t * .7) * (.7 + rnd(g.seed, i + 11) * .5) * grown
    const w = 11 + rnd(g.seed, i + 5) * 12
    c.fillStyle = colors[0]
    c.beginPath(); c.moveTo(x - w, g.ground + 6); c.lineTo(x + h * lean, g.ground - h); c.lineTo(x + w, g.ground + 6); c.fill()
    c.fillStyle = colors[1]
    c.beginPath(); c.moveTo(x - w * .1, g.ground + 6); c.lineTo(x + h * lean, g.ground - h); c.lineTo(x + w, g.ground + 6); c.fill()
  }
}
function jaws(g: G, x: number, y: number, r: number, open: number, color: string, tooth: string) {
  const { c } = g
  for (const side of [-1, 1]) {
    c.save()
    c.translate(x, y)
    c.scale(1, side)
    c.rotate(-open)
    c.fillStyle = color
    c.strokeStyle = '#14181c'
    c.lineWidth = 3
    c.beginPath(); c.moveTo(-r * 1.1, 0); c.quadraticCurveTo(-r * .6, -r * 1.05, r * .7, -r * .42); c.lineTo(r * .75, 0); c.closePath(); c.fill(); c.stroke()
    c.fillStyle = tooth
    for (let i = 0; i < 6; i++) { const tx = -r * .5 + i * r * .23; c.beginPath(); c.moveTo(tx, 0); c.lineTo(tx + r * .1, r * .26); c.lineTo(tx + r * .21, 0); c.fill() }
    c.restore()
  }
}
function claws(g: G, q: number, color: string, rim: string, count: number, size: number) {
  const reveal = Math.min(1, q * 5)
  for (let i = 0; i < count; i++) {
    const off = (i - (count - 1) / 2) * size * .24
    cut(g.c, g.tx + off - 8, g.ty + off * .25, 1.05, size * reveal, size * .075, color, rim, fade(Math.max(0, q - .35) / .65))
  }
}
function pellets(g: G, p: number, count: number, spread: number, draw: (x: number, y: number, i: number, t: number) => void, stagger = .5) {
  for (let i = 0; i < count; i++) {
    const t = (p * (1 + stagger) - i / count * stagger)
    if (t <= 0 || t >= 1.02) continue
    const off = (rnd(g.seed, i + 40) - .5) * spread
    draw(lerp(g.ax, g.tx, t), lerp(g.ay, g.ty, t) + off * Math.sin(Math.min(1, t) * Math.PI * .9), i, t)
  }
}
function petals(g: G, q: number, x: number, y: number, colors: string[], count: number, reach: number) {
  for (let i = 0; i < count; i++) {
    const a = rnd(g.seed, i) * TAU + q * 2
    const far = reach * (.25 + rnd(g.seed, i + 5) * .75) * ease(q)
    soft(g.c, fade(q), () => {
      g.c.translate(x + Math.cos(a) * far, y + Math.sin(a) * far * .8 + q * 26)
      g.c.rotate(a * 2 + q * 5)
      g.c.fillStyle = colors[i % colors.length]
      g.c.beginPath(); g.c.ellipse(0, 0, 8, 4.2, 0, 0, TAU); g.c.fill()
    })
  }
}
function heart(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.beginPath()
  c.moveTo(x, y + r * .9)
  c.bezierCurveTo(x - r * 1.5, y - r * .1, x - r * .8, y - r * 1.2, x, y - r * .4)
  c.bezierCurveTo(x + r * .8, y - r * 1.2, x + r * 1.5, y - r * .1, x, y + r * .9)
}
function pawShape(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.beginPath(); c.ellipse(x, y + r * .25, r * .62, r * .5, 0, 0, TAU); c.fill()
  for (const a of [-2.35, -1.85, -1.3, -.8]) { c.beginPath(); c.ellipse(x + Math.cos(a) * r * .85, y + Math.sin(a) * r * .75 + r * .12, r * .22, r * .28, a + 1.57, 0, TAU); c.fill() }
}

const fx: Record<Effect, Fx> = {
  // --- Bodies and weapons ---------------------------------------------------------------------------------------
  punch: { hue: ['#ffffff', '#ffd27a', '#e2702f'], travel: (g, p) => trail(g, g.ax, g.ay, 120 * p, 40, '#ffffff', .7) },
  bigPunch: { heavy: 1, hue: ['#ffffff', '#ffd27a', '#b5482a'],
    charge: (g, p) => { for (let i = 0; i < 3; i++) ring(g.c, g.ax, g.ay, 90 * (1 - (p + i / 3) % 1), 4, '#ffe2a0', p) },
    travel: (g, p) => { const [x, y] = along(g, p); fistShape(g.c, x, y, 40 + 24 * p, '#f0c9a0'); trail(g, x - 30, y, 190, 90, '#ffffff', .8, 9) },
    burst: (g, q) => { cracks(g, q, g.tx, g.ground + 4, 150, '#2a1c14', 7, 8, Math.PI, 0); ring(g.c, g.tx, g.ty, 230 * ease(q), 16 * fade(q), '#ffffff', fade(q)); puffs(g, q, g.tx, g.ground, '#cbb89a', 14, 150, 20) } },
  kick: { hue: ['#ffffff', '#9fd4ff', '#3f78c0'],
    travel: (g, p) => crescent(g.c, g.ax - 10, g.ay, 70, -1.9 + p, .2 + p * .8, 16, '#ffffff', '#9fd4ff', .85),
    burst: (g, q) => crescent(g.c, g.tx - 40, g.ty, 74, -1.4, 1.2, 20 * fade(q), '#ffffff', '#9fd4ff', fade(q)) },
  fireKick: { heavy: .35, hue: ['#fff4c2', '#ff9a2e', '#c22d12'],
    charge: (g, p) => { for (let i = 0; i < 4; i++) flame(g, g.sx + 10 + i * 7, g.ground - 12 - i * 5, 12 + 12 * p, ['#fff4c2', '#ff9a2e', '#d9361a'], p) },
    travel: (g, p) => { crescent(g.c, g.ax - 20, g.ay, 88, -2.2 + p, .3 + p, 30, '#fff0b0', '#ff7a1e', .95); for (let i = 0; i < 6; i++) flame(g, g.ax - 40 + i * 22 * p, g.ay - 30 + i * 12, 18, ['#fff4c2', '#ff9a2e', '#d9361a'], .8) },
    burst: (g, q) => { crescent(g.c, g.tx - 50, g.ty, 92, -1.6, 1.4, 34 * fade(q), '#fff0b0', '#ff5a1e', fade(q)); blast(g, q, g.tx, g.ty, 70, ['#fff4c2', '#ff9a2e', '#c22d12']) } },
  gum: { ranged: true, heavy: .5, hue: ['#ffffff', '#ffcf9a', '#d2402f'],
    // The arm flies back, then stretches all the way across.
    charge: (g, p) => { const back = 170 * ease(p); g.c.lineCap = 'round'; for (const [w, color] of [[17, '#14181c'], [12, '#f0c9a0']] as const) { g.c.beginPath(); g.c.moveTo(g.sx, g.sy); g.c.quadraticCurveTo(g.sx - back * .5, g.sy - 26, g.sx - back, g.sy - 6); g.c.lineWidth = w; g.c.strokeStyle = color; g.c.stroke() } fistShape(g.c, g.sx - back, g.sy - 6, 17, '#f0c9a0') },
    travel: (g, p) => stretch(g, ease(p), 1), burst: (g, q) => { if (q < .55) stretch(g, 1 - Math.max(0, q - .2) * 2.2, 1 - q * .4); ring(g.c, g.tx, g.ty, 190 * ease(q), 12 * fade(q), '#ffffff', fade(q)) } },
  slash: { hue: ['#ffffff', '#bfe6ff', '#4f8fd0'],
    travel: (g, p) => crescent(g.c, g.ax - 30, g.ay, 84, -2.3 + p * 1.4, -1.2 + p * 2, 15, '#ffffff', '#bfe6ff', .9),
    burst: (g, q) => cut(g.c, g.tx, g.ty, .75, 150 * Math.min(1, q * 6), 11 * fade(q), '#ffffff', '#8fd0ff', fade(q * q)) },
  dual: { hue: ['#ffffff', '#ffd9a8', '#d0603f'],
    travel: (g, p) => { for (const k of [0, 1]) crescent(g.c, g.ax - 30, g.ay + k * 20 - 10, 76, -2.2 + p * 1.5 + k * .5, -1.2 + p * 2 + k * .5, 12, '#ffffff', '#ffc98a', .85) },
    burst: (g, q) => { for (const k of [0, 1]) { const r = Math.max(0, q - k * .12); cut(g.c, g.tx, g.ty, k ? -.75 : .75, 140 * Math.min(1, r * 7), 9 * fade(q), '#ffffff', '#ffb066', fade(q * q)) } } },
  threeSword: { heavy: .5, hue: ['#ffffff', '#9ff0b4', '#2f8a4f'],
    charge: (g, p) => { for (let i = 0; i < 3; i++) glow(g.c, g.ax + i * 14, g.ay - 30 + i * 18, 40 * p, '#6fe08f', .8) },
    travel: (g, p) => { for (let k = 0; k < 3; k++) crescent(g.c, g.ax - 40, g.ay + (k - 1) * 26, 98, -2.4 + p * 1.7, -1.1 + p * 2.2, 14, '#ffffff', '#6fe08f', .9) },
    burst: (g, q) => { for (let k = 0; k < 3; k++) { const r = Math.max(0, q - k * .07); cut(g.c, g.tx, g.ty + (k - 1) * 8, -.55 + k * .55, 210 * Math.min(1, r * 7), 10 * fade(q), '#ffffff', '#46d074', fade(q * q)) } petals(g, q, g.tx, g.ty, ['#bff5c9', '#ffffff'], 16, 130) } },
  blackBlade: { ranged: true, heavy: 1, hue: ['#e9ffe6', '#4fae5a', '#0a1a12'], flood: '#08140d',
    travel: (g, p) => { const [x] = along(g, ease(p)); crescent(g.c, x - 120, g.ty - 10, 175, -1.1, 1.1, 34, '#0c1a12', '#63e07a', 1); trail(g, x - 10, g.ty, 260, 260, '#9ff0a8', .6, 12) },
    burst: (g, q) => { cut(g.c, g.tx, g.ty, -1.35, 330 * Math.min(1, q * 7), 22 * fade(q), '#0c1a12', '#7bf090', fade(q * q)); cracks(g, q, g.tx, g.ground + 4, 210, '#0c1a12', 8, 7, Math.PI, 0) } },
  axe: { heavy: .8, hue: ['#ffffff', '#ffd27a', '#8a4a22'],
    travel: (g, p) => crescent(g.c, g.ax - 20, g.ay + 10, 110, -2.6 + p * 1.8, -1.4 + p * 2.3, 26, '#ffffff', '#ffd9a0', .9),
    burst: (g, q) => { cut(g.c, g.tx, g.ty, 1.4, 180 * Math.min(1, q * 7), 18 * fade(q), '#ffffff', '#ffc46b', fade(q * q)); cracks(g, q, g.tx, g.ground + 4, 170, '#2a1c14', 8, 8, Math.PI, 0); puffs(g, q, g.tx, g.ground, '#b9a27f', 12, 130, 18) } },
  thrust: { hue: ['#ffffff', '#c9d8ff', '#5a6fd0'],
    travel: (g, p) => { trail(g, g.ax + 90 * p, g.ay, 220, 34, '#ffffff', .9, 7) },
    burst: (g, q) => { cut(g.c, g.tx, g.ty, 0, 240 * Math.min(1, q * 8), 9 * fade(q), '#ffffff', '#9fb6ff', fade(q)); for (let i = 1; i < 4; i++) ring(g.c, g.tx + i * 30, g.ty, 14 + 40 * q * i * .5, 4 * fade(q), '#dfe7ff', fade(q), 1.6) } },
  claw: { hue: ['#ffffff', '#ffd0a0', '#c2402a'], travel: (g, p) => trail(g, g.ax, g.ay, 150 * p, 60, '#fff3df', .8, 6), burst: (g, q) => claws(g, q, '#ffffff', '#ff8a4a', 4, 110) },
  finger: { hue: ['#ffffff', '#ffe08a', '#6a4a1a'],
    travel: (g, p) => trail(g, g.ax + 40 * p, g.ay, 280 * p, 12, '#ffffff', 1, 3),
    burst: (g, q) => { cut(g.c, g.tx + 40, g.ty, 0, 200 * Math.min(1, q * 9), 4 * fade(q), '#ffffff', '#ffd75a', fade(q)); for (let i = 0; i < 4; i++) ring(g.c, g.tx - 10 + i * 26, g.ty, 10 + 26 * ease(q) * (1 + i * .4), 4 * fade(q), '#fff0b8', fade(q), 1.7) } },
  airSlash: { ranged: true, hue: ['#ffffff', '#bfe9ff', '#3f86b0'],
    travel: (g, p) => { const [x, y] = along(g, p); crescent(g.c, x - 70, y, 96, -1, 1, 16, '#ffffff', '#a9e4ff', .95); trail(g, x, y, 170, 130, '#d9f3ff', .55, 8) },
    burst: (g, q) => { cut(g.c, g.tx, g.ty, 1.2, 190 * Math.min(1, q * 7), 8 * fade(q), '#ffffff', '#8fdcff', fade(q * q)); for (let i = 0; i < 5; i++) crescent(g.c, g.tx, g.ty, 40 + i * 20 + q * 60, i + q * 3, i + .9 + q * 3, 5, '#ffffff', '#a9e4ff', fade(q) * .8) } },
  bite: { heavy: .6, hue: ['#ffffff', '#c9f0df', '#2f6a5f'],
    travel: (g, p) => jaws(g, lerp(g.ax, g.tx, p), g.ty, 74, .95 - p * .25, '#3f7d74', '#fffdf2'),
    burst: (g, q) => { if (q < .6) soft(g.c, fade(q / .6), () => jaws(g, g.tx, g.ty, 84, Math.max(.02, .5 - q * 4), '#3f7d74', '#fffdf2')); droplets(g, q, '#bfe9f5', 18) } },
  hammer: { heavy: .7, hue: ['#ffffff', '#e6dcc4', '#6a5a44'],
    travel: (g, p) => { const a = -2.2 + p * 2.6; const [x, y] = [g.ax - 10 + Math.cos(a) * 70, g.ay + Math.sin(a) * 60]; g.c.fillStyle = '#5a6067'; g.c.strokeStyle = '#14181c'; g.c.lineWidth = 3; g.c.beginPath(); g.c.arc(x, y, 22, 0, TAU); g.c.fill(); g.c.stroke(); trail(g, x, y, 120, 60, '#ffffff', .6, 6) },
    burst: (g, q) => { cracks(g, q, g.tx, g.ground + 4, 140, '#2a1c14', 7, 8, Math.PI, 0); puffs(g, q, g.tx, g.ground, '#b9a98a', 12, 120, 17); ring(g.c, g.tx, g.ty, 150 * ease(q), 10 * fade(q), '#fff6df', fade(q)) } },
  whip: { ranged: true, hue: ['#ffffff', '#d9b8ff', '#6a3fa0'],
    travel: (g, p) => { const [x, y] = along(g, p, 40); g.c.lineCap = 'round'; for (const [w, color] of [[10, '#14181c'], [6, '#8a5fb5']] as const) { g.c.beginPath(); g.c.moveTo(g.ax, g.ay); g.c.bezierCurveTo(g.ax + 60, g.ay - 110 * (1 - p), x - 60, y + 90 * (1 - p), x, y); g.c.lineWidth = w; g.c.strokeStyle = color; g.c.stroke() } },
    burst: (g, q) => { cut(g.c, g.tx, g.ty, -.4, 120 * Math.min(1, q * 8), 7 * fade(q), '#ffffff', '#c79aff', fade(q)) } },
  gun: { ranged: true, hue: ['#fff8d8', '#ffc23f', '#7a3a12'],
    travel: (g, p) => { if (p < .35) star(g.c, g.ax + 34, g.ay, 34 * (1 - p), 8, '#fff3b0', g.seed); const [x, y] = along(g, ease(p)); trail(g, x, y, 240, 8, '#fff3b0', 1, 2); glow(g.c, x, y, 18, '#ffe08a') },
    burst: (g, q) => puffs(g, q, g.ax + 34, g.ay, '#d9d4c8', 6, 40, 9) },
  rapid: { ranged: true, hue: ['#fff8d8', '#ffb03f', '#7a3a12'],
    travel: (g, p) => { if (Math.floor(g.now / 40) % 2) star(g.c, g.ax + 34, g.ay, 36, 8, '#fff3b0', g.seed + Math.floor(g.now / 40)); pellets(g, p, 10, 70, (x, y) => { trail(g, x, y, 90, 5, '#fff3b0', 1, 2) }, .7) },
    burst: (g, q) => { for (let i = 0; i < 6; i++) { const r = q * 1.6 - i * .12; if (r > 0 && r < 1) star(g.c, g.tx + (rnd(g.seed, i) - .5) * 80, g.ty + (rnd(g.seed, i + 9) - .5) * 100, 30 * fade(r), 8, '#fff3b0', g.seed + i) } puffs(g, q, g.ax + 34, g.ay, '#d9d4c8', 8, 50, 10) } },
  cannon: { ranged: true, heavy: .9, hue: ['#fff4c2', '#ff8a2e', '#5a2a1a'],
    travel: (g, p) => { if (p < .4) { star(g.c, g.ax + 30, g.ay, 60 * (1 - p), 10, '#ffe08a', g.seed); puffs(g, p, g.ax + 30, g.ay, '#b9b2a6', 8, 60, 14) } const [x, y] = along(g, p, 50); trail(g, x, y, 130, 30, '#ffd9a0', .7, 5); g.c.fillStyle = '#1d2226'; g.c.beginPath(); g.c.arc(x, y, 17, 0, TAU); g.c.fill(); glow(g.c, x - 6, y - 6, 16, '#ffffff', .5) },
    burst: (g, q) => { blast(g, q, g.tx, g.ty, 105, ['#fff4c2', '#ff8a2e', '#6a3a2a']); puffs(g, q, g.tx, g.ty, '#4a4440', 12, 130, 26, 70) } },
  daggers: { ranged: true, hue: ['#ffffff', '#dfe9f2', '#5a6a78'],
    travel: (g, p) => pellets(g, p, 6, 120, (x, y, i) => { g.c.save(); g.c.translate(x, y); g.c.rotate(Math.sin(i) * .1); g.c.fillStyle = '#eef3f6'; g.c.strokeStyle = '#14181c'; g.c.lineWidth = 2; g.c.beginPath(); g.c.moveTo(-18, -4); g.c.lineTo(12, -4); g.c.lineTo(24, 0); g.c.lineTo(12, 4); g.c.lineTo(-18, 4); g.c.closePath(); g.c.fill(); g.c.stroke(); g.c.fillStyle = '#b5413a'; g.c.fillRect(-30, -4, 12, 8); g.c.restore(); trail(g, x - 20, y, 60, 6, '#ffffff', .7, 2) }, .5),
    burst: (g, q) => { for (let i = 0; i < 4; i++) cut(g.c, g.tx + (rnd(g.seed, i) - .5) * 50, g.ty + (rnd(g.seed, i + 4) - .5) * 80, .2 - i * .2, 60 * Math.min(1, q * 8), 4 * fade(q), '#ffffff', '#cfdbe4', fade(q)) } },
  arrow: { ranged: true, hue: ['#ffffff', '#b9e08a', '#4a7a2f'],
    travel: (g, p) => { const [x, y] = along(g, ease(p), 12); trail(g, x, y, 190, 10, '#eaffd0', .9, 3); g.c.strokeStyle = '#6a4a2a'; g.c.lineWidth = 4; g.c.beginPath(); g.c.moveTo(x - 58, y); g.c.lineTo(x, y); g.c.stroke(); g.c.fillStyle = '#5a9a3f'; g.c.beginPath(); g.c.moveTo(x - 4, y - 9); g.c.lineTo(x + 20, y); g.c.lineTo(x - 4, y + 9); g.c.fill() },
    burst: (g, q) => cut(g.c, g.tx + 20, g.ty, 0, 110 * Math.min(1, q * 8), 5 * fade(q), '#ffffff', '#b9e08a', fade(q)) },
  sling: { ranged: true, hue: ['#fff8d8', '#ffd23f', '#d2402f'],
    travel: (g, p) => { const [x, y] = along(g, p, 26); trail(g, x, y, 110, 14, '#ffe9a0', .9, 4); star(g.c, x, y, 14, 5, '#ffd23f', g.seed, '#8a3b12') },
    burst: (g, q) => { blast(g, q, g.tx, g.ty, 62, ['#fff8d8', '#ffd23f', '#d2402f']); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; star(g.c, g.tx + Math.cos(a) * 120 * ease(q), g.ty + Math.sin(a) * 100 * ease(q), 12 * fade(q), 5, '#ffd23f', i) } } },
  rocketFist: { ranged: true, heavy: .6, hue: ['#ffffff', '#7fd4f0', '#d24b3e'],
    travel: (g, p) => { const [x, y] = along(g, ease(p)); g.c.setLineDash([9, 6]); g.c.lineWidth = 7; g.c.strokeStyle = '#8f99a0'; g.c.beginPath(); g.c.moveTo(g.sx, g.sy); g.c.lineTo(x - 20, y); g.c.stroke(); g.c.setLineDash([]); fistShape(g.c, x, y, 28, '#b9c3c9'); for (let i = 0; i < 3; i++) flame(g, x - 44 - i * 14, y + (i - 1) * 9, 13, ['#ffffff', '#7fd4f0', '#2f7fb0'], .8) },
    burst: (g, q) => { blast(g, q, g.tx, g.ty, 66, ['#ffffff', '#7fd4f0', '#d24b3e']); sparks(g, q, g.tx, g.ty, ['#ffe08a', '#ffffff'], 14, 160) } },
  hypno: { ranged: true, hue: ['#ffffff', '#ffd0f0', '#a03f8a'],
    travel: (g, p) => { const [x, y] = along(g, p); for (let i = 0; i < 4; i++) ring(g.c, x, y, 14 + i * 13, 4, i % 2 ? '#ffffff' : '#d05fb0', .9) },
    burst: (g, q) => { for (let i = 0; i < 6; i++) ring(g.c, g.tx, g.ty - 30, (i * 18 + q * 70) % 110, 4, i % 2 ? '#ffffff' : '#d05fb0', fade(q)) } },
  electro: { hue: ['#ffffff', '#fff07a', '#e0a01a'],
    charge: (g, p) => { for (let i = 0; i < 4; i++) bolt(g, g.ax, g.ay, g.ax + Math.cos(i * 1.6 + g.now / 90) * 46 * p, g.ay + Math.sin(i * 1.6 + g.now / 90) * 46 * p, 2.4, '#ffffff', '#ffe14a', g.seed + i, 9) },
    travel: (g, p) => { for (let i = 0; i < 3; i++) bolt(g, g.ax - 60, g.ay + (i - 1) * 22, g.ax + 60 * p, g.ay, 2.6, '#ffffff', '#ffe14a', g.seed + i, 14) },
    burst: (g, q) => { for (let i = 0; i < 7; i++) if (q < .7) bolt(g, g.tx, g.ty, g.tx + Math.cos(i * .9) * 130, g.ty + Math.sin(i * .9) * 110, 3 * fade(q), '#ffffff', '#ffe14a', g.seed + i, 20); glow(g.c, g.tx, g.ty, 150 * fade(q), '#ffe14a', .8) } },
  water: { heavy: .5, hue: ['#ffffff', '#8fdcff', '#1f6fb5'],
    charge: (g, p) => { for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + g.now / 200; const r = 80 * (1 - p) + 14; g.c.fillStyle = '#8fdcff'; g.c.beginPath(); g.c.arc(g.ax + Math.cos(a) * r, g.ay + Math.sin(a) * r * .7, 4.5, 0, TAU); g.c.fill() } },
    travel: (g, p) => { const [x, y] = along(g, p); soft(g.c, .85, () => { g.c.fillStyle = '#58b8f0'; g.c.beginPath(); g.c.moveTo(x + 46, y); g.c.quadraticCurveTo(x - 10, y - 46, x - 90, y - 12); g.c.lineTo(x - 64, y); g.c.lineTo(x - 90, y + 14); g.c.quadraticCurveTo(x - 10, y + 46, x + 46, y); g.c.fill(); g.c.beginPath(); g.c.moveTo(x - 26, y - 28); g.c.lineTo(x - 44, y - 58); g.c.lineTo(x - 4, y - 32); g.c.fill() }); g.c.fillStyle = '#ffffff'; g.c.beginPath(); g.c.arc(x + 14, y - 10, 4, 0, TAU); g.c.fill() },
    burst: (g, q) => { for (let i = 0; i < 3; i++) ring(g.c, g.tx, g.ty, (90 + i * 60) * ease(q), 9 * fade(q), i % 2 ? '#ffffff' : '#58b8f0', fade(q)); droplets(g, q, '#8fdcff', 34) } },
  weather: { ranged: true, heavy: .5, hue: ['#ffffff', '#fff07a', '#4a6a9a'],
    charge: (g, p) => { for (let i = 0; i < 8; i++) soft(g.c, p, () => { g.c.fillStyle = i % 2 ? '#5f6b7d' : '#46505f'; g.c.beginPath(); g.c.arc(g.tx - 66 + i * 19, 52 + Math.sin(i * 2) * 9, 22 + (i % 3) * 5, 0, TAU); g.c.fill() }) },
    travel: (g, p) => { fxCloud(g, 1); if (p > .55) bolt(g, g.tx, 70, g.tx, g.ty, 5, '#ffffff', '#ffe14a', g.seed, 26) },
    burst: (g, q) => { fxCloud(g, fade(q)); if (q < .45) for (let i = 0; i < 3; i++) bolt(g, g.tx + (i - 1) * 26, 70, g.tx, g.ty, 7 * fade(q), '#ffffff', '#ffe14a', g.seed + i, 30); glow(g.c, g.tx, g.ty, 170 * fade(q), '#fff07a', .9) } },
  petalBlade: { hue: ['#ffffff', '#ffb0cf', '#d0407a'],
    travel: (g, p) => { crescent(g.c, g.ax - 30, g.ay, 90, -2.3 + p * 1.6, -1.1 + p * 2.1, 14, '#ffffff', '#ff9ac4', .9); petals(g, p * .6, g.ax, g.ay, ['#ffb0cf', '#ff7fae', '#ffffff'], 14, 130) },
    burst: (g, q) => { for (const a of [.6, -.6]) cut(g.c, g.tx, g.ty, a, 150 * Math.min(1, q * 7), 8 * fade(q), '#ffffff', '#ff7fae', fade(q * q)); petals(g, q, g.tx, g.ty, ['#ffb0cf', '#ff7fae', '#e0366f', '#ffffff'], 46, 210) } },
  buddha: { ranged: true, heavy: 1.2, flood: '#fff0b0', hue: ['#ffffff', '#ffe27a', '#b5851f'],
    charge: (g, p) => { glow(g.c, g.sx, g.sy, 190 * p, '#ffd75a', .9); for (let i = 0; i < 12; i++) cut(g.c, g.sx, g.sy, i / 12 * Math.PI, 150 * p, 3, '#fff6cf', '#ffd75a', p * .7) },
    travel: (g, p) => { const [x, y] = along(g, ease(p)); for (let i = 0; i < 4; i++) ring(g.c, x - i * 26, y, 52 + i * 16, 10, i % 2 ? '#ffffff' : '#ffd75a', .9 - i * .15, 1.5) },
    burst: (g, q) => { for (let i = 0; i < 4; i++) ring(g.c, g.tx, g.ty, (80 + i * 70) * ease(q), 14 * fade(q), i % 2 ? '#ffffff' : '#ffd75a', fade(q)); blast(g, q, g.tx, g.ty, 90, ['#ffffff', '#ffe27a', '#d0a02f']) } },
  tackle: { heavy: .7, hue: ['#ffffff', '#e6dcc4', '#7a6a4f'], travel: (g, p) => { trail(g, g.ax, g.ay, 220 * p, 110, '#ffffff', .8, 10); puffs(g, p, g.ax - 40, g.ground, '#cbb89a', 8, 70, 14) },
    burst: (g, q) => { ring(g.c, g.tx, g.ty, 200 * ease(q), 14 * fade(q), '#ffffff', fade(q)); puffs(g, q, g.tx, g.ground, '#cbb89a', 14, 150, 18) } },

  // --- Devil fruits ---------------------------------------------------------------------------------------------
  smoke: { ranged: true, hue: ['#ffffff', '#e4e9ec', '#98a4ab'],
    charge: (g, p) => puffs(g, p * .7, g.sx, g.sy, '#e9eef0', 14, 90, 20),
    travel: (g, p) => { for (let k = 0; k < 3; k++) { const t = Math.max(0, p - k * .1); for (let i = 0; i < 12; i++) { const s = t - i * .035; if (s <= 0) continue; const [x, y] = along(g, s); soft(g.c, .85, () => { g.c.fillStyle = i % 2 ? '#f2f5f6' : '#d3dbe0'; g.c.beginPath(); g.c.arc(x, y + Math.sin(s * 9 + k * 2) * (24 + k * 16), 22 - i * 1.2, 0, TAU); g.c.fill() }) } const [hx, hy] = along(g, t); if (t > 0) fistShape(g.c, hx, hy + Math.sin(t * 9 + k * 2) * (24 + k * 16), 20, '#f7f9fa', '#8a969d') } },
    burst: (g, q) => { for (let i = 0; i < 4; i++) ring(g.c, g.tx, g.ty - 50 + i * 30, 62 - q * 10, 15 * fade(q), i % 2 ? '#ffffff' : '#cfd8dd', fade(q), .35); puffs(g, q, g.tx, g.ty, '#eef2f4', 22, 130, 26) } },
  sand: { ranged: true, heavy: .5, hue: ['#fff4d0', '#e6bd6a', '#8a5f22'], flood: '#d9b46a',
    charge: (g, p) => { for (let i = 0; i < 26; i++) { const a = i / 26 * TAU * 2 + g.now / 130; const r = (20 + i * 3) * p; g.c.fillStyle = i % 2 ? '#e6bd6a' : '#c2923f'; g.c.fillRect(g.ax + Math.cos(a) * r, g.ay + Math.sin(a) * r * .6, 4, 4) } },
    // A blade of sand tears along the ground.
    travel: (g, p) => { const x = lerp(g.ax, g.tx, ease(p)); g.c.fillStyle = '#e6bd6a'; g.c.beginPath(); g.c.moveTo(g.ax, g.ground + 6); g.c.lineTo(x, g.ground - 130 * p); g.c.quadraticCurveTo(x + 46, g.ground - 70, x + 30, g.ground + 6); g.c.fill(); g.c.fillStyle = '#f6e2ad'; g.c.beginPath(); g.c.moveTo(lerp(g.ax, x, .3), g.ground + 6); g.c.lineTo(x, g.ground - 130 * p); g.c.lineTo(x + 8, g.ground + 6); g.c.fill(); grains(g, p, x, g.ground - 40, 26) },
    burst: (g, q) => { for (let i = 0; i < 5; i++) ring(g.c, g.tx, g.ground - i * 46 * ease(q), 34 + i * 16, 10 * fade(q), i % 2 ? '#f6e2ad' : '#c2923f', fade(q), .3); grains(g, q, g.tx, g.ty, 60) } },
  lightning: { ranged: true, heavy: .8, flood: '#e9f4ff', hue: ['#ffffff', '#9fd8ff', '#3f6fe0'],
    charge: (g, p) => { for (let i = 0; i < 6; i++) bolt(g, g.sx, g.sy, g.sx + Math.cos(i * 1.05 + g.now / 120) * 90 * p, g.sy + Math.sin(i * 1.05 + g.now / 120) * 90 * p, 2.5, '#ffffff', '#7fc4ff', g.seed + i, 16); glow(g.c, g.sx, g.sy, 120 * p, '#7fc4ff', .6) },
    travel: (g, p) => { if (p > .35) for (let i = 0; i < 2 + Math.round(g.power); i++) bolt(g, g.tx + (i - 1.5) * 70, -10, g.tx + (i - 1.5) * 14, g.ty, 5, '#ffffff', '#6fb6ff', g.seed + i, 34) },
    burst: (g, q) => { if (q < .5) for (let i = 0; i < 4 + Math.round(g.power * 2); i++) bolt(g, g.tx + (rnd(g.seed, i) - .5) * 260, -10, g.tx + (rnd(g.seed, i + 5) - .5) * 70, g.ground, 7 * fade(q * 1.6), '#ffffff', '#6fb6ff', g.seed + i, 40); glow(g.c, g.tx, g.ty, 260 * fade(q), '#9fd8ff', 1); for (let i = 0; i < 6; i++) if (q < .8) bolt(g, g.tx, g.ground, g.tx + (i - 2.5) * 70, g.ground + 6, 2.5 * fade(q), '#ffffff', '#6fb6ff', g.seed + 20 + i, 12) } },
  fire: { ranged: true, heavy: .8, flood: '#ffb04a', hue: ['#fff6c9', '#ff9a2e', '#d22a12'],
    charge: (g, p) => { for (let i = 0; i < 5; i++) flame(g, g.ax + (rnd(g.seed, i) - .5) * 30, g.ay + (rnd(g.seed, i + 4) - .5) * 30, 12 + 22 * p, ['#fff6c9', '#ff9a2e', '#d22a12'], p); glow(g.c, g.ax, g.ay, 110 * p, '#ff8a2e', .7) },
    // A fist of fire the size of a man.
    travel: (g, p) => { const [x, y] = along(g, ease(p)); const r = (26 + 30 * p) * (.75 + g.power * .25); for (let i = 0; i < 9; i++) flame(g, x - 20 - i * 22, y + (rnd(g.seed, i) - .5) * r, r * (1 - i * .07), ['#fff0b0', '#ff8a1e', '#c81f0c'], .85); glow(g.c, x, y, r * 2.4, '#ff7a1e', .8); fistShape(g.c, x + 10, y, r * .85, '#ffd35a', '#e0531a') },
    burst: (g, q) => { blast(g, q, g.tx, g.ty, 90 * (.7 + g.power * .3), ['#fff6c9', '#ff9a2e', '#c22d12']); for (let i = 0; i < 12; i++) flame(g, g.tx + (rnd(g.seed, i) - .5) * 190, g.ground - 8 - (40 + 150 * rnd(g.seed, i + 7)) * q, (18 + 40 * rnd(g.seed, i + 3)) * fade(q * .9), ['#fff0b0', '#ff8a1e', '#c81f0c'], fade(q)) } },
  magma: { ranged: true, heavy: 1.1, flood: '#ff5a1e', hue: ['#ffe08a', '#ff5a1e', '#2a0f0a'],
    charge: (g, p) => { glow(g.c, g.ax, g.ay, 120 * p, '#ff4a12', .8); for (let i = 0; i < 8; i++) drip(g, g.ax + (rnd(g.seed, i) - .5) * 50, g.ay + p * 60 * rnd(g.seed, i + 3), 7, '#ff6a1e') },
    travel: (g, p) => { const [x, y] = along(g, ease(p), 30); const r = 44 + 26 * p; glow(g.c, x, y, r * 2.2, '#ff4a12', .9); fistShape(g.c, x, y, r, '#3a1a12', '#1a0a06'); soft(g.c, 1, () => { g.c.strokeStyle = '#ffb03f'; g.c.lineWidth = 5; for (let i = 0; i < 5; i++) { g.c.beginPath(); g.c.moveTo(x - r * .8 + i * r * .4, y - r * .7); g.c.lineTo(x - r * .6 + i * r * .34, y); g.c.lineTo(x - r * .9 + i * r * .42, y + r * .7); g.c.stroke() } }); for (let i = 0; i < 8; i++) drip(g, x - 30 - i * 20, y + (rnd(g.seed, i) - .5) * 70, 9, i % 2 ? '#ff6a1e' : '#3a1a12') },
    burst: (g, q) => { blast(g, q, g.tx, g.ty, 110, ['#ffe08a', '#ff5a1e', '#2a0f0a']); for (let i = 0; i < 12; i++) { const a = -Math.PI * rnd(g.seed, i); drip(g, g.tx + Math.cos(a) * 170 * ease(q), g.ty + Math.sin(a) * 150 * ease(q) + 190 * q * q, 12 * fade(q), i % 2 ? '#ff6a1e' : '#3a1a12') } puffs(g, q, g.tx, g.ty, '#3a302c', 14, 120, 28, 90) } },
  ice: { ranged: true, heavy: .7, flood: '#dff4ff', hue: ['#ffffff', '#a9e4ff', '#4f9fd0'],
    charge: (g, p) => { for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; snow(g, g.sx + Math.cos(a + g.now / 400) * 90 * (1 - p * .6), g.sy + Math.sin(a + g.now / 400) * 70 * (1 - p * .6), 6, p) } },
    travel: (g, p) => spikesUp(g, p, g.ax, g.tx - 20, 11, 70, ['#8fd4f5', '#e9f8ff']),
    // The target is sealed in a block that shatters.
    burst: (g, q) => { spikesUp(g, 1, g.ax, g.tx - 20, 11, 70 * fade(q * .6), ['#8fd4f5', '#e9f8ff']); const k = Math.min(1, q * 5); if (q < .55) soft(g.c, .78, () => { g.c.fillStyle = '#bfeaff'; g.c.strokeStyle = '#ffffff'; g.c.lineWidth = 4; g.c.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU - .3; const r = (80 + rnd(g.seed, i) * 46) * k; g.c.lineTo(g.tx + Math.cos(a) * r * .8, g.ty + Math.sin(a) * r * 1.15) } g.c.closePath(); g.c.fill(); g.c.stroke() }); else sparks(g, (q - .55) / .45, g.tx, g.ty, ['#ffffff', '#bfeaff', '#7fcdf0'], 34, 210, 9); for (let i = 0; i < 10; i++) snow(g, g.tx + (rnd(g.seed, i) - .5) * 260, g.ty + (rnd(g.seed, i + 8) - .5) * 200 + q * 50, 7, fade(q)) } },
  light: { ranged: true, heavy: .6, flood: '#fff8c9', hue: ['#ffffff', '#fff07a', '#e0b01a'],
    charge: (g, p) => { glow(g.c, g.ax, g.ay, 90 * p, '#fff07a', 1); for (let i = 0; i < 8; i++) cut(g.c, g.ax, g.ay, i / 8 * Math.PI + g.now / 500, 70 * p, 3, '#ffffff', '#ffe14a', p) },
    travel: (g, p) => { pellets(g, p, 9 + Math.round(g.power * 5), 190, (x, y) => { glow(g.c, x, y, 30, '#ffe14a', .9); trail(g, x, y, 120, 9, '#fffbe0', 1, 2) }, .75) },
    burst: (g, q) => { for (let i = 0; i < 8; i++) { const r = q * 1.7 - i * .1; if (r > 0 && r < 1) { glow(g.c, g.tx + (rnd(g.seed, i) - .5) * 120, g.ty + (rnd(g.seed, i + 9) - .5) * 140, 80 * fade(r), '#ffe14a', 1); star(g.c, g.tx + (rnd(g.seed, i) - .5) * 120, g.ty + (rnd(g.seed, i + 9) - .5) * 140, 34 * fade(r), 4, '#ffffff', g.seed + i) } } for (let i = 0; i < 6; i++) cut(g.c, g.tx, g.ty, i / 6 * Math.PI, 240 * ease(q), 5 * fade(q), '#ffffff', '#ffe14a', fade(q)) } },
  dark: { ranged: true, heavy: 1, flood: '#0c0714', hue: ['#c9a0ff', '#3a1a5a', '#08040e'],
    charge: (g, p) => darkness(g, g.sx, g.ground - 40, 120 * p, 1),
    travel: (g, p) => { darkness(g, lerp(g.ax, g.tx, p), lerp(g.ground - 30, g.ty, p), 60 + 60 * p, 1); for (let i = 0; i < 12; i++) { const a = rnd(g.seed, i) * TAU; const r = 190 * (1 - (p + rnd(g.seed, i + 4)) % 1); cut(g.c, g.tx + Math.cos(a) * r, g.ty + Math.sin(a) * r, a, 26, 3, '#c9a0ff', '#3a1a5a', .8) } },
    burst: (g, q) => { darkness(g, g.tx, g.ty, 150 * (q < .3 ? q / .3 : fade((q - .3) / .7)), 1); for (let i = 0; i < 4; i++) ring(g.c, g.tx, g.ty, Math.max(1, 210 * (1 - (q * 1.4 + i / 4) % 1)), 5, '#8a4fd0', fade(q)) } },
  beast: { heavy: .5, hue: ['#ffffff', '#ffd9a8', '#7a4a22'],
    charge: (g, p) => { ring(g.c, g.sx, g.sy, 70 * p, 8, '#ffcf9a', 1 - p * .4); glow(g.c, g.sx, g.sy, 100 * p, '#e0a060', .5) },
    travel: (g, p) => { const [x, y] = along(g, p); fistShape(g.c, x, y, 30 + 12 * p, '#9a6a42'); trail(g, x - 20, y, 150, 70, '#ffffff', .8, 8) },
    burst: (g, q) => { claws(g, q, '#ffffff', '#e0a060', 3, 90); ring(g.c, g.tx, g.ty, 170 * ease(q), 12 * fade(q), '#ffffff', fade(q)) } },
  phoenix: { heavy: .6, flood: '#8fe0ff', hue: ['#fff6b0', '#4fc4ff', '#1f5fd0'],
    charge: (g, p) => wings(g, g.sx, g.sy, 120 * p, p), travel: (g, p) => { wings(g, g.ax - 30, g.ay, 130, 1); for (let i = 0; i < 6; i++) flame(g, g.ax - 30 - i * 24, g.ay + (rnd(g.seed, i) - .5) * 60, 24, ['#fff6b0', '#4fc4ff', '#1f5fd0'], .8) },
    burst: (g, q) => { blast(g, q, g.tx, g.ty, 80, ['#fff6b0', '#4fc4ff', '#1f5fd0']); claws(g, q, '#fff6b0', '#4fc4ff', 3, 110); petals(g, q, g.tx, g.ty, ['#4fc4ff', '#fff6b0'], 20, 190) } },
  dino: { heavy: 1, hue: ['#ffffff', '#b9d08a', '#4a6a2f'],
    travel: (g, p) => { jaws(g, lerp(g.ax, g.tx, p), g.ty, 96, 1 - p * .2, '#6a8a4a', '#fffdf2'); puffs(g, p, g.ax - 30, g.ground, '#b9a98a', 8, 80, 16) },
    burst: (g, q) => { if (q < .6) soft(g.c, fade(q / .6), () => jaws(g, g.tx, g.ty, 110, Math.max(.02, .6 - q * 4), '#6a8a4a', '#fffdf2')); cracks(g, q, g.tx, g.ground + 4, 170, '#2a1c14', 8, 8, Math.PI, 0); puffs(g, q, g.tx, g.ground, '#b9a98a', 14, 150, 20) } },
  soul: { hue: ['#ffffff', '#b9ffe0', '#2f8a7a'],
    charge: (g, p) => notes(g, p, g.sx, g.sy - 30, 70), travel: (g, p) => { trail(g, g.ax + 90 * p, g.ay, 260 * p, 10, '#e9fff5', 1, 4); notes(g, p, g.ax, g.ay - 30, 110) },
    burst: (g, q) => { cut(g.c, g.tx, g.ty, -.2, 240 * Math.min(1, q * 9), 6 * fade(q), '#ffffff', '#8ff0cf', fade(q * q)); for (let i = 0; i < 8; i++) snow(g, g.tx + (rnd(g.seed, i) - .5) * 190, g.ty + (rnd(g.seed, i + 8) - .5) * 160, 7, fade(q)); notes(g, q, g.tx, g.ty - 40, 130) } },
  room: { ranged: true, heavy: .6, hue: ['#ffffff', '#7fd8ff', '#1f7fb5'],
    charge: (g, p) => dome(g, lerp(g.ax, g.tx, .5), 320 * ease(p), p), travel: (g, p) => { dome(g, lerp(g.ax, g.tx, .5), 320, 1); cut(g.c, lerp(g.ax, g.tx, p), g.ty, .1, 120, 5, '#ffffff', '#7fd8ff', .9) },
    burst: (g, q) => { dome(g, lerp(g.ax, g.tx, .5), 320, fade(q)); for (let i = 0; i < 4; i++) cut(g.c, g.tx, g.ty - 48 + i * 32, i % 2 ? .06 : -.06, 220 * Math.min(1, q * 8 - i * .25 > 0 ? q * 8 - i * .25 : 0), 5 * fade(q), '#ffffff', '#4fc0ff', fade(q * q)) } },
  magnet: { ranged: true, heavy: .7, hue: ['#ffffff', '#d9b0ff', '#6a3fb0'],
    charge: (g, p) => { scrap(g, g.ax, g.ay, 110 * (1 - p) + 22, 16, p); for (let i = 0; i < 3; i++) bolt(g, g.ax, g.ay, g.ax + Math.cos(i * 2.1) * 60, g.ay + Math.sin(i * 2.1) * 60, 1.6, '#ffffff', '#b07fff', g.seed + i, 10) },
    travel: (g, p) => { const [x, y] = along(g, ease(p)); scrap(g, x, y, 40, 22, 1); fistShape(g.c, x, y, 34, '#7d868d'); trail(g, x - 30, y, 150, 70, '#d9b0ff', .6, 7) },
    burst: (g, q) => { sparks(g, q, g.tx, g.ty, ['#8f99a0', '#5a646b', '#ffe08a'], 30, 200, 8, 160); ring(g.c, g.tx, g.ty, 170 * ease(q), 10 * fade(q), '#b07fff', fade(q)) } },
  age: { hue: ['#ffffff', '#ffc4e8', '#b03f9a'],
    travel: (g, p) => { clock(g, g.ax, g.ay, 34 + 10 * p, p) }, burst: (g, q) => { clock(g, g.tx, g.ty, 70 + 40 * q, q * 3, fade(q)); petals(g, q, g.tx, g.ty, ['#ffc4e8', '#e07fc4'], 18, 130) } },
  paw: { ranged: true, heavy: .9, hue: ['#ffffff', '#ffc9b0', '#c2604a'],
    charge: (g, p) => { for (let i = 0; i < 3; i++) ring(g.c, g.ax, g.ay, 100 * (1 - (p + i / 3) % 1), 5, '#ffe0d2', p) },
    travel: (g, p) => { const [x, y] = along(g, ease(p)); soft(g.c, .85, () => { g.c.fillStyle = '#ffffff'; pawShape(g.c, x, y, 52) ; g.c.fillStyle = '#ffb59a'; pawShape(g.c, x, y, 42) }); for (let i = 0; i < 3; i++) ring(g.c, x - 30 - i * 26, y, 40 - i * 6, 5, '#ffffff', .7, 1.6) },
    burst: (g, q) => { soft(g.c, fade(q), () => { g.c.fillStyle = '#ffd9c9'; pawShape(g.c, g.tx, g.ty, 60 + 90 * ease(q)) }); for (let i = 0; i < 4; i++) ring(g.c, g.tx + i * 34 * q, g.ty, (50 + i * 40) * ease(q), 9 * fade(q), '#ffffff', fade(q), 1.5) } },
  string: { ranged: true, heavy: .5, hue: ['#ffffff', '#ff9ad0', '#a01f6a'],
    travel: (g, p) => threads(g, p, 1), burst: (g, q) => { threads(g, 1, fade(q)); for (let i = 0; i < 5; i++) cut(g.c, g.tx, g.ty, -.9 + i * .45, 180 * Math.min(1, q * 8), 3.5 * fade(q), '#ffffff', ['#ff5a8a', '#ffd24a', '#5ad0ff', '#8aff7a', '#c08aff'][i], fade(q * q)) } },
  ghost: { ranged: true, hue: ['#ffffff', '#e9d9ff', '#8a6ab5'],
    travel: (g, p) => pellets(g, p, 4, 130, (x, y, i) => ghost(g, x, y + Math.sin(g.now / 90 + i) * 12, 24, .9), .4),
    burst: (g, q) => { for (let i = 0; i < 3; i++) ghost(g, g.tx + (i - 1) * 60 + q * 60, g.ty - 30 - i * 14 - q * 20, 24, fade(q)); for (let i = 0; i < 7; i++) { g.c.globalAlpha = fade(q); g.c.strokeStyle = '#4a3f7a'; g.c.lineWidth = 4; g.c.beginPath(); g.c.moveTo(g.tx - 36 + i * 12, g.ty - 80); g.c.lineTo(g.tx - 36 + i * 12, g.ty - 80 + 60 * Math.min(1, q * 3)); g.c.stroke() } g.c.globalAlpha = 1; blast(g, q, g.tx, g.ty, 46, ['#ffffff', '#e9d9ff', '#8a6ab5']) } },
  wax: { ranged: true, heavy: .4, hue: ['#ffffff', '#f6f2e2', '#c2b48a'],
    travel: (g, p) => { const [x, y] = along(g, ease(p)); g.c.lineCap = 'round'; for (const [w, color] of [[30, '#8a7f5f'], [24, '#fdfaf0']] as const) { g.c.beginPath(); g.c.moveTo(g.ax, g.ay); g.c.quadraticCurveTo(lerp(g.ax, x, .5), g.ay + 30, x, y); g.c.lineWidth = w; g.c.strokeStyle = color; g.c.stroke() } fistShape(g.c, x, y, 34, '#fdfaf0', '#8a7f5f') },
    burst: (g, q) => { for (let i = 0; i < 12; i++) drip(g, g.tx - 60 + i * 11, g.ty - 60 + 120 * Math.min(1, q * 1.6) * rnd(g.seed, i), 11 * fade(q * .7), '#fdfaf0'); sparks(g, q, g.tx, g.ty, ['#ffffff', '#e9e2c9'], 16, 130, 7) } },
  munch: { ranged: true, heavy: .8, hue: ['#fff4c2', '#ff9a5a', '#5a3a6a'],
    charge: (g, p) => jaws(g, g.ax, g.ay, 46, .2 + .6 * p, '#8a6aa0', '#fffdf2'), travel: (g, p) => { const [x, y] = along(g, p, 34); for (const k of [0, 1, 2]) { g.c.fillStyle = '#2a2a33'; g.c.beginPath(); g.c.arc(x - k * 40, y + k * 8, 18, 0, TAU); g.c.fill(); trail(g, x - k * 40, y + k * 8, 70, 18, '#ffd9a0', .7, 3) } },
    burst: (g, q) => { blast(g, q, g.tx, g.ty, 95, ['#fff4c2', '#ff9a5a', '#5a3a6a']); puffs(g, q, g.tx, g.ty, '#4a4450', 12, 120, 24, 60) } },
  diamond: { heavy: .9, flood: '#e9f6ff', hue: ['#ffffff', '#bfe9ff', '#6a9fd0'],
    charge: (g, p) => { for (let i = 0; i < 10; i++) gem(g, g.ax + Math.cos(i * 2.4) * 70 * (1 - p), g.ay + Math.sin(i * 2.4) * 60 * (1 - p), 9, p) },
    travel: (g, p) => { const [x, y] = along(g, p); fistShape(g.c, x, y, 36, '#d3f0ff', '#4f8fb5'); for (let i = 0; i < 6; i++) gem(g, x - 20 - i * 22, y + (rnd(g.seed, i) - .5) * 70, 9, .9) },
    burst: (g, q) => { for (let i = 0; i < 18; i++) { const a = i / 18 * TAU; gem(g, g.tx + Math.cos(a) * 180 * ease(q), g.ty + Math.sin(a) * 150 * ease(q), 12 * fade(q), fade(q)) } for (let i = 0; i < 4; i++) cut(g.c, g.tx, g.ty, i * .79, 190 * ease(q), 5 * fade(q), '#ffffff', '#bfe9ff', fade(q)); ring(g.c, g.tx, g.ty, 190 * ease(q), 12 * fade(q), '#ffffff', fade(q)) } },
  split: { ranged: true, hue: ['#ffffff', '#ffb0a0', '#c23f3a'],
    // The hand comes off and flies on its own, knives between the fingers.
    travel: (g, p) => { for (const k of [0, 1]) { const t = Math.max(0, p - k * .18); const [x, y] = along(g, ease(t), 24 - k * 48); fistShape(g.c, x, y, 21, '#f6e3d2'); for (let i = 0; i < 3; i++) cut(g.c, x + 34, y - 14 + i * 14, 0, 22, 4, '#ffffff', '#aab4bb', 1); trail(g, x - 16, y, 90, 26, '#ffffff', .7, 4) } },
    burst: (g, q) => { for (let i = 0; i < 5; i++) cut(g.c, g.tx + (rnd(g.seed, i) - .5) * 40, g.ty + (rnd(g.seed, i + 5) - .5) * 70, .3 - i * .3, 80 * Math.min(1, q * 8), 5 * fade(q), '#ffffff', '#ff9a8a', fade(q)) } },
  hands: { ranged: true, hue: ['#ffffff', '#f0b8e0', '#8a4fa0'],
    charge: (g, p) => petals(g, 1 - p, g.sx, g.sy, ['#f0b8e0', '#c98ad0', '#ffffff'], 18, 110),
    travel: (g, p) => sprouts(g, p, 1), burst: (g, q) => { sprouts(g, 1, fade(Math.max(0, q - .4) / .6), q); petals(g, q, g.tx, g.ty, ['#f0b8e0', '#c98ad0', '#ffffff'], 40, 200) } },
  shadow: { ranged: true, heavy: .6, flood: '#120a1c', hue: ['#d9c4ff', '#4a2f7a', '#0e0818'],
    travel: (g, p) => { spikesUp(g, p, g.ax, g.tx - 10, 10, 60, ['#120a1c', '#3a2560']); pellets(g, p, 7, 180, (x, y) => bat(g, x, y - 30, 17, '#1a1028'), .6) },
    burst: (g, q) => { spikesUp(g, 1, g.tx - 70, g.tx + 60, 7, 150 * fade(q * .7), ['#120a1c', '#3a2560'], 0); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; bat(g, g.tx + Math.cos(a) * 180 * ease(q), g.ty + Math.sin(a) * 130 * ease(q), 17 * fade(q), '#1a1028') } } },
  poison: { ranged: true, heavy: .8, flood: '#5a1f7a', hue: ['#f0b8ff', '#a03fd0', '#3a0f55'],
    charge: (g, p) => puffs(g, p, g.sx, g.sy, '#8a3fb5', 12, 90, 18),
    // A dragon of venom with three coils.
    travel: (g, p) => { const n = 16; for (let i = n; i >= 0; i--) { const t = p - i * .035; if (t <= 0) continue; const [x, y] = along(g, t); const yy = y + Math.sin(t * 11) * 40; g.c.fillStyle = i % 2 ? '#8a2fb8' : '#b04fe0'; g.c.beginPath(); g.c.arc(x, yy, 25 - i * .9, 0, TAU); g.c.fill() } const [x, y] = along(g, p); jaws(g, x + 12, y + Math.sin(p * 11) * 40, 40, .5, '#8a2fb8', '#f6e3ff') },
    burst: (g, q) => { for (let i = 0; i < 16; i++) { const a = -Math.PI * rnd(g.seed, i); drip(g, g.tx + Math.cos(a) * 150 * ease(q), g.ty + Math.sin(a) * 130 * ease(q) + 170 * q * q, 12 * fade(q), i % 2 ? '#a03fd0' : '#6a1f9a') } puffs(g, q, g.tx, g.ty, '#7a2fa0', 18, 140, 26) } },
  ballet: { hue: ['#ffffff', '#ffb8de', '#e05fa0'],
    travel: (g, p) => { for (let i = 0; i < 3; i++) crescent(g.c, g.ax - 10, g.ay, 50 + i * 22, p * 5 + i, p * 5 + i + 1.9, 9, '#ffffff', '#ff9ad0', .9) },
    burst: (g, q) => { cut(g.c, g.tx, g.ty, -.1, 190 * Math.min(1, q * 8), 9 * fade(q), '#ffffff', '#ff8ac8', fade(q)); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; star(g.c, g.tx + Math.cos(a) * 130 * ease(q), g.ty + Math.sin(a) * 110 * ease(q), 14 * fade(q), 5, i % 2 ? '#ffb8de' : '#fff0a0', i) } } },
  straw: { ranged: true, hue: ['#fff8d8', '#e0c070', '#7a5a22'],
    travel: (g, p) => { const [x, y] = along(g, p); doll(g, x, y, 30); pellets(g, p, 6, 110, (px, py) => { g.c.strokeStyle = '#6a4a2a'; g.c.lineWidth = 4; g.c.beginPath(); g.c.moveTo(px - 24, py); g.c.lineTo(px, py); g.c.stroke() }, .5) },
    burst: (g, q) => { soft(g.c, fade(q), () => doll(g, g.tx, g.ty - 10, 54)); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; const r = 120 * (1 - Math.min(1, q * 4)) + 16; cut(g.c, g.tx + Math.cos(a) * r, g.ty + Math.sin(a) * r, a, 22, 4, '#8a6a3a', '#4a3218', fade(q)) } sparks(g, q, g.tx, g.ty, ['#e0c070', '#c29a4a'], 22, 150, 6) } },
  door: { heavy: .5, hue: ['#ffffff', '#9fd0b0', '#2f5a44'],
    // A door swings open in mid-air right behind the target, and the fist comes out of it.
    travel: (g, p) => doorway(g, g.tx + 74, g.ty, p), burst: (g, q) => { doorway(g, g.tx + 74, g.ty, fade(Math.max(0, q - .5) * 2)); if (q < .5) fistShape(g.c, g.tx + 46 - 30 * Math.min(1, q * 6), g.ty, 26, '#e8c29a'); ring(g.c, g.tx, g.ty, 150 * ease(q), 10 * fade(q), '#ffffff', fade(q)) } },
  bubble: { ranged: true, hue: ['#ffffff', '#d0f4ff', '#7fb8e0'],
    travel: (g, p) => pellets(g, p, 12, 190, (x, y, i) => bubbleAt(g, x, y, 11 + (i % 4) * 5, .9), .7),
    burst: (g, q) => { for (let i = 0; i < 20; i++) bubbleAt(g, g.tx + (rnd(g.seed, i) - .5) * 190, g.ty + (rnd(g.seed, i + 9) - .5) * 160 - q * 70, 8 + rnd(g.seed, i + 3) * 20, fade(q)); for (let i = 0; i < 5; i++) star(g.c, g.tx + (rnd(g.seed, i) - .5) * 120, g.ty + (rnd(g.seed, i + 4) - .5) * 120, 16 * fade(q), 4, '#ffffff', i) } },
  quake: { heavy: 1.6, flood: '#f4f8ff', hue: ['#ffffff', '#dfeaff', '#7a8fc0'],
    charge: (g, p) => { soft(g.c, p * .9, () => { g.c.fillStyle = '#ffffff'; g.c.beginPath(); g.c.arc(g.ax, g.ay, 34 * p, 0, TAU); g.c.fill() }); for (let i = 0; i < 3; i++) ring(g.c, g.ax, g.ay, 40 + i * 22 + Math.sin(g.now / 60 + i) * 5, 4, '#ffffff', p) },
    travel: (g, p) => { const [x, y] = along(g, p); soft(g.c, .9, () => { g.c.fillStyle = '#ffffff'; g.c.beginPath(); g.c.arc(x, y, 38, 0, TAU); g.c.fill() }); for (let i = 0; i < 4; i++) ring(g.c, x, y, 46 + i * 20, 5, '#dfeaff', .8) },
    // The air itself cracks like glass.
    burst: (g, q) => { cracks(g, q * .8, g.tx, g.ty, 420, '#ffffff', 11, 15); cracks(g, q * .8, g.tx + 5, g.ty + 5, 420, '#7a8fc0', 4, 15); for (let i = 0; i < 3; i++) ring(g.c, g.tx, g.ty, (120 + i * 90) * ease(q), 12 * fade(q), '#ffffff', fade(q)); cracks(g, q, g.tx, g.ground + 4, 320, '#2a2a33', 10, 9, Math.PI, 0) } },
  spring: { heavy: .5, hue: ['#ffffff', '#ffe08a', '#c27a1f'],
    charge: (g, p) => coil(g, g.sx - 6, g.ground, 20, 70 * p), travel: (g, p) => { const hops = 3; for (let i = 0; i < hops; i++) { const [x1, x2] = [lerp(g.ax - 120, g.tx, i / hops), lerp(g.ax - 120, g.tx, (i + 1) / hops)]; if (p * hops < i) break; const [y1, y2] = i % 2 ? [40, g.ground - 20] : [g.ground - 20, 40]; g.c.strokeStyle = '#ffffff'; g.c.globalAlpha = .5; g.c.lineWidth = 12; g.c.beginPath(); g.c.moveTo(x1, y1); g.c.lineTo(lerp(x1, x2, Math.min(1, p * hops - i)), lerp(y1, y2, Math.min(1, p * hops - i))); g.c.stroke(); g.c.globalAlpha = 1 } },
    burst: (g, q) => { coil(g, g.tx - 60, g.ty + 14, 24, 90 * fade(q)); ring(g.c, g.tx, g.ty, 170 * ease(q), 12 * fade(q), '#ffffff', fade(q)) } },
  hormone: { ranged: true, heavy: .6, hue: ['#ffffff', '#ff8ae0', '#8a1fb0'],
    travel: (g, p) => { const [x, y] = along(g, ease(p)); for (let i = 0; i < 4; i++) ring(g.c, x - i * 18, y, 34 + i * 16, 8, i % 2 ? '#ffffff' : '#ff7fd8', .9 - i * .18, 1.5); for (let i = 0; i < 3; i++) bolt(g, g.ax, g.ay, x, y + (i - 1) * 30, 2, '#ffffff', '#e04fd0', g.seed + i, 18) },
    burst: (g, q) => { blast(g, q, g.tx, g.ty, 74, ['#ffffff', '#ff8ae0', '#8a1fb0']); for (let i = 0; i < 5; i++) if (q < .7) bolt(g, g.tx, g.ty, g.tx + Math.cos(i * 1.3) * 120, g.ty + Math.sin(i * 1.3) * 100, 2.6 * fade(q), '#ffffff', '#e04fd0', g.seed + i, 18) } },
  love: { ranged: true, heavy: .5, flood: '#ffd0e8', hue: ['#ffffff', '#ff8ab8', '#d02f7a'],
    charge: (g, p) => { soft(g.c, p, () => { g.c.fillStyle = '#ff6aa5'; heart(g.c, g.ax + 10, g.ay, 40 * p); g.c.fill() }); glow(g.c, g.ax, g.ay, 90 * p, '#ff8ab8', .7) },
    travel: (g, p) => { const [x, y] = along(g, ease(p)); soft(g.c, .8, () => { const paint = g.c.createLinearGradient(g.ax, 0, x, 0); paint.addColorStop(0, '#ffd0e8'); paint.addColorStop(1, '#ff5a9f'); g.c.fillStyle = paint; g.c.beginPath(); g.c.moveTo(g.ax, g.ay - 8); g.c.lineTo(x, y - 44); g.c.lineTo(x, y + 44); g.c.lineTo(g.ax, g.ay + 8); g.c.fill() }); g.c.fillStyle = '#ff3f8a'; heart(g.c, x, y, 34); g.c.fill() },
    // What the beam touches turns to stone.
    burst: (g, q) => { if (q < .7) soft(g.c, .75 * fade(q / .7), () => { g.c.fillStyle = '#a9a6a2'; g.c.beginPath(); g.c.ellipse(g.tx, g.ty, 56, 92, 0, 0, TAU); g.c.fill() }); cracks(g, q, g.tx, g.ty, 120, '#4a4844', 4, 9); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; soft(g.c, fade(q), () => { g.c.fillStyle = i % 2 ? '#ff6aa5' : '#ffd0e8'; heart(g.c, g.tx + Math.cos(a) * 150 * ease(q), g.ty + Math.sin(a) * 120 * ease(q), 15 * fade(q)); g.c.fill() }) } } },
}

// --- Pieces only one or two effects use --------------------------------------------------------------------------
function stretch(g: G, p: number, alpha: number) {
  const [x, y] = [lerp(g.sx, g.tx, Math.max(0, p)), lerp(g.sy, g.ty, Math.max(0, p))]
  const many = g.power >= 1.45
  soft(g.c, alpha, () => {
    g.c.lineCap = 'round'
    const arms = many ? 6 : 1
    for (let k = arms - 1; k >= 0; k--) {
      const off = many ? (rnd(g.seed + Math.floor(g.now / 50), k) - .5) * 110 : 0
      for (const [w, color] of [[17, '#14181c'], [12, '#f0c9a0']] as const) { g.c.beginPath(); g.c.moveTo(g.sx, g.sy); g.c.lineTo(x, y + off); g.c.lineWidth = w; g.c.strokeStyle = color; g.c.stroke() }
      fistShape(g.c, x + 6, y + off, 21 + g.power * 4, '#f0c9a0')
      trail(g, x - 10, y + off, 150 * p, 40, '#ffffff', .6, 4)
    }
  })
}
function droplets(g: G, q: number, color: string, count: number) {
  for (let i = 0; i < count; i++) {
    const a = -Math.PI * rnd(g.seed, i + 2) * 1.2 + .3
    const far = 180 * rnd(g.seed, i + 14) * ease(q)
    soft(g.c, fade(q), () => { g.c.fillStyle = i % 3 ? color : '#ffffff'; g.c.beginPath(); g.c.arc(g.tx + Math.cos(a) * far, g.ty + Math.sin(a) * far + 170 * q * q, 3 + rnd(g.seed, i) * 6, 0, TAU); g.c.fill() })
  }
}
function fxCloud(g: G, alpha: number) {
  for (let i = 0; i < 8; i++) soft(g.c, alpha, () => { g.c.fillStyle = i % 2 ? '#5f6b7d' : '#46505f'; g.c.beginPath(); g.c.arc(g.tx - 66 + i * 19, 52 + Math.sin(i * 2) * 9, 22 + (i % 3) * 5, 0, TAU); g.c.fill() })
}
function grains(g: G, q: number, x: number, y: number, count: number) {
  for (let i = 0; i < count; i++) { const a = rnd(g.seed, i) * TAU + q * 4; const r = 130 * rnd(g.seed, i + 8) * (.4 + q); soft(g.c, fade(q * .9), () => { g.c.fillStyle = i % 2 ? '#e6bd6a' : '#c2923f'; g.c.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r * .7, 4.5, 4.5) }) }
}
function drip(g: G, x: number, y: number, r: number, color: string) {
  if (r <= 0) return
  g.c.fillStyle = color
  g.c.beginPath(); g.c.arc(x, y, r, 0, TAU); g.c.fill()
  g.c.beginPath(); g.c.moveTo(x - r * .8, y - r * .4); g.c.lineTo(x, y - r * 2.4); g.c.lineTo(x + r * .8, y - r * .4); g.c.fill()
}
function snow(g: G, x: number, y: number, r: number, alpha: number) {
  soft(g.c, alpha, () => { g.c.strokeStyle = '#ffffff'; g.c.lineWidth = 2; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3 + g.now / 900; g.c.beginPath(); g.c.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); g.c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.c.stroke() } })
}
function darkness(g: G, x: number, y: number, r: number, alpha: number) {
  if (r <= 1) return
  soft(g.c, alpha, () => { const paint = g.c.createRadialGradient(x, y, r * .1, x, y, r); paint.addColorStop(0, '#050208'); paint.addColorStop(.7, '#14082a'); paint.addColorStop(1, 'transparent'); g.c.fillStyle = paint; g.c.fillRect(x - r, y - r, r * 2, r * 2) })
  for (let i = 0; i < 5; i++) crescent(g.c, x, y, r * (.45 + i * .13), g.now / 160 + i * 1.3, g.now / 160 + i * 1.3 + 1.6, 6, '#5a2f9a', '#1a0a33', alpha * .9)
}
function wings(g: G, x: number, y: number, r: number, alpha: number) {
  const flap = Math.sin(g.now / 70) * .18
  for (const side of [-1, 1]) soft(g.c, alpha * .9, () => {
    g.c.translate(x, y); g.c.scale(side, 1); g.c.rotate(-.5 + flap)
    for (const [k, color] of [[1, '#1f6fe0'], [.75, '#4fc4ff'], [.45, '#fff6b0']] as const) { g.c.beginPath(); g.c.moveTo(0, 0); g.c.quadraticCurveTo(r * .5 * k, -r * .8 * k, r * 1.2 * k, -r * .5 * k); for (let i = 0; i < 4; i++) g.c.lineTo(r * (1 - i * .22) * k, -r * (.1 - i * .05) * k + (i % 2) * 12); g.c.closePath(); g.c.fillStyle = color; g.c.fill() }
  })
}
function notes(g: G, p: number, x: number, y: number, reach: number) {
  g.c.font = '800 26px Georgia, serif'
  for (let i = 0; i < 6; i++) { const a = -Math.PI * (i + .5) / 6; const r = reach * (.4 + p * .6); soft(g.c, 1 - p * .6, () => { g.c.fillStyle = i % 2 ? '#2f8a7a' : '#10241f'; g.c.fillText(i % 2 ? '♪' : '♫', x + Math.cos(a) * r, y + Math.sin(a) * r * .6 + Math.sin(g.now / 90 + i) * 5) }) }
}
function dome(g: G, x: number, r: number, alpha: number) {
  if (r <= 1) return
  soft(g.c, alpha * .32, () => { g.c.fillStyle = '#3fb0f0'; g.c.beginPath(); g.c.arc(x, g.ground + 10, r, Math.PI, 0); g.c.fill() })
  soft(g.c, alpha * .9, () => { g.c.strokeStyle = '#bfeaff'; g.c.lineWidth = 4; g.c.beginPath(); g.c.arc(x, g.ground + 10, r, Math.PI, 0); g.c.stroke(); g.c.globalAlpha *= .4; g.c.lineWidth = 1.5; for (let i = 1; i < 5; i++) { g.c.beginPath(); g.c.ellipse(x, g.ground + 10, r * i / 5, r, 0, Math.PI, 0); g.c.stroke() } })
}
function scrap(g: G, x: number, y: number, r: number, count: number, alpha: number) {
  for (let i = 0; i < count; i++) { const a = i / count * TAU + g.now / 260; soft(g.c, alpha, () => { g.c.translate(x + Math.cos(a) * r * (.7 + rnd(g.seed, i) * .5), y + Math.sin(a) * r * (.6 + rnd(g.seed, i + 4) * .5)); g.c.rotate(a * 3); g.c.fillStyle = i % 2 ? '#8f99a0' : '#5a646b'; g.c.strokeStyle = '#14181c'; g.c.lineWidth = 1.5; const s = 6 + rnd(g.seed, i + 2) * 9; g.c.fillRect(-s, -s * .4, s * 2, s * .8); g.c.strokeRect(-s, -s * .4, s * 2, s * .8) }) }
}
function clock(g: G, x: number, y: number, r: number, t: number, alpha = 1) {
  soft(g.c, alpha, () => { g.c.fillStyle = '#fff4fb'; g.c.strokeStyle = '#b03f9a'; g.c.lineWidth = 5; g.c.beginPath(); g.c.arc(x, y, r, 0, TAU); g.c.globalAlpha *= .75; g.c.fill(); g.c.stroke(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.c.beginPath(); g.c.moveTo(x + Math.cos(a) * r * .82, y + Math.sin(a) * r * .82); g.c.lineTo(x + Math.cos(a) * r * .94, y + Math.sin(a) * r * .94); g.c.stroke() } for (const [k, len] of [[9, .8], [2, .5]]) { g.c.beginPath(); g.c.moveTo(x, y); g.c.lineTo(x + Math.cos(t * k) * r * len, y + Math.sin(t * k) * r * len); g.c.stroke() } })
}
function threads(g: G, p: number, alpha: number) {
  const colors = ['#ffffff', '#ff9ad0', '#ffe08a', '#9fe0ff', '#ffffff', '#c9a0ff', '#ffffff', '#ff9ad0']
  soft(g.c, alpha, () => { colors.forEach((color, i) => { g.c.strokeStyle = color; g.c.lineWidth = 1.8; g.c.beginPath(); g.c.moveTo(g.ax, g.ay); const y = g.ty - 110 + i * 30; g.c.quadraticCurveTo(lerp(g.ax, g.tx, .5), g.ay - 60 + i * 12, lerp(g.ax, g.tx + 70, p), lerp(g.ay, y, p)); g.c.stroke() }) })
}
function ghost(g: G, x: number, y: number, r: number, alpha: number) {
  soft(g.c, alpha, () => { g.c.fillStyle = '#fbf8ff'; g.c.strokeStyle = '#8a7aa5'; g.c.lineWidth = 2; g.c.beginPath(); g.c.arc(x, y, r, Math.PI, 0); g.c.quadraticCurveTo(x + r * .6, y + r * 1.4, x - r * .2, y + r); g.c.quadraticCurveTo(x - r * .9, y + r * 1.7, x - r, y); g.c.fill(); g.c.stroke(); g.c.fillStyle = '#2a2033'; g.c.beginPath(); g.c.arc(x - r * .3, y - r * .1, r * .14, 0, TAU); g.c.arc(x + r * .35, y - r * .1, r * .14, 0, TAU); g.c.fill(); g.c.fillStyle = '#d05f7a'; g.c.beginPath(); g.c.ellipse(x + r * .05, y + r * .4, r * .18, r * .3, 0, 0, TAU); g.c.fill() })
}
function gem(g: G, x: number, y: number, r: number, alpha: number) {
  if (r <= 0) return
  soft(g.c, alpha, () => { g.c.fillStyle = '#d9f4ff'; g.c.strokeStyle = '#5fa0c9'; g.c.lineWidth = 1.5; g.c.beginPath(); g.c.moveTo(x, y - r * 1.3); g.c.lineTo(x + r, y); g.c.lineTo(x, y + r * 1.3); g.c.lineTo(x - r, y); g.c.closePath(); g.c.fill(); g.c.stroke(); g.c.fillStyle = '#ffffff'; g.c.beginPath(); g.c.moveTo(x, y - r * 1.3); g.c.lineTo(x + r * .35, y); g.c.lineTo(x - r * .35, y); g.c.fill() })
}
/** Arms blooming out of the ground and the air around the target, closing in. */
function sprouts(g: G, p: number, alpha: number, squeeze = 0) {
  for (let i = 0; i < 12; i++) {
    const grown = Math.max(0, Math.min(1, p * 2 - i / 12))
    if (!grown) continue
    const side = i % 2 ? 1 : -1
    const [x0, y0] = [g.tx + side * (95 + (i % 3) * 18), g.ground + 4 - Math.floor(i / 2) * 26]
    const [x1, y1] = [lerp(x0, g.tx + side * (26 - squeeze * 8), grown), lerp(y0, g.ty - 50 + Math.floor(i / 2) * 20, grown)]
    soft(g.c, alpha, () => { g.c.lineCap = 'round'; for (const [w, color] of [[13, '#14181c'], [9, '#f0c9a0']] as const) { g.c.beginPath(); g.c.moveTo(x0, y0); g.c.quadraticCurveTo(lerp(x0, x1, .4), y0 - 26, x1, y1); g.c.lineWidth = w; g.c.strokeStyle = color; g.c.stroke() } g.c.fillStyle = '#f0c9a0'; g.c.strokeStyle = '#14181c'; g.c.lineWidth = 2; g.c.beginPath(); g.c.arc(x1, y1, 8, 0, TAU); g.c.fill(); g.c.stroke(); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; g.c.fillStyle = '#f0b8e0'; g.c.beginPath(); g.c.ellipse(x0 + Math.cos(a) * 8, y0 + Math.sin(a) * 5, 6, 4, a, 0, TAU); g.c.fill() } })
  }
}
function bat(g: G, x: number, y: number, r: number, color: string) {
  if (r <= 0) return
  const flap = Math.sin(g.now / 45 + x) * r * .5
  g.c.fillStyle = color
  g.c.beginPath(); g.c.moveTo(x, y - r * .4); g.c.quadraticCurveTo(x + r * .8, y - r - flap, x + r * 1.9, y - flap * .4); g.c.quadraticCurveTo(x + r * 1.2, y, x + r * .7, y + r * .4); g.c.lineTo(x, y + r * .6); g.c.lineTo(x - r * .7, y + r * .4); g.c.quadraticCurveTo(x - r * 1.2, y, x - r * 1.9, y - flap * .4); g.c.quadraticCurveTo(x - r * .8, y - r - flap, x, y - r * .4); g.c.fill()
}
function doll(g: G, x: number, y: number, r: number) {
  g.c.strokeStyle = '#7a5a22'; g.c.lineCap = 'round'
  for (const [w, color] of [[r * .5, '#7a5a22'], [r * .36, '#e0c070']] as const) { g.c.lineWidth = w; g.c.strokeStyle = color; g.c.beginPath(); g.c.moveTo(x, y - r); g.c.lineTo(x, y + r); g.c.moveTo(x - r * .9, y - r * .2); g.c.lineTo(x + r * .9, y - r * .2); g.c.moveTo(x, y + r * .6); g.c.lineTo(x - r * .6, y + r * 1.5); g.c.moveTo(x, y + r * .6); g.c.lineTo(x + r * .6, y + r * 1.5); g.c.stroke() }
  g.c.fillStyle = '#e0c070'; g.c.beginPath(); g.c.arc(x, y - r * 1.1, r * .5, 0, TAU); g.c.fill()
  g.c.fillStyle = '#3a2a12'; g.c.fillRect(x - r * .25, y - r * 1.2, r * .12, r * .2); g.c.fillRect(x + r * .12, y - r * 1.2, r * .12, r * .2)
}
function doorway(g: G, x: number, y: number, open: number) {
  if (open <= 0) return
  const { c } = g
  soft(c, Math.min(1, open * 2), () => {
    c.fillStyle = '#16241d'; c.strokeStyle = '#14181c'; c.lineWidth = 4
    c.beginPath(); c.ellipse(x, y, 44 * Math.min(1, open * 1.4), 92, 0, 0, TAU); c.fill(); c.stroke()
    c.strokeStyle = '#7fc49a'; c.lineWidth = 6; c.beginPath(); c.ellipse(x, y, 44 * Math.min(1, open * 1.4), 92, 0, 0, TAU); c.stroke()
  })
}
function bubbleAt(g: G, x: number, y: number, r: number, alpha: number) {
  soft(g.c, alpha, () => { g.c.fillStyle = 'rgba(208, 244, 255, .42)'; g.c.strokeStyle = '#8fc9e6'; g.c.lineWidth = 2; g.c.beginPath(); g.c.arc(x, y, r, 0, TAU); g.c.fill(); g.c.stroke(); g.c.fillStyle = '#ffffff'; g.c.beginPath(); g.c.arc(x - r * .35, y - r * .35, r * .22, 0, TAU); g.c.fill() })
}
function coil(g: G, x: number, y: number, r: number, height: number) {
  for (const [w, color] of [[8, '#14181c'], [5, '#e0a83a']] as const) { g.c.lineWidth = w; g.c.strokeStyle = color; g.c.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40; const px = x + Math.cos(t * TAU * 4) * r; const py = y - t * height; i ? g.c.lineTo(px, py) : g.c.moveTo(px, py) } g.c.stroke() }
}

export default fx

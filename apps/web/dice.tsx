import { useEffect, useRef, useState } from 'react'
import type { DiceRoll } from '../../packages/shared/dice.ts'
import './dice.css'

/** A check, or one side of a fight. */
export type Side = 'check' | 'ours' | 'foe'
type Vec = [number, number, number]
type Quat = [number, number, number, number]

export const diceTumble = 1150
const tumble = diceTumble
const hold = 950
/** A whole round takes longer to read than a single check. */
const holdRound = 1700
export const diceHold = (rolls: number) => rolls > 2 ? holdRound : hold

// --- A twenty-sided die -------------------------------------------------------------------------------------------
const phi = (1 + Math.sqrt(5)) / 2
const corners: Vec[] = [[-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0], [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi], [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]]
  .map(v => scaleTo(v as Vec, 1))
const faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
  [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]

function scaleTo(v: Vec, length: number): Vec {
  const size = Math.hypot(...v)
  return [v[0] / size * length, v[1] / size * length, v[2] / size * length]
}
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const minus = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const middle = (face: number[]): Vec => {
  const [a, b, c] = face.map(i => corners[i])
  return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3]
}
/** Opposite faces add up to 21, as on a real die. */
const numbers = (() => {
  const out: number[] = Array(20).fill(0)
  let next = 1
  for (let i = 0; i < 20; i++) {
    if (out[i]) continue
    const centre = middle(faces[i])
    const opposite = faces.findIndex(face => dot(scaleTo(middle(face), 1), scaleTo(centre, 1)) < -.99)
    ;[out[i], out[opposite]] = next % 2 ? [next, 21 - next] : [21 - next, next]
    next++
  }
  return out
})()

const turn = (axis: Vec, angle: number): Quat => [Math.cos(angle / 2), ...scaleTo(axis, Math.sin(angle / 2)).map(n => n || 0) as Vec]
const times = (a: Quat, b: Quat): Quat => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3], a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1], a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]]
const rotate = (q: Quat, v: Vec): Vec => {
  const [, x, y, z] = times(times(q, [0, ...v]), [q[0], -q[1], -q[2], -q[3]])
  return [x, y, z]
}

/** The orientation that shows `value` to the viewer, the right way up. */
function showing(value: number): Quat {
  const face = faces[numbers.indexOf(value)]
  const centre = scaleTo(middle(face), 1)
  const axis = cross(centre, [0, 0, 1])
  const facing: Quat = Math.hypot(...axis) < 1e-6 ? centre[2] > 0 ? [1, 0, 0, 0] : [0, 1, 0, 0] : turn(axis, Math.acos(Math.max(-1, Math.min(1, centre[2]))))
  const top = rotate(facing, corners[face[0]])
  return times(turn([0, 0, 1], Math.PI / 2 - Math.atan2(top[1], top[0])), facing)
}

type Tone = 'gold' | 'good' | 'bad' | 'doom' | 'plain' | 'ours' | 'oursMiss' | 'foe' | 'foeMiss'
const paints: Record<Tone, [number, number, number]> = { gold: [214, 160, 40], good: [38, 120, 104], bad: [122, 60, 46], doom: [70, 22, 26], plain: [34, 72, 96],
  ours: [30, 98, 168], oursMiss: [70, 88, 104], foe: [168, 36, 40], foeMiss: [100, 80, 80] }

function draw(ctx: CanvasRenderingContext2D, size: number, q: Quat, lift: number, shift: number, tone: Tone, settled: boolean) {
  const r = size * .4
  const [cx, cy] = [size / 2 + shift, size * .48 - lift]
  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = 'rgba(20, 30, 36, ' + (.32 - Math.min(.22, lift / size * .5)) + ')'
  ctx.beginPath()
  ctx.ellipse(cx, size * .9, r * (.85 - Math.min(.35, lift / size)), r * .14, 0, 0, Math.PI * 2)
  ctx.fill()
  const points = corners.map(v => rotate(q, v))
  const base = paints[tone]
  const light = scaleTo([-.4, .7, .9], 1)
  faces.forEach((face, i) => {
    const [a, b, c] = face.map(n => points[n])
    let normal = scaleTo(cross(minus(b, a), minus(c, a)), 1)
    if (dot(normal, a) < 0) normal = [-normal[0], -normal[1], -normal[2]]
    if (normal[2] <= .02) return
    const shade = .55 + .6 * Math.max(0, dot(normal, light))
    const front = normal[2] > .985 && settled
    ctx.fillStyle = `rgb(${base.map(n => Math.min(255, Math.round(n * shade + (front ? 26 : 0)))).join(',')})`
    ctx.strokeStyle = 'rgba(246, 226, 170, .75)'
    ctx.lineWidth = Math.max(1, size / 110)
    ctx.lineJoin = 'round'
    const flat = [a, b, c].map(p => [cx + p[0] * r, cy - p[1] * r])
    ctx.beginPath()
    flat.forEach(([x, y], n) => n ? ctx.lineTo(x, y) : ctx.moveTo(x, y))
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    // The number lies on the face: its own axes are the face's, so it turns and foreshortens with it.
    const centre: Vec = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3]
    const up = scaleTo(minus(a, centre), 1)
    const right = cross(up, normal)
    ctx.save()
    ctx.transform(right[0], -right[1], -up[0], up[1], cx + centre[0] * r, cy - centre[1] * r)
    ctx.fillStyle = front ? '#fff8dc' : 'rgba(255, 246, 214, ' + Math.max(.25, normal[2]) + ')'
    ctx.font = '800 ' + Math.round(r * (front ? .46 : .34)) + 'px "Noto Serif TC", Georgia, serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const value = numbers[i]
    ctx.fillText(value === 6 || value === 9 ? value + '.' : String(value), 0, r * .03)
    ctx.restore()
  })
}

// In a fight the colour says whose die it is (blue ours, red theirs) and a miss goes grey; in a check it says how it went.
export const toneOf = (roll: DiceRoll, side: Side): Tone => side === 'foe' ? roll.success ? 'foe' : 'foeMiss'
  : side === 'ours' ? roll.natural === 20 && roll.success ? 'gold' : roll.success === false ? 'oursMiss' : 'ours'
  : roll.natural === 20 ? 'gold' : roll.natural === 1 ? 'doom' : roll.success === undefined ? 'plain' : roll.success ? 'good' : 'bad'
const bounce = (t: number) => {
  // Three shrinking hops, then rest.
  if (t < .42) return 1 - (t / .42) ** 2
  if (t < .72) return .38 * (1 - ((t - .57) / .15) ** 2)
  if (t < .9) return .13 * (1 - ((t - .81) / .09) ** 2)
  return 0
}

export function Die({ roll, side: group, index, size, settled, still }: { roll: DiceRoll, side: Side, index: number, size: number, settled: boolean, still: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = canvas.height = Math.round(size * ratio)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    const end = showing(roll.natural)
    const moving: Tone = group === 'check' ? 'plain' : group
    if (settled || still) { draw(ctx, size, end, 0, 0, settled ? toneOf(roll, group) : moving, true); return }
    // Only how it tumbles is random; where it lands was decided by the host.
    const axis: Vec = [Math.random() - .5, Math.random() - .5, (Math.random() - .5) * .6]
    if (Math.hypot(...axis) < .1) axis[0] = 1
    const spin = (3 + Math.random() * 2) * Math.PI * 2
    const side = index % 2 ? 1 : -1
    const length = tumble - 140 + (index % 4) * 45
    const start = performance.now()
    let frame = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / length)
      const left = (1 - t) ** 2.4
      draw(ctx, size, times(turn(axis, spin * left), end), bounce(t) * size * .34, side * left * size * .16, moving, t >= 1)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [roll, group, size, settled, still, index])
  return <canvas ref={ref} style={{ width: size, height: size }}/>
}

export const verdict = (roll: DiceRoll) => roll.blow ? roll.success ? roll.natural === 20 ? '會心一擊' : '命中' : roll.natural === 1 ? '失手' : '未命中' : roll.natural === 20 ? roll.success === false ? '擲出 20' : '大成功' : roll.natural === 1 ? roll.success ? '擲出 1' : '大失敗'
  : roll.success === undefined ? '' : roll.success ? '成功' : '失敗'

/** Rolls the dice of one check on screen, then calls onDone. A tap or Escape skips to the end. */
export function DiceTray({ rolls, onDone }: { rolls: DiceRoll[], onDone: () => void }) {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [settled, setSettled] = useState(still)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    const timer = settled ? setTimeout(() => done.current(), diceHold(rolls.length)) : setTimeout(() => setSettled(true), tumble)
    return () => clearTimeout(timer)
  }, [settled])
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') done.current() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
  const size = rolls.length === 1 ? 190 : rolls.length <= 3 && window.innerWidth > 560 ? 130 : 104
  // The log announces the same result in words, so the dice themselves are decoration to a screen reader.
  return <div className="dice-tray" aria-hidden="true" onClick={() => settled ? done.current() : setSettled(true)}>
    <ul className="dice-row">{rolls.map((roll, index) => <li key={index} data-tone={settled ? toneOf(roll, 'check') : 'rolling'}>
      <span className="dice-label">{roll.label}</span>
      <Die roll={roll} side="check" index={index} size={size} settled={settled} still={still}/>
      <strong className="dice-total">{settled ? roll.total === undefined ? roll.natural : roll.total + (roll.target === undefined ? '' : '／' + roll.target) : '…'}</strong>
      <span className="dice-verdict">{settled ? verdict(roll) : '擲骰中'}</span>
    </li>)}</ul>
    <p className="dice-skip">點一下跳過</p>
  </div>
}

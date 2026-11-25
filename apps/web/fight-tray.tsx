import { useEffect, useRef, useState } from 'react'
import type { Fighter, Strike } from '../../packages/world/strikes.ts'
import { Die, diceHold, diceTumble, toneOf, verdict } from './dice.tsx'
import effects, { glow, rnd, sparks, star } from './fx.ts'
import type { Fx, G } from './fx.ts'
import './fight-tray.css'

const serif = '"Noto Serif TC", "Songti TC", PMingLiU, serif'
const ease = (t: number) => 1 - (1 - t) ** 3
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
const settle = 520
const linger = 520

type Beat = { strike: Strike, fx: Fx, wind: number, travel: number, stop: number, after: number, start: number, combo: number, chained: boolean }
/** Where an effect is painted before it is turned to point from one name to the other. */
const origin = { x: 260, y: 220, floor: 76 }

/** The blows laid out in time. More blows play faster, and a second blow on the same target needs no wind-up. */
export function schedule(strikes: Strike[]): { beats: Beat[], total: number } {
  const pace = strikes.length <= 2 ? 1 : strikes.length <= 4 ? .8 : .64
  let at = 0
  let combo = 0
  const beats = strikes.map((strike, i) => {
    const fx = effects[strike.effect]
    const before = strikes[i - 1]
    const chained = !!before && before.from === strike.from && before.to === strike.to
    combo = before && before.side === strike.side && before.to === strike.to ? combo + 1 : 1
    const beat: Beat = {
      strike, fx, start: at, combo, chained,
      wind: pace * (chained ? 110 : strike.power >= 1.8 ? 640 : strike.power >= 1.35 ? 380 : 240),
      travel: pace * (fx.ranged ? 250 : 190),
      stop: 46 + strike.power * 40 + (fx.heavy ?? 0) * 50 + (strike.crit ? 80 : 0) + (strike.ko ? 100 : 0),
      after: pace * (360 + (fx.heavy ?? 0) * 130) + (strike.ko ? 380 : 0),
    }
    at += beat.wind + beat.travel + beat.stop + beat.after
    return beat
  })
  return { beats, total: at }
}

type Point = { x: number, y: number }
type Box = { x: number, y: number, w: number, h: number }

/** Manga focus lines pointing at (x, y). */
function focusLines(c: CanvasRenderingContext2D, x: number, y: number, reach: number, inner: number, color: string, alpha: number, seed: number) {
  c.save()
  c.globalAlpha = alpha
  c.fillStyle = color
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * Math.PI * 2 + rnd(seed, i) * .08
    const r = inner * (1 + rnd(seed, i + 70) * .9)
    const w = .006 + rnd(seed, i + 140) * .022
    c.beginPath()
    c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
    c.lineTo(x + Math.cos(a - w) * reach, y + Math.sin(a - w) * reach)
    c.lineTo(x + Math.cos(a + w) * reach, y + Math.sin(a + w) * reach)
    c.fill()
  }
  c.restore()
}
function speedLines(c: CanvasRenderingContext2D, box: Box, now: number, alpha: number) {
  c.save()
  c.globalAlpha = alpha
  c.fillStyle = '#ffffff'
  for (let i = 0; i < 26; i++) {
    const span = box.w * 1.5
    const x = box.x + ((rnd(11, i) * span - now * (1.2 + rnd(13, i) * 1.4)) % span + span) % span - box.w * .25
    c.fillRect(x, box.y + rnd(17, i) * box.h, 90 + rnd(19, i) * 150, 1.5 + rnd(23, i) * 2.5)
  }
  c.restore()
}
function lettering(c: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, edge: string, tilt = 0, alpha = 1, room = 0) {
  if (alpha <= 0) return
  c.save()
  c.globalAlpha = Math.min(1, alpha)
  c.translate(x, y)
  c.rotate(tilt)
  c.font = `900 ${size}px ${serif}`
  // Long names shrink rather than run off the tray.
  const width = c.measureText(text).width
  if (room && width > room) c.scale(room / width, room / width)
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.lineJoin = 'round'
  c.lineWidth = size * .24
  c.strokeStyle = edge
  c.strokeText(text, 0, 0)
  c.fillStyle = color
  c.fillText(text, 0, 0)
  c.restore()
}

export type Frame = {
  /** How far the attacker's and the target's cards move, and how hard the tray shakes. */
  from: Point, to: Point, shake: Point
  beat: Beat, landed: boolean, frozen: boolean
}

/** Paints the effects at `time`, flying from the attacker's name to the target's, and says where the cards should be. */
export function paint(c: CanvasRenderingContext2D, beats: Beat[], time: number, at: (name: string) => Point, tray: Box): Frame {
  const index = Math.max(0, beats.findLastIndex(beat => beat.start <= time))
  const beat = beats[index]
  const { strike, fx } = beat
  const a = at(strike.from)
  const b = at(strike.to)
  const t = time - beat.start
  const hitAt = beat.wind + beat.travel
  const wind = clamp01(t / beat.wind)
  const travel = clamp01((t - beat.wind) / beat.travel)
  const landed = t >= hitAt
  const frozen = landed && t < hitAt + beat.stop
  const q = clamp01((t - hitAt - beat.stop) / beat.after)
  const { power } = strike
  const heavy = fx.heavy ?? 0
  const seed = index * 7 + strike.damage % 97 + 1
  const jitter = Math.floor(time / (frozen ? 22 : 30))
  const [dx, dy] = [b.x - a.x, b.y - a.y]
  const far = Math.max(60, Math.hypot(dx, dy))
  const scale = Math.max(.42, Math.min(1, far / 400, tray.w / 620))
  const length = far / scale
  const dramatic = power >= 1.35 || heavy >= .8

  // The attacker's name itself rushes the target (or kicks back from a shot); the target is thrown the same way.
  const unit = { x: dx / far, y: dy / far }
  const rush = fx.ranged ? (landed ? 0 : -10 * Math.sin(travel * Math.PI)) : landed ? far * .42 * (1 - ease(clamp01(q * 1.6))) * (frozen ? 1 : 1) : far * .42 * travel ** 2 - 14 * Math.sin(wind * Math.PI) * (travel ? 0 : 1)
  const thrown = landed ? (strike.ko ? 34 : 12 + 9 * power + 8 * heavy) * (frozen ? 1 : (1 - q) ** 2) : 0
  const force = landed ? (frozen ? 1 : (1 - q) ** 3) * (3 + 4.5 * power + 7 * heavy + (strike.crit ? 5 : 0)) : 0
  const rock = (n: number) => (rnd(jitter, n) - .5) * 2
  const from = { x: unit.x * rush, y: unit.y * rush }
  const to = { x: unit.x * thrown + rock(3) * force * .8, y: unit.y * thrown + rock(4) * force * .8 }

  // Colour and lines fill the tray only; the blows themselves may burst out of it.
  c.save()
  c.beginPath(); c.roundRect(tray.x, tray.y, tray.w, tray.h, 12); c.clip()
  if (dramatic && !landed) focusLines(c, a.x, a.y, tray.w + tray.h, 70 * scale + 40, '#ffffff', .05 + .12 * wind, jitter % 5)
  if (fx.flood && landed && q < .5) { c.globalAlpha = .34 * (frozen ? 1 : 1 - q * 2); c.fillStyle = fx.flood; c.fillRect(tray.x, tray.y, tray.w, tray.h); c.globalAlpha = 1 }
  if (frozen && (dramatic || strike.crit)) focusLines(c, b.x, b.y, tray.w + tray.h, 80 * scale + 30, power >= 1.8 || strike.ko ? '#05070a' : '#ffffff', .6, jitter % 4)
  c.restore()

  // Effects are drawn left to right around `origin`, then turned to point from one name to the other.
  const g: G = {
    c, W: origin.x * 2 + length, H: 440, ground: origin.y + origin.floor, power, seed, now: time,
    sx: origin.x - 8, sy: origin.y, ax: origin.x + 10, ay: origin.y, tx: origin.x + length, ty: origin.y,
  }
  if (!fx.ranged && (travel > 0 || landed)) { const reach = landed ? 1 : travel ** 1.6; g.ax = origin.x + 10 + (length - 54) * reach; g.sx = g.ax - 18 }
  c.save()
  c.translate(a.x, a.y)
  if (dx < 0) c.scale(-1, 1)
  c.rotate(Math.atan2(dy, Math.abs(dx)))
  c.scale(scale, scale)
  c.translate(-origin.x, -origin.y)
  if (!landed && t < beat.wind) { c.save(); glow(c, origin.x, origin.y, (46 + 42 * power) * wind, fx.hue[1], .6); fx.charge?.(g, wind); c.restore() }
  if (t >= beat.wind && !landed) { c.save(); glow(c, g.ax, g.ay, 30 + 18 * power, fx.hue[1], .5); fx.travel?.(g, travel); c.restore() }
  if (landed) {
    c.save(); fx.burst?.(g, Math.max(.001, q)); c.restore()
    if (q < .5) {
      const k = frozen ? 1 : 1 - q * 2
      const size = (50 + 24 * power + 18 * heavy) * (frozen ? 1 + rnd(jitter, 5) * .12 : 1)
      c.save(); c.globalAlpha = k
      star(c, g.tx, g.ty, size * 1.25, 11, fx.hue[1], seed + jitter % 3, fx.hue[2])
      star(c, g.tx, g.ty, size * .8, 9, fx.hue[0], seed + 3 + jitter % 3)
      c.restore()
    }
    c.save(); sparks(g, Math.max(.02, q), g.tx, g.ty, fx.hue as unknown as string[], 12 + Math.round(power * 8), 120 + power * 40, 4 + power); c.restore()
  }
  c.restore()
  // One white flash over the target on the very moment of the hit.
  const flash = t - hitAt
  if (landed && flash < 50) glow(c, b.x, b.y, 170 * scale + 60 * power, '#ffffff', 1 - flash / 60)

  // --- Lettering ---------------------------------------------------------------------------------------------------
  const small = tray.w < 460
  const inside = (x: number, pad: number) => Math.max(tray.x + pad, Math.min(tray.x + tray.w - pad, x))
  const foe = strike.side === 'foe'
  if (strike.move && !beat.chained && t < hitAt + beat.stop + beat.after * .35) {
    const slam = clamp01(t / Math.min(170, beat.wind * .7))
    const out = landed ? clamp01((t - hitAt - beat.stop) / (beat.after * .35)) : 0
    if (power >= 1.8) {
      // A slanted band across the tray announces the big ones.
      const open = t < beat.wind ? ease(clamp01(wind * 2.6)) * (wind > .84 ? 1 - (wind - .84) / .16 : 1) : 0
      const middle = tray.y + tray.h / 2
      if (open > 0) {
        c.save()
        c.beginPath(); c.roundRect(tray.x, tray.y, tray.w, tray.h, 12); c.clip()
        const half = Math.min(62, tray.h * .2) * open
        c.beginPath(); c.moveTo(tray.x, middle - half + 18); c.lineTo(tray.x + tray.w, middle - half - 18); c.lineTo(tray.x + tray.w, middle + half - 18); c.lineTo(tray.x, middle + half + 18); c.closePath(); c.clip()
        const band = c.createLinearGradient(tray.x, 0, tray.x + tray.w, 0)
        band.addColorStop(foe ? 1 : 0, fx.hue[2]); band.addColorStop(.5, fx.hue[1]); band.addColorStop(foe ? 0 : 1, '#0c1014')
        c.fillStyle = band
        c.fillRect(tray.x, tray.y, tray.w, tray.h)
        speedLines(c, tray, time * 1.6, .45)
        c.restore()
        lettering(c, strike.from, tray.x + tray.w * (foe ? .8 : .2), middle - half * .1 + (foe ? -14 : 14), small ? 17 : 24, '#ffffff', '#14181c', -.04, open, tray.w * .3)
      }
      lettering(c, strike.move, tray.x + tray.w * (t < beat.wind ? foe ? .36 : .64 : .5), t < beat.wind ? middle : tray.y + (small ? 30 : 36), (small ? 34 : 52) * (2.1 - 1.1 * ease(slam)) * (t < beat.wind ? 1 : .7), '#ffffff', '#14181c', -.06, slam * (1 - out), tray.w * (t < beat.wind ? .56 : .9))
    } else lettering(c, strike.move, inside(a.x, 60), a.y - (small ? 30 : 38) - 12 * ease(slam), (small ? 19 : 27) * (2.1 - 1.1 * ease(slam)), fx.hue[0], '#14181c', foe ? .05 : -.05, slam * (1 - out), tray.w * .46)
  }
  if (landed) {
    const pop = clamp01((t - hitAt) / 130)
    const rise = clamp01((t - hitAt - beat.stop) / beat.after)
    const fadeOut = rise > .78 ? 1 - (rise - .78) / .22 : 1
    const size = (small ? 28 : 38) + 9 * power + (strike.crit ? 12 : 0)
    lettering(c, '−' + strike.damage, inside(b.x, 50), b.y - 6 - rise * 34, size * (1 + 1.1 * (1 - ease(pop))), strike.crit ? '#ffe14a' : foe ? '#ff8a7a' : '#ffffff', strike.crit ? '#a0350f' : '#14181c', (rnd(seed, 3) - .5) * .16, fadeOut)
    if (strike.crit) lettering(c, '會心一擊！', inside(b.x, 60), b.y + 30 - rise * 20, small ? 19 : 25, '#fff3b0', '#a0350f', -.06, clamp01(pop) * fadeOut)
    if (beat.combo > 1 && !foe) lettering(c, beat.combo + ' 連擊', tray.x + tray.w / 2, tray.y + (small ? 24 : 30), (small ? 20 : 28) * (1.6 - .6 * ease(pop)), '#ffd24a', '#14181c', -.08, fadeOut)
    if (strike.ko) {
      const stamp = clamp01((rise - .12) * 6)
      if (stamp > 0) lettering(c, '擊倒', inside(b.x, 60), b.y + 34, (small ? 34 : 48) * (2.4 - 1.4 * ease(stamp)), foe ? '#e04a3a' : '#ffffff', foe ? '#14181c' : '#b5261c', -.14, stamp * fadeOut)
    }
  }
  return { from, to, shake: { x: rock(1) * force, y: rock(2) * force }, beat, landed, frozen }
}

export type Vital = { hp: number, max: number, /** HP once the whole round is over. */ end: number }

/** A round of fighting: everyone's dice roll under their names, then each blow that landed flies from name to name. */
export function FightTray({ ours, foes, more, strikes, vitals, faces, showDice, onDone }: {
  ours: Fighter[], foes: Fighter[], more: number, strikes: Strike[], vitals: Record<string, Vital>, /** Players' portraits by name. */ faces: Record<string, string | undefined>, showDice: boolean, onDone: () => void,
}) {
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [phase, setPhase] = useState<'roll' | 'read' | 'strike'>(showDice && !still ? 'roll' : 'read')
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const done = useRef(onDone)
  done.current = onDone
  const plan = useRef({ strikes, vitals })

  useEffect(() => {
    if (phase === 'strike') return
    const wait = phase === 'roll' ? diceTumble : strikes.length ? (showDice ? settle : 160) : diceHold(ours.length + foes.length)
    const timer = setTimeout(() => phase === 'roll' ? setPhase('read') : strikes.length ? setPhase('strike') : done.current(), wait)
    return () => clearTimeout(timer)
  }, [phase])
  useEffect(() => {
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') done.current() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  useEffect(() => {
    if (phase !== 'strike') return
    const tray = root.current!
    const layer = canvas.current!
    const c = layer.getContext('2d')
    if (!c) { done.current(); return }
    const cards = new Map([...tray.querySelectorAll<HTMLElement>('.fighter')].map(card => [card.dataset.name!, card]))
    const { beats, total } = schedule(plan.current.strikes)
    const hp = new Map(Object.entries(plan.current.vitals).map(([name, vital]) => [name, vital.hp]))
    const hit = new Set<number>()
    let places = new Map<string, Point>()
    let box: Box = { x: 0, y: 0, w: 0, h: 0 }
    const bar = (name: string) => {
      const vital = plan.current.vitals[name]
      const fill = cards.get(name)?.querySelector<HTMLElement>('.fighter-hp i')
      if (vital && fill) fill.style.width = clamp01((hp.get(name) ?? 0) / vital.max) * 100 + '%'
    }
    // Where the names sit while nothing is moving.
    const measure = () => {
      for (const element of [tray, ...cards.values()]) element.style.translate = ''
      const rect = tray.getBoundingClientRect()
      box = { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
      places = new Map([...cards].map(([name, card]) => {
        const r = card.querySelector('.fighter-name')!.getBoundingClientRect()
        return [name, { x: r.left + r.width / 2, y: r.top + r.height / 2 }]
      }))
      const ratio = Math.min(1.6, window.devicePixelRatio || 1)
      layer.width = Math.round(window.innerWidth * ratio)
      layer.height = Math.round(window.innerHeight * ratio)
      c.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
    measure()
    window.addEventListener('resize', measure)
    const centre = (name: string) => places.get(name) ?? { x: box.x + box.w / 2, y: box.y + box.h / 2 }
    const move = (element: HTMLElement | undefined, p: Point) => { if (element) element.style.translate = p.x || p.y ? p.x.toFixed(1) + 'px ' + p.y.toFixed(1) + 'px' : '' }
    let frame = 0
    const start = performance.now()
    const step = (now: number) => {
      const time = now - start
      c.clearRect(0, 0, window.innerWidth, window.innerHeight)
      if (time >= total) {
        for (const [name, card] of cards) { card.style.translate = ''; card.dataset.state = ''; const vital = plan.current.vitals[name]; if (vital) { hp.set(name, vital.end); bar(name) } }
        tray.style.translate = ''
        if (time >= total + linger) { done.current(); return }
      } else {
        const shown = paint(c, beats, time, centre, box)
        const { strike } = shown.beat
        for (const [name, card] of cards) {
          const role = name === strike.from ? 'act' : name === strike.to ? shown.landed ? 'hit' : 'aim' : 'dim'
          if (card.dataset.state !== role) card.dataset.state = role
          move(card, name === strike.from ? shown.from : name === strike.to ? shown.to : { x: 0, y: 0 })
        }
        move(tray, shown.shake)
        if (shown.landed && !hit.has(shown.beat.start)) {
          hit.add(shown.beat.start)
          hp.set(strike.to, strike.hp ?? Math.max(0, (hp.get(strike.to) ?? 0) - strike.damage))
          bar(strike.to)
          if (strike.ko) cards.get(strike.to)!.dataset.down = 'true'
        }
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    // A background tab gets no frames; the show must still end.
    const fallback = setTimeout(() => done.current(), total + linger + 1500)
    return () => { cancelAnimationFrame(frame); clearTimeout(fallback); window.removeEventListener('resize', measure) }
  }, [phase])

  const narrow = window.innerWidth <= 560
  const crowd = Math.max(ours.length, foes.length)
  const size = narrow ? 58 : crowd <= 2 ? 104 : 84
  const settled = phase !== 'roll'
  const side = (fighters: Fighter[], id: 'ours' | 'foe') => <section className="fight-side" data-side={id}>
    <h4>{id === 'foe' ? '敵方' : '我方'}</h4>
    <ul>{fighters.map((fighter, n) => {
      const vital = vitals[fighter.name]
      return <li key={fighter.name} className="fighter" data-name={fighter.name}>
        {id === 'ours' && faces[fighter.name] && <img className="fighter-face" src={faces[fighter.name]} alt=""/>}
        <span className="fighter-name">{fighter.name}</span>
        {vital && <span className="fighter-hp"><i style={{ width: clamp01(vital.hp / vital.max) * 100 + '%' }}/></span>}
        {showDice && fighter.rolls.length > 0 && <div className="fighter-dice">{fighter.rolls.map((roll, i) => {
          const target = roll.label.split(' → ')[1]
          return <div key={i} data-tone={settled ? toneOf(roll, id) : 'rolling'}>
            <Die roll={roll} side={id} index={n + i} size={fighter.rolls.length > 1 ? Math.round(size * .8) : size} settled={settled} still={still}/>
            <strong>{settled ? roll.total === undefined ? roll.natural : roll.total + (roll.target === undefined ? '' : '／' + roll.target) : '…'}</strong>
            <span className="fighter-verdict">{settled ? verdict(roll) : '擲骰中'}</span>
            {target && <small>→ {target}</small>}
          </div>
        })}</div>}
      </li>
    })}</ul>
  </section>
  // The log announces the same result in words, so all of this is decoration to a screen reader.
  return <>
    <div ref={root} className="fight-tray" aria-hidden="true" onClick={() => phase === 'roll' ? setPhase('read') : done.current()}>
      <div className="fight-sides">{side(ours, 'ours')}{side(foes, 'foe')}</div>
      <p>{more > 0 && '另外還有 ' + more + ' 次擲骰，見紀錄 · '}點一下跳過</p>
    </div>
    {phase === 'strike' && <canvas ref={canvas} className="fight-fx" aria-hidden="true"/>}
  </>
}

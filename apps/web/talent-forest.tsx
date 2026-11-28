import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import type { Message } from '../../packages/shared/protocol.ts'
import { beli } from '../../packages/world/scale.ts'
import { islandAt, islands } from '../../packages/world/sea.ts'
import {
  freeTalents, learnBlock, needMet, needText, ownedTalents, pathTo, refundBlock, regionInfo, resetPricePerLevel, talentList, talentNodes,
  talentPointsEarned, talentPointsLeft, talentSectors, talentsPerLevel,
} from '../../packages/world/talents.ts'
import type { TalentNode, TalentRegion } from '../../packages/world/talents.ts'
import type { Character } from '../../packages/world/village.ts'
import './talent-forest.css'

type State = 'owned' | 'open' | 'reach' | 'locked'
const radius = { minor: 8, notable: 16, keystone: 24, root: 22 } as const
const kindLabel = { minor: '小節點', notable: '大天賦', keystone: '終極天賦', root: '起點' } as const
const margin = 260
const xs = talentList.map(n => n.x), ys = talentList.map(n => n.y)
const bounds = { x: Math.min(...xs) - margin, y: Math.min(...ys) - margin, w: Math.max(...xs) - Math.min(...xs) + margin * 2, h: Math.max(...ys) - Math.min(...ys) + margin * 2 }
const edges: [string, string][] = []
for (const node of talentList) for (const other of node.links) if (node.id < other) edges.push([node.id, other])
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const polar = (r: number, deg: number) => [Math.cos(deg * Math.PI / 180) * r, Math.sin(deg * Math.PI / 180) * r] as const
/** How far each sea's nodes reach, for its name on the rim. */
const reach = Object.fromEntries((Object.keys(talentSectors) as (keyof typeof talentSectors)[]).map(region =>
  [region, Math.max(...talentList.filter(n => n.region === region).map(n => Math.hypot(n.x, n.y)))])) as Record<keyof typeof talentSectors, number>
const glyph = (node: TalentNode) => node.name.replace(/^(覺醒・|霸王色)/, m => m === '霸王色' ? '霸' : '覺')[0]

/** What every node looks like for this character right now. */
function statesFor(c: Character) {
  const owned = ownedTalents(c)
  const left = talentPointsLeft(c)
  const states = new Map<string, State>()
  for (const node of talentList) {
    if (owned.has(node.id)) states.set(node.id, 'owned')
    else if ((node.kind === 'root' && !node.id.startsWith('job.')) || !needMet(c, node.need)) states.set(node.id, 'locked')
    else states.set(node.id, learnBlock(c, node.id, owned, left) ? 'reach' : 'open')
  }
  return { owned, left, states }
}

/** The sea, its compass and the names of the five seas: drawn once. */
const Backdrop = memo(function Backdrop({ open }: { open: Partial<Record<TalentRegion, boolean>> }) {
  const wedges = (Object.keys(talentSectors) as (keyof typeof talentSectors)[]).map(region => {
    const { centre, width } = talentSectors[region]
    const [a, b] = [centre - width / 2, centre + width / 2]
    const [r0, r1] = [420, reach[region] + 70]
    const [p, q, s, t] = [polar(r0, a), polar(r1, a), polar(r1, b), polar(r0, b)]
    const d = `M${p}L${q}A${r1} ${r1} 0 0 1 ${s}L${t}A${r0} ${r0} 0 0 0 ${p}Z`
    const [lx, ly] = polar(reach[region] + 170, centre)
    return <g key={region} className="tf-sea" data-region={region} data-closed={!open[region] || undefined}>
      <path d={d} fill={regionInfo[region].colour}/>
      <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fill={regionInfo[region].colour}>
        {regionInfo[region].label}{!open[region] && <tspan className="tf-sea-lock" x={lx} dy="1.4em">{region === 'fruit' ? '吃下果實後開啟' : '兩年修行後開啟'}</tspan>}
      </text>
    </g>
  })
  return <g aria-hidden="true">
    <rect x={bounds.x - 400} y={bounds.y - 400} width={bounds.w + 800} height={bounds.h + 800} fill="url(#tf-deep)"/>
    {[400, 700, 1000, 1300].map(r => <circle key={r} r={r} className="tf-lat"/>)}
    {Array.from({ length: 16 }, (_, i) => { const [x, y] = polar(1700, i * 22.5); return <line key={i} x1="0" y1="0" x2={x} y2={y} className="tf-rhumb" data-main={i % 4 === 0 || undefined}/> })}
    {wedges}
    <g className="tf-wheel">
      <circle r="58" className="tf-wheel-rim"/>
      <circle r="44" className="tf-wheel-inner"/>
      {Array.from({ length: 8 }, (_, i) => { const [x, y] = polar(76, i * 45); const [ix, iy] = polar(14, i * 45); return <g key={i}>
        <line x1={ix} y1={iy} x2={x} y2={y} className="tf-spoke"/><circle cx={x} cy={y} r="6" className="tf-knob"/></g> })}
      <circle r="14" className="tf-hub"/>
    </g>
  </g>
})

/** Every link between nodes; lit where both ends are learned, bright where one end is. */
const Edges = memo(function Edges({ states }: { states: Map<string, State>, stamp: string }) {
  return <g className="tf-edges" aria-hidden="true">{edges.map(([a, b]) => {
    const [na, nb] = [talentNodes.get(a)!, talentNodes.get(b)!]
    const [sa, sb] = [states.get(a), states.get(b)]
    const kind = sa === 'owned' && sb === 'owned' ? 'owned' : (sa === 'owned' && sb === 'open') || (sb === 'owned' && sa === 'open') ? 'open'
      : sa === 'locked' || sb === 'locked' ? 'locked' : 'idle'
    return <line key={a + '|' + b} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} className="tf-edge" data-kind={kind}/>
  })}</g>
})

/** The nodes. One listener on the layer finds which node was hit, so 500 nodes do not need 500 handlers. */
const Nodes = memo(function Nodes({ states, matches, fresh }: { states: Map<string, State>, stamp: string, matches: Set<string> | null, fresh: Map<string, number> }) {
  return <g className="tf-nodes" data-searching={matches ? '' : undefined}>
    {/* Learned nodes glow through one shared blur. */}
    <g filter="url(#tf-glow)" aria-hidden="true">{talentList.filter(n => states.get(n.id) === 'owned').map(n =>
      <circle key={n.id} cx={n.x} cy={n.y} r={radius[n.kind] + (n.kind === 'minor' ? 4 : 7)} fill={n.kind === 'keystone' ? '#ffcf6b' : '#e8b54f'} opacity={n.kind === 'minor' ? .55 : .8}/>)}</g>
    {talentList.map(node => {
      const state = states.get(node.id)!
      const r = radius[node.kind]
      const delay = fresh.get(node.id)
      return <g key={node.id} data-id={node.id} data-kind={node.kind} data-state={state} data-match={matches?.has(node.id) || undefined}
        data-fresh={delay !== undefined || undefined} className="tf-node" transform={`translate(${node.x} ${node.y})`}
        style={{ '--c': regionInfo[node.region].colour, '--d': (delay ?? 0) + 'ms' } as CSSProperties}>
        <g className="tf-in">
          <circle r={r + 14} className="tf-hit"/>
          {node.kind === 'minor' && <circle r={r} className="tf-body"/>}
          {node.kind === 'notable' && <><circle r={r + 4} className="tf-frame"/><circle r={r} className="tf-body"/><text className="tf-glyph" dy=".36em">{glyph(node)}</text></>}
          {node.kind === 'keystone' && <><rect x={-r - 4} y={-r - 4} width={(r + 4) * 2} height={(r + 4) * 2} rx="4" transform="rotate(45)" className="tf-frame"/>
            <rect x={-r + 3} y={-r + 3} width={(r - 3) * 2} height={(r - 3) * 2} rx="3" transform="rotate(45)" className="tf-body"/><text className="tf-glyph" dy=".36em">{glyph(node)}</text></>}
          {node.kind === 'root' && <><circle r={r} className="tf-body"/>
            {Array.from({ length: 8 }, (_, i) => { const [x, y] = polar(r + 7, i * 45); return <line key={i} x1="0" y1="0" x2={x} y2={y} className="tf-root-spoke"/> })}
            <circle r={r - 7} className="tf-root-core"/></>}
          {state === 'locked' && node.kind !== 'minor' && <path d="M-5 -1v-3a5 5 0 0 1 10 0v3M-7 -1h14v9h-14z" className="tf-lock" transform={`translate(${r * .7} ${-r * .7}) scale(.8)`}/>}
        </g>
        {node.kind !== 'minor' && <text className="tf-label" y={r + (node.kind === 'keystone' ? 24 : 18)}>{node.kind === 'root' && node.id.startsWith('job.') ? node.name.replace('的起點', '') : node.name}</text>}
      </g>
    })}
  </g>
})

type Frame = { x: number, y: number, unit: number }
type Toast = { id: number, text: string, tone: 'good' | 'bad' | 'big' }

/** The whole talent forest in a dialog: drag and zoom the chart, pick a node, learn the way to it. */
export function TalentForestDialog({ c, send, locked, lockReason, onClose }: {
  c: Character, send: (msg: Message) => Promise<unknown>, locked: boolean, lockReason: string, onClose: () => void,
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [frame, setFrame] = useState<Frame>()
  const [selected, setSelected] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState<string[]>([])
  const [error, setError] = useState('')
  const [shake, setShake] = useState(0)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [flash, setFlash] = useState<{ colour: string, key: number } | null>(null)
  const [fresh, setFresh] = useState<Map<string, number>>(new Map())
  const [fading, setFading] = useState<string[]>([])
  const [confirmReset, setConfirmReset] = useState(false)
  const pointers = useRef(new Map<number, { x: number, y: number }>())
  const dragged = useRef(0)
  const order = useRef<string[]>([])

  const stamp = [c.level, c.profession, c.fruit ?? '', c.haki?.trained ? 1 : 0, c.haki?.conqueror ? 1 : 0, c.weapon, ...c.talents].join(',')
  const { owned, left, states } = useMemo(() => statesFor(c), [stamp])
  const earned = talentPointsEarned(c.level)
  const matches = useMemo(() => {
    const q = query.trim()
    if (!q) return null
    return new Set(talentList.filter(n => n.kind !== 'minor' ? n.name.includes(q) || n.text.includes(q) : n.name.includes(q)).map(n => n.id))
  }, [query])
  const matchList = useMemo(() => matches ? talentList.filter(n => matches.has(n.id) && n.kind !== 'minor').slice(0, 30) : [], [matches])

  // Newly learned nodes light up one after another along the way they were picked; given-back ones fade out.
  const before = useRef(owned)
  useEffect(() => {
    const added = [...owned].filter(id => !before.current.has(id))
    const removed = [...before.current].filter(id => !owned.has(id))
    before.current = owned
    if (added.length) {
      const sorted = [...added].sort((a, b) => (order.current.indexOf(a) + 1 || 999) - (order.current.indexOf(b) + 1 || 999))
      setFresh(new Map(sorted.map((id, i) => [id, i * 90])))
      const big = sorted.map(id => talentNodes.get(id)!).find(n => n.kind === 'keystone')
      if (big) setFlash({ colour: regionInfo[big.region].colour, key: Date.now() })
      navigator.vibrate?.(big ? [18, 50, 30] : 12)
      const timer = setTimeout(() => setFresh(new Map()), 900 + sorted.length * 90)
      return () => clearTimeout(timer)
    }
    if (removed.length) {
      setFading(removed)
      const timer = setTimeout(() => setFading([]), 700)
      return () => clearTimeout(timer)
    }
  }, [owned])

  const toast = (text: string, tone: Toast['tone']) => {
    const id = Date.now() + Math.random()
    setToasts(list => [...list.slice(-2), { id, text, tone }])
    setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), tone === 'bad' ? 3600 : 2600)
  }

  const fit = (f: Frame, box = size): Frame => {
    const unit = clamp(f.unit, .45, Math.max(bounds.w / box.w, bounds.h / box.h) * 1.05)
    return { unit, x: clamp(f.x, bounds.x, bounds.x + bounds.w), y: clamp(f.y, bounds.y, bounds.y + bounds.h) }
  }
  /** Starts on what the character already has: the middle of their learned nodes. */
  const home = (box = size): Frame => {
    const mine = talentList.filter(n => owned.has(n.id))
    const cx = mine.reduce((s, n) => s + n.x, 0) / mine.length, cy = mine.reduce((s, n) => s + n.y, 0) / mine.length
    return fit({ x: cx, y: cy, unit: Math.max(.9, Math.min(1.6, 900 / Math.max(box.w, 1))) }, box)
  }
  const zoom = (factor: number, cx = size.w / 2, cy = size.h / 2) => setFrame(f => {
    if (!f) return f
    const unit = clamp(f.unit * factor, .45, Math.max(bounds.w / size.w, bounds.h / size.h) * 1.05)
    return fit({ unit, x: f.x + (cx - size.w / 2) * (f.unit - unit), y: f.y + (cy - size.h / 2) * (f.unit - unit) })
  })
  const focus = (id: string) => {
    const node = talentNodes.get(id)!
    setSelected(id)
    setFrame(f => fit({ x: node.x, y: node.y, unit: Math.min(f?.unit ?? 1.2, 1.3) }))
  }

  useEffect(() => { const element = dialog.current!; if (!element.open) element.showModal() }, [])
  useLayoutEffect(() => {
    const element = svg.current!
    const measure = () => {
      const box = { w: element.clientWidth, h: element.clientHeight }
      if (!box.w || !box.h) return
      setSize(box)
      setFrame(f => f ? fit(f, box) : home(box))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const element = svg.current!
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      const box = element.getBoundingClientRect()
      zoom(event.deltaY > 0 ? 1.15 : 1 / 1.15, event.clientX - box.left, event.clientY - box.top)
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => element.removeEventListener('wheel', wheel)
  })

  const down = (event: ReactPointerEvent) => {
    if (!pointers.current.size) dragged.current = 0
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
  }
  const move = (event: ReactPointerEvent) => {
    const last = pointers.current.get(event.pointerId)
    if (!last) {
      if (event.pointerType === 'mouse') setHover(((event.target as Element).closest('[data-id]') as SVGElement | null)?.dataset.id ?? null)
      return
    }
    const now = { x: event.clientX, y: event.clientY }
    const other = [...pointers.current].find(([id]) => id !== event.pointerId)?.[1]
    pointers.current.set(event.pointerId, now)
    dragged.current += Math.abs(now.x - last.x) + Math.abs(now.y - last.y)
    if (dragged.current > 6 && !svg.current!.hasPointerCapture(event.pointerId)) svg.current!.setPointerCapture(event.pointerId)
    if (other) {
      const box = svg.current!.getBoundingClientRect()
      const [b, a] = [Math.hypot(last.x - other.x, last.y - other.y), Math.hypot(now.x - other.x, now.y - other.y)]
      if (b && a) zoom(b / a, (now.x + other.x) / 2 - box.left, (now.y + other.y) / 2 - box.top)
    } else setFrame(f => f && fit({ ...f, x: f.x - (now.x - last.x) * f.unit, y: f.y - (now.y - last.y) * f.unit }))
  }
  const up = (event: ReactPointerEvent) => { pointers.current.delete(event.pointerId) }
  const pick = (event: ReactMouseEvent) => {
    if (dragged.current > 6) return
    const id = ((event.target as Element).closest('[data-id]') as SVGElement | null)?.dataset.id
    setError('')
    setConfirmReset(false)
    setSelected(id ?? null)
  }

  const learn = async (ids: string[]) => {
    if (!ids.length || pending.length) return
    order.current = ids
    setPending(ids)
    setError('')
    try {
      await send({ kind: 'learnTalents', ids })
      const named = ids.map(id => talentNodes.get(id)!).filter(n => n.kind !== 'minor')
      const big = named.find(n => n.kind === 'keystone')
      toast(big ? '終極天賦「' + big.name + '」覺醒！' : named.length ? '學會了' + named.map(n => '「' + n.name + '」').join('') : '學會了 ' + ids.length + ' 個天賦', big ? 'big' : 'good')
    } catch (failure) {
      const text = failure instanceof Error ? failure.message : String(failure)
      setError(text)
      setShake(n => n + 1)
      toast(text, 'bad')
      navigator.vibrate?.([30, 40, 30])
    } finally { setPending([]) }
  }
  const refund = async (id: string) => {
    setError('')
    try { await send({ kind: 'refundTalent', id }); toast('退回了「' + talentNodes.get(id)!.name + '」', 'good') }
    catch (failure) { const text = failure instanceof Error ? failure.message : String(failure); setError(text); setShake(n => n + 1); toast(text, 'bad') }
  }
  const reset = async () => {
    if (!confirmReset) { setConfirmReset(true); return }
    setConfirmReset(false)
    try { await send({ kind: 'resetTalents' }); toast('天賦林全部重置了', 'good'); setSelected(null) }
    catch (failure) { const text = failure instanceof Error ? failure.message : String(failure); setError(text); toast(text, 'bad') }
  }

  const view = frame ?? { x: 0, y: 0, unit: 2 }
  const zoomLevel = view.unit > 2 ? 'far' : view.unit > 1.15 ? 'mid' : 'near'
  // The panel works on the picked node; the chart previews the way to whatever the mouse is on, or else the picked node.
  const path = useMemo(() => selected && !owned.has(selected) ? pathTo(c, selected) : [], [selected, stamp])
  const previewing = hover && !owned.has(hover) ? hover : selected
  const preview = useMemo(() => previewing === selected ? path : previewing ? pathTo(c, previewing) : [], [previewing, path, stamp])
  const pathBlock = useMemo(() => {
    if (!path.length) return undefined
    const have = new Set(owned)
    let points = left
    for (const id of path) {
      const block = learnBlock(c, id, have, points)
      if (block) return block
      have.add(id)
      points--
    }
  }, [path, stamp])
  const node = selected ? talentNodes.get(selected)! : undefined
  const free = new Set(freeTalents(c))
  const open: Partial<Record<TalentRegion, boolean>> = { combat: true, sea: true, grit: true, start: true, fruit: !!c.fruit, haki: !!c.haki?.trained }
  const spent = (region: TalentRegion) => c.talents.filter(id => talentNodes.get(id)?.region === region).length
  const atPort = islands[islandAt(c.place)].port === c.place

  let detail: ReactNode
  if (node) {
    const state = states.get(node.id)!
    const refuse = state === 'owned' ? refundBlock(c, node.id) : undefined
    detail = <>
      <p className="tf-card-kicker" style={{ color: regionInfo[node.region].colour }}>{regionInfo[node.region].label} · {kindLabel[node.kind]}</p>
      <h3 className="tf-card-name">{node.name}</h3>
      <p className="tf-card-text">{node.text}</p>
      {node.need && <p className="tf-card-need" data-met={needMet(c, node.need) || undefined}>{needText(node.need)}{needMet(c, node.need) ? '（已符合）' : ''}</p>}
      {state === 'owned' && (free.has(node.id)
        ? <p className="tf-card-state" data-tone="gold">免費的起點，一直都在。</p>
        : <>
          <p className="tf-card-state" data-tone="gold">已學會</p>
          <button type="button" className="light tf-act" disabled={locked || !!refuse} onClick={() => refund(node.id)}>退回這一點</button>
          {refuse && <p className="tf-card-hint">{refuse}</p>}
        </>)}
      {state !== 'owned' && path.length > 0 && <>
        <p className="tf-card-state">{path.length === 1 ? '連著你已經學會的天賦。' : '最短路線要經過 ' + (path.length - 1) + ' 個天賦。'}</p>
        <button type="button" className="tf-act tf-learn" data-pending={pending.length > 0 || undefined} disabled={locked || !!pathBlock || pending.length > 0} onClick={() => learn(path)}>
          {pending.length ? '學習中…' : path.length === 1 ? '學習（1 點）' : '學習這條路線（' + path.length + ' 點）'}
        </button>
        {pathBlock && <p className="tf-card-hint">{pathBlock}</p>}
      </>}
      {state !== 'owned' && !path.length && <p className="tf-card-hint">{node.kind === 'root' && !node.id.startsWith('job.') ? node.text : !needMet(c, node.need) ? needText(node.need) + '。' : '從你現在的位置走不到這裡。'}</p>}
      {locked && <p className="tf-card-hint">{lockReason}</p>}
      {error && <p className="tf-card-error" key={shake}>{error}</p>}
    </>
  } else {
    detail = <>
      <p className="tf-card-kicker">天賦林</p>
      <h3 className="tf-card-name">{c.name} · {c.level} 級</h3>
      <p className="tf-card-text">每升 1 級得 {talentsPerLevel} 點。點一個天賦看說明；離你很遠的天賦，會自動找出最短路線。</p>
      <ul className="tf-seas">{(['start', 'combat', 'sea', 'grit', 'fruit', 'haki'] as TalentRegion[]).map(region => <li key={region} data-closed={!open[region] || undefined}>
        <span className="tf-dot" style={{ background: regionInfo[region].colour }}/>
        <span><strong>{regionInfo[region].label}</strong><small>{regionInfo[region].about}</small></span>
        <b>{spent(region)}</b>
      </li>)}</ul>
      <Bonuses c={c}/>
      <div className="tf-reset">
        <button type="button" className="light" disabled={locked || !c.talents.length || !atPort} onClick={reset}>
          {confirmReset ? '再按一次：花 ' + beli(resetPricePerLevel * c.level) + '全部重置' : '全部重置（' + beli(resetPricePerLevel * c.level) + '）'}
        </button>
        <small>{atPort ? '一個一個退回不用錢。' : '全部重置要在港口；一個一個退回隨時都可以。'}</small>
      </div>
      {error && <p className="tf-card-error" key={shake}>{error}</p>}
    </>
  }

  const at = selected ? talentNodes.get(selected) : undefined
  const tip = hover && hover !== selected ? talentNodes.get(hover) : undefined
  const screen = (x: number, y: number) => ({ left: (x - view.x) / view.unit + size.w / 2, top: (y - view.y) / view.unit + size.h / 2 })

  return <dialog ref={dialog} className="talent-forest" aria-label="天賦林" onClose={onClose} onCancel={onClose}>
    <header className="tf-head">
      <h2>天賦林</h2>
      <div className="tf-points" aria-live="polite">
        <span>剩餘天賦點</span><b key={left} className="tf-points-num" data-empty={left <= 0 || undefined}>{left}</b><small>／{earned}</small>
      </div>
      <input type="search" className="tf-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="搜尋天賦，例如「爆擊」" aria-label="搜尋天賦"
        onKeyDown={e => { if (e.key === 'Enter' && matchList.length) focus(matchList[(matchList.findIndex(n => n.id === selected) + 1) % matchList.length].id) }}/>
      <div className="button-row tf-tools">
        <button type="button" className="light" aria-label="放大" onClick={() => zoom(1 / 1.35)}>＋</button>
        <button type="button" className="light" aria-label="縮小" onClick={() => zoom(1.35)}>－</button>
        <button type="button" className="light" onClick={() => setFrame(home())}>我的天賦</button>
        <button type="button" className="light" onClick={() => setFrame(fit({ x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2, unit: 99 }))}>全圖</button>
        <button type="button" onClick={onClose}>關閉</button>
      </div>
    </header>
    <div className="tf-body-grid">
      <div className="tf-view" data-zoom={zoomLevel}>
        <svg ref={svg} viewBox={[view.x - size.w * view.unit / 2, view.y - size.h * view.unit / 2, size.w * view.unit || bounds.w, size.h * view.unit || bounds.h].join(' ')}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={e => { up(e); setHover(null) }}
          onClick={pick} role="group" aria-label="天賦林的節點">
          <defs>
            <radialGradient id="tf-deep" cx="0" cy="0" r={Math.max(bounds.w, bounds.h) * .75} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#1a3a52"/><stop offset=".55" stopColor="#0f2537"/><stop offset="1" stopColor="#081521"/>
            </radialGradient>
            <filter id="tf-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
          </defs>
          <Backdrop open={open}/>
          <Edges states={states} stamp={stamp}/>
          {/* The way to the picked (or pointed-at) node. */}
          {preview.length > 0 && <g className="tf-route" data-blocked={(preview === path && !!pathBlock) || preview.length > left || undefined} aria-hidden="true">
            {[...preview.map((id, i) => [i === 0 ? talentNodes.get(id)!.links.find(l => owned.has(l))! : preview[i - 1], id])].map(([a, b]) => {
              const [na, nb] = [talentNodes.get(a)!, talentNodes.get(b)!]
              return <line key={a + b} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}/>
            })}
            {preview.map((id, i) => { const n = talentNodes.get(id)!; return <circle key={id} cx={n.x} cy={n.y} r={radius[n.kind] + 6} style={{ animationDelay: i * 40 + 'ms' }}/> })}
          </g>}
          {/* Edges just learned draw themselves in. */}
          {fresh.size > 0 && <g className="tf-draw" aria-hidden="true">{edges.filter(([a, b]) => owned.has(a) && owned.has(b) && (fresh.has(a) || fresh.has(b))).map(([a, b]) => {
            const [na, nb] = [talentNodes.get(a)!, talentNodes.get(b)!]
            const [from, to] = fresh.has(a) && !fresh.has(b) ? [nb, na] : (fresh.get(a) ?? 0) > (fresh.get(b) ?? 0) ? [nb, na] : [na, nb]
            return <line key={a + b} x1={from.x} y1={from.y} x2={to.x} y2={to.y} pathLength={1} style={{ animationDelay: Math.max(0, (fresh.get(to.id) ?? 0) - 60) + 'ms' }}/>
          })}</g>}
          <Nodes states={states} stamp={stamp} matches={matches} fresh={fresh}/>
          {pending.length > 0 && <g className="tf-charge" aria-hidden="true">{pending.map(id => { const n = talentNodes.get(id)!; return <circle key={id} cx={n.x} cy={n.y} r={radius[n.kind] + 9}/> })}</g>}
          {[...fresh].map(([id, delay]) => { const n = talentNodes.get(id)!; return <g key={'b' + id} className="tf-burst" data-kind={n.kind} transform={`translate(${n.x} ${n.y})`} style={{ '--d': delay + 'ms', '--c': regionInfo[n.region].colour } as CSSProperties} aria-hidden="true">
            <circle r={radius[n.kind] + 4}/><circle r={radius[n.kind] + 4} className="tf-burst-2"/>
            {n.kind !== 'minor' && Array.from({ length: n.kind === 'keystone' ? 12 : 8 }, (_, i) => { const [x, y] = polar(radius[n.kind] + 30, i * (n.kind === 'keystone' ? 30 : 45)); return <line key={i} x1="0" y1="0" x2={x} y2={y} className="tf-spark"/> })}
          </g> })}
          {fading.map(id => { const n = talentNodes.get(id)!; return <circle key={'f' + id} cx={n.x} cy={n.y} r={radius[n.kind] + 6} className="tf-fade" aria-hidden="true"/> })}
          {at && <circle key={selected! + shake} cx={at.x} cy={at.y} r={radius[at.kind] + 10} className="tf-picked" data-shake={shake > 0 || undefined} aria-hidden="true"/>}
        </svg>
        {tip && size.w > 0 && <div className="tf-tip" style={screen(tip.x, tip.y)} aria-hidden="true">
          <strong>{tip.name}</strong>{tip.kind !== 'minor' && <span>{tip.text}</span>}
          {!owned.has(tip.id) && preview.length > 0 && <em>{preview.length > left ? '要 ' + preview.length + ' 點，點數不夠' : '學到這裡要 ' + preview.length + ' 點'}</em>}
        </div>}
        {flash && <div key={flash.key} className="tf-flash" style={{ '--c': flash.colour } as CSSProperties} onAnimationEnd={() => setFlash(null)} aria-hidden="true"/>}
        <ol className="tf-toasts" aria-live="polite">{toasts.map(t => <li key={t.id} data-tone={t.tone}>{t.text}</li>)}</ol>
        <ul className="tf-legend" aria-label="圖例">
          <li><svg width="16" height="16" viewBox="-12 -12 24 24" aria-hidden="true"><circle r="8" fill="#e8b54f" stroke="#fff3c4" strokeWidth="2.5"/></svg>已學會</li>
          <li><svg width="16" height="16" viewBox="-12 -12 24 24" aria-hidden="true"><circle r="8" fill="#10283a" stroke="#fff" strokeWidth="2.5"/></svg>可以學</li>
          <li><svg width="16" height="16" viewBox="-12 -12 24 24" aria-hidden="true"><circle r="8" fill="#10283a" stroke="#4f9bd6" strokeWidth="2.5"/></svg>還連不到</li>
          <li><svg width="16" height="16" viewBox="-12 -12 24 24" aria-hidden="true"><rect x="-7" y="-7" width="14" height="14" transform="rotate(45)" fill="#10283a" stroke="#e0704c" strokeWidth="2.5"/></svg>終極天賦</li>
        </ul>
      </div>
      <section className="tf-card" aria-label="天賦說明" aria-live="polite" data-has={node ? '' : undefined}>
        {matches && <div className="tf-results">
          <p className="tf-card-kicker">找到 {matches.size} 個{matchList.length < matches.size ? '（列出大天賦）' : ''}</p>
          <ul>{matchList.map(n => <li key={n.id}><button type="button" className="tf-result" data-state={states.get(n.id)} onClick={() => focus(n.id)}
            style={{ '--c': regionInfo[n.region].colour } as CSSProperties}><span className="tf-dot"/>{n.name}<small>{regionInfo[n.region].label}</small></button></li>)}</ul>
        </div>}
        {detail}
        {node && <button type="button" className="link tf-back" onClick={() => setSelected(null)}>回到總覽</button>}
      </section>
    </div>
  </dialog>
}

/** What everything learned adds up to: the small nodes summed, the named ones listed. */
function Bonuses({ c }: { c: Character }) {
  const owned = [...ownedTalents(c)].map(id => talentNodes.get(id)!).filter(Boolean)
  const sums = new Map<string, number>()
  for (const n of owned.filter(n => n.kind === 'minor' || (n.kind === 'root' && n.text.includes('：')))) {
    const text = n.kind === 'root' ? n.text.replace(/^職業起點：|。$/g, '') : n.name
    const m = /^(.*?)\s*([+−-])\s*(\d+)(%?)$/.exec(text)
    if (!m) { sums.set(text, (sums.get(text) ?? 0) + 1); continue }
    const key = m[1] + '\u0000' + m[2] + '\u0000' + m[4]
    sums.set(key, (sums.get(key) ?? 0) + Number(m[3]))
  }
  const lines = [...sums].map(([key, value]) => {
    const [label, sign, unit] = key.split('\u0000')
    return unit === undefined ? label : label + ' ' + sign + value + unit
  })
  const named = owned.filter(n => n.kind === 'notable' || n.kind === 'keystone')
  if (!lines.length && !named.length) return <p className="tf-card-hint">還沒學任何天賦。</p>
  return <div className="tf-bonus">
    <h4>目前加成</h4>
    {lines.length > 0 && <ul className="tf-sums">{lines.map(line => <li key={line}>{line}</li>)}</ul>}
    {named.length > 0 && <ul className="tf-named">{named.map(n => <li key={n.id} data-kind={n.kind} style={{ '--c': regionInfo[n.region].colour } as CSSProperties}>
      <strong>{n.name}</strong><small>{n.text}</small></li>)}</ul>}
  </div>
}

/** The forest in miniature for the character panel: the learned nodes in gold. Opens the whole forest. */
export const TalentPreview = memo(function TalentPreview({ c, onOpen }: { c: Character, onOpen: () => void }) {
  const owned = ownedTalents(c)
  const left = talentPointsLeft(c)
  return <button type="button" className="tf-preview" onClick={onOpen} aria-label="開啟天賦林">
    <svg viewBox={[bounds.x, bounds.y, bounds.w, bounds.h].join(' ')} aria-hidden="true">
      <rect x={bounds.x} y={bounds.y} width={bounds.w} height={bounds.h} fill="#0d2232"/>
      {edges.map(([a, b]) => { const [na, nb] = [talentNodes.get(a)!, talentNodes.get(b)!]; const lit = owned.has(a) && owned.has(b)
        return <line key={a + b} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke={lit ? '#e8b54f' : '#2a4b62'} strokeWidth={lit ? 14 : 6}/> })}
      {talentList.map(n => <circle key={n.id} cx={n.x} cy={n.y} r={n.kind === 'minor' ? 12 : 24}
        fill={owned.has(n.id) ? '#f1c96b' : regionInfo[n.region].colour} opacity={owned.has(n.id) ? 1 : .45}/>)}
    </svg>
    <span className="tf-preview-open">開啟天賦林{left > 0 && <b>{left} 點可用</b>}</span>
  </button>
})

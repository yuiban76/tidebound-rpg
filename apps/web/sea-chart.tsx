import { memo, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { locations, npcs } from '../../packages/shared/protocol.ts'
import type { IslandId, SailingPace } from '../../packages/shared/protocol.ts'
import { canonTimeline } from '../../packages/world/canon.ts'
import { hasFlag } from '../../packages/world/flags.ts'
import { luffyNow } from '../../packages/world/luffy.ts'
import { islandAt, islands, paceNames, routeNeeds, routesFrom } from '../../packages/world/sea.ts'
import { bands, chart, chartIslands, chartLanes, redLine, redLineShape, reversePeak, seaPath, seeded } from '../../packages/world/seachart.ts'
import { party } from '../../packages/world/village.ts'
import { IslandArt, ShipMark, StrawHat } from './island-art.tsx'
import type { View } from './network.ts'
import './sea-chart.css'

const ids = Object.keys(chartIslands) as IslandId[]
const { width: W, height: H } = chart

const mountains = (cx: number) => {
  const random = seeded('ridge' + cx)
  return Array.from({ length: 44 }, (_, i) => {
    const [x, y, s] = [cx - 14 + random() * 28, 14 + i * 29 + random() * 10, 7 + random() * 7]
    return `M${x - s} ${y}L${x} ${y - s * 1.5}L${x + s} ${y}M${x} ${y - s * 1.5}L${x + s * .25} ${y - s * .5}`
  }).join('')
}
const waves = (() => {
  const random = seeded('waves')
  return Array.from({ length: 150 }, () => {
    const [x, y] = [random() * W, random() * H]
    return `M${x} ${y}q5 -6 10 0q5 6 10 0`
  }).join('')
})()

/** Everything on the chart that never changes: seas, Calm Belts, Red Line, names. */
const Ocean = memo(function Ocean({ uid }: { uid: string }) {
  const band = ([from, to]: readonly [number, number], fill: string) => <rect x="0" y={from} width={W} height={to - from} fill={fill}/>
  const [px, py] = reversePeak
  return <>
    <defs>
      <linearGradient id={uid + 'blue'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bcdcdc"/><stop offset="1" stopColor="#a5cfd3"/></linearGradient>
      <linearGradient id={uid + 'grand'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#84b9c6"/><stop offset=".5" stopColor="#74adbf"/><stop offset="1" stopColor="#84b9c6"/></linearGradient>
      <linearGradient id={uid + 'red'} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#a9593f"/><stop offset=".45" stopColor="#cf8461"/><stop offset="1" stopColor="#99492f"/></linearGradient>
      <pattern id={uid + 'calm'} width="26" height="9" patternUnits="userSpaceOnUse"><rect width="26" height="9" fill="#cfe0cf"/><path d="M0 4.5H16" stroke="#9dbba9" strokeWidth="1.2"/></pattern>
      <pattern id={uid + 'grid'} width="100" height="100" patternUnits="userSpaceOnUse"><path d="M100 0H0V100" fill="none" stroke="#2d5a66" strokeOpacity=".14"/></pattern>
      <marker id={uid + 'arrow'} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 1L9 5L0 9Z" fill="#27424c"/></marker>
      <marker id={uid + 'arrowOn'} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 1L9 5L0 9Z" fill="#9a4a1c"/></marker>
    </defs>
    {band(bands.blueNorth, `url(#${uid}blue)`)}{band(bands.blueSouth, `url(#${uid}blue)`)}
    {band(bands.calmNorth, `url(#${uid}calm)`)}{band(bands.calmSouth, `url(#${uid}calm)`)}
    {band(bands.grandLine, `url(#${uid}grand)`)}
    <path d={waves} fill="none" stroke="#f4fbfa" strokeOpacity=".55" strokeWidth="1.6" strokeLinecap="round"/>
    <rect width={W} height={H} fill={`url(#${uid}grid)`}/>
    {/* The seas beyond the story so far lie in haze. */}
    <rect x="0" y="0" width={redLine.reverse} height={H} fill="#eef0e4" opacity=".5"/>
    <rect x={redLine.far} y="0" width={W - redLine.far} height={H} fill="#eef0e4" opacity=".5"/>
    <rect x={redLine.reverse} y={bands.blueSouth[0]} width={redLine.far - redLine.reverse} height={bands.blueSouth[1] - bands.blueSouth[0]} fill="#eef0e4" opacity=".42"/>
    {[redLine.reverse, redLine.far].map(cx => <g key={cx}>
      <path d={redLineShape(cx)} fill="#6d3a28" opacity=".28" transform="translate(7 5)"/>
      <path d={redLineShape(cx)} fill={`url(#${uid}red)`} stroke="#6d3a28" strokeWidth="2"/>
      <path d={mountains(cx)} fill="none" stroke="#6d3325" strokeOpacity=".55" strokeWidth="1.8" strokeLinejoin="round"/>
    </g>)}
    {/* Reverse Mountain: four canals climb from the four Blues and run down into the Grand Line. */}
    <g>
      <path d={`M${px - 74} ${py + 70}L${px - 44} ${py + 14}L${px - 30} ${py + 20}L${px} ${py - 72}L${px + 28} ${py + 18}L${px + 44} ${py + 12}L${px + 74} ${py + 70}Q${px} ${py + 94} ${px - 74} ${py + 70}Z`} fill={`url(#${uid}red)`} stroke="#6d3a28" strokeWidth="2.4" strokeLinejoin="round"/>
      <path d={`M${px} ${py - 72}L${px - 13} ${py - 34}L${px - 3} ${py - 42}L${px + 5} ${py - 32}L${px + 14} ${py - 36}Z`} fill="#f7efe4"/>
      <path d={`M${px + 20} ${bands.blueNorth[1]}Q${px + 6} ${py - 120} ${px} ${py - 30}M${px - 20} ${bands.blueNorth[1]}Q${px - 6} ${py - 120} ${px} ${py - 30}M${px - 20} ${bands.blueSouth[0]}Q${px - 10} ${py + 130} ${px} ${py - 30}M${px + 20} ${bands.blueSouth[0]}Q${px + 10} ${py + 130} ${px} ${py - 30}`} fill="none" stroke="#8fd0de" strokeWidth="5.5" strokeLinecap="round"/>
      <path d={`M${px} ${py - 30}Q${px + 6} ${py + 6} ${px + 66} ${py + 12}`} fill="none" stroke="#b7e6ee" strokeWidth="9" strokeLinecap="round"/>
    </g>
    {/* Sea Kings sleep in the Calm Belts. */}
    {[[600, 455, 1], [1270, 450, -1], [860, 915, -1], [520, 925, 1], [1600, 915, 1], [120, 450, 1]].map(([x, y, side]) => <SeaKing key={x} x={x} y={y} side={side}/>)}
    <g className="chart-seas" textAnchor="middle">
      <text x="930" y="62">東海</text><text x="1060" y="1140">南海</text><text x="165" y="215">北海</text><text x="165" y="1120">西海</text>
      <text x="168" y="690" className="chart-band">新世界</text><text x="1630" y="690" className="chart-band">新世界</text>
      <text x="1630" y="215" className="chart-small">北海</text><text x="1630" y="1120" className="chart-small">西海</text>
      <text x="800" y="535" className="chart-band">偉　大　航　路</text>
      <text x="960" y="457" className="chart-small">無　風　帶</text><text x="690" y="918" className="chart-small">無　風　帶</text>
      <text x={px} y={py + 112} className="chart-place">顛倒山</text>
      <text x={redLine.far} y="770" className="chart-place">魚人島</text><text x={redLine.far} y="788" className="chart-place chart-tiny">海底</text>
      <text transform={`translate(${redLine.reverse + 7} 210) rotate(90)`} className="chart-red">紅土大陸</text>
      <text transform={`translate(${redLine.far + 7} 230) rotate(90)`} className="chart-red">紅土大陸</text>
    </g>
    <g transform="translate(1415 1105)" className="chart-compass">
      <circle r="72" fill="#f6ecd0" fillOpacity=".85" stroke="#8a6a2c" strokeWidth="2"/><circle r="63" fill="none" stroke="#8a6a2c" strokeDasharray="2 5"/>
      <path d="M0 -38L38 0L0 38L-38 0Z" fill="#d7bd80" stroke="#6d4f1c" strokeWidth="1.2"/>
      <path d="M0 -58L10 -10L58 0L10 10L0 58L-10 10L-58 0L-10 -10Z" fill="#e2b65e" stroke="#6d4f1c" strokeWidth="1.5"/>
      <path d="M0 -58L10 -10L0 0ZM58 0L10 10L0 0ZM0 58L-10 10L0 0ZM-58 0L-10 -10L0 0Z" fill="#8a3b26"/>
      <text y="-78" textAnchor="middle">北</text>
    </g>
    <g transform="translate(640 1110)" className="chart-title">
      <path d="M-178 -30L-150 -14V40L-178 26L-166 -2ZM178 -30L150 -14V40L178 26L166 -2Z" fill="#d9c08a" stroke="#6d4f1c" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M-152 -42Q0 -58 152 -42V36Q0 20 -152 36Z" fill="#f6ecd0" stroke="#6d4f1c" strokeWidth="2.4"/>
      <text y="10" textAnchor="middle">世界海圖</text>
    </g>
  </>
})

const SeaKing = ({ x, y, side }: { x: number, y: number, side: number }) => <g transform={`translate(${x} ${y}) scale(${side} 1)`} fill="#6f9c94" stroke="#3f6b66" strokeWidth="1.6" strokeLinejoin="round" opacity=".75">
  <path d="M14 10Q18 -12 30 -12Q42 -12 46 10Q40 2 30 2Q20 2 14 10ZM48 10Q52 -4 59 -4Q66 -4 69 10Q64 5 59 5Q53 5 48 10Z"/>
  <path d="M-18 10Q-24 -10 -14 -24Q-6 -34 8 -26L16 -20L4 -17Q-6 -16 -6 -4Q-5 4 2 10Z"/><circle cx="1" cy="-23" r="1.8" fill="#fff"/>
  <path d="M-24 12q6 -4 12 0q6 4 12 0M44 13q6 -4 12 0q6 4 12 0" fill="none" stroke="#f4fbfa"/>
</g>

type Marks = { here: IslandId, world: View['world'], selected?: IslandId }

/** The chart's changing part. `unit` is how many chart units one screen pixel covers, so names stay readable. */
function Islands({ here, world, selected, unit, uid, onPick }: Marks & { unit: number, uid: string, onPick?: (id: IslandId) => void }) {
  const me = party(world)
  const visited = (id: IslandId) => id === here || id === 'wind' || me.some(m => m.character!.xpLog['island:' + id])
  const next = new Set(routesFrom(here).map(route => route.to))
  const trip = selected && selected !== here ? seaPath(here, selected) : []
  const onTrip = (lane: typeof chartLanes[number]) => trip.some((id, i) => i > 0 && lane.ends.includes(id) && lane.ends.includes(trip[i - 1]))
  const open = (lane: typeof chartLanes[number]) => lane.ends[0] === here || (lane.ends[1] === here && !lane.oneWay)
  const luffy = luffyNow(world).near
  const scenes = new Set(canonTimeline.filter(event => world.phases?.[event.id + ':scene'] !== undefined && !world.timeline?.[event.id]).map(event => event.island))
  const ship = world.ship && islandAt(world.ship.port)
  const font = Math.min(26, Math.max(15, 13 * unit))
  return <>
    <g fill="none" strokeLinecap="round">
      {chartLanes.map(lane => <path key={lane.id} d={lane.shape} className="chart-lane" data-open={open(lane) || undefined} data-trip={onTrip(lane) || undefined}/>)}
      {/* One-way lanes carry an arrow halfway. */}
      {chartLanes.filter(lane => lane.oneWay).map(lane => <LaneArrow key={lane.id} shape={lane.shape} uid={uid} on={open(lane) || onTrip(lane)}/>)}
    </g>
    {ids.map(id => {
      const [x, y] = chartIslands[id].at
      const ruined = hasFlag(world, 'ruined:' + id)
      const state = id === here ? '你在這裡' : ruined ? '廢墟' : next.has(id) ? '可直航' : visited(id) ? '去過' : '還沒去過'
      const props = onPick ? { role: 'button', tabIndex: 0, 'aria-label': islands[id].name + '，' + state, 'aria-pressed': selected === id,
        onClick: () => onPick(id), onKeyDown: (e: { key: string, preventDefault: () => void }) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(id) } } } : {}
      return <g key={id} transform={`translate(${x} ${y})`} className="chart-island" data-new={!visited(id) || undefined} data-ruined={ruined || undefined} {...props}>
        {id === here && <circle className="chart-here" r="64" cy="8"/>}
        {selected === id && id !== here && <circle className="chart-picked" r="64" cy="8"/>}
        <g className="chart-art"><g transform="scale(1.3)"><IslandArt id={id}/></g></g>
        {(unit < 2.5 || id === here || selected === id) && <text y={42 + font * .8} textAnchor="middle" style={{ fontSize: font }} className="chart-name">{islands[id].name}{ruined ? '（廢墟）' : ''}</text>}
        {scenes.has(id) && <g transform="translate(-46 -30)" className="chart-scene"><circle r="11"/><text y="6" textAnchor="middle">!</text></g>}
        {ship === id && <g transform="translate(52 14) scale(1.2)"><ShipMark/></g>}
        {luffy === id && <g transform="translate(46 -30) scale(1.15)"><StrawHat/></g>}
      </g>
    })}
  </>
}

/** An arrowhead in the middle of a curve; it needs the drawn path to find the spot. */
function LaneArrow({ shape, uid, on }: { shape: string, uid: string, on: boolean }) {
  const ref = useRef<SVGPathElement>(null)
  const [at, setAt] = useState<string>()
  useLayoutEffect(() => {
    const path = ref.current
    if (!path) return
    const half = path.getTotalLength() / 2
    const [a, b] = [path.getPointAtLength(half - 2), path.getPointAtLength(half + 2)]
    setAt(`M${a.x} ${a.y}L${b.x} ${b.y}`)
  }, [shape])
  return <><path ref={ref} d={shape} stroke="none"/>{at && <path d={at} stroke="none" strokeWidth={on ? 4 : 3} markerEnd={`url(#${uid}arrow${on ? 'On' : ''})`}/>}</>
}

const clamp = (n: number, low: number, high: number) => low > high ? (low + high) / 2 : Math.min(high, Math.max(low, n))

/** The stretch of sea around the party, in the side panel. Opens the whole chart. */
export function SeaPreview({ world, here, onOpen }: { world: View['world'], here: IslandId, onOpen: () => void }) {
  const uid = 'p' + useId().replace(/\W/g, '')
  const [w, h] = [620, 350]
  const [x, y] = chartIslands[here].at
  const neighbours = routesFrom(here).map(route => chartIslands[route.to].at)
  const centre = [x, ...neighbours.map(n => n[0])].reduce((sum, n) => sum + n, 0) / (neighbours.length + 1)
  const left = clamp(clamp(centre - w / 2, x - w + 80, x - 80), 0, W - w)
  const top = clamp(y - h / 2, 0, H - h)
  return <button type="button" className="sea-preview" onClick={onOpen} aria-label="展開世界地圖">
    <svg viewBox={[left, top, w, h].join(' ')} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <Ocean uid={uid}/><Islands here={here} world={world} unit={1.55} uid={uid}/>
    </svg>
    <span className="sea-preview-open">展開世界地圖</span>
  </button>
}

type Frame = { x: number, y: number, unit: number }

/** The whole world map: drag to move, wheel / pinch / buttons to zoom, pick an island for its details. */
export function SeaChartDialog({ world, here, canSail, onCourse, onClose }: {
  world: View['world'], here: IslandId, canSail: boolean,
  onCourse: (island: IslandId, pace: SailingPace) => void, onClose: () => void,
}) {
  const uid = 'd' + useId().replace(/\W/g, '')
  const dialog = useRef<HTMLDialogElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [frame, setFrame] = useState<Frame>()
  const [selected, setSelected] = useState<IslandId>(here)
  const pointers = useRef(new Map<number, { x: number, y: number }>())
  const dragged = useRef(0)

  const fit = (f: Frame, box = size): Frame => {
    const unit = clamp(f.unit, .55, Math.max(W / box.w, H / box.h))
    const [halfW, halfH] = [box.w * unit / 2, box.h * unit / 2]
    return { unit, x: clamp(f.x, Math.min(halfW, W / 2), Math.max(W - halfW, W / 2)), y: clamp(f.y, Math.min(halfH, H / 2), Math.max(H - halfH, H / 2)) }
  }
  const home = (box = size): Frame => {
    const [x, y] = chartIslands[here].at
    return fit({ x, y, unit: Math.max(.9, Math.min(1.35, 620 / box.w)) }, box)
  }
  /** Zooms while the chart point under (cx, cy) stays put; by default the middle. */
  const zoom = (factor: number, cx = size.w / 2, cy = size.h / 2) => setFrame(f => {
    if (!f) return f
    const unit = clamp(f.unit * factor, .55, Math.max(W / size.w, H / size.h))
    const [dx, dy] = [cx - size.w / 2, cy - size.h / 2]
    return fit({ unit, x: f.x + dx * (f.unit - unit), y: f.y + dy * (f.unit - unit) })
  })

  useEffect(() => {
    const element = dialog.current!
    if (!element.open) element.showModal()
  }, [])
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
    if (!last) return
    const now = { x: event.clientX, y: event.clientY }
    const other = [...pointers.current].find(([id]) => id !== event.pointerId)?.[1]
    pointers.current.set(event.pointerId, now)
    dragged.current += Math.abs(now.x - last.x) + Math.abs(now.y - last.y)
    // Capture only once it is clearly a drag, so a plain tap still reaches the island under it.
    if (dragged.current > 6 && !svg.current!.hasPointerCapture(event.pointerId)) svg.current!.setPointerCapture(event.pointerId)
    if (other) {
      const box = svg.current!.getBoundingClientRect()
      const before = Math.hypot(last.x - other.x, last.y - other.y)
      const after = Math.hypot(now.x - other.x, now.y - other.y)
      if (before && after) zoom(before / after, (now.x + other.x) / 2 - box.left, (now.y + other.y) / 2 - box.top)
    } else setFrame(f => f && fit({ ...f, x: f.x - (now.x - last.x) * f.unit, y: f.y - (now.y - last.y) * f.unit }))
  }
  const up = (event: ReactPointerEvent) => { pointers.current.delete(event.pointerId) }

  const route = routesFrom(here).find(link => link.to === selected)
  const trip = selected === here ? [] : seaPath(here, selected)
  const ruined = hasFlag(world, 'ruined:' + selected)
  const luffy = luffyNow(world)
  const mates = party(world).filter(m => islandAt(m.character!.place) === selected)
  const region = islands[selected].about.split('：')
  const view = frame ?? { x: W / 2, y: H / 2, unit: 1 }
  let status: ReactNode
  if (selected === here) status = <p>你在這裡。</p>
  else if (ruined) status = <p>這座島已經化為廢墟，不能靠岸。</p>
  else if (route) status = <>
    <p><strong>{route.miles} 海里</strong>，從{islands[here].name}可以直航。{routeNeeds(route).length > 0 && '（' + routeNeeds(route).join('、') + '）'}</p>
    {canSail ? <div className="button-row">{(['steady', 'fast'] as const).map(pace =>
      <button key={pace} type="button" onClick={() => onCourse(selected, pace)}>選{paceNames[pace]}航線</button>)}</div>
      : <p className="hint">{world.ship ? '船停在' + locations[world.ship.port] + '，回到船邊才能出海。' : '需要先有船。'}</p>}
  </>
  else if (trip.length) status = <p>沒有直達航線。要經過：{trip.map(id => islands[id].name).join(' → ')}</p>
  else status = <p>偉大航路的航線多半是單向的，從{islands[here].name}已經到不了這裡。</p>

  return <dialog ref={dialog} className="sea-chart" aria-label="世界地圖全圖" onClose={onClose} onCancel={onClose}>
    <header>
      <h2>世界地圖</h2>
      <div className="button-row">
        <button type="button" className="light" aria-label="放大" onClick={() => zoom(1 / 1.35)}>＋</button>
        <button type="button" className="light" aria-label="縮小" onClick={() => zoom(1.35)}>－</button>
        <button type="button" className="light" onClick={() => { setFrame(home()); setSelected(here) }}>我的位置</button>
        <button type="button" className="light" onClick={() => setFrame(fit({ x: W / 2, y: H / 2, unit: 99 }))}>全圖</button>
        <button type="button" onClick={onClose}>關閉</button>
      </div>
    </header>
    <div className="sea-chart-body">
      <div className="sea-chart-view">
        <svg ref={svg} viewBox={[view.x - size.w * view.unit / 2, view.y - size.h * view.unit / 2, size.w * view.unit || W, size.h * view.unit || H].join(' ')}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}
          onClickCapture={event => { if (dragged.current > 6) event.stopPropagation() }} role="group" aria-label="海圖上的島嶼">
          <rect x="-12" y="-12" width={W + 24} height={H + 24} fill="#f3e7c6" stroke="#6d4f1c" strokeWidth="3"/>
          <Ocean uid={uid}/>
          <Islands here={here} world={world} selected={selected} unit={view.unit} uid={uid} onPick={setSelected}/>
          <rect width={W} height={H} fill="none" stroke="#6d4f1c" strokeWidth="4"/>
        </svg>
      </div>
      <section className="sea-chart-card" aria-label="島嶼資訊" aria-live="polite">
        <p className="sea-chart-region">{region.length > 1 ? region[0] : '海上'}</p>
        <h3>{islands[selected].name}</h3>
        <p>{region.at(-1)}</p>
        {status}
        {mates.length > 0 && <p className="hint">在這裡：{mates.map(m => m.character!.name).join('、')}</p>}
        {luffy.near === selected && <p className="hint">{npcs.luffy}：{luffy.doing}</p>}
        <ul className="sea-legend" aria-label="圖例">
          <li><svg viewBox="-18 -14 36 24" aria-hidden="true"><StrawHat/></svg>{npcs.luffy}</li>
          <li><svg viewBox="-16 -18 32 32" aria-hidden="true"><ShipMark/></svg>你們的船</li>
          <li><svg viewBox="0 0 30 12" aria-hidden="true"><path d="M2 6H28" className="chart-lane" data-open="true"/></svg>可直航</li>
          <li><svg viewBox="0 0 30 12" aria-hidden="true"><path d="M2 6H28" className="chart-lane"/></svg>其他航線</li>
        </ul>
      </section>
    </div>
  </dialog>
}

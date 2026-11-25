import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { locations } from '../../packages/shared/protocol.ts'
import type { IslandId, LocationId, SailingPace } from '../../packages/shared/protocol.ts'
import { routeBetween } from '../../packages/world/explore.ts'
import { islandAt, islands } from '../../packages/world/sea.ts'
import { party, paths, walkMinutes } from '../../packages/world/village.ts'
import { chartIslands, coastline, seeded } from '../../packages/world/seachart.ts'
import type { Biome } from '../../packages/world/seachart.ts'
import { canonIslands } from '../../packages/world/canon.ts'
import { addedSites, islandLayouts } from '../../packages/world/sites.ts'
import { biomes } from './island-art.tsx'
import { SeaChartDialog, SeaPreview } from './sea-chart.tsx'
import { Avatar, Card } from './side.tsx'
import type { View } from './network.ts'
import './world-map.css'

// Canon islands without a sites.ts layout share one: port bottom-left, then the middle and the far corner.
const canonLayout: [number, number][] = [[20, 74], [50, 46], [80, 20]]
const canonPoints = Object.fromEntries(Object.values(canonIslands).flatMap(island =>
  island.places.map(([id], index) => [id, canonLayout[index]]))) as Record<string, [number, number]>
const layoutPoints = Object.assign({}, ...Object.values(islandLayouts).map(layout => layout!.at)) as Record<string, [number, number]>
const canonShort = Object.fromEntries([...Object.values(canonIslands).flatMap(island => island.places), ...addedSites]
  .map(([id, short]) => [id, short])) as Record<string, string>

const points = {
  ...canonPoints,
  square: [49, 54], tavern: [18, 73], dock: [81, 78], road: [74, 36], hill: [50, 14], goa: [18, 26],
  shellsPort: [20, 74], shellsTown: [50, 50], marineBase: [78, 20],
  orangePort: [20, 74], orangeStreet: [50, 44], petShop: [80, 66],
  ...layoutPoints,
} as Record<LocationId, [number, number]>
const shortNames = {
  ...canonShort,
  square: '廣場', tavern: '酒吧', dock: '港口', road: '小路', hill: '科爾波山', goa: '哥亞',
  shellsPort: '港口', shellsTown: '大街', marineBase: '海軍基地',
  orangePort: '港口', orangeStreet: '大街', petShop: '寵物店',
} as Record<LocationId, string>
/** Stops on the way, kept short so a label never grows wider than its neighbours. */
const via = (stops: LocationId[]) => stops.length > 1 ? '經 ' + stops.length + ' 處' : '經' + shortNames[stops[0]]
const sites = Object.keys(points) as LocationId[]
const roads = sites.flatMap((from, index) => paths[from].filter(to => sites.indexOf(to) > index)
  .map(to => [from, to] as const))

/** How far a point lies from a straight path. */
function distance([x, y]: number[], [x1, y1]: number[], [x2, y2]: number[]) {
  const length = (x2 - x1) ** 2 + (y2 - y1) ** 2
  const t = length ? Math.min(1, Math.max(0, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / length)) : 0
  return Math.hypot(x - x1 - t * (x2 - x1), y - y1 - t * (y2 - y1))
}

const tree = <><path d="M0 6V0" fill="none" strokeWidth="2"/><circle cy="-4" r="6" fill="#7fa65c"/></>
const roof = <><path d="M-6 5V-2H6V5Z" fill="#f6efdc"/><path d="M-8 -2L0 -8L8 -2Z" fill="#b87155"/></>
const sceneryFor: Record<Biome, ReactNode> = {
  green: tree, town: roof,
  desert: <path d="M-10 4Q-3 -5 3 2Q8 -2 11 4" fill="none"/>,
  snow: <><path d="M0 6V2" fill="none" strokeWidth="2"/><path d="M-6 3L0 -9L6 3Z" fill="#dcebee"/></>,
  jungle: <><path d="M0 7Q2 1 0 -4" fill="none" strokeWidth="2"/><path d="M0 -4Q-8 -8 -10 -1Q-5 -4 0 -4Q-3 -11 4 -11Q0 -8 0 -4Q8 -8 10 0Q5 -4 0 -4" fill="#5f9350"/></>,
  stone: <path d="M-7 5L-4 -3L2 -5L7 5Z" fill="#c2bdab"/>,
  dark: <path d="M0 7V-3M0 1L-5 -5M0 -1L5 -7M0 -3L-2 -9" fill="none" strokeWidth="1.6"/>,
  cloud: <path d="M-10 4Q-13 -2 -6 -3Q-3 -9 3 -5Q10 -6 10 0Q13 4 8 4Z" fill="#eef5f9"/>,
  sea: <path d="M-9 0q4.5 -6 9 0q4.5 6 9 0" fill="none" stroke="#fff"/>,
}

/** Places that are no ordinary land: the floating restaurant and the undersea prison. */
const grounds: Partial<Record<IslandId, { land: string, shade: string, shore: string, scenery: ReactNode }>> = {
  baratie: { land: '#d9b484', shade: '#8f6039', shore: '#b98655', scenery: <path d="M-16 0H16M-9 -4V0M6 0V4" fill="none"/> },
  impelDown: { land: '#8f8ba0', shade: '#57546a', shore: '#6d6a80', scenery: <path d="M-8 6V-6H8V6ZM-4 -6V6M0 -6V6M4 -6V6" fill="#6f6b82"/> },
}

/** Land, scenery and paths under the place names. Drawn in pixels so nothing gets stretched. */
function Ground({ island, current, moving, hillClosed }: { island: IslandId, current: LocationId, moving: boolean, hillClosed: boolean }) {
  const ref = useRef<SVGSVGElement>(null)
  const [{ w, h }, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const element = ref.current!
    const measure = () => setSize({ w: element.clientWidth, h: element.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const { biome } = chartIslands[island]
  const { land, shade, shore } = grounds[island] ?? biomes[biome]
  const at = (place: LocationId) => [points[place][0] * w / 100, points[place][1] * h / 100]
  const shape = (inset: number) => coastline(island + 'land', w / 2, h / 2, Math.max(1, w / 2 - inset), Math.max(1, h / 2 - inset), .09, 22, 3.4)
  const random = seeded(island + 'scenery')
  const paved = roads.filter(([place]) => islandAt(place) === island)
  // Scenery keeps clear of the names, the paths and itself; things further down are drawn in front.
  const scenery: [number, number, number][] = []
  for (let i = 0; i < 160 && scenery.length < 34; i++) {
    const [x, y, s] = [w * (.08 + random() * .84), h * (.08 + random() * .84), .8 + random() * .4]
    if (scenery.every(([a, b]) => Math.hypot(a - x, b - y) > 24) &&
      islands[island].places.every(place => Math.abs(x - at(place)[0]) > 60 || Math.abs(y - at(place)[1]) > 34) &&
      paved.every(([from, to]) => distance([x, y], at(from), at(to)) > 17)) scenery.push([x, y, s])
  }
  scenery.sort((a, b) => a[1] - b[1])
  const links = paved.map(([from, to]) => {
    const [[x1, y1], [x2, y2]] = [at(from), at(to)]
    const bend = (seeded(from + to)() - .5) * .22
    const middle = [(x1 + x2) / 2 - (y2 - y1) * bend, (y1 + y2) / 2 + (x2 - x1) * bend]
    const closed = hillClosed && (from === 'hill' || to === 'hill')
    return { key: from + to, d: `M${x1} ${y1}Q${middle.join(' ')} ${x2} ${y2}`, closed, minutes: walkMinutes(from, to),
      direct: moving && !closed && (current === from || current === to),
      label: [(x1 + x2) / 4 + middle[0] / 2, (y1 + y2) / 4 + middle[1] / 2] }
  })
  return <svg ref={ref} className="map-ground" viewBox={`0 0 ${w || 1} ${h || 1}`} aria-hidden="true">
    {w > 0 && <>
      <g fill="none" stroke="#ffffff" strokeOpacity=".5" strokeWidth="1.5"><path d={shape(1)}/></g>
      <path d={shape(6)} fill={shore} stroke="#8f8254" strokeOpacity=".6"/>
      <path d={shape(15)} fill={shade} transform="translate(0 3)"/>
      <path d={shape(15)} fill={land}/>
      <g stroke="#33403d" strokeOpacity=".55" strokeWidth=".9" strokeLinejoin="round">
        {scenery.map(([x, y, s], i) => <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>{grounds[island]?.scenery ?? sceneryFor[biome]}</g>)}
      </g>
      <g fill="none" strokeLinecap="round">
        {links.map(link => <path key={link.key} d={link.d} stroke="#fff8e2" strokeOpacity=".85" strokeWidth={link.direct ? 8 : 6}/>)}
        {links.map(link => <path key={link.key} d={link.d} stroke={link.closed ? '#7d7a6c' : link.direct ? '#9a4a1c' : '#9b7b47'}
          strokeWidth={link.direct ? 3.4 : 2} strokeDasharray={link.closed ? '3 7' : link.direct ? undefined : '7 6'}/>)}
      </g>
      {/* Only the long walks are worth a number. */}
      {links.filter(link => link.direct && link.minutes > 6).map(link => <text key={link.key} x={link.label[0]} y={link.label[1]} className="map-minutes" textAnchor="middle">{link.minutes} 分</text>)}
    </>}
  </svg>
}

type MapProps = { world: View['world'], player: string, onCourse: (island: IslandId, pace: SailingPace) => void }

/** The whole world map in a dialog, and how to open it. */
function useChart({ world, player, onCourse }: MapProps) {
  const [open, setOpen] = useState(false)
  const here = islandAt(world.members.find(member => member.id === player)!.character!.place)
  const dialog = open && <SeaChartDialog world={world} here={here} canSail={!!world.ship && islandAt(world.ship.port) === here}
    onClose={() => setOpen(false)} onCourse={(id, pace) => { setOpen(false); onCourse(id, pace) }}/>
  return { here, dialog, show: () => setOpen(true) }
}

/** The stretch of sea around the party. */
export function SeaMap(props: MapProps) {
  const { here, dialog, show } = useChart(props)
  return <Card title="世界地圖" meta={'你在' + islands[here].name}>
    <SeaPreview world={props.world} here={here} onOpen={show}/>
    {dialog}
  </Card>
}

/** The island the player is on: its places, the paths between them, and who else is where. */
export function IslandMap({ onTravel, ...props }: MapProps & { onTravel: (place: LocationId) => void }) {
  const { world, player } = props
  const { dialog, show } = useChart(props)
  const character = world.members.find(member => member.id === player)!.character!
  const current = character.place
  const island = islandAt(current)
  const teammates = party(world).filter(member => member.id !== player)
  const fighting = world.combat?.participants.includes(player)
  const moving = character.hp > 0 && !fighting
  const hillClosed = world.combat?.place === 'hill'

  return <section className="card world-map" aria-label="島上地圖">
    <header className="card-head">
      <h3>{islands[island].name}</h3>
      <button type="button" className="light slim" onClick={show}>世界地圖</button>
    </header>
    {dialog}
    <div className="map-chart" data-biome={chartIslands[island].biome} data-dense={islands[island].places.length > 5 || undefined} aria-label={islands[island].name + '步行地圖'}>
      <Ground island={island} current={current} moving={moving} hillClosed={hillClosed}/>
      <ul className="map-sites" aria-label={islands[island].name + '的地點'}>
        {islands[island].places.map(place => {
          const [x, y] = points[place]
          const route = moving ? routeBetween(current, place, hillClosed) : []
          const here = place === current
          const reachable = route.length > 1
          const visitors = teammates.filter(member => member.character!.place === place)
          const state = here ? '你在這裡' : route.length === 2 ? '可直達'
            : reachable ? via(route.slice(1, -1)) : '暫不可達'
          const label = locations[place] + '，' + state
          const contents = <>
            <strong title={locations[place]}>{place === islands[island].port && <svg className="map-anchor" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 4V14M3 9Q3 14 8 14Q13 14 13 9M5.5 6.5H10.5"/><circle cx="8" cy="2.6" r="1.6"/></svg>}{shortNames[place] ?? locations[place]}</strong>
            <span className="map-site-status">{state}</span>
            {visitors.length > 0 && <span className="map-occupancy" aria-hidden="true">{visitors.length}</span>}
          </>
          return <li key={place} className="map-site-position" style={{ left: x + '%', top: y + '%' }}>
            {reachable
              ? <button type="button" className="map-site" aria-label={label} onClick={() => onTravel(place)}>{contents}</button>
              : <span className={'map-site ' + (here ? 'map-site-current' : 'map-site-closed')} aria-current={here ? 'location' : undefined}>{contents}</span>}
          </li>
        })}
      </ul>
    </div>
    <p className="hint">{moving ? '點地點，把移動指令帶入行動欄。'
      : fighting ? '戰鬥中暫時無法步行。' : '倒下時需要同伴協助。'}</p>
    {teammates.length > 0 && <div className="map-party">
      <h4>隊友位置</h4>
      <ul>
        {teammates.map(member => <li key={member.id}>
          <Avatar name={member.character!.name}/>
          <span><strong>{member.character!.name}</strong><small>{locations[member.character!.place]}{member.connected ? '' : ' · 離線'}</small></span>
        </li>)}
      </ul>
    </div>}
  </section>
}

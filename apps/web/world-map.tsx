import { useEffect, useId, useRef } from 'react'
import { locations } from '../../packages/shared/protocol.ts'
import type { IslandId, LocationId } from '../../packages/shared/protocol.ts'
import { routeBetween } from '../../packages/world/explore.ts'
import { islandAt, islands, routesFrom } from '../../packages/world/sea.ts'
import { party, paths } from '../../packages/world/village.ts'
import { canonIslands } from '../../packages/world/canon.ts'
import { addedSites, islandLayouts } from '../../packages/world/sites.ts'
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
  lanternPort: [23, 72], lighthouse: [52, 23], tideCave: [79, 66],
  mistPort: [23, 72], netSlope: [52, 23], whiteBay: [79, 66],
  shellsPort: [20, 74], shellsTown: [50, 50], marineBase: [78, 20],
  orangePort: [20, 74], orangeStreet: [50, 44], petShop: [80, 66],
  ...layoutPoints,
} as Record<LocationId, [number, number]>
const shortNames = {
  ...canonShort,
  square: '廣場', tavern: '酒吧', dock: '港口', road: '小路', hill: '科爾波山', goa: '哥亞',
  lanternPort: '碼頭', lighthouse: '燈塔', tideCave: '海蝕洞',
  mistPort: '泊位', netSlope: '曬網坡', whiteBay: '白灘灣',
  shellsPort: '港口', shellsTown: '大街', marineBase: '海軍基地',
  orangePort: '港口', orangeStreet: '大街', petShop: '寵物店',
} as Record<LocationId, string>
/** Stops on the way, kept short so a label never grows wider than its neighbours. */
const via = (stops: LocationId[]) => stops.length > 1 ? '經 ' + stops.length + ' 處' : '經' + shortNames[stops[0]]
const sites = Object.keys(points) as LocationId[]
const roads = sites.flatMap((from, index) => paths[from].filter(to => sites.indexOf(to) > index)
  .map(to => [from, to] as const))

function Routes({ current, moving, hillClosed }: { current: LocationId, moving: boolean, hillClosed: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const draw = () => {
      const { width, height } = canvas.getBoundingClientRect()
      if (!width || !height) return
      const scale = window.devicePixelRatio || 1
      canvas.width = Math.round(width * scale)
      canvas.height = Math.round(height * scale)
      ctx.setTransform(scale, 0, 0, scale, 0, 0)
      ctx.lineCap = 'round'

      for (const [from, to] of roads.filter(([place]) => islandAt(place) === islandAt(current))) {
        const closed = hillClosed && (from === 'hill' || to === 'hill')
        const direct = moving && !closed && (current === from || current === to)
        ctx.beginPath()
        ctx.setLineDash(closed ? [4, 6] : [])
        ctx.lineWidth = direct ? 3.5 : 2
        ctx.strokeStyle = closed ? '#79847c' : direct ? '#1f605c' : '#658c81'
        ctx.moveTo(points[from][0] * width / 100, points[from][1] * height / 100)
        ctx.lineTo(points[to][0] * width / 100, points[to][1] * height / 100)
        ctx.stroke()
      }
    }
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [current, moving, hillClosed])
  return <canvas ref={ref} className="map-routes" aria-hidden="true"/>
}

export function WorldMap({ world, player, hideOnMobile, onTravel, onCourse }: {
  world: View['world'], player: string, hideOnMobile: boolean,
  onTravel: (place: LocationId) => void, onCourse: (island: IslandId) => void,
}) {
  const title = useId()
  const character = world.members.find(member => member.id === player)!.character!
  const current = character.place
  const island = islandAt(current)
  const routes = routesFrom(island)
  const teammates = party(world).filter(member => member.id !== player)
  const fighting = world.combat?.participants.includes(player)
  const moving = character.hp > 0 && !fighting
  const hillClosed = world.combat?.place === 'hill'

  return <section className={'panel world-map' + (hideOnMobile ? ' mobile-hide' : '')} aria-labelledby={title}>
    <header className="map-heading">
      <h2 id={title}>世界地圖</h2>
      <p className="map-location"><span aria-hidden="true"/>你在{locations[current]}</p>
    </header>
    <ul className="sea-overview" aria-label="海圖">
      {([island, ...routes.map(route => route.to)]).map(id => {
        const route = routes.find(link => link.to === id)
        return <li key={id}>
          {route && world.ship && islandAt(world.ship.port) === island
            ? <button type="button" className="sea-island" onClick={() => onCourse(id)}>
              <strong>{islands[id].name}</strong><span>{route.miles} 海里 · 選航線</span></button>
            : <div className="sea-island" data-current={id === island}>
              <strong>{islands[id].name}</strong><span>{route ? route.miles + ' 海里 · 需船隻' : '所在島嶼'}</span></div>}
        </li>
      })}
    </ul>
    <div className="map-chart" data-dense={islands[island].places.length > 5 || undefined} aria-label={islands[island].name + '步行地圖'}>
      <Routes current={current} moving={moving} hillClosed={hillClosed}/>
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
            <strong title={locations[place]}>{shortNames[place] ?? locations[place]}</strong>
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
    <p className="hint map-instruction">{moving ? '點選可達地點，把移動指令帶入行動欄。'
      : fighting ? '戰鬥中暫時無法步行。' : '倒下時需要同伴協助。'}</p>
    {teammates.length > 0 && <div className="map-party">
      <h3>隊友位置</h3>
      <ul>
        {teammates.map(member => <li key={member.id}>
          <strong>{member.character!.name}</strong>
          <span>{locations[member.character!.place]}{member.connected ? '' : ' · 離線'}</span>
        </li>)}
      </ul>
    </div>}
  </section>
}

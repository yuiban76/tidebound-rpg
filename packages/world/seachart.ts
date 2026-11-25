// The sea chart: where every island lies on the map of the world, and the shapes the map is drawn from.
// Layout follows canon: the Red Line and the Grand Line cross at Reverse Mountain, the first half of the Grand Line
// runs between East Blue and South Blue, the New World between North Blue and West Blue, Calm Belts on both sides.
import type { IslandId } from '../shared/protocol.ts'
import { routesFrom, seaLanes } from './sea.ts'

export const chart = { width: 1700, height: 1250 }
/** Horizontal bands (y from, y to) of the half of the world the story plays in. */
export const bands = { blueNorth: [0, 400], calmNorth: [400, 495], grandLine: [495, 855], calmSouth: [855, 960], blueSouth: [960, 1250] } as const
/** The Red Line circles the world, so it shows up twice: at Reverse Mountain and at the far end of the first half. */
export const redLine = { reverse: 365, far: 1530, half: 30 }
export const reversePeak: [number, number] = [365, 665]

export type Biome = 'green' | 'town' | 'desert' | 'snow' | 'jungle' | 'stone' | 'dark' | 'cloud' | 'sea'

export const chartIslands: Record<IslandId, { at: [number, number], biome: Biome }> = {
  wind: { at: [1300, 150], biome: 'green' },
  shells: { at: [1130, 285], biome: 'town' },
  orange: { at: [985, 135], biome: 'green' },
  syrup: { at: [840, 290], biome: 'green' },
  baratie: { at: [705, 150], biome: 'sea' },
  cocoyasi: { at: [590, 300], biome: 'green' },
  loguetown: { at: [475, 150], biome: 'town' },
  twinCape: { at: [500, 685], biome: 'stone' },
  whiskyPeak: { at: [605, 788], biome: 'desert' },
  littleGarden: { at: [670, 610], biome: 'jungle' },
  drum: { at: [775, 765], biome: 'snow' },
  alabasta: { at: [885, 620], biome: 'desert' },
  jaya: { at: [985, 775], biome: 'jungle' },
  skypiea: { at: [1030, 580], biome: 'cloud' },
  water7: { at: [1135, 690], biome: 'town' },
  eniesLobby: { at: [1235, 570], biome: 'stone' },
  thrillerBark: { at: [1275, 765], biome: 'dark' },
  sabaody: { at: [1410, 710], biome: 'jungle' },
  marineford: { at: [1410, 560], biome: 'stone' },
  amazonLily: { at: [1230, 908], biome: 'jungle' },
  impelDown: { at: [1415, 905], biome: 'dark' },
}

/** Small repeatable random numbers, so an island keeps the same coastline every time it is drawn. */
export function seeded(text: string) {
  let h = 2166136261
  for (const c of text) h = Math.imul(h ^ c.codePointAt(0)!, 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822519) ^ Math.imul(h ^ (h >>> 13), 3266489917)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

const round = (n: number) => Math.round(n * 10) / 10

/** A smooth closed curve through the points (Catmull-Rom turned into Bézier curves). */
export function smoothClosed(points: [number, number][]) {
  const at = (i: number) => points[(i + points.length) % points.length]
  let d = 'M' + points[0].map(round).join(' ')
  for (let i = 0; i < points.length; i++) {
    const [a, b, c, e] = [at(i - 1), at(i), at(i + 1), at(i + 2)]
    d += 'C' + [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6, c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6, c[0], c[1]].map(round).join(' ')
  }
  return d + 'Z'
}

/** A coastline around (cx, cy): `rough` 0 is smooth, .3 is a ragged shore; `power` 2 is an ellipse, more is boxier. */
export function coastline(seed: string, cx: number, cy: number, rx: number, ry: number, rough = .2, steps = 14, power = 2) {
  const random = seeded(seed)
  return smoothClosed(Array.from({ length: steps }, (_, i) => {
    const angle = i / steps * Math.PI * 2
    const r = (1 - rough / 2 + random() * rough) / (Math.abs(Math.cos(angle)) ** power + Math.abs(Math.sin(angle)) ** power) ** (1 / power)
    return [cx + Math.cos(angle) * rx * r, cy + Math.sin(angle) * ry * r] as [number, number]
  }))
}

/** The Red Line as a ragged band from the top of the chart to the bottom. */
export function redLineShape(cx: number) {
  const random = seeded('red' + cx)
  const edge = (side: number) => Array.from({ length: 33 }, (_, i) => [cx + side * (redLine.half - 6 + random() * 12), Math.min(chart.height, i * 40)] as [number, number])
  return 'M' + [...edge(-1), ...edge(1).reverse()].map(p => p.map(round).join(' ')).join('L') + 'Z'
}

/** How a sea lane is drawn. The way into the Grand Line climbs over Reverse Mountain. */
export function laneShape(from: IslandId, to: IslandId) {
  const [x1, y1] = chartIslands[from].at
  const [x2, y2] = chartIslands[to].at
  const [px, py] = reversePeak
  if (from === 'loguetown' && to === 'twinCape')
    return `M${x1} ${y1}C${x1 - 40} ${y1 + 130} ${px + 8} 300 ${px + 4} 420L${px} ${py - 30}C${px + 4} ${py + 4} ${px + 50} ${py + 8} ${x2} ${y2}`
  const random = seeded(from + to)
  const bend = (random() < .5 ? -1 : 1) * (.1 + random() * .08)
  return `M${x1} ${y1}Q${round((x1 + x2) / 2 - (y2 - y1) * bend)} ${round((y1 + y2) / 2 + (x2 - x1) * bend)} ${x2} ${y2}`
}

/** Every lane once, in its drawn direction. */
export const chartLanes = seaLanes.map(lane => ({ ...lane, id: lane.ends.join('-'), shape: laneShape(...lane.ends) }))

/** The shortest way by sea, island by island (both ends included); empty when the one-way lanes never lead there. */
export function seaPath(from: IslandId, to: IslandId): IslandId[] {
  const before = new Map<IslandId, IslandId | null>([[from, null]])
  const queue = [from]
  for (const island of queue) {
    if (island === to) {
      const path: IslandId[] = []
      for (let step: IslandId | null = to; step; step = before.get(step) ?? null) path.unshift(step)
      return path
    }
    for (const route of routesFrom(island)) if (!before.has(route.to)) {
      before.set(route.to, island)
      queue.push(route.to)
    }
  }
  return []
}

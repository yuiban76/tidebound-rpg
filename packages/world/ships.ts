// The party's ship: hull types, the parts that can be fitted, the shipyards, and what all of it does.
// Hull stays 0–100 for every ship (spec §9); a sturdier ship simply loses less of it.
import type { LocationId, NpcId } from '../shared/protocol.ts'
import { shipModels, shipParts } from '../shared/protocol.ts'
import type { ShipModel, ShipPart } from '../shared/protocol.ts'
import { companionIds } from './companions.ts'
import { islandAt } from './sea.ts'
import type { Ship } from './sea.ts'
import type { World } from './village.ts'

export type Model = {
  label: string, price: number
  /** Nautical miles per hour, seats (a giant takes two), hold size, share of every hull loss that gets through. */
  speed: number, seats: number, hold: number, wear: number
  /** Highest level its parts can reach, and how much Adam wood the builders need. */
  parts: number, adamWood?: number
  text: string
}
export const models: Record<ShipModel, Model> = {
  boat: { label: '小帆船', price: 32_500, speed: 7, seats: 8, hold: 20, wear: 1, parts: 1, text: '一根桅杆的小船，四個巨人也擠得下' },
  caravel: { label: '卡拉維爾帆船', price: 1_500_000, speed: 8.5, seats: 10, hold: 60, wear: .8, parts: 2, text: '兩根桅杆、有甲板下的船艙，適合遠洋冒險' },
  brig: { label: '雙桅橫帆船', price: 10_000_000, speed: 10, seats: 12, hold: 120, wear: .65, parts: 3, text: '船身高大、帆面寬闊，裝得下整排船砲' },
  adam: { label: '亞當木大帆船', price: 60_000_000, speed: 12, seats: 16, hold: 240, wear: .5, parts: 3, adamWood: 3, text: '用寶樹亞當打造的船，戰火也燒不垮' },
}

export type Part = { label: string, price: number, text: (level: number) => string }
export const parts: Record<ShipPart, Part> = {
  armor: { label: '裝甲', price: 150_000, text: n => '船體損傷 −' + n * 12 + '%' },
  sail: { label: '船帆', price: 150_000, text: n => '航速 +' + n * 6 + '%，甩開對手 +' + n },
  cannon: { label: '船砲', price: 200_000, text: n => '海戰可以「開砲」，每回合最多 ' + n + ' 門' },
  lookout: { label: '瞭望台', price: 100_000, text: n => '提早發現危險：航行遭遇機率 −' + n * 5 + '%' },
  cabin: { label: '船室', price: 120_000, text: n => '航行 4 小時以上回復 HP ' + n * 10 + '%、STA ' + n * 25 + '%；在船邊休息多回復 HP ' + n * 5 + '%' },
}
/** Price multiplier of each level. */
export const partScale = [0, 1, 4, 20] as const

/** Who builds and refits ships. The ship must lie at the same island. */
export const shipyards: Partial<Record<LocationId, { name: string, models: ShipModel[], level: number }>> = {
  dock: { name: '風車村船塢', models: ['boat'], level: 1 },
  loguePort: { name: '羅格鎮造船所', models: ['boat', 'caravel'], level: 2 },
  galleyLa: { name: '卡雷拉公司', models: ['caravel', 'brig', 'adam'], level: 3 },
  coatingYard: { name: '夏波帝的造船工坊', models: ['caravel', 'brig'], level: 3 },
}

export const modelOf = (ship: Ship) => models[ship.model ?? 'boat']
export const partLevel = (ship: Ship | undefined, part: ShipPart) => ship?.parts?.[part] ?? 0
/** What people call her: the name the crew gave her, or just the kind of ship. */
export const shipName = (ship: Ship) => ship.name ? '「' + ship.name + '」' : modelOf(ship).label
export const maxPart = (ship: Ship) => modelOf(ship).parts

export const shipSpeed = (ship: Ship) => modelOf(ship).speed * (1 + .06 * partLevel(ship, 'sail'))
/** How much of a hull loss the ship really takes. */
export const shipWear = (ship: Ship, damage: number) => Math.ceil(damage * modelOf(ship).wear * (1 - .12 * partLevel(ship, 'armor')) - 1e-9)
/** A badly holed ship is slow. */
export const crippled = (ship: Ship) => ship.hull < 30

const shipwrightNpcs: NpcId[] = ['franky', 'iceburg', 'paulie', 'kaku', 'lulu', 'tilestone']
/** A shipwright who sails with the party: parts cost less, and repairs go further. */
export const shipwright = (world: Pick<World, 'companions'>) => companionIds(world as World).find(npc => shipwrightNpcs.includes(npc))
export const partPrice = (world: Pick<World, 'companions'>, part: ShipPart, level: number) =>
  Math.round(parts[part].price * partScale[level] * (shipwright(world) ? .8 : 1))

/** What a yard pays for the ship: three quarters of the hull, half of the parts. */
export function shipValue(ship: Ship) {
  const fitted = shipParts.reduce((sum, part) => {
    for (let level = 1; level <= partLevel(ship, part); level++) sum += parts[part].price * partScale[level] / 2
    return sum
  }, 0)
  // The small boat keeps the price the yard always paid for it.
  return (ship.model ?? 'boat') === 'boat' ? 24_000 + fitted : Math.floor(modelOf(ship).price * .75) + fitted
}
/** The hull's part of the value: parts move over to the new ship when the party changes ships. */
export const tradeIn = (ship: Ship) => (ship.model ?? 'boat') === 'boat' ? 24_000 : Math.floor(modelOf(ship).price * .75)

export const holdCount = (ship: Ship) => Object.values(ship.hold ?? {}).reduce((sum, n) => sum + n, 0)
export const modelByLabel = (label: string) => shipModels.find(id => id === label || models[id].label === label)
export const yardAt = (place: LocationId) => shipyards[place]
export const sameIsland = (ship: Ship, place: LocationId) => islandAt(ship.port) === islandAt(place)

// The guard fight of each island (world/gates.ts: the island's story enemies, met only to open the way), training fights
// anywhere on an island (「四處找架打」), and the level caps that open as the party reaches each sea.
import { locations } from '../shared/protocol.ts'
import { levelFoe } from '../world/foes.ts'
import type { Faction, Foe } from '../world/foes.ts'
import { capAt, furthestSea, gateCrews, gateOpen, islandOrder, seaOf } from '../world/gates.ts'
import { levelCaps, seaNames, seaPay } from '../world/growth.ts'
import type { Sea } from '../world/growth.ts'
import { islandAt, islands } from '../world/sea.ts'
import { party } from '../world/village.ts'
import type { Member, World } from '../world/village.ts'
import { beginFight } from './combat.ts'
import { liftCap } from './engine.ts'
import type { Result, Roll } from './engine.ts'

const stop = (text: string): Result => ({ text, rejected: true })

/** The guard crew of the island the actor stands on, ready to fight: captain, officers and a grunt for each fighter. */
export function gateFoes(island: keyof typeof gateCrews, fighters: number): Foe[] {
  const gate = gateCrews[island]
  const sea = seaOf(island)
  const L = gate.level
  const officers = gate.officers.slice(0, Math.min(2, fighters))
  // The captain stands up to the whole party: more HP and one strike a round for each fighter.
  const captain = levelFoe('gate:captain', '「' + gate.title + '」' + gate.captain, L, 'captain', sea, gate.faction,
    // No bounty slip: the story's own captain still carries the real bounty for whoever beats them in the story.
    { xp: 60 * L, loot: 20_000 * L * seaPay[sea], ...(fighters > 1 && { strikes: fighters }) })
  captain.maxHp = captain.hp = Math.round(captain.maxHp * (1 + fighters) / 2)
  return [
    captain,
    ...officers.map((name, i) => levelFoe('gate:officer' + i, name, L, 'officer', sea, gate.faction, { xp: 20 * L, loot: 4_000 * L * seaPay[sea] })),
    ...Array.from({ length: fighters }, (_, i) => levelFoe('gate:grunt' + i, gate.grunt + (fighters > 1 ? ' ' + '甲乙丙丁'[i] : ''), Math.max(1, L - 2), 'grunt', sea, gate.faction,
      { xp: 8 * L, loot: 1_000 * L * seaPay[sea] })),
  ]
}

/** 「挑戰守關海賊團」: only at the island's port, once, and the whole party on the spot fights. */
export function challengeGate(world: World, actor: Member): Result {
  const c = actor.character!
  if (world.combat) return stop('戰鬥還在進行中。')
  const island = islandAt(c.place)
  const gate = gateCrews[island]
  if (!gate) return stop('這座島沒有守關的海賊團。')
  if (gateOpen(world, island)) return stop('「' + gate.crew + '」已經被你們打倒了，可以往下一座島出發。')
  const port = islands[island].port
  if (c.place !== port) return stop('「' + gate.crew + '」守在' + locations[port] + '。先到港口再挑戰。')
  const fighters = party(world).filter(m => m.character!.place === c.place && m.character!.hp > 0)
  const foes = gateFoes(island, fighters.length)
  beginFight(world, c.place, foes, { gate: island })
  const weakest = Math.min(...fighters.map(m => m.character!.level))
  return {
    text: '「' + gate.crew + '」攔在' + locations[port] + '。' + gate.text + '\n船長「' + gate.title + '」' + gate.captain + '帶著手下圍了上來（建議 ' + gate.level + ' 級' +
      (weakest < gate.level ? '，你們之中最低的是 ' + weakest + ' 級，小心' : '') + '）。\n對手：' + foes.map(foe => foe.name).join('、') +
      '。全隊可以攻擊、防守、使用道具，打不過也可以撤退。',
    minutes: 5, announce: true,
  }
}

type Prey = [name: string, faction: Faction, drop?: [item: string, chance: number]]
const prey: Record<Sea, Prey[]> = {
  east: [['山賊', 'bandit', ['繃帶', 20]], ['野狼', 'beast', ['帶骨肉', 25]], ['海賊雜兵', 'pirate', ['繃帶', 20]], ['賞金獵人', 'bandit'], ['巨大野豬', 'beast', ['帶骨肉', 40]]],
  paradise: [['偉大航路的海賊', 'pirate', ['繃帶', 20]], ['賞金獵人', 'bandit', ['傷藥', 15]], ['巨大海鷗', 'beast', ['帶骨肉', 30]], ['人口販子', 'bandit'], ['兇猛的大型野獸', 'beast', ['帶骨肉', 40]]],
  newWorld: [['新世界的海賊', 'pirate', ['傷藥', 20]], ['四皇旗下的嘍囉', 'pirate', ['繃帶', 25]], ['巨大猛獸', 'beast', ['帶骨肉', 40]], ['傭兵', 'bandit', ['傷藥', 20]]],
}

/** 「四處找架打」: a training fight on any island, against foes of the party's level. Every win pays in full. */
export function hunt(world: World, actor: Member, roll: Roll): Result {
  const c = actor.character!
  if (world.combat) return stop('戰鬥還在進行中。')
  if (c.hp <= 0) return stop('你現在倒在地上，先恢復再說。')
  const island = islandAt(c.place)
  const sea = seaOf(island)
  const fighters = party(world).filter(m => m.character!.place === c.place && m.character!.hp > 0)
  const level = Math.max(1, Math.round(fighters.reduce((sum, m) => sum + m.character!.level, 0) / fighters.length))
  const count = roll(fighters.length + 1)
  // Wanted people get Marines on their trail as well.
  const pool: Prey[] = [...prey[sea], ...(fighters.some(m => m.character!.bounty > 0) ? [['海軍巡邏兵', 'marine'] as Prey] : [])]
  const kind = pool[roll(pool.length) - 1]
  const foes = Array.from({ length: count }, (_, i) => {
    const boss = count >= 3 && i === 0
    const drop = kind[2] && roll(100) <= kind[2][1] ? { [kind[2][0]]: 1 } : undefined
    return levelFoe('hunt:' + i, (boss ? kind[0] + '頭目' : kind[0]) + (count > 1 && !boss ? ' ' + '甲乙丙丁戊'[i] : ''), level, boss ? 'officer' : 'grunt', sea, kind[1],
      { xp: Math.ceil(20 * level / count) * (boss ? 2 : 1), loot: Math.round(600 * level * seaPay[sea] / count), ...(drop && { items: drop }) })
  })
  beginFight(world, c.place, foes, { hunt: true })
  return {
    text: c.name + '在' + locations[c.place] + '四處晃了一陣，' + (kind[1] === 'beast' ? '草叢裡竄出了' : '被人攔了下來：') +
      foes.map(foe => foe.name).join('、') + '（' + level + ' 級）！',
    minutes: 20, announce: true,
  }
}

/**
 * The party got further: the furthest sea reached sets everyone's level cap, and XP saved at the old cap pays out now.
 * Returns the lines to announce.
 */
export function raiseCaps(world: World) {
  const reached = [...party(world).map(m => islandAt(m.character!.place)), ...(world.ship ? [islandAt(world.ship.port)] : [])]
  const sea = furthestSea([...reached, ...(world.frontier ? [frontierIsland[world.frontier]] : [])])
  const lines: string[] = []
  if ((world.frontier ?? 'east') !== sea) lines.push('你們進入了' + seaNames[sea] + '：等級上限提高到 ' + levelCaps[sea] + '。')
  world.frontier = sea
  for (const m of party(world)) {
    const text = liftCap(m.character!, levelCaps[sea])
    if (text) lines.push(text)
  }
  return lines
}
const frontierIsland: Record<Sea, string> = { east: 'wind', paradise: 'twinCape', newWorld: 'fishmanIsland' }

/** Old saves, once: every island the party has already sailed on from counts as beaten, and the caps match the sea. */
export function settleOldSave(world: World) {
  if (world.gatesSettled) return world
  world.gatesSettled = true
  const seen = new Set<string>()
  for (const m of world.members) for (const key of Object.keys(m.character?.xpLog ?? {})) if (key.startsWith('island:')) seen.add(key.slice(7))
  for (const m of world.members) if (m.character) seen.add(islandAt(m.character.place))
  if (world.ship) seen.add(islandAt(world.ship.port))
  const furthest = Math.max(...[...seen].map(id => islandOrder.indexOf(id as never)))
  for (const id of islandOrder.slice(0, Math.max(0, furthest))) (world.gates ??= {})[id] = true
  const cap = capAt(islandOrder[Math.max(0, furthest)])
  world.frontier = seaOf(islandOrder[Math.max(0, furthest)])
  for (const m of world.members) if (m.character) m.character.cap = Math.max(m.character.cap ?? 0, cap)
  return world
}

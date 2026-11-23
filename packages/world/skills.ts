// What every skill does in the rules, how high it may grow, and the helpers the life skills need.
import type { LocationId, Skill } from '../shared/protocol.ts'
import type { Character, World } from './village.ts'

/** Shown on the character card and the character sheet, so nobody picks a skill that does nothing. */
export const skillUses: Record<Skill, string> = {
  格鬥: '徒手攻擊的命中；攀爬',
  劍術: '用刀劍攻擊的命中',
  長兵器: '用長槍等長兵器攻擊的命中',
  射擊: '用火槍攻擊的命中',
  閃避: '防禦；潛行',
  觀察: '觀察、搜索，多數島上委託的搜索',
  說服: '戰鬥中交涉、邀請夥伴加入',
  醫術: '繃帶與草藥的回復量；醫術 2 以上，睡覺時全隊多回復 HP',
  航海: '航程更短、船體損傷更少；海上甩開對手',
  工藝: '修船每級多修 5；強化武器每級便宜 10%（最多 5 折）',
  採集: '在山林與海岸「採集」草藥和木料',
  烹飪: '休息或睡覺時替全隊做飯，多回復 STA 與 HP',
}

/** A skill may grow to half the level plus two (2 at level 1, 5 at level 6), never above 8. */
export const skillCap = (level: number) => Math.min(8, Math.floor(level / 2) + 2)

/** A price after the crafter's discount: 10% per 工藝 rank, at most half off. */
export const crafted = (price: number, c: Pick<Character, 'skillRanks'>) =>
  Math.round(price * (1 - Math.min(.5, (c.skillRanks['工藝'] ?? 0) * .1)))

/** Woods, mountain paths and shores where herbs and driftwood can be gathered. */
export const wildPlaces: LocationId[] = [
  'hill', 'road', 'syrupSlope', 'syrupHill', 'gardenShore', 'gardenJungle', 'drumShore', 'drumCliff', 'yuba',
  'jayaForest', 'upperYard', 'thrillerForest', 'sabaodyGrove', 'amazonForest',
]

/** Bandages first, then gathered herbs: both dress a wound the same way. */
export const dressingOf = (c: Pick<Character, 'inventory'>) => c.inventory['繃帶'] ? '繃帶' : c.inventory['草藥'] ? '草藥' : undefined

/** Party members standing (not down) on this spot. */
const presentAt = (world: World, place: LocationId) =>
  world.members.filter(m => m.character && !m.pendingJoin && m.character.place === place && m.character.hp > 0).map(m => m.character!)

/** The best cook on the spot, if anyone there can cook. */
export function cookAt(world: World, place: LocationId) {
  const cooks = presentAt(world, place).filter(c => (c.skillRanks['烹飪'] ?? 0) > 0)
  return cooks.sort((a, b) => (b.skillRanks['烹飪'] ?? 0) - (a.skillRanks['烹飪'] ?? 0))[0]
}

/** Someone on the spot with 醫術 2 or more looks after the sleepers, like a ship's doctor would. */
export const doctorAt = (world: World, place: LocationId) => presentAt(world, place).some(c => (c.skillRanks['醫術'] ?? 0) >= 2)

/** The best 航海 rank in the party: each rank shortens a voyage by 3%. */
export const navigatorRank = (world: World) =>
  Math.max(0, ...world.members.filter(m => m.character && !m.pendingJoin).map(m => m.character!.skillRanks['航海'] ?? 0))

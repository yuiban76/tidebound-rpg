// What every skill does in the rules, how high it may grow, and the helpers the life skills need.
import { rankOf } from './talents.ts'
import type { Attribute, LocationId, Skill } from '../shared/protocol.ts'
import type { Character, World } from './village.ts'

/** What each attribute does in the rules: a short line for the card, and the whole story for the guide. */
export const attributeUses: Record<Attribute, { short: string, long: string }> = {
  STR: { short: '近身武器的命中與傷害', long: '用拳腳、刀劍、長兵器、重武器攻擊時的命中與傷害；靠力氣硬闖的判定（例如擋住衝上來的守軍）。' },
  AGI: { short: '防禦、出手快慢', long: '防禦（12＋敏捷）；戰鬥中誰先出手；腿技、棍棒、弓箭的命中與傷害；攀爬、潛行、閃躲的判定。' },
  CON: { short: 'HP 與 STA 上限', long: '每點讓 HP 上限 +50、STA 上限 +6，越高越耐打；頂著風雪、硬撐傷勢的判定。' },
  PER: { short: '火槍彈弓、觀察搜索', long: '火槍、彈弓與船砲的命中與傷害；觀察、搜索的判定，多數島上委託的搜索都看它。' },
  INT: { short: '航海、修船、動腦', long: '航程長短與在海上甩開對手（看隊伍裡最強的一位，加上航海技能）；修船、醫治、研究這類動腦的判定。' },
  WIL: { short: 'STA、說服、霸王色', long: '每點讓 STA 上限 +4；交涉、說服、邀請夥伴加入；兩年修行後能不能覺醒霸王色；咬牙撐住的判定。' },
}

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
  const cooks = presentAt(world, place).filter(c => rankOf(c, '烹飪') > 0)
  return cooks.sort((a, b) => rankOf(b, '烹飪') - rankOf(a, '烹飪'))[0]
}

/** Someone on the spot with 醫術 2 or more looks after the sleepers, like a ship's doctor would. */
export const doctorAt = (world: World, place: LocationId) => presentAt(world, place).some(c => rankOf(c, '醫術') >= 2)

/** The best 航海 rank in the party: each rank shortens a voyage by 3%. */
export const navigatorRank = (world: World) =>
  Math.max(0, ...world.members.filter(m => m.character && !m.pendingJoin).map(m => rankOf(m.character!, '航海')))

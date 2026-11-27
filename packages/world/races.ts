// Canon races and what each one brings: one small attribute bonus at most, one trait from the original story,
// and, for the stronger ones, a price. Bonuses are applied when numbers are computed, never written into the save,
// so characters made before races mattered get them too.
import type { Attribute, Race, Weapon } from '../shared/protocol.ts'
import type { Character } from './village.ts'
import { armorOf } from './market.ts'

export type RaceTrait = {
  /** Attribute added on top of the character's own points. */
  bonus?: Partial<Record<Attribute, number>>
  /** One line each for the character sheet: what the race is good at and what it pays for it. */
  perk: string
  cost?: string
  /** Extra free attribute point at creation (humans adapt). */
  extraPoint?: true
  /** To-hit and defense in sea fights, and to-hit/defense on land. */
  seaHit?: number, seaDefense?: number, landDefense?: number, defense?: number
  /** Added to the party's roll to shake off foes at sea (the best one aboard counts). */
  seaEscape?: number
  /** To-hit with these weapons. */
  reach?: { weapons: Weapon[], hit: number }
  damage?: number
  /** Multiplier on maximum HP. */
  hp?: number
  /** Persuasion modifier when talking a foe down. */
  negotiate?: number
  sneak?: number
  /** Extra rounds a Sky Island dial keeps a logia body solid. */
  dialRounds?: number
  /** Seats taken aboard the party's boat. */
  seats?: number
  /** A move the race is born with; it does not count toward the six self-made techniques. */
  technique?: { name: string, style: 'special' }
}

export const raceTraits: Record<Race, RaceTrait> = {
  人類: { perk: '適應力強：開局多 1 個自由屬性點，進遊戲後在角色面板分配', extraPoint: true },
  魚人: { bonus: { STR: 1 }, perk: '天生招式「魚人空手道」（3 STA，不佔自創招式名額）；海裡長大：海上戰鬥命中 +2',
    cost: '人類對魚人有偏見：戰鬥中交涉 −2', seaHit: 2, negotiate: -2, technique: { name: '魚人空手道', style: 'special' } },
  人魚: { perk: '海中之王：海上戰鬥命中與防禦各 +3，海上甩開對手 +3', cost: '在陸上靠尾巴移動：陸地戰鬥防禦 −1',
    seaHit: 3, seaDefense: 3, seaEscape: 3, landDefense: -1 },
  毛皮族: { bonus: { AGI: 1 }, perk: '天生招式「電擊」（3 STA，不佔自創招式名額）', technique: { name: '電擊', style: 'special' } },
  空島居民: { bonus: { PER: 1 }, perk: '熟悉貝殼：衝擊貝讓自然系現形的效果多 1 回合', dialRounds: 1 },
  長手族: { perk: '多一個關節：徒手格鬥與長兵器命中 +1', reach: { weapons: ['fist', 'spear', 'staff'], hit: 1 } },
  長腿族: { bonus: { AGI: 1 }, perk: '腿長跑得快：海上甩開對手 +2', seaEscape: 2 },
  小人族: { bonus: { AGI: 1 }, perk: '體型小：防禦 +1，潛行 +2', cost: '最大 HP −20%', defense: 1, sneak: 2, hp: 0.8 },
  巨人: { bonus: { STR: 1 }, perk: '巨大身軀：最大 HP +50%，傷害 +2', cost: '目標很大：防禦 −2；上船佔 2 個座位',
    hp: 1.5, damage: 2, defense: -2, seats: 2 },
}

/** Characters from older saves may name a race that no longer exists; they are treated as humans. */
export const traitOf = (c: Pick<Character, 'race'>): RaceTrait => raceTraits[c.race] ?? raceTraits.人類

/** An attribute with the race's bonus. Use this everywhere a roll or number reads an attribute. */
export const stat = (c: Pick<Character, 'race' | 'stats'> & Partial<Pick<Character, 'inventory'>>, attr: Attribute) =>
  c.stats[attr] + (traitOf(c).bonus?.[attr] ?? 0) + (attr === 'AGI' && c.inventory ? armorOf({ inventory: c.inventory })?.agi ?? 0 : 0)

export const raceHit = (c: Character, sea: boolean) =>
  (sea ? traitOf(c).seaHit ?? 0 : 0) + (traitOf(c).reach?.weapons.includes(c.weapon) ? traitOf(c).reach!.hit : 0)
export const raceDefense = (c: Character, sea: boolean) =>
  (traitOf(c).defense ?? 0) + (sea ? traitOf(c).seaDefense ?? 0 : traitOf(c).landDefense ?? 0)
export const raceSeats = (c: Pick<Character, 'race'>) => traitOf(c).seats ?? 1

/** What a race hands out: a human's extra point (once), and a born move such as a mink's Electro or Fish-Man Karate.
 * Safe to call again; a born move added to a race later still reaches characters made before it. */
export function applyRace(c: Character) {
  const trait = traitOf(c)
  if (trait.technique && !c.techniques.some(move => move.name === trait.technique!.name))
    c.techniques.push({ ...trait.technique, innate: true })
  if (c.raceReady) return
  if (trait.extraPoint) c.unspent++
  c.raceReady = true
}

/** Short description for the AI and the character sheet. */
export const raceSummary = (race: Race) => {
  const trait = raceTraits[race]
  const bonus = Object.entries(trait.bonus ?? {}).map(([attr, n]) => ({ STR: '力量', AGI: '敏捷', CON: '體魄', PER: '感知', INT: '智識', WIL: '意志' } as const)[attr as Attribute] + ' +' + n)
  return [...bonus, trait.perk, ...(trait.cost ? ['代價：' + trait.cost] : [])].join('；')
}

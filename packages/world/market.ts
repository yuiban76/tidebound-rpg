// The economy in canon beli: what the guild merchants sell beyond the basics (each island's specialty, armor and
// forged weapons), who buys bounty slips, where the Marines pay bounties, and how reputation changes a price.
// Bounty hunters cash slips in full at a Marine base; pirates (anyone with a bounty of their own) can only sell
// them to an underground broker for a fraction, or live on loot, crew treasure and selling goods.
import type { LocationId, NpcId, Weapon } from '../shared/protocol.ts'
import type { TraderId } from './traders.ts'
import type { Character, World } from './village.ts'

export type Special = {
  label: string, price: number
  kind: 'food' | 'heal' | 'armor' | 'weapon' | 'combat' | 'ship'
  /** Food and medicine: STA, and HP before the number scale (medicine adds the user's level too). */
  sta?: number, hp?: number
  /** Armor: defense bonus, and an agility cost for heavy pieces. Only the best piece a character carries counts. */
  def?: number, agi?: number
  /** A forged weapon: the kind, and the forge tier it comes with (see forge.ts). */
  weapon?: Exclude<Weapon, 'fist'>, tier?: number
  /** Combat item effect. */
  effect?: 'blind' | 'escape' | 'burn' | 'salt'
  /** Only sold to people without a bounty (Marine supplies). */
  lawful?: true
  text: string
}

export const specials = {
  meat: { label: '帶骨肉', price: 3_000, kind: 'food', sta: 20, hp: 5, text: '大塊的帶骨烤肉，隨時能吃：STA +20、HP 少量回復' },
  riceBall: { label: '飯糰', price: 800, kind: 'food', sta: 12, hp: 3, text: '鎮上小女孩教的做法，又鹹又甜：STA +12' },
  orange: { label: '貝爾梅爾的橘子', price: 500, kind: 'food', sta: 8, hp: 2, text: '可可亞西村的橘子：STA +8' },
  bento: { label: '海上便當', price: 5_000, kind: 'food', sta: 24, hp: 8, text: '巴拉蒂廚師做的便當，出海也吃得到熱食：STA +24、HP 回復' },
  dinoMeat: { label: '恐龍肉', price: 6_000, kind: 'food', sta: 30, hp: 10, text: '小花園的恐龍肉，一塊能撐很久：STA +30、HP 回復' },
  sakura: { label: '櫻花藥', price: 30_000, kind: 'heal', hp: 25, text: '磁鼓島的醫生調的藥，比傷藥強得多' },
  starPowder: { label: '火藥星', price: 8_000, kind: 'combat', effect: 'blind', text: '戰鬥中丟向一個對手，讓他這回合睜不開眼、無法出手' },
  smokeBomb: { label: '煙霧彈', price: 20_000, kind: 'combat', effect: 'escape', text: '戰鬥中使用，全隊必定脫離戰鬥（海上也甩得掉）' },
  flameDial: { label: '火焰貝', price: 120_000, kind: 'combat', effect: 'burn', text: '空島的貝殼，噴出一道火焰，造成一次大傷害' },
  salt: { label: '鹽', price: 1_000, kind: 'combat', effect: 'salt', text: '塞進殭屍嘴裡，影子就會離開，殭屍當場倒下' },
  leather: { label: '皮甲', price: 200_000, kind: 'armor', def: 1, text: '輕便的皮甲：防禦 +1' },
  cloak: { label: '沙漠斗篷', price: 250_000, kind: 'armor', def: 1, text: '擋得住風沙也擋得住刀：防禦 +1' },
  iron: { label: '鐵甲', price: 800_000, kind: 'armor', def: 2, agi: -1, text: '厚重的鐵甲：防禦 +2，但敏捷 −1' },
  snakeskin: { label: '蛇皮護甲', price: 1_500_000, kind: 'armor', def: 2, text: '九蛇島的蛇皮護甲，又輕又韌：防禦 +2' },
  marineArmor: { label: '海軍制式護甲', price: 1_200_000, kind: 'armor', def: 2, lawful: true, text: '海軍的制式護甲：防禦 +2；軍需商不賣給有懸賞金的人' },
  adamWood: { label: '亞當木', price: 2_000_000, kind: 'ship', text: '傳說中的寶樹木材：在船邊使用，船體一次修滿；三份可以打造亞當木大帆船' },
  steelSword: { label: '精鋼武士刀', price: 200_000, kind: 'weapon', weapon: 'sword', tier: 1, text: '強化一階的武士刀（需等級 2）' },
  steelSpear: { label: '精鋼長槍', price: 180_000, kind: 'weapon', weapon: 'spear', tier: 1, text: '強化一階的長槍（需等級 2）' },
  steelMusket: { label: '精鋼火槍', price: 240_000, kind: 'weapon', weapon: 'musket', tier: 1, text: '強化一階的火槍（需等級 2）' },
  fineSword: { label: '百鍊武士刀', price: 800_000, kind: 'weapon', weapon: 'sword', tier: 2, text: '強化二階的武士刀（需等級 5）' },
  fineSpear: { label: '百鍊長槍', price: 750_000, kind: 'weapon', weapon: 'spear', tier: 2, text: '強化二階的長槍（需等級 5）' },
  fineMusket: { label: '百鍊火槍', price: 900_000, kind: 'weapon', weapon: 'musket', tier: 2, text: '強化二階的火槍（需等級 5）' },
} as const satisfies Record<string, Special>
export type SpecialId = keyof typeof specials

const steel: SpecialId[] = ['steelSword', 'steelSpear', 'steelMusket']
const fine: SpecialId[] = ['fineSword', 'fineSpear', 'fineMusket']
/** Each merchant's specialties, on top of the standard wares every merchant carries. Later islands sell better arms. */
export const traderSpecials: Record<TraderId, SpecialId[]> = {
  traderWind: ['meat'], traderShells: ['riceBall'], traderOrange: ['leather'], traderSyrup: ['starPowder'],
  traderBaratie: ['bento'], traderCocoyasi: ['orange'], traderLogue: [...steel, 'leather'], traderTwin: ['smokeBomb'],
  traderWhisky: steel, traderGarden: ['dinoMeat'], traderDrum: ['sakura'], traderAlabasta: ['cloak'],
  traderJaya: ['smokeBomb', 'starPowder'], traderSkypiea: ['flameDial'], traderWater7: ['adamWood', 'iron', ...fine],
  traderEnies: ['iron'], traderThriller: ['salt'], traderSabaody: [...fine, 'smokeBomb'], traderAmazon: ['snakeskin'],
  traderImpel: ['smokeBomb', 'sakura'], traderMarineford: ['marineArmor', ...fine],
}

/** Underground brokers buy bounty slips for a share of the bounty: less in the orderly East Blue, more further out. */
export const brokers: Partial<Record<NpcId, number>> = {
  traderOrange: .25, traderLogue: .25, traderWhisky: .3, traderJaya: .3, zambai: .3, disco: .35, traderImpel: .35,
}
/** Where the Marines pay bounties in full (only to people who are not wanted themselves). */
export const marineOffices: LocationId[] = ['marineBase', 'marine16', 'logueBase', 'hqFortress']

/** Bounty slips are inventory items whose name carries the target and the amount. */
export const slipName = (target: string, bounty: number) => '賞金單：' + target + '（' + bounty.toLocaleString('en-US') + ' 貝里）'
export const slipValue = (item: string) => item.startsWith('賞金單：') ? Number(/（([\d,]+) 貝里）$/.exec(item)?.[1].replaceAll(',', '') ?? 0) : 0
export const slipsOf = (c: Pick<Character, 'inventory'>) => Object.keys(c.inventory).filter(item => slipValue(item) > 0)

/** The armor a character carries that protects best (armor is not equipped: carrying it is enough). */
export function armorOf(c: Pick<Character, 'inventory'>): Special | undefined {
  return (Object.values(specials) as Special[]).filter(item => item.kind === 'armor' && c.inventory[item.label])
    .sort((a, b) => (b.def ?? 0) - (a.def ?? 0))[0]
}

export const specialByLabel = (label: string) =>
  (Object.keys(specials) as SpecialId[]).find(id => specials[id].label === label)

/**
 * What a merchant charges this character: 10% off on an island that likes the party, 20% more where they bullied
 * people, and the Impel Down guard takes a cut from everyone.
 */
export function priceFor(world: Pick<World, 'renown'>, island: string, seller: NpcId | undefined, base: number) {
  const rep = world.renown?.islandRep[island as keyof NonNullable<World['renown']>['islandRep']] ?? 0
  const factor = (rep >= 20 ? .9 : rep < 0 ? 1.2 : 1) * (seller === 'traderImpel' ? 1.3 : 1)
  return Math.round(base * factor / 100) * 100 || base
}
/** Merchants buy goods back for half of the list price. */
export const resale = (price: number) => Math.floor(price / 2)

/** One-time crew treasure found when the captain is beaten (who gets there first takes it). */
export const crewTreasure: Record<string, { amount: number, text: string }> = {
  buggy: { amount: 5_000_000, text: '巴其搶來的寶藏' },
  krieg: { amount: 10_000_000, text: '克利克艦隊剩下的財寶' },
  arlong: { amount: 100_000_000, text: '惡龍樂園金庫裡的一億貝里' },
  wapol: { amount: 20_000_000, text: '瓦波爾帶走的王國財寶' },
  bellamy: { amount: 5_000_000, text: '貝拉米從莫克鎮收來的錢' },
  baroque: { amount: 50_000_000, text: '克洛克達爾賭場地下的金庫' },
  enel: { amount: 200_000_000, text: '黃金鄉香朵拉的黃金' },
  moria: { amount: 30_000_000, text: '摩利亞船上堆積的財寶' },
}

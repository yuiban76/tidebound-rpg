// The talent forest: 1000 nodes on one sea chart. Every level pays three talent points; a node can be learned once it
// touches something already learned. The job's start, the fruit's start (once a fruit is eaten) and the haki start
// (after the two years) are free and count as starting points. Minor nodes add a little; notables have names and rules;
// keystones are the strongest and cost something, and only one may be taken in each sea.
// The layout is generated here so the host (which checks every rule) and the page (which draws it) agree exactly.
import type { Attribute, Profession, Skill, Weapon } from '../shared/protocol.ts'
import type { FruitKind } from './fruits.ts'
import type { Character } from './village.ts'

export const talentsPerLevel = 3
export const talentTotal = 1000
/** Learning everything again is free one node at a time; wiping the whole forest at once costs this much per level. */
export const resetPricePerLevel = 10_000
/** Keystones that need the character to have grown far. */
export const awakeningLevel = 40

export type TalentRegion = 'start' | 'combat' | 'sea' | 'grit' | 'fruit' | 'haki'
export type TalentKind = 'root' | 'minor' | 'notable' | 'keystone'
/**
 * What a node adds. Keys are listed in `fxKeys`; a key may be narrowed to one weapon or group with `@`
 * (`hit@sword`, `dmg@ranged`), or name an attribute or skill (`attr:STR`, `skill:航海`).
 */
export type Fx = Record<string, number>
export type Need = { fruit?: FruitKind | 'any', trained?: true, conqueror?: true, level?: number }
export type TalentNode = {
  id: string, kind: TalentKind, region: TalentRegion, name: string, text: string, fx: Fx
  x: number, y: number, links: string[], need?: Need, route: string
}

/** Every effect key the rules read. Tests check that the data uses no other. */
export const fxKeys = [
  // Attacks
  'hit', 'dmg', 'dmgPct', 'pierce', 'crit', 'critDice', 'die', 'powerDmg', 'flurryDmg', 'staTech', 'staFlurry', 'staAttack',
  'openingDmg', 'firstRoundHit', 'vsHakiHit', 'vsHakiDmg', 'armamentDmg', 'aweOnHit', 'aweOnCrit', 'freeShot', 'heatDmg',
  'downedAllyDmg', 'lowHpDmg', 'allOut',
  // Devil fruit moves
  'fruitHit', 'fruitDmg', 'fruitDmgPct', 'fruitCrit', 'fruitStaHalf', 'fruitSplash', 'fruitSweep', 'fruitFreeFirst', 'awakened',
  'fruitEarly', 'zoanHp',
  // Defence
  'def', 'guard', 'dr', 'drPct', 'lowHpDef', 'firstRoundDef', 'foresight', 'seaGuard', 'seaPenalty', 'critGuard', 'fadeFirst',
  'dodgeFirst', 'phase', 'lastStand', 'regen', 'counter', 'missHit',
  // For everyone on the spot
  'auraHit', 'round1AuraHit', 'round1AuraDef', 'allyHit', 'allyDmg', 'allyDmgPct', 'conqAura',
  // Checks
  'negotiate', 'shake', 'persuade', 'recruit', 'search', 'observe', 'dodgeCheck', 'flee',
  // Recovery
  'healPct', 'potionPct', 'fieldHealPct', 'freeBandage', 'cookPct', 'foodX2', 'foodSave', 'bento', 'restSta', 'restPct', 'sleepHeal',
  // Ship and sea
  'voyagePct', 'lookout', 'wearPct', 'autoRepair', 'repair', 'upgradePct', 'herb', 'wood', 'cannonHit', 'cannonDmg',
  'cannonDmgPct', 'cannonCrit', 'broadside',
  // Money and XP
  'shopPct', 'beliPct', 'sellPct', 'slipPct', 'bountyPct', 'islandXpPct', 'questXpPct',
  // Pools and haki
  'hpPct', 'hp', 'sta', 'armament', 'observation', 'conquer', 'conqTier', 'conqSta', 'hakiMult', 'hakiDrain',
  // What a keystone forbids
  'noRanged', 'onlyUnarmed', 'noGuard',
] as const

export const meleeWeapons: readonly Weapon[] = ['fist', 'kick', 'sword', 'spear', 'staff', 'heavy']
export const rangedWeapons: readonly Weapon[] = ['musket', 'sling', 'bow']
/** The groups a weapon belongs to, for narrowed keys. */
export const armedWeapons: readonly Weapon[] = ['sword', 'spear', 'staff', 'heavy']
/** The groups a weapon belongs to, for narrowed keys: `ranged` (shooting), `melee`, and within melee `unarmed` or `armed`. */
export const weaponScopes = (weapon: Weapon) => [weapon, meleeWeapons.includes(weapon) ? 'melee' : 'ranged',
  ...(weapon === 'fist' || weapon === 'kick' ? ['unarmed'] : armedWeapons.includes(weapon) ? ['armed'] : [])]

export const regionInfo: Record<TalentRegion, { label: string, colour: string, about: string }> = {
  start: { label: '舵輪', colour: '#e0b35a', about: '每個職業的起點和六屬性之門' },
  combat: { label: '武鬥海域', colour: '#e0704c', about: '命中、傷害、爆擊和九種攻擊方式' },
  sea: { label: '偉大航道', colour: '#4f9bd6', about: '航海、砲擊、交涉、財富與夥伴' },
  grit: { label: '不屈海域', colour: '#5fb27a', about: '耐打、閃避、醫療、料理與修船' },
  fruit: { label: '惡魔果實', colour: '#a77ddb', about: '吃下果實後開啟：果實招式與三系的路線' },
  haki: { label: '霸氣海域', colour: '#a9b8d0', about: '兩年修行後開啟：武裝色、見聞色、霸王色' },
}

type Named = { name: string, text: string, fx: Fx, kind?: 'notable' | 'keystone' | 'minor', need?: Need }
const notable = (name: string, text: string, fx: Fx, need?: Need): Named => ({ name, text, fx, kind: 'notable', need })
const keystone = (name: string, text: string, fx: Fx, need?: Need): Named => ({ name, text, fx, kind: 'keystone', need })
const special = (name: string, fx: Fx): Named => ({ name, text: name, fx, kind: 'minor' })

const jobSkill: Record<Profession, [string, Fx]> = {
  fighter: ['命中 +1', { hit: 1 }], sniper: ['射擊命中 +1', { 'hit@ranged': 1 }], navigator: ['航海 +1', { 'skill:航海': 1 }],
  archaeologist: ['觀察 +1', { 'skill:觀察': 1 }], musician: ['說服 +1', { 'skill:說服': 1 }], shipwright: ['工藝 +1', { 'skill:工藝': 1 }],
  doctor: ['醫術 +1', { 'skill:醫術': 1 }], cook: ['烹飪 +1', { 'skill:烹飪': 1 }],
}
const jobLabels: Record<Profession, string> = {
  fighter: '戰鬥員', sniper: '狙擊手', navigator: '航海士', archaeologist: '考古學家', musician: '音樂家', shipwright: '船匠', doctor: '船醫', cook: '廚師',
}
const attributeNames: Record<Attribute, string> = { STR: '力量', AGI: '敏捷', CON: '體魄', PER: '感知', INT: '智識', WIL: '意志' }

const named: Record<string, Named> = {
  // Job notables
  'fighter.a': notable('打架的直覺', '每場戰鬥第一回合防禦 +2。', { firstRoundDef: 2 }),
  'fighter.b': notable('越打越熱', '每次命中後，下一擊傷害 +2（不疊加）。', { heatDmg: 2 }),
  'navigator.a': notable('讀海流', '航程時間 −10%。', { voyagePct: -10 }),
  'navigator.b': notable('測量海圖', '第一次抵達一座島時，XP 獎勵 +50%。', { islandXpPct: 50 }),
  'doctor.a': notable('萬能藥的志向', '包紮回復 +25%。', { healPct: 25 }),
  'doctor.b': notable('隨身藥箱', '每場戰鬥第一次用繃帶或草藥不消耗。', { freeBandage: 1 }),
  'cook.a': notable('一流廚師', '休息、睡覺時你做的飯多回復 25%。', { cookPct: 25 }),
  'cook.b': notable('不浪費食物', '吃東西時有 30% 機率不消耗。', { foodSave: 30 }),
  'shipwright.a': notable('船的聲音', '航行和海戰中船受到的損傷 −20%。', { wearPct: -20 }),
  'shipwright.b': notable('隨手修理', '每次航行抵達時，主船自動修 10。', { autoRepair: 10 }),
  'sniper.a': notable('鷹之眼', '射擊命中 +1。', { 'hit@ranged': 1 }),
  'sniper.b': notable('虛張聲勢', '交涉讓敵人收手的判定 +2。', { negotiate: 2 }),
  'archaeologist.a': notable('解讀古文', '島上委託的搜索判定 +2。', { search: 2 }),
  'archaeologist.b': notable('歷史的知識', '島上委託的 XP +15%。', { questXpPct: 15 }),
  'musician.a': notable('振奮的旋律', '休息、睡覺時同地全隊多回復 3 STA。', { restSta: 3 }),
  'musician.b': notable('戰歌', '每場戰鬥第一回合，同地全隊命中 +1。', { round1AuraHit: 1 }),

  // Combat: the shared road
  'c.instinct': notable('戰鬥本能', '命中 +1。', { hit: 1 }),
  'c.technique': notable('招式熟練', '基礎特殊招式、進階招式少花 1 STA。', { staTech: 1 }),
  'c.power': notable('強攻', '強力攻擊的傷害加成 +2 → +4。', { powerDmg: 2 }),
  'c.flurry': notable('連續攻擊專家', '連續攻擊少花 2 STA。', { staFlurry: 2 }),
  'c.crit': notable('會心', '骰出 19 也算爆擊。', { crit: 1 }),
  'c.deadly': notable('致命一擊', '爆擊時再多擲一顆傷害骰。', { critDice: 1 }),
  'k.allout': keystone('捨身一擊', '每場戰鬥第一次命中，傷害 ×2。代價：那一擊之後，這場防禦 −2。', { allOut: 1 }),
  // Combat: one road for each attack method
  'w.fist.iron': notable('鐵拳', '徒手的傷害骰 d4 → d8。', { 'die@fist': 8 }),
  'w.fist.weight': notable('拳頭的重量', '徒手攻擊無視 2 點護甲。', { 'pierce@fist': 2 }),
  'w.fist.chain': notable('連環拳', '徒手連續攻擊每擊傷害 +2。', { 'flurryDmg@fist': 2 }),
  'k.body': keystone('肉身即武器', '徒手或腿技時防禦 +2、傷害 +3。代價：不能改用任何武器。', { 'def@unarmed': 2, 'dmg@unarmed': 3, onlyUnarmed: 1 }),
  'w.kick.steel': notable('鋼腿', '腿技的傷害骰 d6 → d8。', { 'die@kick': 8 }),
  'w.kick.spin': notable('迴旋踢', '腿技連續攻擊少花 2 STA。', { 'staFlurry@kick': 2 }),
  'w.kick.step': notable('輕盈步法', '用腿技時防禦 +1。', { 'def@kick': 1 }),
  'w.sword.iron': notable('斬鐵', '刀劍攻擊無視 2 點護甲。', { 'pierce@sword': 2 }),
  'w.sword.draw': notable('居合', '每場戰鬥第一次用刀劍命中，傷害 +3。', { 'openingDmg@sword': 3 }),
  'w.sword.two': notable('二刀流', '用刀劍連續攻擊每擊傷害 +2。', { 'flurryDmg@sword': 2 }),
  'k.swordsman': keystone('劍豪之道', '用刀劍時命中 +2、傷害 +3。代價：不能改用火槍、彈弓或弓。', { 'hit@sword': 2, 'dmg@sword': 3, noRanged: 1 }),
  'w.spear.thrust': notable('突刺', '長槍命中 +1，無視 1 點護甲。', { 'hit@spear': 1, 'pierce@spear': 1 }),
  'w.spear.reach': notable('間距', '用長槍時防禦 +1。', { 'def@spear': 1 }),
  'w.spear.pierce': notable('貫穿', '長槍爆擊時再多擲一顆傷害骰。', { 'critDice@spear': 1 }),
  'w.staff.art': notable('棍術', '鐵棍的防禦加成 +1 → +2。', { 'def@staff': 1 }),
  'w.staff.point': notable('點穴', '鐵棍命中時，20% 機率讓對手愣住、這回合無法出手。', { 'aweOnHit@staff': 20 }),
  'w.staff.spin': notable('旋棍', '鐵棍連續攻擊每擊傷害 +1。', { 'flurryDmg@staff': 1 }),
  'w.heavy.brawn': notable('蠻力', '取消大斧的命中 −1。', { 'hit@heavy': 1 }),
  'w.heavy.cleave': notable('劈山', '大斧強力攻擊傷害再 +3。', { 'powerDmg@heavy': 3 }),
  'w.heavy.quake': notable('震地', '大斧爆擊時，對手愣住、這回合無法出手。', { 'aweOnCrit@heavy': 1 }),
  'k.berserk': keystone('狂戰士', '傷害 +4。代價：不能擺防守架勢，也不能撤退。', { dmg: 4, noGuard: 1 }),
  'w.musket.quick': notable('快手', '火槍命中 +1。', { 'hit@musket': 1 }),
  'w.musket.ap': notable('穿甲彈', '火槍無視 2 點護甲。', { 'pierce@musket': 2 }),
  'w.musket.save': notable('省彈', '每場戰鬥第一發子彈不消耗。', { 'freeShot@musket': 1 }),
  'k.sniper': keystone('狙擊之王', '射擊命中 +3。代價：近身攻擊命中 −3。', { 'hit@ranged': 3, 'hit@melee': -3 }),
  'w.sling.sure': notable('必中的小石子', '彈弓命中 +2。', { 'hit@sling': 2 }),
  'w.sling.spread': notable('多彈齊發', '彈弓連續攻擊少花 2 STA。', { 'staFlurry@sling': 2 }),
  'w.sling.powder': notable('火藥彈', '彈弓命中時，25% 機率讓對手愣住、這回合無法出手。', { 'aweOnHit@sling': 25 }),
  'w.bow.draw': notable('拉滿弓', '弓的強力攻擊傷害 +3。', { 'powerDmg@bow': 3 }),
  'w.bow.rapid': notable('連射', '弓的連續攻擊 4 STA → 3 STA。', { 'staFlurry@bow': 1 }),
  'w.bow.far': notable('遠距離', '每場戰鬥第一回合用弓命中 +3。', { 'firstRoundHit@bow': 3 }),

  // Grand Line
  's.weather': notable('看透天候', '航行遇上麻煩的機會降低，效果等於多一級瞭望台。', { lookout: 1 }),
  's.wind': notable('順風', '航程時間 −15%。', { voyagePct: -15 }),
  's.escape': notable('逃跑專家', '海戰中甩開對手的判定 +3。', { flee: 3 }),
  's.helm': notable('老練舵手', '航行遇上麻煩的機會再降低一級。', { lookout: 1 }),
  'k.wander': keystone('浪跡天涯', '航程時間 −30%。代價：休息、睡覺的回復量 −30%。', { voyagePct: -30, restPct: -30 }),
  's.gunner': notable('砲手', '開砲命中 +2。', { cannonHit: 2 }),
  's.heavygun': notable('重砲', '開砲傷害 +3。', { cannonDmg: 3 }),
  's.aim': notable('瞄準船身', '開砲骰出 18～20 都算爆擊。', { cannonCrit: 2 }),
  's.broadside': notable('舷側齊射', '開砲命中時，其他對手也受到一半傷害。', { broadside: 1 }),
  's.tongue': notable('能言善道', '交涉讓敵人收手的判定 +3。', { negotiate: 3 }),
  's.threat': notable('威嚇', '交涉失敗時，那名對手這回合命中 −2。', { shake: 2 }),
  's.friends': notable('人脈', '說服類的自由行動判定 +2。', { persuade: 2 }),
  's.news': notable('消息靈通', '觀察類的自由行動判定 +2。', { observe: 2 }),
  'k.peace': keystone('和平主義者', '交涉判定 +6。代價：你造成的傷害 −50%。', { negotiate: 6, dmgPct: -50 }),
  's.haggle': notable('殺價高手', '商店價格便宜 10%。', { shopPct: -10 }),
  's.treasure': notable('尋寶獵人', '戰鬥和委託拿到的貝里 +20%。', { beliPct: 20 }),
  's.trader': notable('行商的朋友', '賣東西給行商多拿 20%。', { sellPct: 20 }),
  's.hunter': notable('懸賞金獵人', '兌換賞金單多拿 30%。', { slipPct: 30 }),
  'k.gold': keystone('一擲千金', '戰鬥和委託拿到的貝里 +50%。代價：買東西貴 20%。', { beliPct: 50, shopPct: 20 }),
  's.popular': notable('受人歡迎', '邀請夥伴的判定 +2。', { recruit: 2 }),
  's.captain': notable('船長的器量', '同地夥伴傷害 +2。', { allyDmg: 2 }),
  's.trust': notable('信賴', '同地夥伴命中 +1。', { allyHit: 1 }),
  's.bond': notable('同伴的羈絆', '同地有隊友倒下時，你的傷害 +3。', { downedAllyDmg: 3 }),
  'k.flag': keystone('海賊旗下', '同地全隊命中 +1。代價：你的懸賞金漲得快 50%。', { auraHit: 1, bountyPct: 50 }),

  // Unbowed sea
  'g.steel': notable('鋼鐵之軀', '每次受到的傷害 −1。', { dr: 1 }),
  'g.wall': notable('鐵壁', '防守架勢的防禦加成 +2 → +5。', { guard: 3 }),
  'g.counter': notable('反擊', '擺防守架勢時對手打空，你就反擊一次。', { counter: 1 }),
  'g.stubborn': notable('頑強', 'HP 低於 25% 時防禦 +2。', { lowHpDef: 2 }),
  'k.rock': keystone('磐石', '防禦 +3。代價：閃避類判定和海上撤退判定 −5。', { def: 3, dodgeCheck: -5, flee: -5 }),
  'g.swallow': notable('身輕如燕', '閃避 +1、防禦 +1。', { 'skill:閃避': 1, def: 1 }),
  'g.critguard': notable('看穿爆擊', '對手對你的爆擊改成普通命中。', { critGuard: 1 }),
  'g.shadow': notable('殘影', '每場戰鬥第一次被打中時，傷害減半。', { fadeFirst: 1 }),
  'g.reflex': notable('閃避反應', '對手打空你之後，你的下一擊命中 +2。', { missHit: 2 }),
  'k.unbowed': keystone('不屈的意志', '每場戰鬥第一次倒下時，剩 1 HP 站起來。代價：HP 上限 −10%。', { lastStand: 1, hpPct: -10 }),
  'g.first': notable('急救專家', '包紮回復 ×1.5。', { healPct: 50 }),
  'g.cure': notable('妙手回春', '睡覺時同地全隊多回復 12% HP。', { sleepHeal: 12 }),
  'g.field': notable('戰地醫生', '戰鬥中包紮回復 +50%。', { fieldHealPct: 50 }),
  'g.herbs': notable('草藥學', '採集時草藥多 1 份。', { herb: 1 }),
  'k.angel': keystone('戰地天使', '包紮和藥的回復加倍。代價：你造成的傷害 −30%。', { healPct: 100, potionPct: 100, dmgPct: -30 }),
  'g.glutton': notable('大胃王', '吃東西的回復量加倍。', { foodX2: 1 }),
  'g.feast': notable('海上大餐', '休息、睡覺時同地全隊多回復 5 STA。', { restSta: 5 }),
  'g.bento': notable('便當', '每天第一次吃東西不消耗。', { bento: 1 }),
  'g.diet': notable('營養均衡', 'STA 上限 +5。', { sta: 5 }),
  'g.patch': notable('應急修補', '修船多修 20。', { repair: 20 }),
  'g.refit': notable('改裝專家', '改裝船隻便宜 10%。', { upgradePct: -10 }),
  'g.timber': notable('木料採集', '有船時，採集多撿 1 份木料。', { wood: 1 }),
  'g.keel': notable('堅固龍骨', '航行和海戰中船受到的損傷 −25%。', { wearPct: -25 }),
  'k.fury': keystone('越戰越勇', 'HP 低於一半時傷害 +3。代價：休息、睡覺的回復量 −50%。', { lowHpDmg: 3, restPct: -50 }),

  // Devil fruit
  'f.develop': notable('能力開發', '果實招式提早兩級學會。', { fruitEarly: 2 }),
  'f.skill': notable('果實的熟練', '果實招式命中 +1。', { fruitHit: 1 }),
  'f.resist': notable('抗性', '在海上戰鬥時，不再受到能力者的防禦 −2。', { seaGuard: 2 }),
  'k.symbiosis': keystone('與果實共生', '果實招式的 STA 花費減半。代價：在海上戰鬥時防禦再 −4。', { fruitStaHalf: 1, seaPenalty: 4 }),
  'p.apply': notable('應用技', '每場戰鬥第一次用果實招式不花 STA。', { fruitFreeFirst: 1 }),
  'p.extend': notable('能力延伸', '果實招式傷害 +3。', { fruitDmg: 3 }),
  'p.control': notable('精準控制', '果實招式骰出 18～20 都算爆擊。', { fruitCrit: 2 }),
  'p.body': notable('身體強化', '防禦 +1。', { def: 1 }),
  'k.awakenP': keystone('覺醒・超人系', '果實招式傷害 +4、命中 +2。代價：一場用了三次果實招式後，STA 歸零。需要 40 級。', { fruitDmg: 4, fruitHit: 2, awakened: 1 }, { level: awakeningLevel }),
  'z.wild': notable('野性', '傷害 +2，HP 上限 +10%。', { dmg: 2, hpPct: 10 }),
  'z.beast': notable('獸型', '強力攻擊傷害 +3。', { powerDmg: 3 }),
  'z.sense': notable('動物的直覺', '觀察 +1、閃避 +1。', { 'skill:觀察': 1, 'skill:閃避': 1 }),
  'z.hybrid': notable('人獸型', '動物系的 HP 加成 +10 → +30。', { zoanHp: 20 }),
  'k.awakenZ': keystone('覺醒・動物系', '傷害 +4，HP 上限 +20%。代價：一場用了三次果實招式後，STA 歸零。需要 40 級。', { dmg: 4, hpPct: 20, awakened: 1 }, { level: awakeningLevel }),
  'l.phase': notable('元素化身', '被沒有霸氣的對手打中時，25% 機率完全穿過身體。', { phase: 25 }),
  'l.surge': notable('元素奔流', '果實招式命中時，其他對手也受到一半傷害。', { fruitSplash: 1 }),
  'l.disaster': notable('天災', '果實招式傷害 +4，命中 −1。', { fruitDmg: 4, fruitHit: -1 }),
  'l.mend': notable('元素回復', '上一回合沒被打中時，回復 3% HP。', { regen: 3 }),
  'k.awakenL': keystone('覺醒・自然系', '果實招式打中所有對手。代價：一場用了三次果實招式後，STA 歸零。需要 40 級。', { fruitSweep: 1, awakened: 1 }, { level: awakeningLevel }),

  // Haki: rank nodes are minors on the road
  'ha.2': special('武裝色 Ⅱ', { armament: 1 }), 'ha.3': special('武裝色 Ⅲ', { armament: 1 }), 'ha.4': special('武裝色 Ⅳ', { armament: 1 }),
  'ha.5': special('武裝色 Ⅴ', { armament: 1 }), 'ha.6': special('武裝色 Ⅵ', { armament: 1 }),
  'ho.2': special('見聞色 Ⅱ', { observation: 1 }), 'ho.3': special('見聞色 Ⅲ', { observation: 1 }), 'ho.4': special('見聞色 Ⅳ', { observation: 1 }),
  'ho.5': special('見聞色 Ⅴ', { observation: 1 }), 'ho.6': special('見聞色 Ⅵ', { observation: 1 }),
  'hc.sta': special('放出霸王色少花 2 STA', { conqSta: 2 }),
  'h.harden': notable('武裝硬化', '防守架勢的防禦再 +2；每次受到的傷害 −2。', { guard: 2, dr: 2 }),
  'h.coat': notable('纏繞武器', '武器、子彈和箭也帶霸氣，傷害 +2。', { dmg: 2 }),
  'h.black': notable('黑刀', '用刀劍時，武裝色每級傷害再 +1。', { 'armamentDmg@sword': 1 }),
  'h.fist': notable('硬化之拳', '徒手或腿技時，武裝色每級傷害再 +1。', { 'armamentDmg@unarmed': 1 }),
  'h.clash': notable('霸氣碰撞', '攻擊有霸氣的對手時，命中 +2。', { vsHakiHit: 2 }),
  'k.ryuo': keystone('流櫻', '攻擊無視全部護甲；打有霸氣的對手時傷害再 +3。代價：每次攻擊多花 2 STA。', { pierce: 99, vsHakiDmg: 3, staAttack: 2 }),
  'h.read': notable('預判', '每場戰鬥第一次被打中時，改成打空。', { dodgeFirst: 1 }),
  'h.range': notable('感知範圍', '島上委託的搜索判定 +2；每場戰鬥第一回合，同地全隊防禦 +2。', { search: 2, round1AuraDef: 2 }),
  'h.mind': notable('讀心', '交涉判定 +2。', { negotiate: 2 }),
  'h.weak': notable('看穿弱點', '攻擊無視 1 點護甲。', { pierce: 1 }),
  'h.field': notable('戰場感知', '每場戰鬥第一回合，同地全隊命中 +1。', { round1AuraHit: 1 }),
  'k.future': keystone('未來視', '對手打你的命中 −3。代價：每回合花 2 STA，STA 不夠時這回合沒有效果。', { foresight: 3 }),
  'h.conqueror': notable('霸王色霸氣', '可以在戰鬥中放出霸王色（一場一次）：較弱的對手昏倒，其他沒有霸氣的對手愣住。', { conquer: 1 }, { conqueror: true }),
  'h.awe': notable('霸王之威', '放出霸王色之後，這場同地全隊命中 +1。', { conqAura: 1 }),
  'h.wide': notable('威壓擴大', '霸王色能震昏、震懾的對手強度 +1 級。', { conqTier: 1 }),
  'h.king': notable('王者風範', '邀請夥伴、說服類判定 +2。', { recruit: 2, persuade: 2 }),
  'k.conqCoat': keystone('霸王色纏繞', '傷害 +4，打有霸氣的對手時再 +2。代價：每次攻擊多花 3 STA。需要 40 級。', { dmg: 4, vsHakiDmg: 2, staAttack: 3 }, { conqueror: true, level: awakeningLevel }),
  'k.fullHaki': keystone('霸氣全開', '武裝色、見聞色的等級 ×1.5。代價：每場戰鬥結束時 STA 歸零。', { hakiMult: 50, hakiDrain: 1 }),
  'h.basics': notable('霸氣的基本功', '命中 +1；每次受到的傷害 −1。', { hit: 1, dr: 1 }),
  'h.breath': notable('霸氣的呼吸', 'STA 上限 +4；休息、睡覺時多回復 1 STA。', { sta: 4, restSta: 1 }),
  'h.sense': notable('霸氣感應', '攻擊有霸氣的對手時命中 +1；搜索判定 +1。', { vsHakiHit: 1, search: 1 }),

  // Shared hubs in the combat sea: one ability for every weapon of a kind, between the roads it serves.
  'r.sight': notable('準星', '所有射擊武器（火槍、彈弓、弓）命中 +1。', { 'hit@ranged': 1 }),
  'r.pierce': notable('穿透射擊', '射擊無視 1 點護甲。', { 'pierce@ranged': 1 }),
  'r.weak': notable('瞄準要害', '射擊骰出 19 也算爆擊。', { 'crit@ranged': 1 }),
  'r.rhythm': notable('連射的節奏', '射擊的連續攻擊少花 1 STA。', { 'staFlurry@ranged': 1 }),
  'r.first': notable('先發制人', '每場戰鬥第一回合射擊命中 +2。', { 'firstRoundHit@ranged': 2 }),
  'a.grip': notable('兵器握法', '持兵器（刀劍、長槍、鐵棍、大斧）命中 +1。', { 'hit@armed': 1 }),
  'a.edge': notable('磨利的鋒刃', '持兵器傷害 +2。', { 'dmg@armed': 2 }),
  'a.parry': notable('招架', '持兵器時防禦 +1。', { 'def@armed': 1 }),
  'a.swing': notable('全力揮擊', '持兵器的強力攻擊傷害再 +2。', { 'powerDmg@armed': 2 }),
  'a.split': notable('劈甲', '持兵器攻擊無視 1 點護甲。', { 'pierce@armed': 1 }),
  'k.master': keystone('武器大師', '持兵器時命中 +1、傷害 +2，骰出 19 也算爆擊。代價：徒手、腿技和射擊傷害 −4。',
    { 'hit@armed': 1, 'dmg@armed': 2, 'crit@armed': 1, 'dmg@unarmed': -4, 'dmg@ranged': -4 }),
  'u.combo': notable('拳腳連打', '徒手或腿技的連續攻擊每擊傷害 +1。', { 'flurryDmg@unarmed': 1 }),
  'u.close': notable('貼身防禦', '徒手或腿技時防禦 +1。', { 'def@unarmed': 1 }),
  'u.vital': notable('打要害', '徒手或腿技骰出 19 也算爆擊。', { 'crit@unarmed': 1 }),
  'u.shock': notable('震擊', '徒手或腿技命中時，10% 機率讓對手愣住、這回合無法出手。', { 'aweOnHit@unarmed': 10 }),
  'u.burst': notable('爆發力', '徒手或腿技的強力攻擊傷害再 +2。', { 'powerDmg@unarmed': 2 }),
  'm.grapple': notable('近身纏鬥', '所有近戰（兵器和拳腳）命中 +1。', { 'hit@melee': 1 }),
  'm.opening': notable('搶攻', '每場戰鬥第一次近戰命中，傷害 +2。', { 'openingDmg@melee': 2 }),
  'm.step': notable('步法', '近戰時防禦 +1。', { 'def@melee': 1 }),
  'm.crush': notable('擊碎', '近戰爆擊時再多擲一顆傷害骰。', { 'critDice@melee': 1 }),
  'm.press': notable('步步進逼', '近戰傷害 +8%。', { 'dmgPct@melee': 8 }),

  // Hubs in the other seas: abilities that serve two roads at once.
  's.order': notable('號令', '開砲命中 +1；同地夥伴命中 +1。', { cannonHit: 1, allyHit: 1 }),
  's.together': notable('齊心協力', '每場戰鬥第一回合，同地全隊防禦 +1；同地夥伴傷害 +1。', { round1AuraDef: 1, allyDmg: 1 }),
  's.back': notable('船長的背影', '邀請夥伴的判定 +1；夥伴傷害 +5%。', { recruit: 1, allyDmgPct: 5 }),
  's.plan': notable('戰術板', '每場戰鬥第一回合命中 +1；開砲傷害 +1。', { firstRoundHit: 1, cannonDmg: 1 }),
  'g.calm': notable('沉著', '防禦 +1；每次受到的傷害 −1。', { def: 1, dr: 1 }),
  'g.grit': notable('咬牙撐住', 'HP 低於 25% 時防禦 +1；上一回合沒被打中時回復 2% HP。', { lowHpDef: 1, regen: 2 }),
  'g.recover': notable('恢復力', '休息、睡覺的回復量 +15%；包紮回復 +10%。', { restPct: 15, healPct: 10 }),
  'g.thick': notable('皮粗肉厚', 'HP 上限 +6%。', { hpPct: 6 }),
  'f.blend': notable('果實與武藝', '果實招式傷害 +1；所有攻擊傷害 +1。', { fruitDmg: 1, dmg: 1 }),
  'f.pace': notable('能力的節奏', '果實招式傷害 +6%；STA 上限 +3。', { fruitDmgPct: 6, sta: 3 }),

  // Borders: where two seas meet, abilities that belong to both.
  'b.trade': notable('以傷換傷', 'HP 低於一半時傷害 +2；HP 低於 25% 時防禦 +1。', { lowHpDmg: 2, lowHpDef: 1 }),
  'b.guardstrike': notable('守中帶攻', '防守架勢的防禦加成 +1；對手打空你之後，下一擊命中 +1。', { guard: 1, missHit: 1 }),
  'b.patchup': notable('包紮後再上', '戰鬥中包紮回復 +30%；每場戰鬥第一回合防禦 +1。', { fieldHealPct: 30, firstRoundDef: 1 }),
  'b.hardy': notable('硬底子', '每次受到的傷害 −1；傷害 +1。', { dr: 1, dmg: 1 }),
  'b.vessel': notable('能力者的體質', 'HP 上限 +4%；果實招式命中 +1。', { hpPct: 4, fruitHit: 1 }),
  'b.ballast': notable('壓艙石', '在海上戰鬥時，能力者的防禦懲罰少 1；船受到的損傷 −5%。', { seaGuard: 1, wearPct: -5 }),
  'b.mend': notable('自癒', '上一回合沒被打中時回復 2% HP；吃東西的回復量 +10%。', { regen: 2, cookPct: 10 }),
  'b.wild': notable('野外求生', '採集時草藥多 1 份；HP 上限 +3%。', { herb: 1, hpPct: 3 }),
  'b.seaborn': notable('海上的能力者', '航程時間 −5%；果實招式傷害 +1。', { voyagePct: -5, fruitDmg: 1 }),
  'b.drift': notable('漂流者', '海戰中甩開對手的判定 +2；在海上戰鬥時，能力者的防禦懲罰少 1。', { flee: 2, seaGuard: 1 }),
  'b.legend': notable('傳說的果實', '觀察類的自由行動判定 +1；果實招式傷害 +4%。', { observe: 1, fruitDmgPct: 4 }),
  'b.market': notable('黑市門路', '賣東西給行商多拿 10%；果實招式命中 +1。', { sellPct: 10, fruitHit: 1 }),
  'b.gaze': notable('霸氣的眼神', '交涉判定 +2；觀察類的自由行動判定 +2。', { negotiate: 2, observe: 2 }),
  'b.voice': notable('萬物之聲', '航行遇上麻煩的機會降低一級；搜索判定 +1。', { lookout: 1, search: 1 }),
  'b.presence': notable('存在感', '說服類判定 +1；同地夥伴命中 +1。', { persuade: 1, allyHit: 1 }),
  'b.weather': notable('風的預感', '航程時間 −5%；每場戰鬥第一回合防禦 +1。', { voyagePct: -5, firstRoundDef: 1 }),
  'b.will': notable('戰意', '命中 +1；攻擊有霸氣的對手時命中再 +1。', { hit: 1, vsHakiHit: 1 }),
  'b.forged': notable('鍛鍊的拳頭', '徒手或腿技時，武裝色每級傷害再 +1。', { 'armamentDmg@unarmed': 1 }),
  'b.edgeHaki': notable('刃上的氣', '持兵器時，武裝色每級傷害再 +1。', { 'armamentDmg@armed': 1 }),
  'b.arrowHaki': notable('箭上的氣', '射擊時，武裝色每級傷害再 +1。', { 'armamentDmg@ranged': 1 }),
}

type Minor = [string, Fx]
/** `entry`: the sea's entrance opens onto this road (otherwise onto the middle roads). */
type Route = { id: string, region: TalentRegion, items: string[], minors: Minor[], gap: number, need?: Need, entry?: true }

const weaponLabel: Record<Weapon, string> = { fist: '徒手', kick: '腿技', sword: '刀劍', spear: '長槍', staff: '鐵棍', heavy: '大斧', musket: '火槍', sling: '彈弓', bow: '弓' }
const weaponRoad = (weapon: Weapon, items: string[]): Route => ({
  id: 'w.' + weapon, region: 'combat', items, gap: 2,
  minors: [[weaponLabel[weapon] + '傷害 +5%', { ['dmgPct@' + weapon]: 5 }], ['STA 上限 +1', { sta: 1 }], ['HP 上限 +1%', { hpPct: 1 }]],
})
/** A shared hub: its small nodes help every weapon of the group, so switching weapons inside it wastes nothing. */
const hub = (id: string, scope: string, label: string, items: string[]): Route => ({
  id, region: 'combat', items, gap: 2,
  minors: [[label + '傷害 +3%', { ['dmgPct@' + scope]: 3 }], ['STA 上限 +1', { sta: 1 }], [label + '傷害 +2%、HP 上限 +1%', { ['dmgPct@' + scope]: 2, hpPct: 1 }]],
})
/**
 * Each sea's roads in the order they lie on the chart. Hubs sit between the roads they serve: 射擊 among the guns and bows,
 * 兵器 among the blades and staves, 拳腳 between kick and fist, and 近戰 where the armed and unarmed roads meet.
 */
const routes: Route[] = [
  // Combat
  weaponRoad('sling', ['w.sling.sure', 'w.sling.spread', 'w.sling.powder']),
  weaponRoad('bow', ['w.bow.draw', 'w.bow.rapid', 'w.bow.far']),
  hub('c.ranged', 'ranged', '射擊', ['r.sight', 'r.pierce', 'r.weak', 'r.rhythm', 'r.first', 'k.sniper']),
  weaponRoad('musket', ['w.musket.quick', 'w.musket.ap', 'w.musket.save']),
  { id: 'c.core', region: 'combat', entry: true, items: ['c.instinct', 'c.technique', 'c.power', 'c.flurry', 'c.crit', 'c.deadly', 'k.allout'], gap: 2,
    minors: [['傷害 +3%', { dmgPct: 3 }], ['STA 上限 +1', { sta: 1 }], ['傷害 +1%、HP 上限 +1%', { dmgPct: 1, hpPct: 1 }]] },
  weaponRoad('sword', ['w.sword.iron', 'w.sword.draw', 'w.sword.two', 'k.swordsman']),
  weaponRoad('spear', ['w.spear.thrust', 'w.spear.reach', 'w.spear.pierce']),
  hub('c.armed', 'armed', '兵器', ['a.grip', 'a.edge', 'a.parry', 'a.swing', 'a.split', 'k.master']),
  weaponRoad('staff', ['w.staff.art', 'w.staff.point', 'w.staff.spin']),
  weaponRoad('heavy', ['w.heavy.brawn', 'w.heavy.cleave', 'w.heavy.quake', 'k.berserk']),
  hub('c.melee', 'melee', '近戰', ['m.grapple', 'm.opening', 'm.step', 'm.crush', 'm.press']),
  weaponRoad('kick', ['w.kick.steel', 'w.kick.spin', 'w.kick.step']),
  hub('c.unarmed', 'unarmed', '拳腳', ['u.combo', 'u.close', 'u.vital', 'u.shock', 'u.burst']),
  weaponRoad('fist', ['w.fist.iron', 'w.fist.weight', 'w.fist.chain', 'k.body']),
  // Grand Line
  { id: 's.sail', region: 'sea', items: ['s.weather', 's.wind', 's.escape', 's.helm', 'k.wander'], gap: 3, minors: [['航程時間 −2%', { voyagePct: -2 }], ['STA 上限 +1', { sta: 1 }], ['航程時間 −1%、HP 上限 +1%', { voyagePct: -1, hpPct: 1 }]] },
  { id: 's.guns', region: 'sea', items: ['s.gunner', 's.heavygun', 's.aim', 's.broadside'], gap: 3, minors: [['開砲傷害 +5%', { cannonDmgPct: 5 }], ['HP 上限 +2%', { hpPct: 2 }], ['船受到的損傷 −2%', { wearPct: -2 }]] },
  { id: 's.command', region: 'sea', items: ['s.order', 's.together', 's.back', 's.plan'], gap: 3, minors: [['夥伴傷害 +2%、開砲傷害 +2%', { allyDmgPct: 2, cannonDmgPct: 2 }], ['STA 上限 +1', { sta: 1 }], ['HP 上限 +1%', { hpPct: 1 }]] },
  { id: 's.crew', region: 'sea', items: ['s.popular', 's.captain', 's.trust', 's.bond', 'k.flag'], gap: 3, minors: [['夥伴傷害 +3%', { allyDmgPct: 3 }], ['HP 上限 +2%', { hpPct: 2 }], ['委託 XP +2%', { questXpPct: 2 }]] },
  { id: 's.talk', region: 'sea', items: ['s.tongue', 's.threat', 's.friends', 's.news', 'k.peace'], gap: 3, minors: [['委託 XP +3%', { questXpPct: 3 }], ['STA 上限 +1', { sta: 1 }], ['商店價格 −1%', { shopPct: -1 }]] },
  { id: 's.gold', region: 'sea', items: ['s.haggle', 's.treasure', 's.trader', 's.hunter', 'k.gold'], gap: 3, minors: [['貝里收入 +2%', { beliPct: 2 }], ['商店價格 −1%', { shopPct: -1 }], ['賣價 +2%', { sellPct: 2 }]] },
  // Unbowed sea
  { id: 'g.body', region: 'grit', items: ['g.steel', 'g.wall', 'g.counter', 'g.stubborn', 'k.rock'], gap: 2, minors: [['HP 上限 +2%', { hpPct: 2 }], ['受到的傷害 −1%', { drPct: 1 }], ['STA 上限 +1', { sta: 1 }]] },
  { id: 'g.tough', region: 'grit', items: ['g.calm', 'g.grit', 'g.recover', 'g.thick'], gap: 2, minors: [['HP 上限 +2%', { hpPct: 2 }], ['休息回復 +3%', { restPct: 3 }], ['受到的傷害 −1%', { drPct: 1 }]] },
  { id: 'g.dodge', region: 'grit', items: ['g.swallow', 'g.critguard', 'g.shadow', 'g.reflex', 'k.unbowed'], gap: 2, minors: [['受到的傷害 −1%', { drPct: 1 }], ['STA 上限 +1', { sta: 1 }], ['HP 上限 +1%', { hpPct: 1 }]] },
  { id: 'g.medic', region: 'grit', items: ['g.first', 'g.cure', 'g.field', 'g.herbs', 'k.angel'], gap: 2, minors: [['包紮回復 +5%', { healPct: 5 }], ['HP 上限 +2%', { hpPct: 2 }], ['藥的回復 +5%', { potionPct: 5 }]] },
  { id: 'g.food', region: 'grit', items: ['g.glutton', 'g.feast', 'g.bento', 'g.diet', 'k.fury'], gap: 2, minors: [['料理回復 +5%', { cookPct: 5 }], ['STA 上限 +1', { sta: 1 }], ['休息回復 +3%', { restPct: 3 }]] },
  { id: 'g.ship', region: 'grit', items: ['g.patch', 'g.refit', 'g.timber', 'g.keel'], gap: 2, minors: [['船受到的損傷 −2%', { wearPct: -2 }], ['HP 上限 +2%', { hpPct: 2 }], ['修船 +3', { repair: 3 }]] },
  // Devil fruit: each kind of fruit has its own road; the shared ones lie in the middle.
  { id: 'f.para', region: 'fruit', items: ['p.apply', 'p.extend', 'p.control', 'p.body', 'k.awakenP'], gap: 2, need: { fruit: 'paramecia' }, minors: [['果實招式傷害 +4%', { fruitDmgPct: 4 }], ['HP 上限 +2%', { hpPct: 2 }]] },
  { id: 'f.core', region: 'fruit', items: ['f.develop', 'f.skill', 'f.resist', 'k.symbiosis'], gap: 2, need: { fruit: 'any' }, minors: [['果實招式傷害 +4%', { fruitDmgPct: 4 }], ['STA 上限 +1', { sta: 1 }]] },
  { id: 'f.shared', region: 'fruit', items: ['f.blend', 'f.pace'], gap: 3, need: { fruit: 'any' }, minors: [['果實招式傷害 +3%、傷害 +1%', { fruitDmgPct: 3, dmgPct: 1 }], ['HP 上限 +2%', { hpPct: 2 }]] },
  { id: 'f.zoan', region: 'fruit', items: ['z.wild', 'z.beast', 'z.sense', 'z.hybrid', 'k.awakenZ'], gap: 2, need: { fruit: 'zoan' }, minors: [['HP 上限 +2%', { hpPct: 2 }], ['傷害 +3%', { dmgPct: 3 }]] },
  { id: 'f.logia', region: 'fruit', items: ['l.phase', 'l.surge', 'l.disaster', 'l.mend', 'k.awakenL'], gap: 2, need: { fruit: 'logia' }, minors: [['果實招式傷害 +4%', { fruitDmgPct: 4 }], ['受到的傷害 −1%', { drPct: 1 }]] },
  // Haki
  { id: 'h.arm', region: 'haki', items: ['ha.2', 'h.harden', 'ha.3', 'h.coat', 'ha.4', 'h.black', 'ha.5', 'h.fist', 'ha.6', 'h.clash', 'k.ryuo'], gap: 1, need: { trained: true }, minors: [['傷害 +2%', { dmgPct: 2 }], ['HP 上限 +1%', { hpPct: 1 }]] },
  { id: 'h.all', region: 'haki', items: ['h.basics', 'h.breath', 'h.sense', 'k.fullHaki'], gap: 2, need: { trained: true }, minors: [['HP 上限 +2%', { hpPct: 2 }], ['傷害 +1%、受到的傷害 −1%', { dmgPct: 1, drPct: 1 }]] },
  { id: 'h.conq', region: 'haki', items: ['h.conqueror', 'hc.sta', 'h.awe', 'h.wide', 'h.king', 'k.conqCoat'], gap: 2, need: { trained: true, conqueror: true }, minors: [['傷害 +2%', { dmgPct: 2 }], ['STA 上限 +1', { sta: 1 }]] },
  { id: 'h.obs', region: 'haki', items: ['ho.2', 'h.read', 'ho.3', 'h.range', 'ho.4', 'h.mind', 'ho.5', 'h.weak', 'ho.6', 'h.field', 'k.future'], gap: 1, need: { trained: true }, minors: [['受到的傷害 −1%', { drPct: 1 }], ['STA 上限 +1', { sta: 1 }]] },
]

type Sea = Exclude<TalentRegion, 'start'>
/** Where two seas meet: a road of abilities that belong to both, joined to the nearest road on either side. */
type Border = { id: string, region: TalentRegion, between: [Sea, Sea], items: string[], minors: Minor[] }
const borders: Border[] = [
  { id: 'b.grit.combat', region: 'grit', between: ['grit', 'combat'], items: ['b.trade', 'b.guardstrike', 'b.patchup', 'b.hardy'], minors: [['傷害 +1%、HP 上限 +1%', { dmgPct: 1, hpPct: 1 }], ['受到的傷害 −1%', { drPct: 1 }]] },
  { id: 'b.fruit.grit', region: 'grit', between: ['fruit', 'grit'], items: ['b.vessel', 'b.ballast', 'b.mend', 'b.wild'], minors: [['HP 上限 +2%', { hpPct: 2 }], ['果實招式傷害 +2%、HP 上限 +1%', { fruitDmgPct: 2, hpPct: 1 }]] },
  { id: 'b.sea.fruit', region: 'sea', between: ['sea', 'fruit'], items: ['b.seaborn', 'b.drift', 'b.legend', 'b.market'], minors: [['航程時間 −1%、HP 上限 +1%', { voyagePct: -1, hpPct: 1 }], ['STA 上限 +1', { sta: 1 }]] },
  { id: 'b.haki.sea', region: 'sea', between: ['haki', 'sea'], items: ['b.gaze', 'b.voice', 'b.presence', 'b.weather'], minors: [['委託 XP +2%', { questXpPct: 2 }], ['HP 上限 +1%、受到的傷害 −1%', { hpPct: 1, drPct: 1 }]] },
  { id: 'b.combat.haki', region: 'combat', between: ['combat', 'haki'], items: ['b.will', 'b.forged', 'b.edgeHaki', 'b.arrowHaki'], minors: [['傷害 +2%', { dmgPct: 2 }], ['STA 上限 +1', { sta: 1 }]] },
]

/** Where each sea lies on the chart (degrees, 0 = east, clockwise) and how wide it is. */
const sectors: Record<Sea, { centre: number, width: number }> = {
  haki: { centre: -90, width: 54 }, sea: { centre: -26, width: 70 }, fruit: { centre: 36, width: 46 },
  grit: { centre: 95, width: 68 }, combat: { centre: 187, width: 108 },
}
/** The seas' wedges on the chart, for drawing. */
export const talentSectors: Readonly<typeof sectors> = sectors
const jobAngles: Record<Profession, number> = { navigator: -42, archaeologist: -8, musician: 22, shipwright: 70, doctor: 102, cook: 138, sniper: 170, fighter: 204 }
/** Each attribute gate hangs inside the wheel, behind one job's second notable. */
const gates: [Attribute, Profession][] = [['INT', 'navigator'], ['PER', 'archaeologist'], ['WIL', 'musician'], ['CON', 'doctor'], ['AGI', 'sniper'], ['STR', 'fighter']]
const ringRadius = 300
/** The bearing of a sea's entrance: in front of its entry road, or the middle of the sea. */
function entryAngle(region: Sea) {
  const list = routes.filter(route => route.region === region)
  const index = list.findIndex(route => route.entry)
  const { centre, width } = sectors[region]
  return index < 0 ? centre : centre + (index - (list.length - 1) / 2) * width / list.length
}
const step = 40
/** Neighbouring roads of a sea cross every this many nodes, so each sea is a web, not a fan. */
const ringEvery = 3

function build() {
  const nodes = new Map<string, TalentNode>()
  const rad = (deg: number) => deg * Math.PI / 180
  const at = (r: number, deg: number) => ({ x: Math.round(Math.cos(rad(deg)) * r), y: Math.round(Math.sin(rad(deg)) * r) })
  const add = (node: Omit<TalentNode, 'links' | 'x' | 'y'> & { x: number, y: number }) => { nodes.set(node.id, { ...node, links: [] }); return node.id }
  const link = (a: string, b: string) => {
    const [na, nb] = [nodes.get(a)!, nodes.get(b)!]
    if (!na.links.includes(b)) na.links.push(b)
    if (!nb.links.includes(a)) nb.links.push(a)
  }
  const minor = (id: string, region: TalentRegion, route: string, [name, fx]: Minor, x: number, y: number, need?: Need) =>
    add({ id, kind: 'minor', region, route, name, text: name, fx, x, y, need })
  /** Minors on a straight line from a to b (exclusive), linked a → … → b. */
  const chain = (id: string, a: string, b: string, count: number, region: TalentRegion, kinds: Minor[], need?: Need) => {
    const [na, nb] = [nodes.get(a)!, nodes.get(b)!]
    let last = a
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1)
      const next = minor(id + '.' + i, region, id, kinds[(i - 1) % kinds.length], Math.round(na.x + (nb.x - na.x) * t), Math.round(na.y + (nb.y - na.y) * t), need)
      link(last, next)
      last = next
    }
    link(last, b)
  }
  /** Minors along a circle from a to b (angles in degrees, a before b), linked a → … → b. */
  const arc = (id: string, a: string, from: number, b: string, to: number, r: number, count: number, region: TalentRegion, kinds: Minor[]) => {
    let last = a
    for (let k = 1; k <= count; k++) {
      const next = minor(id + '.' + k, region, id, kinds[k % kinds.length], at(r, from + (to - from) * k / (count + 1)).x, at(r, from + (to - from) * k / (count + 1)).y)
      link(last, next)
      last = next
    }
    link(last, b)
  }
  const pools: Minor[] = [['HP 上限 +2%', { hpPct: 2 }], ['STA 上限 +1', { sta: 1 }]]

  // The wheel: one start for each job, joined in a ring; the job's two notables inside it, joined to each other.
  const jobs = (Object.keys(jobAngles) as Profession[]).sort((a, b) => jobAngles[a] - jobAngles[b])
  for (const job of jobs) {
    const [text, fx] = jobSkill[job]
    add({ id: 'job.' + job, kind: 'root', region: 'start', route: 'start', name: jobLabels[job] + '的起點', text: '職業起點：' + text + '。', fx, ...at(ringRadius, jobAngles[job]) })
    for (const [side, offset] of [['a', -9], ['b', 9]] as const) {
      const id = job + '.' + side
      add({ id, kind: 'notable', region: 'start', route: 'job.' + job, ...named[id], fx: named[id].fx, ...at(218, jobAngles[job] + offset) })
      link('job.' + job, id)
    }
    link(job + '.a', job + '.b')
  }
  // The ring between starts; the long arc in the north passes the way to the haki sea.
  add({ id: 'ring.north', kind: 'minor', region: 'start', route: 'ring', name: 'HP 上限 +2%', text: 'HP 上限 +2%', fx: { hpPct: 2 }, ...at(ringRadius, -90) })
  const ring = [...jobs.map(job => ['job.' + job, jobAngles[job]] as const)]
  ring.splice(ring.findIndex(([, a]) => a > 180) + 1, 0, ['ring.north', 270])
  for (let i = 0; i < ring.length; i++) {
    const [a, from] = ring[i]
    const [b, rawTo] = ring[(i + 1) % ring.length]
    const to = rawTo <= from ? rawTo + 360 : rawTo
    arc('ring.' + i, a, from, b, to, ringRadius, Math.max(1, Math.round((to - from) / 15) - 1), 'start', pools)
  }
  // Six attribute gates inside the wheel, on an inner ring of their own: walk from one gate to the next.
  for (const [attr, job] of gates) {
    const id = 'attr.' + attr
    add({ id, kind: 'notable', region: 'start', route: 'attr', name: attributeNames[attr] + '之門', text: attributeNames[attr] + ' +1。', fx: { ['attr:' + attr]: 1 }, ...at(128, jobAngles[job] + 15) })
    chain('attr.' + attr + '.road', job + '.b', id, 1, 'start', pools)
  }
  const gateAngles = gates.map(([attr, job]) => ['attr.' + attr, jobAngles[job] + 15] as const).sort((a, b) => a[1] - b[1])
  gateAngles.forEach(([a, from], i) => {
    const [b, rawTo] = gateAngles[(i + 1) % gateAngles.length]
    const to = rawTo <= from ? rawTo + 360 : rawTo
    arc('gates.' + i, a, from, b, to, 128, Math.max(1, Math.round((to - from) / 30)), 'start', pools)
  })

  // Each sea: an entrance (or a free start), then roads fanning outwards.
  const entrance: Record<Sea, string> = { combat: 'gate.combat', sea: 'gate.sea', grit: 'gate.grit', fruit: 'root.fruit', haki: 'root.haki' }
  add({ id: 'root.fruit', kind: 'root', region: 'fruit', route: 'fruit', name: '能力者', text: '吃下惡魔果實時免費得到，開啟這片海域。', fx: {}, need: { fruit: 'any' }, ...at(450, sectors.fruit.centre) })
  add({ id: 'root.haki', kind: 'root', region: 'haki', route: 'haki', name: '霸氣的修行', text: '兩年修行後免費得到：武裝色、見聞色各 1 級，開啟這片海域。', fx: {}, need: { trained: true }, ...at(450, sectors.haki.centre) })
  for (const region of ['combat', 'sea', 'grit'] as const)
    add({ id: entrance[region], kind: 'minor', region, route: region, name: regionInfo[region].label + '入口', text: 'HP 上限 +2%', fx: { hpPct: 2 }, ...at(450, entryAngle(region)) })
  const approaches: [Profession | 'ring.north', Sea][] = [
    ['fighter', 'combat'], ['sniper', 'combat'], ['navigator', 'sea'], ['archaeologist', 'sea'], ['musician', 'fruit'],
    ['shipwright', 'grit'], ['doctor', 'grit'], ['cook', 'grit'], ['ring.north', 'haki'],
  ]
  for (const [from, region] of approaches) {
    const start = from === 'ring.north' ? from : 'job.' + from
    chain('way.' + from + '.' + region, start, entrance[region], 2, region === 'fruit' || region === 'haki' ? 'start' : region, pools)
  }

  /** Keystones and starts stay at the end of their road; everything else may be crossed to. */
  const crossable = (id?: string) => !!id && nodes.get(id)!.kind !== 'keystone' && nodes.get(id)!.kind !== 'root'
  /** A road's node at a row, or its outermost crossable node when the road is shorter. */
  const rowOf = (ids: string[], k: number) => crossable(ids[k]) ? ids[k] : [...ids.slice(0, k + 1)].reverse().find(crossable)

  // Lay each road out; spare minors (to reach exactly the total) go to the shortest roads afterwards, so the roads of a
  // sea run about as far out as each other and the rings join them all the way.
  const layout = (extra: Map<string, number>) => {
    /** Minors before each item; spares widen the gaps in turn (the first gap last, so a road soon reaches a notable). */
    const sequenceOf = (items: string[], minors: Minor[], gap: number, spare: number, offset: number) => {
      const gaps = items.map(() => gap)
      for (let s = 0; s < spare; s++) gaps[items.length > 1 ? 1 + s % (items.length - 1) : 0]++
      const sequence: (string | Minor)[] = []
      items.forEach((item, i) => {
        for (let k = 0; k < gaps[i]; k++) sequence.push(minors[(sequence.length + offset) % minors.length])
        sequence.push(item)
      })
      return sequence
    }
    /** Places a road outward along one bearing; it bends a little, never far enough to meet the next road. */
    const place = (sequence: (string | Minor)[], route: { id: string, region: TalentRegion, need?: Need }, angle: number, swing: number, from: number) => {
      const ids: string[] = []
      sequence.forEach((item, k) => {
        const { x, y } = at(530 + (k + from) * step, angle + Math.sin((k + from) * .32 + angle * .1) * swing)
        let id: string
        if (typeof item === 'string') {
          const n = named[item]
          id = add({ id: item, kind: n.kind === 'keystone' ? 'keystone' : n.kind === 'minor' ? 'minor' : 'notable', region: route.region, route: route.id,
            name: n.name, text: n.text, fx: n.fx, x, y, need: n.need || route.need ? { ...route.need, ...n.need } : undefined })
        } else id = minor(route.id + '.' + k, route.region, route.id, item, x, y, route.need)
        if (ids.length) link(ids.at(-1)!, id)
        ids.push(id)
      })
      return ids
    }
    const ends = new Map<string, string[]>()
    const outer = new Map<Sea, { first: string, last: string }>()
    const byRegion = new Map<Sea, Route[]>()
    for (const route of routes) byRegion.set(route.region as Sea, [...byRegion.get(route.region as Sea) ?? [], route])
    for (const [region, list] of byRegion) {
      const sector = sectors[region]
      const spacing = sector.width / list.length
      list.forEach((route, index) => {
        const angle = sector.centre + (index - (list.length - 1) / 2) * spacing
        ends.set(route.id, place(sequenceOf(route.items, route.minors, route.gap, extra.get(route.id) ?? 0, index), route, angle, spacing * .12, 0))
      })
      outer.set(region, { first: list[0].id, last: list.at(-1)!.id })
      // Open seas: the roads' first nodes form an arc that the entrance joins in the middle.
      // Seas whose roads need something (a kind of fruit, the two years) join every road to their free start instead.
      const open = !list.some(other => other.need)
      const middle = list.some(route => route.entry) ? list.flatMap((route, index) => route.entry ? [index] : [])
        : [Math.floor((list.length - 1) / 2), Math.ceil((list.length - 1) / 2)]
      list.forEach((route, index) => { if (!open || middle.includes(index)) link(entrance[region], ends.get(route.id)![0]) })
      for (let i = 0; i + 1 < list.length; i++) {
        const [a, b] = [ends.get(list[i].id)!, ends.get(list[i + 1].id)!]
        if (open) link(a[0], b[0])
        // Rings: neighbouring roads cross every few nodes. A node someone cannot use (another kind of fruit) stays shut by its need.
        for (let k = ringEvery; k < Math.min(a.length, b.length); k += ringEvery)
          if (crossable(a[k]) && crossable(b[k])) link(a[k], b[k])
        // A road never ends in a dead end unless it ends in a keystone: its tip crosses to its neighbour.
        for (const [tip, other] of [[a, b], [b, a]] as const) {
          const last = tip.at(-1)!
          const to = rowOf(other, tip.length - 1)
          if (crossable(last) && nodes.get(last)!.links.length < 2 && to) link(last, to)
        }
      }
    }
    // Border roads run along the line between two seas, joined to the outermost road on each side at every ring.
    for (const border of borders) {
      const [left, right] = border.between
      const [l, r] = [sectors[left], sectors[right]]
      let [edgeL, edgeR] = [l.centre + l.width / 2, r.centre - r.width / 2]
      if (edgeR < edgeL - 180) edgeR += 360
      const ids = place(sequenceOf(border.items, border.minors, 2, extra.get(border.id) ?? 0, 0), border, (edgeL + edgeR) / 2, 0, 2)
      ends.set(border.id, ids)
      for (const side of [ends.get(outer.get(left)!.last)!, ends.get(outer.get(right)!.first)!]) {
        for (let k = 0; k < ids.length; k += ringEvery) { const to = side[k + 2]; if (crossable(to) && crossable(ids[k])) link(ids[k], to) }
        const tip = rowOf(side, ids.length + 1)
        if (crossable(ids.at(-1)) && tip) link(ids.at(-1)!, tip)
      }
    }
  }
  const before = new Map(nodes)
  layout(new Map())
  const missing = talentTotal - nodes.size
  // How far out each road reaches (border roads start two rows out); every spare goes to the road that reaches least.
  const reach = new Map<string, number>([...routes.map(route => [route.id, 0] as const), ...borders.map(border => [border.id, 2] as const)])
  for (const [id, node] of nodes) if (!before.has(id) && reach.has(node.route)) reach.set(node.route, reach.get(node.route)! + 1)
  for (const id of [...nodes.keys()]) if (!before.has(id)) nodes.delete(id)
  for (const node of nodes.values()) node.links = node.links.filter(id => nodes.has(id))
  const extra = new Map<string, number>()
  for (let i = 0; i < missing; i++) {
    const [road] = [...reach].reduce((best, next) => next[1] < best[1] ? next : best)
    reach.set(road, reach.get(road)! + 1)
    extra.set(road, (extra.get(road) ?? 0) + 1)
  }
  layout(extra)
  return nodes
}

export const talentNodes: ReadonlyMap<string, TalentNode> = build()
export const talentList: readonly TalentNode[] = [...talentNodes.values()]

/** Which kind a fruit is. world/fruits.ts registers it on load: importing it here would tie the modules in a loop. */
let kindOfFruit: (fruit: string) => FruitKind | undefined = () => undefined
export const registerFruitKinds = (kind: typeof kindOfFruit) => { kindOfFruit = kind }

type Holder = Pick<Character, 'profession' | 'level'> & Partial<Pick<Character, 'talents' | 'fruit' | 'haki'>>

/** Nodes the character holds without paying: the job's start, and the fruit's and haki's once they are open. */
export function freeTalents(c: Holder) {
  const free = ['job.' + c.profession]
  if (c.fruit) free.push('root.fruit')
  if (c.haki?.trained) free.push('root.haki')
  if (c.haki?.trained && c.haki.conqueror) free.push('h.conqueror')
  return free
}
export const ownedTalents = (c: Holder) => new Set([...freeTalents(c), ...c.talents ?? []])
export const talentPointsEarned = (level: number) => talentsPerLevel * (level - 1)
export function talentPointsLeft(c: Holder) {
  const free = new Set(freeTalents(c))
  return talentPointsEarned(c.level) - (c.talents ?? []).filter(id => !free.has(id)).length
}

/** Whether the character meets what a node needs (a fruit of its kind, the two years, Conqueror's haki, a level). */
export function needMet(c: Holder, need?: Need) {
  if (!need) return true
  if (need.fruit && (!c.fruit || (need.fruit !== 'any' && kindOfFruit(c.fruit) !== need.fruit))) return false
  if (need.trained && !c.haki?.trained) return false
  if (need.conqueror && !c.haki?.conqueror) return false
  return !need.level || c.level >= need.level
}
export function needText(need?: Need) {
  if (!need) return ''
  const parts: string[] = []
  if (need.fruit) parts.push(need.fruit === 'any' ? '吃下惡魔果實' : '吃下' + { paramecia: '超人系', zoan: '動物系', logia: '自然系' }[need.fruit] + '果實')
  if (need.trained) parts.push('兩年修行')
  if (need.conqueror) parts.push('有霸王色的資質')
  if (need.level) parts.push(need.level + ' 級')
  return '需要' + parts.join('、')
}

const cache = new Map<string, Fx>()
/** Every effect the character's talents add up to. */
export function talentFx(c: Holder): Fx {
  const owned = ownedTalents(c)
  const key = [...owned].sort().join(',')
  const known = cache.get(key)
  if (known) return known
  const sum: Fx = {}
  for (const id of owned) for (const [k, v] of Object.entries(talentNodes.get(id)?.fx ?? {})) sum[k] = (sum[k] ?? 0) + v
  if (cache.size > 200) cache.clear()
  cache.set(key, sum)
  return sum
}
/** One effect, with whatever is narrowed to the weapon in hand (`hit` + `hit@sword` + `hit@melee`). */
export function fxOf(c: Holder, key: string, weapon?: Weapon) {
  const fx = talentFx(c)
  let total = fx[key] ?? 0
  if (weapon) for (const scope of weaponScopes(weapon)) total += fx[key + '@' + scope] ?? 0
  return total
}
/** The biggest value of an effect among several characters (an aura from whoever on the spot has it). */
export const bestFx = (cs: Holder[], key: string) => Math.max(0, ...cs.map(c => fxOf(c, key)))
export const talentSkill = (c: Holder, skill: Skill | string) => fxOf(c, 'skill:' + skill)
export const talentAttribute = (c: Partial<Holder>, attr: Attribute) => c.talents?.includes('attr.' + attr) ? 1 : 0

/** A keystone already taken in the same sea, if any. */
export function keystoneIn(c: Holder, region: TalentRegion) {
  return [...ownedTalents(c)].map(id => talentNodes.get(id)).find(node => node?.kind === 'keystone' && node.region === region)
}

/** Why the character cannot learn this node now, or undefined when they can. */
export function learnBlock(c: Holder & Pick<Character, 'weapon'>, id: string, owned = ownedTalents(c), left = talentPointsLeft(c)): string | undefined {
  const node = talentNodes.get(id)
  if (!node) return '沒有這個天賦。'
  if (owned.has(id)) return '已經學會「' + node.name + '」了。'
  // Another job's start can be walked through for a point (it gives that job's small bonus); the fruit's and haki's cannot.
  if (node.kind === 'root' && !id.startsWith('job.')) return node.text
  if (!needMet(c, node.need)) return '「' + node.name + '」' + needText(node.need) + '。'
  if (!node.links.some(other => owned.has(other))) return '要先學一個連到「' + node.name + '」的天賦。'
  if (left <= 0) return '沒有天賦點了，每升 1 級得 ' + talentsPerLevel + ' 點。'
  if (node.kind === 'keystone') {
    const taken = keystoneIn(c, node.region)
    if (taken) return regionInfo[node.region].label + '只能拿一個終極天賦，你已經有「' + taken.name + '」。'
  }
  if (node.fx.noRanged && rangedWeapons.includes(c.weapon)) return '「' + node.name + '」不能用射擊武器，先改用別的武器。'
  if (node.fx.onlyUnarmed && c.weapon !== 'fist' && c.weapon !== 'kick') return '「' + node.name + '」只能徒手或用腿技，先收起武器。'
}

/** Whether the node can be given back: nothing learned would be left cut off from a start. */
export function refundBlock(c: Holder, id: string): string | undefined {
  const node = talentNodes.get(id)
  if (!node) return '沒有這個天賦。'
  if (freeTalents(c).includes(id)) return '「' + node.name + '」是免費的起點，不能退。'
  if (!c.talents?.includes(id)) return '還沒有學「' + node.name + '」。'
  const left = new Set([...ownedTalents(c)].filter(other => other !== id))
  const reached = new Set(freeTalents(c).filter(other => left.has(other)))
  const queue = [...reached]
  while (queue.length) for (const next of talentNodes.get(queue.pop()!)!.links) if (left.has(next) && !reached.has(next)) { reached.add(next); queue.push(next) }
  if (reached.size < left.size) return '外面還有連著「' + node.name + '」的天賦，要先退掉那些。'
}

/** The cheapest way from what the character holds to a node: the ids to learn, in order (empty when out of reach). */
export function pathTo(c: Holder, target: string): string[] {
  const owned = ownedTalents(c)
  if (owned.has(target) || !talentNodes.has(target)) return []
  const from = new Map<string, string | null>()
  const queue: string[] = []
  for (const id of owned) { from.set(id, null); queue.push(id) }
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]
    for (const next of talentNodes.get(id)!.links) {
      if (from.has(next)) continue
      const node = talentNodes.get(next)!
      if ((node.kind === 'root' && !next.startsWith('job.')) || !needMet(c, node.need)) continue
      from.set(next, id)
      if (next === target) {
        const path = [next]
        for (let at = id; !owned.has(at); at = from.get(at)!) path.unshift(at)
        return path
      }
      queue.push(next)
    }
  }
  return []
}

/** A skill's rank with what talents add to it. */
export const rankOf = (c: Holder & Pick<Character, 'skillRanks'>, skill: string) => (c.skillRanks[skill] ?? 0) + talentSkill(c, skill)
/** A percentage effect as a multiplier, never below a floor (so stacked costs cannot turn a gain into a loss). */
export const pct = (value: number, floor = .1) => Math.max(floor, 1 + value / 100)

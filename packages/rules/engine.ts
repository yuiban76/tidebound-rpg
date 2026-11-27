import { attributeLabels, locations, npcs, hakiSkills } from '../shared/protocol.ts'
import type { CharacterInput, Intent, NpcId, Skill, HakiSkill } from '../shared/protocol.ts'
import { asksAboutBoatCrew, asksAboutShipPurchase, dialogueQuestion, directions, routeBetween } from '../world/explore.ts'
import { forges, maxTier, tierCost, tierDamage, tierHit, tierLevel, tierOf, weaponLabel } from '../world/forge.ts'
import { beli, scale, staScale } from '../world/scale.ts'
import { boatCrewReplies, goods, meals, npcFacts, npcPlace, npcRole, npcsAt, party, shops, walkMinutes, weaponItems, weaponNames } from '../world/village.ts'
import { islandAt, islands, shipPurchaseInfo } from '../world/sea.ts'
import { partLevel, shipName } from '../world/ships.ts'
import { resolveShip } from './ship.ts'
import { resolveIslandTask, resolveSailing } from './sailing.ts'
import { resolveWar } from './war.ts'
import { resolveGoal, rideTrain } from './saga.ts'
import { alertWithin } from '../world/timeline.ts'
import { dismissCompanion, handoverCompanion, recruitCompanion } from './companions.ts'
import { buyFruit, chooseFruit, learnFruitArts } from './fruits.ts'
import { fruits } from '../world/fruits.ts'
import { companionByName, companionMaxHp, hasMedic, healCompanions, partyLevel, recruitableAt } from '../world/companions.ts'
import { isDown, resolveCombatAction } from './combat.ts'
import type { Character, CombatChoice, Member, World } from '../world/village.ts'
import { applyRace, stat, traitOf } from '../world/races.ts'
import { buyWare, cashSlips, sellWare, useSupply } from './market.ts'
import { cookAt, crafted, doctorAt, dressingOf, skillCap, wildPlaces } from '../world/skills.ts'

export type Attribute = keyof Character['stats']

export type Roll = (sides: number) => number
export type Result = {
  text: string, announce?: boolean, rejected?: boolean, minutes?: number,
  proposeCrew?: boolean, spokeWith?: NpcId, directReply?: boolean,
  /** A free action: the rules change nothing and the narrator writes what happens. */
  free?: boolean,
}
const freeAction = (): Result => ({ text: '自由行動。', minutes: 10, free: true })
const freeDc = { easy: 8, normal: 12, hard: 16, extreme: 20 } as const

/** A free action with an uncertain outcome: the dice decide, and the result is written into the world. */
function checkedFreeAction(world: World, c: Character, intent: Extract<Intent, { kind: 'free' }>, raw: string, roll: Roll): Result {
  if (!intent.check) return freeAction()
  const { attr, skill, difficulty } = intent.check
  const dc = freeDc[difficulty]
  const natural = roll(20)
  const total = natural + stat(c, attr) + (skill ? c.skillRanks[skill] ?? 0 : 0) + (skill === '閃避' && /潛|躲|溜/.test(raw) ? traitOf(c).sneak ?? 0 : 0)
  const success = natural === 20 || (natural !== 1 && total >= dc)
  const label = attributeLabels[attr] + (skill ? '・' + skill : '')
  const record = c.name + '在' + locations[c.place] + '嘗試「' + raw.trim().slice(0, 60) + '」，' + (success ? '成功' : '失敗') + '了。'
  world.chronicle = [...(world.chronicle ?? []), record].slice(-12)
  if (intent.npc && npcPlace(world, intent.npc) === c.place) {
    const [known, ...recent] = npcFacts(world, intent.npc).split(' 最近：')
    ;(world.npcFacts ??= {})[intent.npc] = [known, ...recent.slice(-2), record].join(' 最近：')
  }
  return {
    text: '自由行動判定（' + label + '）D20 ' + natural + '，合計 ' + total + '／' + dc + '，' + (success ? '成功' : '失敗') + '。',
    minutes: 10, free: true,
  }
}
const reject = (text: string): Result => ({ text, rejected: true })
const hoursAndMinutes = (minutes: number) =>
  ((Math.floor(minutes / 60) ? Math.floor(minutes / 60) + ' 小時' : '') + (minutes % 60 ? ' ' + (minutes % 60) + ' 分鐘' : '')).trim()

export const maxHP = (c: Character) => Math.round((20 + 5 * stat(c, 'CON') + 4 * (c.level - 1) + (c.fruit && fruits[c.fruit].kind === 'zoan' ? 10 : 0)) * (traitOf(c).hp ?? 1)) * scale
// Levels make fighters better, not only tougher: +3 to hit per 4 levels, +1 damage per 2, +1 defense per 3 (all 0 at level 1).
// Balanced with the Monte Carlo tables in the README: a 2-player party needs about level 5 for a tier-4 foe and level 12 for tier 5.
export const levelHit = (level: number) => Math.floor(level * .75)
export const levelDamage = (level: number) => Math.floor(level / 2)
export const levelDefense = (level: number) => Math.floor((level - 1) / 3)
/** HP a bandage restores: it keeps up with bigger HP pools (+1 per 2 levels of the patient). */
export const bandageHeal = (healer: Character, patientLevel: number) => (4 + (healer.skillRanks['醫術'] ?? 0) + Math.floor((patientLevel - 1) / 2)) * scale
/** Every level pays for two more basic moves (3 STA each). */
export const levelSTA = 6
export const maxSTA = (c: Character) => (10 + 3 * stat(c, 'CON') + 2 * stat(c, 'WIL')) * staScale + levelSTA * (c.level - 1)
export const defense = (agi: number, dodge = 0, situational = 0) => 12 + agi + dodge + situational
/** A recruited ship's doctor, or a party member on the spot with 醫術 2 or more. */
const medicHere = (world: World, place: Character['place']) => hasMedic(world) || doctorAt(world, place)
export const voteThreshold = (count: number, major: boolean) => major ? count : Math.floor(count / 2) + 1
export const needsReview = (c: CharacterInput) => c.race === '巨人'

export function makeCharacter(input: CharacterInput): Character {
  const weapon = input.fighting
  const kit = input.major === '醫術' ? { 繃帶: 2, 醫療工具: 1 } : {}
  const equipment = { fist: '基礎工具組', sword: '普通武士刀', spear: '普通長槍', musket: '普通火槍' }[weapon]
  const c: Character = {
    ...input, place: 'square', conversingWith: null, money: 100_000, level: 1, xp: 0, unspent: 0, skillPoints: 0, xpLog: {}, bounty: 0, techniques: [], hp: 0, sta: 0, weapon,
    raceReady: false,
    loaded: weapon === 'musket', inventory: { 普通衣物: 1, [equipment]: 1 },
    skillRanks: { [input.major]: 2, [input.basics[0]]: 1, [input.basics[1]]: 1, [input.life]: 1 },
  }
  Object.assign(c.inventory, kit, weapon === 'musket' ? { 火槍彈藥: 5 } : {})
  applyRace(c)
  c.hp = maxHP(c)
  c.sta = maxSTA(c)
  return c
}

/** XP needed to leave the current level (spec §7.6). */
export const xpToNext = (level: number) => 100 * level
const repeatYield = [1, .5, .25, 0]
export const attributeCap = 10

/**
 * Pays XP and applies every level-up it causes. Repeatable activities pass a key so each repeat pays less.
 * Returns the announcement text, or '' when nothing was earned.
 */
export function grantXp(c: Character, amount: number, key?: string) {
  let gained = amount
  if (key) {
    const times = c.xpLog[key] ?? 0
    gained = Math.floor(amount * (repeatYield[times] ?? 0))
    c.xpLog[key] = times + 1
  }
  if (gained <= 0) return ''
  c.xp += gained
  let text = c.name + '獲得 ' + gained + ' XP。'
  while (c.xp >= xpToNext(c.level)) {
    const hp = maxHP(c)
    const sta = maxSTA(c)
    c.xp -= xpToNext(c.level)
    c.level++
    if (c.hp > 0) c.hp += maxHP(c) - hp
    c.sta += maxSTA(c) - sta
    text += c.name + '升到等級 ' + c.level + '（HP 上限 ' + maxHP(c) + '、STA 上限 ' + maxSTA(c) + '）。'
    c.skillPoints++
    text += '獲得 1 個技能點。'
    if (c.level % 4 === 0) {
      c.unspent++
      text += '獲得 1 點自由屬性點。'
    }
    const arts = learnFruitArts(c)
    if (arts.length) text += c.name + '的果實力量覺醒，學會招式「' + arts.join('」「') + '」。'
  }
  return text
}

/** Spends one skill point on a skill, up to the cap for the character's level. */
export function trainSkill(c: Character, skill: Skill | HakiSkill): Result {
  if (!c.skillPoints) return reject('目前沒有技能點，升級時會得到。')
  if ((hakiSkills as readonly string[]).includes(skill) && !c.skillRanks[skill]) return reject('還沒學會' + skill + '霸氣。頂上戰爭後全隊出發修行兩年，才會學會。')
  const rank = c.skillRanks[skill] ?? 0
  const cap = skillCap(c.level)
  if (rank >= cap) return reject(skill + '已達目前上限 ' + cap + '，等級越高上限越高。')
  c.skillRanks[skill] = rank + 1
  c.skillPoints--
  return { text: c.name + '的' + skill + '提升為 ' + (rank + 1) + '。' }
}

/** Spends one free attribute point. Raised CON/WIL maxima also raise current HP/STA by the same amount. */
export function allocatePoint(c: Character, attr: Attribute): Result {
  if (c.unspent <= 0) return reject('目前沒有可分配的屬性點。')
  if (c.stats[attr] >= attributeCap) return reject(attributeLabels[attr] + '已達目前上限 ' + attributeCap + '。')
  const hp = maxHP(c)
  const sta = maxSTA(c)
  c.stats[attr]++
  c.unspent--
  if (c.hp > 0) c.hp += maxHP(c) - hp
  c.sta += maxSTA(c) - sta
  return { text: c.name + '的' + attributeLabels[attr] + '提升為 ' + c.stats[attr] + '。' }
}

const withXp = (result: Result, xp: string) => xp ? { ...result, text: result.text + '\n' + xp } : result

function findItem(inventory: Record<string, number>, name: string) {
  if (inventory[name]) return name
  const matches = Object.keys(inventory).filter(item => inventory[item] > 0 && item.includes(name))
  return matches.length === 1 ? matches[0] : undefined
}

export function attackCheck(roll: Roll, stats: { attr: number, skill: number, def: number, die: number, bonus?: number, armor?: number, possible?: boolean }) {
  if (stats.possible === false) return { natural: 0, total: 0, hit: false, damage: 0, dice: [] }
  const natural = roll(20)
  const total = natural + stats.attr + stats.skill
  const hit = natural !== 1 && total >= stats.def
  const dice = hit ? [roll(stats.die)] : []
  if (hit && natural === 20) dice.push(roll(stats.die))
  const damage = hit ? Math.max(0, dice.reduce((a, b) => a + b, 0) + stats.attr + (stats.bonus ?? 0) - (stats.armor ?? 0)) * scale : 0
  return { natural, total, hit, damage, dice }
}

const isCombat = (intent: Intent): intent is CombatChoice =>
  ['attack', 'cannon', 'guard', 'flee', 'negotiate', 'reload', 'useItem', 'conqueror'].includes(intent.kind)

function converse(world: World, c: Character, npc: NpcId, raw: string, minute = world.minute): Result {
  const place = npcPlace(world, npc)
  if (!place) return reject(npcs[npc] + '目前不在你能找到的地方。')
  if (place !== c.place) return islandAt(place) === islandAt(c.place)
    ? reject(npcs[npc] + '在' + locations[place] + '。可以先輸入「前往' + locations[place] + '」。')
    : reject(npcs[npc] + '在' + islands[islandAt(place)].name + '，要航行過去才能見到。')
  if (isDown(world, npc)) return reject(npcs[npc] + '被打倒了，暫時無法交談。')
  const facts = npcFacts(world, npc)
  c.conversingWith = npc
  ;(world.memories[npc] ??= []).push(c.name + '在第 ' + minute + ' 分鐘交談：' + raw)
  const answer = asksAboutShipPurchase(raw) ? shipPurchaseInfo :
    asksAboutBoatCrew(raw) ? (boatCrewReplies[npc] ?? '那艘小艇上是誰，我不清楚。') : undefined
  if (answer) {
    return { text: npcs[npc] + '說：「' + answer + '」', minutes: 3, spokeWith: npc, directReply: true }
  }
  if (dialogueQuestion(raw)) return { text: '你向' + npcs[npc] + '提問。', minutes: 3, spokeWith: npc }
  return { text: npcs[npc] + '與你交談。' + facts, minutes: 3, spokeWith: npc }
}

export function resolve(world: World, actor: Member, intent: Intent, raw: string, roll: Roll, connected: Set<string>): Result {
  const c = actor.character!
  if (c.hp <= 0 && !(intent.kind === 'rest' && intent.sleep))
    return reject('你已倒下，需就地等待救援，或在安全地點完成睡眠。')
  if (world.combat?.participants.includes(actor.id) && !isCombat(intent))
    return reject('戰鬥進行中。請描述攻擊、招式、防守、撤退、交涉、使用繃帶或裝填。')
  if (isCombat(intent) && !(intent.kind === 'reload' && !world.combat))
    return resolveCombatAction(world, actor, intent, roll, connected)

  switch (intent.kind) {
    case 'sail': return resolveSailing(world, actor, intent, roll, connected)
    case 'ship': return resolveShip(world, actor, intent)
    case 'islandTask': return resolveIslandTask(world, actor, intent, roll)
    case 'war': return resolveWar(world, actor, intent, roll)
    case 'goal': return resolveGoal(world, actor, intent.goal, roll)
    case 'train': return rideTrain(world, actor, roll, connected)
    case 'move': {
      if (c.place === intent.to)
        return intent.talkTo ? converse(world, c, intent.talkTo, raw) : reject('你已經在' + locations[c.place] + '。')
      if (intent.to === 'hill' && world.combat?.place === 'hill') return reject('山徑有正在結算的遭遇。')
      const route = routeBetween(c.place, intent.to, world.combat?.place === 'hill')
      if (!route.length) return reject(islandAt(c.place) !== islandAt(intent.to)
        ? '跨島不能自行步行。請到停泊港和全隊共同出航。' : '目前沒有通往' + locations[intent.to] + '的路。')
      c.place = intent.to
      c.conversingWith = null
      if (world.sailing?.ready.includes(actor.id)) world.sailing.ready = world.sailing.ready.filter(id => id !== actor.id)
      const through = route.slice(1, -1).map(id => locations[id])
      const minutes = route.slice(1).reduce((sum, place, index) => sum + walkMinutes(route[index], place), 0)
      const arrival = (through.length ? '你經過' + through.join('、') + '，抵達' : '你抵達') + locations[c.place] + '。'
      if (!intent.talkTo) return { text: arrival, minutes }
      const conversation = converse(world, c, intent.talkTo, raw, world.minute + minutes)
      return {
        text: arrival + '\n' + conversation.text,
        minutes: minutes + (conversation.minutes ?? 0),
        spokeWith: conversation.spokeWith,
        directReply: conversation.directReply,
      }
    }
    case 'meal': {
      if (c.place !== 'tavern') return reject(locations.tavern + '供應餐點。可以先輸入「前往' + locations.tavern + '」。')
      const dish = meals[intent.dish]
      if (c.money < dish.price) return reject('這份' + dish.name + '需要 ' + beli(dish.price) + '，你帶的錢不夠。')
      c.money -= dish.price
      const hpBefore = c.hp
      const staBefore = c.sta
      if (c.hp > 0) c.hp = Math.min(maxHP(c), c.hp + dish.hp)
      c.sta = Math.min(maxSTA(c), c.sta + dish.sta)
      return {
        text: '你在' + locations.tavern + '吃了' + dish.name + '，花費 ' + beli(dish.price) + '。HP +' + (c.hp - hpBefore) + '、STA +' + (c.sta - staBefore) +
          '（目前 HP ' + c.hp + '／' + maxHP(c) + '，STA ' + c.sta + '／' + maxSTA(c) + '）。',
        minutes: 10,
      }
    }
    case 'crew':
      if (world.crew) return reject('船團已經成立。')
      if (world.proposals.some(p => p.type === 'formCrew' && !p.passed))
        return reject('已有「成立船團」提案，請在「團隊決議」投票。')
      if (world.proposals.length >= 50) return reject('本章的提案已達上限。')
      if (party(world).length === 1) {
        world.crew = true
        return { text: c.name + '成立了自己的船團！現在可以邀請夥伴加入。', announce: true, minutes: 1 }
      }
      return { text: c.name + '提議成立船團。請所有成員在「團隊決議」投票。', announce: true, proposeCrew: true }
    case 'talk': return converse(world, c, intent.npc, raw)
    case 'fruit': return chooseFruit(world, actor, intent.take, intent.fruit)
    case 'buyFruit': return buyFruit(world, actor, intent.fruit)
    case 'recruit': return recruitCompanion(world, actor, intent.npc, roll)
    case 'dismiss': return dismissCompanion(world, intent.npc)
    case 'handover': return handoverCompanion(world, actor, intent.npc, intent.to)
    case 'check': {
      const method = {
        observe: ['觀察', 'PER', '觀察', 10], climb: ['攀爬', 'AGI', '格鬥', 13],
        search: ['搜索', 'PER', '觀察', 12], sneak: ['潛行', 'AGI', '閃避', 12],
      } as const
      const [label, attr, skill, dc] = method[intent.method]
      const natural = roll(20)
      const total = natural + stat(c, attr) + (c.skillRanks[skill] ?? 0) + (intent.method === 'sneak' ? traitOf(c).sneak ?? 0 : 0)
      const text = label + ' D20 ' + natural + '，合計 ' + total + '／' + dc + '，' + (total >= dc ? '成功。' : '未成功。')
      return withXp({ text, minutes: 5 }, total >= dc ? grantXp(c, 5, 'check:' + intent.method + ':' + c.place) : '')
    }
    case 'buy': return buyWare(world, actor, intent.item)
    case 'sell': return sellWare(world, actor, intent.item, intent.count)
    case 'bounty': return cashSlips(world, actor)
    case 'upgrade': {
      if (!forges[c.place]) return reject('這裡沒有鐵匠。風車村鐵匠鋪、哥亞城下町武器鋪和羅格鎮的一本松武器店可以強化武器。')
      const tier = tierOf(c)
      const next = tier + 1
      const name = weaponLabel(c, weaponNames[c.weapon])
      if (next > maxTier) return reject(name + '已經強化到這些鐵匠做得出的極限。')
      if (c.level < tierLevel[next]) return reject('強化到' + next + '階需要等級 ' + tierLevel[next] + '，你目前是 ' + c.level + '。')
      const cost = crafted(tierCost[next], c)
      if (c.money < cost) return reject('強化到' + next + '階需要 ' + beli(cost) + '。')
      c.money -= cost
      ;(c.gear ??= {})[c.weapon] = next
      return { text: '鐵匠花了兩個小時重新鍛打，支出 ' + beli(cost) + (cost < tierCost[next] ? '（你懂工藝，幫忙省了 ' + beli(tierCost[next] - cost) + '）' : '') + '。你的武器變成「' + weaponLabel(c, weaponNames[c.weapon]) + '」，命中 +' + tierHit(next) + '、傷害 +' + tierDamage(next) * scale + '。' +
        (next < maxTier ? '下一階需要等級 ' + tierLevel[next + 1] + '、' + beli(crafted(tierCost[next + 1], c)) + '。' : ''), minutes: 120 }
    }
    case 'use': {
      const supply = intent.item !== '傷藥' ? useSupply(world, c, intent.item) : undefined
      if (supply) return supply
      if (intent.item !== '傷藥') return reject('「' + intent.item + '」不是能直接使用的東西。傷藥、食物和櫻花藥可以吃喝，繃帶請用「使用繃帶給某人」。')
      if (!c.inventory['傷藥']) return reject('你的背包裡沒有傷藥。風車村鐵匠鋪有賣。')
      if (c.hp >= maxHP(c) && c.sta >= maxSTA(c)) return reject('你現在沒有需要恢復的地方。')
      c.inventory['傷藥']--
      c.hp = Math.min(maxHP(c), c.hp + (8 + c.level) * scale)
      c.sta = Math.min(maxSTA(c), c.sta + 5 * staScale)
      return { text: '你喝下傷藥，目前 HP ' + c.hp + '、STA ' + c.sta + '。', minutes: 2 }
    }
    case 'equip': {
      if (intent.weapon === c.weapon) return reject('你已經在使用' + weaponNames[c.weapon] + '。')
      if (intent.weapon !== 'fist' && !c.inventory[weaponItems[intent.weapon]])
        return reject('你的背包裡沒有' + weaponItems[intent.weapon] + '。')
      c.weapon = intent.weapon
      return { text: '你改用' + weaponLabel(c, weaponNames[c.weapon]) + '。', minutes: 1 }
    }
    case 'give': {
      const target = party(world).find(m => m.id !== actor.id && m.character!.name === intent.to.trim())
      if (!target) return reject('找不到名叫「' + intent.to + '」的隊友。')
      const t = target.character!
      if (t.place !== c.place) return reject(t.name + '不在' + locations[c.place] + '，要在同一地點才能轉交。')
      if (world.combat?.participants.includes(target.id)) return reject(t.name + '正在戰鬥中。')
      if ((intent.money === undefined) === (intent.item === undefined)) return reject('一次請轉交一種物品，或指定貝里金額。')
      if (intent.money !== undefined) {
        if (c.money < intent.money) return reject('你只有 ' + beli(c.money) + '。')
        c.money -= intent.money
        t.money += intent.money
        return { text: c.name + '把 ' + beli(intent.money) + '交給' + t.name + '。', minutes: 1 }
      }
      const item = findItem(c.inventory, intent.item!.trim())
      const count = intent.count ?? 1
      if (!item || c.inventory[item] < count) return reject('你的背包沒有足夠的「' + intent.item + '」。')
      c.inventory[item] -= count
      if (!c.inventory[item]) delete c.inventory[item]
      t.inventory[item] = (t.inventory[item] ?? 0) + count
      let note = ''
      if (c.weapon !== 'fist' && weaponItems[c.weapon] === item && !c.inventory[item]) {
        if (c.weapon === 'musket') c.loaded = false
        c.weapon = 'fist'
        note = '你改為徒手。'
      }
      return { text: c.name + '把' + item + (count > 1 ? ' × ' + count : '') + '交給' + t.name + '。' + note, minutes: 1 }
    }
    case 'reload':
      if (c.weapon !== 'musket' || c.loaded || !c.inventory['火槍彈藥']) return reject('目前無法裝填火槍。')
      c.inventory['火槍彈藥']--
      c.loaded = true
      return { text: '已裝填火槍。', minutes: 1 }
    case 'wait': {
      if (c.place === 'hill') return reject('山道不適合停留等待。')
      // Spec §6.1: one player must not fast-forward teammates who are busy elsewhere.
      const crew = party(world)
      if (crew.some(m => m.id !== actor.id && (m.character!.place !== c.place || !connected.has(m.id))))
        return reject('多人遊玩時，全隊都要在線並在同一地點，才能一起等待。')
      // A warning or a stand-off on this island cuts the wait short, so nobody sleeps through it.
      const alert = alertWithin(world, intent.hours * 60)
      const spent = alert ?? intent.hours * 60
      const nights = Math.floor(Math.floor(spent / 60) / 8)
      for (const member of crew) {
        const x = member.character!
        if (!nights) continue
        x.sta = maxSTA(x)
        if (x.hp > 0) x.hp = Math.min(maxHP(x), x.hp + nights * Math.ceil(maxHP(x) / 4) + (medicHere(world, c.place) ? nights * Math.ceil(maxHP(x) / 8) : 0))
      }
      if (nights) healCompanions(world, 1)
      return {
        text: (crew.length > 1 ? '全隊' : '你') + '在' + locations[c.place] + '等待了 ' + (alert ? hoursAndMinutes(spent) : intent.hours + ' 小時') +
          (alert ? '，周圍的動靜讓你們提前醒來。' : '。') + (nights ? '休息讓 HP／STA 恢復了。' : ''),
        minutes: spent, announce: crew.length > 1,
      }
    }
    case 'rest':
      if (c.place === 'hill') return reject('山徑不適合安全休息。')
      // The clock is shared, so a long sleep needs everyone online and on the same spot (spec §6.1).
      if (intent.sleep && party(world).some(m => m.id !== actor.id && (m.character!.place !== c.place || !connected.has(m.id))))
        return reject('多人遊玩時，全隊都要在線並在同一地點，才能一起睡覺。')
      {
        const need = intent.sleep ? 480 : 30
        const alert = alertWithin(world, need)
        const spent = alert ?? need
        const part = (amount: number) => Math.ceil(amount * spent / need)
        if (intent.sleep) {
          c.sta += part(maxSTA(c) - c.sta)
          c.hp = Math.min(maxHP(c), c.hp + part(Math.ceil(maxHP(c) / 4) + (medicHere(world, c.place) ? Math.ceil(maxHP(c) / 8) : 0)))
          healCompanions(world, .5 * spent / need)
        } else {
          c.sta = Math.min(maxSTA(c), c.sta + Math.ceil(maxSTA(c) / 4))
          if (c.hp > 0) c.hp = Math.min(maxHP(c), c.hp + Math.ceil(maxHP(c) / 10))
        }
        // Whoever can cook feeds everyone resting here: extra STA and a little HP for each rank of 烹飪.
        const cook = cookAt(world, c.place)
        const cooking = cook ? cook.skillRanks['烹飪'] ?? 0 : 0
        if (cooking) {
          c.sta = Math.min(maxSTA(c), c.sta + cooking * 2 * staScale)
          if (c.hp > 0) c.hp = Math.min(maxHP(c), c.hp + cooking * scale)
        }
        // A cabin aboard makes any rest beside the ship a better one.
        const cabin = world.ship && c.place === world.ship.port ? partLevel(world.ship, 'cabin') : 0
        if (cabin) {
          c.sta = Math.min(maxSTA(c), c.sta + cabin * 2 * staScale)
          if (c.hp > 0) c.hp = Math.min(maxHP(c), c.hp + Math.ceil(maxHP(c) * .05 * cabin))
        }
        return {
          text: (alert ? '睡到一半被周圍的動靜吵醒了（' + Math.max(1, Math.round(spent / 6) / 10) + ' 小時）。' : intent.sleep ? '睡了一覺（8 小時）。' : '稍作休息（30 分鐘）。') +
            (cabin ? '你在' + shipName(world.ship!) + '的船室裡休息，恢復得更好。' : '') +
            (cook ? (cook === c ? '你' : cook.name) + '做了一頓飯，多回復了 ' + cooking * 2 * staScale + ' STA。' : '') +
            'HP ' + c.hp + '／' + maxHP(c) + '，STA ' + c.sta + '／' + maxSTA(c) + '。', minutes: spent,
        }
      }
    case 'aid': {
      const companion = companionByName(world, intent.patient)
      if (companion && !party(world).some(m => m.character!.name === intent.patient)) {
        const sheet = world.companions![companion]!
        const dressing = dressingOf(c)
        if (!dressing || npcPlace(world, companion) !== c.place || sheet.hp >= companionMaxHp(world, companion))
          return reject('治療需要繃帶或草藥，以及同地且有傷的角色。')
        if (!--c.inventory[dressing]) delete c.inventory[dressing]
        sheet.hp = Math.min(companionMaxHp(world, companion), sheet.hp + bandageHeal(c, partyLevel(world)))
        if (world.npcDown?.[companion]) delete world.npcDown[companion]
        return withXp({ text: npcs[companion] + '接受包紮，目前 HP ' + sheet.hp + '。', minutes: 5 }, grantXp(c, 5, 'aid'))
      }
      const target = party(world).find(m => m.character!.name === intent.patient)?.character
      const dressing = dressingOf(c)
      if (!target || target.place !== c.place || !dressing || target.hp === maxHP(target))
        return reject('治療需要繃帶或草藥，以及同地且有傷的角色。')
      if (!--c.inventory[dressing]) delete c.inventory[dressing]
      target.hp = Math.min(maxHP(target), target.hp + bandageHeal(c, target.level))
      return withXp({ text: target.name + '接受包紮，目前 HP ' + target.hp + '。', minutes: 5 }, grantXp(c, 5, 'aid'))
    }
    case 'gather': {
      if (!wildPlaces.includes(c.place)) return reject('這裡沒有東西可採集。山道、森林、叢林和海岸可以採草藥與木料。')
      const day = Math.floor(world.minute / 1440)
      if (world.gathered?.[c.place] === day) return reject('今天已經有人在' + locations[c.place] + '採集過了，明天再來。')
      ;(world.gathered ??= {})[c.place] = day
      const rank = c.skillRanks['採集'] ?? 0
      const natural = roll(20)
      const total = natural + stat(c, 'PER') + rank
      const line = '採集 D20 ' + natural + '，合計 ' + total + '／12，'
      if (natural === 1 || total < 12) return { text: line + '沒找到能用的東西。', minutes: 30 }
      const twice = natural === 20 ? 2 : 1
      const herbs = (1 + Math.floor(rank / 2)) * twice
      c.inventory['草藥'] = (c.inventory['草藥'] ?? 0) + herbs
      const wood = world.ship ? twice : 0
      if (world.ship) world.ship.wood += wood
      return withXp({ text: line + '採到草藥 × ' + herbs + (wood ? '，也撿到能修船的木料 × ' + wood : '') + '。草藥可以像繃帶一樣包紮。', minutes: 30 },
        grantXp(c, 5, 'gather:' + c.place))
    }
    case 'social': return { ...freeAction(), minutes: 3 }
    case 'free': return checkedFreeAction(world, c, intent, raw, roll)
    default:
      if (/離開(?:這座島|風車村|黎明島)|出海|別的島|跨島|下一座島/.test(raw))
        return reject('跨島請使用航海面板，和全隊共同出航。' + (!world.ship ? shipPurchaseInfo : ''))
      return freeAction()
  }
}

export function guideFor(world: Pick<World, 'npcPlaces' | 'npcRoles'> & Partial<Pick<World, 'companions' | 'members' | 'crew'>> & { combat?: Pick<NonNullable<World['combat']>, 'participants' | 'place'> & { foes?: { name: string, hp: number, maxHp: number, down?: boolean, surrendered?: boolean }[] } }, actor: Member) {
  const character = actor.character!
  const inCombat = world.combat?.participants.includes(actor.id)
  if (inCombat && world.combat?.foes && character.hp > 0) {
    const foes = world.combat.foes.filter(foe => !foe.down && !foe.surrendered)
    return {
      text: '你在戰鬥中。對手：' + foes.map(foe => foe.name + ' HP ' + foe.hp + '／' + foe.maxHp).join('、') + '。可以攻擊、使用招式、防守、撤退、交涉或使用繃帶。',
      suggestions: [...foes.map(foe => '攻擊' + foe.name), '防守', '撤退', '使用繃帶'],
    }
  }
  let guide = directions(character.place, {
    hillClosed: world.combat?.place === 'hill',
    inCombat,
    down: character.hp <= 0,
    present: npcsAt(world, character.place),
    role: id => npcRole(world, id),
  })
  if (character.hp <= 0 || inCombat) return guide
  // Hurt or tired players are told, in plain words, how to recover.
  if (character.hp < maxHP(character) * .7 || character.sta < maxSTA(character) * .5) {
    const tips = ['輸入「休息」（30 分鐘，回復部分 STA 與少量 HP）或「睡一覺」（8 小時，STA 全滿並回復 HP）']
    const suggestions = ['休息', '睡一覺']
    if (character.place === 'tavern') { tips.push('在' + locations.tavern + '可以吃「烤麵包」或「燉肉飯」立刻回復'); suggestions.push('吃烤麵包', '吃燉肉飯') }
    if (character.inventory['繃帶']) { tips.push('有繃帶可以「使用繃帶」包紮'); suggestions.push('使用繃帶') }
    else if (character.hp < maxHP(character) * .7) tips.push('港口補給鋪賣繃帶')
    guide = { text: guide.text + '\n你的狀態不太好：' + tips.join('；') + '。', suggestions: [...guide.suggestions, ...suggestions] }
  }
  // Once the crew exists, tell the player who here could be invited to join it.
  const invitable = world.crew ? recruitableAt(world, character.place) : []
  if (invitable.length) guide = {
    text: guide.text + '\n' + invitable.slice(0, 3).map(npc => npcs[npc]).join('、') + (invitable.length > 3 ? '等人' : '') + '或許願意加入你們的船團，可以輸入「邀請' + npcs[invitable[0]] + '加入」。',
    suggestions: [...guide.suggestions, ...invitable.slice(0, 3).map(npc => '邀請' + npcs[npc] + '加入')],
  }
  return guide
}

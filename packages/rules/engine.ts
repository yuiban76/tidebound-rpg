import { attributeLabels, locations, npcs } from '../shared/protocol.ts'
import type { CharacterInput, Intent, NpcId } from '../shared/protocol.ts'
import { asksAboutBoatCrew, asksAboutShipPurchase, dialogueQuestion, directions, routeBetween } from '../world/explore.ts'
import { boatCrewReplies, goods, meals, npcFacts, npcPlace, npcsAt, party, shops, walkMinutes, weaponItems, weaponNames } from '../world/village.ts'
import { islandAt, islands, shipPurchaseInfo } from '../world/sea.ts'
import { resolveIslandTask, resolveSailing } from './sailing.ts'
import type { Character, CombatChoice, Member, World } from '../world/village.ts'

export type Attribute = keyof Character['stats']

export type Roll = (sides: number) => number
export type Result = {
  text: string, announce?: boolean, rejected?: boolean, minutes?: number,
  proposeCrew?: boolean, spokeWith?: NpcId, directReply?: boolean,
  /** A free action: the rules change nothing and the narrator writes what happens. */
  free?: boolean,
}
const freeAction = (): Result => ({ text: '自由行動。', minutes: 10, free: true })
const reject = (text: string): Result => ({ text, rejected: true })

export const maxHP = (c: Character) => 20 + 5 * c.stats.CON + 2 * (c.level - 1)
export const maxSTA = (c: Character) => 10 + 3 * c.stats.CON + 2 * c.stats.WIL + Math.floor((c.level - 1) / 2)
export const defense = (agi: number, dodge = 0, situational = 0) => 12 + agi + dodge + situational
export const voteThreshold = (count: number, major: boolean) => major ? count : Math.floor(count / 2) + 1
export const needsReview = (c: CharacterInput) => ['巨人', '其他'].includes(c.race) ||
  /三色霸氣|霸王色|惡魔果實|無上大快刀|控制.{0,6}玩家|世界最強/.test([c.background, c.style, c.origin].join(' '))

export function makeCharacter(input: CharacterInput): Character {
  const weapons: Record<string, Character['weapon']> = { 劍術: 'sword', 長兵器: 'spear', 射擊: 'musket' }
  const weapon = weapons[input.major] ?? 'fist'
  const kit = input.major === '醫術' ? { 繃帶: 2, 醫療工具: 1 } : {}
  const equipment = { fist: '基礎工具組', sword: '普通武士刀', spear: '普通長槍', musket: '普通火槍' }[weapon]
  const c: Character = {
    ...input, place: 'square', conversingWith: null, money: 2000, level: 1, xp: 0, unspent: 0, xpLog: {}, hp: 0, sta: 0, weapon,
    loaded: weapon === 'musket', inventory: { 普通衣物: 1, [equipment]: 1 },
    skillRanks: { [input.major]: 2, [input.basics[0]]: 1, [input.basics[1]]: 1, [input.life]: 1 },
  }
  Object.assign(c.inventory, kit, weapon === 'musket' ? { 火槍彈藥: 5 } : {})
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
    if (c.level % 4 === 0) {
      c.unspent++
      text += '獲得 1 點自由屬性點。'
    }
  }
  return text
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
  const damage = hit ? Math.max(0, dice.reduce((a, b) => a + b, 0) + stats.attr + (stats.bonus ?? 0) - (stats.armor ?? 0)) : 0
  return { natural, total, hit, damage, dice }
}

function recoverLog(world: World, c: Character, id: string) {
  world.settled = true
  world.quest = 'recovered'
  world.logHolder = id
  c.inventory['潮汐簿'] = 1
  delete world.combat
}

const isCombat = (intent: Intent): intent is CombatChoice =>
  ['attack', 'guard', 'flee', 'negotiate', 'reload'].includes(intent.kind)

function round(world: World, actor: Member, intent: CombatChoice, roll: Roll, connected: Set<string>): Result {
  const c = actor.character!
  if (c.place !== 'hill' || world.settled) return reject('這裡沒有可進行該行動的遭遇。')
  if (intent.kind === 'attack' && intent.power && c.sta < 2) return reject('強力攻擊需要 2 STA。')
  if (intent.kind === 'attack' && c.weapon === 'musket' && !c.loaded) return reject('火槍需要先裝填。')
  if (intent.kind === 'reload' && (c.weapon !== 'musket' || c.loaded || !c.inventory['火槍彈藥']))
    return reject('目前沒有可裝填的火槍或彈藥。')
  if (!world.combat && intent.kind === 'negotiate') {
    const natural = roll(20)
    const total = natural + c.stats.WIL + (c.skillRanks['說服'] ?? 0) + (world.clue ? 4 : 0)
    if (total >= 13) {
      recoverLog(world, c, actor.id)
      return withXp({ text: '說服 D20 ' + natural + '，合計 ' + total + '／13。岬恩交還潮汐簿，請你代為轉達漏記的工錢。', minutes: 5, announce: true },
        grantXp(c, 30))
    }
    return { text: '說服 D20 ' + natural + '，合計 ' + total + '／13。岬恩仍握著潮汐簿，你可以調查線索或再交涉。', minutes: 4 }
  }
  if (!world.combat && intent.kind !== 'attack') return reject('目前沒有進行中的戰鬥。')
  const participants = world.combat?.participants ?? party(world).filter(m => m.character!.place === 'hill' && m.character!.hp > 0).map(m => m.id)
  if (!participants.includes(actor.id)) return reject('你沒有參與當前戰鬥。')
  if (participants.some(id => !connected.has(id))) return reject('有參戰角色離線，戰鬥等待重連。')
  const combat = world.combat ??= { round: 1, participants, choices: {} }
  if (combat.choices[actor.id]) return reject('你已提交這一回合的行動。')
  combat.choices[actor.id] = intent
  if (participants.some(id => !combat.choices[id]))
    return { text: '已鎖定第 ' + combat.round + ' 回合指令。等待其他參戰者。' }

  const lines = ['第 ' + combat.round + ' 回合']
  const fighters = world.members.filter(m => participants.includes(m.id)).sort((a, b) => b.character!.stats.AGI - a.character!.stats.AGI)
  const cover = new Set<string>()
  for (const member of fighters) {
    const fighter = member.character!
    const choice = combat.choices[member.id]
    if (choice.kind === 'flee') {
      fighter.place = 'road'
      fighter.conversingWith = null
      lines.push(fighter.name + '撤回' + locations.road + '。')
    }
    if (choice.kind === 'guard') cover.add(member.id)
    if (choice.kind === 'reload') {
      fighter.inventory['火槍彈藥']--
      fighter.loaded = true
      lines.push(fighter.name + '裝填火槍。')
    }
  }
  for (const member of fighters) {
    if (world.settled) break
    const fighter = member.character!
    const choice = combat.choices[member.id]
    if (choice.kind === 'negotiate') {
      const natural = roll(20)
      const total = natural + fighter.stats.WIL + (fighter.skillRanks['說服'] ?? 0) + (world.clue ? 4 : 0)
      lines.push(fighter.name + '交涉 D20 ' + natural + '，合計 ' + total + '／15。')
      if (total >= 15) recoverLog(world, fighter, member.id)
    }
    if (choice.kind !== 'attack') continue
    const weapons = {
      fist: [4, '格鬥', fighter.stats.STR], sword: [6, '劍術', fighter.stats.STR],
      spear: [8, '長兵器', fighter.stats.STR], musket: [8, '射擊', fighter.stats.PER],
    } as const
    const [die, skill, attr] = weapons[fighter.weapon]
    if (choice.power) fighter.sta -= 2
    if (fighter.weapon === 'musket') fighter.loaded = false
    const hit = attackCheck(roll, { attr, skill: fighter.skillRanks[skill] ?? 0, def: defense(2, 1), die, bonus: choice.power ? 2 : 0 })
    world.courierHP = Math.max(0, world.courierHP - hit.damage)
    lines.push(fighter.name + '攻擊 D20 ' + hit.natural + '，合計 ' + hit.total + '／15' +
      (hit.hit ? '，傷害 ' + hit.damage + '（武器骰 ' + hit.dice.join('+') + '）。' : '，未命中。'))
    if (world.courierHP === 0) recoverLog(world, fighter, member.id)
  }
  if (world.settled) {
    const rewards = fighters.filter(m => m.character!.place === 'hill').map(m => grantXp(m.character!, 30)).filter(Boolean)
    return { text: [...lines, '衝突結束，潮汐簿已取回。', ...rewards].join('\n'), announce: true, minutes: 1 }
  }
  const target = fighters.find(m => m.character!.place === 'hill')
  if (target) {
    const victim = target.character!
    const def = defense(victim.stats.AGI, victim.skillRanks['閃避'], cover.has(target.id) ? 2 : 0)
    const hit = attackCheck(roll, { attr: 2, skill: 1, def, die: 4 })
    victim.hp = Math.max(0, victim.hp - hit.damage)
    lines.push('岬恩反擊 ' + victim.name + '，D20 ' + hit.natural + '，合計 ' + hit.total + '／' + def +
      (hit.hit ? '，傷害 ' + hit.damage + '。' : '，未命中。'))
    if (!victim.hp) lines.push(victim.name + '倒下，仍可接受救援。')
  }
  combat.participants = participants.filter(id => {
    const fighter = world.members.find(m => m.id === id)!.character!
    return fighter.hp > 0 && fighter.place === 'hill'
  })
  combat.choices = {}
  combat.round++
  if (!combat.participants.length) delete world.combat
  return { text: lines.join('\n'), announce: true, minutes: 1 }
}

function converse(world: World, c: Character, npc: NpcId, raw: string, minute = world.minute): Result {
  const place = npcPlace(world, npc)
  if (!place) return reject(npcs[npc] + '目前不在你能找到的地方。')
  if (place !== c.place) return islandAt(place) === islandAt(c.place)
    ? reject(npcs[npc] + '在' + locations[place] + '。可以先輸入「前往' + locations[place] + '」。')
    : reject(npcs[npc] + '在' + islands[islandAt(place)].name + '，要航行過去才能見到。')
  if (npc === 'courier' && world.courierHP === 0) return reject('岬恩目前失去意識。')
  if (npc === 'clerk' && world.quest === 'unoffered') world.quest = 'offered'
  const facts = npc === 'clerk' && world.quest === 'done' ? '潮汐簿已歸還。' : npcFacts(world, npc)
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
    return reject('戰鬥進行中。請描述攻擊、防守、撤退、交涉或裝填。')
  if (isCombat(intent) && !(intent.kind === 'reload' && !world.combat)) {
    // Combat rules only exist for the hill encounter; a scuffle anywhere else is the narrator's to tell.
    if (c.place !== 'hill' || (!world.combat && world.settled)) return freeAction()
    return round(world, actor, intent, roll, connected)
  }

  switch (intent.kind) {
    case 'sail': return resolveSailing(world, actor, intent, roll, connected)
    case 'islandTask': return resolveIslandTask(world, actor, intent, roll)
    case 'move': {
      if (c.place === intent.to)
        return intent.talkTo ? converse(world, c, intent.talkTo, raw) : reject('你已經在' + locations[c.place] + '。')
      if (intent.to === 'hill' && world.combat) return reject('山徑有正在結算的遭遇。')
      const route = routeBetween(c.place, intent.to, !!world.combat)
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
      if (c.money < dish.price) return reject('這份' + dish.name + '需要 ' + dish.price + ' 貝里，你帶的錢不夠。')
      c.money -= dish.price
      return { text: '你在' + locations.tavern + '吃了' + dish.name + '，花費 ' + dish.price + ' 貝里。', minutes: 10 }
    }
    case 'crew':
      if (world.crew) return reject('船團已經成立。')
      if (world.proposals.some(p => p.type === 'formCrew' && !p.passed))
        return reject('已有「成立船團」提案，請在「團隊決議」投票。')
      if (world.proposals.length >= 50) return reject('本章的提案已達上限。')
      return { text: c.name + '提議成立船團。請所有成員在「團隊決議」投票。', announce: true, proposeCrew: true }
    case 'talk': return converse(world, c, intent.npc, raw)
    case 'check': {
      const method = {
        observe: ['觀察', 'PER', '觀察', 10], climb: ['攀爬', 'AGI', '格鬥', 13],
        search: ['搜索', 'PER', '觀察', 12], sneak: ['潛行', 'AGI', '閃避', 12],
      } as const
      const [label, attr, skill, dc] = method[intent.method]
      const natural = roll(20)
      const total = natural + c.stats[attr] + (c.skillRanks[skill] ?? 0)
      let text = label + ' D20 ' + natural + '，合計 ' + total + '／' + dc + '，' + (total >= dc ? '成功。' : '未成功。')
      if (c.place === 'hill' && total >= dc && ['search', 'observe'].includes(intent.method) && !world.clue) {
        world.clue = true
        text += '你找到搬運工的工錢欠條，能當作交涉線索。'
      }
      return withXp({ text, minutes: 5 }, total >= dc ? grantXp(c, 5, 'check:' + intent.method + ':' + c.place) : '')
    }
    case 'quest':
      if (intent.step === 'abandon' && ['offered', 'active'].includes(world.quest)) {
        world.quest = 'abandoned'
        return { text: '隊伍擱置潮汐簿的委託。', announce: true, minutes: 1 }
      }
      if (c.place !== 'dock') return reject('需到' + locations.dock + '找提奧處理委託。')
      if (intent.step === 'accept' && ['offered', 'abandoned'].includes(world.quest)) {
        world.quest = 'active'
        return { text: '潮汐簿委託已登記。調查' + locations.hill + '。', announce: true, minutes: 2 }
      }
      if (intent.step === 'deliver' && world.logHolder === actor.id && c.inventory['潮汐簿']) {
        delete world.logHolder
        delete c.inventory['潮汐簿']
        world.quest = 'done'
        c.money += 350
        return withXp({ text: '潮汐簿回到提奧手上。你領到 350 貝里。', announce: true, minutes: 4 }, grantXp(c, 45))
      }
      return reject('目前無法登記或交付此委託。')
    case 'buy': {
      const item = goods[intent.item]
      if (c.place !== item.shop) return reject(item.label + '在' + locations[item.shop] + '的' + shops[item.shop] + '販售。')
      if (!world.stock[intent.item]) return reject(item.label + '已售完。')
      if (c.money < item.price) return reject('貝里不足。')
      world.stock[intent.item]--
      c.money -= item.price
      c.inventory[item.label] = (c.inventory[item.label] ?? 0) + 1
      const weapon = (Object.keys(weaponItems) as (keyof typeof weaponItems)[]).find(id => weaponItems[id] === item.label)
      let note = ''
      if (weapon && c.weapon === 'fist') {
        c.weapon = weapon
        note = '你改用' + item.label + '。'
      } else if (weapon && c.weapon !== weapon) note = '可輸入「改用' + item.label + '」換武器。'
      return { text: '購入' + item.label + '，支出 ' + item.price + ' 貝里。' + note, minutes: 3 }
    }
    case 'equip': {
      if (intent.weapon === c.weapon) return reject('你已經在使用' + weaponNames[c.weapon] + '。')
      if (intent.weapon !== 'fist' && !c.inventory[weaponItems[intent.weapon]])
        return reject('你的背包裡沒有' + weaponItems[intent.weapon] + '。')
      c.weapon = intent.weapon
      return { text: '你改用' + weaponNames[c.weapon] + '。', minutes: 1 }
    }
    case 'give': {
      const target = party(world).find(m => m.id !== actor.id && m.character!.name === intent.to.trim())
      if (!target) return reject('找不到名叫「' + intent.to + '」的隊友。')
      const t = target.character!
      if (t.place !== c.place) return reject(t.name + '不在' + locations[c.place] + '，要在同一地點才能轉交。')
      if (world.combat?.participants.includes(target.id)) return reject(t.name + '正在戰鬥中。')
      if ((intent.money === undefined) === (intent.item === undefined)) return reject('一次請轉交一種物品，或指定貝里金額。')
      if (intent.money !== undefined) {
        if (c.money < intent.money) return reject('你只有 ' + c.money + ' 貝里。')
        c.money -= intent.money
        t.money += intent.money
        return { text: c.name + '把 ' + intent.money + ' 貝里交給' + t.name + '。', minutes: 1 }
      }
      const item = findItem(c.inventory, intent.item!.trim())
      const count = intent.count ?? 1
      if (!item || c.inventory[item] < count) return reject('你的背包沒有足夠的「' + intent.item + '」。')
      c.inventory[item] -= count
      if (!c.inventory[item]) delete c.inventory[item]
      t.inventory[item] = (t.inventory[item] ?? 0) + count
      if (item === '潮汐簿') world.logHolder = target.id
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
      const nights = Math.floor(intent.hours / 8)
      for (const member of crew) {
        const x = member.character!
        if (!nights) continue
        x.sta = maxSTA(x)
        if (x.hp > 0) x.hp = Math.min(maxHP(x), x.hp + nights * Math.ceil(maxHP(x) / 4))
      }
      return {
        text: (crew.length > 1 ? '全隊' : '你') + '在' + locations[c.place] + '等待了 ' + intent.hours + ' 小時。' +
          (nights ? '休息讓 HP／STA 恢復了。' : ''),
        minutes: intent.hours * 60, announce: crew.length > 1,
      }
    }
    case 'rest':
      if (c.place === 'hill') return reject('山徑不適合安全休息。')
      c.sta = intent.sleep ? maxSTA(c) : Math.min(maxSTA(c), c.sta + Math.ceil(maxSTA(c) / 4))
      if (intent.sleep) c.hp = Math.min(maxHP(c), c.hp + Math.ceil(maxHP(c) / 4))
      return { text: '休息結束。HP ' + c.hp + '，STA ' + c.sta + '。', minutes: intent.sleep ? 480 : 30 }
    case 'aid': {
      const target = party(world).find(m => m.character!.name === intent.patient)?.character
      if (!target || target.place !== c.place || !c.inventory['繃帶'] || target.hp === maxHP(target))
        return reject('治療需要繃帶，以及同地且有傷的角色。')
      c.inventory['繃帶']--
      target.hp = Math.min(maxHP(target), target.hp + 4 + (c.skillRanks['醫術'] ?? 0))
      return withXp({ text: target.name + '接受包紮，目前 HP ' + target.hp + '。', minutes: 5 }, grantXp(c, 5, 'aid'))
    }
    case 'social': return { ...freeAction(), minutes: 3 }
    default:
      if (/離開(?:這座島|風車村|黎明島)|出海|別的島|跨島|下一座島/.test(raw))
        return reject('跨島請使用航海面板，和全隊共同出航。' + (!world.ship ? shipPurchaseInfo : ''))
      return freeAction()
  }
}

export function guideFor(world: Pick<World, 'quest' | 'logHolder' | 'npcPlaces'> & { combat?: Pick<NonNullable<World['combat']>, 'participants'> }, actor: Member) {
  const character = actor.character!
  const inCombat = world.combat?.participants.includes(actor.id)
  const guide = directions(character.place, {
    hillClosed: !!world.combat,
    inCombat,
    down: character.hp <= 0,
    present: npcsAt(world, character.place),
  })
  if (character.hp <= 0 || inCombat) return guide
  if (character.place === 'dock' && world.quest === 'offered') {
    return {
      text: guide.text + '\n提奧正在找潮汐簿。可以輸入「接受潮汐簿委託」。',
      suggestions: [...guide.suggestions, '接受潮汐簿委託'],
    }
  }
  if (character.place === 'dock' && world.logHolder === actor.id) {
    return {
      text: guide.text + '\n你帶著已找回的潮汐簿。可以輸入「交還潮汐簿」。',
      suggestions: [...guide.suggestions, '交還潮汐簿'],
    }
  }
  return guide
}

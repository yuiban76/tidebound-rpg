// Buying, selling, cashing bounty slips and using supplies (data in world/market.ts).
import { locations, npcs } from '../shared/protocol.ts'
import type { NpcId } from '../shared/protocol.ts'
import { tierLevel, weaponLabel } from '../world/forge.ts'
import { brokers, marineOffices, priceFor, resale, slipValue, slipsOf, specialByLabel, specials, traderSpecials } from '../world/market.ts'
import type { Special, SpecialId } from '../world/market.ts'
import { scale } from '../world/scale.ts'
import { islandAt, islands } from '../world/sea.ts'
import { isTrader, traders, traderWares } from '../world/traders.ts'
import type { TraderId } from '../world/traders.ts'
import { goods, npcsAt, shops, weaponItems, weaponNames } from '../world/village.ts'
import type { Character, Good, Member, World } from '../world/village.ts'
import { isDown } from './combat.ts'
import { maxHP, maxSTA } from './engine.ts'

const reject = (text: string) => ({ text, rejected: true as const })
const beli = (n: number) => n.toLocaleString('en-US') + ' 貝里'

const goodByName = (name: string) => (Object.keys(goods) as Good[]).find(id => id === name || goods[id].label === name)
const specialByName = (name: string) => (Object.keys(specials) as SpecialId[]).find(id => id === name) ?? specialByLabel(name)
/** The merchant standing on this spot, if any (a knocked-out one is not selling). */
const traderHere = (world: World, c: Character) => npcsAt(world, c.place).find(npc => isTrader(npc) && !isDown(world, npc)) as TraderId | undefined
/** Who sells a specialty, for the "where can I get it" answer. */
const sellersOf = (id: SpecialId) => (Object.keys(traderSpecials) as TraderId[]).filter(trader => traderSpecials[trader].includes(id))
  .map(trader => islands[traders[trader].island].name).join('、')

/** The Marines' supplier will not trade with wanted people. */
function refuses(trader: TraderId | undefined, c: Character, lawful?: boolean) {
  if ((trader === 'traderMarineford' || lawful) && c.bounty > 0)
    return '軍需商看了看你的懸賞單，說海軍的東西不賣給通緝犯。'
}

export function buyWare(world: World, actor: Member, name: string) {
  const c = actor.character!
  const trader = traderHere(world, c)
  const island = islandAt(c.place)
  const good = goodByName(name)
  if (good) {
    const item = goods[good]
    const fromTrader = trader && (traderWares as readonly string[]).includes(good) ? trader : undefined
    if (c.place !== item.shop && !fromTrader) return reject(item.label + '在' + locations[item.shop] + '的' + shops[item.shop] + '販售' +
      ((traderWares as readonly string[]).includes(good) ? '，各島港口的潮行商會行商也有賣' : '') + '。')
    const refused = fromTrader && refuses(fromTrader, c)
    if (refused) return reject(refused)
    if (!fromTrader) {
      world.stock[good] ??= item.initial
      if (!world.stock[good]) return reject(item.label + '已售完。')
    }
    const price = priceFor(world, island, fromTrader, item.price)
    if (c.money < price) return reject(item.label + '要 ' + beli(price) + '，你只有 ' + beli(c.money) + '。')
    if (!fromTrader) world.stock[good]--
    c.money -= price
    c.inventory[item.label] = (c.inventory[item.label] ?? 0) + 1
    const weapon = (Object.keys(weaponItems) as (keyof typeof weaponItems)[]).find(id => weaponItems[id] === item.label)
    let note = ''
    if (weapon && c.weapon === 'fist') { c.weapon = weapon; note = '你改用' + item.label + '。' }
    else if (weapon && c.weapon !== weapon) note = '可輸入「改用' + item.label + '」換武器。'
    return { text: (fromTrader ? npcs[fromTrader] + '把' + item.label + '交給你。' : '') + '購入' + item.label + '，支出 ' + beli(price) + '。' + note, minutes: 3 }
  }
  const id = specialByName(name)
  if (!id) return reject('沒有叫「' + name + '」的商品。')
  const ware: Special = specials[id]
  if (!trader || !traderSpecials[trader].includes(id)) return reject(ware.label + '是特產，只有' + sellersOf(id) + '的行商有賣。')
  const refused = refuses(trader, c, ware.lawful)
  if (refused) return reject(refused)
  if (ware.kind === 'weapon' && c.level < tierLevel[ware.tier!]) return reject(ware.label + '要等級 ' + tierLevel[ware.tier!] + ' 才駕馭得了，你目前是 ' + c.level + '。')
  const price = priceFor(world, island, trader, ware.price)
  if (c.money < price) return reject(ware.label + '要 ' + beli(price) + '，你只有 ' + beli(c.money) + '。')
  c.money -= price
  let note = ''
  if (ware.kind === 'weapon') {
    // A forged weapon: the plain weapon item plus its forge tier (forge.ts keeps tiers per weapon kind).
    const base = weaponItems[ware.weapon!]
    c.inventory[base] = (c.inventory[base] ?? 0) + 1
    ;(c.gear ??= {})[ware.weapon!] = Math.max(c.gear[ware.weapon!] ?? 0, ware.tier!)
    if (c.weapon === 'fist' || c.weapon === ware.weapon) { c.weapon = ware.weapon!; note = '你改用' + weaponLabel(c, weaponNames[c.weapon]) + '。' }
    else note = '可輸入「改用' + base + '」換武器。'
  } else c.inventory[ware.label] = (c.inventory[ware.label] ?? 0) + 1
  return { text: npcs[trader] + '把' + ware.label + '交給你。購入' + ware.label + '，支出 ' + beli(price) + '。' + ware.text + '。' + note, minutes: 3 }
}

/** Merchants buy goods and specialties back for half the list price. Bounty slips go to the Marines or a broker instead. */
export function sellWare(world: World, actor: Member, name: string, count = 1) {
  const c = actor.character!
  const trader = traderHere(world, c)
  if (!trader) return reject('這裡沒有收購東西的人。各島港口的潮行商會行商都會用半價收購。')
  if (name.includes('賞金單')) return reject('賞金單要到海軍基地兌換，或找地下掮客：輸入「兌換賞金單」。')
  const item = Object.keys(c.inventory).find(key => key === name) ?? Object.keys(c.inventory).find(key => key.includes(name) || name.includes(key))
  if (!item) return reject('你的背包裡沒有「' + name + '」。')
  const good = goodByName(item)
  const special = specialByLabel(item)
  const price = good ? goods[good].price : special ? specials[special].price : 0
  if (!price) return reject(npcs[trader] + '搖搖頭：「' + item + '我不收。」')
  if (c.inventory[item] < count) return reject('你只有 ' + c.inventory[item] + ' 個' + item + '。')
  c.inventory[item] -= count
  if (!c.inventory[item]) delete c.inventory[item]
  let note = ''
  if (c.weapon !== 'fist' && weaponItems[c.weapon] === item && !c.inventory[item]) {
    if (c.weapon === 'musket') c.loaded = false
    c.weapon = 'fist'
    note = '你改為徒手。'
  }
  const paid = resale(price) * count
  c.money += paid
  return { text: npcs[trader] + '收下' + item + (count > 1 ? ' × ' + count : '') + '，付給你 ' + beli(paid) + '。' + note, minutes: 3 }
}

/** Bounty slips: the Marines pay in full to anyone without a bounty; an underground broker pays a share to anyone. */
export function cashSlips(world: World, actor: Member) {
  const c = actor.character!
  const slips = slipsOf(c)
  if (!slips.length) return reject('你身上沒有賞金單。打倒有懸賞金的海賊或惡徒時，最後出手的人會拿到。')
  const total = slips.reduce((sum, slip) => sum + slipValue(slip) * c.inventory[slip], 0)
  const clear = () => { for (const slip of slips) delete c.inventory[slip] }
  if (marineOffices.includes(c.place)) {
    if (c.bounty > 0) return reject('海軍看了看你的臉，又看了看牆上的懸賞單……他們不會付錢給通緝犯。有懸賞金的人只能找地下掮客換錢。')
    clear()
    c.money += total
    return { text: '海軍核對了賞金單，付給你 ' + beli(total) + '。', minutes: 20, announce: true }
  }
  const broker = npcsAt(world, c.place).find(npc => brokers[npc] && !isDown(world, npc)) as NpcId | undefined
  if (broker) {
    const paid = Math.floor(total * brokers[broker]!)
    clear()
    c.money += paid
    return { text: npcs[broker] + '把賞金單收進懷裡，用 ' + Math.round(brokers[broker]! * 100) + '% 的價格付給你 ' + beli(paid) + '，什麼也沒多問。', minutes: 15 }
  }
  return reject('這裡兌換不了賞金單。海軍基地（' + marineOffices.map(place => locations[place]).join('、') + '）付全額；' +
    '地下掮客（' + (Object.keys(brokers) as NpcId[]).map(npc => npcs[npc]).join('、') + '）用兩成五到三成五的價格收購。')
}

/** Food, medicine and Adam wood out of combat. Returns undefined when the item is not one of these. */
export function useSupply(world: World, c: Character, name: string) {
  const id = specialByName(name)
  if (!id) return undefined
  const ware: Special = specials[id]
  if (!['food', 'heal', 'ship'].includes(ware.kind)) return undefined
  if (!c.inventory[ware.label]) return reject('你的背包裡沒有' + ware.label + '。')
  if (ware.kind === 'ship') {
    if (!world.ship) return reject('你們還沒有船。')
    if (c.place !== world.ship.port) return reject('要在停船的' + locations[world.ship.port] + '才能用亞當木修船。')
    if (world.ship.hull >= 100) return reject('船體已是 100／100。')
    world.ship.hull = 100
    if (!--c.inventory[ware.label]) delete c.inventory[ware.label]
    return { text: '工匠們用亞當木把船修得比新的還結實，船體 100／100。', minutes: 60, announce: true }
  }
  if (c.hp >= maxHP(c) && c.sta >= maxSTA(c)) return reject('你現在沒有需要恢復的地方。')
  if (!--c.inventory[ware.label]) delete c.inventory[ware.label]
  const hp = ((ware.hp ?? 0) + (ware.kind === 'heal' ? c.level : 0)) * scale
  if (c.hp > 0) c.hp = Math.min(maxHP(c), c.hp + hp)
  c.sta = Math.min(maxSTA(c), c.sta + (ware.sta ?? 0))
  return { text: (ware.kind === 'food' ? '你吃了' : '你用了') + ware.label + '，目前 HP ' + c.hp + '、STA ' + c.sta + '。', minutes: ware.kind === 'food' ? 10 : 2 }
}

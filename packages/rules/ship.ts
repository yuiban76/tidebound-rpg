// Orders about the ship herself: her name, a new hull, better parts, and what lies in her hold (data in world/ships.ts).
import { locations, npcs, shipParts } from '../shared/protocol.ts'
import type { Intent } from '../shared/protocol.ts'
import { beli } from '../world/scale.ts'
import { islandAt, islands, shipPurchaseInfo } from '../world/sea.ts'
import { holdCount, maxPart, modelOf, models, partLevel, partPrice, parts, sameIsland, shipName, shipwright, shipyards, tradeIn, yardAt } from '../world/ships.ts'
import { weaponItems } from '../world/village.ts'
import type { Character, Member, World } from '../world/village.ts'
import type { Result } from './engine.ts'

type ShipIntent = Extract<Intent, { kind: 'ship' }>
const stop = (text: string): Result => ({ text, rejected: true })
const adamWood = '亞當木'
const findItem = (stock: Record<string, number>, name: string) =>
  Object.keys(stock).find(key => key === name) ?? Object.keys(stock).find(key => key.includes(name))

/** A name fit for a ship: 1–12 letters, digits or Chinese characters, so it can never carry instructions or markup. */
export function shipNameFault(name: string) {
  if (!/^[\p{L}\p{N}][\p{L}\p{N}・·\- ]*$/u.test(name) || [...name].length > 12) return '船名要 1～12 個字，只能用文字、數字、空格、「・」和「-」。'
}

/** What Sabaody's coaters charge to wrap a ship in the bubble that takes her to Fishman Island. */
export const coatingPrice = 1_000_000

export function resolveShip(world: World, actor: Member, intent: ShipIntent): Result {
  const c = actor.character!
  const ship = world.ship
  if (intent.order === 'refit') return refit(world, actor, intent)
  if (!ship) return stop('你們還沒有船。' + shipPurchaseInfo)

  if (intent.order === 'coat') {
    if (c.place !== 'coatingYard') return stop('鍍膜要到夏波帝的' + locations.coatingYard + '。')
    if (islandAt(ship.port) !== 'sabaody') return stop(shipName(ship) + '要停在夏波帝才能鍍膜。')
    if (ship.coated) return stop(shipName(ship) + '已經鍍好膜了，隨時可以潛向魚人島。')
    if (c.money < coatingPrice) return stop('鍍膜要 ' + beli(coatingPrice) + '，你目前只有 ' + beli(c.money) + '。')
    c.money -= coatingPrice
    ship.coated = true
    return { text: c.name + '付了 ' + beli(coatingPrice) + '，鍍膜師把' + shipName(ship) + '整艘包進了一層泡泡膜。現在她可以潛向海底一萬公尺的魚人島了。', minutes: 180, announce: true }
  }

  if (intent.order === 'name') {
    const name = (intent.name ?? '').trim()
    const fault = shipNameFault(name)
    if (fault) return stop(fault)
    if (ship.name === name) return stop('船本來就叫' + shipName(ship) + '。')
    const before = ship.name && shipName(ship)
    ship.name = name
    return { text: c.name + (before ? '替' + before + '改了名字。從今天起，她叫' + shipName(ship) + '。' : '替' + modelOf(ship).label + '取了名字。從今天起，她叫' + shipName(ship) + '。'), minutes: 5, announce: true }
  }

  if (intent.order === 'upgrade') {
    const yard = yardAt(c.place)
    const places = Object.keys(shipyards).map(place => locations[place as keyof typeof shipyards & keyof typeof locations]).join('、')
    if (!yard) return stop('改裝船要到造船的地方：' + places + '。')
    if (!sameIsland(ship, c.place)) return stop(shipName(ship) + '停在' + locations[ship.port] + '，要開到' + islands[islandAt(c.place)].name + '才能改裝。')
    const part = intent.part
    if (!part) return stop('可以改裝的部分：' + shipParts.map(id => parts[id].label + ' ' + partLevel(ship, id) + '／' + maxPart(ship)).join('、') + '。例如輸入「升級船帆」。')
    const level = partLevel(ship, part) + 1
    if (level > maxPart(ship)) return stop(modelOf(ship).label + '的' + parts[part].label + '最多 ' + maxPart(ship) + ' 級' + (maxPart(ship) < 3 ? '，換更大的船才能再升。' : '，已經是最好的了。'))
    if (level > yard.level) return stop(yard.name + '只做得到 ' + yard.level + ' 級，更好的要到' + locations.galleyLa + '或' + locations.coatingYard + '。')
    const price = partPrice(world, part, level)
    if (c.money < price) return stop(parts[part].label + '升到 ' + level + ' 級要 ' + beli(price) + '，你只有 ' + beli(c.money) + '。')
    c.money -= price
    ship.parts = { ...ship.parts, [part]: level }
    const wright = shipwright(world)
    return {
      text: yard.name + '把' + shipName(ship) + '的' + parts[part].label + '升到 ' + level + ' 級，支出 ' + beli(price) + '。' +
        (wright ? npcs[wright] + '在旁邊出主意，省了兩成工錢。' : '') + parts[part].text(level) + '。',
      minutes: 120 * level, announce: true,
    }
  }

  // The hold and the safe: shared by everyone, only reachable beside the ship.
  if (c.place !== ship.port) return stop(shipName(ship) + '停在' + locations[ship.port] + '，要到船邊才能拿放東西。')
  if ((intent.money === undefined) === (intent.item === undefined)) return stop('一次請放或拿一種物品，或指定貝里金額。')
  const store = intent.order === 'store'
  if (intent.money !== undefined) {
    const from = store ? c.money : ship.safe ?? 0
    if (from < intent.money) return stop(store ? '你只有 ' + beli(c.money) + '。' : '船上的金庫只有 ' + beli(from) + '。')
    c.money += store ? -intent.money : intent.money
    ship.safe = (ship.safe ?? 0) + (store ? intent.money : -intent.money)
    return { text: c.name + (store ? '把 ' + beli(intent.money) + '放進' + shipName(ship) + '的金庫' : '從' + shipName(ship) + '的金庫拿了 ' + beli(intent.money)) + '，金庫裡有 ' + beli(ship.safe) + '。', minutes: 3 }
  }
  const hold = ship.hold ??= {}
  const [from, to] = store ? [c.inventory, hold] : [hold, c.inventory]
  const item = findItem(from, intent.item!.trim())
  const count = intent.count ?? 1
  if (!item || from[item] < count) return stop((store ? '你的背包' : '船艙裡') + '沒有足夠的「' + intent.item + '」。')
  if (store && holdCount(ship) + count > modelOf(ship).hold) return stop('船艙放不下了（' + holdCount(ship) + '／' + modelOf(ship).hold + '）。')
  from[item] -= count
  if (!from[item]) delete from[item]
  to[item] = (to[item] ?? 0) + count
  return {
    text: c.name + (store ? '把' + item + (count > 1 ? ' × ' + count : '') + '放進船艙' : '從船艙拿出' + item + (count > 1 ? ' × ' + count : '')) +
      '（' + holdCount(ship) + '／' + modelOf(ship).hold + '）。' + (store ? disarm(c, item) : ''),
    minutes: 3,
  }
}

/** Putting away the weapon in hand leaves a character bare-handed. */
function disarm(c: Character, item: string) {
  if (c.weapon === 'fist' || weaponItems[c.weapon] !== item || c.inventory[item]) return ''
  if (c.weapon === 'musket') c.loaded = false
  c.weapon = 'fist'
  return '你改為徒手。'
}

/** Buys a ship, or trades the old one in: name, parts, hold and safe move over to the new hull. */
function refit(world: World, actor: Member, intent: ShipIntent): Result {
  const c = actor.character!
  const yard = yardAt(c.place)
  const model = intent.model
  const sellers = model && Object.entries(shipyards).filter(([, shop]) => shop.models.includes(model)).map(([place]) => locations[place as keyof typeof locations]).join('、')
  if (!yard) return stop(sellers ? models[model!].label + '在' + sellers + '有賣。' : '買船要到造船的地方：' + Object.keys(shipyards).map(place => locations[place as keyof typeof locations]).join('、') + '。')
  if (!model) return stop(yard.name + '有：' + yard.models.map(id => models[id].label + ' ' + beli(models[id].price)).join('、') + '。例如輸入「換成' + models[yard.models.at(-1)!].label + '」。')
  if (!yard.models.includes(model)) return stop(yard.name + '沒有賣' + models[model].label + '，要到' + sellers + '。')
  const ship = world.ship
  if (ship && (ship.model ?? 'boat') === model) return stop('你們的船已經是' + models[model].label + '了。')
  if (ship && models[model].price < modelOf(ship).price) return stop('你們的' + modelOf(ship).label + '比' + models[model].label + '還好，不用換。')
  if (ship && !sameIsland(ship, c.place)) return stop(shipName(ship) + '停在' + locations[ship.port] + '，要開到' + islands[islandAt(c.place)].name + '才能換船。')
  const wood = models[model].adamWood ?? 0
  if ((c.inventory[adamWood] ?? 0) < wood) return stop('打造' + models[model].label + '需要 ' + wood + ' 份亞當木，你有 ' + (c.inventory[adamWood] ?? 0) + ' 份。' + locations.water7Port + '的行商有賣。')
  const credit = ship ? tradeIn(ship) : 0
  const price = models[model].price - credit
  if (c.money < price) return stop(models[model].label + '要 ' + beli(models[model].price) + (credit ? '，舊船折抵後還要 ' + beli(price) : '') + '，你只有 ' + beli(c.money) + '。')
  c.money -= price
  if (wood && !(c.inventory[adamWood] -= wood)) delete c.inventory[adamWood]
  const port = islands[islandAt(c.place)].port
  world.ship = ship ? { ...ship, model, hull: 100 } : { owner: actor.id, port, hull: 100, wood: 2, trips: 0, model }
  // The old votes were for another ship's crew calls; courses stay, so only readiness is asked again.
  if (world.sailing) world.sailing.ready = []
  return {
    text: yard.name + '把' + models[model].label + '交到你們手上，支出 ' + beli(price) + (credit ? '（舊船折抵 ' + beli(credit) + '）' : '') + '。' + models[model].text + '。' +
      (ship ? (ship.name ? '船名' + shipName(ship) + '、' : '') + '改裝、船艙和金庫都搬到了新船上。' : '船停在' + locations[port] + '，登記為隊伍共用主船。可以輸入「替船取名」加上名字。'),
    minutes: ship ? 480 : 60, announce: true,
  }
}

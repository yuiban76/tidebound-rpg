import { locations, npcs } from '../shared/protocol.ts'
import type { Intent } from '../shared/protocol.ts'
import { ballotCount, boatYard, islandAt, islands, islandStories, paceNames, routesFrom, sameRoute, selectedRoute, shipPurchaseInfo } from '../world/sea.ts'
import type { RouteChoice } from '../world/sea.ts'
import { party } from '../world/village.ts'
import type { Member, World } from '../world/village.ts'
import { grantXp } from './engine.ts'
import type { Result, Roll } from './engine.ts'

type SeaIntent = Extract<Intent, { kind: 'sail' }>
type TaskIntent = Extract<Intent, { kind: 'islandTask' }>
const stop = (text: string): Result => ({ text, rejected: true })

export function shipSaleBlock(world: World) {
  if (!world.ship) return '目前沒有可出售的主船。'
  if (world.ship.borrowed) return '借來的迎潮號仍屬船塢，不能出售。'
  if (world.ship.port !== 'dock' || party(world).some(m => m.character?.place !== 'dock'))
    return '出售主船前，船和全隊都要回到' + locations.dock + '。'
}

export function sellMainShip(world: World) {
  const buyer = party(world).find(member => member.id === world.ship?.owner)?.character
  if (!buyer) throw new Error('主船缺少登記船主。')
  buyer.money += boatYard.sale
  delete world.ship
  delete world.sailing
  return '船塢收購了迎潮號。' + buyer.name + '收到 ' + boatYard.sale + ' 貝里。'
}

function logVote(world: World, actor: Member, choice: RouteChoice) {
  const from = islandAt(world.ship!.port)
  const plan = world.sailing?.from === from ? world.sailing : { from, ballots: {}, ready: [] }
  const previous = selectedRoute(plan, party(world).length)
  plan.ballots[actor.id] = choice
  if (!sameRoute(previous, selectedRoute(plan, party(world).length))) plan.ready = []
  world.sailing = plan
  return ballotCount(plan, choice)
}

export function resolveSailing(world: World, actor: Member, intent: SeaIntent, roll: Roll, connected: Set<string>): Result {
  const c = actor.character!
  const ship = world.ship
  if (intent.order === 'buy' || intent.order === 'borrow') {
    if (c.place !== 'dock') return stop(shipPurchaseInfo)
    if (ship) return stop('隊伍已登記迎潮號，可查看航海面板。')
    const borrowing = intent.order === 'borrow'
    if (borrowing && world.quest !== 'done') return stop('交還潮汐簿後，提奧才會把迎潮號借給你們。')
    if (!borrowing && c.money < boatYard.price) return stop('購船需要 ' + boatYard.price + ' 貝里。完成潮汐簿委託也可借船。')
    if (!borrowing) c.money -= boatYard.price
    world.ship = { owner: actor.id, port: 'dock', hull: 100, wood: 2, trips: 0, ...(borrowing && { borrowed: true }) }
    return { text: (borrowing ? '提奧把' : '你花了 ' + boatYard.price + ' 貝里買下') + '迎潮號' +
      (borrowing ? '借給隊伍。' : '，登記為隊伍共用主船。') +
      '船停在' + locations.dock + '，附兩份木料。接著可選航線或輸入「出海」。', minutes: 8, announce: true }
  }
  if (!ship) return stop(shipPurchaseInfo)
  if (world.combat) return stop('遭遇仍在進行。結束戰鬥後才能處理航行。')
  const from = islandAt(ship.port)
  const options = routesFrom(from)
  const atPort = c.place === ship.port
  const requirement = Math.floor(party(world).length / 2) + 1

  if (intent.order === 'vote') {
    if (!intent.destination || !options.some(route => route.to === intent.destination))
      return stop('這座港口沒有通往該目的地的航線。')
    const option = { to: intent.destination, pace: intent.pace ?? 'steady' }
    if (sameRoute(world.sailing?.ballots[actor.id], option)) return stop('你已投票給這條航線。')
    const count = logVote(world, actor, option)
    return { text: c.name + '投票給' + islands[option.to].name + '（' + paceNames[option.pace] + '）' +
      '，目前 ' + count + '／' + requirement + ' 票。' +
      (count >= requirement ? '航線已通過。請全員到' + locations[ship.port] + '準備出航。' : '') }
  }
  if (!atPort) return stop('迎潮號停在' + locations[ship.port] + '。請先到船邊。')
  if (intent.order === 'materials') {
    if (c.money < boatYard.woodPrice) return stop('買一份木料需要 ' + boatYard.woodPrice + ' 貝里。')
    c.money -= boatYard.woodPrice
    ship.wood++
    return { text: '花費 ' + boatYard.woodPrice + ' 貝里，船上新增一份木料。', minutes: 3 }
  }
  if (intent.order === 'repair') {
    if (ship.hull >= 100) return stop('船體已是 100／100。')
    if (!ship.wood) return stop('需要一份木料。靠港後可輸入「買木料」。')
    ship.wood--
    const before = ship.hull
    ship.hull = Math.min(100, ship.hull + boatYard.repairGain)
    return { text: '用一份木料把船體從 ' + before + ' 修到 ' + ship.hull + '／100。', minutes: 25, announce: true }
  }

  const plan = world.sailing
  const chosen = selectedRoute(plan, party(world).length)
  if (intent.order === 'unready') {
    if (!plan?.ready.includes(actor.id)) return stop('你目前還沒標記準備。')
    plan.ready = plan.ready.filter(id => id !== actor.id)
    return { text: c.name + '取消出航準備。' }
  }
  if (intent.order === 'ready') {
    if (!plan || !chosen) return stop('航線尚未過半。請先投票選擇目的地。')
    if (plan.ready.includes(actor.id)) return stop('你已準備出航。')
    plan.ready.push(actor.id)
    return { text: c.name + '在船邊準備就緒。' + plan.ready.length + '／' + party(world).length +
      ' 人已準備。' + (plan.ready.length === party(world).length ? '可輸入「出海」。' : '') }
  }

  if (party(world).some(m => !connected.has(m.id))) return stop('有隊友離線。出航需要所有成員到齊。')
  if (party(world).some(m => m.character?.place !== ship.port)) return stop('請所有隊友到' + locations[ship.port] + '集合後再出海。')
  if (party(world).some(m => !m.character || m.character.hp <= 0)) return stop('有隊友還沒恢復行動能力，請先協助他們。')
  if (party(world).length > boatYard.seats) return stop('迎潮號的座位不足以載全隊。')
  if (!ship.hull) return stop('船體損壞。請先「修船」。')

  const solo = party(world).length === 1
  const option = solo
    ? intent.destination ? { to: intent.destination, pace: intent.pace ?? 'steady' }
      : chosen ?? { to: options[0].to, pace: 'steady' as const }
    : chosen
  if (!option) return stop('請在航海面板選航線，並由過半成員投票。')
  if (!solo && intent.destination && intent.destination !== option.to)
    return stop('目前通過的航線前往' + islands[option.to].name + '。變更目的地需要重新投票。')
  if (!solo && !party(world).every(m => plan?.ready.includes(m.id)))
    return stop('航線已通過。每位玩家都需要點「我準備出航」或輸入「準備出航」。')
  const route = options.find(link => link.to === option.to)
  if (!route) return stop('這條航線無法由現在的港口起航。')

  const navigator = Math.max(...party(world).map(m => m.character!.stats.INT + (m.character!.skillRanks['航海'] ?? 0)))
  const natural = roll(20)
  const score = natural + navigator
  const base = Math.ceil(route.miles * 60 / boatYard.speed)
  const fast = option.pace === 'fast'
  const minutes = Math.max(20, (fast ? Math.ceil(base * .82) : base + 16) + (score < 9 ? 24 : score >= 18 ? -12 : 0))
  const damage = fast ? (score < 9 ? 22 : score < 15 ? 8 : 2) : (score < 9 ? 4 : 0)
  const before = ship.hull
  ship.hull = Math.max(1, ship.hull - damage)
  ship.port = islands[option.to].port
  ship.trips++
  const discoveries: string[] = []
  for (const member of party(world)) {
    member.character!.place = ship.port
    member.character!.conversingWith = null
    // Reaching a new island is meaningful exploration; the home island pays nothing.
    if (option.to !== 'wind') discoveries.push(grantXp(member.character!, 20, 'island:' + option.to))
  }
  delete world.sailing
  const weather = score < 9 ? '遇見逆風與碎浪' : score >= 18 ? '順著有利的海流' : '越過平穩海面'
  return {
    text: '迎潮號從' + islands[from].name + '出航，以' + paceNames[option.pace] + '航行 ' + route.miles +
      ' 海里。航海 D20 ' + natural + '＋' + navigator + '＝' + score + '，' + weather +
      '，耗時 ' + minutes + ' 分鐘。\n全隊抵達' + islands[option.to].name + '的' + locations[ship.port] +
      '。船體 ' + before + ' → ' + ship.hull + '／100。' +
      (islandStories[option.to] && world.islandTasks?.[option.to]?.stage !== 'done'
        ? '\n島上消息：' + islandStories[option.to]!.title + '。可找' + npcs[islandStories[option.to]!.guide] + '。' : '') +
      discoveries.filter(Boolean).map(text => '\n' + text).join(''),
    minutes, announce: true,
  }
}

export function resolveIslandTask(world: World, actor: Member, intent: TaskIntent, roll: Roll): Result {
  const c = actor.character!
  const island = islandAt(c.place)
  const story = islandStories[island]
  if (!story) return stop('此處可在碼頭找提奧打聽潮汐簿。')
  const task = world.islandTasks?.[island]
  if (task?.stage === 'done') return stop('這項島上事件已處理完畢。')
  if (intent.step === 'accept') {
    if (c.place !== story.meeting) return stop('請先到' + locations[story.meeting] + '接委託。')
    if (task) return stop('隊伍已接下這項委託。')
    world.islandTasks ??= {}
    world.islandTasks[island] = { stage: 'active' }
    return { text: story.lead, minutes: 3 }
  }
  if (!task) return stop('請先接下「' + story.title + '」。')
  if (intent.step === 'search') {
    if (c.place !== story.search) return stop('要在' + locations[story.search] + '調查。')
    if (task.stage === 'found') return stop('搜索已完成。回' + locations[story.meeting] + '交付。')
    const die = roll(20)
    const check = die + c.stats.PER + (c.skillRanks['觀察'] ?? 0) + (task.attempts ?? 0) * 3
    if (check >= 11) {
      task.stage = 'found'
      return { text: '搜索 D20 ' + die + '，合計 ' + check + '／11。' + story.find + '回' + locations[story.meeting] + '交付。', minutes: 10, announce: true }
    }
    task.attempts = (task.attempts ?? 0) + 1
    return { text: '搜索 D20 ' + die + '，合計 ' + check + '／11。' + (story.miss ?? '你錯過了痕跡，但已排除一段岸線。再搜索會比較容易。'), minutes: 10 }
  }
  if (task.stage !== 'found' || c.place !== story.meeting) return stop('先完成搜索，再回' + locations[story.meeting] + '交付。')
  task.stage = 'done'
  c.money += story.reward
  if (world.ship) world.ship.wood += 2
  return { text: story.close + c.name + '取得 ' + story.reward + ' 貝里。船上補充兩份木料。\n' + grantXp(c, 60), minutes: 5, announce: true }
}

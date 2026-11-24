import { locations, npcs } from '../shared/protocol.ts'
import type { Intent } from '../shared/protocol.ts'
import { ballotCount, boatYard, islandAt, islands, islandStories, paceNames, routesFrom, sameRoute, selectedRoute, shipPurchaseInfo } from '../world/sea.ts'
import type { RouteChoice } from '../world/sea.ts'
import { party } from '../world/village.ts'
import { companionIds } from '../world/companions.ts'
import type { Member, PendingVoyage, World } from '../world/village.ts'
import { raceSeats, stat } from '../world/races.ts'
import { navigatorRank } from '../world/skills.ts'
import { rollSeaEncounter, tierNames } from '../world/foes.ts'
import { startSeaFight } from './combat.ts'
import { minuteOf } from '../world/canon.ts'
import { beli } from '../world/scale.ts'
import { setFlag } from '../world/flags.ts'
import { warFlag } from '../world/war.ts'
import { applyEffect } from '../world/timeline.ts'
import { grantXp } from './engine.ts'
import type { Result, Roll } from './engine.ts'

type SeaIntent = Extract<Intent, { kind: 'sail' }>
type TaskIntent = Extract<Intent, { kind: 'islandTask' }>
const stop = (text: string): Result => ({ text, rejected: true })

export function shipSaleBlock(world: World) {
  if (!world.ship) return '目前沒有可出售的主船。'
  if (world.ship.port !== 'dock' || party(world).some(m => m.character?.place !== 'dock'))
    return '出售主船前，船和全隊都要回到' + locations.dock + '。'
}

export function sellMainShip(world: World) {
  const buyer = party(world).find(member => member.id === world.ship?.owner)?.character
  if (!buyer) throw new Error('主船缺少登記船主。')
  buyer.money += boatYard.sale
  delete world.ship
  delete world.sailing
  return '船塢收購了' + boatYard.name + '。' + buyer.name + '收到 ' + beli(boatYard.sale) + '。'
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
  if (intent.order === 'buy') {
    if (c.place !== 'dock') return stop(shipPurchaseInfo)
    if (ship) return stop('隊伍已有' + boatYard.name + '，可查看航海面板。')
    if (c.money < boatYard.price) return stop('購船需要 ' + beli(boatYard.price) + '。')
    c.money -= boatYard.price
    world.ship = { owner: actor.id, port: 'dock', hull: 100, wood: 2, trips: 0 }
    return { text: '你花了 ' + beli(boatYard.price) + '買下' + boatYard.name + '，登記為隊伍共用主船。' +
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
  if (!atPort) return stop(boatYard.name + '停在' + locations[ship.port] + '。請先到船邊。')
  if (intent.order === 'materials') {
    if (c.money < boatYard.woodPrice) return stop('買一份木料需要 ' + beli(boatYard.woodPrice) + '。')
    c.money -= boatYard.woodPrice
    ship.wood++
    return { text: '花費 ' + beli(boatYard.woodPrice) + '，船上新增一份木料。', minutes: 3 }
  }
  if (intent.order === 'repair') {
    if (ship.hull >= 100) return stop('船體已是 100／100。')
    if (!ship.wood) return stop('需要一份木料。靠港後可輸入「買木料」。')
    ship.wood--
    const before = ship.hull
    const craft = c.skillRanks['工藝'] ?? 0
    ship.hull = Math.min(100, ship.hull + boatYard.repairGain + craft * 5)
    return { text: '用一份木料把船體從 ' + before + ' 修到 ' + ship.hull + '／100' + (craft ? '（工藝 ' + craft + '，多修了 ' + craft * 5 + '）' : '') + '。', minutes: 25, announce: true }
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
  // A giant takes two seats.
  if (party(world).reduce((seats, m) => seats + raceSeats(m.character!), 0) > boatYard.seats) return stop(boatYard.name + '的座位不足以載全隊（巨人佔 2 個座位）。')
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
  // Spec §9: the Grand Line follows the Log Pose, not a free menu of islands.
  if (route.logPose && !party(world).some(m => m.character!.inventory['記錄指針']))
    return stop('偉大航路的磁場會讓普通羅盤失靈，隊伍裡必須有人帶著記錄指針才能出航。羅格鎮的一本松武器店有賣。')
  if (route.needsTask && world.islandTasks?.[route.needsTask]?.stage !== 'done')
    return stop('這條航線要先完成「' + islandStories[route.needsTask]?.title + '」才能出發。')

  const navigator = Math.max(...party(world).map(m => stat(m.character!, 'INT') + (m.character!.skillRanks['航海'] ?? 0)))
  const natural = roll(20)
  const score = natural + navigator
  const base = Math.ceil(route.miles * 60 / boatYard.speed)
  const fast = option.pace === 'fast'
  // Each rank of the best navigator's 航海 trims the voyage by 3%.
  const minutes = Math.max(20, Math.round(((fast ? Math.ceil(base * .82) : base + 16) + (score < 9 ? 24 : score >= 18 ? -12 : 0)) * (1 - .03 * navigatorRank(world))))
  const damage = (fast ? (score < 9 ? 22 : score < 15 ? 8 : 2) : (score < 9 ? 4 : 0)) + (route.hazard?.damage ?? 0)
  const weather = score < 9 ? '遇見逆風與碎浪' : score >= 18 ? '順著有利的海流' : '越過平穩海面'
  const voyage: PendingVoyage = {
    from, to: option.to, pace: option.pace, miles: route.miles, minutes, damage, landfallXp: route.logPose ? 50 : 20,
    text: boatYard.name + '從' + islands[from].name + '出航，以' + paceNames[option.pace] + '航行 ' + route.miles +
      ' 海里。航海 D20 ' + natural + '＋' + navigator + '＝' + score + '，' + weather +
      (route.hazard ? '，' + route.hazard.name : '') + '，耗時 ' + duration(minutes) + '。',
  }
  delete world.sailing
  // Spec §9: sea events include pirates, Marines and Sea Kings. The fight interrupts the voyage until it ends.
  const encounter = world.calmSeas ? undefined : rollSeaEncounter(roll, route)
  if (encounter) {
    startSeaFight(world, encounter.foes, voyage)
    return {
      text: boatYard.name + '從' + islands[from].name + '出航，駛向' + islands[option.to].name + '。\n航行途中：' + encounter.text +
        '\n對手：' + encounter.foes.map(foe => foe.name + '（' + tierNames[foe.tier] + '）').join('、') +
        '。全隊可以攻擊、防守、使用繃帶，或輸入「撤退」由航海士嘗試甩開。',
      minutes: Math.ceil(minutes / 2), announce: true,
    }
  }
  return { ...finishVoyage(world, voyage), announce: true }
}

/** Lands the party at the destination: moves the ship and everyone aboard, applies hull wear and landfall XP. */
export function finishVoyage(world: World, voyage: PendingVoyage): { text: string, minutes: number } {
  const ship = world.ship!
  const before = ship.hull
  ship.hull = Math.max(1, ship.hull - voyage.damage)
  ship.port = islands[voyage.to].port
  ship.trips++
  const discoveries: string[] = []
  for (const member of party(world)) {
    member.character!.place = ship.port
    member.character!.conversingWith = null
    // Reaching a new island is meaningful exploration; the home island pays nothing.
    if (voyage.to !== 'wind') discoveries.push(grantXp(member.character!, voyage.landfallXp, 'island:' + voyage.to))
  }
  return {
    text: voyage.text + '\n全隊抵達' + islands[voyage.to].name + '的' + locations[ship.port] +
      '。船體 ' + before + ' → ' + ship.hull + '／100。' +
      (companionIds(world).length ? '\n隨船夥伴：' + companionIds(world).map(npc => npcs[npc]).join('、') + '也一起上岸。' : '') +
      (islandStories[voyage.to] && !['done', 'closed'].includes(world.islandTasks?.[voyage.to]?.stage ?? '')
        ? '\n島上消息：' + islandStories[voyage.to]!.title + '。可找' + npcs[islandStories[voyage.to]!.guide] + '。' : '') +
      discoveries.filter(Boolean).map(text => '\n' + text).join(''),
    minutes: voyage.minutes,
  }
}

export function resolveIslandTask(world: World, actor: Member, intent: TaskIntent, roll: Roll): Result {
  const c = actor.character!
  const island = islandAt(c.place)
  const story = islandStories[island]
  if (!story) return stop('這座島目前沒有可以接的委託。')
  const task = world.islandTasks?.[island]
  if (task?.stage === 'done') return stop('這項島上事件已處理完畢。')
  if (task?.stage === 'closed') return stop('「' + story.title + '」已經落幕，這件事由別人了結了。')
  if (story.blockedBy && world.islandTasks?.[story.blockedBy]?.stage === 'done')
    return stop('情勢已經改變，「' + story.title + '」不會再發生了。')
  if (intent.step === 'accept') {
    if (island === 'marineford' && world.warSide === 'marine') return stop('你們站在海軍這邊，不會去救艾斯。')
    if (c.place !== story.meeting) return stop('請先到' + locations[story.meeting] + '接委託。')
    if (task) return stop('隊伍已接下這項委託。')
    if (story.availableFrom && world.minute < minuteOf(story.availableFrom)) return stop('這裡目前還沒有相關的動靜。')
    const level = Math.max(...party(world).map(m => m.character!.level))
    if (story.minLevel && level < story.minLevel)
      return stop('這裡的局勢遠超你們目前的實力，貿然插手只會送命（建議等級 ' + story.minLevel + '，隊伍最高等級 ' + level + '）。')
    world.islandTasks ??= {}
    world.islandTasks[island] = { stage: 'active' }
    return { text: story.lead, minutes: 3 }
  }
  if (!task) return stop('請先接下「' + story.title + '」。')
  if (intent.step === 'search') {
    if (c.place !== story.search) return stop('要在' + locations[story.search] + '行動。')
    if (task.stage === 'found') return stop('這一步已完成。回' + locations[story.meeting] + '交付。')
    const { attr, skill } = story.check ?? { attr: 'PER', skill: '觀察' }
    const dc = story.dc ?? 11
    const minutes = story.searchMinutes ?? 10
    const die = roll(20)
    const check = die + stat(c, attr) + (c.skillRanks[skill] ?? 0) + (task.attempts ?? 0) * (story.retry ?? 3)
    const line = '判定 D20 ' + die + '，合計 ' + check + '／' + dc + '。'
    if (check >= dc) {
      task.stage = 'found'
      return { text: line + story.find + '回' + locations[story.meeting] + '交付。', minutes, announce: true }
    }
    task.attempts = (task.attempts ?? 0) + 1
    return { text: line + (story.miss ?? '你錯過了痕跡，但已排除一段岸線。再搜索會比較容易。'), minutes }
  }
  if (task.stage !== 'found' || c.place !== story.meeting) return stop('先完成上一步，再回' + locations[story.meeting] + '交付。')
  task.stage = 'done'
  c.money += story.reward
  if (world.ship) world.ship.wood += 2
  applyEffect(world, story.onDone)
  // Freeing Ace with the Marineford quest saves him from the war's canon ending too.
  if (island === 'marineford') setFlag(world, warFlag('pullAce'))
  // Everyone on the island shares the experience of a finished island quest.
  const rewards = party(world).filter(m => islandAt(m.character!.place) === island)
    .map(m => grantXp(m.character!, story.xp ?? 60)).filter(Boolean)
  return {
    text: story.close + (story.reward ? c.name + '取得 ' + beli(story.reward) + '。' : '') + '船上補充兩份木料。\n' + rewards.join('\n'),
    minutes: 5, announce: true,
  }
}

function duration(minutes: number) {
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor(minutes % 1440 / 60)
  return minutes < 120 ? minutes + ' 分鐘' : (days ? days + ' 天' : '') + (hours ? hours + ' 小時' : '')
}

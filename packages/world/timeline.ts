import type { IslandId, LocationId, NpcId } from '../shared/protocol.ts'
import { canonTimeline, bossDefeats, luffyRoute, minuteOf } from './canon.ts'
import type { CanonEvent, RouteStop, WorldEffect } from './canon.ts'
import { expireOffers } from '../rules/fruits.ts'
import { canonRoutes, castRoutes } from './cast.ts'
import type { CastStop } from './cast.ts'
import { eventPhases } from './phases.ts'
import { flagsHold, hasFlag, queuePaper } from './flags.ts'
import { locations, npcs } from '../shared/protocol.ts'
import { islandAt, islands, seaLanes } from './sea.ts'
import { npcPlace, party } from './village.ts'
import { growCompanions, reviveCompanions } from './companions.ts'
import type { NewsItem, World } from './village.ts'

/** Applies an event's or a quest's consequences to the shared world state. */
export function applyEffect(world: World, effect?: WorldEffect) {
  if (!effect) return
  // A companion is with the party, so the canon storyline cannot move them away or rewrite what they know.
  for (const [npc, place] of Object.entries(effect.move ?? {})) {
    if (!world.companions?.[npc as NpcId]) (world.npcPlaces ??= {})[npc as NpcId] = place
  }
  for (const [npc, text] of Object.entries(effect.facts ?? {})) {
    if (!world.companions?.[npc as NpcId]) (world.npcFacts ??= {})[npc as NpcId] = text
  }
  for (const id of effect.close ?? []) {
    if (world.islandTasks?.[id]?.stage !== 'done') (world.islandTasks ??= {})[id] = { stage: 'closed' }
  }
  if (effect.repairShip && world.ship) world.ship.hull = 100
}

const hours = (n: number) => n * 60
/** Default lead times in hours: rumor 36 h ahead, warning 6 h ahead, aftermath 12 h after. */
const lead = { omen: 36, warn: 6, after: 12 }
/** The morning paper is printed at 06:00; paper `d` is the one on day index `d` (0 = Day 1). */
const paperMinute = (d: number) => d * 1440 + 360

/** When the event really happens: the canon time, moved earlier or later by what the players already did. */
export function eventTime(world: World, event: CanonEvent) {
  const shift = eventPhases[event.id]?.shifts?.find(entry => flagsHold(world, entry.when))
  return minuteOf(event.at) + (shift ? hours(shift.hours) : 0)
}

const partyIslands = (world: World) => new Set(party(world).map(member => islandAt(member.character!.place)))

const milesFrom = new Map<IslandId, Map<IslandId, number>>()
/** Shortest sea distance in miles over every lane (news also travels on one-way lanes, in both directions). */
function seaMiles(from: IslandId, to: IslandId) {
  if (!milesFrom.has(from)) {
    const dist = new Map<IslandId, number>([[from, 0]])
    const open = new Set<IslandId>([from])
    while (open.size) {
      const here = [...open].reduce((a, b) => dist.get(a)! <= dist.get(b)! ? a : b)
      open.delete(here)
      for (const { ends: [a, b], miles } of seaLanes) {
        const next = a === here ? b : b === here ? a : undefined
        if (next === undefined) continue
        const total = dist.get(here)! + miles
        if (total < (dist.get(next) ?? Infinity)) { dist.set(next, total); open.add(next) }
      }
    }
    milesFrom.set(from, dist)
  }
  return milesFrom.get(from)!.get(to) ?? Infinity
}

/** How long news takes to cross the sea: nothing on the spot, about a day and a half nearby, three days at most. */
export function newsDelayHours(from: IslandId, to: IslandId) {
  if (from === to) return 0
  const miles = seaMiles(from, to)
  return Math.min(72, 12 + Math.round(Number.isFinite(miles) ? miles * 1.5 : 60))
}

function publish(world: World, news: { minute: number, text: string }[], item: NewsItem) {
  const list = (world.news ??= [])
  list.push(item)
  if (list.length > 80) list.splice(0, list.length - 80)
  news.push({ minute: item.minute, text: item.text })
}

const headline = (event: CanonEvent, text: string) => islands[event.island].name + '・' + event.title + '：' + text

/** An outcome matches when its island quest is done, its villain beaten, or all its flags hold. */
const outcomeFor = (world: World, event: CanonEvent) => event.changed?.find(option =>
  (option.by && hasFlag(world, 'task:' + option.by)) || (option.defeated && hasFlag(world, 'defeated:' + option.defeated)) || flagsHold(world, option.when))

/**
 * Plays out every canon event whose time has come, in calendar order, exactly once. Each event has four phases:
 * a rumor, a warning, the event itself and an aftermath; the party only hears the ones on the island it is standing on.
 * An event plays out differently when the players already changed what leads to it (flags), and when they are on
 * the spot with the villain it becomes a stand-off they can win. Spec §6.2: news reaches the party as an eyewitness
 * report on that island, otherwise by the morning paper once it has had time to travel.
 */
export function advanceTimeline(world: World) {
  const news: { minute: number, text: string }[] = []
  const phases = (world.phases ??= {})
  const here = partyIslands(world)
  const latestPaper = Math.floor((world.minute - 360) / 1440)
  if (world.paperDay === undefined) {
    // First time (or an older save): never print the back issues, and do not announce deeds that happened before.
    world.paperDay = latestPaper
    for (const npc of world.defeated ?? []) phases['defeat:' + npc] = -1
  }
  for (const event of canonTimeline) {
    const info = eventPhases[event.id]
    const at = eventTime(world, event)
    const key = (suffix: string) => event.id + ':' + suffix
    if (world.timeline?.[event.id]) {
      const fired = phases[key('fired')] ?? world.minute
      if (phases[key('after')] === undefined && world.minute >= fired + hours(info?.lead?.after ?? lead.after)) {
        const fresh = world.minute <= fired + hours(48)
        phases[key('after')] = fresh ? world.minute : -1
        if (fresh && info?.after && here.has(event.island))
          publish(world, news, { minute: world.minute, kind: 'after', island: event.island, event: event.id, text: '【後續】' + islands[event.island].name + '：' + info.after })
      }
      continue
    }
    // Rumor and warning: marked when their time comes (silently when the event is already due), heard on the island.
    for (const [phase, when] of [['omen', at - hours(info?.lead?.omen ?? lead.omen)], ['warn', at - hours(info?.lead?.warn ?? lead.warn)]] as const) {
      if (phases[key(phase)] === undefined && world.minute >= when) phases[key(phase)] = world.minute >= at ? -1 : world.minute
      const text = info?.[phase]
      if (text && phases[key(phase)] > 0 && phases[key(phase) + ':heard'] === undefined && here.has(event.island)) {
        phases[key(phase) + ':heard'] = world.minute
        publish(world, news, {
          minute: world.minute, kind: phase === 'omen' ? 'rumor' : 'warning', island: event.island, event: event.id,
          text: (phase === 'omen' ? '【傳聞】' : '【警告】') + islands[event.island].name + '：' + text,
        })
      }
    }
    if (at > world.minute) continue
    if (flagsHold(world, event.skip)) {
      ;(world.timeline ??= {})[event.id] = 'changed'
      phases[key('fired')] = world.minute
      continue
    }
    // A stand-off: the party is on the island and the villain is there, so the players get the chance to act first.
    const scene = info?.scene
    if (scene) {
      const foePlace = npcPlace(world, scene.foe)
      const foeHere = foePlace !== null && islandAt(foePlace) === event.island && !hasFlag(world, 'defeated:' + scene.foe) && !world.companions?.[scene.foe]
      if (phases[key('scene')] === undefined && here.has(event.island) && foeHere) {
        phases[key('scene')] = world.minute
        phases[key('until')] = world.minute + scene.minutes
        publish(world, news, {
          minute: world.minute, kind: 'scene', island: event.island, event: event.id,
          text: '【現場】' + islands[event.island].name + '・' + event.title + '：' + scene.intro + '（約 ' + Math.round(scene.minutes / 60) + ' 小時內還來得及）',
        })
        continue
      }
      if (phases[key('scene')] !== undefined && world.minute < phases[key('until')] && !hasFlag(world, 'defeated:' + scene.foe)) continue
    }
    const change = outcomeFor(world, event)
    ;(world.timeline ??= {})[event.id] = change ? 'changed' : 'canon'
    phases[key('fired')] = world.minute
    applyEffect(world, change ? change.effect : event.effect)
    const text = headline(event, change?.text ?? event.text)
    if (here.has(event.island)) publish(world, news, { minute: at, kind: 'witness', island: event.island, event: event.id, text: '【目擊】' + text })
    else {
      const delay = Math.min(...[...here].map(island => newsDelayHours(event.island, island)), 72)
      queuePaper(world, '【報紙】' + text, at + hours(delay), event.island, event.id)
    }
  }
  followLuffy(world, news, here)
  followCast(world, news, here)
  expireOffers(world)
  headlines(world)
  growCompanions(world)
  reviveCompanions(world)
  printPapers(world, news)
  return news.sort((a, b) => a.minute - b.minute)
}

/** Luffy moves on his own schedule, but the story reacts to what the players did to it. */
function followLuffy(world: World, news: { minute: number, text: string }[], here: Set<IslandId>) {
  for (const stop of luffyRoute) {
    const at = minuteOf(stop.at)
    const key = 'luffy@' + stop.at.join('-')
    if (at > world.minute || world.timeline?.[key]) continue
    ;(world.timeline ??= {})[key] = 'canon'
    if (stop.unless && world.islandTasks?.[stop.unless]?.stage === 'done') continue
    if (stop.skip && hasFlag(world, stop.skip)) {
      applyEffect(world, { move: { luffy: null }, ...(stop.skipFacts && { facts: { luffy: stop.skipFacts } }) })
      continue
    }
    const facts = luffyFacts(world, stop)
    applyEffect(world, { move: { luffy: stop.place }, ...(facts && { facts: { luffy: facts } }) })
    if (stop.place && here.has(islandAt(stop.place)))
      news.push({ minute: at, text: '【目擊】戴草帽的少年' + npcs.luffy + '出現在' + locations[stop.place] + '。' })
  }
}

/** The popular canon characters keep their own calendar (cast.ts). A recruited companion is never moved by it. */
function followCast(world: World, news: { minute: number, text: string }[], here: Set<IslandId>) {
  // People arriving at the same spot at the same time make one sighting (a whole fleet lands at Marineford at once).
  const sightings = new Map<string, { minute: number, place: LocationId, names: string[] }>()
  const routes = { ...castRoutes, ...canonRoutes } as Partial<Record<NpcId, CastStop[]>>
  for (const npc of Object.keys(routes) as NpcId[]) {
    for (const stop of routes[npc]!) {
      const at = minuteOf(stop.at)
      const key = 'cast:' + npc + '@' + stop.at.join('-')
      if (at > world.minute || world.timeline?.[key]) continue
      ;(world.timeline ??= {})[key] = 'canon'
      if (world.companions?.[npc] || flagsHold(world, stop.unless)) continue
      applyEffect(world, { move: { [npc]: stop.place }, ...(stop.facts && { facts: { [npc]: stop.facts } }) })
      if (stop.place && here.has(islandAt(stop.place)) && world.minute - at <= 360) {
        const spot = sightings.get(at + '|' + stop.place) ?? { minute: at, place: stop.place, names: [] }
        spot.names.push(npcs[npc])
        sightings.set(at + '|' + stop.place, spot)
      }
    }
  }
  for (const { minute, place, names } of sightings.values())
    news.push({ minute, text: '【目擊】' + names.join('、') + '出現在' + locations[place] + '。' })
}

/** What Luffy can tell people at a stop. Crew the players recruited first are missing from his crew. */
function luffyFacts(world: World, stop: RouteStop) {
  if (!stop.facts) return undefined
  const taken = (route: RouteStop) => !!route.joins && hasFlag(world, 'recruited:' + route.joins)
  if (taken(stop)) return '想拉' + npcs[stop.joins!] + '入夥，卻發現對方早已跟著別人走了，他只能繼續找夥伴。'
  const missing = luffyRoute.filter(route => minuteOf(route.at) <= minuteOf(stop.at) && taken(route)).map(route => npcs[route.joins!])
  return stop.facts + (missing.length ? '（他原本想找的' + missing.join('、') + '已經不在他身邊了。）' : '')
}

/** What the players did that is worth a line in the paper: villains they beat. */
function headlines(world: World) {
  const phases = world.phases!
  for (const npc of world.defeated ?? []) {
    const key = 'defeat:' + npc
    if (phases[key] !== undefined) continue
    phases[key] = world.minute
    const defeat = bossDefeats[npc]
    if (defeat) queuePaper(world, '【報紙】' + defeat.text, world.minute)
  }
}

/** Prints every morning paper that has come out since the last one. */
function printPapers(world: World, news: { minute: number, text: string }[]) {
  const latest = Math.floor((world.minute - 360) / 1440)
  for (let day = world.paperDay! + 1; day <= latest; day++) {
    const out = paperMinute(day)
    const due = (world.paperQueue ?? []).filter(item => item.due <= out).sort((a, b) => a.minute - b.minute)
    world.paperQueue = (world.paperQueue ?? []).filter(item => item.due > out)
    for (const item of due)
      publish(world, news, { minute: out, kind: 'paper', text: item.text, ...(item.island && { island: item.island }), ...(item.event && { event: item.event }) })
    world.paperDay = day
  }
}

/**
 * Minutes until the next thing the party on the spot should wake up for (a warning, or a stand-off starting), if it
 * falls within `minutes`. Long rests and waits stop there so nobody sleeps through the event.
 */
export function alertWithin(world: World, minutes: number) {
  const here = partyIslands(world)
  let first: number | undefined
  for (const event of canonTimeline) {
    if (world.timeline?.[event.id] || !here.has(event.island)) continue
    const info = eventPhases[event.id]
    const at = eventTime(world, event)
    const times: number[] = []
    if (world.phases?.[event.id + ':warn'] === undefined) times.push(at - hours(info?.lead?.warn ?? lead.warn))
    if (info?.scene && world.phases?.[event.id + ':scene'] === undefined) times.push(at)
    for (const time of times)
      if (time > world.minute && time <= world.minute + minutes && (first === undefined || time < first)) first = time
  }
  return first === undefined ? undefined : first - world.minute
}

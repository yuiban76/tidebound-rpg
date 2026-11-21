import type { NpcId } from '../shared/protocol.ts'
import { canonTimeline, minuteOf } from './canon.ts'
import type { WorldEffect } from './canon.ts'
import { islandAt, islands } from './sea.ts'
import { party } from './village.ts'
import type { World } from './village.ts'

/** Applies an event's or a quest's consequences to the shared world state. */
export function applyEffect(world: World, effect?: WorldEffect) {
  if (!effect) return
  for (const [npc, place] of Object.entries(effect.move ?? {})) (world.npcPlaces ??= {})[npc as NpcId] = place
  for (const [npc, text] of Object.entries(effect.facts ?? {})) (world.npcFacts ??= {})[npc as NpcId] = text
  for (const id of effect.close ?? []) {
    if (world.islandTasks?.[id]?.stage !== 'done') (world.islandTasks ??= {})[id] = { stage: 'closed' }
  }
  if (effect.repairShip && world.ship) world.ship.hull = 100
}

/**
 * Fires every canon event whose time has come, in calendar order, exactly once.
 * An event plays out differently when the players already finished the quest that changes it.
 * Spec §6.2: news reaches the party as an eyewitness report only on that island, otherwise by newspaper.
 */
export function advanceTimeline(world: World) {
  const news: { minute: number, text: string }[] = []
  for (const event of canonTimeline) {
    const at = minuteOf(event.at)
    if (at > world.minute || world.timeline?.[event.id]) continue
    const change = event.changed?.find(option => world.islandTasks?.[option.by]?.stage === 'done')
    ;(world.timeline ??= {})[event.id] = change ? 'changed' : 'canon'
    applyEffect(world, change ? change.effect : event.effect)
    const witnessed = party(world).some(member => islandAt(member.character!.place) === event.island)
    news.push({
      minute: at,
      text: (witnessed ? '【目擊】' : '【報紙】') + islands[event.island].name + '・' + event.title + '：' + (change?.text ?? event.text),
    })
  }
  return news
}

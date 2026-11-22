// Flags: one place that answers "did the players do X?". Most flags are read from state that already exists
// (finished quests, beaten bosses, companions, items); the rest are stored in world.flags.
// Syntax: task:<island> defeated:<npc> recruited:<npc> item:<name> at:<island> crew <custom>. A leading ! negates.
import type { IslandId, NpcId } from '../shared/protocol.ts'
import { islandAt } from './sea.ts'
import { isCompanion } from './companions.ts'
import { party } from './village.ts'
import type { World } from './village.ts'

export type FlagWorld = Pick<World, 'members'> & Partial<Pick<World, 'islandTasks' | 'defeated' | 'flags' | 'companions' | 'crew' | 'minute'>>

export function hasFlag(world: FlagWorld, expr: string): boolean {
  if (expr.startsWith('!')) return !hasFlag(world, expr.slice(1))
  const [kind, ...rest] = expr.split(':')
  const name = rest.join(':')
  switch (kind) {
    case 'task': return world.islandTasks?.[name as IslandId]?.stage === 'done'
    case 'defeated': return !!world.defeated?.includes(name as NpcId)
    case 'recruited': return !!world.flags?.[expr] || isCompanion(world, name as NpcId)
    case 'item': return party(world).some(m => (m.character!.inventory[name] ?? 0) > 0)
    case 'at': return party(world).some(m => islandAt(m.character!.place) === name)
    case 'crew': return !!world.crew
    default: return !!world.flags?.[expr]
  }
}

/** Every condition must hold; no conditions at all never matches (an outcome needs a reason). */
export const flagsHold = (world: FlagWorld, when?: string[]) => !!when?.length && when.every(expr => hasFlag(world, expr))

/** Remembers something the players did. The first time wins, so the minute is when it first happened. */
export function setFlag(world: Pick<World, 'flags' | 'minute'>, flag: string) {
  ;(world.flags ??= {})[flag] ??= world.minute
}

/** Puts a headline in the queue for the next morning paper that is due at or after `due`. */
export function queuePaper(world: Pick<World, 'paperQueue' | 'minute'>, text: string, due = world.minute, island?: IslandId, event?: string) {
  ;(world.paperQueue ??= []).push({ minute: world.minute, due, text, ...(island && { island }), ...(event && { event }) })
}

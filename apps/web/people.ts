// Sorting the people on a spot into groups for the 「這裡的人」 card (apps/web/here.tsx). Pure, so it can be tested.
import { traderNpcs } from '../../packages/shared/atlas.ts'
import type { NpcId } from '../../packages/shared/protocol.ts'
import { crewOf } from '../../packages/world/crews.ts'
import { npcProfiles } from '../../packages/world/foes.ts'
import type { Faction } from '../../packages/world/foes.ts'

/** Past this many people the list gets a search box. */
export const searchFrom = 8

/** Who stands with whom, in the order the groups are listed. Crews come right after companions. */
const factionGroups: [Faction, string][] = [
  ['marine', '海軍'], ['government', '世界政府'], ['tyrant', '七武海・霸主'], ['pirate', '海賊'],
  ['bandit', '山賊・浪人'], ['civilian', '居民'], ['beast', '動物'],
]
const factionLabel = Object.fromEntries(factionGroups) as Record<Faction, string>

export type Person = { npc: NpcId, name: string, role: string, mate: boolean }
export type Group = { key: string, label: string, people: Person[] }

/**
 * Sorts the people on a spot into groups: companions, every crew with two or more here (the Whitebeard Pirates at
 * Marineford), then the rest by faction, with the traveling merchants last. A crew of one joins its faction.
 */
export function groupPeople(people: Person[]): Group[] {
  const crewCount = new Map<string, number>()
  for (const person of people) {
    const crew = !person.mate && crewOf(person.npc)?.name
    if (crew) crewCount.set(crew, (crewCount.get(crew) ?? 0) + 1)
  }
  const keyOf = (person: Person) => {
    if (person.mate) return 'mate'
    if (Object.hasOwn(traderNpcs, person.npc)) return 'trader'
    const crew = crewOf(person.npc)?.name
    if (crew && crewCount.get(crew)! > 1) return 'crew:' + crew
    return 'faction:' + npcProfiles[person.npc].faction
  }
  const groups = new Map<string, Group>()
  for (const person of people) {
    const key = keyOf(person)
    const label = key === 'mate' ? '同行夥伴' : key === 'trader' ? '行商' : key.startsWith('crew:') ? key.slice(5) : factionLabel[key.slice(8) as Faction]
    if (!groups.has(key)) groups.set(key, { key, label, people: [] })
    groups.get(key)!.people.push(person)
  }
  const rank = (key: string) => key === 'mate' ? 0 : key.startsWith('crew:') ? 1 : key === 'trader' ? 3 + factionGroups.length
    : 2 + factionGroups.findIndex(([faction]) => 'faction:' + faction === key)
  return [...groups.values()].sort((a, b) => rank(a.key) - rank(b.key) || b.people.length - a.people.length)
}

// Pirate crews and other bands that fight as one: attack the captain or any member and every crewmate
// who is with them right now joins the fight. Membership follows the canon calendar and the players' choices —
// someone the players recruited fights on the players' side instead, and a knocked-out member stays out.
import type { LocationId, NpcId } from '../shared/protocol.ts'
import { minuteOf } from './canon.ts'
import { gruntFoe } from './foes.ts'
import type { Faction, Foe } from './foes.ts'
import { npcPlace } from './village.ts'
import type { World } from './village.ts'

type CrewMember = {
  npc: NpcId
  /** [day, hour] the member joins / leaves the crew; without them the member always belongs. */
  from?: [number, number], until?: [number, number]
  /** Travels aboard with the captain: while "at sea" (no place of their own) they stand wherever the captain stands. */
  sails?: boolean
}
export type Crew = {
  name: string, captain: NpcId, faction: Faction, members: CrewMember[]
  /** Unnamed crewmen who only show up on the crew's home ground. */
  grunts?: { name: string, tier: number, count: number, home: LocationId[] }
}

const straw = (npc: NpcId, from: [number, number], until: [number, number] = [59, 12]): CrewMember => ({ npc, from, until, sails: true })

export const crews: Record<string, Crew> = {
  // Luffy's crew grows on his own route (see luffyRoute) and scatters at Sabaody on Day 59.
  strawHat: { name: '草帽一夥', captain: 'luffy', faction: 'pirate', members: [
    straw('zoro', [2, 16]), straw('usopp', [4, 12]), straw('sanji', [6, 18]), straw('nami', [8, 17]),
    straw('vivi', [12, 4], [27, 8]), straw('chopper', [18, 14]), straw('robin', [27, 8]),
    straw('franky', [49, 8]), straw('brook', [56, 12]),
  ] },
  buggy: { name: '小丑巴其海賊團', captain: 'buggy', faction: 'pirate', members: [{ npc: 'cabaji', sails: true }, { npc: 'mohji', sails: true }],
    grunts: { name: '巴其海賊團團員', tier: 1, count: 2, home: ['buggyBar', 'orangeStreet', 'orangePort'] } },
  kuro: { name: '黑貓海賊團', captain: 'klahadore', faction: 'pirate', members: [{ npc: 'jango' }],
    grunts: { name: '黑貓海賊團團員', tier: 2, count: 2, home: ['syrupPort', 'syrupSlope'] } },
  morgan: { name: '海軍第153分部', captain: 'morgan', faction: 'marine', members: [{ npc: 'helmeppo', until: [2, 12] }],
    grunts: { name: '基地的海軍士兵', tier: 1, count: 2, home: ['marineBase'] } },
  baratie: { name: '巴拉蒂的廚師們', captain: 'zeff', faction: 'civilian', members: [{ npc: 'patty' }, { npc: 'carne' }] },
  krieg: { name: '首領・克利克海賊團', captain: 'krieg', faction: 'pirate', members: [{ npc: 'gin' }],
    grunts: { name: '克利克海賊團團員', tier: 2, count: 2, home: ['baratiePort'] } },
  arlong: { name: '惡龍海賊團', captain: 'arlong', faction: 'pirate', members: [],
    grunts: { name: '魚人海賊', tier: 3, count: 2, home: ['arlongPark'] } },
  dadan: { name: '達丹一家', captain: 'dadan', faction: 'bandit', members: [],
    grunts: { name: '達丹一家的山賊', tier: 1, count: 2, home: ['hill'] } },
  wapol: { name: '瓦波爾一行', captain: 'wapol', faction: 'tyrant', members: [],
    grunts: { name: '瓦波爾的部下', tier: 2, count: 2, home: ['bighorn', 'drumCastle'] } },
  bellamy: { name: '貝拉米海賊團', captain: 'bellamy', faction: 'pirate', members: [],
    grunts: { name: '貝拉米海賊團團員', tier: 2, count: 2, home: ['mockTown'] } },
  baroque: { name: '巴洛克工作社', captain: 'crocodile', faction: 'tyrant', members: [{ npc: 'galdino' }, { npc: 'bonclay' }] },
  cp9: { name: 'CP9', captain: 'lucci', faction: 'government', members: [{ npc: 'kaku' }, { npc: 'kalifa' }, { npc: 'blueno' }, { npc: 'spandam' }] },
  moria: { name: '摩利亞一行', captain: 'moria', faction: 'tyrant', members: [{ npc: 'perona' }, { npc: 'hogback' }, { npc: 'absalom' }],
    grunts: { name: '殭屍', tier: 2, count: 2, home: ['moriaMansion', 'graveyard', 'thrillerForest'] } },
  enel: { name: '艾涅爾的神官們', captain: 'enel', faction: 'tyrant', members: [{ npc: 'ohm' }] },
  kuja: { name: '九蛇海賊團', captain: 'hancock', faction: 'pirate', members: [{ npc: 'sandersonia' }, { npc: 'marigold' }, { npc: 'marguerite' }],
    grunts: { name: '九蛇的女戰士', tier: 2, count: 2, home: ['kujaArena', 'kujaCastle'] } },
  kid: { name: '基德海賊團', captain: 'kid', faction: 'pirate', members: [{ npc: 'killer' }] },
  whitebeard: { name: '白鬍子海賊團', captain: 'whitebeard', faction: 'pirate',
    members: [{ npc: 'marco' }, { npc: 'jozu' }, { npc: 'vista' }, { npc: 'ace' }] },
}

/** The crew an NPC captains or belongs to, if any. */
export function crewOf(npc: NpcId): Crew | undefined {
  return Object.values(crews).find(crew => crew.captain === npc || crew.members.some(member => member.npc === npc))
}

const active = (world: Pick<World, 'minute'>, member: CrewMember) =>
  (!member.from || world.minute >= minuteOf(member.from)) && (!member.until || world.minute < minuteOf(member.until))

/**
 * Everyone who fights beside `target` at `place`: crewmates on the spot (or sailing with a captain who is on the spot),
 * plus the crew's unnamed hands on its home ground. Players' companions and knocked-out NPCs are left out.
 */
export function crewmates(world: World, target: NpcId, place: LocationId): { crew?: Crew, npcs: NpcId[], grunts: Foe[] } {
  const crew = crewOf(target)
  if (!crew) return { npcs: [], grunts: [] }
  const available = (npc: NpcId) => npc !== target && !world.companions?.[npc] && (world.npcDown?.[npc] ?? 0) <= world.minute
  const captainHere = npcPlace(world, crew.captain) === place
  const npcs: NpcId[] = []
  if (available(crew.captain) && captainHere) npcs.push(crew.captain)
  for (const member of crew.members) {
    if (!available(member.npc) || !active(world, member)) continue
    const where = npcPlace(world, member.npc)
    if (where === place || (member.sails && where === null && captainHere)) npcs.push(member.npc)
  }
  const grunts = crew.grunts && crew.grunts.home.includes(place) && (captainHere || crew.captain === target)
    ? Array.from({ length: crew.grunts.count }, (_, i) =>
      gruntFoe('crew:' + crew.captain + ':' + i, crew.grunts!.name + '甲乙丙丁'[i], crew.grunts!.tier, crew.faction))
    : []
  return { crew, npcs, grunts }
}

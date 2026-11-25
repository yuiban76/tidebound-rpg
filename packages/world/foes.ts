// Combat profiles for every NPC and for random sea encounters.
// Strength follows the canon tiers (spec §7.7: luck alone cannot bridge a large power gap).
import { scale } from './scale.ts'
import type { NpcId } from '../shared/protocol.ts'
import { npcs } from '../shared/protocol.ts'
import { castProfiles } from './cast.ts'
import { traders } from './traders.ts'

/** What lets a blow land on a logia body before haki exists: wet sand, sea stone, or a Sky Island dial. */
export type Weakness = 'water' | 'seastone' | 'dial'
export type Faction = 'civilian' | 'pirate' | 'marine' | 'government' | 'bandit' | 'beast' | 'tyrant'

/** One combatant on the NPC side of a fight. Named NPCs carry their id so defeat can change the world. */
export type Foe = {
  id: string, name: string, npc?: NpcId, tier: number, faction: Faction
  hp: number, maxHp: number, def: number, armor: number
  /** Added to the D20 attack roll. */
  attack: number, die: number, bonus: number
  /** Logia bodies let ordinary blows pass through (no haki in the game yet). */
  logia?: boolean
  /** What can hurt this logia body (default: sea stone only). Empty: nothing the party owns can touch them yet. */
  weak?: Weakness[]
  /** Rounds left in which the body is solid (after water or a dial); counted down at the end of each round. */
  exposed?: number
  /** Rounds the foe cannot see to strike (a 火藥星 in the face). */
  blind?: number
  bounty?: number, loot: number, items?: Record<string, number>
  down?: boolean, surrendered?: boolean
}

export const tierNames = ['平民', '雜兵', '戰士', '軍官', '精英', '七武海／大將級', '傳說級'] as const

// [maxHp, DEF, attack bonus, damage die, damage bonus, armor]
const tierStats: [number, number, number, number, number, number][] = [
  [12, 11, 1, 4, 0, 0],
  [20, 13, 3, 6, 1, 0],
  [35, 15, 5, 6, 3, 1],
  [60, 17, 7, 8, 4, 2],
  [100, 19, 9, 8, 6, 3],
  [180, 22, 12, 10, 9, 5],
  [300, 25, 15, 12, 12, 7],
]
/** XP for each participant when a foe of this tier is defeated. */
export const tierXp = [5, 15, 30, 60, 120, 250, 500]

type Profile = { tier: number, faction: Faction, bounty?: number, logia?: boolean, weak?: Weakness[], hp?: number, def?: number, attack?: number, die?: number }

// Every NPC can be fought. Civilians fight back weakly and attacking them costs reputation.
export const npcProfiles: Record<NpcId, Profile> = {
  keeper: { tier: 0, faction: 'civilian' }, mayor: { tier: 0, faction: 'civilian' },
  rika: { tier: 0, faction: 'civilian' }, zoro: { tier: 4, faction: 'bandit' },
  boodle: { tier: 0, faction: 'civilian' }, chouchou: { tier: 0, faction: 'beast' },
  usopp: { tier: 1, faction: 'civilian' }, kaya: { tier: 0, faction: 'civilian' }, klahadore: { tier: 4, faction: 'pirate', bounty: 16_000_000 },
  zeff: { tier: 4, faction: 'civilian' }, sanji: { tier: 4, faction: 'civilian' },
  genzo: { tier: 1, faction: 'civilian' }, nojiko: { tier: 0, faction: 'civilian' }, arlong: { tier: 4, faction: 'pirate', bounty: 20_000_000 },
  smoker: { tier: 5, faction: 'marine', logia: true }, ipponmatsu: { tier: 0, faction: 'civilian' },
  crocus: { tier: 1, faction: 'civilian' }, laboon: { tier: 5, faction: 'beast' },
  vivi: { tier: 1, faction: 'civilian' }, igaram: { tier: 2, faction: 'civilian' },
  dorry: { tier: 5, faction: 'civilian' }, brogy: { tier: 5, faction: 'civilian' },
  dalton: { tier: 3, faction: 'civilian' }, kureha: { tier: 2, faction: 'civilian' }, chopper: { tier: 3, faction: 'civilian' },
  pell: { tier: 3, faction: 'civilian' }, cobra: { tier: 1, faction: 'civilian' }, crocodile: { tier: 5, faction: 'tyrant', logia: true, weak: ['water', 'seastone'] },
  bellamy: { tier: 3, faction: 'pirate', bounty: 55_000_000 }, cricket: { tier: 2, faction: 'civilian' },
  ganfall: { tier: 3, faction: 'civilian' }, enel: { tier: 5, faction: 'tyrant', logia: true, weak: ['dial', 'seastone'] },
  iceburg: { tier: 1, faction: 'civilian' }, franky: { tier: 4, faction: 'civilian' },
  spandam: { tier: 1, faction: 'government' }, lucci: { tier: 5, faction: 'government' }, robin: { tier: 4, faction: 'civilian' },
  brook: { tier: 4, faction: 'civilian' }, moria: { tier: 5, faction: 'tyrant' },
  rayleigh: { tier: 6, faction: 'civilian' }, shakky: { tier: 3, faction: 'civilian' },
  hancock: { tier: 5, faction: 'pirate' }, nyon: { tier: 1, faction: 'civilian' },
  magellan: { tier: 5, faction: 'government' }, ivankov: { tier: 5, faction: 'civilian' }, ace: { tier: 5, faction: 'pirate', logia: true, weak: [], bounty: 550_000_000 },
  sengoku: { tier: 6, faction: 'marine' }, whitebeard: { tier: 6, faction: 'pirate', bounty: 5_046_000_000 },
  luffy: { tier: 4, faction: 'pirate' },
  ...castProfiles,
  // The guild's merchants carry a blade for robbers, nothing more.
  ...Object.fromEntries(Object.keys(traders).map(id => [id, { tier: 1, faction: 'civilian' }])) as Record<keyof typeof traders, Profile>,
}

function foeFrom(id: string, name: string, profile: Profile, npc?: NpcId): Foe {
  const [hp, def, attack, die, bonus, armor] = tierStats[profile.tier]
  const maxHp = (profile.hp ?? hp) * scale
  return {
    id, name, npc, tier: profile.tier, faction: profile.faction,
    hp: maxHp, maxHp, def: profile.def ?? def, armor, attack: profile.attack ?? attack, die: profile.die ?? die, bonus,
    ...(profile.logia && { logia: true, weak: profile.weak ?? ['seastone'] }), ...(profile.bounty && { bounty: profile.bounty }),
    loot: profile.faction === 'civilian' || profile.faction === 'beast' ? profile.tier * 1_000 : (profile.tier + 1) ** 2 * 5_000,
  }
}

/** An unnamed crewman (bandit, fishman, zombie…) who fights alongside a named captain. */
export const gruntFoe = (id: string, name: string, tier: number, faction: Faction) => foeFrom(id, name, { tier, faction })

/** Luffy grows along his own voyage: after Alabasta he fights like a Warlord. */
export function npcFoe(npc: NpcId, minute: number): Foe {
  const profile = npcProfiles[npc]
  const grown = npc === 'luffy' && minute >= (25 - 1) * 1440 ? { ...profile, tier: 5 } : profile
  const bounty = npc === 'luffy' ? (minute >= (48 - 1) * 1440 ? 300_000_000 : minute >= (25 - 1) * 1440 ? 100_000_000 : minute >= (8 - 1) * 1440 ? 30_000_000 : undefined) : grown.bounty
  return foeFrom('npc:' + npc, npcs[npc], { ...grown, bounty }, npc)
}

type SeaEncounter = { text: string, foes: [string, Profile][] }
const eastBlue: SeaEncounter[] = [
  { text: '一艘掛著骷髏旗的小海賊船靠了過來，船員揮著刀要搶劫。', foes: [['海賊船員甲', { tier: 1, faction: 'pirate' }], ['海賊船員乙', { tier: 1, faction: 'pirate' }]] },
  { text: '海軍巡邏船攔下你們，要求登船檢查，態度不善。', foes: [['海軍士兵甲', { tier: 1, faction: 'marine' }], ['海軍士兵乙', { tier: 1, faction: 'marine' }]] },
  { text: '一頭幼小的海王類從浪裡竄出，盯上了你們的船。', foes: [['幼年海王類', { tier: 2, faction: 'beast' }]] },
]
const grandLine: SeaEncounter[] = [
  { text: '一艘偉大航路的海賊船追了上來，船長在船頭獰笑。', foes: [['海賊船長', { tier: 3, faction: 'pirate', bounty: 8_000_000 }], ['海賊船員', { tier: 2, faction: 'pirate' }]] },
  { text: '海軍軍艦發現了你們，砲口轉了過來。', foes: [['海軍上尉', { tier: 3, faction: 'marine' }], ['海軍士兵', { tier: 2, faction: 'marine' }]] },
  { text: '巨大的海王類掀起浪頭，張開了嘴。', foes: [['海王類', { tier: 3, faction: 'beast' }]] },
]
const calmBelt: SeaEncounter = { text: '無風帶的海底震動，一頭比船還大的海王類浮了上來。', foes: [['巨型海王類', { tier: 4, faction: 'beast' }]] }

/**
 * Rolls for a random encounter on a voyage. Calm Belt crossings are the most dangerous,
 * the Grand Line is rougher than East Blue. Returns undefined for a quiet voyage.
 */
export function rollSeaEncounter(roll: (sides: number) => number, lane: { logPose?: boolean, hazard?: { name: string } }, lookout = 0) {
  const chance = roll(20)
  const calm = lane.hazard?.name.includes('無風帶')
  // A good lookout spots trouble early enough to steer around it.
  if (chance < Math.min(20, (calm ? 11 : lane.logPose ? 16 : 18) + lookout)) return undefined
  const pool = calm ? [calmBelt] : lane.logPose ? grandLine : eastBlue
  const pick = pool[roll(pool.length) - 1]
  return { text: pick.text, foes: pick.foes.map(([name, profile], index) => foeFrom('sea:' + index, name, profile)) }
}

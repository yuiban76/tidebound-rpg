// How levels turn into fighting power, the level caps of each sea, and foes built to match a level (training fights
// and the crews that guard each island). No imports, so every module can use it without tying the modules in a loop.

/** The seas in the order the voyage reaches them. */
export const seas = ['east', 'paradise', 'newWorld'] as const
export type Sea = (typeof seas)[number]
export const seaNames: Record<Sea, string> = { east: '東海', paradise: '偉大航路前半段', newWorld: '新世界' }
/** How high a character can grow while the party has only reached this sea. XP earned at the cap is kept for later. */
export const levelCaps: Record<Sea, number> = { east: 20, paradise: 50, newWorld: 100 }
/** Money is worth less the further the voyage goes (canon prices grow), so rewards grow with the sea. */
export const seaPay: Record<Sea, number> = { east: 1, paradise: 3, newWorld: 8 }
/** XP a foe of this level pays each winner, by how much of a fight it is. */
export const roleXp: Record<Role, number> = { civilian: 2, grunt: 8, officer: 20, captain: 60, boss: 120 }
/** The sea a level belongs to, for foes met where no island says it (the story's people travel). */
export const seaForLevel = (level: number): Sea => level > levelCaps.paradise ? 'newWorld' : level > levelCaps.east ? 'paradise' : 'east'

// Levels make fighters better, not only tougher: +3 to hit per 4 levels, +1 damage per 2, +1 defense per 3 (all 0 at
// level 1). Past level 30 (where the story's old pace ended) the gains slow down, so level 100 is strong, not untouchable.
// Balanced with the Monte Carlo tables in the README: a 2-player party needs about level 5 for a tier-4 foe and level 12 for tier 5.
const early = 30
export const levelHit = (level: number) => Math.floor(Math.min(level, early) * .75) + Math.floor(Math.max(0, level - early) * .3)
export const levelDamage = (level: number) => Math.floor(Math.min(level, early) / 2) + Math.floor(Math.max(0, level - early) / 4)
export const levelDefense = (level: number) => Math.floor((Math.min(level, early) - 1) / 3) + Math.floor(Math.max(0, level - early) / 6)

/**
 * What a typical character of this level brings: attribute 4, the weapon skill at its cap, a forged weapon (the East Blue
 * forges sell tier 1 from level 2, tier 3 from level 8; most have it by the Grand Line), some 閃避, and an advanced move
 * most rounds (+2 to hit, +5 damage: STA grows fast enough to afford it).
 */
const gear = (level: number) => level < 6 ? 0 : level < 12 ? 1 : level < 20 ? 2 : 3
const skill = (level: number) => Math.min(8, Math.floor(level / 2) + 2)
const typicalHit = (level: number) => 4 + skill(level) + levelHit(level) + gear(level) + 1 + 2
const typicalDefense = (level: number) => 15 + Math.min(skill(level), Math.floor(level / 4)) + levelDefense(level) + Math.floor(gear(level) / 2)
/** Damage of one blow (a d6 weapon, STR 4, the attack method's bonus, an advanced move), before the ×10 number scale. */
const typicalDamage = (level: number) => 3.5 + 4 + 1 + 5 + levelDamage(level) + gear(level)
/** HP before the number scale (CON 3, 4 a level). */
const typicalHp = (level: number) => 31 + 4 * level

export type Role = 'civilian' | 'grunt' | 'officer' | 'captain' | 'boss'
const roles: Record<Role, { blows: number, share: number, die: number, lift: number }> = {
  // How many plain blows it takes to bring one down, and how much of a fighter's HP one of its hits takes.
  // Townsfolk who are not fighters: one good blow puts them down.
  civilian: { blows: .9, share: .03, die: 4, lift: -6 },
  grunt: { blows: 1.3, share: .07, die: 4, lift: 0 },
  officer: { blows: 1.6, share: .06, die: 6, lift: 1 },
  captain: { blows: 3.4, share: .09, die: 8, lift: 2 },
  // The story's strongest (Warlords, admirals, Emperors' commanders and up): a fight on their own.
  boss: { blows: 7, share: .12, die: 10, lift: 3 },
}
/**
 * Numbers for a foe of this level. A fair character of the level hits it on about 9+ and is hit back on about 10+;
 * a guard crew (captain, officer, grunt) against one such character lasts about seven rounds and costs most of their HP.
 */
export function levelStats(level: number, role: Role, sea: Sea) {
  const r = roles[role]
  return {
    tier: Math.max(0, Math.min(6, seas.indexOf(sea) + 1 + r.lift)),
    hp: Math.max(4, Math.ceil(typicalDamage(level) * r.blows)),
    def: typicalHit(level) + 8 + r.lift,
    attack: typicalDefense(level) - 11 + r.lift,
    die: r.die,
    bonus: Math.max(0, Math.round(typicalHp(level) * r.share - (r.die + 1) / 2)),
    armor: Math.floor(level / 15) + (role === 'captain' ? 1 : role === 'boss' ? 2 : 0),
  }
}

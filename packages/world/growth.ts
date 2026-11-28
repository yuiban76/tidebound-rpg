// How levels turn into fighting power, the level caps of each sea, and foes built to match a level (training fights
// and the crews that guard each island). No imports, so every module can use it without tying the modules in a loop.

/** The seas in the order the voyage reaches them. */
export const seas = ['east', 'paradise', 'newWorld'] as const
export type Sea = (typeof seas)[number]
export const seaNames: Record<Sea, string> = { east: '東海', paradise: '偉大航路前半段', newWorld: '新世界' }
/** How high a character can grow while the party has only reached this sea. XP earned at the cap is kept for later. */
export const levelCaps: Record<Sea, number> = { east: 20, paradise: 50, newWorld: 100 }

// Levels make fighters better, not only tougher: +3 to hit per 4 levels, +1 damage per 2, +1 defense per 3 (all 0 at
// level 1). Past level 30 (where the story's old pace ended) the gains slow down, so level 100 is strong, not untouchable.
// Balanced with the Monte Carlo tables in the README: a 2-player party needs about level 5 for a tier-4 foe and level 12 for tier 5.
const early = 30
export const levelHit = (level: number) => Math.floor(Math.min(level, early) * .75) + Math.floor(Math.max(0, level - early) * .3)
export const levelDamage = (level: number) => Math.floor(Math.min(level, early) / 2) + Math.floor(Math.max(0, level - early) / 4)
export const levelDefense = (level: number) => Math.floor((Math.min(level, early) - 1) / 3) + Math.floor(Math.max(0, level - early) / 6)

/** What a typical character of this level brings to a blow, to their guard and to a fight (attribute, skill, level, gear). */
const gear = (level: number) => Math.min(3, Math.floor(level / 15))
const typicalHit = (level: number) => 4 + Math.min(8, Math.floor(level / 2) + 2) + levelHit(level) + gear(level)
const typicalDefense = (level: number) => 14 + levelDefense(level) + Math.floor(gear(level) / 2)
/** Damage of one plain blow (a d6 weapon, STR 3, the attack method's bonus), before the ×10 number scale. */
const typicalDamage = (level: number) => 7.5 + levelDamage(level) + gear(level)
/** HP before the number scale (CON 3, 4 a level). */
const typicalHp = (level: number) => 31 + 4 * level

export type Role = 'grunt' | 'officer' | 'captain'
const roles: Record<Role, { blows: number, share: number, die: number, lift: number }> = {
  // How many plain blows it takes to bring one down, and how much of a fighter's HP one of its hits takes.
  grunt: { blows: 1.3, share: .07, die: 4, lift: 0 },
  officer: { blows: 1.6, share: .06, die: 6, lift: 1 },
  captain: { blows: 4, share: .1, die: 8, lift: 2 },
}
/**
 * Numbers for a foe of this level. A fair character of the level hits it on about 9+ and is hit back on about 10+;
 * a guard crew (captain, officer, grunt) against one such character lasts about seven rounds and costs most of their HP.
 */
export function levelStats(level: number, role: Role, sea: Sea) {
  const r = roles[role]
  return {
    tier: Math.min(6, seas.indexOf(sea) + 1 + r.lift),
    hp: Math.max(4, Math.ceil(typicalDamage(level) * r.blows)),
    def: typicalHit(level) + 8 + r.lift,
    attack: typicalDefense(level) - 10 + r.lift,
    die: r.die,
    bonus: Math.max(0, Math.round(typicalHp(level) * r.share - (r.die + 1) / 2)),
    armor: Math.floor(level / 15) + (role === 'captain' ? 1 : 0),
  }
}

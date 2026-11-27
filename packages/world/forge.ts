import type { Weapon } from '../shared/protocol.ts'
import type { LocationId } from '../shared/protocol.ts'
import type { Character } from './village.ts'

/** Shops with an anvil: they can reforge the weapon a character holds. */
export const forges: Partial<Record<LocationId, string>> = { square: '風車村鐵匠鋪', goa: '城下町武器鋪', logueShop: '一本松武器店' }
export const maxTier = 3
/** Money, and the character level needed, for each step (index = the tier being made). */
export const tierCost = [0, 100_000, 500_000, 2_000_000] as const
export const tierLevel = [0, 2, 5, 8] as const
/** Each tier adds +1 to hit and +1 damage (before the number scale), on top of level and weapon dice. */
export const tierHit = (tier: number) => tier
export const tierDamage = (tier: number) => tier
const prefixes = ['', '精鋼', '百鍊', '名匠'] as const
const fists = ['徒手', '鐵護手', '精鋼拳套', '名匠拳套'] as const
const legs = ['腿技', '鐵靴', '精鋼戰靴', '名匠戰靴'] as const

export const tierOf = (c: Pick<Character, 'weapon' | 'gear'>) => c.gear?.[c.weapon] ?? 0
/** The weapon as the player sees it, with its forge tier. */
export function weaponLabel(c: Pick<Character, 'weapon' | 'gear'>, base: string) {
  const tier = tierOf(c)
  if (c.weapon === 'fist') return fists[tier]
  if (c.weapon === 'kick') return legs[tier]
  return tier ? prefixes[tier] + base.replace(/^普通/, '') : base
}

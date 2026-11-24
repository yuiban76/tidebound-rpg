/**
 * Display scale for HP, damage and healing. The rules are balanced on small numbers; every one of these
 * is multiplied by `scale` where it is created or dealt, so ratios (and balance) are unchanged while
 * the numbers on screen look bigger. D20 rolls, DEF, hit bonuses, STA and money are not scaled.
 */
/** Money is in canon beli: 50 times the numbers the game first used (old saves are converted once). */
export const beliScale = 50
/** Money as the player reads it: 50,000 貝里. */
export const beli = (amount: number) => amount.toLocaleString('en-US') + ' 貝里'
export const scale = 10

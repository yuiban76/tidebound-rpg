/**
 * Display scale for HP, damage and healing. The rules are balanced on small numbers; every one of these
 * is multiplied by `scale` where it is created or dealt, so ratios (and balance) are unchanged while
 * the numbers on screen look bigger. D20 rolls, DEF, hit bonuses, STA and money are not scaled.
 */
export const scale = 10

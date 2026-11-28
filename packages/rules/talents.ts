// Learning and giving back talent forest nodes (data and layout in world/talents.ts). These are direct rule actions:
// no narration, and never during a fight the character is in.
import { beli } from '../world/scale.ts'
import { islandAt, islands } from '../world/sea.ts'
import { learnBlock, ownedTalents, refundBlock, resetPricePerLevel, talentNodes, talentPointsLeft } from '../world/talents.ts'
import type { Character } from '../world/village.ts'
import { maxHP, maxSTA } from './engine.ts'
import type { Result } from './engine.ts'

const reject = (text: string): Result => ({ text, rejected: true })

/** Keeps HP and STA in step with maxima a talent changed: a bigger pool fills by the difference, a smaller one caps. */
function keepPools(c: Character, change: () => void) {
  const [hp, sta] = [maxHP(c), maxSTA(c)]
  change()
  if (c.hp > 0) c.hp = Math.max(1, Math.min(maxHP(c), c.hp + Math.max(0, maxHP(c) - hp)))
  c.sta = Math.max(0, Math.min(maxSTA(c), c.sta + Math.max(0, maxSTA(c) - sta)))
}

/** Learns the nodes in order (a path picked on the chart). All of them or none: one blocked node stops the lot. */
export function learnTalents(c: Character, ids: string[]): Result {
  if (!ids.length) return reject('沒有選擇要學的天賦。')
  const owned = ownedTalents(c)
  let left = talentPointsLeft(c)
  for (const id of ids) {
    const block = learnBlock(c, id, owned, left)
    if (block) return reject(block)
    owned.add(id)
    left--
  }
  keepPools(c, () => { c.talents = [...c.talents, ...ids] })
  const names = ids.map(id => talentNodes.get(id)!).filter(node => node.kind !== 'minor').map(node => '「' + node.name + '」')
  return { text: c.name + '學會了' + (names.length ? names.join('') : '') + (ids.length > names.length ? (names.length ? '和 ' : '') + (ids.length - names.length) + ' 個小天賦' : '') +
    '，花了 ' + ids.length + ' 點，還剩 ' + left + ' 點。' }
}

/** Gives one node back for its point, as long as nothing learned hangs on it. */
export function refundTalent(c: Character, id: string): Result {
  const block = refundBlock(c, id)
  if (block) return reject(block)
  keepPools(c, () => { c.talents = c.talents.filter(other => other !== id) })
  return { text: c.name + '退回了「' + talentNodes.get(id)!.name + '」，現在有 ' + talentPointsLeft(c) + ' 點天賦點。' }
}

/** Where the whole forest can be wiped at once: any island's port, for a fee by level. */
export const resetPrice = (c: Pick<Character, 'level'>) => resetPricePerLevel * c.level
export function resetTalents(c: Character): Result {
  if (!c.talents.length) return reject('你還沒有學任何要付點數的天賦。')
  if (islands[islandAt(c.place)].port !== c.place) return reject('全部重置要到港口（' + islands[islandAt(c.place)].name + '的港口）找人指點。一個一個退回則隨時都可以。')
  const price = resetPrice(c)
  if (c.money < price) return reject('全部重置要 ' + beli(price) + '，你只有 ' + beli(c.money) + '。')
  c.money -= price
  const count = c.talents.length
  keepPools(c, () => { c.talents = [] })
  return { text: c.name + '花了 ' + beli(price) + '重新思考自己的路，退回全部 ' + count + ' 點天賦點。' }
}

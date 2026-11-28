import { fxOf } from '../world/talents.ts'
import { scale } from '../world/scale.ts'
import { npcs } from '../shared/protocol.ts'
import { fruitMoves, fruitOf, fruitPrice, fruits, kindNames, moveLevels, moveStyles, releaseFruit } from '../world/fruits.ts'
import type { FruitId } from '../world/fruits.ts'
import type { Foe } from '../world/foes.ts'
import type { Character, Member, World } from '../world/village.ts'
import type { Result } from './engine.ts'

const reject = (text: string): Result => ({ text })
const eatenWarning = '吃下去就再也不能游泳，在海上戰鬥更容易出事；而且一個人只能吃一顆，再吃第二顆會要了命。'

/** The power of a fruit goes to whoever eats it: its move joins the character's techniques and zoans grow tougher. */
export function eatFruit(c: Character, id: FruitId) {
  const fruit = fruits[id]
  c.fruit = id
  if (fruit.kind === 'zoan') c.hp += 10 * scale
  learnFruitArts(c)
}

/**
 * Teaches every fruit move whose level has been reached (moveLevels: 1, 5, 10 … 70) and returns the names just learned.
 * It also keeps the list in step with the fruit table: a move the table no longer has (renamed, or now learned later)
 * is taken off, so an old save follows the current rules.
 */
export function learnFruitArts(c: Character): string[] {
  const reached = (i: number) => c.level + fxOf(c, 'fruitEarly') >= moveLevels[i]
  const table: readonly string[] = c.fruit ? fruitMoves[c.fruit] : []
  c.techniques = c.techniques.filter(move => !move.fruit || (table.includes(move.name) && reached(table.indexOf(move.name))))
  if (!c.fruit) return []
  const learned: string[] = []
  fruitMoves[c.fruit].forEach((name, i) => {
    if (!reached(i) || c.techniques.some(move => move.name === name)) return
    c.techniques.push({ name, style: moveStyles[i], fruit: true })
    learned.push(name)
  })
  return learned
}

/** Brings every character's fruit moves in step with the fruit table (an old save, or a table that changed). */
export function syncFruitArts(world: World) {
  for (const member of world.members) if (member.character) learnFruitArts(member.character)
  return world
}

/** "Learned X, Y. Later: level 5 Z…" for a fruit just eaten; `before` is how many techniques the eater had. */
function learnedText(c: Character, id: FruitId, before: number) {
  const known = c.techniques.length - before
  const moves = fruitMoves[id]
  // The next few by name, then how far the road goes.
  const next = moves.slice(known, known + 3).map((name, i) => '等級 ' + moveLevels[known + i] + '「' + name + '」').join('、')
  const later = next && (known + 3 < moves.length ? next + '……一共十招，最後一招「' + moves.at(-1) + '」在等級 ' + moveLevels.at(-1) : next)
  return '學會招式「' + moves.slice(0, known).join('」「') + '」。' + (later ? '之後隨等級學會：' + later + '。' : '十招全部到手。')
}

/** Called when a fight ends: the last-blow winner is offered the fruit of every knocked-out NPC that carried one. */
export function offerFruit(world: World, foe: Foe, by: Member | undefined, lines: string[]) {
  const npc = foe.npc
  const id = npc && fruitOf[npc]
  if (!npc || !id || !by?.character || !foe.down || world.fruitLost?.[npc]) return
  if (world.fruitOffers?.some(offer => offer.npc === npc)) return
  ;(world.fruitOffers ??= []).push({ fruit: id, npc, to: by.id, since: world.minute })
  const fruit = fruits[id]
  lines.push('【惡魔果實】' + npcs[npc] + '倒下的瞬間，' + fruit.name + '的力量離開了他的身體，凝成一顆怪異的果實滾到' + by.character.name + '腳邊。（' + kindNames[fruit.kind] + '：' + fruit.text + '）')
  lines.push(by.character.fruit
    ? by.character.name + '已經吃過惡魔果實，不能再吃。輸入「放走果實」讓它流向外面的世界。'
    : '輸入「吸收果實」吃下它，獲得招式「' + fruit.move + '」（' + eatenWarning + '）；或輸入「放走果實」，讓它流向外面的世界，被別人撿走。')
}

/** Eat or let go of a pending fruit. Only the player who landed the last blow can decide. */
export function chooseFruit(world: World, actor: Member, take: boolean, name?: string): Result {
  const c = actor.character!
  const offers = (world.fruitOffers ?? []).filter(offer => offer.to === actor.id)
  const offer = (name && offers.find(o => fruits[o.fruit].name.includes(name) || name.includes(fruits[o.fruit].name))) || offers[0]
  if (!offer) return reject('你手上沒有等著決定的惡魔果實。')
  const fruit = fruits[offer.fruit]
  if (take && c.fruit) return reject('你已經吃過' + fruits[c.fruit].name + '，再吃一顆會要了你的命。只能輸入「放走果實」。')
  world.fruitOffers = world.fruitOffers!.filter(o => o !== offer)
  if (!take) {
    releaseFruit(world, offer.fruit, offer.npc)
    return { text: c.name + '鬆開了手，' + fruit.name + '滾進人群裡，不知被誰撿走了。聽說過幾天會在夏波帝的人口拍賣所露面。' + npcs[offer.npc] + '失去了這份力量。', announce: true, minutes: 1 }
  }
  ;(world.fruitLost ??= {})[offer.npc] = true
  const before = c.techniques.length
  eatFruit(c, offer.fruit)
  const learned = learnedText(c, offer.fruit, before)
  return {
    text: c.name + '把' + fruit.name + '吞了下去，味道糟透了……但身體裡有什麼東西醒了過來。' + learned +
      (fruit.kind === 'logia' ? '你的身體變成自然系：普通攻擊多半傷不到你（傷害減半），也能打到其他自然系。' : '') +
      (fruit.kind === 'zoan' ? '你的體格變得更結實，HP 上限提高。' : '') + '代價是你再也不能游泳了。' + npcs[offer.npc] + '失去了這份力量。',
    announce: true, minutes: 1,
  }
}

/**
 * Hands the decision over a dropped fruit to a party member on the same spot, outside a fight. They may eat it, let it
 * go, or pass it on again; the two days before it rolls away start over.
 */
export function passFruit(world: World, actor: Member, to: string, name?: string): Result & { rejected?: boolean } {
  const c = actor.character!
  const offers = (world.fruitOffers ?? []).filter(offer => offer.to === actor.id)
  const offer = (name && offers.find(o => fruits[o.fruit].name.includes(name) || name.includes(fruits[o.fruit].name.replace('果實', '')))) || offers[0]
  if (!offer) return { text: '你手上沒有等著決定的惡魔果實。只有打倒能力者時最後出手的人會拿到。', rejected: true }
  const target = world.members.find(m => !m.pendingJoin && m.id !== actor.id && m.character?.name === to.trim())
  if (!target) return { text: '找不到名叫「' + to + '」的隊友。', rejected: true }
  const t = target.character!
  if (t.place !== c.place) return { text: t.name + '不在這裡，要在同一個地點才能把果實交給他。', rejected: true }
  if (world.combat?.participants.includes(actor.id) || world.combat?.participants.includes(target.id)) return { text: '戰鬥中沒空交接果實。', rejected: true }
  const fruit = fruits[offer.fruit]
  offer.to = target.id
  offer.since = world.minute
  return {
    text: c.name + '把' + fruit.name + '交給了' + t.name + '。' + (t.fruit
      ? t.name + '已經吃過' + fruits[t.fruit].name + '，只能放走它，或再交給別的隊友。'
      : t.name + '可以輸入「吸收果實」吃下它（' + eatenWarning + '），或「放走果實」。'),
    announce: true, minutes: 1,
  }
}

/** The Sabaody auction house sells released fruits once their three days of drifting are over. */
export function buyFruit(world: World, actor: Member, name?: string): Result {
  const c = actor.character!
  if (c.place !== 'auctionHouse') return reject('惡魔果實只在夏波帝的人口拍賣所出售。')
  const ready = (world.fruitStalls ?? []).filter(stall => stall.ready <= world.minute)
  if (!ready.length) return reject('拍賣所今天沒有惡魔果實。放走的果實要漂流三天才會出現。')
  const stall = (name && ready.find(s => fruits[s.fruit].name.includes(name) || name.includes(fruits[s.fruit].name))) || ready[0]
  const fruit = fruits[stall.fruit]
  if (c.fruit) return reject('你已經吃過惡魔果實，不能再買一顆來吃。')
  const price = fruitPrice[fruit.rank]
  if (c.money < price) return reject(fruit.name + '的標價是 ' + price.toLocaleString('en-US') + ' 貝里，你的錢不夠。')
  c.money -= price
  world.fruitStalls = world.fruitStalls!.filter(s => s !== stall)
  const before = c.techniques.length
  eatFruit(c, stall.fruit)
  return { text: c.name + '以 ' + price.toLocaleString('en-US') + ' 貝里標下' + fruit.name + '，當場吞了下去。' + learnedText(c, stall.fruit, before) + eatenWarning, announce: true, minutes: 20 }
}

/** An unanswered fruit rolls away after two days, so a forgotten choice never blocks the story. */
export function expireOffers(world: World) {
  for (const offer of [...(world.fruitOffers ?? [])]) {
    if (world.minute - offer.since < 2880) continue
    world.fruitOffers = world.fruitOffers!.filter(o => o !== offer)
    releaseFruit(world, offer.fruit, offer.npc)
  }
}


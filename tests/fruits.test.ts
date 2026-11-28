import assert from 'node:assert/strict'
import { test } from 'node:test'
import { grantXp, makeCharacter, maxHP, resolve, xpToNext } from '../packages/rules/engine.ts'
import { expireOffers, learnFruitArts } from '../packages/rules/fruits.ts'
import { familiarIntent } from '../packages/world/explore.ts'
import { fruitMoves, fruitOf, fruits, moveLevels, moveStyles } from '../packages/world/fruits.ts'
import { scale } from '../packages/world/scale.ts'
import { newWorld } from '../packages/world/village.ts'
import type { Member, World } from '../packages/world/village.ts'
import { npcs } from '../packages/shared/protocol.ts'
import type { LocationId } from '../packages/shared/protocol.ts'
import { character } from './fixtures.ts'

const dice = (...script: number[]) => (sides: number) => Math.min(sides, script.length ? script.shift()! : sides)
const online = new Set(['host'])

function solo(place: LocationId) {
  const world = newWorld('FRUIT00001', 'host')
  world.started = true
  const member = world.members[0] as Member
  member.character = makeCharacter(character('旅人'))
  member.character.place = place
  return { world, member, c: member.character }
}
const act = (world: World, member: Member, intent: Parameters<typeof resolve>[2], roll = dice()) =>
  resolve(world, member, intent, '', roll, online)

test('每顆果實都有主人，主人是遊戲裡的 NPC，而且魯夫的橡膠果實不在其中', () => {
  for (const [id, fruit] of Object.entries(fruits)) {
    assert.ok(npcs[fruit.owner], id)
    assert.equal(fruitOf[fruit.owner], id, id + ' 的主人對不上')
  }
  assert.equal(fruitOf.luffy, undefined)
  assert.equal(Object.keys(fruits).length, Object.keys(fruitOf).length, '一個 NPC 只能有一顆果實')
})

test('打倒有果實的 NPC：最後一擊的玩家可以選吸收，吸收後對方失去能力', () => {
  const { world, member, c } = solo('logueSquare')
  c.inventory['海樓石十手'] = 1
  // Smoker fights at his story strength (level 32): only a strong fighter lands a blow.
  c.level = 45
  c.hp = 99999
  let text = ''
  for (let i = 0; i < 60 && world.combat !== undefined || i === 0; i++) text += act(world, member, { kind: 'attack', target: '斯摩格' }, dice(20, 6, 6, 6, 1, 1, 1)).text
  assert.match(text, /【惡魔果實】斯摩格倒下的瞬間，煙煙果實/)
  assert.equal(world.fruitOffers?.length, 1)
  assert.match(act(world, member, { kind: 'buyFruit' }).text, /只在夏波帝的人口拍賣所/)
  const eaten = act(world, member, { kind: 'fruit', take: true })
  assert.match(eaten.text, /吞了下去[\s\S]*白色煙霧[\s\S]*再也不能游泳/)
  assert.equal(c.fruit, 'moku')
  assert.ok(c.techniques.some(move => move.name === '白色煙霧' && move.fruit))
  assert.equal(world.fruitOffers?.length, 0)
  assert.equal(world.fruitLost?.smoker, true)
  assert.equal(world.fruitStalls, undefined)
  // Smoker is an ordinary fighter now, so a plain blow lands.
  world.npcDown = {}
  const again = act(world, member, { kind: 'attack', target: '斯摩格' }, dice(20, 2, 2, 1, 1))
  assert.doesNotMatch(again.text, /穿過了/)
})

test('不吸收就流到外面：三天後出現在夏波帝拍賣所，花錢才買得到，而且只能吃一顆', () => {
  const { world, member, c } = solo('logueSquare')
  world.fruitOffers = [{ fruit: 'moku', npc: 'smoker', to: member.id, since: world.minute }]
  const released = act(world, member, { kind: 'fruit', take: false })
  assert.match(released.text, /滾進人群裡/)
  assert.equal(c.fruit, undefined)
  assert.equal(world.fruitStalls?.length, 1)
  assert.match(world.paperQueue?.at(-1)?.text ?? '', /煙煙果實流落在外/)

  c.place = 'auctionHouse'
  c.money = 999_000_000
  assert.match(act(world, member, { kind: 'buyFruit' }).text, /沒有惡魔果實/)
  world.minute += 72 * 60
  const bought = act(world, member, { kind: 'buyFruit', fruit: '煙煙果實' })
  assert.match(bought.text, /標下煙煙果實/)
  assert.equal(c.fruit, 'moku')
  assert.equal(c.money, 999_000_000 - 300_000_000)
  assert.equal(world.fruitStalls?.length, 0)
  world.fruitStalls = [{ fruit: 'hana', from: 'robin', ready: 0 }]
  assert.match(act(world, member, { kind: 'buyFruit' }).text, /已經吃過惡魔果實/)
})

test('已經吃過果實的人只能放走第二顆；沒有待決定的果實就沒有選擇', () => {
  const { world, member, c } = solo('logueSquare')
  assert.match(act(world, member, { kind: 'fruit', take: true }).text, /沒有等著決定的惡魔果實/)
  c.fruit = 'hana'
  world.fruitOffers = [{ fruit: 'moku', npc: 'smoker', to: member.id, since: world.minute }]
  assert.match(act(world, member, { kind: 'fruit', take: true }).text, /再吃一顆會要了你的命/)
  assert.equal(world.fruitOffers.length, 1)
  assert.match(act(world, member, { kind: 'fruit', take: false }).text, /滾進人群/)
})

test('自然系玩家打得到自然系、被普通對手打到只受一半傷害；動物系 HP 上限更高', () => {
  const ace = solo('scaffold')
  ace.world.npcPlaces = { ace: 'scaffold' }
  ace.c.fruit = 'moku'
  // Ace fights at his story strength: a fighter of his league is needed to land a blow at all.
  ace.c.level = 70
  const hit = act(ace.world, ace.member, { kind: 'attack', target: '艾斯' }, dice(20, 2, 2, 1, 1))
  assert.doesNotMatch(hit.text, /穿過了/)
  assert.ok(ace.world.combat!.foes[0].hp < ace.world.combat!.foes[0].maxHp)
  const plain = solo('road')
  const before = maxHP(plain.c)
  plain.c.fruit = 'hito'
  assert.equal(maxHP(plain.c), before + 10 * scale)
})

test('果實的力量讓每一擊更痛；沒人理會的果實兩天後自己滾走', () => {
  const a = solo('square')
  const b = solo('square')
  b.c.fruit = 'ope'
  const plain = act(a.world, a.member, { kind: 'attack', target: '村長' }, dice(20, 3, 3, 1, 1))
  const eater = act(b.world, b.member, { kind: 'attack', target: '村長' }, dice(20, 3, 3, 1, 1))
  const dmg = (text: string) => Number(/傷害 (\d+)/.exec(text)?.[1])
  assert.ok(dmg(eater.text) > dmg(plain.text))
  const { world, member } = solo('road')
  world.fruitOffers = [{ fruit: 'gura', npc: 'whitebeard', to: member.id, since: world.minute }]
  world.minute += 2879
  expireOffers(world)
  assert.equal(world.fruitOffers.length, 1)
  world.minute += 2
  expireOffers(world)
  assert.equal(world.fruitOffers.length, 0)
  assert.equal(world.fruitStalls?.[0].fruit, 'gura')
})

test('用說的就行：吸收果實、放走果實、買果實', () => {
  assert.deepEqual(familiarIntent('吸收果實'), { kind: 'fruit', take: true })
  assert.deepEqual(familiarIntent('放走果實'), { kind: 'fruit', take: false })
  assert.deepEqual(familiarIntent('吸收煙煙果實'), { kind: 'fruit', take: true, fruit: '煙煙果實' })
  assert.deepEqual(familiarIntent('買煙煙果實'), { kind: 'buyFruit', fruit: '煙煙果實' })
  assert.deepEqual(familiarIntent('買惡魔果實'), { kind: 'buyFruit' })
})

test('每顆果實有十招，依等級 1／5／10／15／20／30／40／50／60／70 學會，吃下時達標的一次學會', () => {
  for (const [id, moves] of Object.entries(fruitMoves)) {
    assert.equal(moves.length, 10, id + ' 要有十招')
    assert.equal(new Set(moves).size, 10, id + ' 的招式名稱重複')
    assert.equal(fruits[id as keyof typeof fruits].move, moves[0], id)
    for (const name of moves) assert.doesNotMatch(name, /[A-Za-z]/, id + ' 的「' + name + '」要用中文譯名')
  }
  assert.deepEqual(Object.keys(fruitMoves).sort(), Object.keys(fruits).sort())
  assert.deepEqual([...moveLevels], [1, 5, 10, 15, 20, 30, 40, 50, 60, 70])

  const { world, member, c } = solo('road')
  c.cap = 100
  world.fruitOffers = [{ fruit: 'mera', npc: 'ace', to: member.id, since: world.minute }]
  const eaten = act(world, member, { kind: 'fruit', take: true })
  assert.match(eaten.text, /學會招式「火拳」。之後隨等級學會：等級 5「十字火」、等級 10「火銃」、等級 15「火柱」……一共十招，最後一招「大炎戒・炎帝」在等級 70/)
  assert.deepEqual(c.techniques.map(move => move.name), ['火拳'])
  const levelTo = (level: number) => { while (c.level < level) { c.xp = xpToNext(c.level) - 1; grantXp(c, 1) } }
  levelTo(5)
  assert.deepEqual(c.techniques.map(move => move.name), ['火拳', '十字火'])
  levelTo(20)
  assert.equal(c.techniques.at(-1)?.style, 'advanced')
  levelTo(70)
  assert.deepEqual(c.techniques.map(move => move.name), [...fruitMoves.mera])
  assert.deepEqual(c.techniques.map(move => move.style), [...moveStyles])
  assert.ok(c.techniques.every(move => move.fruit))
  // A high-level eater gets everything they qualify for at once.
  const late = solo('road')
  late.c.level = 70
  late.world.fruitOffers = [{ fruit: 'hie', npc: 'aokiji', to: late.member.id, since: 0 }]
  assert.match(act(late.world, late.member, { kind: 'fruit', take: true }).text, /十招全部到手/)
  assert.equal(late.c.techniques.length, 10)
  // Fruit moves never use up the six self-made slots.
  assert.equal(late.c.techniques.filter(move => !move.fruit).length, 0)
})

test('舊存檔的果實招式跟著新表同步：改名的招式換成新名字，還沒到等級的先收回，自創招式不動', () => {
  const { c } = solo('road')
  c.level = 12
  c.fruit = 'ope'
  c.techniques = [
    { name: '房間・切割', style: 'special', fruit: true }, { name: 'Shambles', style: 'advanced', fruit: true },
    { name: '伽瑪刀', style: 'advanced', fruit: true }, { name: '風車斬', style: 'special' },
  ]
  learnFruitArts(c)
  assert.deepEqual(c.techniques.filter(move => move.fruit).map(move => move.name), ['房間・切割', '注射射擊', '交換'])
  assert.ok(c.techniques.some(move => move.name === '風車斬'), '自創招式留著')
})

test('掉落的果實可以交給同地的隊友決定；不在場、戰鬥中都不行，已吃過果實的人只能放走', () => {
  const { world, member, c } = solo('nanohana')
  const mate = { ...structuredClone(member), id: 'mate', host: false } as Member
  mate.character = { ...makeCharacter(character('娜美')), place: 'nanohana' }
  world.members.push(mate)
  const both = new Set(['host', 'mate'])
  const run = (who: Member, intent: Parameters<typeof resolve>[2]) => resolve(world, who, intent, '', dice(), both)
  world.fruitOffers = [{ fruit: 'suna', npc: 'crocodile', to: 'host', since: 0 }]
  assert.deepEqual(familiarIntent('把沙沙果實交給娜美'), { kind: 'passFruit', to: '娜美', fruit: '沙沙果實' })
  assert.deepEqual(familiarIntent('果實給娜美'), { kind: 'passFruit', to: '娜美' })
  mate.character.place = 'alubarnaPalace' as LocationId
  assert.match(run(member, { kind: 'passFruit', to: '娜美' }).text, /不在這裡/)
  mate.character.place = 'nanohana'
  world.minute = 600
  const passed = run(member, { kind: 'give', to: '娜美', item: '沙沙果實' })
  assert.match(passed.text, /把沙沙果實交給了娜美/)
  assert.deepEqual(world.fruitOffers.map(o => [o.to, o.since]), [['mate', 600]], '換人決定，兩天的期限重新算')
  assert.match(run(member, { kind: 'fruit', take: true }).text, /手上沒有等著決定的惡魔果實/)
  assert.match(run(mate, { kind: 'fruit', take: true }).text, /吞了下去/)
  assert.equal(mate.character.fruit, 'suna')
  assert.equal(c.fruit, undefined)

  world.fruitOffers = [{ fruit: 'mera', npc: 'ace', to: 'host', since: 0 }]
  assert.match(run(member, { kind: 'passFruit', to: '娜美' }).text, /已經吃過沙沙果實，只能放走它/)
  world.combat = { round: 1, place: 'nanohana', participants: ['mate'], foes: [], choices: {} }
  assert.match(run(mate, { kind: 'passFruit', to: '旅人' }).text, /戰鬥/)
  assert.equal(world.fruitOffers[0].to, 'mate', '戰鬥中交不出去')
})

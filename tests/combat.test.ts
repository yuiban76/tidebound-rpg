import assert from 'node:assert/strict'
import { test } from 'node:test'
import { makeCharacter, maxSTA, resolve } from '../packages/rules/engine.ts'
import { newWorld, npcPlace } from '../packages/world/village.ts'
import type { Member, World } from '../packages/world/village.ts'
import { advanceTimeline } from '../packages/world/timeline.ts'
import type { LocationId } from '../packages/shared/protocol.ts'
import { character } from './fixtures.ts'

/** Dice that follow a script, then roll the maximum (always a natural 20 and top damage). */
const dice = (...script: number[]) => (sides: number) => Math.min(sides, script.length ? script.shift()! : sides)
const online = new Set(['host'])

function solo(place: LocationId) {
  const world = newWorld('FIGHT00001', 'host')
  world.started = true
  const member = world.members[0] as Member
  member.character = makeCharacter(character('旅人'))
  member.character.place = place
  return { world, member, c: member.character }
}
const act = (world: World, member: Member, intent: Parameters<typeof resolve>[2], roll = dice()) =>
  resolve(world, member, intent, '', roll, online)

test('任何 NPC 都能攻擊：打倒平民會讓對方昏倒、本島聲望下降，暫時無法交談', () => {
  const { world, member } = solo('tavern')
  const result = act(world, member, { kind: 'attack', target: '瑪琪諾' })
  assert.match(result.text, /旅人向瑪琪諾（平民）出手了/)
  assert.match(result.text, /瑪琪諾倒下了[\s\S]*戰鬥結束[\s\S]*評價變差/)
  assert.equal(world.combat, undefined)
  assert.ok((world.npcDown?.keeper ?? 0) > world.minute)
  assert.equal(world.renown?.islandRep.wind, -10)
  assert.deepEqual(world.defeated, ['keeper'])
  assert.match(act(world, member, { kind: 'talk', npc: 'keeper' }).text, /瑪琪諾被打倒了，暫時無法交談/)
  assert.match(act(world, member, { kind: 'attack', target: '瑪琪諾' }).text, /這裡沒有可以攻擊的對象/)
})

test('自然系的身體讓普通攻擊穿過，對手照樣反擊', () => {
  const { world, member, c } = solo('logueSquare')
  const result = act(world, member, { kind: 'attack', target: '斯摩格' }, dice(20, 1))
  assert.match(result.text, /穿過了斯摩格的身體/)
  assert.match(result.text, /斯摩格反擊旅人/)
  assert.equal(world.combat?.foes[0].hp, world.combat?.foes[0].maxHp)
  assert.equal(c.hp > 0, true)
})

test('招式依等級扣 STA；自創招式只能用已建立的名稱，連續攻擊打兩下', () => {
  const { world, member, c } = solo('road')
  c.sta = 4
  assert.match(act(world, member, { kind: 'attack', target: '蘇芮', style: 'flurry' }).text, /需要 7 STA/)
  assert.equal(world.combat, undefined)
  assert.match(act(world, member, { kind: 'attack', target: '蘇芮', technique: '風車斬' }).text, /還沒有名為「風車斬」的招式/)
  c.techniques.push({ name: '風車斬', style: 'special' })
  const strike = act(world, member, { kind: 'attack', target: '蘇芮', technique: '風車斬' }, dice(10, 1, 1))
  assert.match(strike.text, /使出「風車斬」/)
  assert.equal(c.sta, 1)
  c.sta = maxSTA(c)
  const flurry = act(world, member, { kind: 'attack', style: 'flurry' }, dice(2, 2, 1))
  assert.equal((flurry.text.match(/使出高強度連續攻擊/g) ?? []).length, 2)
  assert.equal(c.sta, maxSTA(c) - 7)
})

test('打倒海軍或政府的人會被懸賞並提高海軍注意度；交涉成功的對手收手、不會昏倒', () => {
  const { world, member, c } = solo('justiceTower')
  for (let i = 0; i < 5 && (!world.defeated?.includes('spandam')); i++)
    act(world, member, { kind: 'attack', target: '斯潘達姆' })
  assert.ok(world.defeated?.includes('spandam'))
  assert.ok(c.bounty > 0)
  assert.ok((world.renown?.marineHeat ?? 0) > 0)

  const talk = solo('road')
  act(talk.world, talk.member, { kind: 'attack', target: '蘇芮' }, dice(1, 1))
  const result = act(talk.world, talk.member, { kind: 'negotiate', target: '蘇芮' }, dice(20))
  assert.match(result.text, /蘇芮收手了[\s\S]*戰鬥結束/)
  assert.equal(talk.world.npcDown?.watch, undefined)
})

test('航行遇到海上遭遇：打贏後繼續航程，船抵達目的地', () => {
  const { world, member, c } = solo('dock')
  world.ship = { owner: 'host', port: 'dock', hull: 100, wood: 2, trips: 0 }
  // Navigation 20, encounter check 20, encounter pick 3 = young Sea King.
  const set = act(world, member, { kind: 'sail', order: 'depart', destination: 'lantern' }, dice(20, 20, 3))
  assert.match(set.text, /航行途中：一頭幼小的海王類/)
  assert.equal(c.place, 'dock')
  assert.ok(world.combat?.sea)
  for (let i = 0; i < 6 && world.combat; i++) act(world, member, { kind: 'attack' })
  assert.equal(world.combat, undefined)
  assert.equal(c.place, 'lanternPort')
  assert.equal(world.ship.port, 'lanternPort')
})

test('海上遭遇可以甩開；全隊倒下時被海賊搶走三成貝里，船仍漂到目的地', () => {
  const run = solo('dock')
  run.world.ship = { owner: 'host', port: 'dock', hull: 100, wood: 2, trips: 0 }
  act(run.world, run.member, { kind: 'sail', order: 'depart', destination: 'lantern' }, dice(10, 20, 1))
  const escape = act(run.world, run.member, { kind: 'flee' }, dice(20))
  assert.match(escape.text, /成功脫離[\s\S]*全隊抵達潮燈島/)

  const lost = solo('dock')
  lost.world.ship = { owner: 'host', port: 'dock', hull: 100, wood: 2, trips: 0 }
  lost.c.hp = 1
  act(lost.world, lost.member, { kind: 'sail', order: 'depart', destination: 'lantern' }, dice(10, 20, 1))
  const beaten = act(lost.world, lost.member, { kind: 'attack' }, dice(1, 20, 6, 6))
  assert.match(beaten.text, /搶走了你們身上三成的貝里[\s\S]*全隊抵達潮燈島/)
  assert.equal(lost.c.money, 1400)
  assert.equal(lost.c.place, 'lanternPort')
})

test('打倒原作頭目會改變世界，時間線也跟著改寫', () => {
  const world = newWorld('FIGHT00002', 'host')
  world.defeated = ['arlong']
  world.npcPlaces = { arlong: null }
  world.minute = (9 - 1) * 1440
  const news = advanceTimeline(world)
  assert.equal(world.timeline?.arlong, 'changed')
  assert.ok(news.some(item => item.text.includes('惡龍早已被一群旅人打倒')))
  assert.equal(npcPlace(world, 'arlong'), null)
})

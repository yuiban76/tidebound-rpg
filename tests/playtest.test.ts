// Regressions found while play-testing on 2026-11-22.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LocationId } from '../packages/shared/protocol.ts'
import { makeCharacter, resolve } from '../packages/rules/engine.ts'
import { directions, familiarIntent } from '../packages/world/explore.ts'
import { newWorld } from '../packages/world/village.ts'
import type { Member, World } from '../packages/world/village.ts'
import { character } from './fixtures.ts'

const dice = (...script: number[]) => (sides: number) => Math.min(sides, script.length ? script.shift()! : sides)
const online = new Set(['host'])
function solo(place: LocationId) {
  const world = newWorld('PLAYTEST01', 'host')
  world.started = true
  const member = world.members[0] as Member
  member.character = makeCharacter(character('阿浪'))
  member.character.place = place
  return { world, member, c: member.character }
}
const act = (world: World, member: Member, intent: Parameters<typeof resolve>[2], roll = dice()) =>
  resolve(world, member, intent, '', roll, online)

test('商店商品直接用名稱購買，不需要 AI；鐵匠鋪可當地點名', () => {
  assert.deepEqual(familiarIntent('買繃帶'), { kind: 'buy', item: 'bandage' })
  assert.deepEqual(familiarIntent('買兩捲繃帶'), { kind: 'buy', item: 'bandage' })
  assert.deepEqual(familiarIntent('購買水壺'), { kind: 'buy', item: 'waterskin' })
  assert.equal(familiarIntent('買一些好吃的')?.kind === 'buy', false)
  assert.deepEqual(familiarIntent('去鐵匠鋪', 'dock'), { kind: 'move', to: 'square' })
})

test('單人成立船團不用投票', () => {
  const { world, member } = solo('square')
  assert.match(act(world, member, { kind: 'crew' }).text, /成立了自己的船團/)
  assert.equal(world.crew, true)
  assert.equal(world.proposals.length, 0)
})

test('成功撤退不會被說成被搶；倒下時的指引會提到睡覺', () => {
  const { world, member, c } = solo('orangeStreet')
  act(world, member, { kind: 'attack', target: '巴其' }, dice(1, 1))
  const money = c.money
  const retreat = act(world, member, { kind: 'flee' }, dice(1))
  assert.match(retreat.text, /脫離了戰鬥/)
  assert.doesNotMatch(retreat.text, /搶走/)
  assert.equal(c.money, money)
  assert.match(directions('orangeStreet', { down: true }).text, /睡覺/)
})

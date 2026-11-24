import assert from 'node:assert/strict'
import { test } from 'node:test'
import { makeCharacter, resolve } from '../packages/rules/engine.ts'
import { newWorld, npcsAt } from '../packages/world/village.ts'
import type { Member } from '../packages/world/village.ts'
import { islands } from '../packages/world/sea.ts'
import { isTrader, traders } from '../packages/world/traders.ts'
import type { IslandId, LocationId } from '../packages/shared/protocol.ts'
import { directions } from '../packages/world/explore.ts'
import { character } from './fixtures.ts'

const online = new Set(['host'])
function solo(place: LocationId) {
  const world = newWorld('TRADE00001', 'host')
  world.started = true
  const member = world.members[0] as Member
  member.character = makeCharacter(character('旅人'))
  member.character.place = place
  member.character.money = 5000
  return { world, member, c: member.character }
}

test('每座島都有一位潮行商會的原創行商', () => {
  const world = newWorld('TRADE00002', 'host')
  for (const id of Object.keys(islands) as IslandId[]) {
    const here = Object.values(traders).filter(t => t.island === id)
    assert.equal(here.length, 1, islands[id].name)
    assert.ok(islands[id].places.includes(here[0].place), islands[id].name)
    assert.ok(npcsAt(world, here[0].place).some(isTrader), islands[id].name)
  }
})

test('在行商面前能買武器和道具，不會賣完；行商不肯加入海賊團', () => {
  const { world, member, c } = solo('syrupPort')
  const swords = c.inventory['普通武士刀'] ?? 0
  const bought = resolve(world, member, { kind: 'buy', item: 'sword' }, '', () => 10, online)
  assert.match(bought.text, /行商歐蘭把普通武士刀交給你。購入普通武士刀，支出 600 貝里/)
  assert.equal(c.inventory['普通武士刀'], swords + 1)
  assert.equal(c.money, 4400)
  for (let i = 0; i < 3; i++) assert.ok(!resolve(world, member, { kind: 'buy', item: 'musket' }, '', () => 10, online).rejected)
  assert.ok((c.inventory['普通火槍'] ?? 0) >= 3)
  assert.match(resolve(world, member, { kind: 'buy', item: 'logPose' }, '', () => 10, online).text, /一本松武器店/)
  const recruit = resolve(world, member, { kind: 'recruit', npc: 'traderSyrup' }, '', () => 20, online)
  assert.match(recruit.text, /只做買賣，不會加入任何海賊團/)
  assert.equal(world.companions?.traderSyrup, undefined)
})

test('離開行商的地方就買不到', () => {
  const { world, member } = solo('kayaMansion')
  const result = resolve(world, member, { kind: 'buy', item: 'sword' }, '', () => 10, online)
  assert.ok(result.rejected)
  assert.match(result.text, /潮行商會行商也有賣/)
})

test('到港口看看四周，會看到行商和他賣的東西', () => {
  const { text } = directions('syrupPort')
  assert.match(text, /這裡有行商歐蘭（潮行商會的行商）/)
  assert.match(text, /行商歐蘭販售普通武士刀 600 貝里.*傷藥 120 貝里/)
})

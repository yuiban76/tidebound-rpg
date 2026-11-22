import assert from 'node:assert/strict'
import { test } from 'node:test'
import { makeCharacter, maxHP, resolve } from '../packages/rules/engine.ts'
import { familiarIntent } from '../packages/world/explore.ts'
import { tierOf, weaponLabel } from '../packages/world/forge.ts'
import { scale } from '../packages/world/scale.ts'
import { newWorld } from '../packages/world/village.ts'
import type { Member, World } from '../packages/world/village.ts'
import type { LocationId } from '../packages/shared/protocol.ts'
import { character } from './fixtures.ts'

const dice = () => (sides: number) => sides
const online = new Set(['host'])
function solo(place: LocationId) {
  const world = newWorld('FORGE00001', 'host')
  world.started = true
  const member = world.members[0] as Member
  member.character = makeCharacter(character('旅人'))
  member.character.place = place
  return { world, member, c: member.character }
}
const act = (world: World, member: Member, intent: Parameters<typeof resolve>[2]) => resolve(world, member, intent, '', dice(), online)

test('鐵匠：只有鐵匠鋪能強化，要等級和貝里，最多三階，數值逐階增加', () => {
  const { world, member, c } = solo('dock')
  assert.equal(act(world, member, { kind: 'upgrade' }).rejected, true)
  c.place = 'square'
  c.money = 10000
  assert.match(act(world, member, { kind: 'upgrade' }).text, /等級 2/)
  c.level = 2
  assert.match(act(world, member, { kind: 'upgrade' }).text, /精鋼武士刀/)
  assert.equal(tierOf(c), 1)
  assert.equal(c.money, 10000 - 400)
  assert.equal(act(world, member, { kind: 'upgrade' }).rejected, true, '2 階要等級 5')
  c.level = 8
  act(world, member, { kind: 'upgrade' })
  act(world, member, { kind: 'upgrade' })
  assert.equal(tierOf(c), 3)
  assert.equal(weaponLabel(c, '普通武士刀'), '名匠武士刀')
  assert.match(act(world, member, { kind: 'upgrade' }).text, /極限/)
})

test('強化只跟著那種武器：換成徒手不帶走，換回來仍在；火槍可在城下町買', () => {
  const { world, member, c } = solo('goa')
  c.money = 5000
  c.level = 2
  act(world, member, { kind: 'upgrade' })
  act(world, member, { kind: 'equip', weapon: 'fist' })
  assert.equal(tierOf(c), 0)
  act(world, member, { kind: 'equip', weapon: 'sword' })
  assert.equal(tierOf(c), 1)
  assert.match(act(world, member, { kind: 'buy', item: 'musket' }).text, /購入普通火槍/)
})

test('傷藥：廣場購買，喝下回復 HP 與 STA，用不著時不浪費', () => {
  const { world, member, c } = solo('square')
  assert.match(act(world, member, { kind: 'buy', item: 'tonic' }).text, /購入傷藥/)
  assert.equal(act(world, member, { kind: 'use', item: '傷藥' }).rejected, true)
  c.hp = 5
  c.sta = 0
  act(world, member, { kind: 'use', item: '傷藥' })
  assert.equal(c.hp, Math.min(maxHP(c), 5 + (8 + c.level) * scale))
  assert.equal(c.sta, 5)
  assert.equal(c.inventory['傷藥'], 0)
})

test('口語指令：強化武器、買傷藥、喝傷藥、買火槍', () => {
  assert.deepEqual(familiarIntent('強化武器'), { kind: 'upgrade' })
  assert.deepEqual(familiarIntent('買傷藥'), { kind: 'buy', item: 'tonic' })
  assert.deepEqual(familiarIntent('喝傷藥'), { kind: 'use', item: '傷藥' })
  assert.deepEqual(familiarIntent('買普通火槍'), { kind: 'buy', item: 'musket' })
})

test('數值倍率：舊存檔的血量會一次性乘上倍率，之後不再重複放大', async () => {
  const { normalizeWorld } = await import('../packages/world/village.ts')
  const { scale } = await import('../packages/world/scale.ts')
  const { world, c } = solo('square')
  delete world.scale
  c.hp = 30
  world.courierHP = 20
  normalizeWorld(world)
  assert.equal(c.hp, 30 * scale)
  assert.equal(world.courierHP, 20 * scale)
  normalizeWorld(world)
  assert.equal(c.hp, 30 * scale)
})

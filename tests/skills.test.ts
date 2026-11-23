// Skills grow with levels, and every life skill has a fixed use (packages/world/skills.ts).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LocationId, Skill } from '../packages/shared/protocol.ts'
import { familiarIntent } from '../packages/world/explore.ts'
import { grantXp, makeCharacter, maxHP, maxSTA, resolve, trainSkill } from '../packages/rules/engine.ts'
import { scale } from '../packages/world/scale.ts'
import { crafted, skillCap } from '../packages/world/skills.ts'
import { newWorld, normalizeWorld } from '../packages/world/village.ts'
import type { Member, World } from '../packages/world/village.ts'
import { character } from './fixtures.ts'

const dice = (...script: number[]) => (sides: number) => Math.min(sides, script.length ? script.shift()! : sides)
const online = new Set(['host'])
function solo(place: LocationId, ranks: Partial<Record<Skill, number>> = {}) {
  const world = newWorld('SKILLS0001', 'host')
  world.started = true
  const member = world.members[0] as Member
  member.character = makeCharacter(character('旅人'))
  member.character.place = place
  member.character.skillRanks = { 劍術: 2, ...ranks }
  return { world, member, c: member.character }
}
const act = (world: World, member: Member, intent: Parameters<typeof resolve>[2], roll = dice()) => resolve(world, member, intent, '', roll, online)

test('每升 1 級得 1 個技能點；技能上限隨等級提高，最多 8', () => {
  const c = makeCharacter(character('甲'))
  assert.equal(c.skillPoints, 0)
  assert.match(grantXp(c, 100), /獲得 1 個技能點/)
  assert.equal(c.skillPoints, 1)
  assert.deepEqual([1, 2, 6, 12, 20].map(skillCap), [2, 3, 5, 8, 8])
  assert.match(trainSkill(c, '烹飪').text, /烹飪提升為 1/)
  assert.equal(c.skillPoints, 0)
  assert.equal(trainSkill(c, '烹飪').rejected, true)
  c.skillPoints = 5
  trainSkill(c, '劍術')
  assert.match(trainSkill(c, '劍術').text, /上限 3/)
})

test('工藝：修船每級多修 5，強化武器每級便宜 10%，最多 5 折', () => {
  assert.deepEqual([0, 1, 3, 9].map(rank => crafted(1000, { skillRanks: { 工藝: rank } })), [1000, 900, 700, 500])
  const { world, member } = solo('dock', { 工藝: 2 })
  world.ship = { owner: 'host', port: 'dock', hull: 50, wood: 1, trips: 0 }
  assert.match(act(world, member, { kind: 'sail', order: 'repair' }).text, /修到 85／100（工藝 2，多修了 10）/)
})

test('採集：在山林海岸找草藥（有船再撿木料），同一地點每天一次；草藥能當繃帶', () => {
  const { world, member, c } = solo('hill', { 採集: 2 })
  assert.match(act(world, member, { kind: 'gather' }, dice(15)).text, /草藥 × 2/)
  assert.equal(c.inventory['草藥'], 2)
  assert.match(act(world, member, { kind: 'gather' }).text, /明天再來/)
  world.minute += 1440
  world.ship = { owner: 'host', port: 'dock', hull: 100, wood: 0, trips: 0 }
  assert.match(act(world, member, { kind: 'gather' }, dice(15)).text, /木料 × 1/)
  assert.equal(world.ship.wood, 1)
  assert.match(act(world, member, { kind: 'gather' }).text, /明天再來/)
  c.place = 'square'
  assert.match(act(world, member, { kind: 'gather' }).text, /沒有東西可採集/)
  delete c.inventory['繃帶']
  c.hp = 10
  const before = c.inventory['草藥']
  assert.match(act(world, member, { kind: 'useItem', item: '草藥' }).text, /替自己包紮/)
  assert.equal(c.inventory['草藥'], before - 1)
  assert.deepEqual(familiarIntent('採集', 'hill'), { kind: 'gather' })
  assert.deepEqual(familiarIntent('用草藥', 'hill'), { kind: 'useItem', item: '草藥' })
})

test('烹飪：休息時會做飯的人讓大家多回復 STA；醫術 2 以上睡覺多回復 HP', () => {
  const plain = solo('tavern')
  const cook = solo('tavern', { 烹飪: 3 })
  for (const { c } of [plain, cook]) { c.sta = 0; c.hp = 10 }
  const a = act(plain.world, plain.member, { kind: 'rest', sleep: false })
  const b = act(cook.world, cook.member, { kind: 'rest', sleep: false })
  assert.match(b.text, /你做了一頓飯，多回復了 6 STA/)
  assert.equal(cook.c.sta - plain.c.sta, 6)
  assert.equal(cook.c.hp - plain.c.hp, 3 * scale)
  assert.doesNotMatch(a.text, /做了一頓飯/)

  const nurse = solo('tavern', { 醫術: 2 })
  const tired = solo('tavern')
  for (const { c } of [nurse, tired]) c.hp = 10
  act(nurse.world, nurse.member, { kind: 'rest', sleep: true })
  act(tired.world, tired.member, { kind: 'rest', sleep: true })
  assert.equal(nurse.c.hp - tired.c.hp, Math.ceil(maxHP(nurse.c) / 8))
  assert.ok(nurse.c.sta <= maxSTA(nurse.c))
})

test('航海：最好的航海士每級讓航程縮短 3%', () => {
  const minutes = (rank: number) => {
    const { world, member } = solo('dock', { 航海: rank })
    world.calmSeas = true
    world.ship = { owner: 'host', port: 'dock', hull: 100, wood: 2, trips: 0 }
    return act(world, member, { kind: 'sail', order: 'depart', destination: 'shells' }, dice(10)).minutes!
  }
  assert.ok(minutes(4) < minutes(0))
  assert.equal(minutes(4), Math.round(minutes(0) * .88))
})

test('舊存檔：依目前等級補發技能點', () => {
  const world = newWorld('SKILLS0002', 'host')
  const c = world.members[0].character = makeCharacter(character('甲'))
  c.level = 5
  delete (c as Partial<typeof c>).skillPoints
  normalizeWorld(world)
  assert.equal(c.skillPoints, 4)
  normalizeWorld(world)
  assert.equal(c.skillPoints, 4)
})

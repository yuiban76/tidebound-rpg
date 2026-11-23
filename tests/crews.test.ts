// Crew battles: attacking a captain or a crewmate brings every crewmate who is with them into the fight.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LocationId } from '../packages/shared/protocol.ts'
import { makeCharacter, resolve } from '../packages/rules/engine.ts'
import { advanceTimeline } from '../packages/world/timeline.ts'
import { newWorld } from '../packages/world/village.ts'
import type { Member, World } from '../packages/world/village.ts'
import { crewOf, crews } from '../packages/world/crews.ts'
import { npcProfiles } from '../packages/world/foes.ts'
import { character } from './fixtures.ts'

const online = new Set(['host'])
// Every player blow misses (natural 1) so the fight stays open and the line-up can be inspected.
const misses = (sides: number) => sides === 20 ? 1 : 1
const at = (day: number, hour: number) => (day - 1) * 1440 + hour * 60

function scene(place: LocationId, minute: number) {
  const world = newWorld('CREWS00001', 'host')
  world.started = true
  world.calmSeas = true
  world.minute = minute
  advanceTimeline(world)
  const member = world.members[0] as Member
  member.character = makeCharacter(character('阿浪'))
  member.character.place = place
  member.character.level = 20
  member.character.hp = 99_999
  return { world, member }
}
const foeNames = (world: World) => world.combat?.foes.map(foe => foe.name) ?? []

test('對魯夫出手，草帽一夥目前在船上的夥伴全員迎戰', () => {
  const { world, member } = scene('logueSquare', at(9, 14))
  const result = resolve(world, member, { kind: 'attack', target: '魯夫' }, '攻擊魯夫', misses, online)
  assert.match(result.text, /草帽一夥全員迎戰！/)
  assert.deepEqual(foeNames(world).sort(), ['魯夫', '索隆', '騙人布', '香吉士', '娜美'].sort())
  // Chopper only joins on Day 18, so he is not here yet.
  assert.ok(!foeNames(world).includes('喬巴'))
})

test('被玩家先招募的夥伴不會站在對面，被打倒昏迷的人也不參戰', () => {
  const { world, member } = scene('logueSquare', at(9, 14))
  world.companions = { zoro: { leader: 'host', since: 0, hp: 100, level: 1, facts: '' } } as World['companions']
  world.npcDown = { nami: world.minute + 480 }
  resolve(world, member, { kind: 'attack', target: '魯夫' }, '攻擊魯夫', misses, online)
  assert.deepEqual(foeNames(world).sort(), ['魯夫', '騙人布', '香吉士'].sort())
})

test('攻擊團員時船長和雜兵一起上：巴其在橘子鎮帶著手下', () => {
  const { world, member } = scene('orangeStreet', at(1, 9))
  resolve(world, member, { kind: 'attack', target: '巴其' }, '攻擊巴其', misses, online)
  assert.equal(foeNames(world)[0], '巴其')
  assert.equal(world.combat?.foes.filter(foe => foe.name.startsWith('巴其海賊團團員')).length, 2)
})

test('沒有所屬團體的人仍是一對一', () => {
  const { world, member } = scene('tavern', at(1, 9))
  const result = resolve(world, member, { kind: 'attack', target: '瑪琪諾' }, '攻擊瑪琪諾', misses, online)
  assert.deepEqual(foeNames(world), ['瑪琪諾'])
  assert.doesNotMatch(result.text, /全員迎戰/)
})

test('名冊裡的每個人都是有戰鬥資料的角色', () => {
  for (const crew of Object.values(crews))
    for (const npc of [crew.captain, ...crew.members.map(member => member.npc)]) {
      assert.ok(npcProfiles[npc], crew.name + '：' + npc + ' 缺戰鬥資料')
      assert.equal(crewOf(npc)?.name, crew.name, npc + ' 只能屬於一個團')
    }
})

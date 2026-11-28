// Crew battles: attacking a captain or a crewmate brings every crewmate who is with them into the fight.
import { allGates } from './fixtures.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LocationId } from '../packages/shared/protocol.ts'
import { makeCharacter, resolve } from '../packages/rules/engine.ts'
import { advanceTimeline } from '../packages/world/timeline.ts'
import { newWorld, npcPlace } from '../packages/world/village.ts'
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
  world.gates = allGates()
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

test('攻擊團員時船長和雜兵一起上：巴其在橘子鎮的酒館帶著卡巴吉、摩奇和手下', () => {
  const { world, member } = scene('buggyBar', at(1, 9))
  resolve(world, member, { kind: 'attack', target: '巴其' }, '攻擊巴其', misses, online)
  assert.equal(foeNames(world)[0], '巴其')
  assert.ok(foeNames(world).includes('卡巴吉') && foeNames(world).includes('摩奇'))
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

test('各團的幹部都在船長身邊：打惡龍時小八、克羅歐比、啾一起上；打凱多時三災和飛六胞全員到齊', () => {
  const arlong = scene('arlongPark', at(7, 12))
  resolve(arlong.world, arlong.member, { kind: 'attack', target: '惡龍' }, '攻擊惡龍', misses, online)
  for (const name of ['惡龍', '小八', '克羅歐比', '啾']) assert.ok(foeNames(arlong.world).includes(name), name)

  const wano = scene('onigashima', at(845, 12))
  resolve(wano.world, wano.member, { kind: 'attack', target: '凱多' }, '攻擊凱多', misses, online)
  for (const name of ['凱多', '燼', '奎因', '傑克', '烏爾緹', '佩吉萬', '呼死呼', '布拉克瑪利亞', '佐佐木'])
    assert.ok(foeNames(wano.world).includes(name), name)
})

test('紅髮、黑鬍子、紅心海賊團也是一整團：在頂上戰爭打香克斯，班・貝克曼、拉奇・路、耶穌布都會出手', () => {
  const { world, member } = scene('marinefordBay', at(72, 19))
  resolve(world, member, { kind: 'attack', target: '香克斯' }, '攻擊香克斯', misses, online)
  for (const name of ['香克斯', '班・貝克曼', '拉奇・路', '耶穌布']) assert.ok(foeNames(world).includes(name), name)
  assert.equal(crewOf('teach')?.name, '黑鬍子海賊團')
  assert.equal(crewOf('law')?.name, '紅心海賊團')
})

test('幹部跟著船長走：劇情把船長帶走，幹部也一起離開；入團前和離團後各待在自己的地方', () => {
  const before = scene('arlongPark', at(7, 12))
  assert.equal(npcPlace(before.world, 'hatchan'), 'arlongPark')
  const after = scene('arlongPark', at(9, 12))
  assert.equal(npcPlace(after.world, 'arlong'), null)
  assert.equal(npcPlace(after.world, 'hatchan'), null, '惡龍倒下後，小八也不在惡龍樂園了')
  // 希留 is locked in Impel Down until he breaks out with Blackbeard.
  assert.equal(npcPlace(scene('impelLevel6', at(60, 12)).world, 'shiryu'), 'impelLevel6')
  // 亞爾麗塔 only sails with Buggy after Loguetown.
  const early = scene('buggyBar', at(1, 9))
  assert.equal(npcPlace(early.world, 'alvida'), null)
  assert.equal(npcPlace(scene('logueSquare', at(9, 14)).world, 'alvida'), 'logueSquare')
})

test('越獄後黑鬍子帶著第六層的巨大戰艦船長；兩年後 CP9 改叫 CP0，帶著史特西', () => {
  const war = scene('marinefordBay', at(72, 19))
  resolve(war.world, war.member, { kind: 'attack', target: '黑鬍子' }, '攻擊黑鬍子', misses, online)
  for (const name of ['阿瓦羅・皮薩羅', '卡塔莉娜・戴彭', '桑・范・沃爾夫', '巴斯可・修特', '希留']) assert.ok(foeNames(war.world).includes(name), name)
  assert.equal(npcPlace(scene('impelLevel6', at(60, 12)).world, 'pizarro'), 'impelLevel6', '越獄前還關在第六層')

  const egghead = scene('labophase', at(864, 12))
  const result = resolve(egghead.world, egghead.member, { kind: 'attack', target: '羅布・路基' }, '攻擊路基', misses, online)
  assert.match(result.text, /CP0全員迎戰/)
  for (const name of ['卡庫', '史特西']) assert.ok(foeNames(egghead.world).includes(name), name)
})

test('新的團體：火拳幫、革命軍、推進城的獄卒、巴托俱樂部都會一起出手', () => {
  const lineups: [LocationId, number, number, string, string[]][] = [
    ['wcChateau', 830, 14, '卡彭・培基', ['維特', '哥提']],
    ['corrida', 815, 12, '薩波', ['克爾拉', '哈庫']],
    ['impelGate', 30, 12, '麥哲倫', ['莎蒂', '多米諾']],
    ['corrida', 815, 12, '巴托洛米奧', ['甘比亞']],
  ]
  for (const [place, day, hour, captain, mates] of lineups) {
    const { world, member } = scene(place, at(day, hour))
    resolve(world, member, { kind: 'attack', target: captain }, '攻擊' + captain, misses, online)
    for (const name of mates) assert.ok(foeNames(world).includes(name), captain + '：' + name)
  }
})

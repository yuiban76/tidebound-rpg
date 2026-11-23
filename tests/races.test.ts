// Races: one small bonus, one canon trait, and a price for the strong ones (packages/world/races.ts).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LocationId, Race } from '../packages/shared/protocol.ts'
import { characterInput, races } from '../packages/shared/protocol.ts'
import { makeCharacter, maxHP, needsReview, resolve } from '../packages/rules/engine.ts'
import { npcFoe } from '../packages/world/foes.ts'
import { raceSummary, stat } from '../packages/world/races.ts'
import { newWorld, normalizeWorld, selfMade } from '../packages/world/village.ts'
import type { Member, World } from '../packages/world/village.ts'
import { character } from './fixtures.ts'

/** Dice that follow a script, then roll the maximum. */
const dice = (...script: number[]) => (sides: number) => Math.min(sides, script.length ? script.shift()! : sides)
const online = new Set(['host'])
const make = (race: Race) => makeCharacter({ ...character('旅人'), race })

function solo(race: Race, place: LocationId = 'square') {
  const world = newWorld('RACES00001', 'host')
  world.started = true
  world.calmSeas = true
  const member = world.members[0] as Member
  member.character = make(race)
  member.character.place = place
  member.character.unspent = 0
  return { world, member, c: member.character }
}
const act = (world: World, member: Member, intent: Parameters<typeof resolve>[2], roll = dice()) =>
  resolve(world, member, intent, '', roll, online)
const number = (pattern: RegExp, text: string) => Number(pattern.exec(text)?.[1])

test('「其他」已不是可選的種族；只有巨人需要房主核准', () => {
  assert.equal((races as readonly string[]).includes('其他'), false)
  assert.equal(characterInput.safeParse({ ...character('甲'), race: '其他' }).success, false)
  assert.equal(needsReview({ ...character('甲'), race: '巨人' }), true)
  assert.equal(needsReview({ ...character('甲'), race: '魚人' }), false)
  for (const race of races) assert.ok(raceSummary(race).length > 0)
})

test('屬性加成在計算時套用、不寫進存檔；巨人 HP +50%，小人族 −20%', () => {
  const fishman = make('魚人')
  assert.equal(fishman.stats.STR, 4)
  assert.equal(stat(fishman, 'STR'), 5)
  const human = make('人類')
  assert.equal(maxHP(make('巨人')), Math.round(maxHP(human) * 1.5 / 10) * 10)
  assert.equal(maxHP(make('小人族')), Math.round(maxHP(human) * .8 / 10) * 10)
  assert.equal(make('巨人').hp, maxHP(make('巨人')))
})

test('人類開局多 1 個自由屬性點；毛皮族天生會「電擊」，不佔 6 招名額', () => {
  assert.equal(make('人類').unspent, 1)
  assert.equal(make('魚人').unspent, 0)
  const mink = make('毛皮族')
  assert.deepEqual(mink.techniques, [{ name: '電擊', style: 'special', innate: true }])
  assert.equal(mink.techniques.filter(selfMade).length, 0)
})

test('魚人天生會「魚人空手道」；早就建好的魚人角色讀檔時也會補上，只補一次', () => {
  const fishman = make('魚人')
  assert.deepEqual(fishman.techniques, [{ name: '魚人空手道', style: 'special', innate: true }])
  assert.equal(fishman.techniques.filter(selfMade).length, 0)
  const world = newWorld('RACES00004', 'host')
  const old = world.members[0].character = make('魚人')
  old.techniques = [{ name: '鯊魚衝撞', style: 'advanced' }]
  old.raceReady = true
  normalizeWorld(world)
  normalizeWorld(world)
  assert.deepEqual(old.techniques.map(move => move.name), ['鯊魚衝撞', '魚人空手道'])
  assert.equal(old.unspent, 0)
})

test('巨人傷害 +2（加上力量 +1），但目標大、防禦 −2', () => {
  const human = solo('人類')
  const giant = solo('巨人')
  // Natural 15 and a damage die of 1 (so the mayor stays up), then the mayor's counter-attack.
  const a = act(human.world, human.member, { kind: 'attack', target: '村長' }, dice(15, 1, 10, 1))
  const b = act(giant.world, giant.member, { kind: 'attack', target: '村長' }, dice(15, 1, 10, 1))
  assert.equal(number(/傷害 (\d+)/, b.text) - number(/傷害 (\d+)/, a.text), 30)
  assert.equal(number(/反擊旅人，D20 \d+，合計 \d+／(\d+)/, a.text) - number(/反擊旅人，D20 \d+，合計 \d+／(\d+)/, b.text), 2)
})

test('小人族防禦 +1 與敏捷 +1，潛行 +2', () => {
  const human = solo('人類')
  const small = solo('小人族')
  const a = act(human.world, human.member, { kind: 'attack', target: '村長' }, dice(15, 6, 10, 1))
  const b = act(small.world, small.member, { kind: 'attack', target: '村長' }, dice(15, 6, 10, 1))
  assert.equal(number(/反擊旅人，D20 \d+，合計 \d+／(\d+)/, b.text) - number(/反擊旅人，D20 \d+，合計 \d+／(\d+)/, a.text), 2)
  const sneakA = act(solo('人類').world, solo('人類').member, { kind: 'check', method: 'sneak' }, dice(10))
  const s = solo('小人族')
  const sneakB = act(s.world, s.member, { kind: 'check', method: 'sneak' }, dice(10))
  assert.equal(number(/合計 (\d+)/, sneakB.text) - number(/合計 (\d+)/, sneakA.text), 3)
})

test('長手族徒手命中 +1；魚人交涉 −2', () => {
  const human = solo('人類')
  const long = solo('長手族')
  human.c.weapon = long.c.weapon = 'fist'
  const a = act(human.world, human.member, { kind: 'attack', target: '村長' }, dice(5, 1, 1, 1))
  const b = act(long.world, long.member, { kind: 'attack', target: '村長' }, dice(5, 1, 1, 1))
  assert.equal(number(/D20 5，合計 (\d+)/, b.text) - number(/D20 5，合計 (\d+)/, a.text), 1)
  for (const s of [human, long]) delete s.world.combat
  const fish = solo('魚人')
  act(human.world, human.member, { kind: 'attack', target: '村長' }, dice(1, 1))
  act(fish.world, fish.member, { kind: 'attack', target: '村長' }, dice(1, 1))
  const talkA = act(human.world, human.member, { kind: 'negotiate', target: '村長' }, dice(5))
  const talkB = act(fish.world, fish.member, { kind: 'negotiate', target: '村長' }, dice(5))
  assert.equal(number(/說服 D20 5，合計 (\d+)/, talkA.text) - number(/說服 D20 5，合計 (\d+)/, talkB.text), 2)
})

test('空島居民用衝擊貝讓自然系多現形 1 回合', () => {
  for (const [race, rounds] of [['人類', 2], ['空島居民', 3]] as const) {
    const { world, member, c } = solo(race, 'godShrine')
    c.inventory['衝擊貝'] = 1
    world.combat = { round: 1, place: 'godShrine', participants: [member.id], foes: [npcFoe('enel', world.minute)], choices: {} }
    const used = act(world, member, { kind: 'useItem', item: '衝擊貝', target: '艾涅爾' })
    assert.match(used.text, new RegExp('接下來 ' + rounds + ' 回合'))
  }
})

test('巨人上船佔 2 個座位：四人隊伍有巨人就坐不下小帆船', () => {
  const world = newWorld('RACES00002', 'host')
  world.started = true
  world.calmSeas = true
  const ids = ['host', 'b', 'c', 'd']
  world.members = ids.map((id, i) => ({ id, host: i === 0, ready: true, agree: true, approved: true, character: { ...make(i === 3 ? '巨人' : '人類'), place: 'dock' as const } }))
  world.ship = { owner: 'host', port: 'dock', hull: 100, wood: 2, trips: 0 }
  const text = resolve(world, world.members[0], { kind: 'sail', order: 'depart', destination: 'shells' }, '', dice(), new Set(ids)).text
  assert.match(text, /座位不足.*巨人佔 2 個座位/)
})

test('舊存檔：自訂種族「其他」改成人類並補 1 點，毛皮族補上電擊，只補一次', () => {
  const world = newWorld('RACES00003', 'host')
  const c = world.members[0].character = make('毛皮族')
  Object.assign(c, { race: '其他', otherRace: '長頸族', raceReady: undefined, unspent: 0 })
  c.techniques = []
  normalizeWorld(world)
  assert.equal(c.race, '人類')
  assert.equal('otherRace' in c, false)
  assert.equal(c.unspent, 1)
  normalizeWorld(world)
  assert.equal(c.unspent, 1)
  const mink = world.members[0].character = make('毛皮族')
  mink.techniques = []
  delete mink.raceReady
  normalizeWorld(world)
  normalizeWorld(world)
  assert.deepEqual(mink.techniques.map(move => move.name), ['電擊'])
})

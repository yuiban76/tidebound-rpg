// 職業: the job on the character card replaced the free choice of starting skills.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { characterInput, professionIds } from '../packages/shared/protocol.ts'
import type { LocationId, Profession } from '../packages/shared/protocol.ts'
import { makeCharacter, resolve } from '../packages/rules/engine.ts'
import { partPrice, shipwright } from '../packages/world/ships.ts'
import { professions, startingSkills } from '../packages/world/professions.ts'
import { newWorld } from '../packages/world/village.ts'
import type { Member, World } from '../packages/world/village.ts'
import { character } from './fixtures.ts'

const dice = (...script: number[]) => (sides: number) => Math.min(sides, script.length ? script.shift()! : sides)
const online = new Set(['host', 'mate'])

function crew(place: LocationId, mine: Profession, theirs?: Profession) {
  const world = newWorld('JOBS000001', 'host')
  world.started = true
  world.calmSeas = true
  const me = world.members[0] as Member
  me.character = makeCharacter({ ...character('阿浪'), profession: mine })
  me.character.place = place
  if (theirs) {
    const mate = { ...structuredClone(me), id: 'mate', host: false } as Member
    mate.character = makeCharacter({ ...character('米拉'), profession: theirs })
    mate.character.place = place
    world.members.push(mate)
  }
  return { world, me, c: me.character }
}
const act = (world: World, member: Member, intent: Parameters<typeof resolve>[2], roll = dice()) => resolve(world, member, intent, '', roll, online)

test('角色卡只選職業，不再選初始技能；每個職業加 3 級技能，攻擊方式另帶 2 級武器技能', () => {
  assert.equal(characterInput.safeParse({ ...character('甲'), major: '劍術' }).success, false)
  const { profession: _, ...missing } = character('甲')
  assert.equal(characterInput.safeParse(missing).success, false)
  assert.equal(professionIds.length, 8)
  for (const id of professionIds) {
    const ranks = startingSkills('fist', id)
    assert.equal(Object.values(ranks).reduce((a, b) => a + b, 0), 5, id)
    assert.ok(ranks['格鬥']! >= 2, id)
    assert.ok(professions[id].perk && professions[id].like, id)
  }
  assert.deepEqual(startingSkills('musket', 'sniper'), { 射擊: 3, 觀察: 2 })
  const doctor = makeCharacter({ ...character('醫'), profession: 'doctor' })
  assert.deepEqual([doctor.skillRanks['醫術'], doctor.inventory['繃帶'], doctor.inventory['醫療工具']], [2, 2, 1])
  const sniper = makeCharacter({ ...character('槍'), fighting: 'musket', profession: 'sniper' })
  assert.equal(sniper.inventory['火槍彈藥'], 10, '火槍 5 發加狙擊手 5 發')
  assert.equal(makeCharacter({ ...character('廚'), profession: 'cook' }).inventory['帶骨肉'], 2)
})

test('音樂家在同地休息時替大家演奏；廚師照舊做飯', () => {
  const { world, me, c } = crew('square', 'musician')
  c.sta = 1
  const text = act(world, me, { kind: 'rest', sleep: false }).text
  assert.match(text, /你演奏了一曲，多回復了 6 STA/)
  const cook = crew('square', 'cook')
  cook.c.sta = 1
  assert.match(act(cook.world, cook.me, { kind: 'rest', sleep: false }).text, /你做了一頓飯/)
})

test('船匠像船匠夥伴一樣讓改裝便宜、修船多修；同伴是船匠也算', () => {
  const { world } = crew('dock', 'fighter', 'shipwright')
  assert.equal(shipwright(world), '米拉')
  assert.equal(partPrice(world, 'sail', 1), 150_000 * .8)
  const plain = crew('dock', 'fighter')
  assert.equal(shipwright(plain.world), undefined)
  assert.equal(partPrice(plain.world, 'sail', 1), 150_000)
})

test('考古學家在場，島上委託的搜索判定 +2', () => {
  const search = (job: Profession) => {
    const { world, me } = crew('shellsTown', job)
    world.islandTasks = { shells: { stage: 'active' } }
    me.character!.place = 'marineBase'
    return Number(/合計 (\d+)/.exec(act(world, me, { kind: 'islandTask', step: 'search' }, dice(5)).text)?.[1])
  }
  assert.equal(search('archaeologist') - search('musician'), 2 + 2 - 0, '觀察 2 的底子，加上考古學家 +2')
})

test('戰鬥員防禦 +1；航海士讓航行少遇上麻煩', () => {
  const defenseOf = (job: Profession) => {
    const { world, me } = crew('square', job)
    const text = act(world, me, { kind: 'attack', target: '村長' }, dice(1, 10, 1)).text
    return Number(/村長反擊阿浪，D20 \d+，合計 \d+／(\d+)/.exec(text)?.[1])
  }
  assert.equal(defenseOf('fighter') - defenseOf('navigator'), 1 + 2, '戰鬥員 +1，閃避 2 也算在防禦裡')
  // One roll of 16 means trouble for an ordinary Grand Line crossing, but a navigator sees it coming.
  const sail = (job: Profession) => {
    const { world, me, c } = crew('twinPort', job)
    world.calmSeas = false
    world.ship = { owner: me.id, port: 'twinPort', hull: 100, wood: 0, trips: 0 }
    c.inventory['記錄指針'] = 1
    return act(world, me, { kind: 'sail', order: 'depart', destination: 'whiskyPeak' }, dice(10, 16, 1)).text
  }
  assert.match(sail('fighter'), /航行途中/)
  assert.doesNotMatch(sail('navigator'), /航行途中/)
})

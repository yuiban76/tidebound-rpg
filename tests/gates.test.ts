// 守關海賊團, 四處找架打 and the level caps of each sea.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { islandIds } from '../packages/shared/protocol.ts'
import { capOf, grantXp, makeCharacter, maxHP, resolve, xpToNext } from '../packages/rules/engine.ts'
import { raiseCaps, settleOldSave } from '../packages/rules/gates.ts'
import { timeskip } from '../packages/rules/timeskip.ts'
import { familiarIntent } from '../packages/world/explore.ts'
import { capAt, gateBlock, gateCrews, islandOrder, seaOf } from '../packages/world/gates.ts'
import { levelCaps, levelHit } from '../packages/world/growth.ts'
import { islands } from '../packages/world/sea.ts'
import { newWorld } from '../packages/world/village.ts'
import type { Member, World } from '../packages/world/village.ts'
import { character } from './fixtures.ts'

const dice = (...script: number[]) => (sides: number) => Math.min(sides, script.length ? script.shift()! : sides)
const online = new Set(['host'])

function party(place: string, level = 1) {
  const world = newWorld('GATES00001', 'host')
  world.started = true
  world.calmSeas = true
  const member = world.members[0] as Member
  member.character = { ...makeCharacter(character('阿浪')), level, place: place as never }
  member.character.hp = maxHP(member.character)
  member.character.sta = 999
  return { world, member, c: member.character }
}
const act = (world: World, member: Member, intent: Parameters<typeof resolve>[2], roll = dice()) => resolve(world, member, intent, '', roll, online)
/** Swings until the fight is over (high rolls), at most a few dozen rounds. */
function win(world: World, member: Member) {
  let text = ''
  for (let i = 0; i < 60 && world.combat; i++) {
    // The test is about what winning does, not about surviving: the hero cannot fall.
    member.character!.hp = 1_000_000
    text = act(world, member, { kind: 'attack' }, dice(...Array(30).fill(20))).text
  }
  return text
}

test('每座島的守關是原作在那座島的敵人，越後面越強，而且不超過那片海的等級上限', () => {
  assert.deepEqual([...islandOrder].sort(), [...islandIds].sort(), '每座島都排進航海順序')
  let last = 0
  for (const island of islandOrder) {
    const gate = gateCrews[island]
    assert.ok(gate.level > last, island + ' 比前一座島強')
    assert.ok(gate.level <= levelCaps[seaOf(island)], island + ' 不超過等級上限')
    last = gate.level
  }
  assert.deepEqual([seaOf('loguetown'), seaOf('twinCape'), seaOf('marineford'), seaOf('fishmanIsland')], ['east', 'paradise', 'paradise', 'newWorld'])
  assert.deepEqual(familiarIntent('挑戰守關海賊團'), { kind: 'challenge' })
  assert.deepEqual(familiarIntent('四處找架打'), { kind: 'hunt' })
  assert.deepEqual(familiarIntent('練等'), { kind: 'hunt' })
})

test('沒打倒守關海賊團不能往下一座島；回頭的航線一直都開著', () => {
  const { world, member } = party('dock', 10)
  world.ship = { owner: 'host', port: 'dock', hull: 100, wood: 2, trips: 0 }
  assert.match(gateBlock(world, 'wind', 'shells') ?? '', /希古瑪山賊團/)
  assert.match(act(world, member, { kind: 'sail', order: 'depart', destination: 'shells' }).text, /要先打倒他們/)
  assert.equal(gateBlock(world, 'shells', 'wind'), undefined, '往回走不用打')
  world.gates = { wind: true }
  assert.equal(act(world, member, { kind: 'sail', order: 'depart', destination: 'shells' }).rejected, undefined)
})

test('挑戰守關：只能在港口，打贏後航路打開、拿經驗值和戰利品；主線的同一批人一點都沒變', () => {
  const { world, member, c } = party('square', 12)
  assert.match(act(world, member, { kind: 'challenge' }).text, /守在風車村港口/)
  c.place = 'dock'
  const start = act(world, member, { kind: 'challenge' })
  assert.match(start.text, /希古瑪山賊團/)
  assert.ok(world.combat?.gate === 'wind')
  assert.ok(world.combat.foes.some(foe => foe.name.includes('希古瑪')))
  assert.ok(world.combat.foes.every(foe => !foe.npc && !foe.bounty), '守關戰不是主線：沒有角色代號、沒有賞金單')
  const money = c.money
  const xp = c.xp + (c.level - 1)
  const end = win(world, member)
  assert.match(end, /往下一座島的航路打開了/)
  assert.equal(world.gates?.wind, true)
  assert.ok(c.xp + (c.level - 1) > xp)
  assert.ok(c.money > money, '拿到戰利品')
  assert.match(act(world, member, { kind: 'challenge' }).text, /已經被你們打倒了/)
})

test('四處找架打：對手跟著等級走，每一場都拿全額經驗值和貝里', () => {
  const { world, member, c } = party('hill', 8)
  const gains: number[] = []
  for (let i = 0; i < 3; i++) {
    const before = c.xp + xpToNext(c.level) * 0 + c.level * 1_000_000
    const money = c.money
    assert.match(act(world, member, { kind: 'hunt' }, dice(1, 1, 99)).text, /8 級/)
    assert.ok(world.combat?.hunt)
    assert.ok(world.combat.foes.every(foe => foe.level === 8))
    win(world, member)
    assert.ok(c.money > money, '有貝里')
    gains.push(c.xp + c.level * 1_000_000 - before)
  }
  assert.ok(gains.every(gain => gain > 0) && gains[2] >= gains[0] - 1, '重複打不會遞減：' + gains)
})

test('等級上限：東海 20，經驗值會存著；到偉大航路後一次升上去；兩年修行不超過 50', () => {
  const { world, c } = party('dock', 19)
  assert.equal(capOf(c), levelCaps.east)
  grantXp(c, xpToNext(19) + xpToNext(20) * 4)
  assert.equal(c.level, 20)
  assert.ok(c.xp > xpToNext(20), '超過的經驗值存著')
  c.place = 'twinPort' as never
  const lines = raiseCaps(world)
  assert.match(lines.join(''), /等級上限提高到 50/)
  assert.ok(c.level >= 23, '存著的經驗值一次升上去：' + c.level)
  assert.equal(capAt('fishmanIsland'), 100)

  const old = party('square', 48)
  old.world.minute = 72 * 1440
  timeskip(old.world, dice(1))
  assert.equal(old.c.level, 50, '修行到偉大航路前半段的上限為止')
})

test('高等級成長變慢：30 級以後命中每級只多一點點', () => {
  assert.equal(levelHit(30) - levelHit(20), Math.floor(30 * .75) - Math.floor(20 * .75))
  assert.ok(levelHit(100) - levelHit(30) < 25)
})

test('舊存檔：已經走過的島直接算打倒了，等級上限跟著目前的海', () => {
  const { world, c } = party('nanohana', 20)
  c.xpLog = { 'island:shells': 1, 'island:drum': 1 }
  settleOldSave(world)
  for (const island of islandOrder.slice(0, islandOrder.indexOf('alabasta'))) assert.equal(world.gates?.[island], true, island)
  assert.equal(world.gates?.alabasta, undefined, '目前這座島還要打')
  assert.equal(c.cap, 50)
  assert.equal(islands.alabasta.port, 'nanohana')
})

test('守關打倒的是原作的敵人，但主線的他們照舊：巴其還在橘子鎮，主線一樣可以打，也可以不打直接走', () => {
  const { world, member, c } = party('orangePort', 30)
  c.place = 'orangePort' as never
  act(world, member, { kind: 'challenge' })
  assert.ok(world.combat?.foes.some(foe => foe.name.includes('巴其')))
  win(world, member)
  assert.equal(world.gates?.orange, true)
  assert.ok(!world.defeated?.includes('buggy'), '主線的巴其沒有被打倒')
  assert.ok(!world.npcDown?.buggy)
  world.ship = { owner: 'host', port: 'orangePort', hull: 100, wood: 2, trips: 0 }
  assert.equal(gateBlock(world, 'orange', 'syrup'), undefined, '不打主線也能往下一座島')
})

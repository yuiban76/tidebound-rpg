// A seeded Monte Carlo through the real combat rules. Typical fighters (sword, STR 4 / AGI 3 / CON 3, the weapon skill at its
// cap, some 閃避, a forged blade, sea stone in the bag) use advanced moves while they have STA. It locks the balance in
// the README: story bosses need a party at their level, guard fights are a fair duel, training fights wear you down a little.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { makeCharacter, maxHP, maxSTA, resolve, xpToNext } from '../packages/rules/engine.ts'
import { gateFoes } from '../packages/rules/gates.ts'
import { npcFoe, npcLevel } from '../packages/world/foes.ts'
import type { Foe } from '../packages/world/foes.ts'
import { gateCrews } from '../packages/world/gates.ts'
import { levelDamage, levelHit } from '../packages/world/growth.ts'
import { skillCap } from '../packages/world/skills.ts'
import { newWorld } from '../packages/world/village.ts'
import type { Member, World } from '../packages/world/village.ts'
import type { IslandId, NpcId } from '../packages/shared/protocol.ts'
import { character } from './fixtures.ts'

function seeded(seed: number) {
  let s = seed >>> 0
  return (sides: number) => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return 1 + Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * sides)
  }
}

function party(count: number, level: number) {
  const world = newWorld('BALANCE001', 'host')
  world.started = true
  world.members = Array.from({ length: count }, (_, i) => {
    const c = { ...makeCharacter({ ...character('甲乙丙丁'[i]), fighting: 'sword', profession: 'fighter' }), level, cap: 100, place: 'hill' as const }
    c.skillRanks['劍術'] = skillCap(level)
    c.skillRanks['閃避'] = Math.min(skillCap(level), Math.floor(level / 4))
    c.gear = { sword: level < 6 ? 0 : level < 12 ? 1 : level < 20 ? 2 : 3 }
    c.inventory['海樓石十手'] = 1
    c.hp = maxHP(c)
    c.sta = maxSTA(c)
    return { id: 'p' + i, host: i === 0, ready: true, agree: true, approved: true, character: c } as Member
  })
  return world
}
/** Fights to the end; a story boss facing several fighters gets their HP and strikes, as a real fight would give it. */
function fight(world: World, foes: Foe[], roll: (sides: number) => number) {
  const n = world.members.length
  for (const foe of foes) if (foe.npc && foe.tier >= 4 && n > 1) { foe.maxHp = foe.hp = Math.round(foe.maxHp * (1 + n) / 2); foe.strikes = n }
  world.combat = { round: 1, place: 'hill', participants: world.members.map(m => m.id), foes, choices: {} }
  const online = new Set(world.members.map(m => m.id))
  for (let round = 0; world.combat && round < 60; round++)
    for (const m of world.members) if (world.combat?.participants.includes(m.id))
      resolve(world, m, { kind: 'attack', style: m.character!.sta >= 5 ? 'advanced' : 'normal' }, '', roll, online)
  return world.members.some(m => m.character!.hp > 0)
}
function winRate(count: number, level: number, foes: () => Foe[], seed: number, trials = 120) {
  const roll = seeded(seed)
  let wins = 0
  for (let i = 0; i < trials; i++) if (fight(party(count, level), foes(), roll)) wins++
  return wins / trials
}
const after = 900 * 1440

test('原作頭目：同等級要組隊才打得贏，低 10 級幾乎沒機會，高 15 級單挑也穩', () => {
  for (const [npc, minute] of [['lucci', 0], ['doflamingo', after]] as [NpcId, number][]) {
    const L = npcLevel(npc, minute)
    const boss = () => [npcFoe(npc, minute)]
    const [one, two, four] = [winRate(1, L, boss, 11), winRate(2, L, boss, 12), winRate(4, L, boss, 14)]
    assert.ok(one > .15 && one < .55, `${npc} 單挑 ${one}`)
    assert.ok(two > .45 && two < .9, `${npc} 兩人 ${two}`)
    assert.ok(four > .75, `${npc} 四人 ${four}`)
    assert.ok(winRate(4, L - 10, boss, 15) < .15, `${npc} 低 10 級的四人隊`)
    assert.ok(winRate(1, L + 15, boss, 16) > .85, `${npc} 高 15 級單挑`)
  }
})

test('守關戰：照建議等級一個人是一場硬仗，兩個人比較穩', () => {
  for (const island of ['cocoyasi', 'water7', 'dressrosa'] as IslandId[]) {
    const L = gateCrews[island].level
    const one = winRate(1, L, () => gateFoes(island, 1), 21)
    const two = winRate(2, L, () => gateFoes(island, 2), 22)
    assert.ok(one > .35 && one < .9, `${island} 單人 ${one}`)
    assert.ok(two > .65 && two > one, `${island} 兩人 ${two}`)
  }
})

test('四處找架打：幾乎都會贏、每場掉一成多的 HP，大約 5 場升 1 級', () => {
  const roll = seeded(31)
  for (const level of [4, 30, 80]) {
    let wins = 0, lost = 0, xp = 0
    for (let i = 0; i < 60; i++) {
      const world = party(1, level)
      const m = world.members[0]
      const c = m.character!
      const before = c.xp + c.level * 1e7
      resolve(world, m, { kind: 'hunt' }, '', roll, new Set(['p0']))
      for (let round = 0; world.combat && round < 40; round++) resolve(world, m, { kind: 'attack', style: c.sta >= 5 ? 'advanced' : 'normal' }, '', roll, new Set(['p0']))
      if (c.hp > 0) wins++
      lost += 1 - c.hp / maxHP(c)
      xp += c.xp + c.level * 1e7 - before
    }
    assert.ok(wins / 60 > .95, `${level} 級勝率 ${wins / 60}`)
    assert.ok(lost / 60 > .05 && lost / 60 < .3, `${level} 級每場掉 ${lost / 60}`)
    const perLevel = xpToNext(level) / (xp / 60)
    assert.ok(perLevel > 4 && perLevel < 6.5, `${level} 級升一級要 ${perLevel} 場`)
  }
})

test('原作角色的強弱照原作排序，而且比他們出場那座島的守關稍強', () => {
  const order: [NpcId, number][] = [['buggy', 0], ['klahadore', 0], ['krieg', 0], ['arlong', 0], ['crocodile', 0], ['enel', 0], ['lucci', 0],
    ['hody', after], ['caesar', after], ['doflamingo', after], ['katakuri', after], ['kaido', after]]
  const levels = order.map(([npc, minute]) => npcLevel(npc, minute))
  assert.deepEqual([...levels].sort((a, b) => a - b), levels, '由弱到強：' + levels)
  for (const [npc, island] of [['buggy', 'orange'], ['arlong', 'cocoyasi'], ['crocodile', 'alabasta'], ['enel', 'skypiea'], ['lucci', 'eniesLobby'],
    ['hody', 'fishmanIsland'], ['doflamingo', 'dressrosa'], ['kaido', 'wano']] as [NpcId, IslandId][])
    assert.ok(npcLevel(npc, npc === 'hody' || npc === 'doflamingo' || npc === 'kaido' ? after : 0) >= gateCrews[island].level, npc + ' 不比守關弱')
  assert.ok(npcLevel('smoker', 0) > 20 && npcLevel('whitebeard', 0) > 90, '東海的斯摩格、頂上戰爭的白鬍子都不是當時打得贏的對手')
  assert.ok(npcLevel('zoro', after) > npcLevel('zoro', 0) + 40, '兩年後的人變強了')
})

test('高等級成長變慢：30 級以後命中、傷害每級加得比較少', () => {
  assert.equal(levelHit(30) - levelHit(20), 7)
  assert.ok(levelHit(100) - levelHit(70) < levelHit(30) - levelHit(0))
  assert.ok(levelDamage(100) - levelDamage(70) < levelDamage(30) - levelDamage(0))
})

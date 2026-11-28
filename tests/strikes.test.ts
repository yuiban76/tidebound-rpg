// The attack animation: which blows landed, who struck whom, and which effect each one gets.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { npcs } from '../packages/shared/protocol.ts'
import type { NpcId } from '../packages/shared/protocol.ts'
import { makeCharacter, resolve } from '../packages/rules/engine.ts'
import { npcFoe } from '../packages/world/foes.ts'
import { fruitMoves, fruitOf, fruits } from '../packages/world/fruits.ts'
import type { FruitId } from '../packages/world/fruits.ts'
import { effectOfMove, effects, fruitEffect, lineUp, npcStyle, pickStrikes, strikesIn } from '../packages/world/strikes.ts'
import type { Attacker } from '../packages/world/strikes.ts'
import { diceIn } from '../packages/shared/dice.ts'
import { newWorld } from '../packages/world/village.ts'
import { character } from './fixtures.ts'

const wave: Attacker = { name: '阿浪', weapon: 'sword', techniques: [{ name: '風車斬', style: 'special' }, { name: '火焰踢', style: 'advanced' }, { name: '必殺', style: 'flurry' }] }
const burner: Attacker = { name: '小川', weapon: 'fist', fruit: 'mera', techniques: fruitMoves.mera.map(name => ({ name, style: 'special', fruit: true as const })) }
const players = [wave, burner]
const blow = (move: string, from = '阿浪') => strikesIn(from + '對海王類使出' + move + '，D20 13，合計 23／15，傷害 210（武器骰 6，數值×10）。海王類 HP 140／350。', players)[0]

test('每一種攻擊都讀得出來：普通、強力、招式、開砲、夥伴、反擊，沒打中的不演', () => {
  const strikes = strikesIn([
    '第 1 回合',
    '阿浪對海王類使出攻擊，D20 13，合計 23／15，傷害 210（武器骰 6，數值×10）。海王類 HP 140／350。',
    '阿浪對海王類使出攻擊，D20 3，合計 9／15，未命中。',
    '小川對海王類開砲，D20 20，合計 30／15，傷害 120。海王類 HP 20／350。',
    '索隆使出三刀流攻擊海王類，D20 18，合計 27／15，傷害 90。海王類 HP 0／350。',
    '海王類倒下了。',
    '艾涅爾使出蠻力攻擊攻擊海軍士兵甲，D20 18，合計 27／15，傷害 90。海軍士兵甲 HP 10／200。',
    '小川按下火焰貝，一道火柱噴向海軍士兵甲，傷害 180。海軍士兵甲 HP 0／200。海軍士兵甲倒下了。',
    '海軍士兵乙反擊阿浪，D20 9，合計 24／19，傷害 80。',
    '海軍士兵丙反擊索隆，D20 15，合計 25／19，傷害 60。',
    '索隆倒下了，需要休息一陣子。',
  ].join('\n'), players)
  assert.deepEqual(strikes.map(s => [s.from, s.to, s.side, s.effect, s.damage, s.crit, s.ko]), [
    ['阿浪', '海王類', 'ours', 'slash', 210, false, false],
    ['小川', '海王類', 'ours', 'cannon', 120, true, false],
    ['索隆', '海王類', 'ours', 'threeSword', 90, false, true],
    ['艾涅爾', '海軍士兵甲', 'ours', 'lightning', 90, false, false],
    ['小川', '海軍士兵甲', 'ours', 'fire', 180, false, true],
    ['海軍士兵乙', '阿浪', 'foe', 'gun', 80, false, false],
    ['海軍士兵丙', '索隆', 'foe', 'gun', 60, false, true],
  ])
  assert.deepEqual([strikes[0].hp, strikes[0].maxHp, strikes[5].hp], [140, 350, undefined])
  assert.deepEqual(strikesIn('你抵達風車村港口。\n觀察 D20 14，合計 17／10，成功。', players), [])
})

test('招式的特效：自創招式看名稱，沒線索就看武器；越貴的招越重', () => {
  assert.deepEqual([blow('攻擊').effect, blow('攻擊').move, blow('攻擊').power], ['slash', undefined, 1])
  assert.equal(blow('強力攻擊').move, '強力攻擊')
  assert.ok(blow('強力攻擊').power > 1)
  assert.deepEqual([blow('「風車斬」').effect, blow('「風車斬」').move], ['airSlash', '風車斬'])
  assert.equal(blow('「火焰踢」').effect, 'fire')
  assert.equal(blow('「必殺」').effect, 'slash')
  assert.ok(blow('「必殺」').power > blow('「火焰踢」').power && blow('「火焰踢」').power > blow('「風車斬」').power)
  for (const [move, effect] of [['魚人空手道', 'water'], ['電擊', 'electro'], ['雷光斬', 'lightning'], ['冰柱突刺', 'ice'], ['旋風腳', 'airSlash'], ['百裂拳', 'punch'], ['回旋踢', 'kick'],
    ['櫻花斬', 'petalBlade'], ['彗星狙擊', 'light'], ['鐵槌', 'hammer'], ['猛虎爪', 'claw'], ['暗影刃', 'dark'], ['黃金長槍', 'thrust']] as const) assert.equal(effectOfMove(move), effect, move)
})

test('惡魔果實：每一顆都有特效，十招一招比一招重，能力者的強力攻擊也用果實', () => {
  for (const id of Object.keys(fruits) as FruitId[]) {
    assert.ok(effects.includes(fruitEffect[id]), id)
    const user: Attacker = { name: '小川', weapon: 'fist', fruit: id, techniques: fruitMoves[id].map(name => ({ name, style: 'special', fruit: true as const })) }
    const powers = fruitMoves[id].map(name => {
      const strike = strikesIn('小川對村長使出「' + name + '」，D20 13，合計 23／15，傷害 210（武器骰 6，數值×10）。村長 HP 1／350。', [user])[0]
      assert.equal(strike.effect, fruitEffect[id], id + name)
      assert.equal(strike.move, name)
      return strike.power
    })
    assert.deepEqual(powers, [...powers].sort((a, b) => a - b), id)
    assert.ok(powers[9] > powers[0])
  }
  assert.deepEqual([blow('攻擊', '小川').effect, blow('強力攻擊', '小川').effect], ['punch', 'fire'])
})

test('原作人物用自己的打法；果實被拿走的人不再放出能力', () => {
  const style = (id: NpcId) => npcStyle(npcs[id]).effect
  assert.deepEqual((['luffy', 'zoro', 'sanji', 'nami', 'usopp', 'franky', 'mihawk', 'garp', 'jinbe', 'klahadore', 'dorry'] as NpcId[]).map(style),
    ['gum', 'threeSword', 'fireKick', 'weather', 'sling', 'rocketFist', 'blackBlade', 'bigPunch', 'water', 'claw', 'axe'])
  for (const [npc, fruit] of Object.entries(fruitOf) as [NpcId, FruitId][]) {
    assert.ok(effects.includes(style(npc)), npc)
    assert.ok(['punch', 'slash'].includes(npcStyle(npcs[npc], { [npc]: true }).effect), npc + ' 失去' + fruit)
  }
  for (const name of Object.values(npcs)) assert.ok(effects.includes(npcStyle(name).effect), name)
  assert.equal(npcStyle('海王類').effect, 'bite')
  assert.equal(npcStyle('魚人海賊甲').effect, 'water')
})

test('太多攻擊時，擊倒和玩家的優先，順序不變', () => {
  const lines = Array.from({ length: 9 }, (_, i) => '海軍士兵' + '甲乙丙丁戊己庚辛壬'[i] + '反擊索隆，D20 9，合計 24／19，傷害 8。')
  const strikes = strikesIn([...lines, '阿浪對海軍士兵甲使出攻擊，D20 9，合計 24／19，傷害 80（武器骰 1，數值×10）。海軍士兵甲 HP 0／80。'].join('\n'), players)
  const shown = pickStrikes(strikes, ['阿浪'])
  assert.equal(shown.length, 7)
  assert.equal(shown.at(-1)!.from, '阿浪')
  assert.deepEqual(shown, strikes.filter(strike => shown.includes(strike)))
})

test('骰子盤：每個人一個名字，骰子在自己的名字下，攻擊兩端的名字都在盤上', () => {
  const round = [
    '索隆使出三刀流攻擊海軍士兵甲，D20 18，合計 27／15，傷害 90。海軍士兵甲 HP 0／200。',
    '海軍士兵甲倒下了。',
    '阿浪對海軍士兵乙使出高強度連續攻擊，D20 3，合計 9／15，未命中。',
    '阿浪對海軍士兵乙使出高強度連續攻擊，D20 13，合計 23／15，傷害 60（武器骰 6，數值×10）。海軍士兵乙 HP 140／200。',
    '阿浪勸海軍士兵乙住手：說服 D20 15，合計 18／13，海軍士兵乙收手了。',
    ...['丙', '丁', '戊', '己', '庚', '辛'].map(n => '海軍士兵' + n + '反擊阿浪，D20 9，合計 24／19，傷害 8。'),
  ].join('\n')
  const strikes = strikesIn(round, players)
  const { ours, foes, more, strikes: shown } = lineUp(diceIn(round), strikes, ['阿浪', '小川'])
  assert.deepEqual(ours.map(one => [one.name, one.rolls.length]), [['索隆', 1], ['阿浪', 2]])
  assert.equal(foes.length, 5, '每邊最多五個名字')
  assert.ok(foes.some(one => one.name === '海軍士兵甲' && !one.rolls.length), '沒出手就倒下的人也有名字')
  assert.ok(more > 0)
  const names = [...ours, ...foes].map(one => one.name)
  assert.equal(new Set(names).size, names.length)
  for (const strike of shown) assert.ok(names.includes(strike.from) && names.includes(strike.to))
  // With the dice switched off only the blows bring names onto the tray.
  const bare = lineUp([], strikes.slice(0, 1), ['阿浪'])
  assert.deepEqual([bare.ours, bare.foes], [[{ name: '索隆', rolls: [] }], [{ name: '海軍士兵甲', rolls: [] }]])
})

test('規則真的打出來的文字也讀得到', () => {
  const world = newWorld('STRIKES001', 'host')
  const member = world.members[0]
  const c = member.character = makeCharacter(character('阿浪'))
  // Zoro fights at his story strength (level 15): a level-20 fighter lands the scripted blow.
  c.level = 20
  world.started = true
  world.combat = { round: 1, place: c.place, participants: ['host'], foes: [npcFoe('zoro', 0)], choices: {} }
  const rolls = [19, 4, 19, 6]
  const result = resolve(world, member, { kind: 'attack' }, '', () => rolls.shift() ?? 19, new Set(['host']))
  const strikes = strikesIn(result.text, [c])
  assert.deepEqual(strikes.map(s => [s.from, s.to, s.side]), [['阿浪', '索隆', 'ours'], ['索隆', '阿浪', 'foe']])
  assert.equal(strikes[1].effect, 'threeSword')
})

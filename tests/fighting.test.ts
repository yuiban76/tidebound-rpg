// 攻擊方式: chosen at creation, it sets the starting weapon and adds a bonus while the character fights that way.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Weapon } from '../packages/shared/protocol.ts'
import { characterInput } from '../packages/shared/protocol.ts'
import { makeCharacter, resolve } from '../packages/rules/engine.ts'
import { newWorld, normalizeWorld } from '../packages/world/village.ts'
import type { Member } from '../packages/world/village.ts'
import { character } from './fixtures.ts'

const dice = (...script: number[]) => (sides: number) => Math.min(sides, script.length ? script.shift()! : sides)
const make = (fighting: Weapon) => makeCharacter({ ...character('旅人'), fighting })

test('角色卡不再有年齡與背景，攻擊方式必填', () => {
  assert.equal(characterInput.safeParse({ ...character('甲'), age: 20 }).success, false)
  assert.equal(characterInput.safeParse({ ...character('甲'), background: '港口' }).success, false)
  const { fighting: _, ...missing } = character('甲')
  assert.equal(characterInput.safeParse(missing).success, false)
})

test('攻擊方式決定初始武器，與主要專長無關', () => {
  assert.equal(make('fist').weapon, 'fist')
  assert.equal(make('spear').weapon, 'spear')
  assert.equal(make('spear').inventory['普通長槍'], 1)
  const gunner = make('musket')
  assert.deepEqual([gunner.weapon, gunner.inventory['普通火槍'], gunner.inventory['火槍彈藥'], 'loaded' in gunner], ['musket', 1, 5, false])
  assert.equal(make('spear').inventory['普通武士刀'], undefined)
  // The attack method brings its own weapon skill.
  assert.deepEqual([make('spear').skillRanks['長兵器'], make('spear').skillRanks['劍術']], [2, undefined])
})

test('用自己的攻擊方式戰鬥才有加成：刀劍命中、傷害各 +1，拳腳傷害 +2', () => {
  const fight = (fighting: Weapon, weapon: Weapon) => {
    const world = newWorld('FIGHTING01', 'host')
    world.started = true
    const member = world.members[0] as Member
    member.character = { ...make(fighting), place: 'square', weapon }
    return resolve(world, member, { kind: 'attack', target: '村長' }, '', dice(10, 1, 1), new Set(['host'])).text
  }
  const total = (text: string) => Number(/D20 10，合計 (\d+)/.exec(text)?.[1])
  const damage = (text: string) => Number(/傷害 (\d+)/.exec(text)?.[1])
  const own = fight('sword', 'sword')
  const other = fight('spear', 'sword')
  // The sword fighter also starts with 劍術 2 from the attack method; the spear fighter has 長兵器 instead.
  assert.equal(total(own) - total(other), 1 + 2)
  assert.equal(damage(own) - damage(other), 10)
  assert.equal(damage(fight('fist', 'fist')) - damage(fight('sword', 'fist')), 20)
})

test('舊存檔：刪掉年齡與背景，攻擊方式沿用原本由主要專長決定的武器', () => {
  const world = newWorld('FIGHTING02', 'host')
  const c = world.members[0].character = make('sword')
  const old = c as Omit<typeof c, 'fighting'> & { age?: number, background?: string, fighting?: Weapon }
  Object.assign(old, { age: 23, background: '曾在港口工作', major: '射擊' })
  delete old.fighting
  delete (old as { profession?: unknown }).profession
  normalizeWorld(world)
  assert.equal('age' in c, false)
  assert.equal('background' in c, false)
  assert.equal(c.fighting, 'musket')
  // Starting skills became a job: the one that fits the old main skill, and the ranks stay as they were.
  assert.equal(c.profession, 'sniper')
  assert.equal('major' in c, false)
})

test('火槍不用裝填：每開一槍自動用掉一發彈藥，沒子彈時不能開槍', () => {
  const world = newWorld('FIGHTING03', 'host')
  world.started = true
  const member = world.members[0] as Member
  member.character = { ...make('musket'), place: 'buggyBar', hp: 99_999 }
  const c = member.character
  c.inventory['火槍彈藥'] = 2
  const shoot = () => resolve(world, member, { kind: 'attack', target: '巴其' }, '', dice(10, 1, 1, 1, 1, 1, 1, 1), new Set(['host']))
  assert.equal(shoot().rejected, undefined)
  assert.equal(c.inventory['火槍彈藥'], 1)
  assert.equal(shoot().rejected, undefined, '第二槍不必先裝填')
  assert.equal(c.inventory['火槍彈藥'], undefined)
  assert.match(shoot().text, /火槍沒有子彈了/)
})

test('九種攻擊方式：各自的開局武器與技能；腿技不必帶東西，換武器的說法都聽得懂', async () => {
  const { weapons } = await import('../packages/shared/protocol.ts')
  const { familiarIntent } = await import('../packages/world/explore.ts')
  const { itemFor } = await import('../packages/world/village.ts')
  assert.equal(weapons.length, 9)
  for (const weapon of weapons) {
    const c = make(weapon)
    assert.equal(c.weapon, weapon)
    if (itemFor(weapon)) assert.equal(c.inventory[itemFor(weapon)!], 1, weapon)
  }
  assert.deepEqual([make('kick').skillRanks['格鬥'], make('bow').skillRanks['射擊'], make('staff').skillRanks['長兵器']], [2, 2, 2])
  for (const [text, weapon] of [['改用彈弓', 'sling'], ['改用腿技', 'kick'], ['改用鐵棍', 'staff'], ['改用大斧', 'heavy'], ['改用長弓', 'bow']] as const)
    assert.deepEqual(familiarIntent(text), { kind: 'equip', weapon })
})

test('武器的特色：火槍 d10 加傷害、重武器命中 −1、棍棒防禦 +1、弓箭的連續攻擊只要 4 STA', async () => {
  const { weaponStats, staFor } = await import('../packages/rules/combat.ts')
  assert.deepEqual([weaponStats.musket.die, weaponStats.musket.damage], [10, 1])
  assert.equal(weaponStats.heavy.hit, -1)
  assert.equal(staFor({ weapon: 'bow' }, 'flurry'), 4)
  assert.equal(staFor({ weapon: 'sword' }, 'flurry'), 7)
  const guard = (weapon: Weapon) => {
    const world = newWorld('FIGHTING04', 'host')
    world.started = true
    const member = world.members[0] as Member
    member.character = { ...make('sword'), place: 'square', weapon, hp: 99_999 }
    member.character.inventory['鐵棍'] = 1
    const text = resolve(world, member, { kind: 'attack', target: '村長' }, '', dice(1, 10, 1), new Set(['host'])).text
    return Number(/村長反擊旅人，D20 \d+，合計 \d+／(\d+)/.exec(text)?.[1])
  }
  assert.equal(guard('staff') - guard('sword'), 1)
  // Top damage rolls: the musket's d10 and bonus outweigh the sword even with the lower attribute.
  const shot = (weapon: Weapon) => {
    const world = newWorld('FIGHTING05', 'host')
    world.started = true
    const member = world.members[0] as Member
    member.character = { ...make(weapon), place: 'square', hp: 99_999 }
    return Number(/傷害 (\d+)/.exec(resolve(world, member, { kind: 'attack', target: '村長' }, '', dice(15), new Set(['host'])).text)?.[1])
  }
  assert.ok(shot('musket') > shot('sword'))
})

test('六項屬性都有創角時看得到的說明，寫的數字和規則一致', async () => {
  const { attributes } = await import('../packages/shared/protocol.ts')
  const { attributeUses } = await import('../packages/world/skills.ts')
  const { maxHP, maxSTA } = await import('../packages/rules/engine.ts')
  for (const key of attributes) assert.ok(attributeUses[key].short && attributeUses[key].long, key)
  const base = make('sword')
  const tougher = { ...base, stats: { ...base.stats, CON: base.stats.CON + 1 } }
  const firmer = { ...base, stats: { ...base.stats, WIL: base.stats.WIL + 1 } }
  assert.ok(attributeUses.CON.long.includes('HP 上限 +' + (maxHP(tougher) - maxHP(base)) + '、STA 上限 +' + (maxSTA(tougher) - maxSTA(base))))
  assert.ok(attributeUses.WIL.long.includes('STA 上限 +' + (maxSTA(firmer) - maxSTA(base))))
})

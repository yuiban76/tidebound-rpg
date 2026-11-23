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
  assert.deepEqual([gunner.weapon, gunner.inventory['普通火槍'], gunner.inventory['火槍彈藥'], gunner.loaded], ['musket', 1, 5, true])
  // The main skill is still 劍術 in the fixture, yet the spear fighter starts without a sword.
  assert.equal(make('spear').inventory['普通武士刀'], undefined)
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
  assert.equal(total(own) - total(other), 1)
  assert.equal(damage(own) - damage(other), 10)
  assert.equal(damage(fight('fist', 'fist')) - damage(fight('sword', 'fist')), 20)
})

test('舊存檔：刪掉年齡與背景，攻擊方式沿用原本由主要專長決定的武器', () => {
  const world = newWorld('FIGHTING02', 'host')
  const c = world.members[0].character = make('sword')
  const old = c as Omit<typeof c, 'fighting'> & { age?: number, background?: string, fighting?: Weapon }
  Object.assign(old, { age: 23, background: '曾在港口工作', major: '射擊' })
  delete old.fighting
  normalizeWorld(world)
  assert.equal('age' in c, false)
  assert.equal('background' in c, false)
  assert.equal(c.fighting, 'musket')
})

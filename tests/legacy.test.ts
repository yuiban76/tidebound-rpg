// Saves from before the original side content (潮燈島, 霧灣島, the 潮汐簿 quest and its NPCs) was removed still load.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { makeCharacter } from '../packages/rules/engine.ts'
import { newWorld, normalizeWorld } from '../packages/world/village.ts'
import type { World } from '../packages/world/village.ts'
import { character } from './fixtures.ts'

test('舊存檔裡已移除的島、NPC 與潮汐簿委託會被清掉，人和船回到風車村港口', () => {
  const world = newWorld('LEGACY0001', 'host') as World & Record<string, unknown>
  const c = world.members[0].character = makeCharacter(character('旅人'))
  Object.assign(c, { place: 'lighthouse', conversingWith: 'lamplighter' })
  c.inventory['潮汐簿'] = 1
  Object.assign(world, {
    quest: 'recovered', clue: true, courierHP: 200, settled: true, logHolder: 'host',
    ship: { owner: 'host', port: 'lanternPort', hull: 90, wood: 2, trips: 1, borrowed: true },
    sailing: { from: 'lantern', ballots: { host: { to: 'mist', pace: 'steady' } }, ready: [] },
    islandTasks: { lantern: { stage: 'done' }, shells: { stage: 'active' } },
    companions: { lamplighter: { leader: 'host', since: 0, hp: 50 } },
    npcDown: { courier: 9999 }, defeated: ['courier', 'arlong'],
    renown: { marineHeat: 0, islandRep: { mist: 5, wind: 3 } },
  })
  ;(world.memories as Record<string, string[]>).clerk = ['舊對話']

  normalizeWorld(world)
  for (const key of ['quest', 'clue', 'courierHP', 'settled', 'logHolder']) assert.equal(key in world, false, key)
  assert.equal(c.place, 'dock')
  assert.equal(c.conversingWith, null)
  assert.equal(c.inventory['潮汐簿'], undefined)
  assert.deepEqual(world.ship, { owner: 'host', port: 'dock', hull: 90, wood: 2, trips: 1 })
  assert.equal(world.sailing, undefined)
  assert.deepEqual(world.islandTasks, { shells: { stage: 'active' } })
  assert.deepEqual(world.companions, {})
  assert.deepEqual(world.npcDown, {})
  assert.deepEqual(world.defeated, ['arlong'])
  assert.deepEqual(world.renown?.islandRep, { wind: 3 })
  assert.equal('clerk' in world.memories, false)
})

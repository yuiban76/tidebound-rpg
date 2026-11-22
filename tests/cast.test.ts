import assert from 'node:assert/strict'
import { test } from 'node:test'
import { makeCharacter } from '../packages/rules/engine.ts'
import { castNpcs } from '../packages/shared/atlas.ts'
import { locations, npcs } from '../packages/shared/protocol.ts'
import type { LocationId, NpcId } from '../packages/shared/protocol.ts'
import { castPeople, castProfiles, castRoutes } from '../packages/world/cast.ts'
import { minuteOf } from '../packages/world/canon.ts'
import { recruitable, cannotJoin } from '../packages/world/companions.ts'
import { islandAt } from '../packages/world/sea.ts'
import { advanceTimeline } from '../packages/world/timeline.ts'
import { newWorld, npcPlace, people } from '../packages/world/village.ts'
import type { Member } from '../packages/world/village.ts'
import { character } from './fixtures.ts'

const at = (day: number, hour: number) => (day - 1) * 1440 + hour * 60
const ids = Object.keys(castNpcs) as (keyof typeof castNpcs)[]

function party() {
  const world = newWorld('CAST000001', 'host')
  world.started = true
  const first = world.members[0] as Member
  first.character = makeCharacter(character('旅人'))
  first.character.place = 'square'
  world.minute = at(1, 8)
  return world
}

test('新增的人氣角色都有名字、資料、戰力，也都能招募或有不能招募的理由', () => {
  assert.ok(ids.length >= 35)
  for (const id of ids) {
    assert.ok(npcs[id] && castPeople[id] && castProfiles[id] && people[id], id)
    assert.ok(recruitable[id] || cannotJoin[id], id + ' 缺招募設定')
  }
  assert.equal(new Set(Object.values(npcs)).size, Object.keys(npcs).length, '名字不可重複')
})

test('行程依時間排序，地點都存在，且不會一天到晚瞬間移動', () => {
  for (const [npc, stops] of Object.entries(castRoutes)) {
    let last = 0
    for (const stop of stops!) {
      const minute = minuteOf(stop.at)
      assert.ok(minute >= last, npc + ' 的行程沒有依時間排序')
      last = minute
      if (stop.place) assert.ok(locations[stop.place], npc + ' 的地點不存在')
    }
  }
})

test('Day 1 的位置：巴其占著橘子鎮、達丹在山上、娜美還在海上', () => {
  const world = party()
  assert.equal(npcPlace(world, 'buggy'), 'orangeStreet')
  assert.equal(npcPlace(world, 'dadan'), 'hill')
  assert.equal(npcPlace(world, 'nami'), null)
})

test('時間線一路走下來：娜美、鷹眼、黃猿、馬可會在原作的時間出現在原作的地方', () => {
  const world = party()
  const where = (npc: NpcId) => npcPlace(world, npc)
  const step = (day: number, hour: number) => { world.minute = at(day, hour); advanceTimeline(world) }
  step(3, 8)
  assert.equal(where('nami'), 'orangeStreet')
  step(7, 10)
  assert.equal(where('nami'), 'arlongPark')
  step(9, 0)
  assert.equal(where('nami'), null)
  assert.equal(where('buggy'), null)
  step(9, 13)
  assert.equal(where('buggy'), 'logueSquare')
  step(6 + 0, 0) // going backwards must not move anyone
  assert.equal(where('buggy'), 'logueSquare')
  step(58, 18)
  assert.equal(where('kizaru'), 'sabaodyGrove')
  assert.equal(where('kuma'), 'sabaodyGrove')
  assert.equal(where('law'), 'sabaodyGrove')
  step(72, 13)
  for (const npc of ['mihawk', 'doflamingo', 'marco', 'akainu', 'garp'] as NpcId[]) assert.ok(where(npc), npc + ' 應在戰場上')
  assert.equal(islandAt(where('marco')!), 'marineford')
  step(72, 22)
  assert.equal(where('marco'), null)
})

test('一路跳過很多天也不會漏掉：直接睡到戰爭那天，每個人都在最後該在的地方', () => {
  const world = party()
  world.minute = at(72, 13)
  advanceTimeline(world)
  assert.equal(npcPlace(world, 'jinbe'), 'marinefordBay')
  assert.equal(npcPlace(world, 'nami'), null)
  assert.equal(npcPlace(world, 'koby'), 'marinefordBay')
})

test('被招募的夥伴不會被這份行程帶走', () => {
  const world = party()
  world.crew = true as never
  world.companions = { nami: { leader: world.members[0].id, hp: 20, level: 1 } } as never
  world.minute = at(8, 20)
  advanceTimeline(world)
  assert.equal(npcPlace(world, 'nami'), 'square')
})

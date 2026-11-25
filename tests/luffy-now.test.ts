import assert from 'node:assert/strict'
import { test } from 'node:test'
import { makeCharacter } from '../packages/rules/engine.ts'
import { luffyRoute, canonTimeline } from '../packages/world/canon.ts'
import { luffyDoing, luffyNow, stopId } from '../packages/world/luffy.ts'
import { advanceTimeline } from '../packages/world/timeline.ts'
import { newWorld } from '../packages/world/village.ts'
import { character } from './fixtures.ts'

function scene() {
  const world = newWorld('LUFFYNOW01', 'host')
  world.members[0].character = makeCharacter(character('旅人'))
  world.members[0].character.place = 'square'
  world.started = true
  return world
}
/** Sails through the calendar hour by hour, as play does. */
function to(world: ReturnType<typeof scene>, day: number, hour: number) {
  const end = (day - 1) * 1440 + hour * 60
  while (world.minute < end) {
    world.minute = Math.min(end, world.minute + 60)
    advanceTimeline(world)
  }
  return luffyNow(world)
}

test('魯夫的每一站都寫了他在做什麼，沒有多餘或打錯的站', () => {
  assert.deepEqual(Object.keys(luffyDoing).sort(), luffyRoute.map(stopId).sort())
  const events = new Set(canonTimeline.map(event => event.id))
  for (const note of Object.values(luffyDoing)) for (const [event] of note.then ?? []) assert.ok(events.has(event), event)
})

test('照原作走時，行蹤跟著日子變', () => {
  const world = scene()
  assert.deepEqual([luffyNow(world).place, luffyNow(world).where], [null, '東海上（剛離開風車村）'])
  assert.match(to(world, 2, 9).doing, /打聽.*索隆/)
  assert.match(to(world, 2, 13).doing, /打倒了蒙卡/)
  assert.deepEqual([to(world, 2, 17).where, luffyNow(world).since], ['海上（剛離開謝爾茲鎮）', 1440 + 16 * 60])
  assert.match(to(world, 8, 18).doing, /打垮了惡龍樂園/)
  assert.equal(to(world, 29, 20).where, '衝天海流上')
  assert.match(to(world, 44, 23).doing, /決鬥完/)
  assert.match(to(world, 48, 13).doing, /猶豫橋|路基/)
  assert.match(to(world, 52, 20).doing, /千陽號下水/)
  assert.equal(to(world, 60, 12).where, '下落不明')
  assert.match(to(world, 72, 18).doing, /艾斯|哥哥/)
  assert.equal(to(world, 73, 8).where, '下落不明')
})

test('玩家改變了故事，行蹤也跟著改', () => {
  const taken = scene()
  ;(taken.flags ??= {})['recruited:zoro'] = 1
  assert.match(to(taken, 2, 9).doing, /索隆早已跟別人走了/)
  assert.match(to(taken, 2, 17).doing, /想拉索隆入夥/)

  const arlong = scene()
  arlong.defeated = ['arlong']
  assert.deepEqual([to(arlong, 7, 16).place, /改變了航線/.test(luffyNow(arlong).doing)], [null, true])

  const free = scene()
  to(free, 60, 12)
  free.islandTasks = { ...free.islandTasks, impelDown: { stage: 'done' } }
  assert.match(to(free, 65, 12).doing, /離開女兒島/)
  assert.equal(luffyNow(free).where, '海上（剛離開女兒島）')
  assert.doesNotMatch(to(free, 72, 18).doing, /處刑台|艾斯倒下/)
})

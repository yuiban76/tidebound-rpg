import assert from 'node:assert/strict'
import { test } from 'node:test'
import { newWorld, npcFacts, npcPlace } from '../packages/world/village.ts'
import { advanceTimeline } from '../packages/world/timeline.ts'
import { luffyRoute, minuteOf } from '../packages/world/canon.ts'
import { makeCharacter } from '../packages/rules/engine.ts'
import { islandAt } from '../packages/world/sea.ts'
import { character } from './fixtures.ts'

const at = (day: number, hour: number) => (day - 1) * 1440 + hour * 60

function soloWorld(place: Parameters<typeof islandAt>[0]) {
  const world = newWorld('LUFFY00001', 'host')
  world.members[0].character = makeCharacter(character('旅人'))
  world.members[0].character.place = place
  world.started = true
  return world
}

test('魯夫不是玩家：他依自己的航路移動，第 1 天還在海上', () => {
  const world = soloWorld('square')
  assert.equal(npcPlace(world, 'luffy'), null)
  world.minute = at(2, 9)
  advanceTimeline(world)
  assert.equal(npcPlace(world, 'luffy'), 'shellsTown')
  world.minute = at(2, 17)
  advanceTimeline(world)
  assert.equal(npcPlace(world, 'luffy'), null)
  assert.match(npcFacts(world, 'luffy'), /索隆成為夥伴/)
})

test('隊伍剛好在同一座島時會目擊魯夫出現，不在時不會收到通知', () => {
  const here = soloWorld('orangeStreet')
  here.minute = at(3, 11)
  const seen = advanceTimeline(here)
  assert.ok(seen.some(item => item.text === '【目擊】戴草帽的少年魯夫出現在橘子鎮大街。'))
  assert.equal(npcPlace(here, 'luffy'), 'orangeStreet')

  const away = soloWorld('square')
  away.minute = at(3, 11)
  assert.ok(!advanceTimeline(away).some(item => item.text.includes('戴草帽的少年魯夫出現')))
})

test('玩家先從推進城救出艾斯後，魯夫就不會去推進城與馬林福特處刑台', () => {
  const world = soloWorld('square')
  world.islandTasks = { impelDown: { stage: 'done' } }
  world.minute = at(64, 12)
  advanceTimeline(world)
  assert.notEqual(npcPlace(world, 'luffy'), 'impelGate')
  world.minute = at(72, 13)
  advanceTimeline(world)
  assert.notEqual(npcPlace(world, 'luffy'), 'scaffold')
})

test('魯夫的航路依時間排序，每一站都是存在的地點', () => {
  const times = luffyRoute.map(stop => minuteOf(stop.at))
  assert.deepEqual(times, [...times].sort((a, b) => a - b))
  for (const stop of luffyRoute) if (stop.place) assert.ok(islandAt(stop.place), stop.place)
})

// Canon landmarks beyond the first three places: every island's network is complete, drawn and walkable.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { IslandId } from '../packages/shared/protocol.ts'
import { locations } from '../packages/shared/protocol.ts'
import { familiarIntent, routeBetween } from '../packages/world/explore.ts'
import { islandAt, islands } from '../packages/world/sea.ts'
import { islandLayouts } from '../packages/world/sites.ts'
import { paths, walkMinutes } from '../packages/world/village.ts'

test('每座有版圖的島：所有地點都有座標，道路連通且不跨島，港口仍是第一個地點', () => {
  for (const [id, layout] of Object.entries(islandLayouts) as [IslandId, NonNullable<typeof islandLayouts[IslandId]>][]) {
    const places = islands[id].places
    assert.deepEqual(Object.keys(layout.at).sort(), [...places].sort(), id + ' 的座標要涵蓋全島')
    for (const [a, b] of layout.roads) assert.ok(islandAt(a) === id && islandAt(b) === id, id + '：' + a + '–' + b)
    for (const place of places) assert.ok(routeBetween(islands[id].port, place).length > 0, id + ' 走不到 ' + place)
    assert.equal(islands[id].port, places[0])
  }
  // Every island now has more than the old three places.
  for (const id of Object.keys(islandLayouts) as IslandId[]) assert.ok(islands[id].places.length >= 4, id)
})

test('沙漠和雪山要走很久，一般道路 6 分鐘', () => {
  assert.equal(walkMinutes('nanohana', 'rainbase'), 240)
  assert.equal(walkMinutes('bighorn', 'drumCastle'), 45)
  assert.equal(walkMinutes('logueStreet', 'logueSquare'), 6)
  // Impel Down has to be walked level by level.
  assert.deepEqual(routeBetween('impelGate', 'impelLevel6'),
    ['impelGate', 'impelLevel1', 'impelLevel2', 'impelLevel3', 'impelLevel4', 'impelLevel5', 'impelLevel6'])
  assert.ok(paths.impelLevel5.includes('newkama'))
})

test('通稱依所在島嶼解析：羅格鎮的大街、巴拉蒂的甲板、可可亞西的橘子園', () => {
  assert.deepEqual(familiarIntent('去大街', 'loguePort'), { kind: 'move', to: 'logueStreet' })
  assert.deepEqual(familiarIntent('去甲板', 'baratieHall'), { kind: 'move', to: 'baratieDeck' })
  assert.deepEqual(familiarIntent('去橘子園', 'cocoyasiVillage'), { kind: 'move', to: 'bellemereGrove' })
  assert.deepEqual(familiarIntent('去酒吧', 'square'), { kind: 'move', to: 'tavern' })
  assert.deepEqual(familiarIntent('前往' + locations.newkama, 'impelLevel5'), { kind: 'move', to: 'newkama' })
})

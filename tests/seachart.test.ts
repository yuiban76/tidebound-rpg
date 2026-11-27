// The world map: every island and lane is on it, names keep clear of each other, and canon regions hold.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { IslandId } from '../packages/shared/protocol.ts'
import { islands, routesFrom, seaLanes } from '../packages/world/sea.ts'
import { bands, chart, chartIslands, chartLanes, coastline, newWorldEnd, redLine, seaPath } from '../packages/world/seachart.ts'

const ids = Object.keys(chartIslands) as IslandId[]

test('每座島都在世界地圖上，彼此不重疊，也不壓到紅土大陸', () => {
  assert.deepEqual([...ids].sort(), Object.keys(islands).sort())
  for (const id of ids) {
    const [x, y] = chartIslands[id].at
    // The first half lies between the two stretches of the Red Line, the New World past it; Fishman Island sits right under it.
    const newWorld = islands[id].about.startsWith('新世界')
    if (id === 'fishmanIsland') assert.equal(x, redLine.far)
    else if (newWorld) assert.ok(x > redLine.far + 90 && x < newWorldEnd, id)
    else assert.ok(x > redLine.reverse + 90 && x < redLine.far - 90, id)
    assert.ok(y > 60 && y < chart.height - 60, id)
    for (const other of ids) if (other !== id) {
      const [a, b] = chartIslands[other].at
      assert.ok(Math.abs(x - a) >= 120 || Math.abs(y - b) >= 100, id + '–' + other)
    }
  }
})

test('島的位置符合原作：東海、偉大航路、無風帶', () => {
  for (const id of ids) {
    const about = islands[id].about
    const [from, to] = about.startsWith('東海') ? bands.blueNorth : about.startsWith('無風帶') ? bands.calmSouth : bands.grandLine
    const y = chartIslands[id].at[1]
    assert.ok(y > from && y < to, id + ' 在 ' + y)
  }
})

test('每條航線都畫得出來，海岸線每次都一樣', () => {
  assert.equal(chartLanes.length, seaLanes.length)
  for (const lane of chartLanes) assert.match(lane.shape, /^M[\d.]+ [\d.]+[CQ][-\d. L]+/, lane.id)
  assert.equal(coastline('wind', 0, 0, 40, 20), coastline('wind', 0, 0, 40, 20))
  assert.notEqual(coastline('wind', 0, 0, 40, 20), coastline('drum', 0, 0, 40, 20))
})

test('航路：一站一站走得到，單向航線不能往回', () => {
  const path = seaPath('wind', 'loguetown')
  assert.deepEqual([path[0], path.at(-1)], ['wind', 'loguetown'])
  for (let i = 1; i < path.length; i++) assert.ok(routesFrom(path[i - 1]).some(route => route.to === path[i]))
  assert.ok(seaPath('loguetown', 'marineford').length > 5)
  assert.deepEqual(seaPath('drum', 'wind'), [])
  assert.deepEqual(seaPath('wind', 'wind'), ['wind'])
  // The New World: down to Fishman Island from Sabaody, up into the New World, and on to Egghead.
  assert.deepEqual(seaPath('sabaody', 'egghead').slice(0, 3), ['sabaody', 'fishmanIsland', 'punkHazard'])
  assert.equal(seaPath('egghead', 'sabaody').length, 0)
})

// After the Summit War: the two years of training, haki, the dive to Fishman Island, and the New World up to Egghead.
import { allGates } from './fixtures.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { Game } from '../apps/host/game.ts'
import { Store } from '../apps/host/store.ts'
import { locations, npcs } from '../packages/shared/protocol.ts'
import type { IslandId, LocationId, NpcId } from '../packages/shared/protocol.ts'
import { makeCharacter, resolve, trainSkill } from '../packages/rules/engine.ts'
import { catchUpTraining, hakiRank, timeskip, timeskipBlock, train } from '../packages/rules/timeskip.ts'
import { learnTalents } from '../packages/rules/talents.ts'
import { pathTo } from '../packages/world/talents.ts'
import { canonTimeline, luffyRoute, minuteOf } from '../packages/world/canon.ts'
import { crewmates } from '../packages/world/crews.ts'
import { familiarIntent } from '../packages/world/explore.ts'
import { luffyNow } from '../packages/world/luffy.ts'
import { newWorldIslands, newWorldStories, reunion, reunionMinute } from '../packages/world/newworld.ts'
import { islandAt, islands, islandStories, routesFrom } from '../packages/world/sea.ts'
import { advanceTimeline } from '../packages/world/timeline.ts'
import { setFlag } from '../packages/world/flags.ts'
import { traders } from '../packages/world/traders.ts'
import { newWorld, npcPlace, npcRole, people } from '../packages/world/village.ts'
import type { Member, World } from '../packages/world/village.ts'
import { character, compatibilityFixture } from './fixtures.ts'

const at = (day: number, hour: number) => (day - 1) * 1440 + hour * 60
const dice = (...script: number[]) => (sides: number) => Math.min(sides, script.length ? script.shift()! : sides)
const online = new Set(['host'])
const newIslands = Object.keys(newWorldIslands) as IslandId[]

function party(place: LocationId = 'square', minute = at(1, 8)) {
  const world = newWorld('NEWWORLD01', 'host')
  world.started = true
  world.calmSeas = true
  world.gates = allGates()
  const member = world.members[0] as Member
  member.character = makeCharacter(character('阿浪'))
  member.character.place = place
  world.minute = minute
  advanceTimeline(world)
  return { world, member, c: member.character }
}
const act = (world: World, member: Member, intent: Parameters<typeof resolve>[2], roll = dice()) => resolve(world, member, intent, '', roll, online)
/** Lets the calendar run hour by hour, as play does. */
function to(world: World, day: number, hour: number) {
  const news: string[] = []
  while (world.minute < at(day, hour)) {
    world.minute = Math.min(at(day, hour), world.minute + 60)
    news.push(...advanceTimeline(world).map(item => item.text))
  }
  return news.join('\n')
}

test('新世界的七座島：每座都有地點、委託、行商、航線，地點都走得到', () => {
  for (const id of newIslands) {
    assert.ok(islands[id].places.length >= 3, id)
    assert.ok(islandStories[id], id + ' 缺委託')
    assert.equal(Object.values(traders).filter(trader => trader.island === id).length, 1, id + ' 缺行商')
    assert.ok(routesFrom(id).length || canonTimeline.some(event => event.island === id), id)
    for (const place of islands[id].places) assert.equal(islandAt(place), id)
    const story = newWorldStories[id as keyof typeof newWorldStories]
    assert.ok(story.availableFrom && minuteOf(story.availableFrom) >= reunionMinute - 1440, id + ' 的委託要在兩年後才有')
  }
})

test('第一天的新世界已經在那裡：凱多在鬼島、Big Mom 在城堡、多佛朗明哥還在海上', () => {
  const { world } = party()
  assert.equal(npcPlace(world, 'kaido'), 'onigashima')
  assert.equal(npcPlace(world, 'bigMom'), 'wcChateau')
  assert.equal(npcPlace(world, 'shirahoshi'), 'ryugu')
  assert.equal(npcPlace(world, 'doflamingo'), null)
  assert.equal(npcPlace(world, 'sabo'), null)
})

test('兩年修行：戰爭結束前不行；之後全隊跳到兩年後，在夏波帝重聚、變強、學會霸氣，船也鍍好膜', () => {
  const { world, member, c } = party('marinefordBay', at(72, 12))
  assert.match(timeskipBlock(world)!, /頂上戰爭結束/)
  world.minute = at(73, 8)
  assert.equal(timeskipBlock(world), undefined)
  world.ship = { owner: member.id, port: 'kujaPort', hull: 40, wood: 0, trips: 3 }
  c.level = 8
  const text = timeskip(world, dice(20))
  assert.match(text, /兩年後/)
  assert.equal(world.minute, reunionMinute - 120)
  assert.equal(c.place, 'shakkyBar')
  assert.equal(c.level, 14)
  assert.equal(c.skillRanks['武裝色'], 1)
  assert.equal(c.skillRanks['見聞色'], 1)
  assert.ok(c.haki?.trained && c.haki.conqueror, '擲到 20 覺醒霸王色')
  assert.deepEqual([world.ship.port, world.ship.hull, world.ship.coated], ['sabaodyGrove', 100, true])
  assert.equal(train(c, dice(20)), '', '只修行一次')
  assert.match(timeskipBlock(world)!, /已經過去/)
  // The calendar catches up: the reunion happens, and the news of the two years arrives.
  const news = to(world, 803, 12)
  assert.match(news, /兩年後的重聚/)
  assert.equal(npcRole(world, 'akainu'), '海軍元帥')
})

test('沒擲出霸王色的人照樣學會另外兩種；等過兩年或之後才入隊的人也補上修行', () => {
  const { world, c } = party('square', at(800, 8))
  assert.match(train(c, dice(1)), /沒有覺醒霸王色/)
  assert.equal(c.haki?.conqueror, undefined)
  const late = party('square', reunionMinute + 60)
  assert.equal(catchUpTraining(late.world).length, 1)
  assert.ok(late.c.haki?.trained && late.c.level >= 14)
  assert.equal(catchUpTraining(late.world).length, 0)
  void world
})

test('霸氣：武裝色打得到自然系，見聞色和武裝色提高防禦；修行後從天賦林提升，修行前不能練', () => {
  const { world, member, c } = party('logueSquare', at(9, 8))
  c.skillPoints = 3
  assert.match(trainSkill(c, '武裝色').text, /還沒學會/)
  const before = act(world, member, { kind: 'attack', target: '斯摩格' }, dice(15, 15, 3))
  assert.match(before.text, /穿過了斯摩格的身體/)
  delete world.combat
  world.npcDown = {}
  train(c, dice(1))
  assert.match(trainSkill(c, '武裝色').text, /天賦林/)
  assert.deepEqual(pathTo(c, 'ha.2'), ['h.arm.0', 'ha.2'])
  assert.equal(learnTalents(c, pathTo(c, 'ha.2')).rejected, undefined)
  assert.equal(hakiRank(c, '武裝色'), 2)
  const after = act(world, member, { kind: 'attack', target: '斯摩格' }, dice(19, 6, 1))
  assert.match(after.text, /武裝色霸氣/)
  assert.doesNotMatch(after.text, /穿過了斯摩格/)
})

test('霸王色：一場一次，雜兵當場昏倒，沒有霸氣的軍官這回合出不了手；沒覺醒的人不能用', () => {
  const { world, member, c } = party('buggyBar', at(1, 9))
  assert.match(act(world, member, { kind: 'conqueror' }).text, /沒有進行中的戰鬥/)
  act(world, member, { kind: 'attack', target: '巴其' }, dice(1, 1, 1, 1, 1, 1))
  assert.ok(world.combat)
  assert.match(act(world, member, { kind: 'conqueror' }).text, /還沒有覺醒霸王色/)
  c.haki = { trained: true, conqueror: true }
  c.sta = 99
  const roar = act(world, member, { kind: 'conqueror' }, dice(1, 1, 1, 1, 1, 1, 1, 1))
  assert.match(roar.text, /放出了霸王色霸氣/)
  assert.match(roar.text, /當場昏了過去/)
  assert.match(roar.text, /巴其被震懾得動彈不得/)
  assert.match(roar.text, /巴其被霸氣震懾，沒能出手/)
  assert.doesNotMatch(roar.text, /巴其反擊/)
  if (world.combat) assert.match(act(world, member, { kind: 'conqueror' }).text, /已經放過一次/)
  assert.deepEqual(familiarIntent('霸王色'), { kind: 'conqueror' })
  assert.deepEqual(familiarIntent('放出霸王色霸氣'), { kind: 'conqueror' })
})

test('潛向魚人島：船要先在夏波帝鍍膜，鍍膜要錢；之後從魚人島只能往上到新世界', () => {
  const { world, member, c } = party('coatingYard', at(60, 8))
  world.ship = { owner: member.id, port: 'sabaodyGrove', hull: 100, wood: 0, trips: 0 }
  c.inventory['記錄指針'] = 1
  c.place = 'sabaodyGrove'
  assert.match(act(world, member, { kind: 'sail', order: 'depart', destination: 'fishmanIsland' }).text, /先鍍膜/)
  c.place = 'coatingYard'
  c.money = 10
  assert.match(act(world, member, { kind: 'ship', order: 'coat' }).text, /鍍膜要/)
  c.money = 2_000_000
  assert.match(act(world, member, { kind: 'ship', order: 'coat' }).text, /包進了一層泡泡膜/)
  assert.equal(c.money, 1_000_000)
  assert.deepEqual(familiarIntent('鍍膜'), { kind: 'ship', order: 'coat' })
  c.place = 'sabaodyGrove'
  const dive = act(world, member, { kind: 'sail', order: 'depart', destination: 'fishmanIsland' }, dice(15))
  assert.equal(dive.rejected, undefined, dive.text)
  assert.equal(islandAt(c.place), 'fishmanIsland')
  assert.deepEqual(routesFrom('fishmanIsland').map(route => route.to).sort(), ['punkHazard', 'sabaody'])
  assert.ok(!routesFrom('punkHazard').some(route => route.to === 'fishmanIsland'), '浮上新世界後回不去')
})

test('照原作走完兩年後到蛋頭島：每件事依序發生，人物照原作移動，甚平入夥，魯夫航向艾爾巴夫', () => {
  const { world } = party('shakkyBar', reunionMinute - 60)
  const news = to(world, 868, 12)
  for (const event of canonTimeline.filter(item => item.at[0] >= 803))
    assert.ok(world.timeline?.[event.id], event.id + ' 沒有發生')
  assert.match(news, /兩年後的重聚/)
  assert.equal(npcPlace(world, 'kaido'), null)
  assert.equal(npcPlace(world, 'doflamingo'), null)
  assert.equal(npcPlace(world, 'momonosuke'), 'flowerCapital')
  assert.equal(npcRole(world, 'momonosuke'), '和之國將軍')
  assert.equal(npcPlace(world, 'riku'), 'drPalace')
  assert.equal(npcRole(world, 'luffy'), '四皇・草帽小子')
  assert.match(luffyNow(world).doing, /艾爾巴夫/)
  // Jinbe sails with Luffy now: attack Luffy where he stands and his crew is there.
  world.minute = at(850, 8)
  advanceTimeline(world)
})

test('甚平在和之國之後是草帽一夥的人，草帽一夥兩年後又一起行動', () => {
  const { world } = party('shakkyBar', reunionMinute - 60)
  to(world, 849, 14)
  const place = npcPlace(world, 'luffy')!
  const crew = crewmates(world, 'luffy', place)
  assert.ok(crew.npcs.includes('jinbe'), crew.npcs.join())
  assert.ok(crew.npcs.includes('zoro') && crew.npcs.includes('franky'))
})

test('玩家改變了新世界：先打倒霍迪，魚人島的決戰就不一樣；先完成和之國的目標，凱多的結局改寫', () => {
  const { world } = party('shakkyBar', reunionMinute - 60)
  world.defeated = ['hody']
  world.npcDown = {}
  ;(world.npcPlaces ??= {}).hody = null
  to(world, 807, 0)
  assert.equal(world.timeline?.fishman, 'changed')
  setFlag(world, 'saga:wn.roof')
  to(world, 849, 8)
  assert.equal(world.timeline?.onigashima, 'changed')
})

test('魯夫在新世界的每一站都是真的地點，時間依序', () => {
  let last = 0
  for (const stop of luffyRoute) {
    const minute = minuteOf(stop.at)
    assert.ok(minute >= last)
    last = minute
    if (stop.place) assert.ok(locations[stop.place])
  }
  assert.ok(luffyRoute.some(stop => stop.at[0] === reunion[0]))
  for (const id of ['kaido', 'bigMom', 'katakuri', 'vegapunk', 'saturn'] as NpcId[]) assert.ok(npcs[id] && people[id], id)
})

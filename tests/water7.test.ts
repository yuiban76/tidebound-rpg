// Water 7 to Enies Lobby in stages (packages/world/water7.ts): who stands where, what the party can change, the sea
// train, and what is left after the Buster Call.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LocationId, NpcId } from '../packages/shared/protocol.ts'
import { makeCharacter, maxHP, resolve } from '../packages/rules/engine.ts'
import { canonTimeline, minuteOf } from '../packages/world/canon.ts'
import { crewmates } from '../packages/world/crews.ts'
import { familiarIntent } from '../packages/world/explore.ts'
import { hasFlag, setFlag } from '../packages/world/flags.ts'
import { islandAt } from '../packages/world/sea.ts'
import { advanceTimeline } from '../packages/world/timeline.ts'
import { newWorld, normalizeWorld, npcPlace, npcRole } from '../packages/world/village.ts'
import type { Member, World } from '../packages/world/village.ts'
import { sagaFlag, water7Saga } from '../packages/world/water7.ts'
import { character } from './fixtures.ts'

const dice = (...script: number[]) => (sides: number) => Math.min(sides, script.length ? script.shift()! : sides)
const online = new Set(['host'])
const at = (day: number, hour: number, minute = 0) => (day - 1) * 1440 + hour * 60 + minute
function scene(place: LocationId, day: number, hour: number, flags: string[] = []) {
  const world = newWorld('WATERSEVEN', 'host')
  world.started = true
  world.calmSeas = true
  const member = world.members[0] as Member
  member.character = { ...makeCharacter(character('阿浪')), place, level: 10, hp: 9_999 }
  for (const flag of flags) setFlag(world, flag)
  world.minute = at(day, hour)
  advanceTimeline(world)
  return { world, member, c: member.character }
}
const go = (world: World, day: number, hour: number, minute = 0) => {
  world.minute = at(day, hour, minute)
  return advanceTimeline(world).map(item => item.text).join('\n')
}
const act = (world: World, member: Member, intent: Parameters<typeof resolve>[2], roll = dice()) => resolve(world, member, intent, '', roll, online)

test('點名：路基先以船匠身分臥底，草帽一夥在七水之都找得到，之後照原作前往司法島再回來', () => {
  const { world } = scene('square', 1, 9)
  const where = (npc: NpcId) => npcPlace(world, npc)
  assert.equal(where('lucci'), 'galleyLa')
  assert.equal(npcRole(world, 'lucci'), '卡雷拉公司的船匠')
  assert.deepEqual([where('jabra'), where('oimo'), where('lulu'), where('kiwi'), where('chimney')], ['justiceTower', 'eniesGate', 'galleyLa', 'frankyHouse', 'blueStation'])
  go(world, 40, 12)
  for (const npc of ['luffy', 'zoro', 'nami', 'usopp', 'sanji', 'chopper', 'robin'] as const) assert.equal(where(npc), 'water7Port', npc)
  go(world, 42, 12)
  assert.equal(where('robin'), null, '羅賓失蹤')
  go(world, 46, 23)
  for (const npc of ['lucci', 'kaku', 'kalifa', 'blueno', 'robin', 'luffy', 'zoro', 'nami', 'iceburg', 'paulie'] as const) assert.equal(where(npc), 'iceburgMansion', npc)
  assert.equal(npcRole(world, 'lucci'), 'CP9 特務')
  go(world, 47, 21)
  assert.deepEqual([where('robin'), where('franky'), where('usopp'), where('sanji'), where('luffy')], ['justiceTower', 'justiceTower', null, null, 'blueStation'])
  go(world, 48, 5)
  assert.deepEqual([where('lucci'), where('blueno'), where('kokoro'), where('zambai'), where('paulie')], ['justiceTower', 'courthouse', 'eniesGate', 'eniesFront', 'eniesFront'])
  go(world, 48, 8)
  for (const npc of ['luffy', 'zoro', 'nami', 'usopp', 'sanji', 'chopper', 'franky'] as const) assert.equal(where(npc), 'courthouse', npc)
  go(world, 48, 11)
  assert.deepEqual([where('lucci'), where('spandam'), where('robin')], ['gateOfJustice', 'gateOfJustice', 'gateOfJustice'])
  go(world, 49, 12)
  for (const npc of ['luffy', 'zoro', 'nami', 'sanji', 'chopper', 'robin', 'franky', 'iceburg', 'paulie'] as const) assert.equal(where(npc), 'galleyLa', npc)
  assert.equal(where('usopp'), 'backStreet')
  for (const npc of ['lucci', 'kaku', 'kalifa', 'blueno', 'jabra', 'kumadori', 'fukurou', 'spandam', 'baskerville', 'traderEnies', 'oimo'] as const) assert.equal(where(npc), null, npc)
  go(world, 50, 13)
  for (const npc of ['garp', 'koby', 'helmeppo'] as const) assert.equal(where(npc), 'water7Port', npc)
  go(world, 54, 12)
  for (const npc of ['luffy', 'zoro', 'nami', 'usopp', 'sanji', 'chopper', 'robin', 'franky'] as const) assert.equal(where(npc), null, npc)
  assert.equal(where('garp'), 'hqFortress')
})

test('每個階段依序發生，沒人插手時都照原作', () => {
  const { world } = scene('water7Port', 40, 11)
  const order = water7Saga.stages.map(id => canonTimeline.findIndex(event => event.id === id))
  assert.deepEqual(order, [...order].sort((a, b) => a - b))
  let heard = ''
  for (let day = 41; day <= 53; day++) for (const hour of [1, 5, 7, 9, 11, 14, 17, 19, 21, 23]) heard += go(world, day, hour)
  for (const id of water7Saga.stages) assert.equal(world.timeline?.[id], 'canon', id)
  for (const title of ['被搶走的黃金', '梅利號的宣判', '船長與狙擊手的決鬥', '宅邸之夜', '海列車的乘客', '海軍英雄的來訪', '千陽號下水', '歸隊'])
    assert.match(heard, new RegExp(title))
})

test('目標的時間、地點、幫手都算數；改得了對應的階段', () => {
  const { world, member, c } = scene('galleyLa', 41, 13)
  assert.deepEqual(familiarIntent('替梅利號做最後的整修'), { kind: 'goal', goal: 'w7.merry' })
  assert.match(act(world, member, { kind: 'goal', goal: 'w7.gold' }).text, /要到七水之都的七水之都港/)
  assert.match(act(world, member, { kind: 'goal', goal: 'w7.duel' }).text, /第 43 天 12:00才有機會/)
  const hp = c.hp
  assert.doesNotMatch(act(world, member, { kind: 'goal', goal: 'w7.merry' }, dice(2)).text, /受了傷/, '修船失敗只花時間')
  assert.equal(c.hp, hp)
  assert.match(act(world, member, { kind: 'goal', goal: 'w7.merry' }, dice(15)).text, /保利、露露、戴魯斯通在旁 \+3，再試 \+1/)
  assert.ok(hasFlag(world, sagaFlag('w7.merry')))
  assert.match(go(world, 43, 13), /連夜替它補好了船身/)
  assert.match(act(world, member, { kind: 'goal', goal: 'w7.merry' }).text, /已經完成了/)
  assert.match(act(world, member, { kind: 'goal', goal: 'w7.gold' }).text, /已經來不及了/)
})

test('交出密令、揭穿 CP9，宅邸之夜就會改寫；勸住騙人布，最後不用道歉', () => {
  const { world, member } = scene('iceburgMansion', 46, 7)
  world.islandTasks = { water7: { stage: 'done' } }
  assert.match(act(world, member, { kind: 'goal', goal: 'w7.guard' }, dice(12)).text, /先前的戰果 \+2/)
  assert.match(go(world, 46, 23), /被一群旅人當眾喊破身分/)
  const calm = scene('water7Port', 44, 12, [sagaFlag('w7.duel')])
  assert.match(go(calm.world, 45, 0), /誰也沒有動手/)
  assert.match(go(calm.world, 53, 7, 30), /一個也沒少/)
  assert.equal(calm.world.timeline?.w7Usopp, 'changed')
})

test('市長遇襲的委託要到冰山真的遇襲才接得到，宅邸之夜後就落幕', () => {
  const early = scene('iceburgMansion', 26, 12)
  assert.match(act(early.world, early.member, { kind: 'islandTask', step: 'accept' }).text, /目前還沒有相關的動靜/)
  const { world, member } = scene('iceburgMansion', 46, 8)
  assert.equal(npcPlace(world, 'iceburg'), 'iceburgMansion')
  assert.match(act(world, member, { kind: 'islandTask', step: 'accept' }).text, /昨夜遇襲/)
  go(world, 46, 23)
  assert.match(act(world, member, { kind: 'islandTask', step: 'search' }).text, /已經落幕/)
})

test('打倒或救走人之後，新聞跟著改：路基倒下、發車前救人', () => {
  const beaten = scene('blueStation', 47, 12)
  beaten.world.defeated = ['lucci']
  assert.match(go(beaten.world, 47, 21), /路基倒下了，但屠魔令的威脅還在/)
  const saved = scene('blueStation', 47, 13)
  const hp = saved.c.hp
  assert.match(act(saved.world, saved.member, { kind: 'goal', goal: 'w7.board' }, dice(1)).text, /受了傷/)
  assert.ok(saved.c.hp < hp)
  assert.match(act(saved.world, saved.member, { kind: 'goal', goal: 'w7.board' }, dice(17)).text, /拖了出來/)
  assert.match(go(saved.world, 47, 21), /在發車前救下了佛朗基和騙人布/)
  assert.equal(npcPlace(saved.world, 'franky'), null)
  assert.equal(npcPlace(saved.world, 'robin'), 'justiceTower')
  go(saved.world, 48, 8)
  assert.equal(npcPlace(saved.world, 'franky'), 'courthouse', '佛朗基自己也追去救人')
})

test('被招募的夥伴不會被行程帶走；先被打倒的 CP9 不會再出現在宅邸', () => {
  const { world } = scene('square', 39, 12, ['recruited:zoro', 'recruited:franky'])
  world.defeated = ['lucci']
  world.npcPlaces = { ...world.npcPlaces, lucci: null }
  go(world, 46, 23)
  assert.equal(npcPlace(world, 'zoro'), 'marineBase', '招募過的人不跟著草帽一夥走')
  assert.equal(npcPlace(world, 'lucci'), null)
  assert.equal(npcPlace(world, 'kaku'), 'iceburgMansion')
  const heard = go(world, 47, 21) + JSON.stringify(world.paperQueue)
  assert.match(heard, /路基倒下了，但屠魔令的威脅還在。剩下的 CP9 押著妮可・羅賓、騙人布搭上海列車/)
  assert.equal(npcPlace(world, 'franky'), 'frankyHouse')
})

test('騙人布已經跟著玩家時，這一路的新聞都不會再出現他或狙擊王', () => {
  const { world } = scene('water7Port', 40, 11, ['recruited:usopp'])
  let heard = ''
  for (let day = 41; day <= 53; day++) for (const hour of [1, 5, 7, 9, 11, 14, 17, 19, 21, 23]) heard += go(world, day, hour)
  const stages = [...heard.split('】'), ...(world.paperQueue ?? []).map(item => item.text)].filter(text => /七水之都・|司法島・/.test(text))
  assert.ok(stages.length >= 10)
  for (const text of stages) assert.doesNotMatch(text, /騙人布|狙擊王/)
})

test('海列車：發車前只載政府的人，追擊時可搭火箭人；大潮之後出發要闖過巨浪', () => {
  assert.deepEqual(familiarIntent('搭海列車'), { kind: 'train' })
  const early = scene('blueStation', 45, 12)
  assert.match(act(early.world, early.member, { kind: 'train' }).text, /只載世界政府的人/)
  const { world, member, c } = scene('blueStation', 47, 21)
  world.ship = { owner: 'host', port: 'water7Port', hull: 80, wood: 1, trips: 3 }
  const ride = act(world, member, { kind: 'train' })
  assert.match(ride.text, /抵達司法島正門/)
  assert.equal(c.place, 'eniesGate')
  assert.ok(world.minute + ride.minutes! >= at(48, 1) && world.minute + ride.minutes! < at(48, 6))
  assert.equal(world.ship.port, 'water7Port')
  const wave = scene('blueStation', 47, 23)
  wave.c.hp = maxHP(wave.c)
  assert.match(act(wave.world, wave.member, { kind: 'train' }, dice(1)).text, /每個人都受了傷/)
  assert.ok(wave.c.hp < maxHP(wave.c))
  const late = scene('blueStation', 48, 3)
  assert.match(act(late.world, late.member, { kind: 'train' }).text, /已經開走了/)
})

test('CP9 在司法塔一對一；路基在正義之門前等著；面具摘下前，打他的是「船匠們」', () => {
  const { world } = scene('justiceTower', 48, 9)
  assert.deepEqual(crewmates(world, 'kaku', 'justiceTower').npcs, [])
  go(world, 48, 11)
  assert.deepEqual(crewmates(world, 'lucci', 'gateOfJustice').npcs, ['spandam'])
  const before = scene('galleyLa', 30, 12)
  const band = crewmates(before.world, 'lucci', 'galleyLa')
  assert.equal(band.crew?.name, '卡雷拉公司的船匠們')
  assert.deepEqual(band.npcs.sort(), ['kaku', 'kalifa'])
})

test('救羅賓的委託：先前完成的目標讓判定更容易', () => {
  const plain = scene('gateOfJustice', 48, 9)
  plain.world.islandTasks = { eniesLobby: { stage: 'active' } }
  const helped = scene('gateOfJustice', 48, 9, [sagaFlag('en.giants'), sagaFlag('en.court'), sagaFlag('en.keys')])
  helped.world.islandTasks = { eniesLobby: { stage: 'active' } }
  const total = (s: typeof plain) => Number(/合計 (\d+)/.exec(act(s.world, s.member, { kind: 'islandTask', step: 'search' }, dice(5)).text)?.[1])
  assert.equal(total(helped) - total(plain), 6)
})

test('屠魔令：司法島成為廢墟，島上的人和船被梅利號接回七水之都，之後不能再靠岸', () => {
  const { world, member, c } = scene('courthouse', 48, 9)
  world.ship = { owner: 'host', port: 'eniesGate', hull: 80, wood: 1, trips: 3 }
  go(world, 48, 12)
  assert.equal(world.timeline?.enies, undefined, '路基擋在橋前，現場還在進行')
  const heard = go(world, 48, 15)
  assert.match(heard, /猶豫橋的決戰/)
  assert.match(heard, /屠魔令/)
  assert.match(heard, /來接夥伴的船/)
  assert.equal(c.place, 'water7Port')
  assert.equal(world.ship.port, 'water7Port')
  assert.ok(hasFlag(world, 'ruined:eniesLobby'))
  assert.match(act(world, member, { kind: 'sail', order: 'depart', destination: 'eniesLobby' }).text, /化為廢墟/)
})

test('搶走金色電話蟲就沒有屠魔令；補過又接應到的梅利號能回到港口', () => {
  const { world } = scene('gateOfJustice', 48, 11, [sagaFlag('en.buster'), sagaFlag('en.merry'), sagaFlag('w7.merry')])
  const heard = go(world, 48, 12) + go(world, 48, 15)
  assert.match(heard, /司法島保住了/)
  assert.match(heard, /永遠停在造船廠裡/)
  assert.equal(hasFlag(world, 'ruined:eniesLobby'), false)
  assert.equal(npcPlace(world, 'baskerville'), 'courthouse')
})

test('每個目標的地點都在這兩座島上，時間在故事範圍內，也趕在要改寫的階段之前', () => {
  for (const goal of water7Saga.goals) {
    assert.ok(water7Saga.islands.includes(islandAt(goal.place)), goal.id)
    assert.ok(minuteOf(goal.from) >= minuteOf(water7Saga.from) && minuteOf(goal.until) <= minuteOf(water7Saga.until), goal.id)
    const changed = canonTimeline.filter(event => event.changed?.some(option => option.when?.includes(sagaFlag(goal.id))))
    assert.ok(changed.length > 0, goal.id + ' 沒有改寫任何階段')
    for (const event of changed) assert.ok(minuteOf(event.at) >= minuteOf(goal.until), goal.id + ' 比 ' + event.id + ' 晚')
  }
})

test('舊存檔：已經過去的階段不會補發新聞，還沒到的照常發生', () => {
  const old = newWorld('OLDSAVE001', 'host')
  delete old.sagaVersion
  old.minute = at(60, 12)
  old.timeline = { enies: 'canon', water7: 'canon' }
  normalizeWorld(old)
  for (const id of water7Saga.stages) assert.ok(old.timeline[id], id)
  const heard = advanceTimeline(old).map(item => item.text).join('\n')
  assert.doesNotMatch(heard + JSON.stringify(old.paperQueue ?? []), /宅邸之夜|歸隊|屠魔令/)
  const young = newWorld('OLDSAVE002', 'host')
  delete young.sagaVersion
  young.minute = at(30, 12)
  normalizeWorld(young)
  assert.equal(young.timeline?.w7Gold, undefined)
})

test('草帽一夥到七水之都時，身分是船員而不是剛登場時的樣子', () => {
  const { world } = scene('water7Port', 40, 9, ['recruited:sanji'])
  assert.equal(npcRole(world, 'zoro'), '被綁在基地廣場的劍士')
  go(world, 40, 11)
  assert.equal(npcRole(world, 'zoro'), '草帽一夥的劍士')
  assert.equal(npcRole(world, 'nami'), '草帽一夥的航海士')
  assert.equal(npcRole(world, 'sanji'), '副料理長', '跟著玩家的香吉士不算草帽一夥')
})

test('羅賓已經被救走時，斯潘達姆手上是空的', () => {
  const { world } = scene('justiceTower', 48, 9)
  world.islandTasks = { ...world.islandTasks, eniesLobby: { stage: 'done' } }
  ;(world.npcPlaces ??= {}).robin = null
  assert.match(go(world, 48, 11), /羅賓早已被一群旅人救走/)
  assert.equal(npcPlace(world, 'robin'), null)
  assert.equal(npcPlace(world, 'spandam'), 'gateOfJustice')
})

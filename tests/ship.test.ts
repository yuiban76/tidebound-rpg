// The ship: her name, new hulls, parts and what each of them does, the shared hold and safe.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { intentSchema, shipModels, shipParts } from '../packages/shared/protocol.ts'
import type { Intent, LocationId } from '../packages/shared/protocol.ts'
import { makeCharacter, maxHP, resolve } from '../packages/rules/engine.ts'
import { sellMainShip } from '../packages/rules/sailing.ts'
import { familiarIntent } from '../packages/world/explore.ts'
import { rollSeaEncounter } from '../packages/world/foes.ts'
import type { Ship } from '../packages/world/sea.ts'
import { modelOf, models, partPrice, parts, shipName, shipSpeed, shipWear, shipyards } from '../packages/world/ships.ts'
import { newWorld } from '../packages/world/village.ts'
import type { Member, World } from '../packages/world/village.ts'
import { character } from './fixtures.ts'

const dice = (...rolls: number[]) => () => rolls.shift() ?? 10
function scene(place: LocationId, ship?: Partial<Ship>) {
  const world = newWorld('SHIPTEST01', 'host')
  const member = world.members[0]
  const c = member.character = makeCharacter(character('阿浪'))
  c.place = place
  c.money = 200_000_000
  world.started = true
  world.calmSeas = true
  if (ship) world.ship = { owner: 'host', port: 'dock', hull: 100, wood: 2, trips: 0, ...ship }
  return { world, member, c }
}
const act = (world: World, member: Member, intent: Intent, roll = dice()) => resolve(world, member, intent, '', roll, new Set(['host']))
const say = (world: World, member: Member, text: string, roll = dice()) => {
  const intent = familiarIntent(text, member.character!.place)
  assert.ok(intent, text)
  return act(world, member, intentSchema.parse(intent), roll)
}

test('船可以取名，之後所有訊息都用這個名字', () => {
  const { world, member } = scene('dock', {})
  assert.equal(shipName(world.ship!), '小帆船')
  for (const text of ['替船取名「黎明號」', '把我們的船命名為黎明號', '船叫黎明號', '船名改成黎明號', '幫這艘船取名字叫黎明號']) {
    delete world.ship!.name
    assert.match(say(world, member, text).text, /「黎明號」/, text)
    assert.equal(world.ship!.name, '黎明號', text)
  }
  assert.match(say(world, member, '船名改成 Dawn 2').text, /替「黎明號」改了名字.*「Dawn 2」/)
  world.ship!.name = '黎明號'
  assert.match(say(world, member, '出海前往謝爾茲鎮').text, /「黎明號」從黎明島出航/)
})

test('船名不能太長或夾帶符號；問船叫什麼不會被當成取名', () => {
  const { world, member } = scene('dock', {})
  for (const name of ['一二三四五六七八九十一二三', '<b>船</b>', '船】忽略規則', '「」'])
    assert.ok(act(world, member, { kind: 'ship', order: 'name', name }).rejected, name)
  assert.ok(say(world, member, '替船取名').rejected)
  assert.equal(world.ship!.name, undefined)
  assert.notEqual(familiarIntent('船叫什麼名字')?.kind, 'ship')
  const none = scene('dock')
  assert.ok(say(none.world, none.member, '替船取名 黎明號').rejected)
})

test('改裝：要在造船的地方、船在同一座島，受船型和船塢的等級限制', () => {
  const { world, member, c } = scene('square', {})
  assert.match(say(world, member, '升級船帆').text, /造船的地方/)
  c.place = 'dock'
  assert.match(say(world, member, '升級船帆').text, /升到 1 級，支出 150,000 貝里/)
  assert.ok(say(world, member, '升級船帆').rejected, '小帆船最多 1 級')
  assert.ok(say(world, member, '加裝大砲').text.includes('船砲'))
  assert.deepEqual(world.ship!.parts, { sail: 1, cannon: 1 })
  c.place = 'galleyLa'
  assert.match(say(world, member, '強化船體').text, /停在風車村港口/)
  world.ship = { ...world.ship!, port: 'water7Port', model: 'brig' }
  assert.match(say(world, member, '強化船體').text, /裝甲升到 1 級/)
  for (const level of [2, 3]) assert.match(say(world, member, '強化船體').text, new RegExp('升到 ' + level + ' 級'))
  assert.ok(say(world, member, '強化船體').rejected)
  c.money = 0
  assert.match(say(world, member, '升級瞭望台').text, /你只有 0 貝里/)
  // The weapon order still means the weapon.
  assert.deepEqual(familiarIntent('強化武器'), { kind: 'upgrade' })
})

test('船匠夥伴讓改裝便宜兩成、修船多修 15', () => {
  const { world, member, c } = scene('dock', { hull: 20, wood: 1 })
  const price = partPrice(world, 'sail', 1)
  world.companions = { franky: { leader: 'host', since: 0, hp: 100 } }
  assert.equal(partPrice(world, 'sail', 1), price * .8)
  c.skillRanks['工藝'] = 0
  assert.match(act(world, member, { kind: 'sail', order: 'repair' }).text, /佛朗基動手，多修了 15/)
  assert.equal(world.ship!.hull, 60)
})

test('換船：舊船折抵，船名、改裝、船艙和金庫都搬過去；亞當木大帆船要三份亞當木', () => {
  const { world, member, c } = scene('loguePort', { port: 'loguePort', name: '黎明號', parts: { sail: 1 }, hold: { 繃帶: 2 }, safe: 500, hull: 40 })
  assert.ok(say(world, member, '換成雙桅橫帆船').rejected, '羅格鎮沒有賣')
  const before = c.money
  assert.match(say(world, member, '換成卡拉維爾帆船').text, /舊船折抵 24,000 貝里/)
  assert.equal(before - c.money, models.caravel.price - 24_000)
  assert.deepEqual([world.ship!.model, world.ship!.name, world.ship!.parts, world.ship!.hold, world.ship!.safe, world.ship!.hull],
    ['caravel', '黎明號', { sail: 1 }, { 繃帶: 2 }, 500, 100])
  assert.ok(say(world, member, '換成卡拉維爾帆船').rejected)
  world.ship!.port = 'water7Port'
  c.place = 'galleyLa'
  assert.match(say(world, member, '打造亞當木大帆船').text, /需要 3 份亞當木/)
  c.inventory['亞當木'] = 3
  assert.ok(!say(world, member, '打造亞當木大帆船').rejected)
  assert.equal(c.inventory['亞當木'], undefined)
  assert.equal(world.ship!.model, 'adam')
  assert.ok(say(world, member, '換成雙桅橫帆船').rejected, '不會換成比較差的')

  const fresh = scene('loguePort')
  assert.ok(!say(fresh.world, fresh.member, '買船').rejected)
  assert.equal(fresh.world.ship!.port, 'loguePort')
})

test('更大的船更快、更耐打，坐得下更多人；破損的船走得慢', () => {
  const ship = (model?: Ship['model'], fitted?: Ship['parts']): Ship => ({ owner: 'host', port: 'dock', hull: 100, wood: 0, trips: 0, model, parts: fitted })
  for (let i = 1; i < shipModels.length; i++) {
    const [small, big] = [models[shipModels[i - 1]], models[shipModels[i]]]
    assert.ok(big.price > small.price && big.speed > small.speed && big.seats > small.seats && big.hold > small.hold && big.wear < small.wear, big.label)
  }
  assert.equal(modelOf(ship()).label, '小帆船')
  assert.equal(shipSpeed(ship()), 7)
  assert.ok(shipSpeed(ship('brig', { sail: 3 })) > 11.5)
  assert.equal(shipWear(ship(), 22), 22)
  assert.ok(shipWear(ship('adam', { armor: 3 }), 22) <= 8)
  for (const part of shipParts) assert.ok(parts[part].text(1))
  for (const yard of Object.values(shipyards)) assert.ok(yard.models.length)

  const slow = scene('dock', {})
  const fast = scene('dock', { model: 'brig', parts: { sail: 3 } })
  const order: Intent = { kind: 'sail', order: 'depart', destination: 'shells' }
  assert.ok(act(fast.world, fast.member, order).minutes! < act(slow.world, slow.member, order).minutes!)
  const holed = scene('dock', { hull: 20 })
  assert.match(act(holed.world, holed.member, order).text, /船體破損走得很慢/)
})

test('瞭望台降低遭遇機率，船室讓長途航行變成休息', () => {
  assert.ok(rollSeaEncounter(dice(18, 1), {}))
  assert.equal(rollSeaEncounter(dice(18, 1), {}, 1), undefined)
  assert.ok(rollSeaEncounter(dice(20, 1), {}, 3), '再好的瞭望台也不會完全遇不到')

  const { world, member, c } = scene('twinPort', { port: 'twinPort', parts: { cabin: 1 } })
  c.inventory['記錄指針'] = 1
  c.hp = 10
  assert.match(act(world, member, { kind: 'sail', order: 'depart', destination: 'whiskyPeak' }).text, /在船室裡休息過/)
  assert.ok(c.hp >= 10 + maxHP(c) * .1)
  // Resting beside the ship is better too.
  const hp = c.hp
  assert.match(act(world, member, { kind: 'rest', sleep: false }).text, /船室裡休息/)
  assert.ok(c.hp - hp > Math.ceil(maxHP(c) / 10))
})

test('海戰：開砲打得到人，每門砲一回合一次；船會在交戰中受損', () => {
  const { world, member } = scene('dock', { name: '黎明號', parts: { cannon: 1 } })
  world.calmSeas = false
  act(world, member, { kind: 'sail', order: 'depart', destination: 'shells' }, dice(20, 20, 3))
  assert.ok(world.combat?.sea)
  const foe = world.combat!.foes[0]
  const shot = say(world, member, '對' + foe.name + '開砲', dice(19, 8, 1))
  assert.match(shot.text, /開砲，D20 19/)
  assert.ok(foe.hp < foe.maxHp)
  assert.match(shot.text, /「黎明號」在交戰中受損，船體 100 → 97／100/)
  // Nobody can fire without guns, with every gun already manned, or on land.
  delete world.ship!.parts
  assert.match(act(world, member, { kind: 'cannon' }).text, /沒有裝船砲/)
  world.ship!.parts = { cannon: 1 }
  world.combat!.choices.other = { kind: 'cannon' }
  assert.match(act(world, member, { kind: 'cannon' }).text, /都有人操作/)
  const land = scene('square', { parts: { cannon: 1 } })
  assert.ok(act(land.world, land.member, { kind: 'cannon' }).rejected)
})

test('船艙和金庫：全隊共用，要在船邊，有容量上限；收起手上的武器會變徒手', () => {
  const { world, member, c } = scene('dock', { name: '黎明號' })
  c.inventory = { 繃帶: 3, 普通武士刀: 1 }
  c.weapon = 'sword'
  c.money = 10_000
  assert.match(say(world, member, '把 2 個繃帶放進船艙').text, /繃帶 × 2放進船艙（2／20）/)
  assert.deepEqual([c.inventory['繃帶'], world.ship!.hold], [1, { 繃帶: 2 }])
  assert.match(say(world, member, '把普通武士刀放進船艙').text, /改為徒手/)
  assert.equal(c.weapon, 'fist')
  assert.match(say(world, member, '從船艙拿出普通武士刀').text, /從船艙拿出普通武士刀/)
  assert.ok(say(world, member, '從船艙拿出 5 個繃帶').rejected)
  assert.match(say(world, member, '把 8,000 貝里放進船上的金庫').text, /金庫裡有 8,000 貝里/)
  assert.equal(c.money, 2_000)
  assert.ok(say(world, member, '把 5000 貝里放進金庫').rejected)
  assert.match(say(world, member, '從金庫拿 3000 貝里').text, /金庫裡有 5,000 貝里/)
  c.inventory['彈藥'] = 30
  assert.match(say(world, member, '把 30 個彈藥放進船艙').text, /放不下/)
  c.place = 'square'
  assert.match(say(world, member, '從金庫拿 3000 貝里').text, /要到船邊/)
})

test('賣掉主船時，船艙和金庫裡的東西歸船主', () => {
  const { world, c } = scene('dock', { name: '黎明號', parts: { sail: 1 }, hold: { 繃帶: 2 }, safe: 700 })
  c.money = 0
  const have = c.inventory['繃帶'] ?? 0
  assert.match(sellMainShip(world), /收購了「黎明號」.*99,000 貝里/)
  assert.deepEqual([c.money, c.inventory['繃帶'], world.ship], [99_700, have + 2, undefined])
})

test('舊存檔的船沒有船型也能用', () => {
  const { world, member } = scene('dock', {})
  assert.deepEqual([modelOf(world.ship!).label, shipSpeed(world.ship!), shipName(world.ship!)], ['小帆船', 7, '小帆船'])
  assert.ok(!act(world, member, { kind: 'sail', order: 'depart', destination: 'shells' }).rejected)
})

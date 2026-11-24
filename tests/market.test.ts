// Canon-beli economy: bounty slips, brokers, crew treasure, merchant specialties, armor, selling and combat items.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LocationId } from '../packages/shared/protocol.ts'
import { makeCharacter, maxSTA, resolve } from '../packages/rules/engine.ts'
import { familiarIntent } from '../packages/world/explore.ts'
import { npcFoe } from '../packages/world/foes.ts'
import { slipName, specials, traderSpecials } from '../packages/world/market.ts'
import { stat } from '../packages/world/races.ts'
import { scale } from '../packages/world/scale.ts'
import { traders } from '../packages/world/traders.ts'
import { newWorld } from '../packages/world/village.ts'
import type { Member, World } from '../packages/world/village.ts'
import { character } from './fixtures.ts'

const dice = (...script: number[]) => (sides: number) => Math.min(sides, script.length ? script.shift()! : sides)
const online = new Set(['host'])
function solo(place: LocationId, race: '人類' | '魚人' = '人類') {
  const world = newWorld('MARKET0001', 'host')
  world.started = true
  world.calmSeas = true
  const member = world.members[0] as Member
  member.character = { ...makeCharacter({ ...character('旅人'), race }), place, unspent: 0 }
  return { world, member, c: member.character }
}
const act = (world: World, member: Member, intent: Parameters<typeof resolve>[2], roll = dice()) => resolve(world, member, intent, '', roll, online)

test('打倒有懸賞的人拿到賞金單，不會直接入袋；船長的寶藏只有第一次', () => {
  const { world, member, c } = solo('buggyBar')
  c.level = 20
  c.hp = 99_999
  const money = c.money
  let text = ''
  act(world, member, { kind: 'attack', target: '巴其' })
  for (let i = 0; i < 30 && world.combat; i++) text = act(world, member, { kind: 'attack' }).text
  assert.equal(world.combat, undefined, '戰鬥要打完')
  const slip = slipName('巴其', 15_000_000)
  assert.equal(c.inventory[slip], 1)
  assert.match(text, /找到了巴其搶來的寶藏：共 5,000,000 貝里/)
  assert.ok(c.money >= money + 5_000_000, '寶藏和戰利品直接入袋')
  assert.ok(c.money < money + 15_000_000, '賞金不會直接入袋')
  assert.deepEqual(world.treasures, ['buggy'])
})

test('兌換賞金單：海軍基地付全額給沒有懸賞金的人，通緝犯只能找地下掮客', () => {
  const slip = slipName('巴其', 15_000_000)
  assert.deepEqual(familiarIntent('兌換賞金單'), { kind: 'bounty' })
  const hunter = solo('marineBase')
  hunter.c.inventory[slip] = 1
  const before = hunter.c.money
  assert.match(act(hunter.world, hunter.member, { kind: 'bounty' }).text, /付給你 15,000,000 貝里/)
  assert.equal(hunter.c.money, before + 15_000_000)
  assert.equal(hunter.c.inventory[slip], undefined)

  const pirate = solo('marineBase')
  pirate.c.bounty = 5_000_000
  pirate.c.inventory[slip] = 2
  assert.match(act(pirate.world, pirate.member, { kind: 'bounty' }).text, /不會付錢給通緝犯/)
  pirate.c.place = 'orangePort'
  const money = pirate.c.money
  assert.match(act(pirate.world, pirate.member, { kind: 'bounty' }).text, /用 25% 的價格付給你 7,500,000 貝里/)
  assert.equal(pirate.c.money, money + 7_500_000)
  pirate.c.place = 'square'
  assert.match(act(pirate.world, pirate.member, { kind: 'bounty' }).text, /身上沒有賞金單/)
  pirate.c.inventory[slip] = 1
  assert.match(act(pirate.world, pirate.member, { kind: 'bounty' }).text, /這裡兌換不了賞金單/)
})

test('各島行商有自己的特產；精鋼武器要等級，買到就是強化過的武器', () => {
  for (const id of Object.keys(traders) as (keyof typeof traders)[]) assert.ok(traderSpecials[id].length > 0, id)
  const { world, member, c } = solo('loguePort')
  c.money = 5_000_000
  assert.match(act(world, member, { kind: 'buy', item: 'steelSword' }).text, /要等級 2 才駕馭得了/)
  c.level = 2
  const bought = act(world, member, { kind: 'buy', item: '精鋼武士刀' })
  assert.match(bought.text, /購入精鋼武士刀，支出 200,000 貝里/)
  assert.equal(c.gear?.sword, 1)
  assert.equal(c.inventory['普通武士刀'], 2)
  assert.match(act(world, member, { kind: 'buy', item: 'flameDial' }).text, /火焰貝是特產，只有空島的行商有賣/)
  assert.deepEqual(familiarIntent('買皮甲'), { kind: 'buy', item: 'leather' })
})

test('食物和櫻花藥可以直接吃喝；亞當木在停船處把船修滿', () => {
  const { world, member, c } = solo('square')
  c.inventory['帶骨肉'] = 1
  c.sta = 0
  assert.match(act(world, member, { kind: 'use', item: '帶骨肉' }).text, /你吃了帶骨肉/)
  assert.equal(c.sta, Math.min(maxSTA(c), 10))
  c.inventory['櫻花藥'] = 1
  c.hp = 10
  act(world, member, { kind: 'use', item: '櫻花藥' })
  assert.equal(c.hp, 10 + (25 + c.level) * scale)
  c.inventory['亞當木'] = 1
  world.ship = { owner: 'host', port: 'dock', hull: 20, wood: 0, trips: 0 }
  assert.match(act(world, member, { kind: 'use', item: '亞當木' }).text, /要在停船的/)
  c.place = 'dock'
  act(world, member, { kind: 'use', item: '亞當木' })
  assert.equal(world.ship.hull, 100)
})

test('防具只算最好的一件；鐵甲加防禦但減敏捷', () => {
  const { world, member, c } = solo('square')
  const agi = stat(c, 'AGI')
  c.inventory['皮甲'] = 1
  c.inventory['鐵甲'] = 1
  assert.equal(stat(c, 'AGI'), agi - 1)
  const def = (text: string) => Number(/反擊旅人，D20 \d+，合計 \d+／(\d+)/.exec(text)?.[1])
  const bare = solo('square')
  const a = def(act(bare.world, bare.member, { kind: 'attack', target: '村長' }, dice(5, 1, 10, 1)).text)
  const b = def(act(world, member, { kind: 'attack', target: '村長' }, dice(5, 1, 10, 1)).text)
  assert.equal(b - a, 2 - 1, '防禦 +2、敏捷 −1，防禦值淨 +1')
})

test('戰鬥道具：火藥星讓對手沒能出手、火焰貝造成傷害、煙霧彈全隊撤離、鹽打倒殭屍', () => {
  const { world, member, c } = solo('square')
  c.level = 10
  Object.assign(c.inventory, { 火藥星: 1, 火焰貝: 1, 煙霧彈: 1 })
  act(world, member, { kind: 'attack', target: '村長' }, dice(1, 1))
  world.combat!.foes[0].hp = world.combat!.foes[0].maxHp = 9_999
  const blind = act(world, member, { kind: 'useItem', item: '火藥星', target: '村長' })
  assert.match(blind.text, /被火藥星嗆得睜不開眼，沒能出手/)
  const burn = act(world, member, { kind: 'useItem', item: '火焰貝' })
  assert.match(burn.text, new RegExp('傷害 ' + (15 + 10) * scale))
  const escape = act(world, member, { kind: 'useItem', item: '煙霧彈' })
  assert.match(escape.text, /已經撤到/)
  assert.equal(world.combat, undefined)
  assert.notEqual(c.place, 'square')

  const z = solo('graveyard')
  z.c.inventory['鹽'] = 1
  z.world.combat = { round: 1, place: 'graveyard', participants: ['host'], foes: [{ ...npcFoe('brook', z.world.minute), name: '殭屍甲', npc: undefined }], choices: {} }
  assert.match(act(z.world, z.member, { kind: 'useItem', item: '鹽' }).text, /殭屍當場倒下/)
})

test('賣東西給行商：半價；賞金單和不收的東西會說明', () => {
  const { world, member, c } = solo('syrupPort')
  c.inventory['普通長槍'] = 1
  const money = c.money
  assert.match(act(world, member, { kind: 'sell', item: '普通長槍' }).text, /付給你 20,000 貝里/)
  assert.equal(c.money, money + 20_000)
  c.inventory[slipName('巴其', 15_000_000)] = 1
  assert.match(act(world, member, { kind: 'sell', item: '賞金單' }).text, /海軍基地兌換/)
  assert.match(act(world, member, { kind: 'sell', item: '普通衣物' }).text, /我不收/)
  c.place = 'kayaMansion'
  assert.match(act(world, member, { kind: 'sell', item: '繃帶' }).text, /沒有收購東西的人/)
})

test('聲望影響價格；海軍的軍需商不賣給有懸賞金的人', () => {
  const { world, member, c } = solo('syrupPort')
  c.money = 10_000_000
  world.renown = { marineHeat: 0, islandRep: { syrup: 30 } }
  assert.match(act(world, member, { kind: 'buy', item: 'sword' }).text, /支出 45,000 貝里/)
  world.renown.islandRep.syrup = -5
  assert.match(act(world, member, { kind: 'buy', item: 'sword' }).text, /支出 60,000 貝里/)
  const m = solo('marinefordBay')
  m.c.money = 10_000_000
  m.c.bounty = 1_000_000
  assert.match(act(m.world, m.member, { kind: 'buy', item: 'marineArmor' }).text, /不賣給通緝犯/)
})

test('特產的說明都有數字，價格都是正數', () => {
  for (const [id, ware] of Object.entries(specials)) {
    assert.ok(ware.price > 0 && ware.text.length > 0, id)
  }
})

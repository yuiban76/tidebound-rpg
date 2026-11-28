// 天賦林: 500 nodes, three points a level, learned outward from the job's start; the haki sea opens after the two years.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Game } from '../apps/host/game.ts'
import { Store } from '../apps/host/store.ts'
import { makeCharacter, maxHP, resolve, trainSkill } from '../packages/rules/engine.ts'
import { learnTalents, refundTalent, resetPrice, resetTalents } from '../packages/rules/talents.ts'
import { hakiRank, train } from '../packages/rules/timeskip.ts'
import { stat } from '../packages/world/races.ts'
import { npcFoe } from '../packages/world/foes.ts'
import {
  fxKeys, fxOf, learnBlock, ownedTalents, pathTo, talentList, talentNodes, talentPointsLeft, talentTotal,
} from '../packages/world/talents.ts'
import { newWorld, normalizeWorld } from '../packages/world/village.ts'
import type { Character, Member, World } from '../packages/world/village.ts'
import { character, compatibilityFixture } from './fixtures.ts'

const dice = (...script: number[]) => (sides: number) => Math.min(sides, script.length ? script.shift()! : sides)
const online = new Set(['host'])

function hero(level = 10, change: Partial<Character> = {}) {
  const world = newWorld('TALENT0001', 'host')
  world.started = true
  world.calmSeas = true
  const member = world.members[0] as Member
  member.character = { ...makeCharacter({ ...character('阿浪'), fighting: 'sword', profession: 'fighter' }), level, ...change }
  member.character.hp = maxHP(member.character)
  member.character.sta = 999
  return { world, member, c: member.character }
}
const act = (world: World, member: Member, intent: Parameters<typeof resolve>[2], roll = dice()) => resolve(world, member, intent, '', roll, online)
/** A fight against someone who will not fall soon. */
function brawl(world: World) {
  const foe = npcFoe('buggy', 0)
  foe.hp = foe.maxHp = 1_000_000
  world.combat = { round: 1, place: world.members[0].character!.place, participants: ['host'], foes: [foe], choices: {} }
}
/** Learns everything on the way to a node. */
const reach = (c: Character, id: string) => learnTalents(c, pathTo(c, id))

test('天賦林剛好 500 個節點：連線雙向、每個節點都連得到，效果只用規則看得懂的鍵', () => {
  assert.equal(talentList.length, talentTotal)
  const kinds = Object.groupBy(talentList, n => n.kind)
  assert.deepEqual([kinds.root?.length, kinds.notable?.length, kinds.keystone?.length, kinds.minor?.length], [10, 124, 21, 345])
  for (const node of talentList) for (const other of node.links) assert.ok(talentNodes.get(other)?.links.includes(node.id), node.id + '→' + other)
  const seen = new Set(['job.fighter'])
  const queue = ['job.fighter']
  while (queue.length) for (const next of talentNodes.get(queue.pop()!)!.links) if (!seen.has(next)) { seen.add(next); queue.push(next) }
  assert.equal(seen.size, talentTotal, '從任何起點都走得到整座天賦林')
  const known = new Set<string>(fxKeys)
  for (const node of talentList) for (const key of Object.keys(node.fx))
    assert.ok(known.has(key.split('@')[0]) || /^(attr|skill):/.test(key), node.id + ' 用了未知的效果 ' + key)
  // Nodes never sit on top of each other.
  for (const a of talentList) for (const b of talentList) if (a.id < b.id) assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 24, a.id + ' / ' + b.id)
})

test('每升 1 級得 3 點；只能學連到已學會的天賦，點數不夠就不能學，一條路線要嘛全學、要嘛都不學', () => {
  const { c } = hero(1)
  assert.equal(talentPointsLeft(c), 0)
  assert.ok(ownedTalents(c).has('job.fighter'), '職業起點免費')
  c.level = 3
  assert.equal(talentPointsLeft(c), 6)
  assert.match(learnTalents(c, ['w.sword.iron']).text, /要先學一個連到/)
  const far = pathTo(c, 'k.allout')
  assert.ok(far.length > 6)
  const before = [...c.talents]
  assert.match(learnTalents(c, far).text, /沒有天賦點/)
  assert.deepEqual(c.talents, before, '點數不夠時整條路線都不學')
  const path = pathTo(c, 'c.instinct')
  assert.equal(learnTalents(c, path).rejected, undefined)
  assert.equal(talentPointsLeft(c), 6 - path.length)
  assert.equal(fxOf(c, 'hit'), 2, '職業起點命中 +1，加上戰鬥本能 +1')
})

test('退點：外面還連著別的天賦就不能退；全部重置要在港口付錢', () => {
  const { c } = hero(12)
  reach(c, 'c.instinct')
  const path = pathTo(c, 'c.instinct')
  assert.equal(path.length, 0)
  const middle = c.talents[1]
  assert.match(refundTalent(c, middle).text, /外面還有連著/)
  const last = c.talents.at(-1)!
  const left = talentPointsLeft(c)
  assert.equal(refundTalent(c, last).rejected, undefined)
  assert.equal(talentPointsLeft(c), left + 1)
  assert.match(refundTalent(c, 'job.fighter').text, /免費的起點/)
  c.place = 'square'
  assert.match(resetTalents(c).text, /要到港口/)
  c.place = 'dock'
  c.money = resetPrice(c)
  assert.equal(resetTalents(c).rejected, undefined)
  assert.deepEqual([c.talents, c.money], [[], 0])
})

test('終極天賦每片海域只能拿一個；劍豪之道不讓人改用射擊武器', () => {
  const { world, member, c } = hero(40)
  assert.equal(reach(c, 'k.swordsman').rejected, undefined)
  assert.match(learnTalents(c, pathTo(c, 'k.allout')).text, /只能拿一個終極天賦/)
  c.inventory['普通火槍'] = 1
  assert.match(act(world, member, { kind: 'equip', weapon: 'musket' }).text, /劍豪之道/)
  const { c: plain } = hero(40)
  reach(plain, 'k.swordsman')
  refundTalent(plain, 'k.swordsman')
  assert.equal(fxOf(c, 'hit', 'sword') - fxOf(plain, 'hit', 'sword'), 2, '劍豪之道：用刀劍命中 +2')
})

test('屬性之門讓屬性 +1；HP 和 STA 的天賦會讓上限跟著變，學的時候現有的 HP 也補上', () => {
  const { c } = hero(10)
  const str = stat(c, 'STR')
  reach(c, 'attr.STR')
  assert.equal(stat(c, 'STR'), str + 1)
  const { c: other } = hero(10)
  const path = pathTo(other, 'k.unbowed')
  learnTalents(other, path.slice(0, -1))
  const [before, full] = [maxHP(other), other.hp === maxHP(other)]
  learnTalents(other, path.slice(-1))
  assert.ok(maxHP(other) < before, '不屈的意志：HP 上限 −10%')
  assert.ok(full && other.hp === maxHP(other), '上限變小時，現有 HP 不會超過上限')
})

test('惡魔果實和霸氣海域要先解鎖；霸氣改從天賦林提升，霸王色要有資質', () => {
  const { c } = hero(20)
  assert.equal(pathTo(c, 'p.apply').length, 0)
  assert.match(learnBlock(c, 'ha.2') ?? '', /兩年修行/)
  c.fruit = 'ope'
  assert.ok(ownedTalents(c).has('root.fruit'))
  assert.ok(pathTo(c, 'p.apply').length > 0, '手術果實是超人系')
  assert.equal(pathTo(c, 'z.wild').length, 0, '動物系的路線走不進去')
  train(c, dice(1))
  assert.equal(hakiRank(c, '武裝色'), 1)
  assert.match(trainSkill(c, '武裝色').text, /天賦林/)
  assert.equal(reach(c, 'ha.3').rejected, undefined)
  assert.equal(hakiRank(c, '武裝色'), 3)
  assert.equal(pathTo(c, 'h.awe').length, 0, '沒有霸王色資質走不進霸王色路線')
  c.haki = { ...c.haki, conqueror: true }
  assert.ok(ownedTalents(c).has('h.conqueror'), '覺醒的人免費得到霸王色霸氣')
  assert.ok(pathTo(c, 'h.awe').length > 0)
})

test('戰鬥：斬鐵無視護甲、捨身一擊加倍、狂戰士不能防守，霸王色要有天賦節點', () => {
  const hitOn = (talent?: string) => {
    const { world, member, c } = hero(40)
    if (talent) assert.equal(reach(c, talent).rejected, undefined)
    const text = act(world, member, { kind: 'attack', target: '村長' }, dice(15, 3, 3, 3, 3)).text
    return Number(/傷害 (\d+)/.exec(text)?.[1])
  }
  const plain = hitOn()
  assert.ok(hitOn('k.allout') >= plain * 2 - 1, '捨身一擊的第一擊傷害 ×2')
  const armoured = (talent?: string) => {
    const { world, member, c } = hero(40)
    if (talent) reach(c, talent)
    brawl(world)
    world.combat!.foes[0].armor = 6
    const text = act(world, member, { kind: 'attack', target: world.combat!.foes[0].name }, dice(15, 3, 3, 3, 3)).text
    return { damage: Number(/傷害 (\d+)/.exec(text)?.[1]), pierce: fxOf(c, 'pierce', 'sword') }
  }
  const [bare, iron] = [armoured(), armoured('w.sword.iron')]
  assert.equal(iron.pierce, 2)
  assert.ok(iron.damage >= bare.damage + 2 * 10, '斬鐵：無視 2 點護甲（數值 ×10）')
  const { world, member, c } = hero(40)
  reach(c, 'k.berserk')
  brawl(world)
  assert.match(act(world, member, { kind: 'guard' }).text, /狂戰士/)
  const { world: w2, member: m2, c: c2 } = hero(20, { haki: { trained: true } })
  brawl(w2)
  assert.match(act(w2, m2, { kind: 'conqueror' }).text, /還沒有覺醒霸王色/)
  c2.haki = { trained: true, conqueror: true }
  assert.doesNotMatch(act(w2, m2, { kind: 'conqueror' }, dice(1, 1, 1, 1)).text, /覺醒|天賦林/, '覺醒的人免費得到霸王色節點')
})

test('商店：殺價高手便宜 10%（路上的小節點再便宜一點）', () => {
  const price = (talent?: string) => {
    const { world, member, c } = hero(30)
    if (talent) reach(c, talent)
    c.place = 'dock'
    c.money = 10_000_000
    act(world, member, { kind: 'buy', item: 'bandage' })
    return { paid: 10_000_000 - c.money, cut: fxOf(c, 'shopPct') }
  }
  const full = price().paid
  const cheap = price('s.haggle')
  assert.ok(cheap.cut <= -10)
  assert.equal(cheap.paid, Math.round(full * (1 + cheap.cut / 100)))
})

test('舊存檔沒有天賦欄位：讀檔時補上，已經升過級的人直接有點數可用', () => {
  const { world, c } = hero(9)
  delete (c as Partial<Character>).talents
  normalizeWorld(world)
  assert.deepEqual(c.talents, [])
  assert.equal(talentPointsLeft(c), 24)
})

test('房主：學天賦是直接的規則操作，戰鬥中不能調整', async t => {
  const ai = await compatibilityFixture()
  const store = new Store(':memory:')
  const game = new Game(store)
  t.after(async () => { game.stop(); store.db.close(); await ai.close() })
  await game.configure({ baseUrl: ai.baseUrl, model: 'fixture-model' })
  const view = game.create()
  const [code, id] = [view.world.code, view.player]
  game.message(code, id, { kind: 'character', character: character('阿浪') })
  game.message(code, id, { kind: 'ready', ready: true, agree: true })
  await game.start(code)
  const world = game.room(code)
  world.members[0].character!.level = 5
  game.store.save(world)
  const c = () => game.room(code).members[0].character!
  game.message(code, id, { kind: 'learnTalents', ids: pathTo(c(), 'c.instinct').slice(0, 2) })
  assert.equal(c().talents.length, 2)
  assert.throws(() => game.message(code, id, { kind: 'learnTalents', ids: ['k.allout'] }), /要先學一個連到/)
  const fight = game.room(code)
  fight.combat = { round: 1, place: 'square', participants: [id], foes: [], choices: {} }
  game.store.save(fight)
  assert.throws(() => game.message(code, id, { kind: 'refundTalent', id: c().talents[1] }), /戰鬥中不能調整天賦/)
})

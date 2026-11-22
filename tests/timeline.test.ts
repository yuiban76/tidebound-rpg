import assert from 'node:assert/strict'
import { test } from 'node:test'
import { makeCharacter, resolve } from '../packages/rules/engine.ts'
import { canonTimeline, luffyRoute, minuteOf } from '../packages/world/canon.ts'
import { eventPhases } from '../packages/world/phases.ts'
import { hasFlag, setFlag } from '../packages/world/flags.ts'
import { alertWithin, advanceTimeline, eventTime, newsDelayHours } from '../packages/world/timeline.ts'
import { newWorld, npcFacts, npcPlace } from '../packages/world/village.ts'
import type { Member, World } from '../packages/world/village.ts'
import type { LocationId } from '../packages/shared/protocol.ts'
import { character } from './fixtures.ts'

const at = (day: number, hour: number) => (day - 1) * 1440 + hour * 60
const dice = (...script: number[]) => (sides: number) => Math.min(sides, script.length ? script.shift()! : sides)

function party(place: LocationId, ...extra: { id: string, place: LocationId }[]) {
  const world = newWorld('TIME000001', 'host')
  world.started = true
  const first = world.members[0] as Member
  first.character = makeCharacter(character('旅人'))
  first.character.place = place
  for (const more of extra) {
    const m = { ...structuredClone(first), id: more.id } as Member
    m.character = makeCharacter(character('同伴' + more.id))
    m.character.place = more.place
    world.members.push(m)
  }
  world.minute = at(1, 8)
  return world
}

test('時間線資料：每件事都有預兆與警告，現場事件的對手存在，路飛行程的旗標有效', () => {
  for (const event of canonTimeline) {
    assert.ok(eventPhases[event.id]?.omen && eventPhases[event.id]?.warn, event.id + ' 缺預兆或警告')
  }
  for (const id of Object.keys(eventPhases)) assert.ok(canonTimeline.some(event => event.id === id), id + ' 不是時間線事件')
  const times = luffyRoute.map(stop => minuteOf(stop.at))
  assert.deepEqual(times, [...times].sort((a, b) => a - b))
})

test('旗標：任務、擊敗、招募、物品、所在島與自訂旗標，可用 ! 反轉', () => {
  const world = party('square')
  assert.equal(hasFlag(world, 'task:syrup'), false)
  world.islandTasks = { syrup: { stage: 'done' } }
  assert.equal(hasFlag(world, 'task:syrup'), true)
  assert.equal(hasFlag(world, '!task:syrup'), false)
  world.defeated = ['arlong']
  assert.equal(hasFlag(world, 'defeated:arlong'), true)
  assert.equal(hasFlag(world, 'at:wind'), true)
  assert.equal(hasFlag(world, 'at:shells'), false)
  world.members[0].character!.inventory['潮汐簿'] = 1
  assert.equal(hasFlag(world, 'item:潮汐簿'), true)
  assert.equal(hasFlag(world, 'recruited:usopp'), false)
  setFlag(world, 'recruited:usopp')
  assert.equal(hasFlag(world, 'recruited:usopp'), true)
})

test('四階段：隊伍在島上依序聽到傳聞、警告，事件發生後是目擊與後續', () => {
  const world = party('shellsTown')
  const texts = (items: { text: string }[]) => items.map(item => item.text).join('\n')
  world.minute = at(1, 8)
  assert.match(texts(advanceTimeline(world)), /【傳聞】謝爾茲鎮/)
  world.minute = at(2, 7)
  assert.match(texts(advanceTimeline(world)), /【警告】謝爾茲鎮/)
  world.minute = at(2, 12)
  assert.match(texts(advanceTimeline(world)), /【目擊】謝爾茲鎮・/)
  assert.equal(world.timeline?.shells, 'canon')
  world.minute = at(2, 25)
  assert.match(texts(advanceTimeline(world)), /【後續】謝爾茲鎮/)
  // each phase is heard once
  assert.equal(advanceTimeline(world).filter(item => /傳聞|警告/.test(item.text)).length, 0)
})

test('不在島上聽不到傳聞，消息要等報紙：依距離延後，每天 06:00 出刊', () => {
  const world = party('square')
  advanceTimeline(world)
  world.minute = at(2, 13)
  const heard = advanceTimeline(world)
  assert.equal(heard.filter(item => item.text.includes('謝爾茲鎮')).length, 0)
  assert.equal(world.timeline?.shells, 'canon')
  assert.ok(world.paperQueue?.some(item => item.event === 'shells'))
  const delay = newsDelayHours('shells', 'wind')
  assert.ok(delay > 0 && delay <= 72)
  world.minute = at(5, 7)
  const paper = advanceTimeline(world)
  assert.ok(paper.some(item => item.text.startsWith('【報紙】謝爾茲鎮・')))
  assert.ok(world.news?.some(item => item.kind === 'paper' && item.event === 'shells'))
  assert.equal(newsDelayHours('wind', 'wind'), 0)
})

test('改寫與提前延後：旗標讓結果、時間改變', () => {
  const world = party('square')
  assert.equal(eventTime(world, canonTimeline.find(e => e.id === 'arlong')!), minuteOf([8, 16]))
  world.islandTasks = { cocoyasi: { stage: 'done' } }
  assert.equal(eventTime(world, canonTimeline.find(e => e.id === 'arlong')!), minuteOf([8, 16]) - 8 * 60)
  world.islandTasks = { impelDown: { stage: 'done' } }
  assert.equal(eventTime(world, canonTimeline.find(e => e.id === 'execution')!), minuteOf([60, 9]) + 72 * 60)
  // recruiting Zoro first changes what the canon story says
  const w2 = party('square')
  setFlag(w2, 'recruited:zoro')
  w2.minute = at(2, 13)
  advanceTimeline(w2)
  assert.equal(w2.timeline?.shells, 'changed')
  assert.ok(w2.paperQueue?.some(item => /索隆早已被一群旅人帶走/.test(item.text)))
})

test('現場事件：隊伍在場、對手也在，事件先暫停；打倒對手就改寫，逾時則照原作', () => {
  const world = party('kayaMansion')
  world.minute = at(4, 6)
  const first = advanceTimeline(world)
  assert.ok(first.some(item => item.text.startsWith('【現場】')), JSON.stringify(first))
  assert.equal(world.timeline?.syrup, undefined)
  world.minute = at(4, 8)
  advanceTimeline(world)
  assert.equal(world.timeline?.syrup, undefined)
  world.defeated = ['klahadore']
  advanceTimeline(world)
  assert.equal(world.timeline?.syrup, 'changed')

  const late = party('kayaMansion')
  late.minute = at(4, 6)
  advanceTimeline(late)
  late.minute = at(4, 12)
  advanceTimeline(late)
  assert.equal(late.timeline?.syrup, 'canon')
})

test('睡覺遇到警告會被叫醒，不會一覺睡過事件', () => {
  const world = party('shellsTown')
  world.minute = at(2, 2)
  const alert = alertWithin(world, 8 * 60)
  assert.equal(alert, 4 * 60)
  const result = resolve(world, world.members[0] as Member, { kind: 'rest', sleep: true }, '', dice(), new Set(['host']))
  assert.match(result.text, /吵醒/)
  assert.equal(result.minutes, 4 * 60)
  const wait = resolve(world, world.members[0] as Member, { kind: 'wait', hours: 24 }, '', dice(), new Set(['host']))
  assert.equal(wait.minutes, 4 * 60)
})

test('共用時鐘：隊友不在同地或不在線時不能睡覺快轉', () => {
  const world = party('square', { id: 'p2', place: 'tavern' })
  const online = new Set(['host', 'p2'])
  assert.match(resolve(world, world.members[0] as Member, { kind: 'rest', sleep: true }, '', dice(), online).text, /全隊都要在線並在同一地點/)
  world.members[1].character!.place = 'square'
  assert.equal(resolve(world, world.members[0] as Member, { kind: 'rest', sleep: true }, '', dice(), online).rejected, undefined)
  assert.match(resolve(world, world.members[0] as Member, { kind: 'rest', sleep: true }, '', dice(), new Set(['host'])).text, /全隊都要在線/)
})

test('路飛跟著狀態走：夥伴先被玩家招募，他的隊伍就缺人；頭目先被打倒，他改道', () => {
  const world = party('square')
  setFlag(world, 'recruited:zoro')
  world.minute = at(2, 17)
  advanceTimeline(world)
  assert.match(npcFacts(world, 'luffy'), /早已跟著別人走/)
  world.minute = at(5, 12)
  advanceTimeline(world)
  assert.match(npcFacts(world, 'luffy'), /卓洛|索隆/)

  const w2 = party('square')
  w2.defeated = ['arlong']
  w2.minute = at(7, 15)
  advanceTimeline(w2)
  assert.equal(npcPlace(w2, 'luffy'), null)
  assert.match(npcFacts(w2, 'luffy'), /惡龍已經被別人打倒/)
})

test('打倒頭目會登上之後的報紙，舊存檔不會補印過期報紙', () => {
  const world = party('square')
  advanceTimeline(world)
  world.defeated = ['arlong']
  world.minute = at(3, 8)
  advanceTimeline(world)
  world.minute = at(4, 7)
  const out = advanceTimeline(world)
  assert.ok(out.some(item => item.text.startsWith('【報紙】') && /惡龍倒下了/.test(item.text)))
  const legacy: World = party('square')
  legacy.defeated = ['klahadore']
  legacy.minute = at(30, 9)
  assert.equal(advanceTimeline(legacy).filter(item => /克拉哈德/.test(item.text) && item.text.startsWith('【報紙】管家')).length, 0)
})

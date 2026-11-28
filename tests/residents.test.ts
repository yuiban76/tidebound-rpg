// The canon people who live at each island's important places (packages/world/cast.ts).
import { allGates } from './fixtures.ts'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LocationId, NpcId } from '../packages/shared/protocol.ts'
import { makeCharacter, resolve } from '../packages/rules/engine.ts'
import { cannotJoin } from '../packages/world/companions.ts'
import { advanceTimeline } from '../packages/world/timeline.ts'
import { newWorld, npcPlace } from '../packages/world/village.ts'
import type { Member, World } from '../packages/world/village.ts'
import { character } from './fixtures.ts'

const at = (day: number, hour: number) => (day - 1) * 1440 + hour * 60
const misses = () => 1
function world(minute = at(1, 9)) {
  const w = newWorld('RESIDENT01', 'host')
  w.started = true
  w.calmSeas = true
  w.gates = allGates()
  w.minute = minute
  advanceTimeline(w)
  return w
}

test('第一天的重要地點都有原作人物在', () => {
  const w = world()
  const expected: [NpcId, LocationId][] = [
    ['morgan', 'marineBase'], ['helmeppo', 'shellsTown'], ['buggy', 'buggyBar'], ['cabaji', 'buggyBar'], ['mohji', 'buggyBar'],
    ['jango', 'syrupSlope'], ['merry', 'kayaMansion'], ['usoppKids', 'syrupHill'], ['patty', 'baratieDeck'], ['carne', 'baratieDeck'],
    ['nezumi', 'marine16'], ['toto', 'yuba'], ['kohza', 'katorea'], ['amazon', 'heavenGate'], ['wyper', 'shandiaVillage'],
    ['ohm', 'upperYard'], ['zambai', 'backStreet'], ['baskerville', 'courthouse'], ['hogback', 'hogbackLab'], ['absalom', 'thrillerForest'],
    ['disco', 'auctionHouse'], ['camie', 'sabaodyPark'], ['marguerite', 'kujaVillage'], ['sandersonia', 'kujaArena'],
    ['marigold', 'kujaArena'], ['hannyabal', 'impelLevel4'],
  ]
  for (const [npc, place] of expected) assert.equal(npcPlace(w, npc), place, npc)
  assert.equal(npcPlace(w, 'charloss'), null, '天龍人要到拍賣會那天才出現')
})

test('原作時間到了人物會移動：蒙卡被押走、寇沙回到尤巴、凱米被擺上拍賣台', () => {
  const w = world()
  const step = (day: number, hour: number) => { w.minute = at(day, hour); advanceTimeline(w) }
  step(2, 14)
  assert.equal(npcPlace(w, 'morgan'), null)
  assert.equal(npcPlace(w, 'helmeppo'), 'marineBase')
  step(26, 13)
  assert.equal(npcPlace(w, 'kohza'), 'yuba')
  step(58, 11)
  assert.equal(npcPlace(w, 'camie'), 'auctionHouse')
  assert.equal(npcPlace(w, 'charloss'), 'auctionHouse')
  step(58, 17)
  assert.equal(npcPlace(w, 'camie'), 'sabaodyPark')
  assert.equal(npcPlace(w, 'charloss'), null)
})

test('先打倒蒙卡上校，草帽少年來的時候謝爾茲鎮的新聞會改寫', () => {
  const w = world()
  const member = w.members[0] as Member
  member.character = { ...makeCharacter(character('阿浪')), place: 'shellsTown' }
  w.defeated = ['morgan']
  w.npcPlaces = { morgan: null }
  w.minute = at(2, 13)
  const news = advanceTimeline(w)
  assert.ok(news.some(item => item.text.includes('蒙卡上校早已被一群旅人打倒')), JSON.stringify(news.map(item => item.text)))
})

test('攻擊蒙卡上校，基地的海軍士兵一起上；天龍人不能招募', () => {
  const w: World = world()
  const member = w.members[0] as Member
  member.character = { ...makeCharacter(character('阿浪')), place: 'marineBase', hp: 99_999 }
  resolve(w, member, { kind: 'attack', target: '斧手蒙卡' }, '攻擊蒙卡', misses, new Set(['host']))
  const names = w.combat?.foes.map(foe => foe.name) ?? []
  assert.equal(names[0], '斧手蒙卡')
  assert.equal(names.filter(name => name.startsWith('基地的海軍士兵')).length, 2)
  assert.ok(cannotJoin.charloss)
})

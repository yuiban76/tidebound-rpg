import assert from 'node:assert/strict'
import { test } from 'node:test'
import { guideFor, makeCharacter, resolve } from '../packages/rules/engine.ts'
import { newWorld, npcPlace } from '../packages/world/village.ts'
import type { Member, World } from '../packages/world/village.ts'
import { advanceTimeline } from '../packages/world/timeline.ts'
import { companionIds, hurtCompanion, healCompanions, companionSlots, companionMaxHp, companionFight, maxCrew, recruitableAt } from '../packages/world/companions.ts'
import { dismissRequest, familiarIntent, handoverRequest, recruitRequest } from '../packages/world/explore.ts'
import { hasFlag } from '../packages/world/flags.ts'
import { intentSchema } from '../packages/shared/protocol.ts'
import type { LocationId, NpcId } from '../packages/shared/protocol.ts'
import { scale } from '../packages/world/scale.ts'
import { character } from './fixtures.ts'

const dice = (...script: number[]) => (sides: number) => Math.min(sides, script.length ? script.shift()! : sides)
const online = new Set(['host'])

function setup(npc: NpcId = 'usopp') {
  const world = newWorld('COMP000001', 'host')
  world.started = true
  world.crew = true
  const member = world.members[0] as Member
  member.character = makeCharacter(character('旅人'))
  const place = npcPlace(world, npc) as LocationId
  member.character.place = place
  return { world, member, c: member.character }
}
const act = (world: World, member: Member, intent: Parameters<typeof resolve>[2], roll = dice()) =>
  resolve(world, member, intent, '', roll, online)

test('邀請成功：建立夥伴狀態並公告加入', () => {
  const { world, member } = setup()
  const result = act(world, member, { kind: 'recruit', npc: 'usopp' })
  assert.match(result.text, /加入了船團/)
  assert.deepEqual(companionIds(world), ['usopp'])
  assert.equal(world.companions!.usopp!.leader, member.id)
})

test('沒有船團、擲骰失敗、冷卻中都不會加入', () => {
  const a = setup()
  a.world.crew = false
  assert.match(act(a.world, a.member, { kind: 'recruit', npc: 'usopp' }).text, /還沒有正式成立船團/)
  const b = setup()
  const failed = act(b.world, b.member, { kind: 'recruit', npc: 'usopp' }, dice(1))
  assert.equal(companionIds(b.world).length, 0)
  assert.ok(failed.text.length > 0)
  assert.match(act(b.world, b.member, { kind: 'recruit', npc: 'usopp' }).text, /還在考慮/)
  b.world.minute += 121
  assert.match(act(b.world, b.member, { kind: 'recruit', npc: 'usopp' }).text, /加入了船團/)
})

test('夥伴會跟著隊長移動，離隊後留在原地', () => {
  const { world, member, c } = setup()
  act(world, member, { kind: 'recruit', npc: 'usopp' })
  c.place = 'dock'
  assert.equal(npcPlace(world, 'usopp'), 'dock')
  assert.match(act(world, member, { kind: 'dismiss', npc: 'usopp' }).text, /離隊|離開/)
  assert.equal(companionIds(world).length, 0)
  assert.equal(npcPlace(world, 'usopp'), 'dock')
})

test('夥伴不能被攻擊，時間線不會改動夥伴位置', () => {
  const { world, member, c } = setup()
  act(world, member, { kind: 'recruit', npc: 'usopp' })
  assert.match(act(world, member, { kind: 'attack', target: '騙人布' }).text, /夥伴|沒有可以攻擊/)
  c.place = 'dock'
  advanceTimeline(world)
  assert.equal(npcPlace(world, 'usopp'), c.place)
})

test('夥伴上限與受傷、休息恢復', () => {
  const { world, member } = setup()
  act(world, member, { kind: 'recruit', npc: 'usopp' })
  const hp = world.companions!.usopp!.hp
  hurtCompanion(world, 'usopp', 3)
  assert.equal(world.companions!.usopp!.hp, hp - 3)
  healCompanions(world, 1)
  assert.equal(world.companions!.usopp!.hp, hp)
  assert.equal(maxCrew, 10)
  assert.equal(companionSlots(world), 9)
  assert.ok(Array.isArray(recruitableAt(world, member.character!.place)))
})

test('指令解析：邀請、離隊、閒聊不誤判', () => {
  assert.equal(recruitRequest('叫騙人布加入我的海賊團'), 'usopp')
  assert.equal(recruitRequest('招募香吉士'), 'sanji')
  assert.equal(recruitRequest('騙人布為什麼加入海賊團'), undefined)
  assert.equal(dismissRequest('請騙人布離隊'), 'usopp')
  assert.deepEqual(familiarIntent('邀請騙人布加入', {} as never), { kind: 'recruit', npc: 'usopp' })
})

test('intent schema 接受 recruit 與 dismiss', () => {
  assert.ok(intentSchema.safeParse({ kind: 'recruit', npc: 'usopp' }).success)
  assert.ok(intentSchema.safeParse({ kind: 'dismiss', npc: 'usopp' }).success)
  assert.ok(!intentSchema.safeParse({ kind: 'recruit', npc: 'nobody' }).success)
})

test('船團含玩家最多 10 人：名額滿了就不能再邀請', () => {
  const { world, member } = setup()
  assert.equal(companionSlots(world), 9)
  world.companions = {}
  for (const id of ['zoro', 'sanji', 'vivi', 'chopper', 'robin', 'franky', 'brook', 'lamplighter', 'kaya'] as NpcId[])
    world.companions[id] = { leader: member.id, since: 0, hp: 5 }
  assert.equal(companionIds(world).length, 9)
  assert.match(act(world, member, { kind: 'recruit', npc: 'usopp' }).text, /船團已滿 10 人/)
})

test('夥伴數值隨隊伍等級成長，升級時多出的 HP 會補上', () => {
  const { world, member, c } = setup()
  act(world, member, { kind: 'recruit', npc: 'usopp' })
  const base = companionMaxHp(world, 'usopp')
  const hp = world.companions!.usopp!.hp
  c.level = 5
  assert.equal(companionMaxHp(world, 'usopp'), base + 16 * scale)
  assert.ok(companionFight(world, 'usopp').skill > 3)
  advanceTimeline(world)
  assert.equal(world.companions!.usopp!.hp, hp + 16 * scale)
  assert.equal(world.companions!.usopp!.level, 5)
})

test('夥伴可以轉交給同地點的其他玩家，之後跟著新隊長走', () => {
  const { world, member, c } = setup()
  const friend = { ...structuredClone(member), id: 'p2' } as Member
  friend.character = makeCharacter(character('娜美'))
  friend.character.place = c.place
  world.members.push(friend)
  act(world, member, { kind: 'recruit', npc: 'usopp' })
  assert.match(act(world, member, { kind: 'handover', npc: 'usopp', to: '路人' }).text, /找不到/)
  assert.match(act(world, member, { kind: 'handover', npc: 'usopp', to: '娜美' }).text, /現在由娜美帶領/)
  friend.character.place = 'dock'
  assert.equal(npcPlace(world, 'usopp'), 'dock')
  assert.match(act(world, member, { kind: 'handover', npc: 'usopp', to: '娜美' }).text, /只有娜美能轉交|不在|跟著娜美/)
  assert.deepEqual(handoverRequest('把騙人布交給娜美'), { npc: 'usopp', to: '娜美' })
  assert.equal(handoverRequest('把騙人布交給娜美')?.npc, 'usopp')
  assert.ok(intentSchema.safeParse({ kind: 'handover', npc: 'usopp', to: '娜美' }).success)
})

test('回復系統：口語指令、吃飯、休息與狀態提示', () => {
  const { world, member, c } = setup()
  assert.deepEqual(familiarIntent('睡覺', world as never), { kind: 'rest', sleep: true })
  assert.deepEqual(familiarIntent('休息一下', world as never), { kind: 'rest', sleep: false })
  assert.deepEqual(familiarIntent('休息 8 小時', world as never), { kind: 'wait', hours: 8 })
  c.hp = 1; c.sta = 0
  const short = act(world, member, { kind: 'rest', sleep: false })
  assert.ok(c.hp > 1 && c.sta > 0 && /稍作休息/.test(short.text))
  c.hp = 1; c.sta = 0
  assert.match(act(world, member, { kind: 'rest', sleep: true }).text, /睡了一覺/)
  c.place = 'tavern'; c.hp = 1; c.sta = 0; c.money = 100
  assert.match(act(world, member, { kind: 'meal', dish: 'rice' }).text, /HP \+50、STA \+8/)
  assert.equal(c.money, 65)
  c.hp = 1
  assert.match(guideFor(world as never, member).text, /你的狀態不太好.*休息.*烤麵包/s)
})

test('除了少數劇情核心，所有 NPC 都能招募；反派要更高等級', async () => {
  const { npcs } = await import('../packages/shared/protocol.ts')
  const { cannotJoin, recruitable } = await import('../packages/world/companions.ts')
  const ids = Object.keys(npcs) as NpcId[]
  for (const id of ids) assert.ok(recruitable[id] || cannotJoin[id], id + ' 既不能招募也沒有理由')
  assert.deepEqual(Object.keys(cannotJoin).sort(), ['ace', 'aokiji', 'akainu', 'courier', 'dragon', 'garp', 'kizaru', 'kuma', 'laboon', 'luffy', 'rayleigh', 'sengoku', 'shanks', 'whitebeard'].sort())
  assert.ok(recruitable.arlong?.villain && recruitable.arlong.minLevel! >= 6)
  assert.equal(recruitable.kaya?.villain, undefined)
  assert.ok(recruitable.kureha?.medic)
})

test('招募一般居民與反派：居民擲骰成功就加入，反派等級不夠被拒絕，打倒過會服氣', () => {
  const { world, member, c } = setup('kaya')
  assert.match(act(world, member, { kind: 'recruit', npc: 'kaya' }).text, /加入了船團/)
  assert.ok(hasFlag(world, 'recruited:kaya'))
  const b = setup('klahadore')
  assert.match(act(b.world, b.member, { kind: 'recruit', npc: 'klahadore' }).text, /隊伍最高等級要到/)
  b.c.level = 8
  const trust = act(b.world, b.member, { kind: 'recruit', npc: 'klahadore' }, dice(10))
  assert.equal(companionIds(b.world).length, 0)
  b.world.recruitRetry = {}
  b.world.defeated = ['klahadore']
  assert.match(trust.text, /說服/)
  assert.match(act(b.world, b.member, { kind: 'recruit', npc: 'klahadore' }, dice(14)).text, /服氣你們 \+4|加入了船團/)
  const courier = setup('courier')
  assert.match(act(courier.world, courier.member, { kind: 'recruit', npc: 'courier' }).text, /潮汐簿/)
  assert.ok(c.level >= 1)
})

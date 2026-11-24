// The Summit War in stages: sides, battlefield goals, and endings that follow what the party did (world/war.ts).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LocationId } from '../packages/shared/protocol.ts'
import { makeCharacter, resolve } from '../packages/rules/engine.ts'
import { familiarIntent } from '../packages/world/explore.ts'
import { setFlag } from '../packages/world/flags.ts'
import { advanceTimeline } from '../packages/world/timeline.ts'
import { newWorld, npcPlace } from '../packages/world/village.ts'
import type { Member, World } from '../packages/world/village.ts'
import { warFlag, warMinute } from '../packages/world/war.ts'
import { character } from './fixtures.ts'

const dice = (...script: number[]) => (sides: number) => Math.min(sides, script.length ? script.shift()! : sides)
const online = new Set(['host'])

function battlefield(place: LocationId = 'marinefordBay', hour = 11) {
  const world = newWorld('SUMMITWAR1', 'host')
  world.started = true
  world.calmSeas = true
  const member = world.members[0] as Member
  member.character = { ...makeCharacter(character('阿浪')), place, level: 10, hp: 99_999 }
  world.minute = warMinute([hour, 0])
  advanceTimeline(world)
  return { world, member, c: member.character }
}
const act = (world: World, member: Member, intent: Parameters<typeof resolve>[2], roll = dice()) => resolve(world, member, intent, '', roll, online)
const until = (world: World, hour: number, minute = 0) => {
  world.minute = warMinute([hour, minute])
  return advanceTimeline(world).map(item => item.text).join('\n')
}

test('沒有人插手時，戰爭照原作一段一段發生，在場的人每段都看得到', () => {
  const { world } = battlefield()
  const heard = until(world, 21)
  for (const title of ['頂上戰爭爆發', '傘下船長的刀', '包圍牆升起', '從天而降的逃犯', '處刑台上的救援', '岩漿拳', '最後的戰場', '頂上戰爭落幕'])
    assert.match(heard, new RegExp(title), title)
  assert.match(heard, /紅髮香克斯現身/)
  assert.equal(npcPlace(world, 'ace'), null)
  assert.equal(npcPlace(world, 'oarsJr'), null)
  assert.equal(world.timeline?.warEnds, 'canon')
})

test('白鬍子海賊團的七位成員會在開戰當天出現在戰場，同時抵達的人合成一則目擊', () => {
  const morning = battlefield('marinefordBay', 8)
  const heard = until(morning.world, 9, 30)
  assert.match(heard, /【目擊】[^\n]*以藏、那謬爾、拉克約、庫利、布倫海姆[^\n]*出現在馬林福特海灣/)
  assert.equal(heard.split('\n').filter(line => line.includes('出現在馬林福特海灣')).length, 1)
  const { world } = battlefield('marinefordBay', 12)
  for (const npc of ['izo', 'namur', 'rakuyo', 'curiel', 'blenheim', 'squard'] as const) assert.equal(npcPlace(world, npc), 'marinefordBay', npc)
  assert.equal(npcPlace(world, 'oarsJr'), 'mfWall')
})

test('選邊要在馬林福特、開戰後不能換；口語說法也聽得懂', () => {
  const { world, member, c } = battlefield()
  assert.deepEqual(familiarIntent('協助白鬍子'), { kind: 'war', side: 'whitebeard' })
  assert.deepEqual(familiarIntent('站在海軍這邊'), { kind: 'war', side: 'marine' })
  assert.deepEqual(familiarIntent('擋下斯庫亞多的刀'), { kind: 'war', goal: 'stopSquard' })
  c.place = 'square'
  assert.match(act(world, member, { kind: 'war', side: 'whitebeard' }).text, /要在馬林福特/)
  c.place = 'marinefordBay'
  assert.match(act(world, member, { kind: 'war', side: 'whitebeard' }).text, /協助白鬍子救出艾斯/)
  until(world, 12, 10)
  assert.match(act(world, member, { kind: 'war', side: 'marine' }).text, /換邊來不及/)
})

test('戰場目標：要對的一方、對的時間、對的地點；失敗會受傷，下次比較容易', () => {
  const { world, member, c } = battlefield()
  act(world, member, { kind: 'war', side: 'whitebeard' })
  assert.match(act(world, member, { kind: 'war', goal: 'stopSquard' }).text, /12:00 才有機會/)
  until(world, 12, 10)
  assert.match(act(world, member, { kind: 'war', goal: 'holdScaffold' }).text, /另一方的目標/)
  c.place = 'oris'
  assert.match(act(world, member, { kind: 'war', goal: 'stopSquard' }).text, /要到馬林福特海灣/)
  c.place = 'marinefordBay'
  const hp = c.hp
  const miss = act(world, member, { kind: 'war', goal: 'stopSquard' }, dice(1))
  assert.match(miss.text, /受了傷/)
  assert.ok(c.hp < hp)
  const hit = act(world, member, { kind: 'war', goal: 'stopSquard' }, dice(14))
  assert.match(hit.text, /再試 \+1/)
  assert.match(hit.text, /撞開了他的手臂/)
  assert.ok(world.flags?.[warFlag('stopSquard')] !== undefined)
  assert.match(until(world, 13, 10), /斯庫亞多的刀被一個陌生人撞開/)
})

test('救下艾斯、護送白鬍子撤離：岩漿拳落空，結局一起改寫；黑鬍子仍奪走果實', () => {
  const { world } = battlefield()
  world.warSide = 'whitebeard'
  setFlag(world, warFlag('pullAce'))
  setFlag(world, warFlag('escortWhitebeard'))
  const heard = until(world, 21)
  assert.match(heard, /岩漿拳落空了/)
  assert.match(heard, /火拳艾斯活著離開了戰場.*白鬍子在兒子們的護送下撤出了馬林福特.*黑鬍子奪走了震震果實/)
  assert.equal(world.timeline?.warEnds, 'changed')
  assert.match(world.npcFacts?.ace ?? '', /被救了下來/)
})

test('站在海軍這邊守住處刑台：救援失敗，處刑如期執行', () => {
  const { world } = battlefield()
  world.warSide = 'marine'
  setFlag(world, warFlag('intercept'))
  setFlag(world, warFlag('holdScaffold'))
  const heard = until(world, 21)
  assert.match(heard, /海軍守住了處刑台/)
  assert.match(heard, /處刑如期執行/)
})

test('推進城大脫獄後沒有戰爭：各階段安靜地略過，不會出現戰況新聞', () => {
  const { world } = battlefield()
  world.islandTasks = { impelDown: { stage: 'done' } }
  const heard = until(world, 21)
  assert.doesNotMatch(heard, /傘下船長的刀|包圍牆升起|岩漿拳/)
  assert.equal(world.timeline?.warSquard, 'changed')
})

test('戰爭期間白鬍子海賊團的人不跟玩家走', () => {
  const { world, member } = battlefield('marinefordBay', 12)
  world.crew = true
  assert.match(act(world, member, { kind: 'recruit', npc: 'izo' }).text, /只想救出艾斯/)
})

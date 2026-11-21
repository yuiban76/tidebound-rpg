import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { AiProvider } from '../packages/ai/provider.ts'
import { Game } from '../apps/host/game.ts'
import { makeHost } from '../apps/host/http.ts'
import { Store } from '../apps/host/store.ts'
import { allocatePoint, attackCheck, grantXp, makeCharacter, maxHP, maxSTA, resolve as resolveAction, voteThreshold } from '../packages/rules/engine.ts'
import { newWorld } from '../packages/world/village.ts'
import { routeBetween } from '../packages/world/explore.ts'
import { character, compatibilityFixture } from './fixtures.ts'

async function withGame(t: TestContext, count = 1, open = true) {
  const ai = await compatibilityFixture()
  const store = new Store(':memory:')
  const game = new Game(store)
  t.after(async () => { game.stop(); store.db.close(); await ai.close() })
  const config = { baseUrl: ai.baseUrl, model: 'fixture-model', apiKey: 'test-do-not-publicize' }
  if (!open) return { game, ai, config, code: '', ids: [] as string[], tokens: [] as string[] }
  await game.configure(config)
  const view = game.create()
  const code = view.world.code
  const ids = [view.player]
  const tokens: string[] = []
  for (let index = 1; index < count; index++) {
    const joined = game.join(code)
    ids.push(joined.view.player)
    tokens.push(joined.token)
  }
  return { game, ai, config, code, ids, tokens }
}

function ready(game: Game, code: string, ids: string[]) {
  ids.forEach((id, index) => {
    game.message(code, id, { kind: 'character', character: character('旅行者 ' + index) })
    game.message(code, id, { kind: 'ready', ready: true, agree: true })
  })
}
function submit(game: Game, code: string, actor: string, text: string, id = randomUUID()) {
  game.message(code, actor, { kind: 'act', id, version: game.room(code).version, text })
  return id
}
async function until(predicate: () => boolean) {
  for (let index = 0; index < 300; index++) {
    if (predicate()) { await delay(5); return }
    await delay(10)
  }
  assert.fail('等待測試條件逾時')
}
async function act(game: Game, code: string, id: string, text: string) {
  const event = submit(game, code, id, text)
  await until(() => game.store.pending(code, event)?.phase === 'done')
  return game.store.pending(code, event)!.result!
}

test('地圖與移動規則共用村道路徑，遭遇期間不能由外面步行進山', () => {
  assert.deepEqual(routeBetween('tavern', 'hill'), ['tavern', 'square', 'road', 'hill'])
  assert.deepEqual(routeBetween('tavern', 'hill', true), [])
  assert.deepEqual(routeBetween('hill', 'dock', true), ['hill', 'road', 'dock'])
})

test('P0-01～03 AI 必須實際生成回覆才能開房與開局，開局時再次生成檢查', async t => {
  const { game, ai, config } = await withGame(t, 1, false)
  assert.throws(() => game.create(), /AI 連線測試/)
  assert.equal(ai.seen.length, 0)
  await assert.rejects(game.configure({ ...config, baseUrl: 'http://127.0.0.1:1/v1' }), /拒絕連線|無法連線/)
  assert.equal(game.ai.status.errorCategory, 'refused')
  await assert.rejects(game.configure({ ...config, baseUrl: ai.baseUrl + '/missing' }), /找不到模型或推論端點/)
  for (const [fault, message, category] of [
    ['auth', /認證/, 'auth'], ['blank', /空白/, 'empty'], ['malformed', /Chat Completions/, 'format'],
  ] as const) {
    ai.fault(fault, 'probe')
    await assert.rejects(game.configure(config), message)
    assert.equal(game.ai.status.state, 'failed')
    assert.equal(game.ai.status.errorCategory, category)
    assert.throws(() => game.create(), /AI 連線測試/)
  }
  ai.fault(undefined)
  await assert.rejects(game.configure({ ...config, model: 'wrong' }), /找不到模型/)
  assert.equal(game.ai.status.errorCategory, 'model')
  assert.throws(() => game.create(), /AI 連線測試/)
  await game.configure(config)
  assert.equal(game.ai.status.state, 'passed')
  const { world: { code }, player } = game.create()
  ready(game, code, [player])
  ai.fault('unavailable', 'probe')
  await assert.rejects(game.start(code), /無法推論/)
  assert.equal(game.room(code).started, false)
  ai.fault(undefined)
  await game.configure(config)
  const probes = ai.seen.filter(call => call.kind === 'probe').length
  await game.start(code)
  assert.equal(ai.seen.filter(call => call.kind === 'probe').length, probes + 1)
  assert.equal(ai.seen.at(-1)?.authorization, 'Bearer ' + config.apiKey)
  assert.ok(!ai.seen.some(call => ['models', 'probe-empty', 'unexpected-generation'].includes(call.kind)))
})

test('沒有 /models 的 API 也能以實際生成通過測試', async t => {
  const { game, ai, config } = await withGame(t, 1, false)
  ai.models(false)
  await game.configure(config)
  const { world: { code }, player } = game.create()
  ready(game, code, [player])
  await game.start(code)
  assert.deepEqual(ai.seen.map(call => [call.kind, call.content]), [['probe', 'ping'], ['probe', 'ping']])
})

test('意圖與旁白都完整傳送上下文且不指定 max_tokens，長正文完整回傳', async t => {
  const ai = await compatibilityFixture()
  t.after(ai.close)
  const provider = new AiProvider()
  await provider.configure({ baseUrl: ai.baseUrl, model: 'fixture' }, false)
  const context = { journal: '港'.repeat(33000) }
  const narrative = '潮'.repeat(5000)
  ai.narrateWith(narrative)
  assert.deepEqual(await provider.interpret(context, '去碼頭'), { kind: 'move', to: 'dock' })
  assert.equal(await provider.narrate(context, '正式結果', false), narrative)
  for (const call of ai.seen.filter(row => ['intent', 'narrative'].includes(row.kind))) {
    assert.equal(call.maxTokens, undefined)
    assert.deepEqual(JSON.parse(call.content).context, context)
  }
})

test('模型服務本身的輸出截斷仍會保留行動供重試', async t => {
  const { game, ai, config, code, ids } = await withGame(t)
  ready(game, code, ids)
  await game.start(code)
  ai.fault('output-limit', 'intent')
  const id = submit(game, code, ids[0], '沿著海岸走到碼頭')
  await until(() => game.ai.status.state === 'lost')
  assert.match(game.ai.status.reason!, /模型服務達到自身的輸出限制/)
  assert.equal(game.room(code).members[0].character?.place, 'square')
  assert.equal(game.store.pending(code, id)?.phase, 'interpret')

  ai.fault(undefined)
  await game.configure(config)
  await until(() => game.store.pending(code, id)?.phase === 'done')
  assert.equal(game.room(code).members[0].character?.place, 'dock')
  assert.equal(game.store.entries(code).filter(row => row.action === id && row.type === 'result').length, 1)
})

test('API 檢查與推論等候可手動取消，取消後能繼續下一筆', async t => {
  const { game, ai, config, code, ids } = await withGame(t)
  ready(game, code, ids)
  await game.start(code)
  ai.fault('hang', 'probe')
  const before = ai.seen.length
  const configuring = game.configure({ ...config, model: 'wrong' })
  const stopped = assert.rejects(configuring, /請求已取消/)
  await until(() => ai.seen.length > before)
  game.cancelProbe()
  await stopped
  await until(() => ai.cancelled.includes('probe'))
  assert.equal(game.ai.status.model, config.model)
  assert.equal(game.ai.status.state, 'passed')

  ai.fault('hang', 'intent')
  const id = submit(game, code, ids[0], '沿著海岸走到碼頭')
  await until(() => ai.seen.some(call => call.kind === 'intent'))
  game.message(code, ids[0], { kind: 'cancel', id })
  assert.equal(game.store.pending(code, id)?.phase, 'cancelled')
  assert.equal(game.room(code).members[0].character?.place, 'square')
  await until(() => ai.cancelled.includes('intent'))
  ai.fault(undefined)
  assert.match(await act(game, code, ids[0], '去碼頭'), /你抵達風車村港口/)
})

test('口語問路即使 AI 暫停仍能回答，讀取實際場景而不推進遊戲', async t => {
  const { game, ai, code, ids } = await withGame(t)
  ready(game, code, ids)
  await game.start(code)
  const before = game.room(code)
  game.ai.fail(new Error('暫停'), true)
  const calls = ai.seen.length
  const id = submit(game, code, ids[0], '我能去哪裡？')
  submit(game, code, ids[0], '我能去哪裡？', id)
  const entries = game.store.entries(code).filter(row => row.action === id)
  assert.deepEqual(entries.map(row => row.type), ['input', 'guide'])
  assert.match(entries[1].text, /風車村廣場[\s\S]*派對酒吧[\s\S]*風車村港口[\s\S]*村外小路/)
  for (const text of ['這裡能做甚麼', '我現在能做甚麼', '这里可以做些什么？']) {
    const id = submit(game, code, ids[0], text)
    const answer = game.store.entries(code).find(row => row.action === id && row.type === 'guide')
    assert.match(answer!.text, /風車村港口.*補給鋪/)
  }
  const location = submit(game, code, ids[0], '我人在哪裡？')
  assert.deepEqual(game.store.entries(code).filter(row => row.action === location).map(row => [row.type, row.text]), [
    ['input', '我人在哪裡？'], ['location', '你在風車村廣場。'],
  ])
  assert.equal(ai.seen.length, calls)
  assert.deepEqual(game.room(code), before)
})

test('Qwen 使用結構化回覆，能辨識包裝或巢狀 JSON，也相容不支援結構化的 API', async t => {
  const ai = await compatibilityFixture()
  t.after(ai.close)
  const provider = new AiProvider()
  await provider.configure({ baseUrl: ai.baseUrl, model: 'q36' }, false)
  ai.rawIntents('<think>候選 {"kind":"guard"}</think>結果\n```json\n{"intent":{"kind":"move","to":"tavern","talk":{"npc":"keeper"}}}\n```')
  assert.deepEqual(await provider.interpret({}, '去派對酒吧，找瑪琪諾聊天'), {
    kind: 'move', to: 'tavern', talkTo: 'keeper',
  })
  assert.equal(ai.seen.at(-1)?.format, 'json_schema')
  assert.equal(ai.seen.at(-1)?.thinking, false)
  ai.structured(false)
  assert.deepEqual(await provider.interpret({}, '沿著海岸走到碼頭'), { kind: 'move', to: 'dock' })
  assert.deepEqual(ai.seen.slice(-2).map(call => call.format), ['json_schema', undefined])
})

test('格式錯誤會重試一次；仍無效就保留世界狀態、讓下一筆行動繼續', async t => {
  const { game, ai, code, ids } = await withGame(t)
  ready(game, code, ids)
  await game.start(code)
  const before = game.room(code)
  ai.rawIntents(
    '{"kind":"buy","item":"不存在的果實"}',
    '{"kind":"move","to":"hill"} 或 {"kind":"attack","npc":"courier","power":true}',
  )
  const note = await act(game, code, ids[0], '我想做個新花樣')
  assert.match(note, /沒有辨識出有效行動/)
  assert.deepEqual(game.room(code), before)
  assert.equal(game.ai.status.state, 'passed')
  assert.equal(ai.seen.filter(call => call.kind === 'intent').length, 2)

  ai.rawIntents('請再說一次', '{"kind":"check","method":"observe"}')
  assert.match(await act(game, code, ids[0], '我仔細看四周的風吹草動'), /觀察 D20/)
})

test('分隔符號前後的移動與交談依序結算，模型收到抵達後的 NPC 情境', async t => {
  const { game, ai, code, ids } = await withGame(t)
  ready(game, code, ids)
  await game.start(code)
  const startMinute = game.room(code).minute
  const report = await act(game, code, ids[0], '去派對酒吧，找瑪琪諾聊天')
  assert.match(report, /你抵達派對酒吧。\n瑪琪諾與你交談/)
  const world = game.room(code)
  assert.equal(world.members[0].character?.place, 'tavern')
  assert.equal(world.minute, startMinute + 9)
  const calls = ai.seen.filter(call => call.kind !== 'probe')
  assert.deepEqual(calls.map(call => call.kind), ['narrative'])
  const context = JSON.parse(calls[0].content).context
  assert.equal(context.place, '派對酒吧')
  assert.equal(context.local[0].name, '瑪琪諾')
  assert.match(context.local[0].facts, /潮汐簿/)
})

test('舊存檔與瑪琪諾交談後，兩種小艇追問都直接回答而不擲骰', async t => {
  const { game, ai, code, ids } = await withGame(t)
  ready(game, code, ids)
  await game.start(code)
  const [player] = ids
  await act(game, code, player, '去派對酒吧，找瑪琪諾聊天')
  const legacy = game.room(code)
  assert.equal(legacy.members[0].character!.conversingWith, 'keeper')
  delete legacy.members[0].character!.conversingWith
  game.store.save(legacy)
  const before = ai.seen.length
  for (const question of ['小艇上是誰', '說明小艇上的人員狀況是如何']) {
    const answer = await act(game, code, player, question)
    assert.match(answer, /^瑪琪諾說：「.*魯夫.*提奧/)
    assert.doesNotMatch(answer, /D20/)
  }
  assert.equal(ai.seen.length, before)
  assert.equal(game.room(code).members[0].character?.conversingWith, 'keeper')
  assert.equal(game.room(code).minute, legacy.minute + 6)
})

test('一般追問向原 NPC 取得台詞，離開後要重新指定對方', async t => {
  const { game, ai, code, ids } = await withGame(t)
  ready(game, code, ids)
  await game.start(code)
  const [player] = ids
  await act(game, code, player, '去派對酒吧')
  const answer = await act(game, code, player, '瑪琪諾，小艇上是誰？')
  assert.match(answer, /瑪琪諾說：「.*魯夫/)
  const question = '潮汐簿是誰在找？'
  assert.equal(await act(game, code, player, question), '你向瑪琪諾提問。')
  const dialogue = ai.seen.at(-1)!
  assert.equal(dialogue.kind, 'dialogue')
  assert.equal(JSON.parse(dialogue.content).speaker, '瑪琪諾')
  assert.equal(JSON.parse(dialogue.content).input, question)
  assert.ok(game.store.entries(code).some(entry => entry.type === 'narrative' && entry.text === '瑪琪諾說：「提奧正在找潮汐簿。」'))
  await act(game, code, player, '回廣場')
  assert.equal(game.room(code).members[0].character?.conversingWith, null)
  const count = ai.seen.length
  assert.match(await act(game, code, player, '小艇上是誰'), /你目前沒有交談對象.*問村長/)
  assert.equal(ai.seen.length, count)
})

test('指名瑪琪諾並換行問去哪買船會得到購船回答，單純問路仍顯示附近', async t => {
  const { game, ai, code, ids } = await withGame(t)
  ready(game, code, ids)
  await game.start(code)
  const [player] = ids
  const before = ai.seen.length
  const info = await act(game, code, player, '我可以去哪裡買船？')
  assert.match(info, /^風車村港口的船塢販售可載四人的迎潮號/)
  await act(game, code, player, '去派對酒吧')
  const reply = await act(game, code, player, '瑪琪諾 \n我要買船要去哪買')
  assert.match(reply, /^瑪琪諾說：「風車村港口的船塢販售可載四人的迎潮號/)
  assert.doesNotMatch(reply, /可以去風車村廣場|酒吧有烤麵包|D20/)
  assert.equal(game.room(code).members[0].character?.conversingWith, 'keeper')
  assert.match(await act(game, code, player, '我要買船要去哪買'), /^瑪琪諾說：「/)
  const guide = submit(game, code, player, '請問我還可以去哪裡呢？')
  assert.match(game.store.entries(code).find(row => row.action === guide && row.type === 'guide')!.text, /可以去風車村廣場/)
  assert.equal(ai.seen.length, before)
})

test('不成功的行動與模型誤判問路時不插入周圍地點清單', async t => {
  const { game, ai, code, ids } = await withGame(t)
  ready(game, code, ids)
  await game.start(code)
  const result = await act(game, code, ids[0], '吃爌肉飯')
  assert.match(result, /你在風車村廣場。/)
  assert.doesNotMatch(result, /風車村港口|村外小路/)
  ai.next({ kind: 'guide' })
  const id = submit(game, code, ids[0], '我吹口哨')
  await until(() => game.store.pending(code, id)?.phase === 'done')
  const entries = game.store.entries(code).filter(row => row.action === id)
  assert.deepEqual(entries.map(row => row.type), ['input', 'location'])
  assert.equal(entries[1].text, '你在風車村廣場。')
})

test('單人可購船、完成兩座新島的委託並返航，規則直接保存航行結果', async t => {
  const { game, ai, code, ids } = await withGame(t)
  ready(game, code, ids)
  await game.start(code)
  const [player] = ids
  const play = (text: string) => act(game, code, player, text)
  const world = () => game.room(code)
  const calls = ai.seen.length

  assert.match(await play('出海'), /風車村港口的船塢/)
  await play('前往風車村港口')
  assert.match(await play('前往潮燈碼頭'), /跨島不能自行步行/)
  assert.match(await play('買船'), /650 貝里買下迎潮號/)
  assert.match(await play('買船'), /已登記迎潮號/)
  assert.equal(world().members[0].character?.money, 1350)
  assert.match(await play('出海'), /全隊抵達潮燈島的潮燈碼頭/)
  assert.equal(world().members[0].character?.place, 'lanternPort')
  assert.equal(world().ship?.port, 'lanternPort')

  await play('前往潮燈塔')
  assert.match(await play('接下燈塔委託'), /找回沖進洞裡的備用透鏡/)
  await play('前往海蝕洞')
  for (let i = 0; i < 5 && world().islandTasks?.lantern?.stage !== 'found'; i++) await play('搜索海蝕洞')
  await play('前往潮燈塔')
  assert.match(await play('歸還透鏡'), /潮燈塔照亮霧中的航道/)
  assert.equal(world().islandTasks?.lantern?.stage, 'done')
  assert.equal(world().members[0].character?.money, 1770)

  await play('前往潮燈碼頭')
  assert.match(await play('出海前往霧灣島'), /全隊抵達霧灣島的霧灣泊位/)
  await play('前往曬網坡')
  assert.match(await play('接下探潮委託'), /尋找失聯的探潮人/)
  await play('前往白灘灣')
  for (let i = 0; i < 5 && world().islandTasks?.mist?.stage !== 'found'; i++) await play('搜索白灘灣')
  await play('前往曬網坡')
  assert.match(await play('帶探潮人回去'), /探潮人平安回到曬網坡/)
  assert.equal(world().members[0].character?.money, 2130)
  // 20 XP per newly reached island plus 60 per island task: 160 XP crosses level 2 at 100.
  assert.equal(world().members[0].character?.level, 2)
  assert.equal(world().members[0].character?.xp, 60)
  assert.equal(world().ship?.wood, 6)

  await play('前往霧灣泊位')
  assert.match(await play('返航'), /全隊抵達黎明島的風車村港口/)
  assert.equal(world().ship?.trips, 3)
  assert.equal(world().members[0].character?.place, 'dock')
  assert.equal(world().sailing, undefined)
  assert.ok(world().minute > 480 + 180)
  // P0-17: long voyages track no food, water or hunger.
  assert.doesNotMatch(JSON.stringify(world()), /飢|渴|口糧|食水|hunger|thirst|ration/i)
  assert.equal(ai.seen.length, calls)
})

test('四人出航需過半選線、全隊在線在港且準備，每位角色一起抵達', async t => {
  const { game, code, ids } = await withGame(t, 4)
  ready(game, code, ids)
  await game.start(code)
  for (const id of ids) await act(game, code, id, '前往風車村港口')
  const [host, second, third, fourth] = ids
  const command = (text: string) => act(game, code, host, text)
  await command('買船')
  const vote = '選擇航線 霧灣島 快航'
  await command(vote)
  await act(game, code, second, vote)
  assert.match(await command('出海'), /過半成員投票/)
  await act(game, code, third, vote)
  for (const id of ids) await act(game, code, id, '準備出航')
  await act(game, code, fourth, '回廣場')
  assert.match(await command('出海'), /所有隊友到風車村港口/)
  await act(game, code, fourth, '前往風車村港口')
  assert.match(await command('出海'), /每位玩家都需要/)
  await act(game, code, fourth, '準備出航')
  game.disconnect(code, third)
  assert.match(await command('出海'), /有隊友離線/)
  assert.equal(game.room(code).ship?.trips, 0)
  game.touch(code, third)
  assert.match(await command('出海'), /快航.*全隊抵達霧灣島/s)
  assert.deepEqual(game.room(code).members.map(member => member.character?.place), Array(4).fill('mistPort'))
  assert.equal(game.room(code).ship?.trips, 1)
  assert.ok(game.room(code).ship!.hull < 100)
  assert.match(await command('修船'), /用一份木料把船體/)
  assert.equal(game.room(code).ship?.hull, 100)
  assert.equal(game.room(code).ship?.wood, 1)
})

test('出售主船需要全員同意，只結算一次並支付登記船主', async t => {
  const { game, code, ids } = await withGame(t, 2)
  ready(game, code, ids)
  await game.start(code)
  const [host, guest] = ids
  for (const id of ids) await act(game, code, id, '前往風車村港口')
  await act(game, code, guest, '買船')
  game.message(code, host, { kind: 'propose', type: 'sellShip', title: '回港賣船' })
  const id = game.room(code).proposals[0].id
  const vote = { kind: 'vote', id, yes: true } as const
  game.message(code, host, vote)
  assert.ok(game.room(code).ship)
  game.message(code, guest, vote)
  assert.equal(game.room(code).ship, undefined)
  assert.deepEqual(game.room(code).members.map(member => member.character?.money), [2000, 1830])
  assert.throws(() => game.message(code, guest, vote), /已結案/)
})

test('可以用口語找人、前往目的地、吃飯、接委託並發起船團投票', async t => {
  const { game, ai, code, ids } = await withGame(t, 2)
  ready(game, code, ids)
  await game.start(code)
  const calls = ai.seen.length
  assert.match(await act(game, code, ids[0], '吃爌肉飯'), /先輸入「前往派對酒吧」/)
  assert.match(await act(game, code, ids[0], '我走進酒館'), /你抵達派對酒吧/)
  assert.match(await act(game, code, ids[0], '吃烤麵包'), /花費 15 貝里/)
  assert.equal(game.room(code).members[0].character?.money, 1985)
  assert.match(await act(game, code, ids[0], '找提奧聊聊'), /提奧在風車村港口/)
  assert.equal(ai.seen.length, calls)
  assert.match(await act(game, code, ids[0], '我要去港口找提奧'), /經過風車村廣場，抵達風車村港口。\n提奧與你交談/)
  assert.match(await act(game, code, ids[0], '向提奧詢問潮汐簿'), /港務的潮汐簿失蹤了/)
  assert.equal(game.room(code).quest, 'offered')
  const guide = submit(game, code, ids[0], '附近可以做什麼？')
  assert.match(game.store.entries(code).find(row => row.action === guide && row.type === 'guide')!.text, /接受潮汐簿委託/)
  assert.match(await act(game, code, ids[0], '接受潮汐簿委託'), /委託已登記/)
  assert.match(await act(game, code, ids[0], '找同伴成立海賊團'), /所有成員.*投票/)
  const room = game.room(code)
  assert.equal(room.crew, false)
  const proposal = room.proposals[0]
  game.message(code, ids[0], { kind: 'vote', id: proposal.id, yes: true })
  assert.equal(game.room(code).crew, false)
  game.message(code, ids[1], { kind: 'vote', id: proposal.id, yes: true })
  assert.equal(game.room(code).crew, true)
})

for (const n of [1, 2, 3, 4]) {
  test('P0-04～05 與 P0-06～07 實際 ' + n + ' 人開局與決議', async t => {
    const { game, code, ids } = await withGame(t, n)
    await assert.rejects(game.start(code), /完成創角/)
    ready(game, code, ids)
    if (n === 4) assert.throws(() => game.join(code), /已滿/)
    const view = await game.start(code)
    assert.equal(view.world.members.length, n)
    assert.equal(view.phase, 'playing')
    assert.equal(view.world.crew, false)
    assert.equal(view.world.members[0].character?.money, 2000)
    if (n < 4) {
      // A late joiner holds a seat but is not part of N until admitted at a port.
      const late = game.join(code)
      assert.equal(late.view.world.members.find(m => m.id === late.view.player)?.pendingJoin, true)
    }
    game.message(code, ids[0], { kind: 'propose', type: 'ordinary', title: '整理碼頭' })
    game.message(code, ids[0], { kind: 'propose', type: 'formCrew', title: '成立船團' })
    for (const [index, vote] of game.room(code).proposals.entries()) {
      const threshold = index ? n : voteThreshold(n, false)
      for (const [count, id] of ids.slice(0, threshold).entries()) {
        assert.equal(game.room(code).proposals[index].passed, false)
        game.message(code, id, { kind: 'vote', id: vote.id, yes: true })
        assert.equal(game.room(code).proposals[index].passed, count + 1 === threshold)
      }
    }
    assert.equal(game.room(code).crew, true)
  })
}

test('P0-08／10 斷線保留席位，重連恢復同角色與歷史', async t => {
  const { game, code, ids, tokens } = await withGame(t, 2)
  ready(game, code, ids)
  const view = await game.start(code)
  game.disconnect(code, ids[1])
  assert.equal(game.view(code, ids[0]).world.members[1].connected, false)
  await act(game, code, ids[0], '去碼頭')
  game.message(code, ids[0], { kind: 'propose', type: 'formCrew', title: '成立船團' })
  const proposal = game.room(code).proposals[0]
  assert.throws(() => game.message(code, ids[0], { kind: 'vote', id: proposal.id, yes: true }), /重大決議暫停/)
  assert.throws(() => game.join(code, '0'.repeat(64)), /無效/)
  assert.equal(game.join(code, tokens[0]).view.player, ids[1])
  const next = game.view(code, ids[1], view.cursor)
  assert.equal(next.unread, 2)
  assert.equal(next.world.members.length, 2)
  assert.equal(next.world.members[1].character?.name, '旅行者 1')
})

test('P0-09 API 失聯暫停，回復後只提交一次', async t => {
  const { game, ai, config, code, ids } = await withGame(t)
  ready(game, code, ids)
  await game.start(code)
  const initial = game.room(code).version
  ai.fault('unavailable', 'intent')
  const id = submit(game, code, ids[0], '沿著海岸走到碼頭')
  await until(() => game.ai.status.state === 'lost')
  assert.equal(game.room(code).version, initial)
  assert.equal(game.store.pending(code, id)?.phase, 'interpret')
  assert.throws(() => submit(game, code, ids[0], '去碼頭'), /暫停/)
  ai.fault('unavailable', 'narrative')
  await game.configure(config)
  await until(() => game.ai.status.state === 'lost')
  assert.equal(game.room(code).version, initial + 1)
  assert.equal(game.store.pending(code, id)?.phase, 'narrate')
  ai.fault(undefined)
  await game.configure(config)
  await until(() => game.store.pending(code, id)?.phase === 'done')
  submit(game, code, ids[0], '沿著海岸走到碼頭', id)
  assert.equal(game.room(code).version, initial + 1)
  for (const type of ['input', 'result', 'narrative'])
    assert.equal(game.store.entries(code).filter(event => event.action === id && event.type === type).length, 1)
})

test('P0-11／15／18 最後一件長槍只賣一次，NPC 交談連續，跨島被拒', async t => {
  const { game, ai, code, ids } = await withGame(t, 2)
  ready(game, code, ids)
  await game.start(code)
  await act(game, code, ids[0], '去碼頭')
  await act(game, code, ids[1], '去碼頭')
  const [one, two] = ids.map(id => submit(game, code, id, '買一把普通長槍'))
  await until(() => game.store.pending(code, two)?.phase === 'done')
  assert.match(game.store.pending(code, one)!.result!, /購入/)
  assert.match(game.store.pending(code, two)!.result!, /售完/)
  assert.deepEqual(game.room(code).members.map(m => m.character?.money), [1500, 2000])
  assert.equal(game.room(code).stock.spear, 0)
  const inquiries = ids.map(id => submit(game, code, id, '找提奧聊聊'))
  await until(() => game.store.pending(code, inquiries[1])?.phase === 'done')
  assert.equal(game.room(code).memories.clerk.length, 2)
  const narration = JSON.parse(ai.seen.at(-1)!.content)
  assert.match(narration.context.local[0].memory[0], /旅行者 0/)
  assert.match(await act(game, code, ids[1], '我要離開這座島'), /跨島/)
  assert.equal(game.room(code).members[1].character?.place, 'dock')
})

test('P0-12／14 有效自然 20、自然 1、武器骰、失能與回復', () => {
  const seq = [20, 4, 2]
  assert.deepEqual(attackCheck(() => seq.shift()!, { attr: 3, skill: 2, def: 15, die: 6 }),
    { natural: 20, total: 25, hit: true, damage: 9, dice: [4, 2] })
  assert.equal(attackCheck(() => 20, { attr: 3, skill: 2, def: 30, die: 6 }).hit, false)
  assert.equal(attackCheck(() => 1, { attr: 9, skill: 9, def: 1, die: 6 }).damage, 0)
  const world = newWorld('CODE', 'host')
  const member = world.members[0]
  member.character = makeCharacter(character('甲'))
  const c = member.character
  c.place = 'hill'
  c.hp = 1
  const rolls = [1, 20, 1, 1]
  const report = resolveAction(world, member, { kind: 'attack', npc: 'courier', power: true }, '攻擊', () => rolls.shift()!, new Set(['host']))
  assert.match(report.text, /倒下/)
  assert.equal(c.hp, 0)
  assert.equal(c.sta, maxSTA(c) - 2)
  assert.equal(resolveAction(world, member, { kind: 'rest', sleep: true }, '睡眠', () => 1, new Set()).rejected, true)
  c.place = 'tavern'
  assert.equal(resolveAction(world, member, { kind: 'rest', sleep: true }, '睡眠', () => 1, new Set()).minutes, 480)
  assert.equal(c.hp, Math.ceil(maxHP(c) / 4))
})

test('同步戰鬥等所有參戰者鎖定，離線不代操，非戰鬥可完成支線', () => {
  const world = newWorld('CODE', 'host')
  const one = world.members[0]
  one.character = makeCharacter(character('甲'))
  one.character.place = 'hill'
  const two = { id: 'guest', host: false, approved: true, ready: true, agree: true, character: makeCharacter(character('乙')) }
  two.character.place = 'hill'
  world.members.push(two)
  const connected = new Set(['host', 'guest'])
  const attack = { kind: 'attack', npc: 'courier', power: false } as const
  const next = (sides: number) => Math.min(12, sides)
  assert.match(resolveAction(world, one, attack, '攻擊', next, connected).text, /鎖定/)
  assert.equal(world.courierHP, 20)
  assert.equal(resolveAction(world, two, { kind: 'guard' }, '防守', next, new Set(['host'])).rejected, true)
  assert.match(resolveAction(world, two, { kind: 'guard' }, '防守', next, connected).text, /反擊/)
  assert.ok(world.courierHP < 20)
  assert.equal(world.combat?.round, 2)
  delete world.combat
  world.quest = 'active'
  assert.match(resolveAction(world, one, { kind: 'negotiate', npc: 'courier' }, '交涉', () => 20, connected).text, /交還/)
  one.character.place = 'dock'
  assert.match(resolveAction(world, one, { kind: 'quest', step: 'deliver' }, '交還', next, connected).text, /350/)
  assert.equal(world.quest, 'done')
  assert.equal(one.character.money, 2350)
})

test('P0-19 SQLite 重開與備份保留世界、金錢和待續旁白', async t => {
  const temp = resolve(tmpdir())
  const dir = mkdtempSync(join(temp, 'tide-'))
  let cleanup = () => {}
  t.after(() => {
    cleanup()
    if (dir.startsWith(join(temp, 'tide-'))) rmSync(dir, { recursive: true, force: true })
  })
  const ai = await compatibilityFixture()
  t.after(ai.close)
  const db = join(dir, 'campaign.sqlite')
  const store = new Store(db)
  const game = new Game(store)
  cleanup = () => { game.stop(); store.db.close() }
  const config = { model: 'fixture', baseUrl: ai.baseUrl }
  await game.configure(config)
  const { player, world: { code } } = game.create()
  ready(game, code, [player])
  await game.start(code)
  await act(game, code, player, '去碼頭')
  ai.fault('unavailable', 'narrative')
  const id = submit(game, code, player, '買一把普通長槍')
  await until(() => game.ai.status.state === 'lost')
  const saved = game.room(code)
  assert.equal(saved.members[0].character?.money, 1500)
  const dump = join(dir, 'copy.sqlite')
  await store.export(dump)
  game.stop()
  store.db.close()
  const reloaded = new Store(db)
  const restore = new Game(reloaded)
  cleanup = () => { restore.stop(); reloaded.db.close() }
  assert.throws(() => restore.open(code), /AI 連線測試/)
  await restore.configure(config)
  assert.deepEqual(restore.open(code).world.members[0].character, saved.members[0].character)
  await until(() => restore.ai.status.state === 'lost')
  assert.equal(restore.view(code, player).phase, 'paused')
  assert.equal(reloaded.pending(code, id)?.phase, 'narrate')
  assert.ok(readFileSync(dump).subarray(0, 15).toString() === 'SQLite format 3')
  ai.fault(undefined)
  await restore.configure(config)
  await until(() => reloaded.pending(code, id)?.phase === 'done')
  assert.deepEqual(restore.room(code), saved)
})

test('P0-20 本機閘門與公開資料均無 AI 密鑰', async t => {
  const ai = await compatibilityFixture()
  const host = makeHost(':memory:', 'dist', 'test-results')
  t.after(async () => { host.game.stop(); host.store.db.close(); host.server.close(); await ai.close() })
  await new Promise<void>(ok => host.server.listen(0, '127.0.0.1', ok))
  const url = 'http://127.0.0.1:' + (host.server.address() as AddressInfo).port
  assert.equal((await fetch(url + '/local/status')).status, 403)
  assert.equal((await fetch(url + '/local/status', { headers: { 'X-Tide-Local': '1', Origin: 'https://outside.example' } })).status, 403)
  const { admin } = await (await fetch(url + '/local/status', { headers: { 'X-Tide-Local': '1' } })).json()
  const headers = { 'X-Tide-Local': '1', Authorization: 'Bearer ' + admin, 'Content-Type': 'application/json' }
  const secret = 'test-secret-2026'
  const rpc = (data: object) => fetch(url + '/local/rpc', { method: 'POST', headers, body: JSON.stringify(data) })
  const refused = await rpc({ op: 'create' })
  assert.equal(refused.status, 409)
  assert.match((await refused.json()).error, /AI 連線測試/)
  assert.equal(ai.seen.length, 0)
  const configured = await rpc({ op: 'configure', config: { baseUrl: ai.baseUrl, model: 'test', apiKey: secret } })
  assert.equal(configured.status, 200)
  assert.ok(!(await configured.text()).includes(secret))
  const createdResponse = await rpc({ op: 'create' })
  assert.equal(createdResponse.status, 200)
  const created = await createdResponse.json()
  assert.equal(created.phase, 'lobby')
  const joined = await rpc({ op: 'join', code: created.world.code })
  const frame = await joined.text()
  assert.ok(!frame.includes(secret) && !frame.includes(ai.baseUrl) && !frame.includes(admin))
  assert.equal(ai.seen.at(-1)?.authorization, 'Bearer ' + secret)
})

test('XP 依 100×等級升級，第 4 級得屬性點，重複判定遞減，加點同步提高當前 HP', () => {
  const c = makeCharacter(character('甲'))
  const hp = maxHP(c)
  assert.match(grantXp(c, 100), /升到等級 2/)
  assert.deepEqual([c.level, c.xp, maxHP(c), c.hp], [2, 0, hp + 2, hp + 2])
  grantXp(c, 200 + 300 + 50)
  assert.deepEqual([c.level, c.xp, c.unspent], [4, 50, 1])
  const paid = [1, 2, 3, 4, 5].map(() => Number(/獲得 (\d+) XP/.exec(grantXp(c, 8, 'check:observe:square'))?.[1] ?? 0))
  assert.deepEqual(paid, [8, 4, 2, 0, 0])
  const before = { hp: c.hp, max: maxHP(c) }
  assert.match(allocatePoint(c, 'CON').text, /體魄提升為 4/)
  assert.deepEqual([maxHP(c), c.hp, c.unspent], [before.max + 5, before.hp + 5, 0])
  assert.equal(allocatePoint(c, 'CON').rejected, true)
})

test('房主可以透過訊息分配屬性點，戰鬥中或沒有點數時拒絕', async t => {
  const { game, code, ids } = await withGame(t)
  ready(game, code, ids)
  await game.start(code)
  assert.throws(() => game.message(code, ids[0], { kind: 'allocate', attr: 'AGI' }), /沒有可分配/)
  const world = game.room(code)
  world.members[0].character!.unspent = 1
  game.store.save(world)
  game.message(code, ids[0], { kind: 'allocate', attr: 'AGI' })
  assert.deepEqual([game.room(code).members[0].character?.stats.AGI, game.room(code).members[0].character?.unspent], [4, 0])
  assert.ok(game.store.entries(code).some(entry => /敏捷提升為 4/.test(entry.text)))
})

test('開局後未滿四人可加入；待加入者不算進 N，於港口入隊後重大決議需全員同意', async t => {
  const { game, code, ids } = await withGame(t, 3)
  ready(game, code, ids)
  await game.start(code)
  game.message(code, ids[0], { kind: 'propose', type: 'ordinary', title: '整理港口' })
  const late = game.join(code)
  const newcomer = late.view.player
  assert.equal(late.view.world.members.find(m => m.id === newcomer)?.pendingJoin, true)
  assert.throws(() => game.message(code, newcomer, { kind: 'chat', id: randomUUID(), text: '嗨' }), /尚未開始/)
  const [ordinary] = game.room(code).proposals
  for (const id of ids.slice(0, 2)) game.message(code, id, { kind: 'vote', id: ordinary.id, yes: true })
  assert.equal(game.room(code).proposals[0].passed, true)

  game.message(code, newcomer, { kind: 'character', character: character('新人') })
  assert.throws(() => submit(game, code, newcomer, '去碼頭'), /會合/)
  assert.throws(() => game.message(code, newcomer, { kind: 'ready', ready: true, agree: false }), /共同背景/)
  game.message(code, newcomer, { kind: 'ready', ready: true, agree: true })
  const room = game.room(code)
  assert.equal(room.members[3].pendingJoin, undefined)
  assert.equal(room.members[3].character?.place, 'dock')
  assert.ok(game.store.entries(code).some(entry => entry.actor === null && entry.text === '新夥伴新人在風車村港口與大家會合。'))

  game.message(code, ids[0], { kind: 'propose', type: 'formCrew', title: '成立船團' })
  const crew = game.room(code).proposals[1]
  for (const id of ids) game.message(code, id, { kind: 'vote', id: crew.id, yes: true })
  assert.equal(game.room(code).crew, false)
  game.message(code, newcomer, { kind: 'vote', id: crew.id, yes: true })
  assert.equal(game.room(code).crew, true)
  assert.match(await act(game, code, newcomer, '去碼頭'), /已經在風車村港口/)
  assert.throws(() => game.join(code), /已滿/)
})

test('同地隊友可轉交貝里與物品，潮汐簿轉交後由接手者交付；武器需持有才可換', async t => {
  const { game, code, ids } = await withGame(t, 2)
  ready(game, code, ids)
  await game.start(code)
  const [a, b] = ids
  const money = () => game.room(code).members.map(m => m.character?.money)
  assert.match(await act(game, code, a, '給旅行者 1 300 貝里'), /300 貝里交給旅行者 1/)
  assert.deepEqual(money(), [1700, 2300])
  assert.match(await act(game, code, a, '給旅行者 1 5000 貝里'), /你只有 1700 貝里/)
  await act(game, code, b, '去碼頭')
  assert.match(await act(game, code, a, '把普通衣物交給旅行者 1'), /不在風車村廣場/)
  assert.match(await act(game, code, a, '改用普通長槍'), /背包裡沒有普通長槍/)
  assert.match(await act(game, code, a, '收起武器'), /改用徒手/)
  assert.match(await act(game, code, a, '改用武士刀'), /改用普通武士刀/)

  const world = game.room(code)
  Object.assign(world, { logHolder: a, quest: 'recovered', settled: true })
  world.members[0].character!.inventory['潮汐簿'] = 1
  game.store.save(world)
  await act(game, code, a, '去碼頭')
  assert.match(await act(game, code, a, '把潮汐簿交給旅行者 1'), /把潮汐簿交給旅行者 1/)
  assert.equal(game.room(code).logHolder, b)
  assert.match(await act(game, code, a, '交還潮汐簿'), /目前無法登記或交付此委託/)
  assert.match(await act(game, code, b, '交還潮汐簿'), /350 貝里/)
  assert.equal(game.room(code).quest, 'done')

  assert.match(await act(game, code, a, '把普通武士刀交給旅行者 1'), /你改為徒手/)
  assert.equal(game.room(code).members[0].character?.weapon, 'fist')
  assert.equal(game.room(code).members[1].character?.inventory['普通武士刀'], 2)
})

test('哥亞城下町武器鋪只在當地販售，步行耗時較長，最後一把刀只賣一次', async t => {
  const { game, code, ids } = await withGame(t, 2)
  ready(game, code, ids)
  await game.start(code)
  assert.match(await act(game, code, ids[0], '買普通武士刀'), /在哥亞王國城下町的城下町武器鋪販售/)
  const before = game.room(code).minute
  assert.match(await act(game, code, ids[0], '前往哥亞王國'), /經過村外小路，抵達哥亞王國城下町/)
  assert.equal(game.room(code).minute, before + 46)
  assert.match(await act(game, code, ids[1], '我想去王國看看'), /抵達哥亞王國城下町/)
  const world = game.room(code)
  world.stock.sword = 1
  game.store.save(world)
  const [one, two] = ids.map(id => submit(game, code, id, '買普通武士刀'))
  await until(() => [one, two].every(id => game.store.pending(code, id)?.phase === 'done'))
  assert.match(game.store.pending(code, one)!.result!, /購入普通武士刀/)
  assert.match(game.store.pending(code, two)!.result!, /售完/)
  assert.equal(game.room(code).stock.sword, 0)
  assert.deepEqual(game.room(code).members.map(m => m.character?.money), [1400, 2000])
})

test('舊存檔載入時補上新欄位而不改動既有資料', () => {
  const store = new Store(':memory:')
  try {
    const world = store.create('ABCDEF0123', 'host')
    const legacy = JSON.parse(JSON.stringify(world))
    delete legacy.stock.sword
    delete legacy.memories.mayor
    legacy.members[0].character = makeCharacter(character('甲'))
    legacy.members[0].character.money = 777
    delete legacy.members[0].character.unspent
    delete legacy.members[0].character.xpLog
    store.db.prepare('UPDATE worlds SET body=? WHERE code=?').run(JSON.stringify(legacy), 'ABCDEF0123')
    const loaded = store.get('ABCDEF0123')!
    assert.equal(loaded.stock.sword, 2)
    assert.deepEqual(loaded.memories.mayor, [])
    assert.deepEqual([loaded.members[0].character?.unspent, loaded.members[0].character?.xpLog, loaded.members[0].character?.money], [0, {}, 777])
  } finally { store.db.close() }
})

test('謝爾茲鎮與橘子鎮：航行抵達、與索隆交談、完成兩地委託，港口與大街依所在島嶼解讀', async t => {
  const { game, code, ids } = await withGame(t)
  ready(game, code, ids)
  await game.start(code)
  const [player] = ids
  const play = (text: string) => act(game, code, player, text)
  const world = () => game.room(code)
  await play('前往風車村港口')
  await play('買船')
  assert.match(await play('出海前往謝爾茲鎮'), /全隊抵達謝爾茲鎮的謝爾茲鎮港口[\s\S]*基地廣場上的劍士。可找莉卡/)
  assert.match(await play('去大街'), /抵達謝爾茲鎮大街/)
  assert.match(await play('接下莉卡的請託'), /飯糰/)
  assert.match(await play('去海軍基地'), /抵達海軍第153分部/)
  assert.match(await play('找索隆聊聊'), /索隆與你交談。他砍了上校兒子養的狼/)
  for (let i = 0; i < 6 && world().islandTasks?.shells?.stage !== 'found'; i++) await play('送飯糰給索隆')
  assert.equal(world().islandTasks?.shells?.stage, 'found')
  await play('去大街')
  assert.match(await play('回報莉卡'), /莉卡聽說索隆把飯糰吃完了/)
  assert.match(await play('去港口'), /抵達謝爾茲鎮港口/)

  assert.match(await play('出海前往橘子鎮'), /全隊抵達橘子鎮的橘子鎮港口/)
  assert.match(await play('去大街'), /抵達橘子鎮大街/)
  assert.match(await play('接下鎮長的請託'), /修修/)
  await play('前往寵物店')
  for (let i = 0; i < 6 && world().islandTasks?.orange?.stage !== 'found'; i++) await play('整理寵物店')
  await play('去大街')
  assert.match(await play('回報布德鎮長'), /布德鎮長看見寵物店重新關好門/)
  assert.equal(world().members[0].character?.money, 2000 - 650 + 200 + 300)
  assert.match(await play('去碼頭'), /抵達橘子鎮港口/)
  assert.match(await play('返航'), /無法由現在的港口起航/)
  assert.equal(world().ship?.port, 'orangePort')
})

test('世界資料完整：每個地點都有路徑、地標與所屬島嶼，委託、航線與時間線都指向有效資料', async () => {
  const { locations, npcs, islandIds } = await import('../packages/shared/protocol.ts')
  const { paths, landmarks, people } = await import('../packages/world/village.ts')
  const { islands, islandAt, islandStories, seaLanes } = await import('../packages/world/sea.ts')
  const { canonTimeline, minuteOf } = await import('../packages/world/canon.ts')
  for (const id of Object.keys(locations) as (keyof typeof locations)[]) {
    assert.ok(paths[id]?.length, id + ' 缺路徑')
    assert.ok(landmarks[id], id + ' 缺地標')
    assert.equal(islandIds.filter(island => islands[island].places.includes(id)).length, 1, id + ' 須屬於恰好一座島')
    for (const next of paths[id]) assert.equal(islandAt(next), islandAt(id), id + ' 的步行路徑不可跨島')
  }
  for (const id of Object.keys(npcs) as (keyof typeof npcs)[]) assert.ok(people[id], id + ' 缺 NPC 資料')
  for (const [island, story] of Object.entries(islandStories)) {
    assert.equal(islandAt(story!.meeting), island)
    assert.equal(islandAt(story!.search), island)
    assert.ok(people[story!.guide])
  }
  for (const lane of seaLanes) for (const end of lane.ends) assert.ok(islands[end])
  const times = canonTimeline.map(event => minuteOf(event.at))
  assert.deepEqual(times, [...times].sort((a, b) => a - b), '時間線須依時間排序')
  assert.equal(new Set(canonTimeline.map(event => event.id)).size, canonTimeline.length)
})

test('時間線：等待讓原作事件依日期發生，NPC 移動並改變說法；已先完成的委託會改寫結果', async t => {
  const { game, code, ids } = await withGame(t)
  ready(game, code, ids)
  await game.start(code)
  const [player] = ids
  const play = (text: string) => act(game, code, player, text)
  assert.match(await play('等待 30 小時'), /你在風車村廣場等待了 30 小時/)
  let world = game.room(code)
  assert.equal(world.timeline?.shells, 'canon')
  assert.equal(world.timeline?.orange, undefined)
  assert.equal(world.npcPlaces?.zoro, null)
  assert.match(world.npcFacts?.rika ?? '', /蒙卡上校被打倒了/)
  assert.equal(world.islandTasks?.shells?.stage, 'closed')
  assert.ok(game.store.entries(code).some(entry => entry.actor === null && entry.text.startsWith('【報紙】謝爾茲鎮・')))

  world.islandTasks = { ...world.islandTasks, syrup: { stage: 'done' } }
  game.store.save(world)
  await play('等待 4 天')
  world = game.room(code)
  assert.equal(world.timeline?.syrup, 'changed')
  assert.equal(world.npcPlaces?.klahadore, null)
  assert.equal(world.npcPlaces?.usopp, undefined)
  assert.equal(world.timeline?.baratie, 'canon')
  assert.ok(game.store.entries(code).some(entry => /西羅布村・西羅布村的黎明：黑貓海賊團還沒登陸就被識破/.test(entry.text)))
})

test('偉大航路：需記錄指針、單向航線、衝天海流要先抓南方鳥，危險海域加重船損', async t => {
  const { game, code, ids } = await withGame(t)
  ready(game, code, ids)
  await game.start(code)
  const [player] = ids
  const play = (text: string) => act(game, code, player, text)
  const world = game.room(code)
  world.ship = { owner: player, port: 'loguePort', hull: 100, wood: 2, trips: 0 }
  world.members[0].character!.place = 'loguePort'
  game.store.save(world)
  assert.match(await play('出海前往雙子岬'), /必須有人帶著記錄指針/)
  await play('前往一本松武器店')
  assert.match(await play('買記錄指針'), /購入記錄指針，支出 1000 貝里/)
  assert.match(await play('去港口'), /抵達羅格鎮港/)
  assert.match(await play('出海前往雙子岬'), /翻越顛倒山[\s\S]*全隊抵達雙子岬的雙子岬港灣/)
  assert.ok(game.room(code).ship!.hull <= 90)
  assert.match(await play('出海前往羅格鎮'), /無法由現在的港口起航/)

  const jaya = game.room(code)
  jaya.ship!.port = 'mockPort'
  jaya.members[0].character!.place = 'mockPort'
  game.store.save(jaya)
  assert.match(await play('出海前往空島'), /要先完成「南方鳥」/)
})

test('高難度委託有等級與日期門檻；推進城救出艾斯後，頂上戰爭改寫且馬林福特委託不再發生', async t => {
  const { game, code, ids } = await withGame(t)
  ready(game, code, ids)
  await game.start(code)
  const [player] = ids
  const play = (text: string) => act(game, code, player, text)
  const setUp = (change: (world: ReturnType<typeof game.room>) => void) => {
    const world = game.room(code)
    change(world)
    game.store.save(world)
  }
  setUp(world => { world.members[0].character!.place = 'impelLevel5' })
  assert.match(await play('接下伊娃可夫的計畫'), /還沒有相關的動靜/)
  setUp(world => { world.minute = (53 - 1) * 1440 + 8 * 60 })
  assert.match(await play('接下伊娃可夫的計畫'), /建議等級 7，隊伍最高等級 1/)
  setUp(world => { world.members[0].character!.level = 7 })
  assert.match(await play('接下伊娃可夫的計畫'), /無限地獄/)
  // Rejected actions never move the clock; the accepted one fires every event due by Day 53.
  assert.equal(game.room(code).npcPlaces?.ace, 'impelLevel6')
  await play('前往推進城第六層')
  for (let i = 0; i < 10 && game.room(code).islandTasks?.impelDown?.stage !== 'found'; i++) await play('闖入無限地獄')
  assert.equal(game.room(code).islandTasks?.impelDown?.stage, 'found')
  await play('前往推進城第五層')
  assert.match(await play('和艾斯一起逃出'), /艾斯重獲自由[\s\S]*獲得 600 XP/)
  assert.equal(game.room(code).npcPlaces?.ace, null)

  await play('等待 10 天')
  await play('等待 10 天')
  const world = game.room(code)
  for (const id of ['execution', 'aceTransfer', 'warBegins', 'warEnds']) assert.equal(world.timeline?.[id], 'changed', id)
  assert.equal(world.npcPlaces?.ace, null)
  assert.notEqual(world.npcPlaces?.whitebeard, 'marinefordBay')
  setUp(world => { world.members[0].character!.place = 'marinefordBay'; world.members[0].character!.level = 9 })
  assert.match(await play('加入白鬍子的救援'), /不會再發生/)
})

test('多人時只有全隊在線且同地才能一起等待', async t => {
  const { game, code, ids } = await withGame(t, 2)
  ready(game, code, ids)
  await game.start(code)
  await act(game, code, ids[1], '去碼頭')
  assert.match(await act(game, code, ids[0], '等待 5 小時'), /全隊都要在線並在同一地點/)
  await act(game, code, ids[1], '回廣場')
  const before = game.room(code).minute
  assert.match(await act(game, code, ids[0], '等待 5 小時'), /全隊在風車村廣場等待了 5 小時/)
  assert.equal(game.room(code).minute, before + 300)
})

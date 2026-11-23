// Local models spend most of their time reading the prompt and writing hidden "thinking".
// These tests pin the measures that keep each action fast.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { AiProvider } from '../packages/ai/provider.ts'
import { Game } from '../apps/host/game.ts'
import { Store } from '../apps/host/store.ts'
import { islands } from '../packages/world/sea.ts'
import { npcsAt } from '../packages/world/village.ts'
import { character, compatibilityFixture } from './fixtures.ts'

async function started(t: TestContext) {
  const ai = await compatibilityFixture()
  const store = new Store(':memory:')
  const game = new Game(store)
  t.after(async () => { game.stop(); store.db.close(); await ai.close() })
  await game.configure({ baseUrl: ai.baseUrl, model: 'fixture-model' })
  const { world: { code }, player } = game.create()
  game.message(code, player, { kind: 'character', character: character('甲') })
  game.message(code, player, { kind: 'ready', ready: true, agree: true })
  await game.start(code)
  const act = async (text: string) => {
    const id = randomUUID()
    game.message(code, player, { kind: 'act', id, version: game.room(code).version, text })
    for (let i = 0; i < 300 && store.pending(code, id)?.phase !== 'done'; i++) await delay(10)
    return store.pending(code, id)!.result!
  }
  return { ai, game, code, player, act }
}

test('意圖判斷只附上本島的 NPC，旁白不附導航資料，送出的內容大幅縮小', async t => {
  const { ai, game, code, act } = await started(t)
  await act('我在酒吧表演一段魔術')
  const intent = ai.seen.find(call => call.kind === 'intent')!
  const context = JSON.parse(intent.content).context
  const islandNpcs = new Set(islands.wind.places.flatMap(place => npcsAt(game.room(code), place)))
  assert.ok(Object.keys(context.people).every(id => islandNpcs.has(id as never)), '只能有本島的 NPC')
  assert.ok(Object.keys(context.people).length < 20)
  assert.ok(intent.content.length < 900, '意圖內容應小於 900 字，實際 ' + intent.content.length)
  // Free-action narration sends the context itself; ordinary narration wraps it as { result, context }.
  const body = JSON.parse(ai.seen.find(call => call.kind === 'narrative')!.content)
  const narration = body.context ?? body
  for (const field of ['people', 'destinations', 'routes', 'adjacent', 'ship', 'items'])
    assert.equal(narration[field], undefined, '旁白不需要 ' + field)
})

test('每個請求都要求模型跳過隱藏的思考，旁白以串流送出', async t => {
  const { ai, act } = await started(t)
  await act('我在酒吧表演一段魔術')
  const [intent, narrative] = ['intent', 'narrative'].map(kind => ai.seen.find(call => call.kind === kind)!)
  assert.equal(intent.thinking, false)
  assert.equal(narrative.thinking, false)
  assert.equal(narrative.stream, true)
  assert.equal(intent.stream, false)
})

test('戰鬥只在結束時請 AI 寫一次旁白，休息與吃飯不寫旁白', async t => {
  const { ai, game, code, act } = await started(t)
  const narrations = () => ai.seen.filter(call => call.kind === 'narrative').length
  const before = narrations()
  for (let round = 0; round < 30; round++) {
    await act('攻擊村長')
    if (!game.room(code).combat) break
    assert.equal(narrations(), before, '戰鬥還沒結束時不寫旁白')
  }
  assert.equal(game.room(code).combat, undefined)
  assert.equal(narrations(), before + 1)
  await act('去派對酒吧')
  const rested = narrations()
  await act('休息')
  assert.equal(narrations(), rested)
})

test('伺服器拒絕額外欄位時自動改用一般請求，之後也不再送', async t => {
  const ai = await compatibilityFixture()
  t.after(ai.close)
  ai.strictFields(true)
  const provider = new AiProvider()
  await provider.configure({ baseUrl: ai.baseUrl, model: 'strict' }, false)
  const parts: string[] = []
  ai.narrateWith('浪花拍打著碼頭。')
  assert.equal(await provider.narrate({}, '結果', false, undefined, text => parts.push(text)), '浪花拍打著碼頭。')
  const after = ai.seen.length
  await provider.narrate({}, '結果', false, undefined, text => parts.push(text))
  assert.ok(ai.seen.slice(after).every(call => call.thinking === undefined && !call.stream), '記住伺服器不支援，不再送')
})

test('串流旁白會一段一段回報，最後回傳完整文字', async t => {
  const ai = await compatibilityFixture()
  t.after(ai.close)
  const provider = new AiProvider()
  await provider.configure({ baseUrl: ai.baseUrl, model: 'fixture' }, false)
  ai.narrateWith('一陣海風吹過港口，帶來遠方的消息。')
  const parts: string[] = []
  const text = await provider.narrate({}, '結果', false, undefined, part => parts.push(part))
  assert.equal(text, '一陣海風吹過港口，帶來遠方的消息。')
  assert.ok(parts.length >= 2)
  assert.ok(parts[0].length < text.length)
  assert.equal(parts.at(-1), text)
})

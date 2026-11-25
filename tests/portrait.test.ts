// Player portraits: who may set one, what is accepted, and that pictures travel only when asked for.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { Game } from '../apps/host/game.ts'
import { jpegSize, portraitRevision } from '../apps/host/portrait.ts'
import { Store } from '../apps/host/store.ts'
import { messageSchema, peerRequest, portraitLimit } from '../packages/shared/protocol.ts'
import { character, compatibilityFixture } from './fixtures.ts'

/** The frame header of a JPEG of this size; `salt` makes different pictures. */
const jpeg = (width: number, height: number, salt = 0) => 'data:image/jpeg;base64,' + Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0, 4, salt, 0, 0xff, 0xc0, 0, 17, 8, height >> 8, height & 255, width >> 8, width & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xff, 0xd9,
]).toString('base64')

async function room(t: TestContext) {
  const ai = await compatibilityFixture()
  const store = new Store(':memory:')
  const game = new Game(store)
  t.after(async () => { game.stop(); store.db.close(); await ai.close() })
  await game.configure({ baseUrl: ai.baseUrl, model: 'fixture-model' })
  const { world: { code }, player: host } = game.create()
  const guest = game.join(code)
  return { game, store, code, host, guest: guest.view.player, token: guest.token }
}
const portraitOf = (game: Game, code: string, viewer: string, whose: string) => game.view(code, viewer).world.members.find(m => m.id === whose)!.portrait

test('玩家設定頭貼後全隊看得到，圖片只在要求時傳送，開局前後都能換、能移除', async t => {
  const { game, store, code, host, guest } = await room(t)
  assert.equal(game.view(code, host).portraits, true)
  assert.equal(portraitOf(game, code, host, guest), undefined)
  // In the lobby, before there is a character.
  game.message(code, guest, { kind: 'portrait', image: jpeg(160, 160) })
  const revision = portraitOf(game, code, host, guest)!
  assert.match(revision, /^[a-f0-9]{16}$/)
  assert.doesNotMatch(JSON.stringify(game.view(code, host)), /data:image/)
  assert.doesNotMatch(JSON.stringify(store.get(code)), /data:image/, '存檔本體與 AI 都不帶圖片')
  assert.deepEqual(game.message(code, host, { kind: 'portraits', want: [revision, '0'.repeat(16)] }), { pictures: { [revision]: jpeg(160, 160) } })

  for (const [i, id] of [host, guest].entries()) {
    game.message(code, id, { kind: 'character', character: character('旅人' + i) })
    game.message(code, id, { kind: 'ready', ready: true, agree: true })
  }
  await game.start(code)
  const { version } = game.room(code)
  game.message(code, guest, { kind: 'portrait', image: jpeg(160, 160, 7) })
  assert.notEqual(portraitOf(game, code, host, guest), revision)
  assert.equal(game.room(code).version, version, '換頭貼不動世界進度')
  assert.deepEqual(game.message(code, host, { kind: 'portraits', want: [revision] }), { pictures: {} })
  assert.equal(portraitOf(game, code, guest, host), undefined, '只能換自己的')
  game.message(code, guest, { kind: 'portrait', image: null })
  assert.equal(portraitOf(game, code, host, guest), undefined)
})

test('換設備後頭貼還在；移除沒入隊的玩家會一起刪掉頭貼；別的房間拿不到', async t => {
  const { game, store, code, guest, token } = await room(t)
  game.message(code, guest, { kind: 'portrait', image: jpeg(96, 96) })
  const revision = portraitOf(game, code, guest, guest)!
  const moved = game.join(code, undefined, game.issueTransfer(code, guest, false).code)
  assert.equal(moved.view.world.members.find(m => m.id === guest)!.portrait, revision)
  assert.notEqual(moved.token, token)
  assert.equal(store.picture('AAAAAAAAAA', revision), undefined)
  game.remove(code, guest)
  assert.equal(store.picture(code, revision), undefined)
})

test('不是 JPEG、尺寸過大或過小的圖片會被拒絕', async t => {
  const { game, code, guest } = await room(t)
  const bomb = jpeg(65_000, 65_000)
  assert.deepEqual(jpegSize(Buffer.from(jpeg(160, 120).split(',')[1], 'base64')), { width: 160, height: 120 })
  for (const bad of [bomb, jpeg(513, 160), jpeg(8, 160), 'data:image/jpeg;base64,' + Buffer.from('<svg onload=alert(1)>').toString('base64'), 'data:image/jpeg;base64,/9j/'])
    assert.throws(() => game.message(code, guest, { kind: 'portrait', image: bad }), /不能當頭貼/)
  assert.ok(portraitRevision(jpeg(512, 512)))
  for (const image of ['https://example.com/a.jpg', 'data:image/svg+xml;base64,AAAA', 'data:image/jpeg;base64,AA AA', 'data:image/jpeg;base64,' + 'A'.repeat(portraitLimit)])
    assert.ok(!messageSchema.safeParse({ kind: 'portrait', image }).success, image.slice(0, 40))
  // The largest one still fits the limit of a remote request.
  const image = 'data:image/jpeg;base64,'.padEnd(portraitLimit, 'A')
  const request = { id: crypto.randomUUID(), body: { kind: 'portrait', image } }
  assert.ok(peerRequest.safeParse(request).success && JSON.stringify(request).length < 16_000)
  assert.ok(!messageSchema.safeParse({ kind: 'portraits', want: Array(5).fill('0'.repeat(16)) }).success)
})

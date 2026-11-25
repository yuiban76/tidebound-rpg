// Moving a character to another device: one-time codes, the old device signed out, and seats taken by mistake.
import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import type { TestContext } from 'node:test'
import { Game } from '../apps/host/game.ts'
import { Store } from '../apps/host/store.ts'
import { peerRequest, transferCode } from '../packages/shared/protocol.ts'
import { character, compatibilityFixture } from './fixtures.ts'

async function room(t: TestContext, guests = 1, started = true) {
  const ai = await compatibilityFixture()
  const store = new Store(':memory:')
  const game = new Game(store)
  t.after(async () => { game.stop(); store.db.close(); await ai.close() })
  await game.configure({ baseUrl: ai.baseUrl, model: 'fixture-model' })
  const { world: { code }, player: host } = game.create()
  const seats = Array.from({ length: guests }, () => game.join(code)).map(joined => ({ id: joined.view.player, token: joined.token }))
  for (const [i, id] of [host, ...seats.map(seat => seat.id)].entries()) {
    game.message(code, id, { kind: 'character', character: character('旅人' + i) })
    game.message(code, id, { kind: 'ready', ready: true, agree: true })
  }
  if (started) await game.start(code)
  return { game, code, host, seats }
}

test('玩家自己產生換設備碼，新設備接回同一個角色，舊設備登出', async t => {
  const { game, code, seats: [seat] } = await room(t)
  const asked = game.message(code, seat.id, { kind: 'transfer' })
  assert.ok(!Array.isArray(asked) && asked.transfer)
  assert.match(asked.transfer!.code, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/)
  const members = game.room(code).members.length
  // Lower case and a missing dash are fine.
  const moved = game.join(code, undefined, asked.transfer!.code.toLowerCase().replace('-', ' '))
  assert.equal(moved.view.player, seat.id)
  assert.equal(moved.view.world.members.find(m => m.id === seat.id)?.character?.name, '旅人1')
  assert.equal(game.room(code).members.length, members, '沒有多佔位置')
  assert.notEqual(moved.token, seat.token)
  assert.throws(() => game.guest(code, seat.token), /憑證已失效/)
  assert.throws(() => game.join(code, seat.token), /憑證已失效/)
  assert.equal(game.join(code, moved.token).view.player, seat.id)
  // Once only, and gone from the screen that asked.
  assert.equal(game.view(code, seat.id).transfer, undefined)
  assert.throws(() => game.join(code, undefined, asked.transfer!.code), /不正確或已過期/)
})

test('房主替丟了設備的玩家產生；碼不會出現在原設備或別人的畫面，房主自己不能用', async t => {
  const { game, code, host, seats } = await room(t, 2)
  const ticket = game.issueTransfer(code, seats[0].id, false)
  for (const id of [host, seats[0].id, seats[1].id]) assert.equal(game.view(code, id).transfer, undefined)
  const own = game.message(code, seats[1].id, { kind: 'transfer' })
  assert.ok(!Array.isArray(own) && own.transfer)
  for (const id of [host, seats[0].id]) assert.doesNotMatch(JSON.stringify(game.view(code, id)), new RegExp(own.transfer!.code))
  assert.throws(() => game.issueTransfer(code, host, false), /房主的角色/)
  assert.throws(() => game.message(code, host, { kind: 'transfer' }), /房主的角色/)
  assert.equal(game.join(code, undefined, ticket.code).view.player, seats[0].id)
})

test('重新產生會讓舊碼失效，十分鐘後過期', async t => {
  const { game, code, seats: [seat] } = await room(t)
  const first = game.issueTransfer(code, seat.id, false)
  const second = game.issueTransfer(code, seat.id, false)
  assert.throws(() => game.join(code, undefined, first.code), /不正確/)
  const real = Date.now
  mock.method(Date, 'now', () => real() + 10 * 60_000 + 1000)
  t.after(() => mock.restoreAll())
  game.touch(code, game.room(code).members[0].id)
  assert.throws(() => game.join(code, undefined, second.code), /不正確或已過期/)
  assert.equal(game.guest(code, seat.token), seat.id, '沒換成功時原設備照常使用')
})

test('猜錯十次就鎖住，這個房間發出的碼也作廢；角色不受影響', async t => {
  const { game, code, seats: [seat] } = await room(t)
  const ticket = game.issueTransfer(code, seat.id, false)
  for (let i = 0; i < 10; i++) assert.throws(() => game.join(code, undefined, 'AAAA-AAA' + 'BCDEFGHJKM'[i]), /不正確/)
  assert.throws(() => game.join(code, undefined, ticket.code), /錯誤太多次/)
  assert.equal(game.guest(code, seat.token), seat.id)
  // The lock ends by itself, and a new code works again.
  const real = Date.now
  mock.method(Date, 'now', () => real() + 11 * 60_000)
  t.after(() => mock.restoreAll())
  game.touch(code, game.room(code).members[0].id)
  assert.throws(() => game.join(code, undefined, ticket.code), /不正確或已過期/)
  assert.equal(game.join(code, undefined, game.issueTransfer(code, seat.id, false).code).view.player, seat.id)
})

test('在新設備誤加入的空位，接回角色時自動收掉；已經創角的不會被動到', async t => {
  const { game, code, seats: [seat] } = await room(t)
  const mistake = game.join(code)
  assert.equal(game.room(code).members.length, 3)
  const moved = game.join(code, mistake.token, game.issueTransfer(code, seat.id, false).code)
  assert.equal(moved.view.player, seat.id)
  assert.deepEqual(game.room(code).members.map(m => m.id).includes(mistake.view.player), false)
  assert.throws(() => game.guest(code, mistake.token), /憑證已失效/)

  const second = game.join(code)
  game.message(code, second.view.player, { kind: 'character', character: character('第二角') })
  game.join(code, second.token, game.issueTransfer(code, seat.id, false).code)
  assert.ok(game.room(code).members.some(m => m.id === second.view.player))
})

test('房主可以移除還沒入隊的玩家；已入隊的、房主自己不行', async t => {
  const { game, code, host, seats: [seat] } = await room(t)
  const late = game.join(code)
  assert.throws(() => game.remove(code, seat.id), /已經入隊/)
  assert.throws(() => game.remove(code, host), /已經入隊/)
  game.remove(code, late.view.player)
  assert.equal(game.room(code).members.length, 2)
  assert.throws(() => game.guest(code, late.token), /憑證已失效/)
  assert.throws(() => game.remove(code, late.view.player), /找不到/)

  const lobby = await room(t, 1, false)
  lobby.game.remove(lobby.code, lobby.seats[0].id)
  assert.equal(lobby.game.room(lobby.code).members.length, 1)
})

test('傳進來的格式受限制，舊版玩家頁面照樣能連', () => {
  const id = crypto.randomUUID()
  assert.ok(peerRequest.safeParse({ id, body: { kind: 'hello' } }).success)
  assert.ok(peerRequest.safeParse({ id, body: { kind: 'hello', claim: 'ABCD-2345' } }).success)
  for (const bad of ['', 'ABC', 'ABCD-2345-6789-0000', 'ABCD_2345', '<script>']) assert.ok(!transferCode.safeParse(bad).success, bad)
})

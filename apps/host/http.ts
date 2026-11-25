import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { extname, join, resolve, sep } from 'node:path'
import { z } from 'zod'
import { AiFault } from '../../packages/ai/provider.ts'
import { messageSchema, transferCode } from '../../packages/shared/protocol.ts'
import { Game, GameError } from './game.ts'
import { Store } from './store.ts'

const token = z.string().regex(/^[a-f0-9]{64}$/)
const code = z.string().regex(/^[A-F0-9]{10}$/)
const call = z.discriminatedUnion('op', [
  z.strictObject({ op: z.literal('configure'), config: z.unknown() }),
  z.strictObject({ op: z.literal('cancelProbe') }),
  z.strictObject({ op: z.literal('create') }),
  z.strictObject({ op: z.literal('open'), code }),
  z.strictObject({ op: z.literal('start'), code }),
  z.strictObject({ op: z.literal('list') }),
  z.strictObject({ op: z.literal('backup') }),
  z.strictObject({ op: z.literal('review'), code, id: z.uuid(), approved: z.boolean() }),
  z.strictObject({ op: z.literal('host'), code, message: messageSchema }),
  z.strictObject({ op: z.literal('join'), code, token: token.optional(), claim: transferCode.optional() }),
  z.strictObject({ op: z.literal('transfer'), code, id: z.uuid() }),
  z.strictObject({ op: z.literal('remove'), code, id: z.uuid() }),
  z.strictObject({ op: z.literal('guest'), code, token, message: messageSchema }),
  z.strictObject({ op: z.literal('disconnect'), code, token }),
])

function send(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(data))
}
async function body(req: IncomingMessage) {
  if (req.headers['content-type'] !== 'application/json') throw new GameError('請求格式不支援。')
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of req) {
    bytes += chunk.length
    if (bytes > 24_000) throw new GameError('請求過長。')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
}
const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
}

export function makeHost(filename: string, assets: string, exportDir: string) {
  const store = new Store(filename)
  const game = new Game(store)
  const admin = randomBytes(32).toString('hex')
  const quotas = new Map<string, { until: number, count: number }>()
  const root = resolve(assets)
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('X-Frame-Options', 'DENY')
    const host = req.headers.host ?? ''
    if (!/^(127\.0\.0\.1|localhost)(:\d{1,5})?$/.test(host)) return send(res, 403, { error: '房主服務僅在本機開放。' })
    try {
      const url = new URL(req.url ?? '/', 'http://' + host)
      if (url.pathname.startsWith('/local/')) {
        if (req.headers['x-tide-local'] !== '1' || req.headers['sec-fetch-site'] === 'cross-site' ||
          (req.headers.origin && req.headers.origin !== 'http://' + host))
          return send(res, 403, { error: '此服務僅接受本機房主介面。' })
        if (req.method === 'GET' && url.pathname === '/local/status')
          return send(res, 200, { admin, ai: game.ai.status, saves: store.list() })
        if (req.method !== 'POST' || url.pathname !== '/local/rpc')
          return send(res, 404, { error: '未知操作。' })
        if (req.headers.authorization !== 'Bearer ' + admin)
          return send(res, 403, { error: '本機服務已重啟，請重新整理。' })
        const rpc = call.parse(await body(req))
        switch (rpc.op) {
          case 'configure':
            return send(res, 200, await game.configure(rpc.config))
          case 'cancelProbe':
            game.cancelProbe()
            return send(res, 200, true)
          case 'create':
            return send(res, 200, game.create())
          case 'open':
            return send(res, 200, game.open(rpc.code))
          case 'start':
            return send(res, 200, await game.start(rpc.code))
          case 'review':
            game.review(rpc.code, rpc.id, rpc.approved)
            return send(res, 200, true)
          case 'list':
            return send(res, 200, store.list())
          case 'backup': {
            mkdirSync(exportDir, { recursive: true })
            const name = 'tidebound-' + new Date().toISOString().replace(/[:.]/g, '-') + '.sqlite'
            const backupPath = join(exportDir, name)
            await store.export(backupPath)
            res.writeHead(200, {
              'Content-Type': 'application/vnd.sqlite3', 'Cache-Control': 'no-store',
              'Content-Disposition': 'attachment; filename="' + name + '"',
            })
            createReadStream(backupPath).on('error', () => res.destroy()).pipe(res)
            return
          }
          case 'host':
            return send(res, 200, game.message(rpc.code, game.room(rpc.code).members[0].id, rpc.message))
          case 'join':
            return send(res, 200, game.join(rpc.code, rpc.token, rpc.claim))
          case 'transfer':
            return send(res, 200, game.issueTransfer(rpc.code, rpc.id, false))
          case 'remove':
            game.remove(rpc.code, rpc.id)
            return send(res, 200, true)
          case 'disconnect':
            game.disconnect(rpc.code, game.guest(rpc.code, rpc.token))
            return send(res, 200, true)
          case 'guest': {
            const id = game.guest(rpc.code, rpc.token)
            const now = Date.now()
            if (quotas.size > 128) for (const [key, value] of quotas) {
              if (value.until <= now) quotas.delete(key)
            }
            const quota = quotas.get(id) ?? { count: 0, until: 0 }
            if (quota.until <= now) Object.assign(quota, { count: 0, until: now + 1000 })
            quota.count++
            quotas.set(id, quota)
            if (quota.count > 10) return send(res, 429, { error: '操作太頻繁，請稍候。' })
            return send(res, 200, game.message(rpc.code, id, rpc.message))
          }
        }
      }
      const page = resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)))
      if (!page.startsWith(root + sep) || !existsSync(page) || !statSync(page).isFile())
        return send(res, 404, { error: '找不到頁面。若尚未建置前端，請執行 npm run build。' })
      res.writeHead(200, { 'Content-Type': mime[extname(page)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' })
      createReadStream(page).on('error', () => res.destroy()).pipe(res)
    } catch (error) {
      if (error instanceof GameError || error instanceof AiFault)
        return send(res, 409, { error: error.message })
      if (error instanceof z.ZodError || error instanceof SyntaxError)
        return send(res, 400, { error: '資料格式有誤，請檢查表單欄位。' })
      console.error('房主服務發生未預期的錯誤。')
      return send(res, 500, { error: '房主服務暫時無法處理請求。' })
    }
  })
  return { server, store, game }
}

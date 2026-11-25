import { Peer } from 'peerjs'
import type { DataConnection, PeerOptions } from 'peerjs'
import { peerRequest } from '../../packages/shared/protocol.ts'
import type { AiStatus, Message, PeerRequest } from '../../packages/shared/protocol.ts'
import type { Game } from '../host/game.ts'
import type { Entry } from '../host/store.ts'

export type View = ReturnType<Game['view']>
export type Save = { code: string, started: boolean, minute: number, count: number }
export type LocalStatus = { admin: string, ai: AiStatus, saves: Save[] }
export type Pictures = { pictures: Record<string, string> }
export type Command = (msg: Message) => Promise<View | Entry[] | Pictures>
type Greeting = { token: string, view: View }
type Reply = { id: string, ok?: View | Entry[] | Pictures | Greeting, error?: string }
type Turn = { urls: string, username: string, credential: string }
export const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname)
export const initialRoom = new URLSearchParams(location.hash.slice(1)).get('join') ?? ''

export function setTurn(turn?: Turn) {
  if (!turn) { sessionStorage.removeItem('tide-turn'); return }
  if (!/^turns?:[^\s]+$/i.test(turn.urls) || !turn.username || !turn.credential)
    throw new Error('請填寫有效的 TURN URL、使用者名稱與密碼。')
  sessionStorage.setItem('tide-turn', JSON.stringify(turn))
}

async function checked(response: Response) {
  if (!response.ok) {
    const { error } = await response.json().catch(() => ({}))
    throw new Error(error ?? '無法聯絡房主服務。')
  }
  return response
}

export async function localStatus(): Promise<LocalStatus> {
  const response = await fetch('/local/status', {
    headers: { 'X-Tide-Local': '1' }, signal: AbortSignal.timeout(2200),
  })
  return (await checked(response)).json()
}
export async function localRpc<T>(admin: string, input: object): Promise<T> {
  const response = await checked(await fetch('/local/rpc', {
    method: 'POST',
    headers: { 'X-Tide-Local': '1', Authorization: 'Bearer ' + admin, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }))
  if ('op' in input && input.op === 'backup') return await response.blob() as T
  return response.json()
}

function peerOptions(): PeerOptions {
  const search = new URLSearchParams(location.search)
  const signal = search.get('signal') || import.meta.env.VITE_SIGNAL_URL
  const stun = import.meta.env.VITE_STUN_URL
  const turn = JSON.parse(sessionStorage.getItem('tide-turn') || 'null') as Turn | null
  const opts: PeerOptions = stun || turn ? {
    config: {
      iceServers: [{ urls: stun || 'stun:stun.l.google.com:19302' }, ...(turn ? [turn] : [])],
      sdpSemantics: 'unified-plan',
    },
  } : {}
  if (!signal) return opts
  const url = new URL(signal)
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)))
    throw new Error('訊號伺服器需要 HTTPS，或使用本機測試伺服器。')
  return {
    ...opts, host: url.hostname, secure: url.protocol === 'https:',
    port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)), path: url.pathname,
  }
}
const peerId = (code: string) => 'tidebound-' + code.toLowerCase()

export function inviteUrl(code: string, publicRoot?: string) {
  const url = new URL(publicRoot || location.href)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
    throw new Error('請輸入有效的玩家網頁網址。')
  const signal = new URLSearchParams(location.search).get('signal') || import.meta.env.VITE_SIGNAL_URL
  if (signal) url.searchParams.set('signal', signal)
  url.hash = 'join=' + code
  return url.href
}

export function bridge(code: string, admin: string, status: (text: string) => void) {
  const peer = new Peer(peerId(code), peerOptions())
  const sessions = new Map<string, DataConnection>()
  peer.on('open', () => status('遠端邀請就緒'))
  peer.on('error', () => status('遠端訊號無法連線，請檢查網路或重新啟用。'))
  peer.on('disconnected', () => status('遠端訊號中斷，請重新啟用。'))
  peer.on('connection', conn => {
    let token: string | undefined
    let closed = false
    let processing = false
    let attempts = 0
    let windowStarted = Date.now()
    const deadline = setTimeout(() => { if (!token) conn.close() }, 12_000)
    conn.on('data', async data => {
      if (Date.now() - windowStarted > 1000) {
        windowStarted = Date.now()
        attempts = 0
      }
      try {
        attempts++
        if (attempts > 20 || JSON.stringify(data).length > 16_000) return conn.close()
      } catch { return conn.close() }
      const parsed = peerRequest.safeParse(data)
      if (!parsed.success || processing || closed) return
      processing = true
      const { id, body } = parsed.data
      try {
        if (body.kind === 'hello') {
          if (token) throw new Error('此連線已經登入。')
          const joined = await localRpc<Greeting>(admin, { op: 'join', code, token: body.token, claim: body.claim })
          if (closed) {
            if (!sessions.has(joined.token)) void localRpc(admin, { op: 'disconnect', code, token: joined.token }).catch(() => {})
            return
          }
          token = joined.token
          const old = sessions.get(token)
          sessions.set(token, conn)
          old?.close()
          await conn.send({ id, ok: joined } satisfies Reply)
        } else {
          if (!token || sessions.get(token) !== conn) throw new Error('請先加入或重連。')
          const ok = await localRpc<View | Entry[] | Pictures>(admin, { op: 'guest', code, token, message: body })
          if (!closed) await conn.send({ id, ok } satisfies Reply)
        }
      } catch (error) {
        if (!closed) {
          try { await conn.send({ id, error: error instanceof Error ? error.message : '房主請求失敗。' } satisfies Reply) }
          catch { conn.close() }
        }
      } finally {
        processing = false
      }
    })
    conn.on('close', () => {
      clearTimeout(deadline)
      closed = true
      if (token && sessions.get(token) === conn) {
        sessions.delete(token)
        void localRpc(admin, { op: 'disconnect', code, token }).catch(() => {})
      }
    })
    conn.on('error', () => conn.close())
  })
  return () => peer.destroy()
}

const seatKey = (code: string) => 'tide-guest-' + code
/** Whether this browser already holds a seat in the room. */
export const hasSeat = (code: string) => localStorage.getItem(seatKey(code)) !== null

/** How to enter: with the seat this browser holds, as somebody new, or by claiming a seat with a device code. */
export type Entrance = { fresh?: boolean, claim?: string }

export function connect(code: string, entrance: Entrance, onView: (view: View) => void, onStatus: (state: string, final: boolean) => void, onGap: (count: number) => void) {
  let peer: Peer | undefined
  let link: DataConnection | undefined
  let disposed = false
  let retry: ReturnType<typeof setTimeout>
  let deadline: ReturnType<typeof setTimeout>
  let poll: ReturnType<typeof setInterval>
  let inflight: { id: string, resolve: (reply: Reply) => void, reject: (error: Error) => void, timer: ReturnType<typeof setTimeout> } | undefined
  let chain: Promise<unknown> = Promise.resolve()
  const key = seatKey(code)
  let credentials: string | undefined = entrance.fresh ? undefined : localStorage.getItem(key) ?? undefined
  let claim = entrance.claim
  let cursor = Number(localStorage.getItem(key + '-cursor')) || 0

  function request(body: PeerRequest['body']): Promise<NonNullable<Reply['ok']>> {
    const current = link
    const task = chain.then(async () => {
      if (!current?.open || current !== link || disposed) throw new Error('房主未連線。')
      const id = crypto.randomUUID()
      const reply = await new Promise<Reply>((resolve, reject) => {
        const timer = setTimeout(() => { down('房主回覆逾時，正在重新連線。') }, 8000)
        inflight = { id, resolve, reject, timer }
        // The binary transport encodes undefined as null. Strip optional JSON fields before packing.
        const payload = JSON.parse(JSON.stringify({ id, body } satisfies PeerRequest)) as PeerRequest
        Promise.resolve(current.send(payload))
          .catch(() => down('傳送中斷，正在重新連線。'))
      })
      if (!reply.ok) throw new Error(reply.error ?? '房主未回覆。')
      return reply.ok
    })
    chain = task.catch(() => undefined)
    return task
  }

  function publish(view: View) {
    cursor = view.cursor
    localStorage.setItem(key + '-cursor', String(cursor))
    onView(view)
  }
  function down(label: string, again = true) {
    clearTimeout(retry)
    clearTimeout(deadline)
    clearInterval(poll)
    if (inflight) {
      clearTimeout(inflight.timer)
      inflight.reject(new Error(label))
      inflight = undefined
    }
    link = undefined
    const old = peer
    peer = undefined
    old?.destroy()
    if (!disposed) {
      onStatus(label, !again)
      if (again) retry = setTimeout(open, 3200)
    }
  }
  function open() {
    onStatus('正在連線至房主', false)
    try {
      const current = new Peer(peerOptions())
      peer = current
      deadline = setTimeout(() => down('連線逾時。請確認房主保持大廳開啟及網路設定。'), 14_000)
      current.on('error', () => { if (peer === current) down('無法找到房主或建立連線，稍後重試。') })
      current.on('open', () => {
        if (peer !== current) return
        const conn = current.connect(peerId(code), { reliable: true })
        link = conn
        conn.on('close', () => { if (link === conn) down('房主離線，世界暫停。正在重連。') })
        conn.on('error', () => { if (link === conn) down('資料通道中斷，正在重連。') })
        conn.on('data', data => {
          const reply = data as Reply
          if (!reply || !inflight || reply.id !== inflight.id) return
          const pending = inflight
          inflight = undefined
          clearTimeout(pending.timer)
          pending.resolve(reply)
        })
        conn.on('open', async () => {
          if (link !== conn) return
          clearTimeout(deadline)
          try {
            const hello = await request({ kind: 'hello', token: credentials, claim }) as Greeting
            if (claim) cursor = 0
            claim = undefined
            credentials = hello.token
            localStorage.setItem(key, credentials)
            const last = cursor
            const initial = await request({ kind: 'sync', after: last }) as View
            if (last && initial.unread) onGap(initial.unread)
            publish(initial)
            onStatus('已連線', false)
            poll = setInterval(() => {
              void request({ kind: 'sync', after: cursor }).then(result => publish(result as View))
                .catch(() => { if (link === conn) down('房主暫停，正在重連。') })
            }, 1400)
          } catch (error) {
            if (link === conn) down(error instanceof Error ? error.message : '加入失敗。', false)
          }
        })
      })
    } catch (error) {
      down(error instanceof Error ? error.message : '連線設定無效。', false)
    }
  }
  open()
  return {
    command: async (message: Message) => {
      const result = await request(message) as View | Entry[] | Pictures
      if ('world' in result) publish(result)
      return result
    },
    close: () => { disposed = true; down('已離線。', false) },
  }
}

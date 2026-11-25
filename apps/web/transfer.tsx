import { useEffect, useState } from 'react'
import type { Message } from '../../packages/shared/protocol.ts'
import type { View } from './network.ts'

type Ticket = { code: string, until: number }

/** A code in large type with the time it has left. */
export function TransferTicket({ ticket, room, whose }: { ticket: Ticket, room: string, whose: string }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const left = Math.max(0, Math.ceil((ticket.until - now) / 1000))
  if (!left) return <p className="hint" role="status">換設備碼已過期，請重新產生。</p>
  return <div className="transfer-ticket" role="status">
    <p>{whose}的換設備碼</p>
    <strong>{ticket.code}</strong>
    <p className="hint">在新設備開啟遊戲網頁，輸入房號 <b>{room}</b> 和這組碼。剩 {Math.floor(left / 60)} 分 {String(left % 60).padStart(2, '0')} 秒，只能用一次；換過去之後，原本的設備會自動登出。</p>
  </div>
}

/** For a player who still has their old device: move this character to another one. */
export function TransferPanel({ view, send, online }: { view: View, send: (msg: Message) => Promise<unknown>, online: boolean }) {
  const [asked, setAsked] = useState(false)
  return <details className="panel invites transfer">
    <summary>換設備</summary>
    <p className="hint">想改用別台手機或電腦，在這裡產生換設備碼。碼等於這個角色的鑰匙，不要給別人。</p>
    <div className="button-row"><button type="button" className="light" disabled={!online} onClick={() => { setAsked(true); void send({ kind: 'transfer' }).catch(() => {}) }}>
      {view.transfer ? '重新產生' : '產生換設備碼'}</button></div>
    {view.transfer ? <TransferTicket ticket={view.transfer} room={view.world.code} whose="你"/>
      : asked && <p className="hint" role="status">沒有可用的換設備碼。</p>}
  </details>
}

/** For the host: let a player whose old device is gone back in, and free seats taken by mistake. */
export function SeatPanel({ view, issue, remove, busy }: {
  view: View, issue: (id: string) => Promise<Ticket | undefined>, remove: (id: string) => void, busy: boolean,
}) {
  const [given, setGiven] = useState<{ id: string, ticket: Ticket }>()
  const [sure, setSure] = useState<string>()
  const guests = view.world.members.filter(m => !m.host)
  if (!guests.length) return null
  const name = (id: string) => guests.find(m => m.id === id)?.character?.name ?? '未創角的玩家'
  return <section className="subsection" aria-label="遠端玩家">
    <h3>遠端玩家</h3>
    <p className="hint">玩家換了設備、清掉瀏覽器資料時，替他產生換設備碼，親自交給本人。</p>
    <ul className="roster">{guests.map(m => {
      const loose = !view.world.started || m.pendingJoin
      return <li key={m.id}>
        <div><strong>{name(m.id)}</strong><div className="hint">{m.connected ? '在線' : '離線'}{m.pendingJoin ? ' · 還沒入隊' : ''}</div></div>
        <div className="button-row">
          <button type="button" className="light" disabled={busy} onClick={() => void issue(m.id).then(ticket => ticket && setGiven({ id: m.id, ticket }))}>換設備碼</button>
          {loose && (sure === m.id
            ? <button type="button" disabled={busy} onClick={() => { setSure(undefined); remove(m.id) }}>確定移除</button>
            : <button type="button" className="light" disabled={busy} onClick={() => setSure(m.id)}>移除</button>)}
        </div>
      </li>
    })}</ul>
    {given && guests.some(m => m.id === given.id) && <TransferTicket key={given.ticket.code} ticket={given.ticket} room={view.world.code} whose={name(given.id)}/>}
  </section>
}

import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { aiCategoryLabels, aiLabels } from '../../packages/shared/protocol.ts'
import type { AiStatus, Message } from '../../packages/shared/protocol.ts'
import type { Entry } from '../host/store.ts'
import { bridge, connect, hasSeat, initialRoom, inviteUrl, isLocal, localRpc, localStatus, setTurn } from './network.ts'
import type { Command, Entrance, LocalStatus, Pictures, View } from './network.ts'
import { Field, Lobby } from './lobby.tsx'
import { PortraitProvider } from './portrait.tsx'
import { clock } from './side.tsx'
import { Story } from './story.tsx'
import { SeatPanel, TransferPanel } from './transfer.tsx'
import './styles.css'

function Status({ ai }: { ai?: AiStatus }) {
  const state = ai?.state
  return <span className={'ai-status state-' + state}>
    <i aria-hidden="true"/> AI {state ? aiLabels[state] : '房主服務未連線'}{ai?.model ? ' · ' + ai.model : ''}
    {ai?.errorCategory && state !== 'passed' && state !== 'testing' ? '（' + aiCategoryLabels[ai.errorCategory] + '）' : ''}
  </span>
}

/** Why the host cannot open a room yet, or undefined when the AI gate is open. */
function roomBlock(ai?: AiStatus) {
  if (!ai) return '房主本機服務未連線。'
  if (ai.state === 'passed') return undefined
  if (ai.state === 'testing') return 'AI 連線測試中，請稍候。'
  if (ai.state === 'unconfigured') return '請先在「AI 連線設定」輸入 API，並按「測試連線並生成回覆」。'
  return 'AI 測試未通過：' + (ai.reason ?? '請重新測試。')
}

function Masthead({ ai, code, children }: { ai?: AiStatus, code?: string, children?: React.ReactNode }) {
  return <header className="masthead"><div className="shell mast-inner">
    <div><div className="wordmark">海賊王 AI RPG</div>{code && <div className="room-code">房間 {code}</div>}</div>
    <div className="mast-actions"><Status ai={ai}/>{children}</div>
  </div></header>
}

function AiForm({ disabled, onTest }: { disabled: boolean, onTest: (input: object) => Promise<void> }) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const apiKey = form.elements.namedItem('apiKey') as HTMLInputElement
    const key = String(data.get('apiKey')).trim()
    apiKey.value = ''
    await onTest({
      baseUrl: String(data.get('baseUrl')).trim(), model: String(data.get('model')).trim(),
      ...(key ? { apiKey: key } : {}),
    })
  }
  return <form className="panel ai-form" onSubmit={submit}>
    <h2>AI 連線設定</h2><p className="hint">OpenAI 相容 Chat Completions。測試會實際請模型生成一句回覆，通過後才能建立或開啟房間。</p>
    <Field label="API Base URL"><input name="baseUrl" type="url" placeholder="http://127.0.0.1:11434/v1" maxLength={500} required/></Field>
    <Field label="Model ID"><input name="model" required maxLength={180} placeholder="輸入服務支援的模型識別名稱"/></Field>
    <Field label="API Key（選填）"><input type="password" name="apiKey" autoComplete="off" maxLength={1024}/></Field>
    <button disabled={disabled} type="submit">測試連線並生成回覆</button>
  </form>
}

function RelaySettings() {
  const [result, setResult] = useState('')
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    try {
      setTurn({ urls: String(data.get('url')).trim(), username: String(data.get('user')).trim(), credential: String(data.get('credential')) })
      e.currentTarget.reset()
      setResult('已設定 TURN。請重新啟用遠端邀請，或重新連線。')
    } catch (error) { setResult((error as Error).message) }
  }
  return <details className="subsection">
    <summary>網路中繼（TURN）</summary>
    <form className="join" onSubmit={save}>
      <Field label="TURN URL"><input name="url" placeholder="turns:relay.example.org:5349" required/></Field>
      <Field label="TURN 使用者名稱"><input name="user" required/></Field>
      <Field label="TURN 密碼"><input type="password" name="credential" autoComplete="off" required/></Field>
      <div className="button-row">
        <button type="submit" className="light">設定中繼</button>
        <button type="button" className="light" onClick={() => { setTurn(); setResult('已清除 TURN 設定。') }}>清除中繼</button>
      </div>
      {result && <p role="status">{result}</p>}
    </form>
  </details>
}

function Host() {
  const [local, setLocal] = useState<LocalStatus>()
  const [view, setView] = useState<View>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [healthy, setHealthy] = useState(false)
  const [settings, setSettings] = useState(true)
  const [network, setNetwork] = useState('')
  const [inviting, setInviting] = useState(false)
  const [publicRoot, setPublicRoot] = useState(localStorage.getItem('tide-player-root') ?? import.meta.env.VITE_PUBLIC_ROOT ?? '')
  const [link, setLink] = useState('')
  const [inviteError, setInviteError] = useState('')
  const admin = local?.admin
  const code = view?.world.code
  const cursor = useRef(0)
  const gap = useRef(0)
  const ai = code ? view?.ai : local?.ai
  const blocked = roomBlock(healthy ? local?.ai : undefined)
  const generation = useRef(0)
  function publish(next: View) {
    cursor.current = next.cursor
    if (next.cursor) localStorage.setItem('tide-host-cursor-' + next.world.code, String(next.cursor))
    setView(next)
  }
  useEffect(() => {
    if (code) return
    let stopped = false
    async function refresh() {
      try {
        const status = await localStatus()
        if (!stopped) { setLocal(status); setHealthy(true) }
      } catch { if (!stopped) setHealthy(false) }
    }
    void refresh()
    const interval = setInterval(refresh, 1600)
    return () => { stopped = true; clearInterval(interval) }
  }, [code])
  useEffect(() => {
    if (!admin || !code) return
    let stopped = false
    let polling = false
    async function refresh() {
      if (polling) return
      polling = true
      const reading = generation.current
      try {
        const result = await localRpc<View>(admin!, { op: 'host', code, message: { kind: 'sync', after: cursor.current } })
        if (!stopped) {
          if (reading === generation.current) publish(result)
          setHealthy(true)
        }
      } catch {
        if (!stopped) setHealthy(false)
      } finally { polling = false }
    }
    void refresh()
    const interval = setInterval(refresh, 980)
    return () => { stopped = true; clearInterval(interval) }
  }, [admin, code])
  useEffect(() => {
    if (!admin || !code || !inviting) return
    setNetwork('正在啟用遠端邀請')
    try { return bridge(code, admin, setNetwork) }
    catch (e) { setNetwork((e as Error).message) }
  }, [admin, code, inviting])

  async function send(msg: Message) {
    if (!admin || !code) throw new Error('房主服務未連線。')
    setError('')
    try {
      generation.current++
      const result = await localRpc<View | Entry[] | Pictures>(admin, { op: 'host', code, message: msg })
      generation.current++
      if ('world' in result) publish(result)
      return result
    } catch (e) {
      setError((e as Error).message)
      throw e
    }
  }
  async function perform<T>(input: object, finish?: (result: T) => void) {
    if (!admin || busy) return
    setError('')
    setBusy(true)
    try {
      generation.current++
      const result = await localRpc<T>(admin, input)
      generation.current++
      finish?.(result)
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }
  function enter(room: View) {
    const last = Number(localStorage.getItem('tide-host-cursor-' + room.world.code)) || 0
    gap.current = last ? room.entries.filter(e => e.seq > last).length : 0
    publish(room)
    setSettings(false)
    setLink('')
    setInviteError('')
    setNetwork('')
    setInviting(true)
  }
  function leave() {
    setInviting(false)
    setView(undefined)
    setError('')
    setSettings(true)
  }
  async function copyInvite() {
    try {
      setInviteError('')
      const url = inviteUrl(code!, publicRoot.trim())
      setLink(url)
      localStorage.setItem('tide-player-root', publicRoot.trim())
      if (navigator.clipboard) await navigator.clipboard.writeText(url)
    } catch (e) { setInviteError((e as Error).message) }
  }
  const aiForm = <AiForm disabled={!healthy || busy} onTest={config => perform<AiStatus>({ op: 'configure', config }, status => {
    setLocal(current => current ? { ...current, ai: status } : current)
    setView(current => current ? { ...current, ai: status } : current)
  })}/>
  return <>
    <Masthead ai={healthy ? ai : undefined} code={code}>
      {healthy && ai?.state === 'testing' && admin && <button className="mast-button" onClick={() => {
        void localRpc(admin, { op: 'cancelProbe' }).catch(e => setError((e as Error).message))
      }}>取消 API 檢查</button>}
      {code && <button className="mast-button" onClick={() => setSettings(!settings)}>{settings ? '收起 AI 設定' : 'AI 連線設定'}</button>}
    </Masthead>
    <main className="shell page">
      {!code && <div className="page-heading"><h1>房主控制台</h1><p>建立 1～4 人房間，邀請玩家加入大廳。</p></div>}
      {code && view && !view.world.started && <div className="page-heading"><h1>遊戲大廳</h1><p>完成角色卡並確認共同背景，即可準備出發。</p></div>}
      {!healthy && <p className="notice warning" role="status">房主本機服務未連線。請確認服務正在執行{code ? '，並重新整理頁面' : ''}。</p>}
      {error && <p className="notice warning" role="alert">{error}</p>}
      {healthy && ai?.reason && ai.reason !== error && <p className="notice warning" role="status">{ai.reason}</p>}
      {settings && <div className={'lobby-grid setup' + (code ? '' : ' host-home')}>
        {aiForm}
        <section className="panel manifest">
          <h2>{code ? '本機存檔' : '建立房間'}</h2>
          {!code && <><p>{blocked ?? 'AI 已通過測試。建立 1～4 人房間，邀請玩家加入大廳。'}</p>
            <button disabled={!!blocked || busy} onClick={() => void perform<View>({ op: 'create' }, enter)}>建立房間</button></>}
          <div className="subsection">
            {!code && <><h3>繼續冒險</h3>{!local?.saves.length && <p className="hint">目前沒有存檔。</p>}
              <ul className="roster">{local?.saves.map(save => <li key={save.code}>
                <div><strong>{save.code}</strong><div className="hint">{save.started ? clock(save.minute) : '大廳'} · {save.count} 人</div></div>
                <button className="light" disabled={!!blocked || busy} onClick={() => void perform<View>({ op: 'open', code: save.code }, enter)}>開啟</button>
              </li>)}</ul></>}
            {!!local?.saves.length || code ? <button className="light" disabled={!healthy || busy} onClick={() => void perform<Blob>({ op: 'backup' }, blob => {
              const a = document.createElement('a')
              const url = URL.createObjectURL(blob)
              a.href = url
              a.download = 'tidebound-worlds.sqlite'
              a.click()
              setTimeout(() => URL.revokeObjectURL(url), 2000)
            })}>匯出 SQLite 備份</button> : null}
            {!code && <p><a href="#join">加入遠端房間</a></p>}
          </div>
        </section>
      </div>}
      {view && <PortraitProvider members={view.world.members} load={want => localRpc<Pictures>(admin!, { op: 'host', code, message: { kind: 'portraits', want } })}>
        <details className="panel invites">
          <summary>遠端邀請與房間設定</summary>
          <p role="status">{network || '遠端邀請已停用。'}</p>
          <Field label="遠端玩家網頁網址"><input type="url" placeholder="已發布的 GitHub Pages 網址" value={publicRoot} onChange={e => setPublicRoot(e.target.value)}/></Field>
          {!publicRoot && <p className="hint">未填網址時，邀請連結只能在這台電腦測試。遠端玩家也可以在已發布的頁面手動輸入房號。</p>}
          {inviteError && <p role="alert">{inviteError}</p>}
          {link && <Field label="邀請連結"><input readOnly value={link} onFocus={e => e.target.select()}/></Field>}
          <div className="button-row"><button className="light" onClick={() => void copyInvite()}>複製邀請連結</button>
            <button className="light" onClick={() => { setInviting(!inviting); if (inviting) setNetwork('') }}>{inviting ? '停用遠端邀請' : '啟用遠端邀請'}</button>
            <button className="light" onClick={leave}>回房主首頁</button></div>
          <SeatPanel view={view} busy={busy || !healthy}
            issue={id => new Promise(resolve => void perform<{ code: string, until: number }>({ op: 'transfer', code, id }, resolve).then(() => resolve(undefined)))}
            remove={id => void perform({ op: 'remove', code, id })}/>
          <RelaySettings/>
        </details>
        {view.world.started
          ? <Story key={code} view={view} send={async msg => { await send(msg) }} history={async before => await send({ kind: 'history', before }) as Entry[]} connected={healthy} gap={gap.current}
            review={(id, approved) => void perform({ op: 'review', code, id, approved })}/>
          : <Lobby key={code} view={view} send={async msg => { await send(msg) }} busy={busy || !healthy}
            review={(id, approved) => void perform({ op: 'review', code, id, approved })}
            start={() => void perform<View>({ op: 'start', code }, publish)}/>}
      </PortraitProvider>}
    </main>
  </>
}

function Guest() {
  const [room, setRoom] = useState(initialRoom)
  const [claim, setClaim] = useState('')
  // A browser that already has a seat walks straight in; anyone else says first whether they are new here.
  const [session, setSession] = useState<{ room: string, entrance: Entrance } | undefined>(() => initialRoom && hasSeat(initialRoom) ? { room: initialRoom, entrance: {} } : undefined)
  /** The seat this browser held is no longer valid. */
  const [refused, setRefused] = useState(false)
  const [view, setView] = useState<View>()
  const [status, setStatus] = useState('')
  const [gap, setGap] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const command = useRef<Command | undefined>(undefined)
  const online = status === '已連線'
  const connecting = !view && status === '正在連線至房主'
  const joining = !!view?.world.members.find(m => m.id === view.player)?.pendingJoin
  useEffect(() => {
    if (!session || !/^[A-F0-9]{10}$/.test(session.room)) return
    const link = connect(session.room, session.entrance, next => { setRefused(false); setClaim(''); setView(next) }, (label, final) => {
      setStatus(label)
      // The host turned this device away: back to the door, with the reason on it.
      if (final && label !== '已離線。') { setView(undefined); setRefused(label.includes('憑證')) }
    }, setGap)
    command.current = link.command
    return () => { command.current = undefined; link.close() }
  }, [session])
  async function send(msg: Message) {
    setError('')
    setBusy(true)
    try {
      if (!command.current) throw new Error('尚未連線。')
      return await command.current(msg)
    } catch (e) {
      setError((e as Error).message)
      throw e
    } finally { setBusy(false) }
  }
  function join(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setView(undefined)
    setError('')
    setGap(0)
    const wanted = room.trim().toUpperCase()
    setSession({ room: wanted, entrance: claim.trim() ? { claim: claim.trim() } : { fresh: refused || !hasSeat(wanted) } })
  }
  return <>
    <Masthead ai={online ? view?.ai : undefined} code={view?.world.code}/>
    <main className="shell page">
      {!view && <div className="page-heading"><h1>加入房間</h1><p>請向房主取得房號。同一個瀏覽器會直接回到原本的角色；換了設備請輸入換設備碼。</p></div>}
      {status && <p className={'notice ' + (online ? '' : 'warning')} role="status">{status}</p>}
      {error && <p className="notice warning" role="alert">{error}</p>}
      {!view && <form className="panel join" onSubmit={join}>
        <Field label="房號"><input value={room} onChange={e => setRoom(e.target.value)} pattern="[A-Fa-f0-9]{10}" autoComplete="off" maxLength={10} required/></Field>
        <Field label="換設備碼（已經有角色時才填）"><input value={claim} onChange={e => setClaim(e.target.value)} pattern="[A-Za-z0-9 \-]{8,12}" autoComplete="off" maxLength={12} placeholder="例如 ABCD-2345"/></Field>
        <p className="hint">第一次玩就留空。已經有角色，卻不填換設備碼就加入，會變成另一位新玩家。</p>
        <button disabled={connecting}>{claim.trim() ? '接回我的角色' : !refused && hasSeat(room.trim().toUpperCase()) ? '回到我的角色' : '以新玩家加入'}</button>
        {isLocal && <p><a href="#">回房主首頁</a></p>}
      </form>}
      {!view && <RelaySettings/>}
      {view && <TransferPanel view={view} send={send} online={online}/>}
      {view && <PortraitProvider members={view.world.members} load={want => command.current ? command.current({ kind: 'portraits', want }) as Promise<Pictures> : Promise.reject(new Error('尚未連線。'))}>
      {view.world.started && !joining && <Story view={view} send={async msg => { await send(msg) }} history={async before => await send({ kind: 'history', before }) as Entry[]} connected={online} gap={gap}/>}
      {(!view.world.started || joining) && <><div className="page-heading"><h1>{joining ? '加入進行中的冒險' : '遊戲大廳'}</h1>
        {joining && <p>故事已經開始。完成角色卡、確認共同背景並準備後，你會在隊伍所在的港口與大家會合。</p>}</div>
        <Lobby view={view} busy={busy || !online} send={async msg => { await send(msg) }}/></>}
      </PortraitProvider>}
    </main>
  </>
}

function App() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const change = () => setHash(location.hash)
    addEventListener('hashchange', change)
    return () => removeEventListener('hashchange', change)
  }, [])
  return !isLocal || hash.startsWith('#join') ? <Guest key={hash}/> : <Host/>
}

createRoot(document.getElementById('root')!).render(<App/>)

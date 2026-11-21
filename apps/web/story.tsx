import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { attributes, attributeLabels, locations, npcs } from '../../packages/shared/protocol.ts'
import type { Message } from '../../packages/shared/protocol.ts'
import { guideFor, maxHP, maxSTA, voteThreshold, xpToNext } from '../../packages/rules/engine.ts'
import { sceneQuestion } from '../../packages/world/explore.ts'
import { islandAt, islands } from '../../packages/world/sea.ts'
import { goods, npcsAt, party, people, shops, weaponItems, weaponNames } from '../../packages/world/village.ts'
import type { Good } from '../../packages/world/village.ts'
import type { View } from './network.ts'
import type { Entry } from '../host/store.ts'
import { Field } from './lobby.tsx'
import { WorldMap } from './world-map.tsx'
import { CombatPanel, Techniques } from './combat.tsx'
import { IslandAdventure, VoyagePanel } from './voyage.tsx'

const phaseText = { queued: '排隊中', interpret: 'AI 理解與規則驗證', narrate: '正式結果已存檔，旁白生成中' }
const entryText: Record<string, string> = { world: '世界', result: '正式結果', narrative: 'AI 旁白', input: '行動', chat: '玩家聊天', cancelled: '待辦', guide: '附近指引', location: '目前位置' }
const questText = { unoffered: '目前沒有進行中的委託。', offered: '潮汐簿失蹤了。可以向風車村港口的提奧接下委託。', active: '往科爾波山山道調查潮汐簿的去向。', recovered: '已找回潮汐簿，由持有人交給港口的提奧（也能先轉交給隊友）。', done: '潮汐簿已交還。', abandoned: '隊伍已擱置潮汐簿委託。' }
export const clock = (minutes: number) => '第 ' + (Math.floor(minutes / 1440) + 1) + ' 日 ' +
  String(Math.floor(minutes / 60) % 24).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0')

function Log({ entries }: { entries: Entry[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const latest = entries.at(-1)?.seq
  useEffect(() => {
    const box = ref.current
    if (box) box.scrollTop = box.scrollHeight
  }, [latest])
  return <div className="log" ref={ref} role="log" aria-live="polite">
    {!entries.length && <p className="hint">此窗目前沒有紀錄。</p>}
    {entries.map(entry => <article key={entry.seq} className={'entry entry-' + entry.type}>
      <header>{entryText[entry.type] ?? entry.type}<time>{clock(entry.minute)}</time></header>
      <p>{entry.text}</p>
    </article>)}
  </div>
}

export function Story({ view, send, history, connected, gap, review }: {
  view: View, send: (msg: Message) => Promise<void>,
  history: (before: number) => Promise<Entry[]>, connected: boolean, gap: number,
  review?: (id: string, approved: boolean) => void,
}) {
  const { world, player } = view
  const crew = party(world)
  const joining = world.members.filter(m => m.pendingJoin)
  const [draft, setDraft] = useState('')
  const [chat, setChat] = useState(false)
  const [sending, setSending] = useState(false)
  const [tab, setTab] = useState('world')
  const [past, setPast] = useState<Entry[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [title, setTitle] = useState('')
  const [proposalType, setProposalType] = useState<'ordinary' | 'formCrew' | 'sellShip'>('ordinary')
  const retryId = useRef<{ id: string, text: string, chat: boolean } | undefined>(undefined)
  const actionField = useRef<HTMLTextAreaElement>(null)
  const me = world.members.find(member => member.id === player)!
  const character = me.character!
  const current = view.pending.find(job => job.actor === player)
  const paused = !connected || !view.hostOnline || view.phase === 'paused'
  const entries = [...new Map([...past, ...view.entries].map(row => [row.seq, row])).values()].sort((a, b) => a.seq - b.seq)
  const post = (msg: Message) => { void send(msg).catch(() => {}) }
  const location = locations[character.place]
  const visibleNpcs = npcsAt(world, character.place)
  const combat = world.combat?.participants.includes(player) ? world.combat : undefined
  const askedForDirections = entries.findLast(entry => entry.actor === player)?.type === 'guide'
  const suggestions = askedForDirections ? guideFor(world, me).suggestions : []
  const disabled = !connected || sending ||
    (!chat && !sceneQuestion(draft) && (!!current || paused || !!combat?.locked.includes(player)))
  function suggest(text: string) {
    setDraft(text)
    setChat(false)
    actionField.current?.focus()
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || disabled) return
    setSending(true)
    const previous = retryId.current
    const id = previous?.text === text && previous?.chat === chat ? previous.id : crypto.randomUUID()
    retryId.current = { id, text, chat }
    try {
      await send(chat ? { kind: 'chat', id, text } : { kind: 'act', id, version: world.version, text })
      setDraft(currentText => currentText === draft ? '' : currentText)
      retryId.current = undefined
      setTab(player)
    } catch { /* The shell displays the error and the draft stays editable. */ }
    finally { setSending(false) }
  }
  return <>
    <div className="voyage-bar"><strong>{islands[islandAt(character.place)].name}</strong><span>{location}</span><span>{clock(world.minute)}</span><span>版本 {world.version} 已存至房主</span></div>
    {paused && <p role="status" className="notice warning">
      {!connected || !view.hostOnline ? '房主離線，世界暫停。' : 'AI 暫停，待處理行動已保留。'}</p>}
    {gap > 0 && <section className="notice" aria-label="重連摘要">
      <p>重連摘要 · 離線期間新增 {gap} 筆公開紀錄。</p>
      <ul>{view.entries.slice(-gap).filter(entry => ['world', 'result'].includes(entry.type)).slice(-3).map(entry =>
        <li key={entry.seq}>{entry.text}</li>)}</ul>
    </section>}
    {combat && <CombatPanel combat={combat} character={character} player={player} suggest={suggest}/>}
    <nav className="mobile-tabs" aria-label="切換紀錄">
      {[['world', '地圖與公告'], ...crew.map(m => [m.id, m.character?.name ?? '玩家']), ['status', '狀態']].map(([id, label]) =>
        <button key={id} type="button" className="light" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}
    </nav>
    <div className="story-grid">
      <div className="logs">
        <WorldMap world={world} player={player} hideOnMobile={tab !== 'world'} onTravel={place => {
          suggest('前往' + locations[place])
          setTab(player)
        }} onCourse={island => {
          suggest('選擇航線 ' + islands[island].name + ' 穩健')
          setTab(player)
        }}/>
        <section className={'panel world-log ' + (tab !== 'world' ? 'mobile-hide' : '')}>
          <h2>世界公告</h2><Log entries={entries.filter(e => e.actor === null)}/>
        </section>
        <div className="personal-grid">
          {crew.map(member => <section key={member.id} className={'panel personal ' + (tab !== member.id ? 'mobile-hide' : '')}>
            <div className="section-head"><h2>{member.character?.name}</h2><span>{member.id === player ? '你' : member.connected ? '在線' : '離線'}</span></div>
            <Log entries={entries.filter(e => e.actor === member.id)}/>
          </section>)}
        </div>
        {connected && hasMore && entries.length >= 60 && <button className="light older" onClick={async () => {
          try {
            const rows = await history(entries[0].seq)
            setPast(previous => [...rows, ...previous])
            setHasMore(rows.length === 60)
          } catch { /* The shell shows the failed request. */ }
        }}>載入較早紀錄</button>}
        <form className="panel composer" onSubmit={submit}>
          <div className="section-head"><h2>{chat ? '玩家聊天' : '你的行動'}</h2>
            <label className="check"><input type="checkbox" checked={chat} onChange={e => setChat(e.target.checked)}/> 聊天模式</label></div>
          {!chat && <div className="action-suggestions">
            <p>你在<strong>{location}</strong>。{character.conversingWith && '你正和' + npcs[character.conversingWith] + '交談。'}</p>
            <div className="button-row">
              <button type="button" className="light" onClick={() => suggest('我能去哪裡？')}>問附近能做什麼</button>
              {suggestions.map(text => <button key={text} type="button" className="light" onClick={() => suggest(text)}>{text}</button>)}
            </div>
          </div>}
          <label className="sr-only" htmlFor="action">輸入行動或聊天</label>
          <textarea ref={actionField} id="action" rows={3} maxLength={chat ? 500 : 1000} value={draft} onChange={e => setDraft(e.target.value)}
            placeholder={chat ? '對同房玩家說些什麼' : '用自己的話描述想去哪裡、想和誰談話或打算做什麼'}/>
          <div className="button-row"><button disabled={disabled || !draft.trim()}>{chat ? '送出聊天' : '送出行動'}</button>
            {current && <button type="button" className="light" disabled={!connected} onClick={() => post({ kind: 'cancel', id: current.id })}>
              {current.phase === 'narrate' ? '停止旁白' : '取消行動'}
            </button>}
          </div>
          <p className="hint" role="status">{current ? phaseText[current.phase as keyof typeof phaseText] : draft ? '草稿' : '每次可提交一項正式行動。'}</p>
        </form>
        <VoyagePanel world={world} player={player} suggest={suggest}/>
        <IslandAdventure world={world} player={player} suggest={suggest}/>
      </div>
      <aside className={'panel details ' + (tab !== 'status' ? 'mobile-hide' : '')}>
        <h2>{character.name}</h2>
        <p className="hint">{character.race} · 等級 {character.level} · XP {character.xp}／{xpToNext(character.level)}</p>
        <dl className="values">
          <div><dt>HP</dt><dd>{character.hp}／{maxHP(character)}</dd></div>
          <div><dt>STA</dt><dd>{character.sta}／{maxSTA(character)}</dd></div>
          <div><dt>貝里</dt><dd>{character.money.toLocaleString('zh-TW')}</dd></div>
        </dl>
        {character.unspent > 0 && <section className="subsection" aria-label="自由屬性點">
          <h3>可分配屬性點 {character.unspent}</h3>
          <div className="button-row">{attributes.map(k =>
            <button key={k} type="button" className="light" disabled={paused || !!combat} onClick={() => post({ kind: 'allocate', attr: k })}>
              {attributeLabels[k]} {character.stats[k]} ＋1</button>)}</div>
        </section>}
        <details><summary>屬性與技能</summary><p>{attributes.map(k => attributeLabels[k] + ' ' + character.stats[k]).join(' · ')}</p>
          <p>{Object.entries(character.skillRanks).map(([skill, value]) => skill + ' ' + value).join(' · ')}</p></details>
        <dl className="values">
          <div><dt>懸賞金</dt><dd>{character.bounty.toLocaleString('en-US')}</dd></div>
          <div><dt>海軍注意度</dt><dd>{world.renown?.marineHeat ?? 0}／100</dd></div>
          <div><dt>本島聲望</dt><dd>{world.renown?.islandRep[islandAt(character.place)] ?? 0}</dd></div>
        </dl>
        <Techniques character={character} post={post} disabled={paused}/>
        <details open><summary>背包與裝備</summary>
          <p>目前武器：{weaponNames[character.weapon]}</p>
          <ul>{Object.entries(character.inventory).filter(([, count]) => count > 0).map(([item, count]) =>
            <li key={item}>{item} × {count}</li>)}</ul>
          <div className="button-row">
            {(Object.keys(weaponItems) as (keyof typeof weaponItems)[]).filter(id => id !== character.weapon && character.inventory[weaponItems[id]])
              .map(id => <button key={id} type="button" className="light" onClick={() => suggest('改用' + weaponItems[id])}>改用{weaponItems[id]}</button>)}
            {character.weapon !== 'fist' && <button type="button" className="light" onClick={() => suggest('收起武器')}>改為徒手</button>}
          </div>
          {crew.some(m => m.id !== player && m.character!.place === character.place) &&
            <p className="hint">同地的隊友可以轉交物品或貝里，例如「把繃帶交給隊友名字」或「給隊友名字 100 貝里」。</p>}
        </details>
        <section className="subsection"><h3>目前地點</h3><p>{location}</p>
          {visibleNpcs.length > 0 && <p>{visibleNpcs.map(id => npcs[id] + '（' + people[id].role + '）').join('、')}</p>}
          {shops[character.place] && <details><summary>{shops[character.place]}</summary><ul>{(Object.keys(goods) as Good[])
            .filter(id => goods[id].shop === character.place).map(id =>
              <li key={id}>{goods[id].label} · {goods[id].price} 貝里 · 剩 {world.stock[id]}</li>)}</ul></details>}
        </section>
        {review && joining.length > 0 && <section className="subsection"><h3>加入中的玩家</h3>
          <ul className="roster">{joining.map(m => <li key={m.id}>
            <div><strong>{m.character?.name ?? '未創角'}</strong>
              <div className="hint">{!m.connected ? '離線' : !m.character ? '創角中' : !m.approved ? '等待角色審核' : '等待確認背景並準備'}</div></div>
            {m.character && !m.approved && <button className="light" onClick={() => review(m.id, true)}>核准</button>}
          </li>)}</ul>
        </section>}
        <section className="subsection"><h3>任務日誌</h3><p>{questText[world.quest]}</p></section>
        <section className="subsection"><h3>團隊決議</h3>
          <p>{world.crew ? '船團已成立' : '尚未成立船團'} · {world.ship ? '主船迎潮號' : '尚無主船'}</p>
          <form onSubmit={e => { e.preventDefault(); post({ kind: 'propose', type: proposalType, title }); setTitle('') }}>
            <Field label="提案類型"><select value={proposalType} onChange={e => setProposalType(e.target.value as typeof proposalType)}>
              <option value="ordinary">一般決議</option><option value="formCrew" disabled={world.crew}>成立船團</option>
              <option value="sellShip" disabled={!world.ship || world.ship.borrowed}>出售主船</option>
            </select></Field>
            <Field label="提案名稱"><input required maxLength={60} value={title} onChange={e => setTitle(e.target.value)}/></Field>
            <button type="submit" className="light" disabled={paused}>提出決議</button>
          </form>
          {world.proposals.map(p => <div className="proposal" key={p.id}><strong>{p.title}</strong>
            <p>{crew.filter(m => p.votes[m.id]).length}／{voteThreshold(crew.length, p.type !== 'ordinary')} 贊成 · {p.passed ? '已通過' : '投票中'}</p>
            {!p.passed && <div className="button-row">
              <button className="light" aria-pressed={p.votes[player] === true} disabled={paused} onClick={() => post({ kind: 'vote', id: p.id, yes: true })}>贊成</button>
              <button className="light" aria-pressed={p.votes[player] === false} disabled={paused} onClick={() => post({ kind: 'vote', id: p.id, yes: false })}>反對</button>
            </div>}
          </div>)}
        </section>
      </aside>
    </div>
  </>
}

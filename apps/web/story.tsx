import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { attributes, attributeLabels, locations, npcs } from '../../packages/shared/protocol.ts'
import type { Message } from '../../packages/shared/protocol.ts'
import { guideFor, maxHP, maxSTA, voteThreshold, xpToNext } from '../../packages/rules/engine.ts'
import { sceneQuestion } from '../../packages/world/explore.ts'
import { boatYard, islandAt, islands } from '../../packages/world/sea.ts'
import { forges, weaponLabel } from '../../packages/world/forge.ts'
import { canonTimeline } from '../../packages/world/canon.ts'
import { goods, npcsAt, party, people, shops, weaponItems, weaponNames } from '../../packages/world/village.ts'
import type { Good } from '../../packages/world/village.ts'
import type { View } from './network.ts'
import type { Entry } from '../host/store.ts'
import { Field } from './lobby.tsx'
import { WorldMap } from './world-map.tsx'
import { CombatPanel, Techniques } from './combat.tsx'
import { IslandAdventure, VoyagePanel } from './voyage.tsx'
import { CompanionPanel } from './companions.tsx'
import { FruitPanel } from './fruit.tsx'
import { RecoveryPanel } from './recovery.tsx'
import { CalendarPanel } from './calendar.tsx'

const phaseText = { queued: '排隊中', interpret: 'AI 理解與規則驗證中', narrate: '結果已存檔，旁白生成中' }
// Only entry kinds that need explaining get a tag; results, narration and the player's own input speak for themselves.
const entryTag: Record<string, string> = { world: '世界', chat: '聊天', cancelled: '取消', guide: '指引', location: '位置' }
export const clock = (minutes: number) => '第 ' + (Math.floor(minutes / 1440) + 1) + ' 日 ' +
  String(Math.floor(minutes / 60) % 24).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0')

type Side = 'map' | 'me' | 'bag' | 'crew' | 'news'
const sideTabs: [Side, string][] = [['map', '地圖'], ['me', '角色'], ['bag', '背包'], ['crew', '船團'], ['news', '消息']]

function Log({ entries, names, draft }: { entries: Entry[], names: Record<string, string>, draft?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const latest = entries.at(-1)?.seq
  useEffect(() => {
    const box = ref.current
    if (box) box.scrollTop = box.scrollHeight
  }, [latest, draft])
  return <div className="log" ref={ref} role="log" aria-live="polite">
    {!entries.length && <p className="hint empty">這裡還沒有紀錄。</p>}
    {entries.map(entry => <article key={entry.seq} className={'entry entry-' + entry.type}>
      <header>
        <span>{entry.type === 'input' ? (entry.actor ? names[entry.actor] ?? '玩家' : '') + ' ▸' : entryTag[entry.type] ?? ''}</span>
        <time>{clock(entry.minute)}</time>
      </header>
      <p>{entry.text}</p>
    </article>)}
    {draft && <article className="entry entry-narrative entry-draft" aria-busy="true">
      <header><span>旁白撰寫中</span></header>
      <p>{draft}</p>
    </article>}
  </div>
}

/** A labelled bar for HP / STA in the status strip. */
function Meter({ label, value, max, tone }: { label: string, value: number, max: number, tone: string }) {
  return <div className={'meter meter-' + tone} title={label + ' ' + value + '／' + max}>
    <span>{label}</span>
    <div className="meter-track"><div className="meter-fill" style={{ width: Math.max(0, Math.min(100, value / max * 100)) + '%' }}/></div>
    <strong>{value}／{max}</strong>
  </div>
}

function Tab({ selected, badge, onClick, children }: { selected: boolean, badge?: number | boolean, onClick: () => void, children: ReactNode }) {
  return <button type="button" role="tab" aria-selected={selected} className="tab" onClick={onClick}>
    {children}{badge ? <span className="badge" aria-label="有新內容">{typeof badge === 'number' ? badge : ''}</span> : null}
  </button>
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
  // Desktop: the side panel's tab. Phone: 'story' or one of the side tabs fills the screen.
  const [side, setSide] = useState<Side>('map')
  const [screen, setScreen] = useState<'story' | Side>('story')
  const [windowId, setWindowId] = useState(player)
  const [seen, setSeen] = useState<Record<string, number>>({})
  const [showGap, setShowGap] = useState(gap > 0)
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
  const names = Object.fromEntries(crew.map(m => [m.id, m.character!.name]))

  // Spec §5.1: the world bulletin is its own always-visible window on top; each player's window below holds their own lines.
  const windowEntries = (id: string) => id === 'world' ? entries.filter(e => e.actor === null) : entries.filter(e => e.actor === id)
  const windows: [string, string][] = [[player, character.name + '（你）'],
    ...crew.filter(m => m.id !== player).map(m => [m.id, m.character!.name + (m.connected ? '' : '・離線')] as [string, string])]
  const latestIn = (id: string) => windowEntries(id).at(-1)?.seq ?? 0
  const unread = (id: string) => id === windowId ? 0 : windowEntries(id).filter(e => e.seq > (seen[id] ?? 0)).length
  useEffect(() => {
    const latest = latestIn(windowId)
    if (latest > (seen[windowId] ?? 0)) setSeen(previous => ({ ...previous, [windowId]: latest }))
  })

  const openVotes = world.proposals.filter(p => !p.passed && p.votes[player] === undefined).length
  const liveScenes = canonTimeline.filter(event => world.phases?.[event.id + ':scene'] !== undefined && !world.timeline?.[event.id]).length
  const fruitWaiting = (world.fruitOffers ?? []).some(offer => offer.to === player)
  const sideBadge: Record<Side, number | boolean> = {
    map: false, me: character.unspent, bag: fruitWaiting,
    crew: openVotes + (review ? joining.filter(m => m.character && !m.approved).length : 0), news: liveScenes,
  }

  function suggest(text: string) {
    setDraft(text)
    setChat(false)
    setScreen('story')
    actionField.current?.focus()
  }
  function pickSide(id: Side) {
    setSide(id)
    setScreen(id)
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
      setWindowId(player)
    } catch { /* The shell displays the error and the draft stays editable. */ }
    finally { setSending(false) }
  }

  const panels: Record<Side, ReactNode> = {
    map: <>
      <WorldMap world={world} player={player} hideOnMobile={false} onTravel={place => suggest('前往' + locations[place])}
        onCourse={island => suggest('選擇航線 ' + islands[island].name + ' 穩健')}/>
      <section className="subsection"><h3>這裡</h3>
        <p>{location}</p>
        {visibleNpcs.length > 0 && <ul className="chips">{visibleNpcs.map(id =>
          <li key={id}><button type="button" className="chip" onClick={() => suggest('找' + npcs[id] + '聊聊')}>{npcs[id]}<small>{people[id].role}</small></button></li>)}</ul>}
        {shops[character.place] && <details><summary>{shops[character.place]}</summary><ul className="plain">{(Object.keys(goods) as Good[])
          .filter(id => goods[id].shop === character.place).map(id =>
            <li key={id}><button type="button" className="link" onClick={() => suggest('買' + goods[id].label)}>{goods[id].label}</button> · {goods[id].price} 貝里 · 剩 {world.stock[id]}</li>)}</ul></details>}
      </section>
      <IslandAdventure world={world} player={player} suggest={suggest}/>
      <VoyagePanel world={world} player={player} suggest={suggest}/>
    </>,
    me: <>
      <section className="subsection first"><h3>{character.name}</h3>
        <p className="hint">{character.race} · 等級 {character.level} · XP {character.xp}／{xpToNext(character.level)}</p>
        <dl className="values">
          <div><dt>懸賞金</dt><dd>{character.bounty.toLocaleString('en-US')}</dd></div>
          <div><dt>海軍注意度</dt><dd>{world.renown?.marineHeat ?? 0}／100</dd></div>
          <div><dt>本島聲望</dt><dd>{world.renown?.islandRep[islandAt(character.place)] ?? 0}</dd></div>
        </dl>
      </section>
      {character.unspent > 0 && <section className="subsection callout" aria-label="自由屬性點">
        <h3>可分配屬性點 {character.unspent}</h3>
        <div className="button-row">{attributes.map(k =>
          <button key={k} type="button" className="light" disabled={paused || !!combat} onClick={() => post({ kind: 'allocate', attr: k })}>
            {attributeLabels[k]} {character.stats[k]} ＋1</button>)}</div>
      </section>}
      <section className="subsection"><h3>屬性與技能</h3>
        <dl className="stat-list">{attributes.map(k => <div key={k}><dt>{attributeLabels[k]}</dt><dd>{character.stats[k]}</dd></div>)}</dl>
        <p className="hint">{Object.entries(character.skillRanks).map(([skill, value]) => skill + ' ' + value).join(' · ')}</p>
      </section>
      <section className="subsection"><Techniques character={character} post={post} disabled={paused}/></section>
      <FruitPanel world={world} player={player} suggest={suggest}/>
    </>,
    bag: <>
      <section className="subsection first"><h3>裝備</h3>
        <p>目前武器：{weaponLabel(character, weaponNames[character.weapon])}</p>
        <div className="button-row">
          {(Object.keys(weaponItems) as (keyof typeof weaponItems)[]).filter(id => id !== character.weapon && character.inventory[weaponItems[id]])
            .map(id => <button key={id} type="button" className="light" onClick={() => suggest('改用' + weaponItems[id])}>改用{weaponItems[id]}</button>)}
          {character.weapon !== 'fist' && <button type="button" className="light" onClick={() => suggest('收起武器')}>改為徒手</button>}
          {forges[character.place] && <button type="button" className="light" onClick={() => suggest('強化武器')}>強化武器</button>}
        </div>
      </section>
      <section className="subsection"><h3>背包</h3>
        <ul className="plain">{Object.entries(character.inventory).filter(([, count]) => count > 0).map(([item, count]) =>
          <li key={item}>{item} × {count}</li>)}</ul>
        {!!character.inventory['傷藥'] && <div className="button-row"><button type="button" className="light" onClick={() => suggest('喝傷藥')}>喝傷藥</button></div>}
        {crew.some(m => m.id !== player && m.character!.place === character.place) &&
          <p className="hint">同地的隊友可以轉交物品或貝里，例如「把繃帶交給隊友名字」或「給隊友名字 100 貝里」。</p>}
      </section>
      <RecoveryPanel world={world} player={player} suggest={suggest}/>
    </>,
    crew: <>
      {review && joining.length > 0 && <section className="subsection callout"><h3>加入中的玩家</h3>
        <ul className="roster">{joining.map(m => <li key={m.id}>
          <div><strong>{m.character?.name ?? '未創角'}</strong>
            <div className="hint">{!m.connected ? '離線' : !m.character ? '創角中' : !m.approved ? '等待角色審核' : '等待確認背景並準備'}</div></div>
          {m.character && !m.approved && <button className="light" onClick={() => review(m.id, true)}>核准</button>}
        </li>)}</ul>
      </section>}
      <CompanionPanel world={world} player={player} suggest={suggest}/>
      <section className="subsection"><h3>團隊決議</h3>
        <p className="hint">{world.crew ? '船團已成立' : '尚未成立船團'} · {world.ship ? '主船' + boatYard.name : '尚無主船'}</p>
        {world.proposals.filter(p => !p.passed).map(p => <div className="proposal" key={p.id}><strong>{p.title}</strong>
          <p className="hint">{crew.filter(m => p.votes[m.id]).length}／{voteThreshold(crew.length, p.type !== 'ordinary')} 贊成</p>
          <div className="button-row">
            <button className="light" aria-pressed={p.votes[player] === true} disabled={paused} onClick={() => post({ kind: 'vote', id: p.id, yes: true })}>贊成</button>
            <button className="light" aria-pressed={p.votes[player] === false} disabled={paused} onClick={() => post({ kind: 'vote', id: p.id, yes: false })}>反對</button>
          </div>
        </div>)}
        <details><summary>提出新決議</summary>
          <form onSubmit={e => { e.preventDefault(); post({ kind: 'propose', type: proposalType, title }); setTitle('') }}>
            <Field label="提案類型"><select value={proposalType} onChange={e => setProposalType(e.target.value as typeof proposalType)}>
              <option value="ordinary">一般決議</option><option value="formCrew" disabled={world.crew}>成立船團</option>
              <option value="sellShip" disabled={!world.ship}>出售主船</option>
            </select></Field>
            <Field label="提案名稱"><input required maxLength={60} value={title} onChange={e => setTitle(e.target.value)}/></Field>
            <button type="submit" className="light" disabled={paused}>提出決議</button>
          </form>
        </details>
        {world.proposals.some(p => p.passed) && <details><summary>已通過的決議</summary>
          <ul className="plain">{world.proposals.filter(p => p.passed).map(p => <li key={p.id}>{p.title}</li>)}</ul></details>}
      </section>
    </>,
    news: <>
      {showGap && <section className="subsection first callout" aria-label="重連摘要">
        <h3>離線期間</h3>
        <p className="hint">新增 {gap} 筆公開紀錄。</p>
        <ul className="plain">{view.entries.slice(-gap).filter(entry => ['world', 'result'].includes(entry.type)).slice(-3).map(entry =>
          <li key={entry.seq}>{entry.text}</li>)}</ul>
        <button type="button" className="light" onClick={() => setShowGap(false)}>知道了</button>
      </section>}
      <CalendarPanel world={world}/>
    </>,
  }

  return <div className={'game screen-' + screen}>
    <header className="hud voyage-bar" aria-label="角色狀態">
      <div className="hud-place"><strong>{islands[islandAt(character.place)].name}</strong><span>{location}</span><span>{clock(world.minute)}</span></div>
      <div className="hud-stats">
        <Meter label="HP" value={character.hp} max={maxHP(character)} tone="hp"/>
        <Meter label="STA" value={character.sta} max={maxSTA(character)} tone="sta"/>
        <span className="hud-money">{character.money.toLocaleString('zh-TW')} 貝里</span>
      </div>
    </header>
    {paused && <p role="status" className="notice warning">
      {!connected || !view.hostOnline ? '房主離線，世界暫停。' : 'AI 暫停，待處理行動已保留。'}</p>}
    {showGap && <p className="notice">你離線期間有 {gap} 筆新紀錄。<button type="button" className="link" onClick={() => pickSide('news')}>看摘要</button></p>}

    <nav className="screen-tabs" role="tablist" aria-label="切換畫面">
      <Tab selected={screen === 'story'} onClick={() => setScreen('story')}
        badge={windows.reduce((sum, [id]) => sum + unread(id), 0)}>故事</Tab>
      {sideTabs.map(([id, label]) => <Tab key={id} selected={screen === id} badge={sideBadge[id]} onClick={() => pickSide(id)}>{label}</Tab>)}
    </nav>

    <div className="game-grid">
      <main className="story-column">
        <section className="bulletin world-log" aria-label="世界公告">
          <h2>世界公告</h2>
          <Log entries={windowEntries('world')} names={names}/>
        </section>
        {/* Teammates' windows are a tab away; playing alone there is nothing to switch. */}
        {windows.length > 1 && <div className="window-tabs" role="tablist" aria-label="切換視窗">
          {windows.map(([id, label]) => <Tab key={id} selected={windowId === id} badge={unread(id)} onClick={() => setWindowId(id)}>{label}</Tab>)}
        </div>}
        <div className="windows">
          {crew.map(member => <section key={member.id} className={'window personal' + (windowId === member.id ? '' : ' window-hidden')}
            aria-label={member.character!.name + '的視窗'}>
            <h2 className="sr-only">{member.character!.name}{member.id === player ? '（你）' : member.connected ? '' : '・離線'}</h2>
            <Log entries={windowEntries(member.id)} names={names} draft={view.pending.find(job => job.actor === member.id)?.draft}/>
          </section>)}
          {connected && hasMore && entries.length >= 60 && <button className="light older" onClick={async () => {
            try {
              const rows = await history(entries[0].seq)
              setPast(previous => [...rows, ...previous])
              setHasMore(rows.length === 60)
            } catch { /* The shell shows the failed request. */ }
          }}>載入較早紀錄</button>}
        </div>

        {combat && <CombatPanel combat={combat} character={character} player={player} suggest={suggest}/>}
        <form className="composer" onSubmit={submit}>
          {!chat && !combat && <div className="action-suggestions">
            <p className="hint">你在<strong>{location}</strong>。{character.conversingWith && '你正和' + npcs[character.conversingWith] + '交談。'}</p>
            <div className="chips-row">
              <button type="button" className="chip" onClick={() => suggest('我能去哪裡？')}>問附近能做什麼</button>
              {suggestions.map(text => <button key={text} type="button" className="chip" onClick={() => suggest(text)}>{text}</button>)}
            </div>
          </div>}
          <label className="sr-only" htmlFor="action">輸入行動或聊天</label>
          <div className="composer-row">
            <textarea ref={actionField} id="action" rows={2} maxLength={chat ? 500 : 1000} value={draft} onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit() }}
              placeholder={chat ? '對同房玩家說些什麼' : '用自己的話描述想去哪裡、找誰或做什麼（Ctrl＋Enter 送出）'}/>
            <div className="composer-actions">
              <button disabled={disabled || !draft.trim()}>{chat ? '送出聊天' : '送出行動'}</button>
              {current && <button type="button" className="light" disabled={!connected} onClick={() => post({ kind: 'cancel', id: current.id })}>
                {current.phase === 'narrate' ? '停止旁白' : '取消行動'}
              </button>}
            </div>
          </div>
          <div className="composer-foot">
            <label className="check"><input type="checkbox" checked={chat} onChange={e => setChat(e.target.checked)}/> 聊天模式</label>
            <p className="hint" role="status">{current ? phaseText[current.phase as keyof typeof phaseText] : draft ? '草稿' : '每次可提交一項正式行動。'}</p>
          </div>
        </form>
      </main>

      <aside className="side-column details" aria-label="資訊面板">
        <div className="side-tabs" role="tablist" aria-label="資訊分頁">
          {sideTabs.map(([id, label]) => <Tab key={id} selected={side === id} badge={sideBadge[id]} onClick={() => pickSide(id)}>{label}</Tab>)}
        </div>
        <div className="side-body">{panels[side]}</div>
      </aside>
    </div>
  </div>
}

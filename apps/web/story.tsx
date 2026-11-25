import { useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { locations, npcs } from '../../packages/shared/protocol.ts'
import type { Message } from '../../packages/shared/protocol.ts'
import { guideFor, maxHP, maxSTA } from '../../packages/rules/engine.ts'
import { sceneQuestion } from '../../packages/world/explore.ts'
import { islandAt, islands, paceNames, selectedRoute } from '../../packages/world/sea.ts'
import { canonTimeline } from '../../packages/world/canon.ts'
import { party } from '../../packages/world/village.ts'
import type { View } from './network.ts'
import type { Entry } from '../host/store.ts'
import { IslandMap, SeaMap } from './world-map.tsx'
import { HerePanel } from './here.tsx'
import { CombatPanel } from './combat.tsx'
import { IslandAdventure, VoyagePanel } from './voyage.tsx'
import { CharacterPanel } from './character.tsx'
import { BagPanel } from './bag.tsx'
import { CompanionPanel } from './companions.tsx'
import { DecisionsPanel } from './decisions.tsx'
import { FruitStalls } from './fruit.tsx'
import { CalendarPanel } from './calendar.tsx'
import { LuffyPanel } from './luffy.tsx'
import { ShipPanel } from './ship.tsx'
import { DiceTray } from './dice.tsx'
import { FightTray } from './fight-tray.tsx'
import type { Vital } from './fight-tray.tsx'
import { lineUp, pickStrikes, strikesIn } from '../../packages/world/strikes.ts'
import { companionIds, companionMaxHp } from '../../packages/world/companions.ts'
import { diceIn } from '../../packages/shared/dice.ts'
import { partLevel } from '../../packages/world/ships.ts'
import { VoiceBar, VoiceSettingsPanel, VoiceSwitch } from './voice-panel.tsx'
import { useNarrator } from './voice.ts'
import { MemberAvatar, PortraitPicker, usePortraits } from './portrait.tsx'
import { WarPanel } from './war.tsx'
import { SagaPanel } from './saga.tsx'
import { MarketPanel } from './market.tsx'
import { Icon } from './icons.tsx'
import type { IconName } from './icons.tsx'
import { Card, clock, Row, Rows, Segments, useSegment } from './side.tsx'

const phaseText = { queued: '排隊中', interpret: 'AI 理解與規則驗證中', narrate: '結果已存檔，旁白生成中' }
// Only entry kinds that need explaining get a tag; results, narration and the player's own input speak for themselves.
const entryTag: Record<string, string> = { world: '世界', chat: '聊天', cancelled: '取消', guide: '指引', location: '位置' }

type Side = 'map' | 'me' | 'bag' | 'crew' | 'news' | 'luffy'
const sideTabs: [Side, string][] = [['map', '地圖'], ['me', '角色'], ['bag', '背包'], ['crew', '船團'], ['news', '消息'], ['luffy', npcs.luffy]]

/** Entry kinds the storyteller can read. */
const readable = new Set(['narrative', 'world', 'result'])

function Log({ entries, names, draft, speaking, onPlay }: {
  entries: Entry[], names: Record<string, string>, draft?: string, /** The entry being read aloud, and how to hear one again. */ speaking?: number, onPlay?: (entry: Entry) => void,
}) {
  const ref = useRef<HTMLDivElement>(null)
  const latest = entries.at(-1)?.seq
  useEffect(() => {
    const box = ref.current
    if (box) box.scrollTop = box.scrollHeight
  }, [latest, draft])
  return <div className="log" ref={ref} role="log" aria-live="polite">
    {!entries.length && <p className="hint empty">這裡還沒有紀錄。</p>}
    {entries.map(entry => <article key={entry.seq} className={'entry entry-' + entry.type + (speaking === entry.seq ? ' entry-speaking' : '')}>
      <header>
        <span>{entry.actor && (entry.type === 'input' || entry.type === 'chat') && <MemberAvatar id={entry.actor} name={names[entry.actor] ?? '？'} size="tiny"/>}{entry.type === 'input' ? (entry.actor ? names[entry.actor] ?? '玩家' : '') + ' ▸' : entryTag[entry.type] ?? ''}</span>
        <time>{clock(entry.minute)}</time>
        {onPlay && readable.has(entry.type) && <button type="button" className="entry-play" onClick={() => onPlay(entry)}>▶ 唸</button>}
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

function Tab({ selected, badge, icon, onClick, children }: { selected: boolean, badge?: number | boolean, icon?: IconName, onClick: () => void, children: ReactNode }) {
  return <button type="button" role="tab" aria-selected={selected} className="tab" onClick={onClick}>
    {icon && <Icon name={icon}/>}{children}{badge ? <span className="badge" aria-label="有新內容">{typeof badge === 'number' ? badge : ''}</span> : null}
  </button>
}

export function Story({ view, send, history, connected, gap, review }: {
  view: View, send: (msg: Message) => Promise<void>,
  history: (before: number) => Promise<Entry[]>, connected: boolean, gap: number,
  review?: (id: string, approved: boolean) => void,
}) {
  const { player } = view
  const portraits = usePortraits()
  // Dice: a result with rolls in it waits for its animation. Until the dice lie still the page keeps showing the
  // world as it was, so neither the log nor an HP bar gives the outcome away.
  const [diceOn, setDiceOn] = useState(() => { try { return localStorage.getItem('tide-dice') !== 'off' } catch { return true } })
  const [attackOn, setAttackOn] = useState(() => { try { return localStorage.getItem('tide-attacks') !== 'off' } catch { return true } })
  const [rolled, setRolled] = useState(() => view.entries.at(-1)?.seq ?? 0)
  const attackers = party(view.world).map(m => m.character!)
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const blows = (text: string) => attackOn && !still ? strikesIn(text, attackers, view.world.fruitLost) : []
  const waiting = diceOn || attackOn ? view.entries.filter(entry => entry.seq > rolled && entry.type === 'result' &&
    (entry.actor === null || entry.actor === player) && (diceOn && diceIn(entry.text).length > 0 || blows(entry.text).length > 0)) : []
  // After a reconnect the missed rolls are old news.
  const rolling = waiting.length <= 3 ? waiting[0] : undefined
  const backlog = waiting.length > 3 ? waiting.at(-1)!.seq : 0
  useEffect(() => { if (backlog) setRolled(backlog) }, [backlog])
  const settledWorld = useRef(view.world)
  useEffect(() => { if (!rolling) settledWorld.current = view.world }, [rolling, view.world])
  const world = rolling ? settledWorld.current : view.world
  const dice = rolling && diceOn ? diceIn(rolling.text) : []
  const strikes = rolling ? pickStrikes(blows(rolling.text), attackers.map(c => c.name)) : []
  // Nothing left to show for it (an option was just switched off): let the result through.
  const idle = rolling && !dice.length && !strikes.length ? rolling.seq : 0
  useEffect(() => { if (idle) setRolled(idle) }, [idle])
  const fight = dice.some(roll => roll.blow) || strikes.length > 0 ? lineUp(dice, strikes, attackers.map(c => c.name)) : undefined
  /** HP on the tray: what everyone had before this round, and what they have now. */
  const vitals = () => {
    const out: Record<string, Vital> = {}
    for (const strike of [...strikes].reverse()) if (strike.hp !== undefined && strike.maxHp)
      out[strike.to] = { hp: Math.min(strike.maxHp, strike.hp + strike.damage), max: strike.maxHp, end: out[strike.to]?.end ?? strike.hp }
    for (const foe of world.combat?.foes ?? []) out[foe.name] = { hp: foe.hp, max: foe.maxHp, end: out[foe.name]?.end ?? foe.hp }
    for (const member of party(world)) {
      const after = attackers.find(c => c.name === member.character!.name)
      out[member.character!.name] = { hp: member.character!.hp, max: maxHP(member.character!), end: after?.hp ?? member.character!.hp }
    }
    for (const npc of companionIds(world)) out[npcs[npc]] = { hp: world.companions![npc]!.hp, max: companionMaxHp(world, npc), end: view.world.companions?.[npc]?.hp ?? world.companions![npc]!.hp }
    return out
  }
  const crew = party(world)
  const joining = world.members.filter(m => m.pendingJoin)
  const [draft, setDraft] = useState('')
  const [chat, setChat] = useState(false)
  const [sending, setSending] = useState(false)
  // Desktop: the side panel's tab. Phone: 'story' or one of the side tabs fills the screen.
  const [side, setSide] = useState<Side>('map')
  const [screen, setScreen] = useState<'story' | Side>('story')
  const [mapPage, setMapPage] = useState<'land' | 'sea'>('land')
  const [crewPage, setCrewPage] = useSegment<'ship' | 'mates' | 'votes'>('crew', 'ship')
  const grid = useRef<HTMLDivElement>(null)
  const [windowId, setWindowId] = useState(player)
  const [seen, setSeen] = useState<Record<string, number>>({})
  const [showGap, setShowGap] = useState(gap > 0)
  const [past, setPast] = useState<Entry[]>([])
  const [hasMore, setHasMore] = useState(true)
  const retryId = useRef<{ id: string, text: string, chat: boolean } | undefined>(undefined)
  const actionField = useRef<HTMLTextAreaElement>(null)
  const me = world.members.find(member => member.id === player)!
  const character = me.character!
  const current = view.pending.find(job => job.actor === player)
  const paused = !connected || !view.hostOnline || view.phase === 'paused'
  const entries = [...new Map([...past, ...view.entries].map(row => [row.seq, row])).values()].sort((a, b) => a.seq - b.seq)
    .filter(entry => !rolling || entry.seq < rolling.seq || (entry.actor !== null && entry.actor !== player))
  const post = (msg: Message) => { void send(msg).catch(() => {}) }
  const location = locations[character.place]
  const island = islandAt(character.place)
  // Ashore on another island, the land is what matters again.
  useEffect(() => setMapPage('land'), [island])
  const combat = world.combat?.participants.includes(player) ? world.combat : undefined
  const askedForDirections = entries.findLast(entry => entry.actor === player)?.type === 'guide'
  const suggestions = askedForDirections ? guideFor(world, me).suggestions : []
  const disabled = !connected || sending ||
    (!chat && !sceneQuestion(draft) && (!!rolling || !!current || paused || !!combat?.locked.includes(player)))
  const names = Object.fromEntries(crew.map(m => [m.id, m.character!.name]))
  const writing = rolling ? undefined : view.pending.find(job => job.actor === player && job.draft)
  const voice = useNarrator({ entries, player, players: crew.map(m => m.character!.name), draft: writing && { id: writing.id, text: writing.draft! } })

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

  // At sea: a course waits for this player's vote, or the chosen one for their go-ahead.
  const { sailing } = world
  const seaWaits = crew.length > 1 && !!sailing && Object.keys(sailing.ballots).length > 0 &&
    (selectedRoute(sailing, crew.length) ? !sailing.ready.includes(player) : !sailing.ballots[player])
  const openVotes = world.proposals.filter(p => !p.passed && p.votes[player] === undefined).length
  const liveScenes = canonTimeline.filter(event => world.phases?.[event.id + ':scene'] !== undefined && !world.timeline?.[event.id]).length
  const fruitsWaiting = (world.fruitOffers ?? []).filter(offer => offer.to === player).length
  const reviews = review ? joining.filter(m => m.character && !m.approved).length : 0
  const sideBadge: Record<Side, number | boolean> = {
    map: seaWaits, me: character.unspent + (character.skillPoints ?? 0) + fruitsWaiting, bag: false,
    crew: openVotes + reviews, news: liveScenes, luffy: false,
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
    // On a phone the page scrolls: a new tab starts at its top, not where the last one was left.
    const top = grid.current?.getBoundingClientRect().top ?? 0
    if (top < 0) window.scrollBy(0, top - 72)
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || disabled) return
    setSending(true)
    // Acting means the player has heard enough of what came before.
    if (!chat) voice.stop()
    const previous = retryId.current
    const id = previous?.text === text && previous?.chat === chat ? previous.id : crypto.randomUUID()
    retryId.current = { id, text, chat }
    try {
      await send(chat ? { kind: 'chat', id, text } : { kind: 'act', id, version: view.world.version, text })
      setDraft(currentText => currentText === draft ? '' : currentText)
      retryId.current = undefined
      setWindowId(player)
    } catch { /* The shell displays the error and the draft stays editable. */ }
    finally { setSending(false) }
  }

  const panelProps = { world, player, suggest }
  const onCourse = (to: keyof typeof islands, pace: keyof typeof paceNames) => suggest('選擇航線 ' + islands[to].name + ' ' + paceNames[pace])
  const panels: Record<Side, () => ReactNode> = {
    map: () => <>
      <Segments label="地圖內容" value={mapPage} onPick={setMapPage} options={[['land', '島上'], ['sea', '出海', seaWaits]]}/>
      {mapPage === 'land' ? <>
        <IslandMap world={world} player={player} onTravel={place => suggest('前往' + locations[place])} onCourse={onCourse}/>
        <HerePanel {...panelProps}/>
        <SagaPanel {...panelProps}/>
        <WarPanel {...panelProps}/>
        <IslandAdventure {...panelProps}/>
        <FruitStalls {...panelProps}/>
        <MarketPanel {...panelProps}/>
      </> : <>
        <SeaMap world={world} player={player} onCourse={onCourse}/>
        <VoyagePanel {...panelProps}/>
      </>}
    </>,
    me: () => <CharacterPanel {...panelProps} view={view} send={send} post={post} paused={paused}/>,
    bag: () => <BagPanel {...panelProps}/>,
    crew: () => <>
      {review && joining.length > 0 && <Card title="加入中的玩家" tone="gold">
        <Rows>{joining.map(m => <Row key={m.id} lead={<MemberAvatar id={m.id} name={m.character?.name ?? '？'}/>} title={m.character?.name ?? '未創角'}
          note={!m.connected ? '離線' : !m.character ? '創角中' : !m.approved ? '等待角色審核' : '等待確認背景並準備'}>
          {m.character && !m.approved && <button type="button" className="light" onClick={() => review(m.id, true)}>核准</button>}
        </Row>)}</Rows>
      </Card>}
      <Segments label="船團內容" value={crewPage} onPick={setCrewPage}
        options={[['ship', '船隻'], ['mates', '夥伴 ' + companionIds(world).length], ['votes', '決議', openVotes]]}/>
      {crewPage === 'ship' ? <ShipPanel {...panelProps}/>
        : crewPage === 'mates' ? <CompanionPanel {...panelProps}/>
        : <DecisionsPanel world={world} player={player} post={post} paused={paused}/>}
    </>,
    news: () => <>
      {showGap && <Card title="離線期間" tone="gold" meta={'新增 ' + gap + ' 筆公開紀錄'}>
        <Rows>{view.entries.slice(-gap).filter(entry => ['world', 'result'].includes(entry.type)).slice(-3).map(entry =>
          <Row key={entry.seq} title={clock(entry.minute)} note={entry.text}/>)}</Rows>
        <button type="button" className="light" onClick={() => setShowGap(false)}>知道了</button>
      </Card>}
      <CalendarPanel world={world}/>
    </>,
    luffy: () => <LuffyPanel {...panelProps}/>,
  }

  return <div className={'game screen-' + screen}>
    {rolling && (fight
      ? <FightTray key={rolling.seq} {...fight} faces={Object.fromEntries(crew.map(m => [m.character!.name, portraits[m.id]]))} vitals={vitals()} showDice={dice.length > 0} onDone={() => setRolled(rolling.seq)}/>
      : dice.length > 0 && <DiceTray key={rolling.seq} rolls={dice.slice(0, 6)} onDone={() => setRolled(rolling.seq)}/>)}
    <header className="hud voyage-bar" aria-label="角色狀態">
      <div className="hud-me"><PortraitPicker view={view} name={character.name} send={send} size="small"/>
        <div className="hud-place"><strong>{islands[island].name}</strong><span>{location}</span><span>{clock(world.minute)}</span></div></div>
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
      <Tab icon="story" selected={screen === 'story'} onClick={() => setScreen('story')}
        badge={windows.reduce((sum, [id]) => sum + unread(id), 0)}>故事</Tab>
      {sideTabs.map(([id, label]) => <Tab key={id} icon={id} selected={screen === id} badge={sideBadge[id]} onClick={() => pickSide(id)}>{label}</Tab>)}
    </nav>

    <div className="game-grid" ref={grid}>
      <main className="story-column">
        <section className="bulletin world-log" aria-label="世界公告">
          <h2>世界公告</h2>
          <Log entries={windowEntries('world')} names={names} speaking={voice.now?.seq} onPlay={voice.settings.on ? voice.replay : undefined}/>
        </section>
        {/* Teammates' windows are a tab away; playing alone there is nothing to switch. */}
        {windows.length > 1 && <div className="window-tabs" role="tablist" aria-label="切換視窗">
          {windows.map(([id, label]) => <Tab key={id} selected={windowId === id} badge={unread(id)} onClick={() => setWindowId(id)}><MemberAvatar id={id} name={label} size="tiny"/>{label}</Tab>)}
        </div>}
        <div className="windows">
          {crew.map(member => <section key={member.id} className={'window personal' + (windowId === member.id ? '' : ' window-hidden')}
            aria-label={member.character!.name + '的視窗'}>
            <h2 className="sr-only">{member.character!.name}{member.id === player ? '（你）' : member.connected ? '' : '・離線'}</h2>
            <Log entries={windowEntries(member.id)} names={names} speaking={voice.now?.seq} onPlay={voice.settings.on ? voice.replay : undefined} draft={rolling ? undefined : view.pending.find(job => job.actor === member.id)?.draft}/>
          </section>)}
          {connected && hasMore && entries.length >= 60 && <button className="light older" onClick={async () => {
            try {
              const rows = await history(entries[0].seq)
              setPast(previous => [...rows, ...previous])
              setHasMore(rows.length === 60)
            } catch { /* The shell shows the failed request. */ }
          }}>載入較早紀錄</button>}
        </div>

        <VoiceBar voice={voice}/>
        {combat && <CombatPanel combat={combat} guns={combat.atSea ? partLevel(world.ship, 'cannon') : 0} character={character} player={player} suggest={suggest}/>}
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
          <details className="play-options"><summary>動畫與語音{voice.settings.on ? '（語音開）' : ''}</summary>
            <div className="composer-foot">
              <label className="check"><input type="checkbox" checked={diceOn} onChange={e => {
                setDiceOn(e.target.checked)
                setRolled(view.entries.at(-1)?.seq ?? 0)
                try { localStorage.setItem('tide-dice', e.target.checked ? 'on' : 'off') } catch { /* The choice just lasts for this visit. */ }
              }}/> 骰子動畫</label>
              <label className="check"><input type="checkbox" checked={attackOn} onChange={e => {
                setAttackOn(e.target.checked)
                setRolled(view.entries.at(-1)?.seq ?? 0)
                try { localStorage.setItem('tide-attacks', e.target.checked ? 'on' : 'off') } catch { /* The choice just lasts for this visit. */ }
              }}/> 攻擊動畫</label>
              <VoiceSwitch voice={voice}/>
            </div>
            <VoiceSettingsPanel voice={voice}/>
          </details>
        </form>
      </main>

      <aside className="side-column" aria-label="資訊面板">
        <div className="side-tabs" role="tablist" aria-label="資訊分頁">
          {sideTabs.map(([id, label]) => <Tab key={id} icon={id} selected={side === id} badge={sideBadge[id]} onClick={() => pickSide(id)}>{label}</Tab>)}
        </div>
        <div className="side-body" key={side}>{panels[side]()}</div>
      </aside>
    </div>
  </div>
}

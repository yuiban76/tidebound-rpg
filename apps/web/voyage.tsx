import { locations, npcs } from '../../packages/shared/protocol.ts'
import { hasFlag } from '../../packages/world/flags.ts'
import { ballotCount, boatYard, islandAt, islands, islandStories, paceNames, routeNeeds, routesFrom, selectedRoute } from '../../packages/world/sea.ts'
import { beli } from '../../packages/world/scale.ts'
import { shipName } from '../../packages/world/ships.ts'
import { npcPlace, party } from '../../packages/world/village.ts'
import { gateCrews, gateOpen, seaOf } from '../../packages/world/gates.ts'
import { levelCaps, seaNames } from '../../packages/world/growth.ts'
import { bossDefeats } from '../../packages/world/canon.ts'
import { crews } from '../../packages/world/crews.ts'
import { capOf } from '../../packages/rules/engine.ts'
import type { NpcId } from '../../packages/shared/protocol.ts'
import { Bar, Card, meIn, Pill } from './side.tsx'
import type { PanelProps } from './side.tsx'

/** Where the ship lies, every course open from there, and everything needed before setting sail. */
export function VoyagePanel({ world, player, suggest }: PanelProps) {
  const character = meIn(world, player)
  const { ship, sailing } = world
  const crew = party(world)
  const from = islandAt(ship?.port ?? character.place)
  const team = crew.length > 1
  const chosen = ship && selectedRoute(sailing, crew.length)
  const ready = sailing?.ready.includes(player)
  const atPort = !!ship && character.place === ship.port
  const gathered = !!ship && crew.every(m => m.connected && m.character?.place === ship.port && m.character.hp > 0)
  const canDepart = !!ship && gathered && atPort && !world.combat && ship.hull > 0 &&
    (!team || !!chosen && sailing?.ready.length === crew.length)
  const hint = !ship ? ''
    : world.combat ? '戰鬥結束後才能出海。'
    : !atPort ? '請先回到船邊。'
    : !gathered ? '出海前請全員上線並在船邊集合。'
    : !ship.hull ? '請先修好船體。'
    : team && !chosen ? '出海前需要過半成員選擇同一條航線與航速。'
    : team && !canDepart ? '航線已通過。請每位玩家標記準備出航。'
    : chosen ? '已選定前往' + islands[chosen.to].name + '的' + paceNames[chosen.pace] + '航線。'
    : '單人可直接出海，也能先選島嶼和航速。'
  return <Card title="航海" meta={ship ? '木料 ' + ship.wood : undefined}>
    {ship ? <>
      <p><strong>{shipName(ship)}</strong>停在{locations[ship.port]}</p>
      <Bar label="船體" value={ship.hull} max={100} tone={ship.hull < 30 ? 'hp' : 'sea'}/>
    </> : <>
      <p>{locations.dock}的船塢販售{boatYard.name}，可載全隊出海。售價 {beli(boatYard.price)}。</p>
      {character.place === 'dock' ? <button type="button" className="wide" onClick={() => suggest('買船')}>買船</button>
        : islandAt(character.place) === 'wind' && <button type="button" className="light wide" onClick={() => suggest('前往' + locations.dock)}>前往船塢</button>}
    </>}
    <h4>從{islands[from].name}出發的航線</h4>
    <ul className="courses" aria-label="海圖">
      {routesFrom(from).map(route => {
        const { to, miles } = route
        const ruined = hasFlag(world, 'ruined:' + to)
        const needs = routeNeeds(route)
        return <li key={to} data-picked={chosen && chosen.to === to || undefined} data-ruined={ruined || undefined}>
          <div className="course-head"><strong>{islands[to].name}</strong><span>{miles} 海里</span></div>
          {ship && !ruined ? <div className="course-paces">
            {(['steady', 'fast'] as const).map(pace => <button key={pace} type="button" className="light"
              aria-label={islands[to].name + '，' + paceNames[pace]} aria-pressed={sailing?.ballots[player]?.to === to && sailing?.ballots[player]?.pace === pace}
              onClick={() => suggest('選擇航線 ' + islands[to].name + ' ' + paceNames[pace])}>
              {paceNames[pace]}{team && ' ' + ballotCount(sailing, { to, pace }) + ' 票'}
            </button>)}
          </div> : <Pill tone={ruined ? 'alert' : undefined}>{ruined ? '已成廢墟 · 不能靠岸' : '需船隻'}</Pill>}
          <p>{islands[to].about}</p>
          {needs.length > 0 && <p className="course-needs">{needs.map(need => <Pill key={need} tone="gold">{need}</Pill>)}</p>}
        </li>
      })}
    </ul>
    {ship && <>
      <p className="hint">快航會縮短航程，也可能增加船體損耗。</p>
      {team && <ul className="chips" aria-label="隊員出航狀態">
        {crew.map(m => <li key={m.id}><Pill tone={m.connected && m.character?.place === ship.port && sailing?.ready.includes(m.id) ? 'on' : undefined}>{m.character?.name} · {
          !m.connected ? '離線' : m.character?.place !== ship.port ? '未到船邊'
            : sailing?.ready.includes(m.id) ? '已準備' : '在船邊'
        }</Pill></li>)}
      </ul>}
      <p role="status" className="voyage-hint">{hint}</p>
      <div className="button-row">
        {!atPort && islandAt(character.place) === from && <button type="button" className="light"
          onClick={() => suggest('前往' + locations[ship.port])}>回船邊</button>}
        {team && atPort && chosen && <button type="button" className="light"
          onClick={() => suggest(ready ? '取消出航準備' : '準備出航')}>{ready ? '取消出航準備' : '我準備出航'}</button>}
        {atPort && ship.hull < 100 && <button type="button" className="light" onClick={() => suggest('修船')}>修船</button>}
        {atPort && <button type="button" className="light" onClick={() => suggest('買木料')}>買木料</button>}
        <button type="button" className="grow" disabled={!canDepart} onClick={() => suggest('出海')}>出海</button>
      </div>
    </>}
  </Card>
}

/** This island's own story: what to do next, and where. */
export function IslandAdventure({ world, player, suggest }: PanelProps) {
  const current = meIn(world, player).place
  const island = islandAt(current)
  const story = islandStories[island]
  if (!story) return null
  const stage = world.islandTasks?.[island]?.stage
  const step = stage === 'active' ? 1 : stage === 'found' ? 2 : 0
  const settled = stage === 'done' || stage === 'closed'
  const destination = step === 1 ? story.search : story.meeting
  const command = current === destination ? story.samples[step] : '前往' + locations[destination]
  const detail = stage === 'done' ? story.close
    : stage === 'closed' ? '這件事已經落幕，由別人了結了。'
    : stage === 'found' ? '搜索完成。回' + locations[story.meeting] + '找' + npcs[story.guide] + '。'
    : stage === 'active' ? story.lead : '可以到' + locations[story.meeting] + (npcPlace(world, story.guide) === story.meeting ? '找' + npcs[story.guide] : '') + '接委託。'
  const state = stage === 'done' ? '已完成' : stage === 'closed' ? '已落幕' : stage === 'found' ? '待回報' : stage === 'active' ? '進行中' : '委託'
  return <Card title={story.title} tone={settled ? 'quiet' : undefined} meta={<Pill tone={stage === 'done' ? 'on' : settled ? undefined : 'gold'}>{state}</Pill>}>
    <p className={settled ? 'hint' : undefined}>{detail}</p>
    {!settled && <button type="button" className="light" onClick={() => suggest(command)}>{command}</button>}
  </Card>
}

/**
 * The island's two kinds of crews: the guard crew the party must beat itself to sail on, and the story's own crews,
 * which the party or the Straw Hats may beat (those drop devil fruits and change what happens next).
 */
export function GatePanel({ world, player, suggest }: PanelProps) {
  const c = meIn(world, player)
  const island = islandAt(c.place)
  const gate = gateCrews[island]
  if (!gate) return null
  const beaten = gateOpen(world, island)
  const port = islands[island].port
  const fighting = !!world.combat
  const story = Object.values(crews).filter(crew => crew.captain !== 'luffy' && bossDefeats[crew.captain] && (place => !!place && islandAt(place) === island)(npcPlace(world, crew.captain)))
  const levels = party(world).map(m => m.character!.level)
  const lowest = Math.min(...levels)
  return <Card title="守關海賊團" tone={beaten ? 'quiet' : undefined}
    meta={beaten ? <Pill tone="on">已打倒</Pill> : <Pill tone={lowest >= gate.level ? 'on' : 'gold'}>建議 {gate.level} 級</Pill>}>
    <p className="gate-name"><strong>{gate.crew}</strong><small>船長「{gate.title}」{gate.captain}</small></p>
    <p className={beaten ? 'hint' : undefined}>{beaten ? '你們在守關戰打倒了他們，往下一座島的航路已經打開。主線裡的他們還在，要不要再打一次由你們決定。' : gate.text}</p>
    {!beaten && <>
      <p className="hint">{'打倒他們才能往下一座島（回頭的航線不受影響）。守關戰只負責開航路，不會改變劇情。'}{lowest < gate.level ? '隊伍裡最低的是 ' + lowest + ' 級，可以先「四處找架打」練等。' : ''}</p>
      <button type="button" className="light" disabled={fighting} onClick={() => suggest(c.place === port ? '挑戰守關海賊團' : '前往' + locations[port])}>
        {c.place === port ? '挑戰「' + gate.crew + '」' : '前往' + locations[port]}</button>
    </>}
    {story.length > 0 && <div className="story-crews">
      <h4>主線海賊團</h4>
      <ul>{story.map(crew => {
        const down = !!world.defeated?.includes(crew.captain as NpcId)
        return <li key={crew.name} data-down={down || undefined}><strong>{crew.name}</strong><small>{npcs[crew.captain]}{down ? '：已被打倒' : '：可以不打。你們或草帽一夥打倒都算；打倒會掉惡魔果實、改寫之後的劇情'}</small></li>
      })}</ul>
    </div>}
  </Card>
}

/** 「四處找架打」: training fights against foes of the party's level, and the level cap of the sea. */
export function TrainingPanel({ world, player, suggest }: PanelProps) {
  const c = meIn(world, player)
  const sea = seaOf(islandAt(c.place))
  const cap = capOf(c)
  const capped = c.level >= cap
  return <Card title="練等" meta={<Pill tone={capped ? 'gold' : undefined}>上限 {cap} 級</Pill>}>
    <p>四處找架打：遇到和隊伍等級相當的對手，打贏拿經驗值和貝里，有時還會撿到繃帶、帶骨肉或傷藥。重複打也不會變少。</p>
    <p className="hint">{capped ? '你已經到' + seaNames[world.frontier ?? sea] + '的等級上限，經驗值會先存著，到下一片海時一次升上去。'
      : '目前在' + seaNames[world.frontier ?? sea] + '，等級上限 ' + cap + '。東海 ' + levelCaps.east + '、偉大航路前半段 ' + levelCaps.paradise + '、新世界 ' + levelCaps.newWorld + '。'}</p>
    <button type="button" className="light" disabled={!!world.combat || c.hp <= 0} onClick={() => suggest('四處找架打')}>四處找架打</button>
  </Card>
}

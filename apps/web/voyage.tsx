import { useId } from 'react'
import { locations, npcs } from '../../packages/shared/protocol.ts'
import { ballotCount, boatYard, islandAt, islands, islandStories, paceNames, routeNeeds, routesFrom, selectedRoute } from '../../packages/world/sea.ts'
import { party } from '../../packages/world/village.ts'
import type { View } from './network.ts'

type Props = { world: View['world'], player: string, suggest: (command: string) => void }

export function VoyagePanel({ world, player, suggest }: Props) {
  const title = useId()
  const character = world.members.find(m => m.id === player)!.character!
  const { ship, sailing } = world
  const crew = party(world)
  if (!ship) return <section className="panel sea-panel" aria-labelledby={title}>
    <h2 id={title}>航海</h2>
    <p>{locations.dock}的船塢販售迎潮號，可載全隊出海。售價 {boatYard.price} 貝里。</p>
    <div className="button-row">
      {character.place === 'dock' ? <>
        <button type="button" onClick={() => suggest('買船')}>買船</button>
        {world.quest === 'done' && <button type="button" className="light" onClick={() => suggest('借船')}>借船</button>}
      </> : <button type="button" className="light" onClick={() => suggest('前往' + locations.dock)}>前往船塢</button>}
    </div>
  </section>

  const from = islandAt(ship.port)
  const team = crew.length > 1
  const chosen = selectedRoute(sailing, crew.length)
  const ready = sailing?.ready.includes(player)
  const atPort = character.place === ship.port
  const gathered = crew.every(m => m.connected && m.character?.place === ship.port && m.character.hp > 0)
  const canDepart = gathered && atPort && !world.combat && ship.hull > 0 &&
    (!team || !!chosen && sailing?.ready.length === crew.length)
  const hint = world.combat ? '戰鬥結束後才能出海。'
    : !atPort ? '請先回到船邊。'
    : !gathered ? '出海前請全員上線並在船邊集合。'
    : !ship.hull ? '請先修好船體。'
    : team && !chosen ? '出海前需要過半成員選擇同一條航線與航速。'
    : team && !canDepart ? '航線已通過。請每位玩家標記準備出航。'
    : chosen ? '已選定前往' + islands[chosen.to].name + '的' + paceNames[chosen.pace] + '航線。'
    : '單人可直接出海，也能先選島嶼和航速。'
  return <section className="panel sea-panel" aria-labelledby={title}>
    <h2 id={title}>航海</h2>
    <p><strong>迎潮號</strong>{ship.borrowed ? '（租借）' : ''}停在{locations[ship.port]} · 船體 {ship.hull}／100 · 木料 {ship.wood}</p>
    <ul className="voyage-courses" aria-label="可選航線">
      {routesFrom(from).map(route => { const { to, miles } = route; const needs = routeNeeds(route); return <li key={to}>
        <strong>{islands[to].name}</strong>
        <span>{miles} 海里 · {islands[to].about}{needs.length ? ' · ' + needs.join('、') : ''}</span>
        <div className="button-row">
          {(['steady', 'fast'] as const).map(pace => <button key={pace} type="button" className="light"
            aria-label={islands[to].name + '，' + paceNames[pace]} aria-pressed={sailing?.ballots[player]?.to === to && sailing?.ballots[player]?.pace === pace}
            onClick={() => suggest('選擇航線 ' + islands[to].name + ' ' + paceNames[pace])}>
            {paceNames[pace]}{team && ' · ' + ballotCount(sailing, { to, pace }) + ' 票'}
          </button>)}
        </div>
      </li> })}
    </ul>
    <p className="hint">快航會縮短航程，也可能增加船體損耗。</p>
    {team && <ul className="voyage-team" aria-label="隊員出航狀態">
      {crew.map(m => <li key={m.id}>{m.character?.name} · {
        !m.connected ? '離線' : m.character?.place !== ship.port ? '未到船邊'
          : sailing?.ready.includes(m.id) ? '已準備' : '在船邊'
      }</li>)}
    </ul>}
    <p role="status">{hint}</p>
    <div className="button-row">
      {!atPort && islandAt(character.place) === from && <button type="button" className="light"
        onClick={() => suggest('前往' + locations[ship.port])}>回船邊</button>}
      {team && atPort && chosen && <button type="button" className="light"
        onClick={() => suggest(ready ? '取消出航準備' : '準備出航')}>{ready ? '取消出航準備' : '我準備出航'}</button>}
      {atPort && ship.hull < 100 && <button type="button" className="light" onClick={() => suggest('修船')}>修船</button>}
      {atPort && <button type="button" className="light" onClick={() => suggest('買木料')}>買木料</button>}
      <button type="button" disabled={!canDepart} onClick={() => suggest('出海')}>出海</button>
    </div>
  </section>
}

export function IslandAdventure({ world, player, suggest }: Props) {
  const title = useId()
  const current = world.members.find(m => m.id === player)!.character!.place
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
    : stage === 'active' ? story.lead : '可以到' + locations[story.meeting] + '找' + npcs[story.guide] + '接委託。'
  return <section className="panel sea-panel" aria-labelledby={title}>
    <h2 id={title}>{story.title}</h2>
    <p>{detail}</p>
    {!settled && <button type="button" className="light" onClick={() => suggest(command)}>{command}</button>}
  </section>
}

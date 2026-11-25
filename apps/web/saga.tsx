import { useId } from 'react'
import { locations } from '../../packages/shared/protocol.ts'
import { rocketmanReady } from '../../packages/rules/saga.ts'
import { canonTimeline, minuteOf } from '../../packages/world/canon.ts'
import { hasFlag } from '../../packages/world/flags.ts'
import { islandAt } from '../../packages/world/sea.ts'
import { sagaFlag, sagas } from '../../packages/world/water7.ts'
import type { View } from './network.ts'

type Props = { world: View['world'], player: string, suggest: (command: string) => void }
const when = ([day, hour]: [number, number]) => '第 ' + day + ' 天 ' + String(hour).padStart(2, '0') + ':00'

/** A story arc in progress on this island: what already happened, and the goals that can still change what comes next. */
export function SagaPanel({ world, player, suggest }: Props) {
  const title = useId()
  const place = world.members.find(m => m.id === player)!.character!.place
  const island = islandAt(place)
  const saga = sagas.find(item => item.islands.includes(island) && world.minute >= minuteOf(item.from) && world.minute < minuteOf(item.until))
  if (!saga) return null
  const past = saga.stages.map(id => canonTimeline.find(event => event.id === id)!).filter(event => world.timeline?.[event.id])
  // Upcoming stages stay hidden: only this island's goals that are open (or open within a day) are shown.
  const goals = saga.goals.filter(goal => islandAt(goal.place) === island && (hasFlag(world, sagaFlag(goal.id)) ||
    (world.minute < minuteOf(goal.until) && world.minute >= minuteOf(goal.from) - 1440)))
  return <section className="panel sea-panel war-panel" aria-labelledby={title}>
    <h2 id={title}>{saga.title}</h2>
    {past.length > 0 && <ol className="war-stages">{past.slice(-5).map(event => <li key={event.id} data-state={world.timeline![event.id]}>
      <strong>{event.title}</strong><span className="hint">{world.timeline![event.id] === 'changed' ? '已被改寫' : '照原作發生'}</span></li>)}</ol>}
    <h3>可以介入的事</h3>
    {goals.length ? <ul className="roster">{goals.map(goal => {
      const done = hasFlag(world, sagaFlag(goal.id))
      const open = !done && world.minute >= minuteOf(goal.from)
      return <li key={goal.id}>
        <div><strong>{goal.title}</strong>
          <div className="hint">{locations[goal.place]} · {when(goal.from)}～{when(goal.until)} · 難度 {goal.check.dc}{goal.minLevel ? ' · 建議等級 ' + goal.minLevel : ''} · {done ? '已完成' : open ? '進行中' : '尚未開始'}</div></div>
        {open && <button type="button" className="light" onClick={() => suggest(place === goal.place ? goal.title : '前往' + locations[goal.place])}>
          {place === goal.place ? '執行' : '前往'}</button>}
      </li>
    })}</ul> : <p className="hint">眼下沒有插得上手的事。</p>}
    {island === 'water7' && rocketmanReady(world) && <button type="button" onClick={() => suggest(place === 'blueStation' ? '搭海列車' : '前往' + locations.blueStation)}>
      {place === 'blueStation' ? '搭火箭人去司法島' : '到車站搭火箭人'}</button>}
  </section>
}

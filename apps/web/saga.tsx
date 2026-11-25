import { locations } from '../../packages/shared/protocol.ts'
import { rocketmanReady } from '../../packages/rules/saga.ts'
import { canonTimeline, minuteOf } from '../../packages/world/canon.ts'
import { hasFlag } from '../../packages/world/flags.ts'
import { islandAt } from '../../packages/world/sea.ts'
import { sagaFlag, sagas } from '../../packages/world/water7.ts'
import { Card, meIn, More, Pill, Row, Rows } from './side.tsx'
import type { PanelProps } from './side.tsx'

const when = ([day, hour]: [number, number]) => '第 ' + day + ' 天 ' + String(hour).padStart(2, '0') + ':00'

/** A story arc in progress on this island: what already happened, and the goals that can still change what comes next. */
export function SagaPanel({ world, player, suggest }: PanelProps) {
  const { place } = meIn(world, player)
  const island = islandAt(place)
  const saga = sagas.find(item => item.islands.includes(island) && world.minute >= minuteOf(item.from) && world.minute < minuteOf(item.until))
  if (!saga) return null
  const past = saga.stages.map(id => canonTimeline.find(event => event.id === id)!).filter(event => world.timeline?.[event.id])
  // Upcoming stages stay hidden: only this island's goals that are open (or open within a day) are shown.
  const goals = saga.goals.filter(goal => islandAt(goal.place) === island && (hasFlag(world, sagaFlag(goal.id)) ||
    (world.minute < minuteOf(goal.until) && world.minute >= minuteOf(goal.from) - 1440)))
  return <Card title={saga.title} meta="可以介入的事">
    {goals.length ? <Rows>{goals.map(goal => {
      const done = hasFlag(world, sagaFlag(goal.id))
      const open = !done && world.minute >= minuteOf(goal.from)
      return <Row key={goal.id} title={<>{goal.title}<Pill tone={done ? 'on' : open ? 'gold' : undefined}>{done ? '已完成' : open ? '進行中' : '尚未開始'}</Pill></>}
        note={<>{locations[goal.place]} · 難度 {goal.check.dc}{goal.minLevel ? ' · 建議等級 ' + goal.minLevel : ''}<br/>{when(goal.from)}～{when(goal.until)}</>}>
        {open && <button type="button" className="light" onClick={() => suggest(place === goal.place ? goal.title : '前往' + locations[goal.place])}>
          {place === goal.place ? '執行' : '前往'}</button>}
      </Row>
    })}</Rows> : <p className="hint">眼下沒有插得上手的事。</p>}
    {island === 'water7' && rocketmanReady(world) && <button type="button" className="wide" onClick={() => suggest(place === 'blueStation' ? '搭海列車' : '前往' + locations.blueStation)}>
      {place === 'blueStation' ? '搭火箭人去司法島' : '到車站搭火箭人'}</button>}
    {past.length > 0 && <More label={'已經發生的 ' + past.length + ' 件事'}>
      <ol className="steps">{past.map(event => <li key={event.id} data-state={world.timeline![event.id]}>
        <strong>{event.title}</strong><small>{world.timeline![event.id] === 'changed' ? '已被改寫' : '照原作發生'}</small></li>)}</ol>
    </More>}
  </Card>
}

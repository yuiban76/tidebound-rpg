import { locations } from '../../packages/shared/protocol.ts'
import { hasFlag } from '../../packages/world/flags.ts'
import { islandAt } from '../../packages/world/sea.ts'
import { warFlag, warGoals, warMinute, warSides, warStages } from '../../packages/world/war.ts'
import type { WarSide } from '../../packages/world/war.ts'
import { canonTimeline, minuteOf } from '../../packages/world/canon.ts'
import { Card, meIn, More, Pill, Row, Rows } from './side.tsx'
import type { PanelProps } from './side.tsx'

const hhmm = (minute: number) => String(Math.floor(minute / 60) % 24).padStart(2, '0') + ':' + String(minute % 60).padStart(2, '0')
const sideCommands: Record<WarSide, string> = { whitebeard: '協助白鬍子', marine: '協助海軍', none: '旁觀' }
/** The whole day, from the opening at 12:00 to the end at 20:00. */
const stages = [
  canonTimeline.find(event => event.id === 'warBegins')!, ...warStages, canonTimeline.find(event => event.id === 'warEnds')!,
]

/**
 * The Summit War at a glance, shown on Marineford: the party's side, every stage of the day with what happened,
 * and the battlefield goals of the chosen side with where and when they can be tried.
 */
export function WarPanel({ world, player, suggest }: PanelProps) {
  const character = meIn(world, player)
  if (islandAt(character.place) !== 'marineford' || world.timeline?.warEnds) return null
  if (hasFlag(world, 'task:impelDown')) return null
  const side = world.warSide
  const started = world.minute >= warMinute([12, 0])
  const goals = side && side !== 'none' ? warGoals.filter(goal => goal.side === side) : []
  const goalState = (goal: (typeof warGoals)[number]) =>
    hasFlag(world, warFlag(goal.id)) ? '已完成'
      : world.minute >= warMinute(goal.until) ? '已錯過'
      : world.minute >= warMinute(goal.from) ? '進行中' : '尚未開始'
  const happened = stages.filter(stage => world.timeline?.[stage.id]).length
  return <Card title="頂上戰爭" meta={<Pill tone={started ? 'alert' : undefined}>{started ? '戰爭進行中' : '第 72 天 12:00 開戰'}</Pill>}>
    <p>你們{side ? warSides[side] : '還沒決定站在哪一邊'}。</p>
    {!started && <div className="button-row">{(Object.keys(warSides) as WarSide[]).map(option =>
      <button key={option} type="button" className="light" aria-pressed={side === option} onClick={() => suggest(sideCommands[option])}>{warSides[option]}</button>)}</div>}
    {goals.length > 0 && <>
      <h4>戰場目標</h4>
      <Rows>{goals.map(goal => {
        const state = goalState(goal)
        const here = character.place === goal.place
        return <Row key={goal.id} title={<>{goal.title}<Pill tone={state === '已完成' ? 'on' : state === '進行中' ? 'gold' : undefined}>{state}</Pill></>}
          note={<>{locations[goal.place]} · 難度 {goal.check.dc}{goal.minLevel ? ' · 建議等級 ' + goal.minLevel : ''}<br/>{hhmm(warMinute(goal.from) % 1440)}～{hhmm(warMinute(goal.until) % 1440)}</>}>
          {state === '進行中' && <button type="button" className="light" onClick={() => suggest(here ? goal.title : '前往' + locations[goal.place])}>
            {here ? '執行' : '前往'}</button>}
        </Row>
      })}</Rows>
      <p className="hint">完成前面的目標會讓後面更容易；同一方的人物在旁邊時也會幫忙。失敗會受傷，但時間內可以再試。</p>
    </>}
    <More label={'戰況（' + happened + '／' + stages.length + '）'} open={started}>
      <ol className="steps">{stages.map(stage => {
        const result = world.timeline?.[stage.id]
        return <li key={stage.id} data-state={result ?? 'pending'}>
          <strong>{hhmm(minuteOf(stage.at) % 1440)} {stage.title}</strong>
          <small>{result === 'changed' ? '已被改寫' : result ? '照原作發生' : '尚未發生'}</small>
        </li>
      })}</ol>
    </More>
  </Card>
}

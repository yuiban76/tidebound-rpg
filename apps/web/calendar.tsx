import { canonTimeline } from '../../packages/world/canon.ts'
import { islands } from '../../packages/world/sea.ts'
import type { View } from './network.ts'

type Props = { world: View['world'] }

const clock = (minutes: number) => '第 ' + (Math.floor(minutes / 1440) + 1) + ' 日 ' +
  String(Math.floor(minutes / 60) % 24).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0')

/** The calendar and what the party has heard: stand-offs in progress, rumors and warnings, and the latest morning paper. */
export function CalendarPanel({ world }: Props) {
  const news = world.news ?? []
  const open = (kind: string[]) => news.filter(item => kind.includes(item.kind) && item.event && !world.timeline?.[item.event]).slice(-4)
  const scenes = canonTimeline.filter(event => world.phases?.[event.id + ':scene'] !== undefined && !world.timeline?.[event.id])
  const paper = news.filter(item => item.kind === 'paper')
  const newest = paper.length ? Math.max(...paper.map(item => item.minute)) : undefined
  const nextPaper = (Math.floor((world.minute - 360) / 1440) + 1) * 1440 + 360
  return <section className="subsection" aria-label="日曆與消息">
    <h3>日曆與消息</h3>
    <p className="hint">現在是 {clock(world.minute)} · 下一期報紙 {clock(nextPaper)}</p>
    {scenes.length > 0 && <>
      <h3>現場事件</h3>
      <ul className="roster">{scenes.map(event => <li key={event.id}>
        <div><strong>{islands[event.island].name}・{event.title}</strong>
          <div className="hint">還有時間介入，期限 {clock(world.phases![event.id + ':until'])}</div></div>
      </li>)}</ul>
    </>}
    {open(['rumor', 'warning']).length > 0 && <>
      <h3>傳聞與警告</h3>
      <ul className="roster">{open(['rumor', 'warning']).map(item => <li key={item.minute + item.text}>
        <div><div>{item.text}</div><div className="hint">{clock(item.minute)}</div></div>
      </li>)}</ul>
    </>}
    <h3>最新報紙</h3>
    {newest === undefined ? <p className="hint">還沒有報紙。每天早上 06:00 出刊，遠方的消息要過幾天才會登出來。</p> : <>
      <p className="hint">{clock(newest)} 出刊</p>
      <ul className="roster">{paper.filter(item => item.minute === newest).map(item => <li key={item.text}><div>{item.text}</div></li>)}</ul>
    </>}
  </section>
}

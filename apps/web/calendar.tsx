import { canonTimeline } from '../../packages/world/canon.ts'
import { islands } from '../../packages/world/sea.ts'
import type { View } from './network.ts'
import { Card, clock, More, Pill, Row, Rows } from './side.tsx'

const islandNames = Object.values(islands).map(island => island.name).sort((a, b) => b.length - a.length)
/** 「【報紙】島・標題：內文」 in parts. Lines written another way keep everything in the body. */
export function newsParts(text: string) {
  const [, tag = '', rest] = /^(?:【(.+?)】)?([\s\S]*)$/.exec(text)!
  const cut = rest.indexOf('：')
  const head = cut > 0 ? rest.slice(0, cut) : ''
  if (!head || head.length > 32 || /[。，「]/.test(head)) return { tag, place: '', title: '', body: rest }
  const place = islandNames.find(name => head === name || head.startsWith(name + '・')) ?? ''
  return { tag, place, title: place ? head.slice(place.length + 1) : head, body: rest.slice(cut + 1) }
}

function Article({ text }: { text: string }) {
  const { place, title, body } = newsParts(text)
  return <article>
    {(place || title) && <header>{place && <Pill>{place}</Pill>}{title && <strong>{title}</strong>}</header>}
    <p>{body}</p>
  </article>
}

/** The calendar and what the party has heard: stand-offs in progress, rumors and warnings, and the latest morning paper. */
export function CalendarPanel({ world }: { world: View['world'] }) {
  const news = world.news ?? []
  const heard = news.filter(item => ['rumor', 'warning'].includes(item.kind) && item.event && !world.timeline?.[item.event]).slice(-4)
  const scenes = canonTimeline.filter(event => world.phases?.[event.id + ':scene'] !== undefined && !world.timeline?.[event.id])
  const papers = news.filter(item => item.kind === 'paper')
  const newest = papers.length ? Math.max(...papers.map(item => item.minute)) : undefined
  const latest = papers.filter(item => item.minute === newest)
  const nextPaper = (Math.floor((world.minute - 360) / 1440) + 1) * 1440 + 360
  return <>
    {scenes.length > 0 && <Card title="現場事件" tone="alert" meta="還來得及介入">
      <Rows>{scenes.map(event => <Row key={event.id} title={<>{event.title}<Pill tone="alert">{islands[event.island].name}</Pill></>}
        note={'期限 ' + clock(world.phases![event.id + ':until'])}/>)}</Rows>
    </Card>}
    {heard.length > 0 && <Card title="傳聞與警告">
      <Rows>{heard.map(item => {
        const { tag, place, title, body } = newsParts(item.text)
        return <Row key={item.minute + item.text} title={<><Pill tone={item.kind === 'warning' ? 'alert' : 'gold'}>{tag || '傳聞'}</Pill>{place || title}</>}
          note={<>{body}<br/>{clock(item.minute)}</>}/>
      })}</Rows>
    </Card>}
    <section className="card paper" aria-label="最新報紙">
      <header><h3>最新報紙</h3><p>{newest === undefined ? '還沒有出刊' : clock(newest) + ' 出刊'}</p></header>
      {newest === undefined ? <p className="hint">每天早上 06:00 出刊，遠方的消息要過幾天才會登出來。</p> : <>
        {latest.slice(0, 4).map(item => <Article key={item.text} text={item.text}/>)}
        {latest.length > 4 && <More label={'再看 ' + (latest.length - 4) + ' 則'}>{latest.slice(4).map(item => <Article key={item.text} text={item.text}/>)}</More>}
      </>}
      <footer>現在是 {clock(world.minute)} · 下一期 {clock(nextPaper)}</footer>
    </section>
  </>
}

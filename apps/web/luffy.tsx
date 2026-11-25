import { locations, npcs } from '../../packages/shared/protocol.ts'
import { luffyNow } from '../../packages/world/luffy.ts'
import { islandAt, islands } from '../../packages/world/sea.ts'
import { Icon } from './icons.tsx'
import { clock, meIn } from './side.tsx'
import type { PanelProps } from './side.tsx'

/** Where Luffy is and what he is doing right now. */
export function LuffyPanel({ world, player, suggest }: PanelProps) {
  const { place, where, doing, since } = luffyNow(world)
  const mine = meIn(world, player).place
  const name = npcs.luffy
  return <section className="card luffy" aria-label={name + '的行蹤'}>
    <header><Icon name="luffy"/><div><h3>{name}在哪裡</h3>
      <p className="luffy-where">{place ? <>{islands[islandAt(place)].name}<small>{where}</small></> : where}</p></div></header>
    <h4>正在做什麼</h4>
    <p className="luffy-doing">{doing}</p>
    <p className="hint">{clock(since)} 起 · 現在是 {clock(world.minute)}</p>
    {place === mine ? <button type="button" className="wide" onClick={() => suggest('找' + name + '聊聊')}>找{name}聊聊</button>
      : place && islandAt(place) === islandAt(mine) ? <button type="button" className="light wide" onClick={() => suggest('前往' + locations[place])}>前往{locations[place]}</button>
      : null}
  </section>
}

import { locations, npcs } from '../../packages/shared/protocol.ts'
import { luffyNow } from '../../packages/world/luffy.ts'
import { islandAt, islands } from '../../packages/world/sea.ts'
import type { View } from './network.ts'

type Props = { world: View['world'], player: string, suggest: (command: string) => void }

const clock = (minutes: number) => '第 ' + (Math.floor(minutes / 1440) + 1) + ' 日 ' +
  String(Math.floor(minutes / 60) % 24).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0')

/** Where Luffy is and what he is doing right now. */
export function LuffyPanel({ world, player, suggest }: Props) {
  const { place, where, doing, since } = luffyNow(world)
  const mine = world.members.find(m => m.id === player)!.character!.place
  const name = npcs.luffy
  return <div role="region" aria-label={name + '的行蹤'}>
    <section className="subsection first"><h3>{name}在哪裡</h3>
      <p><strong>{place ? islands[islandAt(place)].name + ' · ' + where : where}</strong></p>
      <p className="hint">{clock(since)} 起 · 現在是 {clock(world.minute)}</p>
    </section>
    <section className="subsection"><h3>正在做什麼</h3>
      <p>{doing}</p>
      {place === mine ? <button type="button" className="light" onClick={() => suggest('找' + name + '聊聊')}>找{name}聊聊</button>
        : place && islandAt(place) === islandAt(mine) ? <button type="button" className="light" onClick={() => suggest('前往' + locations[place])}>前往{locations[place]}</button>
        : null}
    </section>
  </div>
}

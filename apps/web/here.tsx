import { locations, npcs } from '../../packages/shared/protocol.ts'
import { isCompanion } from '../../packages/world/companions.ts'
import { npcRole, npcsAt } from '../../packages/world/village.ts'
import { Avatar, Card, meIn, More } from './side.tsx'
import type { PanelProps } from './side.tsx'

/** A crowd (Marineford on the day of the war) is cut off here until asked for. */
const shown = 8

/** Everyone on this spot who can be talked to; companions come last, they are always around. */
export function HerePanel({ world, player, suggest }: PanelProps) {
  const { place } = meIn(world, player)
  const people = npcsAt(world, place).map(npc => ({ npc, mate: isCompanion(world, npc) })).sort((a, b) => Number(a.mate) - Number(b.mate))
  const list = (some: typeof people) => <ul className="people">{some.map(({ npc, mate }) => {
    const role = mate ? '同行夥伴' : npcRole(world, npc)
    return <li key={npc}><button type="button" className="person" data-mate={mate || undefined} title={npcs[npc] + '：' + role} onClick={() => suggest('找' + npcs[npc] + '聊聊')}>
      <Avatar name={npcs[npc]}/><span><strong>{npcs[npc]}</strong><small>{role}</small></span></button></li>
  })}</ul>
  return <Card title="這裡的人" meta={locations[place]}>
    {people.length ? list(people.slice(0, shown)) : <p className="hint">這裡沒有可以說話的人。</p>}
    {people.length > shown && <More label={'還有 ' + (people.length - shown) + ' 人'}>{list(people.slice(shown))}</More>}
  </Card>
}

import { useState } from 'react'
import { locations, npcs } from '../../packages/shared/protocol.ts'
import { isCompanion } from '../../packages/world/companions.ts'
import { npcRole, npcsAt } from '../../packages/world/village.ts'
import { groupPeople, searchFrom } from './people.ts'
import type { Person } from './people.ts'
import { Avatar, Card, meIn } from './side.tsx'
import type { PanelProps } from './side.tsx'

/** Everyone on this spot who can be talked to, grouped by who they stand with; a crowd gets a search box. */
export function HerePanel({ world, player, suggest }: PanelProps) {
  const { place } = meIn(world, player)
  const [query, setQuery] = useState('')
  const [folded, setFolded] = useState<Set<string>>(() => new Set())
  const people: Person[] = npcsAt(world, place).map(npc => {
    const mate = isCompanion(world, npc)
    return { npc, name: npcs[npc], role: mate ? '同行夥伴' : npcRole(world, npc), mate }
  })
  const groups = groupPeople(people)
  const wanted = query.trim()
  const shown = groups.map(group => ({
    ...group,
    people: wanted ? group.people.filter(p => p.name.includes(wanted) || p.role.includes(wanted) || group.label.includes(wanted)) : group.people,
  })).filter(group => group.people.length)
  const fold = (key: string) => setFolded(now => {
    const next = new Set(now)
    if (!next.delete(key)) next.add(key)
    return next
  })
  // Under a crew's heading, 「白鬍子海賊團第一隊隊長」 reads as 「第一隊隊長」.
  const list = (some: Person[], heading = '') => <ul className="people">{some.map(({ npc, name, role, mate }) =>
    <li key={npc}><button type="button" className="person" data-mate={mate || undefined} title={name + '：' + role} onClick={() => suggest('找' + name + '聊聊')}>
      <Avatar name={name}/><span><strong>{name}</strong><small>{heading && role.startsWith(heading) && role.length > heading.length ? role.slice(heading.length) : role}</small></span></button></li>)}</ul>

  return <Card title="這裡的人" meta={<>{locations[place]}{people.length > 0 && <span className="count-chip">{people.length} 人</span>}</>}>
    {!people.length && <p className="hint">這裡沒有可以說話的人。</p>}
    {people.length > searchFrom && <input type="search" className="people-search" value={query} onChange={e => setQuery(e.target.value)}
      placeholder="搜尋名字、身分或陣營" aria-label="搜尋這裡的人"/>}
    {/* One kind of people needs no headings. */}
    {groups.length === 1 && !wanted && list(groups[0].people)}
    {(groups.length > 1 || wanted) && <div className="people-groups">
      {shown.map(group => {
        const open = !!wanted || !folded.has(group.key)
        return <section key={group.key} className="people-group" data-kind={group.key.split(':')[0]}>
          <button type="button" className="people-head" aria-expanded={open} onClick={() => fold(group.key)}>
            <span>{group.label}</span><small>{group.people.length}</small>
          </button>
          {open && list(group.people, group.key.startsWith('crew:') ? group.label : '')}
        </section>
      })}
      {wanted && !shown.length && <p className="hint">找不到「{wanted}」。</p>}
    </div>}
  </Card>
}

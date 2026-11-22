import { locations, npcs } from '../../packages/shared/protocol.ts'
import { islandStories } from '../../packages/world/sea.ts'
import { companionIds, companionMaxHp, companionDown, companionSlots, maxCrew, recruitable, recruitableAt } from '../../packages/world/companions.ts'
import { npcPlace, people } from '../../packages/world/village.ts'
import type { NpcId } from '../../packages/shared/protocol.ts'
import type { View } from './network.ts'

type Props = { world: View['world'], player: string, suggest: (command: string) => void }

/** What an NPC still needs before they would follow the party, in plain words. */
function requirement(npc: NpcId) {
  const profile = recruitable[npc]!
  return [
    profile.needsTask && '完成「' + (islandStories[profile.needsTask]?.title ?? profile.needsTask) + '」',
    profile.minLevel && '隊伍等級 ' + profile.minLevel,
  ].filter(Boolean).join('、')
}

/** NPCs who joined the crew, and who here could be invited. Commands are suggested, never sent for the player. */
export function CompanionPanel({ world, player, suggest }: Props) {
  const character = world.members.find(m => m.id === player)!.character!
  const mates = companionIds(world)
  const teammates = world.members.filter(m => m.id !== player && m.character && !m.pendingJoin)
  const invitable = world.crew ? recruitableAt(world, character.place) : []
  return <section className="subsection" aria-label="夥伴">
    <h3>夥伴 {mates.length}／{companionSlots(world)}（船團上限 {maxCrew} 人，含玩家）</h3>
    {!world.crew && <p className="hint">成立船團後，可以邀請認識的 NPC 加入。</p>}
    {world.crew && !mates.length && !invitable.length && <p className="hint">還沒有夥伴。和合得來的人交朋友、完成他們的委託，再試著邀請他們。</p>}
    <ul className="roster">{mates.map(npc => {
      const place = npcPlace(world, npc)
      return <li key={npc}>
        <div>
          <strong>{npcs[npc]}</strong>
          <div className="hint">{people[npc].role} · HP {world.companions![npc]!.hp}／{companionMaxHp(world, npc)}
            {companionDown(world, npc) ? ' · 倒下休息中' : ''}{place ? ' · 在' + locations[place] : ''}
            {' · 由' + (world.members.find(m => m.id === world.companions![npc]!.leader)?.character?.name ?? '隊伍') + '帶領'}</div>
        </div>
        <div className="button-row">
          <button type="button" className="light" onClick={() => suggest('找' + npcs[npc] + '聊聊')}>交談</button>
          {world.companions![npc]!.leader === player && teammates.map(m => <button key={m.id} type="button" className="light"
            onClick={() => suggest('把' + npcs[npc] + '交給' + m.character!.name)}>交給{m.character!.name}</button>)}
          <button type="button" className="light" onClick={() => suggest('請' + npcs[npc] + '離隊')}>離隊</button>
        </div>
      </li>
    })}</ul>
    {invitable.length > 0 && <>
      <h3>這裡可以邀請</h3>
      <ul className="roster">{invitable.map(npc => <li key={npc}>
        <div><strong>{npcs[npc]}</strong>
          <div className="hint">{people[npc].role}{requirement(npc) ? ' · 需要' + requirement(npc) : ''}</div></div>
        <button type="button" className="light" onClick={() => suggest('邀請' + npcs[npc] + '加入')}>邀請加入</button>
      </li>)}</ul>
    </>}
  </section>
}

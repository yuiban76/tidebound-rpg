import { locations, npcs } from '../../packages/shared/protocol.ts'
import { islandStories } from '../../packages/world/sea.ts'
import { companionIds, companionMaxHp, companionDown, companionSlots, maxCrew, recruitable, recruitableAt } from '../../packages/world/companions.ts'
import { npcPlace, npcRole } from '../../packages/world/village.ts'
import type { NpcId } from '../../packages/shared/protocol.ts'
import { Avatar, Bar, Card, meIn, Pill, Row, Rows } from './side.tsx'
import type { PanelProps } from './side.tsx'

/** What an NPC still needs before they would follow the party, in plain words. */
function requirement(npc: NpcId) {
  const profile = recruitable[npc]!
  return [
    profile.needsTask && '完成「' + (islandStories[profile.needsTask]?.title ?? profile.needsTask) + '」',
    profile.minLevel && '隊伍等級 ' + profile.minLevel,
  ].filter(Boolean).join('、')
}

/** NPCs who joined the crew, and who here could be invited. Commands are suggested, never sent for the player. */
export function CompanionPanel({ world, player, suggest }: PanelProps) {
  const character = meIn(world, player)
  const mates = companionIds(world)
  const teammates = world.members.filter(m => m.id !== player && m.character && !m.pendingJoin)
  const invitable = world.crew ? recruitableAt(world, character.place) : []
  return <>
    <Card title="夥伴" meta={mates.length + '／' + companionSlots(world) + ' 人'}>
      {!world.crew && <p className="hint">成立船團後，可以邀請認識的 NPC 加入。</p>}
      {world.crew && !mates.length && <p className="hint">還沒有夥伴。和合得來的人交朋友、完成他們的委託，再試著邀請他們。</p>}
      {mates.length > 0 && <ul className="mates">{mates.map(npc => {
        const place = npcPlace(world, npc)
        const { leader, hp } = world.companions![npc]!
        const mine = leader === player
        return <li key={npc}>
          <Avatar name={npcs[npc]}/>
          <div className="mate-text">
            <div className="row-title">{npcs[npc]}{companionDown(world, npc) ? <Pill tone="alert">倒下休息中</Pill> : recruitable[npc] && <Pill>{recruitable[npc].fight.move}</Pill>}</div>
            <Bar label="HP" value={hp} max={companionMaxHp(world, npc)} tone="hp"/>
            <div className="row-note">{place ? '在' + locations[place] + ' · ' : ''}由{world.members.find(m => m.id === leader)?.character?.name ?? '隊伍'}帶領</div>
            <div className="button-row">
              <button type="button" className="light slim" onClick={() => suggest('找' + npcs[npc] + '聊聊')}>交談</button>
              {mine && teammates.map(m => <button key={m.id} type="button" className="light slim"
                onClick={() => suggest('把' + npcs[npc] + '交給' + m.character!.name)}>交給{m.character!.name}</button>)}
              <button type="button" className="light slim" onClick={() => suggest('請' + npcs[npc] + '離隊')}>離隊</button>
            </div>
          </div>
        </li>
      })}</ul>}
      <p className="hint">船團上限 {maxCrew} 人，含玩家。</p>
    </Card>
    {invitable.length > 0 && <Card title="這裡可以邀請" meta={locations[character.place]}>
      <Rows>{invitable.map(npc => <Row key={npc} lead={<Avatar name={npcs[npc]}/>} title={npcs[npc]}
        note={npcRole(world, npc) + (requirement(npc) ? ' · 需要' + requirement(npc) : '')}>
        <button type="button" className="light" onClick={() => suggest('邀請' + npcs[npc] + '加入')}>邀請</button>
      </Row>)}</Rows>
    </Card>}
  </>
}

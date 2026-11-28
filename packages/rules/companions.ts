// Inviting an NPC into the party, and asking one to leave. The dice and the party state live here, never in the narration.
import { fxOf, rankOf } from '../world/talents.ts'
import { locations, npcs } from '../shared/protocol.ts'
import type { NpcId } from '../shared/protocol.ts'
import { islandAt, islands, islandStories } from '../world/sea.ts'
import { queuePaper, setFlag } from '../world/flags.ts'
import { companionIds, companionMaxHp, companionSlots, maxCrew, partyLevel, recruitBlock, recruitable, retryMinutes } from '../world/companions.ts'
import { companionPlace, npcFacts, npcPlace, party } from '../world/village.ts'
import type { Member, World } from '../world/village.ts'
import { stat } from '../world/races.ts'
import { isDown } from './combat.ts'
import type { Result, Roll } from './engine.ts'

const stop = (text: string): Result => ({ text, rejected: true })
const say = (npc: NpcId, line: string) => npcs[npc] + '說：「' + line + '」'

export function recruitCompanion(world: World, actor: Member, npc: NpcId, roll: Roll): Result {
  const c = actor.character!
  const name = npcs[npc]
  const profile = recruitable[npc]
  const blocked = recruitBlock(world, npc)
  if (blocked) return stop(blocked)
  if (!profile) return stop(name + '有自己要走的路，不會加入你們的船團。')

  const place = npcPlace(world, npc)
  if (!place) return stop(name + '目前不在你能找到的地方。')
  if (place !== c.place) return stop(islandAt(place) === islandAt(c.place)
    ? name + '在' + locations[place] + '。先去找到他再邀請。'
    : name + '在' + islands[islandAt(place)].name + '，要航行過去才能見到。')
  if (isDown(world, npc)) return stop(name + '被打倒了，暫時無法交談。')
  if (world.combat?.place === c.place) return stop('戰鬥進行中，等結束後再邀請。')

  const unmet: string[] = []
  if (profile.needsTask && world.islandTasks?.[profile.needsTask]?.stage !== 'done')
    unmet.push('先完成「' + (islandStories[profile.needsTask]?.title ?? islands[profile.needsTask].name) + '」')
  if (profile.minLevel && partyLevel(world) < profile.minLevel)
    unmet.push('隊伍最高等級要到 ' + profile.minLevel + '（目前 ' + partyLevel(world) + '）')
  if (unmet.length) return { text: say(npc, profile.refuse) + '\n（' + name + '還不會跟你們走，條件：' + unmet.join('、') + '。）', minutes: 3 }

  const natural = roll(20)
  const trusted = !!profile.trustTask && world.islandTasks?.[profile.trustTask]?.stage === 'done'
  // Someone the party has beaten before respects their strength.
  const beaten = !!world.defeated?.includes(npc)
  const total = natural + stat(c, 'WIL') + rankOf(c, '說服') + fxOf(c, 'recruit') + (trusted ? 4 : 0) + (beaten ? 4 : 0)
  const success = natural === 20 || (natural !== 1 && total >= profile.dc)
  const check = '說服 D20 ' + natural + '，合計 ' + total + '／' + profile.dc + (trusted ? '（對方信任你們 +4）' : '') +
    (beaten ? '（被你們打倒過，服氣你們 +4）' : '') + '。'
  const record = c.name + '在' + locations[c.place] + '邀請' + name + '加入船團，' + (success ? '對方答應了' : '被婉拒了') + '。'
  world.chronicle = [...(world.chronicle ?? []), record].slice(-12)

  if (!success) {
    ;(world.recruitRetry ??= {})[npc] = world.minute + retryMinutes
    return { text: check + '\n' + say(npc, profile.refuse) + '\n（' + name + '婉拒了邀請，過一陣子再試試。）', minutes: 5 }
  }
  const companion = { leader: actor.id, since: world.minute, hp: companionMaxHp(world, npc), level: partyLevel(world), facts: npcFacts(world, npc) }
  ;(world.companions ??= {})[npc] = companion
  setFlag(world, 'recruited:' + npc)
  queuePaper(world, '【報紙】一支新的海賊團出現了：「' + c.name + '」的船團招募了' + name + '。', world.minute + 12 * 60)
  ;(world.npcFacts ??= {})[npc] = profile.facts
  delete world.recruitRetry?.[npc]
  c.conversingWith = npc
  return {
    text: check + '\n' + say(npc, profile.join) + '\n【' + name + '加入了船團】會跟著' + c.name + '行動，一起上船出海。（夥伴 ' +
      companionIds(world).length + '／' + companionSlots(world) + '，船團共 ' + (party(world).length + companionIds(world).length) + '／' + maxCrew + ' 人）',
    minutes: 5, announce: true,
  }
}

export function dismissCompanion(world: World, npc: NpcId): Result {
  const name = npcs[npc]
  const companion = world.companions?.[npc]
  if (!companion) return stop(name + '不在你們的隊伍裡。')
  if (world.combat) return stop('戰鬥進行中，等結束後再讓' + name + '離隊。')
  const place = companionPlace(world, companion)
  delete world.companions![npc]
  if (!companionIds(world).length) delete world.companions
  // They stay where they were left, with whatever they knew before joining.
  ;(world.npcPlaces ??= {})[npc] = place
  if (companion.facts !== undefined) (world.npcFacts ??= {})[npc] = companion.facts
  const line = recruitable[npc] ? say(npc, recruitable[npc]!.leave) : ''
  return {
    text: (line ? line + '\n' : '') + '【' + name + '離開了船團】留在' + (place ? locations[place] : '這裡') +
      '。想再邀請他，回來找他就好。',
    minutes: 3, announce: true,
  }
}


/** The leader hands a companion over to another player standing on the same spot; the companion then follows the new leader. */
export function handoverCompanion(world: World, actor: Member, npc: NpcId, to: string): Result {
  const name = npcs[npc]
  const companion = world.companions?.[npc]
  if (!companion) return stop(name + '不在你們的隊伍裡。')
  if (companion.leader !== actor.id && party(world).some(m => m.id === companion.leader))
    return stop(name + '現在跟著' + party(world).find(m => m.id === companion.leader)!.character!.name + '，只有他能轉交。')
  const target = party(world).find(m => m.id !== actor.id && m.character!.name === to.trim())
  if (!target) return stop('找不到名叫「' + to + '」的隊友。')
  const place = companionPlace(world, companion)
  if (target.character!.place !== place) return stop(target.character!.name + '不在' + name + '所在的' + (place ? locations[place] : '地點') + '，要在同一地點才能轉交。')
  if (world.combat) return stop('戰鬥進行中，等結束後再轉交' + name + '。')
  companion.leader = target.id
  return {
    text: actor.character!.name + '請' + name + '改跟著' + target.character!.name + '行動。\n【' + name + '現在由' + target.character!.name + '帶領】之後會跟著他移動、上船。',
    minutes: 2, announce: true,
  }
}

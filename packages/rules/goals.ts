// One roll for a story goal, shared by the Summit War (war.ts) and the story arcs (saga.ts): earlier results and
// people on the spot help, a failure hurts, and every failed try teaches something.
import { npcs } from '../shared/protocol.ts'
import type { LocationId, NpcId } from '../shared/protocol.ts'
import { setFlag } from '../world/flags.ts'
import { stat } from '../world/races.ts'
import { npcPlace, party } from '../world/village.ts'
import type { Member, World } from '../world/village.ts'
import { isDown } from './combat.ts'
import { grantXp, maxHP } from './engine.ts'
import type { Roll } from './engine.ts'

type Attribute = 'STR' | 'AGI' | 'CON' | 'PER' | 'INT' | 'WIL'
type Goal = { id: string, title: string, place: LocationId, check: { attr: Attribute, skill: string, dc: number }, done: string, miss: string }

export function attemptGoal(world: World, actor: Member, goal: Goal, options: {
  flag: string, helped: number, allies: NpcId[], xpKey: string,
  /** Extra result for everyone on the spot (pay, reputation). */
  onDone?: (here: Member[]) => string
}, roll: Roll) {
  const c = actor.character!
  const allies = options.allies.filter(npc => npcPlace(world, npc) === goal.place && !isDown(world, npc))
  const help = Math.min(3, allies.length)
  const tries = world.warTries?.[goal.id] ?? 0
  const natural = roll(20)
  const total = natural + stat(c, goal.check.attr) + (c.skillRanks[goal.check.skill] ?? 0) + options.helped + help + tries
  const success = natural === 20 || (natural !== 1 && total >= goal.check.dc)
  const bonuses = [options.helped && '先前的戰果 +' + options.helped, help && allies.slice(0, 3).map(npc => npcs[npc]).join('、') + '在旁 +' + help, tries && '再試 +' + tries].filter(Boolean)
  const line = goal.title + '：D20 ' + natural + '，合計 ' + total + '／' + goal.check.dc + (bonuses.length ? '（' + bonuses.join('，') + '）' : '') + '。'
  if (!success) {
    ;(world.warTries ??= {})[goal.id] = tries + 1
    // Words and handiwork only cost time; everything else happens under fire.
    if (['WIL', 'INT'].includes(goal.check.attr)) return { text: line + goal.miss + '還有時間就再試一次。', minutes: 30 }
    const hurt = Math.min(c.hp, Math.ceil(maxHP(c) * .15))
    c.hp -= hurt
    return { text: line + goal.miss + '你在混亂中受了傷（HP −' + hurt + '）。' + (c.hp ? '還有時間就再試一次。' : '你倒下了，需要同伴救援。'), minutes: 30 }
  }
  setFlag(world, options.flag)
  const here = party(world).filter(m => m.character!.place === goal.place)
  const note = options.onDone?.(here) ?? ''
  const rewards = here.map(m => grantXp(m.character!, 150, options.xpKey)).filter(Boolean)
  return { text: line + goal.done + note + (rewards.length ? '\n' + rewards.join('\n') : ''), minutes: 30, announce: true }
}

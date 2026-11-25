// Rules for the Summit War: picking a side and taking on battlefield goals (packages/world/war.ts).
import { locations } from '../shared/protocol.ts'
import type { Intent } from '../shared/protocol.ts'
import { hasFlag } from '../world/flags.ts'
import { islandAt } from '../world/sea.ts'
import { party } from '../world/village.ts'
import { beli } from '../world/scale.ts'
import type { Member, World } from '../world/village.ts'
import { goalById, sideAllies, warFlag, warGoals, warMinute, warOn, warSides } from '../world/war.ts'
import { attemptGoal } from './goals.ts'
import type { Roll } from './engine.ts'

type WarIntent = Extract<Intent, { kind: 'war' }>
const stop = (text: string) => ({ text, rejected: true as const })
const clock = ([hour, minute]: [number, number]) => String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0')
/** The Marines pay helpers for each goal they reach. */
const marinePay = 50_000

export function resolveWar(world: World, actor: Member, intent: WarIntent, roll: Roll) {
  const c = actor.character!
  if (islandAt(c.place) !== 'marineford') return stop('頂上戰爭的事要在馬林福特才能決定。')
  if (hasFlag(world, 'task:impelDown')) return stop('推進城的大脫獄讓處刑延後了，馬林福特不會開戰。')
  if (world.timeline?.warEnds) return stop('頂上戰爭已經落幕了。')

  if (intent.side) {
    if (world.warSide && world.minute >= warMinute([12, 0])) return stop('戰爭已經開打，現在換邊來不及了。')
    world.warSide = intent.side
    return {
      text: '你們決定' + warSides[intent.side] + '。' + (intent.side === 'none' ? '你們會遠離戰線，只看著戰況發展。' : '開戰後到地圖分頁的「頂上戰爭」看各個戰場目標。'),
      minutes: 2, announce: true,
    }
  }

  const goal = intent.goal ? goalById(intent.goal) ?? warGoals.find(item => item.title === intent.goal) : undefined
  if (!goal) return stop('請說明要完成哪個戰場目標，例如「' + warGoals[0].title + '」。')
  if (!world.warSide || world.warSide === 'none') return stop('先決定站在哪一邊：「協助白鬍子」或「協助海軍」。')
  if (goal.side !== world.warSide) return stop('「' + goal.title + '」是另一方的目標，你們' + warSides[world.warSide] + '。')
  if (!warOn(world) || world.minute < warMinute(goal.from)) return stop('「' + goal.title + '」要到第 72 天 ' + clock(goal.from) + ' 才有機會。')
  if (world.minute >= warMinute(goal.until)) return stop('已經來不及了：「' + goal.title + '」只到 ' + clock(goal.until) + '。')
  if (hasFlag(world, warFlag(goal.id))) return stop('「' + goal.title + '」已經完成了。')
  if (c.place !== goal.place) return stop('要到' + locations[goal.place] + '才能「' + goal.title + '」。')
  const level = Math.max(...party(world).map(m => m.character!.level))
  if (goal.minLevel && level < goal.minLevel)
    return stop('這裡的對手是傳說級的人物，貿然衝上去只會被一擊打飛（建議等級 ' + goal.minLevel + '，隊伍最高等級 ' + level + '）。')

  // Earlier goals open the way, your side's fighters on the spot help, and every failed try teaches you something.
  return attemptGoal(world, actor, goal, {
    flag: warFlag(goal.id), allies: sideAllies[goal.side], xpKey: 'war:' + goal.id,
    helped: (goal.helpedBy ?? []).filter(id => hasFlag(world, warFlag(id))).length * 2,
    onDone: here => {
      if (goal.side !== 'marine') return ''
      for (const m of here) m.character!.money += marinePay
      return '海軍發給在場的每個人 ' + beli(marinePay) + '。'
    },
  }, roll)
}

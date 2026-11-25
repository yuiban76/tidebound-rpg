// Story arcs with their own goals (packages/world/water7.ts) and the sea train between Water 7 and Enies Lobby.
import { islandAt, islands } from '../world/sea.ts'
import { locations } from '../shared/protocol.ts'
import { minuteOf } from '../world/canon.ts'
import { hasFlag } from '../world/flags.ts'
import { stat } from '../world/races.ts'
import { npcPlace, party } from '../world/village.ts'
import type { Member, World } from '../world/village.ts'
import { sagaFlag, sagaGoals } from '../world/water7.ts'
import { attemptGoal } from './goals.ts'
import { grantXp, maxHP } from './engine.ts'
import { isDown } from './combat.ts'
import type { Roll } from './engine.ts'

const stop = (text: string) => ({ text, rejected: true as const })
const when = ([day, hour]: [number, number]) => '第 ' + day + ' 天 ' + String(hour).padStart(2, '0') + ':00'

export function resolveGoal(world: World, actor: Member, name: string, roll: Roll) {
  const c = actor.character!
  const goal = sagaGoals.find(item => item.id === name || item.title === name)
  if (!goal) return stop('沒有叫「' + name + '」的劇情目標。')
  if (hasFlag(world, sagaFlag(goal.id))) return stop('「' + goal.title + '」已經完成了。')
  if (world.minute < minuteOf(goal.from)) return stop('「' + goal.title + '」要到' + when(goal.from) + '才有機會。')
  if (world.minute >= minuteOf(goal.until)) return stop('已經來不及了：「' + goal.title + '」只到' + when(goal.until) + '。')
  if (c.place !== goal.place) return stop('要到' + islands[islandAt(goal.place)].name + '的' + locations[goal.place] + '才能「' + goal.title + '」。')
  const level = Math.max(...party(world).map(m => m.character!.level))
  if (goal.minLevel && level < goal.minLevel)
    return stop('這裡的對手遠超你們目前的實力（建議等級 ' + goal.minLevel + '，隊伍最高等級 ' + level + '）。')
  return attemptGoal(world, actor, goal, {
    flag: sagaFlag(goal.id), allies: goal.allies, xpKey: 'saga:' + goal.id,
    helped: (goal.helpedBy ?? []).filter(flag => hasFlag(world, flag)).length * 2,
    onDone: () => {
      if (!goal.rep) return ''
      const [island, amount] = goal.rep
      const renown = world.renown ??= { marineHeat: 0, islandRep: {} }
      renown.islandRep[island] = (renown.islandRep[island] ?? 0) + amount
      return islands[island].name + '的居民很感謝你們（聲望 +' + amount + '）。'
    },
  }, roll)
}

/** The runaway sea train leaves while the canon chase does: from the CP9 train's departure until midnight. */
export const rocketman = { from: [47, 20] as [number, number], until: [48, 0] as [number, number], place: 'blueStation' as const }
export const rocketmanReady = (world: Pick<World, 'minute'>) =>
  world.minute >= minuteOf(rocketman.from) && world.minute < minuteOf(rocketman.until)

/** Rides the Rocketman to Enies Lobby with the whole party; the party's own ship stays where it is. */
export function rideTrain(world: World, actor: Member, roll: Roll, connected: Set<string>) {
  const c = actor.character!
  if (c.place !== 'blueStation') return stop('海列車要到七水之都的' + locations.blueStation + '搭。')
  if (hasFlag(world, 'ruined:eniesLobby') || world.minute >= minuteOf(rocketman.until))
    return stop('火箭人已經開走了。要去司法島，只能搭自己的船。')
  if (world.minute < minuteOf(rocketman.from))
    return stop('一般班次只到鄰近的島，往司法島的海列車只載世界政府的人。')
  if (npcPlace(world, 'kokoro') !== 'blueStation' || isDown(world, 'kokoro')) return stop('沒有可可蘿，誰也開不動火箭人。')
  const crew = party(world)
  if (crew.some(m => !connected.has(m.id))) return stop('有隊友離線。全隊要一起上車。')
  if (crew.some(m => m.character!.place !== 'blueStation')) return stop('請所有隊友先到' + locations.blueStation + '集合。')
  const lines = ['可可蘿灌下一口酒，拉開火箭人的閘門。這列沒有煞車的海列車衝進了海裡。']
  // Aqua Laguna: the wave hits whoever leaves after 22:00.
  if (world.minute >= minuteOf([47, 22])) {
    const driver = Math.max(...crew.map(m => stat(m.character!, 'AGI') + (m.character!.skillRanks['航海'] ?? 0)))
    const natural = roll(20)
    const safe = natural + driver >= 14
    lines.push('亞誇・拉格娜的巨浪迎面壓下：航海 D20 ' + natural + '，合計 ' + (natural + driver) + '／14，' + (safe ? '你們穩住車身，從浪底鑽了出去！' : '車廂被砸得變形，每個人都受了傷。'))
    if (!safe) for (const m of crew) m.character!.hp = Math.max(1, m.character!.hp - Math.ceil(maxHP(m.character!) * .15))
  }
  const minutes = Math.max(240, minuteOf([48, 1]) - world.minute)
  for (const m of crew) {
    m.character!.place = 'eniesGate'
    m.character!.conversingWith = null
    const xp = grantXp(m.character!, 50, 'island:eniesLobby')
    if (xp) lines.push(xp)
  }
  lines.push('天還沒亮，火箭人撞上了司法島的正門。你們抵達' + locations.eniesGate + '。' + (world.ship ? '你們的船還停在' + locations[world.ship.port] + '。' : ''))
  return { text: lines.join('\n'), minutes, announce: true }
}

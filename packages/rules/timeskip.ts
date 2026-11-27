// The two years after the Summit War (the crew votes to go and train), and haki, which the training teaches.
// Haki ranks live with the skills (skillRanks['武裝色'], ['見聞色']); Conqueror's haki is a flag a few awaken with.
import { hakiSkills, locations } from '../shared/protocol.ts'
import type { HakiSkill } from '../shared/protocol.ts'
import { minuteOf } from '../world/canon.ts'
import { reunion, reunionMinute, warOver } from '../world/newworld.ts'
import { stat } from '../world/races.ts'
import { companionIds, companionMaxHp } from '../world/companions.ts'
import { party } from '../world/village.ts'
import type { Character, World } from '../world/village.ts'
import { grantXp, maxHP, maxSTA, xpToNext } from './engine.ts'
import type { Roll } from './engine.ts'

/** Where the crew meets again. */
export const reunionPlace = 'shakkyBar' as const
export const hakiRank = (c: Pick<Character, 'skillRanks'>, skill: HakiSkill) => c.skillRanks[skill] ?? 0
export const isHaki = (skill: string): skill is HakiSkill => (hakiSkills as readonly string[]).includes(skill)

/** Why the crew cannot set out to train right now, or undefined when it can. */
export function timeskipBlock(world: World) {
  if (world.minute < minuteOf(warOver)) return '要等頂上戰爭結束（第 72 天 20:00）之後，才能出發修行兩年。'
  // The jump lands two hours before the reunion.
  if (world.minute >= reunionMinute - 120) return '兩年已經過去了。'
  if (world.combat) return '戰鬥結束後才能出發修行。'
}

/**
 * Two years of training for one character: at least five levels more (level 14 at the very least), armament and
 * observation haki at rank 1, and Conqueror's haki for the few whose will is strong enough (D20 + WIL ≥ 21).
 */
export function train(c: Character, roll: Roll) {
  if (c.haki?.trained) return ''
  const before = c.level
  const target = Math.max(c.level + 5, 14)
  while (c.level < target) grantXp(c, xpToNext(c.level) - c.xp)
  for (const skill of hakiSkills) c.skillRanks[skill] = Math.max(1, c.skillRanks[skill] ?? 0)
  const natural = roll(20)
  const will = stat(c, 'WIL')
  const awakened = natural + will >= 21
  c.haki = { ...c.haki, trained: true, ...(awakened && { conqueror: true }) }
  c.hp = maxHP(c)
  c.sta = maxSTA(c)
  return c.name + '修行了兩年：等級 ' + before + ' → ' + c.level + '，學會了武裝色與見聞色霸氣。' +
    '霸王色 D20 ' + natural + '＋意志 ' + will + '＝' + (natural + will) + '／21，' + (awakened ? '覺醒了霸王色霸氣！' : '沒有覺醒霸王色。')
}

/** The crew sets out: the calendar jumps to the reunion, everyone trains, and the ship waits at Sabaody, coated. */
export function timeskip(world: World, roll: Roll) {
  const lines = ['草帽一夥在馬林福特立下了兩年後的約定。你們也各自出發，去變得更強。', '——兩年後——']
  world.minute = Math.max(world.minute, reunionMinute - 120)
  for (const member of party(world)) {
    const c = member.character!
    c.place = reunionPlace
    c.conversingWith = null
    lines.push(train(c, roll))
  }
  for (const npc of companionIds(world)) world.companions![npc]!.hp = companionMaxHp(world, npc)
  if (world.ship) {
    world.ship.port = 'sabaodyGrove'
    world.ship.hull = 100
    world.ship.coated = true
    lines.push('你們的船一直停在夏波帝，船體修好了，也鍍好了膜，隨時可以潛向魚人島。')
  }
  delete world.sailing
  lines.push('你們在' + locations[reunionPlace] + '重聚，日子是第 ' + reunion[0] + ' 天。')
  return lines.filter(Boolean).join('\n')
}

/**
 * Whoever reaches the two years another way (waiting them out, or joining the party afterwards) has trained too.
 * The roll is the character's own, so the same character always gets the same result.
 */
export function catchUpTraining(world: World) {
  if (world.minute < reunionMinute) return []
  return party(world).filter(m => !m.character!.haki?.trained).map(m => {
    let seed = 7
    for (const char of m.id) seed = (seed * 31 + char.codePointAt(0)!) >>> 0
    return train(m.character!, sides => seed % sides + 1)
  })
}

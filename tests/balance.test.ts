import assert from 'node:assert/strict'
import { test } from 'node:test'
import { attackCheck, defense, levelDamage, levelDefense, levelHit, makeCharacter, maxHP, maxSTA } from '../packages/rules/engine.ts'
import { scale } from '../packages/world/scale.ts'
import { npcFoe } from '../packages/world/foes.ts'
import type { NpcId } from '../packages/shared/protocol.ts'
import { character } from './fixtures.ts'

// A seeded Monte Carlo of the combat rules: N identical sword fighters (STR 4, AGI 3, CON 3) using power attacks while
// they have STA, against one NPC from each tier. It keeps the level curve honest: levels must matter, high tiers must stay gated.
const tierNpc: Record<number, NpcId> = { 2: 'igaram', 3: 'bellamy', 4: 'arlong', 5: 'moria', 6: 'whitebeard' }

function seeded(seed: number) {
  let s = seed >>> 0
  return (sides: number) => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return 1 + Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * sides)
  }
}

function winRate(players: number, level: number, tier: number, trials = 500) {
  const roll = seeded(tier * 1000 + level * 10 + players)
  let wins = 0
  for (let trial = 0; trial < trials; trial++) {
    const foe = npcFoe(tierNpc[tier], 0)
    const team = Array.from({ length: players }, () => {
      const c = makeCharacter(character('旅人'))
      c.level = level
      c.hp = maxHP(c)
      c.sta = maxSTA(c)
      return c
    })
    for (let round = 0; round < 40 && foe.hp > 0 && team.some(c => c.hp > 0); round++) {
      for (const c of team.filter(member => member.hp > 0)) {
        const power = c.sta >= 2
        if (power) c.sta -= 2
        foe.hp -= attackCheck(roll, {
          attr: c.stats.STR, skill: c.skillRanks['劍術'] + levelHit(c.level), def: foe.def, die: 6,
          bonus: (power ? 2 : 0) + levelDamage(c.level), armor: foe.armor,
        }).damage
      }
      if (foe.hp <= 0) break
      const alive = team.filter(member => member.hp > 0)
      const target = alive[roll(alive.length) - 1]
      const natural = roll(20)
      if (natural !== 1 && natural + foe.attack >= defense(target.stats.AGI, 1, levelDefense(target.level))) {
        const dice = [roll(foe.die)]
        if (natural === 20) dice.push(roll(foe.die))
        target.hp -= (dice.reduce((a, b) => a + b, 0) + foe.bonus) * scale
      }
    }
    if (foe.hp <= 0) wins++
  }
  return wins / trials
}

test('等級會讓戰鬥變強：等級越高，同樣的對手越好打', () => {
  for (const [players, tier] of [[1, 3], [2, 4], [4, 5]] as const) {
    const low = winRate(players, 2, tier)
    const mid = winRate(players, 6, tier)
    const high = winRate(players, 12, tier)
    assert.ok(low <= mid && mid <= high, `${players} 人 vs 第 ${tier} 階：${low}／${mid}／${high}`)
    assert.ok(high - low > .3, `${players} 人 vs 第 ${tier} 階的等級影響太小：${low}→${high}`)
  }
})

test('強度門檻：低等級打不過高階對手，足夠的等級與人數才有勝算', () => {
  assert.ok(winRate(1, 1, 3) < .1, '單人一級不該打贏第 3 階')
  assert.ok(winRate(1, 6, 3) > .65, '單人六級該能打贏第 3 階')
  assert.ok(winRate(2, 2, 4) < .25, '兩人二級不該打贏第 4 階')
  const equal = winRate(2, 5, 4)
  assert.ok(equal > .4 && equal < .9, '兩人五級打第 4 階應是一場硬仗：' + equal)
  assert.equal(winRate(4, 1, 6), 0, '一級隊伍不可能打贏第 6 階')
  assert.ok(winRate(2, 4, 5) < .05, '兩人四級不該打贏第 5 階')
  assert.ok(winRate(4, 8, 5) > .85, '四人八級該能打贏第 5 階')
  assert.ok(winRate(4, 12, 6) > .4, '四人十二級才有機會對抗第 6 階')
})

test('回復量跟得上血量：繃帶隨等級成長', async () => {
  const { bandageHeal } = await import('../packages/rules/engine.ts')
  const c = makeCharacter(character('醫'))
  assert.equal(bandageHeal(c, 1), 4 * scale)
  assert.ok(bandageHeal(c, 9) > bandageHeal(c, 1))
})

// General synchronous-round combat (spec §7): every NPC can be fought, sea encounters use the same rules.
// The rules core rolls every die; the narrator only describes the committed result.
import { locations, npcs } from '../shared/protocol.ts'
import type { AttackStyle, NpcId } from '../shared/protocol.ts'
import { npcFoe, tierNames, tierXp } from '../world/foes.ts'
import { crewmates } from '../world/crews.ts'
import type { Foe } from '../world/foes.ts'
import { boatYard, islandAt } from '../world/sea.ts'
import { raceDefense, raceHit, stat, traitOf } from '../world/races.ts'
import { dressingOf } from '../world/skills.ts'
import { masteryOf, npcFacts, npcPlace, npcsAt, party, paths } from '../world/village.ts'
import type { Character, Combat, CombatChoice, Member, World } from '../world/village.ts'
import { bossDefeats } from '../world/canon.ts'
import { fruitDamage, fruits, isLogia } from '../world/fruits.ts'
import { offerFruit } from './fruits.ts'
import { applyEffect } from '../world/timeline.ts'
import { scale } from '../world/scale.ts'
import { tierDamage, tierHit, tierOf } from '../world/forge.ts'
import { attackCheck, bandageHeal, defense, grantXp, levelDamage, levelDefense, levelHit, maxHP } from './engine.ts'
import type { Result, Roll } from './engine.ts'
import { finishVoyage } from './sailing.ts'
import { alliesAt, companionByName, companionFight, companionMaxHp, hurtCompanion, isCompanion, partyLevel, recruitable } from '../world/companions.ts'

const stop = (text: string): Result => ({ text, rejected: true })

/** STA cost and bonuses of each attack style (spec §7.4). Flurry is two blows at −2 each. */
export const styles: Record<AttackStyle, { label: string, sta: number, hit: number, damage: number }> = {
  normal: { label: '普通攻擊', sta: 0, hit: 0, damage: 0 },
  power: { label: '強力攻擊', sta: 2, hit: 0, damage: 2 },
  special: { label: '基礎特殊招式', sta: 3, hit: 1, damage: 3 },
  advanced: { label: '進階招式', sta: 5, hit: 2, damage: 5 },
  flurry: { label: '高強度連續攻擊', sta: 7, hit: -2, damage: 0 },
}

function weaponOf(c: Character) {
  const table = {
    fist: [4, '格鬥', stat(c, 'STR')], sword: [6, '劍術', stat(c, 'STR')],
    spear: [8, '長兵器', stat(c, 'STR')], musket: [8, '射擊', stat(c, 'PER')],
  } as const
  return table[c.weapon]
}

/** Resolves a self-made technique to its cost tier; an unknown name is not usable. */
function styleOf(c: Character, choice: Extract<CombatChoice, { kind: 'attack' }>): AttackStyle | undefined {
  if (choice.technique) return c.techniques.find(move => move.name === choice.technique)?.style
  return choice.style ?? 'normal'
}

const standing = (combat: Combat) => combat.foes.filter(foe => !foe.down && !foe.surrendered)

function findFoe(combat: Combat, target?: string) {
  const alive = standing(combat)
  if (!target) return alive[0]
  const byId = alive.find(foe => foe.npc === target)
  if (byId) return byId
  return alive.find(foe => foe.name === target) ?? alive.find(foe => foe.name.includes(target) || target.includes(foe.name))
}

/** A named NPC on the actor's spot who can be attacked right now. */
function npcTarget(world: World, c: Character, target?: string): NpcId | string {
  // The AI classifier sometimes names the target by its code ("usopp") instead of 「騙人布」.
  if (target && Object.hasOwn(npcs, target)) target = npcs[target as NpcId]
  const mate = target ? companionByName(world, target) : undefined
  if (mate && npcPlace(world, mate) === c.place) return npcs[mate] + '是你的夥伴，不能攻擊。'
  const here = npcsAt(world, c.place).filter(npc => !isDown(world, npc) && !isCompanion(world, npc))
  if (!here.length) return '這裡沒有可以攻擊的對象。'
  // An unnamed attack goes to whoever the character is talking to.
  if (!target && c.conversingWith && here.includes(c.conversingWith)) return c.conversingWith
  if (!target) return here.length === 1 ? here[0] : '請說明要攻擊誰：' + here.map(npc => npcs[npc]).join('、') + '。'
  const found = here.find(npc => npcs[npc] === target) ?? here.find(npc => npcs[npc].includes(target) || target.includes(npcs[npc]))
  if (found) return found
  const elsewhere = (Object.keys(npcs) as NpcId[]).find(npc => npcs[npc] === target)
  return elsewhere && npcPlace(world, elsewhere) ? npcs[elsewhere] + '不在這裡。' : '這裡沒有叫「' + target + '」的人。'
}

export const isDown = (world: Pick<World, 'npcDown' | 'minute'>, npc: NpcId) => (world.npcDown?.[npc] ?? 0) > world.minute

function useBandage(world: World, actor: Member, target?: string) {
  const c = actor.character!
  const mate = target ? companionByName(world, target) : undefined
  if (mate && !party(world).some(m => m.character!.name === target)) {
    const sheet = world.companions![mate]!
    if (npcPlace(world, mate) !== c.place) return '找不到在你身邊、名叫「' + target + '」的隊友。'
    const dressing = dressingOf(c)
    if (!dressing) return '你的背包裡沒有繃帶或草藥。'
    if (sheet.hp >= companionMaxHp(world, mate)) return npcs[mate] + '沒有受傷。'
    if (!--c.inventory[dressing]) delete c.inventory[dressing]
    sheet.hp = Math.min(companionMaxHp(world, mate), sheet.hp + bandageHeal(c, partyLevel(world)))
    if (world.npcDown?.[mate]) delete world.npcDown[mate]
    return { text: c.name + '替' + npcs[mate] + '包紮，目前 HP ' + sheet.hp + '。' }
  }
  const patient = target ? party(world).find(m => m.character!.name === target)?.character : c
  if (!patient || patient.place !== c.place) return '找不到在你身邊、名叫「' + target + '」的隊友。'
  const dressing = dressingOf(c)
  if (!dressing) return '你的背包裡沒有繃帶或草藥。'
  if (patient.hp === maxHP(patient)) return patient.name + '沒有受傷。'
  if (!--c.inventory[dressing]) delete c.inventory[dressing]
  patient.hp = Math.min(maxHP(patient), patient.hp + bandageHeal(c, patient.level))
  return { text: (patient === c ? c.name + '替自己包紮' : c.name + '替' + patient.name + '包紮') + '，目前 HP ' + patient.hp + '。' }
}

/** A named NPC as a foe, with what the world has already done to them (a lost fruit). */
function makeFoe(world: World, npc: NpcId): Foe {
  const foe = npcFoe(npc, world.minute)
  if (world.fruitLost?.[npc]) { delete foe.logia; delete foe.weak }
  return foe
}

/** Starts a land fight against one named NPC and their crew; every standing party member on the spot joins. */
function startFight(world: World, place: Character['place'], foes: Foe[]): Combat {
  const participants = party(world).filter(m => m.character!.place === place && m.character!.hp > 0).map(m => m.id)
  return world.combat = { round: 1, place, participants, foes, choices: {} }
}

/** Creates a sea fight that interrupts a voyage; the whole party is aboard. */
export function startSeaFight(world: World, foes: Foe[], sea: NonNullable<Combat['sea']>) {
  const place = world.ship!.port
  world.combat = { round: 1, place, participants: party(world).filter(m => m.character!.hp > 0).map(m => m.id), foes, choices: {}, sea }
}

export function resolveCombatAction(world: World, actor: Member, choice: CombatChoice, roll: Roll, connected: Set<string>): Result {
  const c = actor.character!
  let combat = world.combat
  let started = false
  let rally = ''
  if (!combat) {
    if (choice.kind === 'useItem') {
      if (!/繃帶|草藥/.test(choice.item)) return stop('目前只有繃帶或草藥能在這裡使用。')
      const used = useBandage(world, actor, choice.target)
      return typeof used === 'string' ? stop(used) : { text: used.text, minutes: 5 }
    }
    if (choice.kind === 'negotiate') return stop('目前沒有需要交涉的衝突。想和人談，可以直接找對方聊天。')
    if (choice.kind !== 'attack') return stop('目前沒有進行中的戰鬥。')
    const target = npcTarget(world, c, choice.target)
    if (!(target in npcs)) return stop(target)
    // Crew battle: whoever fights beside the target on this spot (or sails with its captain) joins in.
    const band = crewmates(world, target as NpcId, c.place)
    const foes = [makeFoe(world, target as NpcId), ...band.npcs.map(npc => makeFoe(world, npc)), ...band.grunts]
    combat = startFight(world, c.place, foes)
    started = true
    rally = foes.length > 1 && band.crew ? band.crew.name + '全員迎戰！' + foes.slice(1).map(foe => foe.name).join('、') + '也加入了戰鬥。\n' : ''
  }
  if (!combat.participants.includes(actor.id)) {
    if (c.place !== combat.place || c.hp <= 0) return stop('你沒有參與當前戰鬥。')
    combat.participants.push(actor.id)
  }
  if (combat.participants.some(id => !connected.has(id))) return stop('有參戰角色離線，戰鬥等待重連。')
  if (combat.choices[actor.id]) return stop('你已提交這一回合的行動。')

  const invalid = validate(combat, c, choice)
  if (invalid) {
    // An invalid opening move never starts the fight.
    if (started) delete world.combat
    return stop(invalid)
  }
  combat.choices[actor.id] = choice
  const opening = started && combat.foes[0].npc
    ? c.name + '向' + combat.foes[0].name + '（' + tierNames[combat.foes[0].tier] + '）出手了！\n' + rally : ''
  if (combat.participants.some(id => !combat.choices[id]))
    return { text: opening + '已鎖定第 ' + combat.round + ' 回合指令。等待其他參戰者。', announce: !!opening }
  return resolveRound(world, combat, roll, opening)
}

function validate(combat: Combat, c: Character, choice: CombatChoice) {
  if (choice.kind === 'attack') {
    const style = styleOf(c, choice)
    if (!style) return '你還沒有名為「' + choice.technique + '」的招式。可以在狀態欄的「招式」建立。'
    if (c.sta < styles[style].sta) return styles[style].label + '需要 ' + styles[style].sta + ' STA，你目前只有 ' + c.sta + '。'
    if (c.weapon === 'musket' && !c.loaded) return '火槍需要先裝填。'
    if (!findFoe(combat, choice.target)) return '找不到名叫「' + choice.target + '」的對手。'
  }
  if (choice.kind === 'reload' && (c.weapon !== 'musket' || c.loaded || !c.inventory['火槍彈藥'])) return '目前沒有可裝填的火槍或彈藥。'
  if (choice.kind === 'useItem') {
    const tool = soakTool(choice.item)
    if (tool) {
      if (!c.inventory[tool.label]) return '你的背包裡沒有' + tool.label + '。'
      if (!combat.foes.some(foe => !foe.down && !foe.surrendered && foe.weak?.includes(tool.weakness))) return '這場戰鬥裡沒有' + tool.label + '派得上用場的對手。'
    } else if (!/繃帶|草藥/.test(choice.item) || !dressingOf(c)) return '戰鬥中只能使用背包裡的繃帶、草藥、水壺或衝擊貝。'
  }
  if (choice.kind === 'negotiate' && !findFoe(combat, choice.target)) return '找不到可以交涉的對手。'
}

function resolveRound(world: World, combat: Combat, roll: Roll, opening: string): Result {
  const lines = [opening + '第 ' + combat.round + ' 回合']
  const fighters = world.members.filter(m => combat.participants.includes(m.id))
    .sort((a, b) => stat(b.character!, 'AGI') - stat(a.character!, 'AGI'))
  const guarding = new Set<string>()
  const lastHit = new Map<string, Member>()
  let escaped = false

  // Movement and support first; then attacks in speed order (spec §7.5).
  for (const member of fighters) {
    const fighter = member.character!
    const choice = combat.choices[member.id]
    if (choice.kind === 'guard') { guarding.add(member.id); lines.push(fighter.name + '擺出防守架勢。') }
    if (choice.kind === 'reload') {
      fighter.inventory['火槍彈藥']--
      fighter.loaded = true
      lines.push(fighter.name + '裝填火槍。')
    }
    if (choice.kind === 'useItem' && soakTool(choice.item)) lines.push(useSoak(combat, fighter, soakTool(choice.item)!, choice.target))
    else if (choice.kind === 'useItem') {
      const used = useBandage(world, member, choice.target)
      lines.push(typeof used === 'string' ? fighter.name + '想用繃帶，但' + used : used.text)
    }
    if (choice.kind === 'flee') {
      if (combat.sea) {
        // The best sailor steers; a merfolk or long-leg aboard helps the boat slip away.
        const navigator = Math.max(...party(world).map(m => stat(m.character!, 'INT') + (m.character!.skillRanks['航海'] ?? 0))) +
          Math.max(0, ...party(world).map(m => traitOf(m.character!).seaEscape ?? 0))
        const dc = 12 + Math.max(...standing(combat).map(foe => foe.tier))
        const natural = roll(20)
        escaped = natural + navigator >= dc
        lines.push('全速甩開對手：航海 D20 ' + natural + '＋' + navigator + '＝' + (natural + navigator) + '／' + dc + '，' + (escaped ? '成功脫離！' : '沒能甩開。'))
        if (escaped) break
      } else {
        const exit = paths[combat.place][0]
        fighter.place = exit
        fighter.conversingWith = null
        lines.push(fighter.name + '撤到' + locations[exit] + '。')
      }
    }
  }
  if (escaped) {
    delete world.combat
    const voyage = finishVoyage(world, combat.sea!)
    return { text: [...lines, voyage.text].join('\n'), minutes: 1 + voyage.minutes, announce: true }
  }

  for (const member of fighters) {
    const fighter = member.character!
    const choice = combat.choices[member.id]
    if (fighter.place !== combat.place || fighter.hp <= 0) continue
    if (choice.kind === 'negotiate') {
      const foe = findFoe(combat, choice.target)
      if (!foe) continue
      if (foe.tier >= 4) { lines.push(foe.name + '對' + fighter.name + '的勸說不為所動。'); continue }
      const dc = 10 + foe.tier * 3
      const natural = roll(20)
      const total = natural + stat(fighter, 'WIL') + (fighter.skillRanks['說服'] ?? 0) + (traitOf(fighter).negotiate ?? 0)
      const success = natural !== 1 && total >= dc
      lines.push(fighter.name + '勸' + foe.name + '住手：說服 D20 ' + natural + '，合計 ' + total + '／' + dc + '，' + (success ? foe.name + '收手了。' : '對方不肯罷休。'))
      if (success) foe.surrendered = true
      continue
    }
    if (choice.kind !== 'attack') continue
    const style = styleOf(fighter, choice)!
    const spec = styles[style]
    fighter.sta -= spec.sta
    if (fighter.weapon === 'musket') fighter.loaded = false
    const [die, skill, attr] = weaponOf(fighter)
    const move = choice.technique ? '「' + choice.technique + '」' : spec.label === '普通攻擊' ? '攻擊' : spec.label
    for (let blow = 0; blow < (style === 'flurry' ? 2 : 1); blow++) {
      const foe = findFoe(combat, choice.target) ?? standing(combat)[0]
      if (!foe) break
      const solid = canHurt(foe, fighter)
      if (solid === false) {
        lines.push(fighter.name + '的' + move + '穿過了' + foe.name + '的身體，自然系的能力讓攻擊沒有效果。' + weakHint(foe))
        continue
      }
      if (solid === 'seastone') lines.push(fighter.name + '握著海樓石十手，' + foe.name + '的身體在這一擊中變得實在。')
      const hit = attackCheck(roll, { attr, skill: (fighter.skillRanks[skill] ?? 0) + spec.hit + levelHit(fighter.level) + tierHit(tierOf(fighter)) + raceHit(fighter, !!combat.sea) + (masteryOf(fighter)?.hit ?? 0), def: foe.def, die, bonus: spec.damage + levelDamage(fighter.level) + tierDamage(tierOf(fighter)) + fruitDamage(fighter.fruit, fighter.level) + (traitOf(fighter).damage ?? 0) + (masteryOf(fighter)?.damage ?? 0), armor: foe.armor })
      foe.hp = Math.max(0, foe.hp - hit.damage)
      lines.push(fighter.name + '對' + foe.name + '使出' + move + '，D20 ' + hit.natural + '，合計 ' + hit.total + '／' + foe.def +
        (hit.hit ? '，傷害 ' + hit.damage + '（武器骰 ' + hit.dice.join('+') + '，數值×' + scale + '）。' + foe.name + ' HP ' + foe.hp + '／' + foe.maxHp + '。' : '，未命中。'))
      if (!foe.hp) {
        foe.down = true
        lastHit.set(foe.id, member)
        lines.push(foe.name + '倒下了。')
      }
    }
  }
  allyStrikes(world, combat, roll, lines)
  if (!standing(combat).length) return victory(world, combat, lines, lastHit)

  // NPC turn: every foe still standing strikes a random fighter on the spot.
  for (const foe of standing(combat)) {
    // Companions on the spot draw fire too, so a foe may pick a player or an NPC companion.
    const targets: Victim[] = [
      ...fighters.filter(m => m.character!.place === combat.place && m.character!.hp > 0).map(m => {
        const x = m.character!
        return {
          // A fruit user cannot swim: at sea a fall overboard costs defense. A logia body halves blows from ordinary foes.
          name: x.name, def: defense(stat(x, 'AGI'), x.skillRanks['閃避'] ?? 0, (guarding.has(m.id) ? 2 : 0) + levelDefense(x.level) - (x.fruit && combat.sea ? 2 : 0) + raceDefense(x, !!combat.sea)),
          hurt: (damage: number) => { x.hp = Math.max(0, x.hp - (isLogia(x.fruit) && !foe.logia ? Math.ceil(damage / 2) : damage)); return x.hp ? undefined : x.name + '倒下，仍可接受救援。' },
        }
      }),
      ...alliesAt(world, combat.place).flatMap(npc => {
        const profile = recruitable[npc]
        return profile ? [{
          name: npcs[npc], def: companionFight(world, npc).def,
          hurt: (damage: number) => hurtCompanion(world, npc, damage) ? npcs[npc] + '倒下了，需要休息一陣子。' : undefined,
        }] : []
      }),
    ]
    if (!targets.length) break
    const victim = targets.length === 1 ? targets[0] : targets[roll(targets.length) - 1]
    const def = victim.def
    const natural = roll(20)
    const total = natural + foe.attack
    const hit = natural !== 1 && total >= def
    const dice = hit ? [roll(foe.die)] : []
    if (hit && natural === 20) dice.push(roll(foe.die))
    const damage = hit ? Math.max(0, dice.reduce((a, b) => a + b, 0) + foe.bonus) * scale : 0
    const fallen = victim.hurt(damage)
    lines.push(foe.name + '反擊' + victim.name + '，D20 ' + natural + '，合計 ' + total + '／' + def + (hit ? '，傷害 ' + damage + '。' : '，未命中。'))
    if (fallen) lines.push(fallen)
  }

  for (const foe of combat.foes) if (foe.exposed) foe.exposed--
  combat.participants = combat.participants.filter(id => {
    const fighter = world.members.find(m => m.id === id)!.character!
    return fighter.hp > 0 && fighter.place === combat.place
  })
  combat.choices = {}
  combat.round++
  if (!combat.participants.length) return defeat(world, combat, lines)
  return { text: lines.join('\n'), announce: true, minutes: 1 }
}

/** Items that make a logia body solid for a few rounds, and how long it lasts. */
const soakTools = [
  { label: '水壺', words: /水壺|潑水/, weakness: 'water' as const, rounds: 3, verb: '把水潑向' },
  { label: '衝擊貝', words: /衝擊貝/, weakness: 'dial' as const, rounds: 2, verb: '用衝擊貝震向' },
]
const soakTool = (item: string) => soakTools.find(tool => tool.words.test(item))

/** Uses a water-skin or dial on the named foe (or the first standing foe it works on); everyone's blows then land. */
function useSoak(combat: Combat, fighter: Character, tool: (typeof soakTools)[number], target?: string) {
  const foe = (target ? findFoe(combat, target) : undefined) ?? standing(combat).find(f => f.weak?.includes(tool.weakness))
  if (!foe || !fighter.inventory[tool.label]) return fighter.name + '想用' + tool.label + '，但沒有派得上用場的對手。'
  fighter.inventory[tool.label]--
  if (!fighter.inventory[tool.label]) delete fighter.inventory[tool.label]
  if (!foe.weak?.includes(tool.weakness)) return fighter.name + tool.verb + foe.name + '，沒有任何效果。'
  const rounds = tool.rounds + (tool.weakness === 'dial' ? traitOf(fighter).dialRounds ?? 0 : 0)
  foe.exposed = Math.max(foe.exposed ?? 0, rounds)
  return fighter.name + tool.verb + foe.name + '！他的身體變得實在，接下來 ' + rounds + ' 回合大家的攻擊都打得到。'
}

/** Whether a blow can hurt this foe: true, false, or 'seastone' when the attacker's sea-stone jitte is what makes it land. */
function canHurt(foe: Foe, fighter: Character): boolean | 'seastone' {
  if (!foe.logia || (foe.exposed ?? 0) > 0 || isLogia(fighter.fruit)) return true
  return foe.weak?.includes('seastone') && !!fighter.inventory['海樓石十手'] ? 'seastone' : false
}

/** A nudge toward whatever works on this logia foe, so a stuck party always knows there is a way (or that there is none yet). */
function weakHint(foe: Foe) {
  if (!foe.weak?.length) return '\n（這種對手現在的你們碰不到，先避開，等學會別的本事再說。）'
  const tips = {
    water: '沙一遇水就會變重，也許能用水壺讓他現形（那諾哈娜的雜貨攤有賣）。',
    seastone: '海樓石能壓住惡魔果實的力量（羅格鎮的一本松武器店有賣海樓石十手）。',
    dial: '空島的衝擊貝也許能震散雷身（天使海灘的貝殼攤有賣）。',
  }
  return '\n（' + foe.weak.map(w => tips[w]).join('') + '）'
}

/** Something a foe can hit: a player or an NPC companion. `hurt` applies the damage and returns a line when the target falls. */
type Victim = { name: string, def: number, hurt: (damage: number) => string | undefined }

/** Companions on the spot strike the weakest standing foe once each, after the players; they never need orders. */
function allyStrikes(world: World, combat: Combat, roll: Roll, lines: string[]) {
  for (const npc of alliesAt(world, combat.place)) {
    const foe = standing(combat).sort((a, b) => a.hp - b.hp)[0]
    if (!recruitable[npc] || !foe) return
    const fight = companionFight(world, npc)
    if (foe.logia && !(foe.exposed ?? 0)) {
      lines.push(npcs[npc] + '的' + fight.move + '穿過了' + foe.name + '的身體，自然系的能力讓攻擊沒有效果。')
      continue
    }
    const hit = attackCheck(roll, { attr: fight.attr, skill: fight.skill, def: foe.def, die: fight.die, bonus: fight.bonus, armor: foe.armor })
    foe.hp = Math.max(0, foe.hp - hit.damage)
    lines.push(npcs[npc] + '使出' + fight.move + '攻擊' + foe.name + '，D20 ' + hit.natural + '，合計 ' + hit.total + '／' + foe.def +
      (hit.hit ? '，傷害 ' + hit.damage + '。' + foe.name + ' HP ' + foe.hp + '／' + foe.maxHp + '。' : '，未命中。'))
    if (!foe.hp) {
      foe.down = true
      lines.push(foe.name + '倒下了。')
    }
  }
}

/** Loot, bounty, XP and reputation once every foe is down or has given up (spec §9: reputations stay separate). */
function victory(world: World, combat: Combat, lines: string[], lastHit: Map<string, Member>): Result {
  delete world.combat
  const winners = world.members.filter(m => combat.participants.includes(m.id) && m.character!.place === combat.place && m.character!.hp > 0)
  const share = (total: number) => winners.length ? Math.floor(total / winners.length) : 0
  const beaten = combat.foes.filter(foe => foe.down)
  const island = islandAt(combat.place)
  const renown = world.renown ??= { marineHeat: 0, islandRep: {} }
  lines.push('戰鬥結束。')

  const loot = beaten.reduce((sum, foe) => sum + foe.loot, 0)
  const reward = beaten.filter(foe => ['pirate', 'bandit', 'tyrant'].includes(foe.faction)).reduce((sum, foe) => sum + (foe.bounty ?? 0), 0)
  if (loot + reward && winners.length) {
    for (const m of winners) m.character!.money += share(loot + reward)
    lines.push('戰利品' + (reward ? '與賞金' : '') + '共 ' + (loot + reward).toLocaleString('en-US') + ' 貝里，每人分得 ' + share(loot + reward).toLocaleString('en-US') + '。')
  }
  for (const foe of combat.foes) {
    if (['marine', 'government'].includes(foe.faction) && (foe.down || foe.surrendered)) {
      renown.marineHeat = Math.min(100, renown.marineHeat + 5 * (foe.tier + 1))
      for (const m of winners) m.character!.bounty += (foe.tier + 1) ** 2 * 1_000_000
    }
    if (foe.faction === 'civilian') renown.islandRep[island] = (renown.islandRep[island] ?? 0) - 10
    if (['pirate', 'bandit', 'tyrant'].includes(foe.faction) && foe.down) renown.islandRep[island] = (renown.islandRep[island] ?? 0) + 5
  }
  if (combat.foes.some(foe => ['marine', 'government'].includes(foe.faction)))
    lines.push('你們對海軍／世界政府動了手：海軍注意度 ' + renown.marineHeat + '／100，懸賞金提高了。')
  if (combat.foes.some(foe => foe.faction === 'civilian'))
    lines.push('欺負平民的事傳開了，' + locations[combat.place] + '一帶的人對你們的評價變差。')

  for (const foe of combat.foes) {
    if (!foe.down && !foe.surrendered) continue
    for (const m of winners) {
      const xp = grantXp(m.character!, foe.surrendered ? Math.floor(tierXp[foe.tier] / 2) : tierXp[foe.tier], 'defeat:' + (foe.npc ?? foe.name))
      if (xp) lines.push(xp)
    }
    if (!foe.npc) continue
    const npc = foe.npc
    const by = lastHit.get(foe.id) ?? winners[0]
    if (foe.down) {
      ;(world.npcDown ??= {})[npc] = world.minute + 480
      if (!(world.defeated ??= []).includes(npc)) world.defeated.push(npc)
      const [known, ...recent] = npcFacts(world, npc).split(' 最近：')
      ;(world.npcFacts ??= {})[npc] = [known, ...recent.slice(-2), '被' + (by?.character!.name ?? '旅人') + '一行人打倒過'].join(' 最近：')
    }
    offerFruit(world, foe, by, lines)
    const boss = foe.down ? bossDefeats[npc] : undefined
    if (boss) {
      applyEffect(world, boss.effect)
      lines.push(boss.text)
    }
  }
  if (combat.sea) {
    const voyage = finishVoyage(world, combat.sea)
    return { text: [...lines, voyage.text].join('\n'), announce: true, minutes: 1 + voyage.minutes }
  }
  return { text: lines.join('\n'), announce: true, minutes: 1 }
}

/** Everyone on the party side is down or gone. HP 0 is never death (spec §7.3). */
function defeat(world: World, combat: Combat, lines: string[]): Result {
  delete world.combat
  // Only fighters left lying on the spot can be robbed; everyone who retreated got away clean.
  const downed = party(world).filter(m => m.character!.place === combat.place && m.character!.hp <= 0)
  const robbers = combat.foes.some(foe => ['pirate', 'bandit'].includes(foe.faction) && !foe.down && !foe.surrendered)
  if (!downed.length) lines.push('你們脫離了戰鬥。')
  else if (robbers) {
    for (const m of downed) m.character!.money -= Math.floor(m.character!.money * .3)
    lines.push('對手搶走了你們身上三成的貝里後揚長而去。')
  } else lines.push('對手沒有追擊，留下倒地的你們離開了。')
  if (combat.sea) {
    const voyage = finishVoyage(world, combat.sea)
    lines.push(boatYard.name + '在海上漂流，最後還是到了目的地。', voyage.text)
    return { text: lines.join('\n'), announce: true, minutes: 1 + voyage.minutes }
  }
  return { text: lines.join('\n'), announce: true, minutes: 1 }
}

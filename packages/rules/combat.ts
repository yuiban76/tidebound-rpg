// General synchronous-round combat (spec §7): every NPC can be fought, sea encounters use the same rules.
// The rules core rolls every die; the narrator only describes the committed result.
import { locations, npcs } from '../shared/protocol.ts'
import type { AttackStyle, NpcId } from '../shared/protocol.ts'
import { npcFoe, tierNames, tierXp } from '../world/foes.ts'
import { crewmates, crews } from '../world/crews.ts'
import type { Foe } from '../world/foes.ts'
import { islandAt, islands } from '../world/sea.ts'
import { gateCrews } from '../world/gates.ts'
import { queuePaper } from '../world/flags.ts'
import { partLevel, shipName, shipWear } from '../world/ships.ts'
import { raceDefense, raceHit, stat, traitOf } from '../world/races.ts'
import { dressingOf } from '../world/skills.ts'
import { armorOf, crewTreasure, slipName, specialByLabel, specials } from '../world/market.ts'
import type { SpecialId } from '../world/market.ts'
import { masteryOf, npcFacts, npcPlace, npcsAt, party, paths } from '../world/village.ts'
import type { Character, Combat, CombatChoice, Member, World } from '../world/village.ts'
import { bossDefeats } from '../world/canon.ts'
import { fruitDamage, fruits, isLogia } from '../world/fruits.ts'
import { offerFruit } from './fruits.ts'
import { applyEffect } from '../world/timeline.ts'
import { scale } from '../world/scale.ts'
import { tierDamage, tierHit, tierOf } from '../world/forge.ts'
import { attackCheck, bandageHeal, defense, grantXp, levelDamage, levelDefense, levelHit, maxHP } from './engine.ts'
import { hakiRank } from './timeskip.ts'
import { bestFx, fxOf, pct, rankOf } from '../world/talents.ts'
import type { Result, Roll } from './engine.ts'
import { finishVoyage } from './sailing.ts'
import { alliesAt, companionByName, companionFight, companionMaxHp, hurtCompanion, isCompanion, partyLevel, recruitable } from '../world/companions.ts'

const stop = (text: string): Result => ({ text, rejected: true })

/** STA cost and bonuses of each attack style (spec §7.4). Flurry is two blows, each at the normal chance to hit. */
export const styles: Record<AttackStyle, { label: string, sta: number, hit: number, damage: number }> = {
  normal: { label: '普通攻擊', sta: 0, hit: 0, damage: 0 },
  power: { label: '強力攻擊', sta: 2, hit: 0, damage: 2 },
  special: { label: '基礎特殊招式', sta: 3, hit: 1, damage: 3 },
  advanced: { label: '進階招式', sta: 5, hit: 2, damage: 5 },
  flurry: { label: '高強度連續攻擊', sta: 7, hit: 0, damage: 0 },
}

/** Die, skill and attribute of every weapon, with what it adds or takes for everyone who swings it. */
export const weaponStats: Record<Character['weapon'], { die: number, skill: string, attr: 'STR' | 'AGI' | 'PER', hit?: number, damage?: number }> = {
  fist: { die: 4, skill: '格鬥', attr: 'STR' }, kick: { die: 6, skill: '格鬥', attr: 'AGI' },
  sword: { die: 6, skill: '劍術', attr: 'STR' }, spear: { die: 8, skill: '長兵器', attr: 'STR' }, staff: { die: 6, skill: '長兵器', attr: 'AGI' },
  heavy: { die: 10, skill: '格鬥', attr: 'STR', hit: -1 },
  // Every shot costs a bullet, so a musket hits hardest of all.
  musket: { die: 10, skill: '射擊', attr: 'PER', damage: 1 },
  sling: { die: 4, skill: '射擊', attr: 'PER' }, bow: { die: 6, skill: '射擊', attr: 'AGI' },
}
function weaponOf(c: Character) {
  const w = weaponStats[c.weapon]
  // 鐵拳 and 鋼腿 make the bare hands' die bigger.
  return [Math.max(w.die, fxOf(c, 'die', c.weapon)), w.skill, stat(c, w.attr), w.hit ?? 0, w.damage ?? 0] as const
}
/** STA a blow costs. A bow looses two arrows for less effort than any other flurry; talents trim (or, for keystones, add to) it. */
export function staFor(c: Pick<Character, 'weapon'> & Partial<Character>, style: AttackStyle, fruitArt = false) {
  const who = c as Character
  let cost = style === 'flurry' && c.weapon === 'bow' ? 4 : styles[style].sta
  if (style === 'special' || style === 'advanced') cost -= fxOf(who, 'staTech')
  if (style === 'flurry') cost -= fxOf(who, 'staFlurry', c.weapon)
  cost += fxOf(who, 'staAttack')
  if (fruitArt && fxOf(who, 'fruitStaHalf')) cost = Math.ceil(cost / 2)
  return Math.max(0, cost)
}
/** STA Conqueror's haki costs this character. */
export const conquerorCost = (c: Character) => Math.max(0, conquerorSta - fxOf(c, 'conqSta'))
/** What one fighter's talents have used up or set going in this fight. The party's shared marks live under `party`. */
const marks = (combat: Combat, who: string) => ((combat.marks ??= {})[who] ??= {})
/** Whether this is a fruit move, and whether it costs nothing this time (應用技). */
function fruitMove(combat: Combat, c: Character, choice: Extract<CombatChoice, { kind: 'attack' }>) {
  const art = !!(choice.technique && c.techniques.find(move => move.name === choice.technique)?.fruit)
  return { art, free: art && fxOf(c, 'fruitFreeFirst') > 0 && !marks(combat, c.name).fruitFree }
}

/** What a technique's effect does to the blow: 橫掃 hits every foe but loses the style's damage bonus and 2 to hit;
 * 破甲 gives up 2 damage to leave the foe's guard open (defense −2) until the end of the next round. */
export const effectRules = { sweep: { hit: -2 }, breach: { damage: -2 } } as const
export const breachDef = 2
/** A foe's defense right now, after a broken guard. */
export const defOf = (foe: Foe) => foe.def - (foe.breached ? breachDef : 0)

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
    spendDressing(world, c, dressing)
    sheet.hp = Math.min(companionMaxHp(world, mate), sheet.hp + bandageHeal(c, partyLevel(world), !!world.combat))
    if (world.npcDown?.[mate]) delete world.npcDown[mate]
    return { text: c.name + '替' + npcs[mate] + '包紮，目前 HP ' + sheet.hp + '。' }
  }
  const patient = target ? party(world).find(m => m.character!.name === target)?.character : c
  if (!patient || patient.place !== c.place) return '找不到在你身邊、名叫「' + target + '」的隊友。'
  const dressing = dressingOf(c)
  if (!dressing) return '你的背包裡沒有繃帶或草藥。'
  if (patient.hp === maxHP(patient)) return patient.name + '沒有受傷。'
  spendDressing(world, c, dressing)
  patient.hp = Math.min(maxHP(patient), patient.hp + bandageHeal(c, patient.level, !!world.combat))
  return { text: (patient === c ? c.name + '替自己包紮' : c.name + '替' + patient.name + '包紮') + '，目前 HP ' + patient.hp + '。' }
}

/** Uses up a bandage, except the first one of a fight for someone with 隨身藥箱. */
function spendDressing(world: World, c: Character, dressing: string) {
  const mine = world.combat && fxOf(c, 'freeBandage') ? marks(world.combat, c.name) : undefined
  if (mine && !mine.freeBandage) { mine.freeBandage = 1; return }
  if (!--c.inventory[dressing]) delete c.inventory[dressing]
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

/** A land fight against foes made up on the spot (a guard crew, a training fight). */
export function beginFight(world: World, place: Character['place'], foes: Foe[], kind: Pick<Combat, 'gate' | 'hunt'>) {
  Object.assign(startFight(world, place, foes), kind)
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

  const invalid = validate(combat, c, choice) ?? (choice.kind === 'cannon' ? cannonFault(world, combat, choice.target) : undefined)
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
    const fruit = fruitMove(combat, c, choice)
    const cost = fruit.free ? 0 : staFor(c, style, fruit.art)
    if (c.sta < cost) return styles[style].label + '需要 ' + cost + ' STA，你目前只有 ' + c.sta + '。'
    if (c.weapon === 'musket' && !c.inventory['火槍彈藥']) return '火槍沒有子彈了。港口補給鋪和各島的行商都有賣火槍彈藥，或先改用別的武器。'
    if (!findFoe(combat, choice.target)) return '找不到名叫「' + choice.target + '」的對手。'
  }
  if (choice.kind === 'useItem') {
    const tool = soakTool(choice.item)
    if (tool) {
      if (!c.inventory[tool.label]) return '你的背包裡沒有' + tool.label + '。'
      if (!combat.foes.some(foe => !foe.down && !foe.surrendered && foe.weak?.includes(tool.weakness))) return '這場戰鬥裡沒有' + tool.label + '派得上用場的對手。'
    } else if (battleItem(choice.item)) {
      if (!c.inventory[specials[battleItem(choice.item)!].label]) return '你的背包裡沒有' + specials[battleItem(choice.item)!].label + '。'
    } else if (!/繃帶|草藥/.test(choice.item) || !dressingOf(c)) return '戰鬥中只能使用背包裡的繃帶、草藥、水壺、衝擊貝、火藥星、煙霧彈、火焰貝或鹽。'
  }
  if (choice.kind === 'negotiate' && !findFoe(combat, choice.target)) return '找不到可以交涉的對手。'
  if ((choice.kind === 'guard' || choice.kind === 'flee') && fxOf(c, 'noGuard')) return '你是狂戰士：不擺防守架勢，也不撤退。'
  if (choice.kind === 'conqueror') {
    if (!fxOf(c, 'conquer')) return c.haki?.conqueror ? '先在天賦林的霸氣海域學「霸王色霸氣」。' : '你還沒有覺醒霸王色霸氣。'
    if (combat.conquered?.includes(c.name)) return '這場戰鬥你已經放過一次霸王色了。'
    if (c.sta < conquerorCost(c)) return '霸王色需要 ' + conquerorCost(c) + ' STA，你目前只有 ' + c.sta + '。'
  }
}

/** STA it takes to let Conqueror's haki loose. */
export const conquerorSta = 10

/** Why a cannon cannot be fired right now. Each cannon fires once a round, whoever mans it. */
function cannonFault(world: World, combat: Combat, target?: string) {
  if (!combat.sea || !world.ship) return '只有海戰時才能開砲。'
  const guns = partLevel(world.ship, 'cannon')
  if (!guns) return shipName(world.ship) + '沒有裝船砲。到船塢輸入「升級船砲」可以加裝。'
  if (Object.values(combat.choices).filter(choice => choice.kind === 'cannon').length >= guns) return '這一回合 ' + guns + ' 門船砲都有人操作了。'
  if (!findFoe(combat, target)) return '找不到名叫「' + target + '」的對手。'
}

function resolveRound(world: World, combat: Combat, roll: Roll, opening: string): Result {
  const lines = [opening + '第 ' + combat.round + ' 回合']
  const fighters = world.members.filter(m => combat.participants.includes(m.id))
    .sort((a, b) => stat(b.character!, 'AGI') - stat(a.character!, 'AGI'))
  const guarding = new Set<string>()
  const lastHit = new Map<string, Member>()
  let escaped = false
  let smoke = false
  // 未來視 costs 2 STA a round; without them it does nothing this round.
  for (const member of fighters) {
    const x = member.character!
    const mine = marks(combat, x.name)
    mine.struck = 0
    mine.foresee = fxOf(x, 'foresight') && x.sta >= 2 ? (x.sta -= 2, 1) : 0
  }

  // Movement and support first; then attacks in speed order (spec §7.5).
  for (const member of fighters) {
    const fighter = member.character!
    const choice = combat.choices[member.id]
    if (choice.kind === 'guard') { guarding.add(member.id); lines.push(fighter.name + '擺出防守架勢。') }
    if (choice.kind === 'conqueror') {
      fighter.sta -= conquerorCost(fighter)
      ;(combat.conquered ??= []).push(fighter.name)
      if (fxOf(fighter, 'conqAura')) marks(combat, 'party').kingly = 1
      const reach = fxOf(fighter, 'conqTier')
      const felled: string[] = [], faltered: string[] = [], held: string[] = []
      for (const foe of standing(combat)) {
        if (foe.tier <= 2 + reach) { foe.down = true; lastHit.set(foe.id, member); felled.push(foe.name) }
        else if (foe.tier <= 4 + reach && !foe.haki) { foe.awed = 1; faltered.push(foe.name) }
        else held.push(foe.name)
      }
      lines.push(fighter.name + '放出了霸王色霸氣！' + (felled.length ? felled.join('、') + '當場昏了過去。' : '') +
        (faltered.length ? faltered.join('、') + '被震懾得動彈不得，這回合無法出手。' : '') + (held.length ? held.join('、') + '頂住了霸氣。' : ''))
    }
    if (choice.kind === 'useItem' && soakTool(choice.item)) lines.push(useSoak(combat, fighter, soakTool(choice.item)!, choice.target))
    else if (choice.kind === 'useItem' && battleItem(choice.item)) {
      const used = useBattleItem(combat, member, battleItem(choice.item)!, choice.target, lastHit)
      lines.push(used.text)
      if (used.escape) smoke = true
    } else if (choice.kind === 'useItem') {
      const used = useBandage(world, member, choice.target)
      lines.push(typeof used === 'string' ? fighter.name + '想用繃帶，但' + used : used.text)
    }
    if (choice.kind === 'flee') {
      if (combat.sea) {
        // The best sailor steers; a merfolk or long-leg aboard helps the boat slip away.
        const navigator = Math.max(...party(world).map(m => stat(m.character!, 'INT') + rankOf(m.character!, '航海'))) +
          Math.max(0, ...party(world).map(m => traitOf(m.character!).seaEscape ?? 0)) + fxOf(fighter, 'flee')
        const dc = 12 + Math.max(...standing(combat).map(foe => foe.tier)) - partLevel(world.ship, 'sail')
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
  if (smoke && !combat.sea) {
    const exit = paths[combat.place][0]
    for (const member of fighters) if (member.character!.place === combat.place) { member.character!.place = exit; member.character!.conversingWith = null }
    delete world.combat
    lines.push('煙霧散去時，你們已經撤到' + locations[exit] + '。')
    return { text: lines.join('\n'), minutes: 1, announce: true }
  }
  if (smoke) escaped = true
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
      const total = natural + stat(fighter, 'WIL') + rankOf(fighter, '說服') + (traitOf(fighter).negotiate ?? 0) + fxOf(fighter, 'negotiate')
      const success = natural !== 1 && total >= dc
      lines.push(fighter.name + '勸' + foe.name + '住手：說服 D20 ' + natural + '，合計 ' + total + '／' + dc + '，' + (success ? foe.name + '收手了。' : '對方不肯罷休。'))
      if (success) foe.surrendered = true
      else if (fxOf(fighter, 'shake')) { foe.shaken = Math.max(foe.shaken ?? 0, fxOf(fighter, 'shake')); lines.push(foe.name + '被' + fighter.name + '的氣勢嚇到，這回合命中 −' + foe.shaken + '。') }
      continue
    }
    if (choice.kind === 'cannon') {
      const foe = findFoe(combat, choice.target) ?? standing(combat)[0]
      if (!foe) continue
      if (foe.logia && !(foe.exposed ?? 0)) { lines.push(fighter.name + '的砲彈穿過了' + foe.name + '的身體，自然系的能力讓攻擊沒有效果。'); continue }
      const guns = partLevel(world.ship, 'cannon')
      const shot = attackCheck(roll, { attr: stat(fighter, 'PER'), skill: rankOf(fighter, '射擊') + levelHit(fighter.level) + fxOf(fighter, 'cannonHit'), def: defOf(foe), die: 10,
        bonus: guns * 2 + levelDamage(fighter.level) + fxOf(fighter, 'cannonDmg'), armor: foe.armor, crit: fxOf(fighter, 'cannonCrit'), scaleBy: pct(fxOf(fighter, 'cannonDmgPct')) })
      foe.hp = Math.max(0, foe.hp - shot.damage)
      // 舷側齊射: the rest of the broadside lands on everyone else.
      if (shot.hit && fxOf(fighter, 'broadside')) splash(combat, foe, Math.floor(shot.damage / 2), member, lastHit, lines, '舷側齊射')
      lines.push(fighter.name + '對' + foe.name + '開砲，D20 ' + shot.natural + '，合計 ' + shot.total + '／' + defOf(foe) +
        (shot.hit ? '，傷害 ' + shot.damage + '。' + foe.name + ' HP ' + foe.hp + '／' + foe.maxHp + '。' : '，砲彈落在海裡。'))
      if (!foe.hp) { foe.down = true; lastHit.set(foe.id, member); lines.push(foe.name + '倒下了。') }
      continue
    }
    if (choice.kind !== 'attack') continue
    const style = styleOf(fighter, choice)!
    const spec = styles[style]
    const mine = marks(combat, fighter.name)
    const fruit = fruitMove(combat, fighter, choice)
    if (fruit.free) mine.fruitFree = 1
    fighter.sta -= fruit.free ? 0 : staFor(fighter, style, fruit.art)
    // Every shot uses a bullet; there is no reloading. 省彈 saves the first one of a fight.
    if (fighter.weapon === 'musket' && fxOf(fighter, 'freeShot', 'musket') && !mine.freeShot) mine.freeShot = 1
    else if (fighter.weapon === 'musket' && !--fighter.inventory['火槍彈藥']) delete fighter.inventory['火槍彈藥']
    const [die, skill, attr, weaponHit, weaponDamage] = weaponOf(fighter)
    const move = choice.technique ? '「' + choice.technique + '」' : spec.label === '普通攻擊' ? '攻擊' : spec.label
    const effect = choice.technique ? fighter.techniques.find(m => m.name === choice.technique)?.effect : undefined
    // 橫掃 swings once at each foe standing; every other blow (two for a flurry) goes to the chosen foe.
    // 覺醒・自然系 turns every fruit move into one that reaches every foe.
    const everyone = effect === 'sweep' || (fruit.art && fxOf(fighter, 'fruitSweep') > 0)
    const swings = everyone ? standing(combat).map(foe => () => foe)
      : Array.from({ length: style === 'flurry' ? 2 : 1 }, () => () => findFoe(combat, choice.target) ?? standing(combat)[0])
    if (everyone) lines.push(fighter.name + '使出' + move + '橫掃全場！')
    for (const next of swings) {
      const foe = next()
      if (!foe) continue
      const solid = canHurt(foe, fighter)
      if (solid === false) {
        lines.push(fighter.name + '的' + move + '穿過了' + foe.name + '的身體，自然系的能力讓攻擊沒有效果。' + weakHint(foe))
        continue
      }
      if (solid === 'seastone') lines.push(fighter.name + '握著海樓石十手，' + foe.name + '的身體在這一擊中變得實在。')
      if (solid === 'haki') lines.push(fighter.name + '裹上武裝色霸氣，' + foe.name + '的自然系身體擋不住這一擊。')
      const t = talentBlow(world, combat, fighter, foe, style, fruit.art)
      const hit = attackCheck(roll, { attr, skill: rankOf(fighter, skill) + weaponHit + spec.hit + (effect === 'sweep' ? effectRules.sweep.hit : 0) + baseHit(fighter, combat) + t.hit, def: defOf(foe), die,
        bonus: (effect === 'sweep' ? 0 : spec.damage) + (effect === 'breach' ? effectRules.breach.damage : 0) + baseDamage(fighter) + weaponDamage + t.dmg,
        armor: Math.max(0, foe.armor - t.pierce), crit: t.crit, critDice: t.critDice, scaleBy: t.scaleBy })
      const twice = hit.hit && fxOf(fighter, 'allOut') > 0 && !mine.allOut
      if (twice) { mine.allOut = 1; hit.damage *= 2 }
      foe.hp = Math.max(0, foe.hp - hit.damage)
      lines.push(fighter.name + '對' + foe.name + '使出' + move + '，D20 ' + hit.natural + '，合計 ' + hit.total + '／' + defOf(foe) +
        (hit.hit ? '，傷害 ' + hit.damage + '（武器骰 ' + hit.dice.join('+') + '，數值×' + scale + '）。' + foe.name + ' HP ' + foe.hp + '／' + foe.maxHp + '。' : '，未命中。'))
      if (twice) lines.push(fighter.name + '捨身一擊！傷害加倍，但這場之後防禦 −2。')
      afterBlow(world, combat, member, foe, hit, roll, lines, lastHit, fruit.art)
    }
  }
  allyStrikes(world, combat, roll, lines)
  if (!standing(combat).length) return victory(world, combat, lines, lastHit)

  // NPC turn: every foe still standing strikes a random fighter on the spot.
  for (const foe of standing(combat)) {
    if (foe.blind) { lines.push(foe.name + '被火藥星嗆得睜不開眼，沒能出手。'); continue }
    if (foe.awed) { lines.push(foe.name + '被霸氣震懾，沒能出手。'); continue }
    // Companions on the spot draw fire too, so a foe may pick a player or an NPC companion.
    const here = fighters.map(m => m.character!).filter(x => x.place === combat.place && x.hp > 0)
    const targets: Victim[] = [
      ...fighters.filter(m => m.character!.place === combat.place && m.character!.hp > 0).map(m => {
        const x = m.character!
        const mine = marks(combat, x.name)
        // A fruit user cannot swim: at sea a fall overboard costs defense (抗性 takes it away, 與果實共生 makes it worse).
        const overboard = x.fruit && combat.sea ? Math.max(0, 2 - fxOf(x, 'seaGuard')) + fxOf(x, 'seaPenalty') : 0
        const talents = fxOf(x, 'def', x.weapon) + (guarding.has(m.id) ? fxOf(x, 'guard') : 0) + (x.hp < maxHP(x) / 4 ? fxOf(x, 'lowHpDef') : 0) +
          (combat.round === 1 ? fxOf(x, 'firstRoundDef') + bestFx(here, 'round1AuraDef') : 0) + (mine.allOut ? -2 : 0) + (mine.foresee ? fxOf(x, 'foresight') : 0)
        return {
          // Observation haki reads the blow coming; armament hardens the body against it.
          name: x.name, character: x, guarding: guarding.has(m.id), member: m,
          def: defense(stat(x, 'AGI'), rankOf(x, '閃避'), (guarding.has(m.id) ? 2 : 0) + levelDefense(x.level) - overboard + raceDefense(x, !!combat.sea) + (armorOf(x)?.def ?? 0) +
            Math.ceil(hakiRank(x, '見聞色') / 2) + Math.floor(hakiRank(x, '武裝色') / 2) + (x.profession === 'fighter' ? 1 : 0) + (x.weapon === 'staff' ? 1 : 0) + talents),
          // A logia body halves blows from ordinary foes; a foe with haki hits it in full.
          hurt: (damage: number) => {
            x.hp = Math.max(0, x.hp - (isLogia(x.fruit) && !foe.logia && !foe.haki ? Math.ceil(damage / 2) : damage))
            mine.struck = 1
            if (!x.hp && fxOf(x, 'lastStand') && !mine.stood) { mine.stood = 1; x.hp = 1; return x.name + '倒下了一瞬，又咬牙站了起來（不屈的意志，HP 1）。' }
            return x.hp ? undefined : x.name + '倒下，仍可接受救援。'
          },
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
    const total = natural + foe.attack - (foe.shaken ?? 0)
    let hit = natural !== 1 && total >= def
    const x = victim.character
    const mine = x && marks(combat, x.name)
    // 預判 reads the first blow of the fight; 元素化身 lets a blow without haki pass through.
    let dodge = ''
    if (hit && x && mine && fxOf(x, 'dodgeFirst') && !mine.dodged) { mine.dodged = 1; hit = false; dodge = '，' + x.name + '早一步讀出這一擊，閃開了' }
    else if (hit && x && !foe.haki && fxOf(x, 'phase') && roll(100) <= fxOf(x, 'phase')) { hit = false; dodge = '，攻擊穿過了' + x.name + '的元素身體' }
    const dice = hit ? [roll(foe.die)] : []
    if (hit && natural === 20 && !(x && fxOf(x, 'critGuard'))) dice.push(roll(foe.die))
    let damage = hit ? Math.max(0, dice.reduce((a, b) => a + b, 0) + foe.bonus) * scale : 0
    if (hit && x && mine) damage = soften(x, mine, damage)
    const fallen = hit ? victim.hurt(damage) : undefined
    lines.push(foe.name + '反擊' + victim.name + '，D20 ' + natural + '，合計 ' + total + '／' + def + (hit ? '，傷害 ' + damage + '。' : dodge + '，未命中。'))
    if (fallen) lines.push(fallen)
    if (!hit && x && mine && x.hp > 0) {
      if (fxOf(x, 'missHit')) mine.missHit = fxOf(x, 'missHit')
      if (victim.guarding && fxOf(x, 'counter') && victim.member) counter(world, combat, victim.member, foe, roll, lines, lastHit)
    }
  }

  // At sea the ship takes a beating too: the stronger the enemy, the more of her hull goes.
  if (combat.sea && world.ship && standing(combat).length) {
    const before = world.ship.hull
    world.ship.hull = Math.max(1, before - shipWear(world.ship, 1 + Math.max(...standing(combat).map(foe => foe.tier))))
    if (world.ship.hull < before) lines.push(shipName(world.ship) + '在交戰中受損，船體 ' + before + ' → ' + world.ship.hull + '／100。')
  }

  for (const foe of combat.foes) { if (foe.exposed) foe.exposed--; if (foe.blind) foe.blind--; if (foe.awed) foe.awed--; if (foe.breached) foe.breached--; delete foe.shaken }
  // 元素回復: whoever got through the round untouched recovers a little.
  for (const member of fighters) {
    const x = member.character!
    const regen = fxOf(x, 'regen')
    if (!regen || x.hp <= 0 || marks(combat, x.name).struck || x.hp >= maxHP(x)) continue
    x.hp = Math.min(maxHP(x), x.hp + Math.ceil(maxHP(x) * regen / 100))
    lines.push(x.name + '的身體慢慢復原，HP ' + x.hp + '。')
  }
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

/** Whether a blow can hurt this foe: true, false, or what makes it land on a logia body (sea stone, armament haki). */
function canHurt(foe: Foe, fighter: Character): boolean | 'seastone' | 'haki' {
  if (!foe.logia || (foe.exposed ?? 0) > 0 || isLogia(fighter.fruit)) return true
  if (hakiRank(fighter, '武裝色') > 0) return 'haki'
  return foe.weak?.includes('seastone') && !!fighter.inventory['海樓石十手'] ? 'seastone' : false
}

/** A nudge toward whatever works on this logia foe, so a stuck party always knows there is a way (or that there is none yet). */
function weakHint(foe: Foe) {
  if (!foe.weak?.length) return '\n（這種對手現在的你們碰不到，先避開，等學會別的本事再說：兩年修行後學會的武裝色霸氣打得到自然系。）'
  const tips = {
    water: '沙一遇水就會變重，也許能用水壺讓他現形（那諾哈娜的雜貨攤有賣）。',
    seastone: '海樓石能壓住惡魔果實的力量（羅格鎮的一本松武器店有賣海樓石十手）。',
    dial: '空島的衝擊貝也許能震散雷身（天使海灘的貝殼攤有賣）。',
  }
  return '\n（' + foe.weak.map(w => tips[w]).join('') + '）'
}

/** Something a foe can hit: a player or an NPC companion. `hurt` applies the damage and returns a line when the target falls. */
type Victim = { name: string, def: number, hurt: (damage: number) => string | undefined, character?: Character, member?: Member, guarding?: boolean }

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
    // Their captain's talents (船長的器量, 信賴) lift them; the best of the party members on the spot counts.
    const leaders = party(world).map(m => m.character!).filter(x => x.place === combat.place && x.hp > 0)
    const hit = attackCheck(roll, { attr: fight.attr, skill: fight.skill + bestFx(leaders, 'allyHit'), def: defOf(foe), die: fight.die, bonus: fight.bonus + bestFx(leaders, 'allyDmg'),
      armor: foe.armor, scaleBy: pct(bestFx(leaders, 'allyDmgPct')) })
    foe.hp = Math.max(0, foe.hp - hit.damage)
    lines.push(npcs[npc] + '使出' + fight.move + '攻擊' + foe.name + '，D20 ' + hit.natural + '，合計 ' + hit.total + '／' + defOf(foe) +
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
  drain(world, combat, lines)
  const winners = world.members.filter(m => combat.participants.includes(m.id) && m.character!.place === combat.place && m.character!.hp > 0)
  const share = (total: number) => winners.length ? Math.floor(total / winners.length) : 0
  const beaten = combat.foes.filter(foe => foe.down)
  const island = islandAt(combat.place)
  const renown = world.renown ??= { marineHeat: 0, islandRep: {} }
  lines.push('戰鬥結束。')

  const loot = beaten.reduce((sum, foe) => sum + foe.loot, 0)
  if (loot && winners.length) {
    for (const m of winners) m.character!.money += Math.round(share(loot) * pct(fxOf(m.character!, 'beliPct')))
    lines.push('戰利品共 ' + loot.toLocaleString('en-US') + ' 貝里，每人分得 ' + share(loot).toLocaleString('en-US') + '。' + luckyShare(winners))
  }
  // A bounty is paid against its slip: in full by the Marines to people who are not wanted, or in part by a broker.
  for (const foe of beaten.filter(foe => ['pirate', 'bandit', 'tyrant'].includes(foe.faction) && foe.bounty)) {
    const holder = (lastHit.get(foe.id) ?? winners[0])?.character
    if (!holder) continue
    const slip = slipName(foe.name, foe.bounty!)
    holder.inventory[slip] = (holder.inventory[slip] ?? 0) + 1
    lines.push(holder.name + '拿到' + slip + '。沒有懸賞金的人可以到海軍基地領全額；有懸賞金的人只能找地下掮客換錢。')
  }
  // The first party to beat a captain finds the crew's treasure.
  for (const foe of beaten) {
    const crew = foe.npc && (Object.keys(crews) as string[]).find(id => crews[id].captain === foe.npc)
    const treasure = crew ? crewTreasure[crew] : undefined
    if (!crew || !treasure || world.treasures?.includes(crew) || !winners.length) continue
    ;(world.treasures ??= []).push(crew)
    for (const m of winners) m.character!.money += Math.round(share(treasure.amount) * pct(fxOf(m.character!, 'beliPct')))
    lines.push('你們找到了' + treasure.text + '：共 ' + treasure.amount.toLocaleString('en-US') + ' 貝里，每人分得 ' + share(treasure.amount).toLocaleString('en-US') + '。')
  }
  for (const foe of combat.foes) {
    if (['marine', 'government'].includes(foe.faction) && (foe.down || foe.surrendered)) {
      renown.marineHeat = Math.min(100, renown.marineHeat + 5 * (foe.tier + 1))
      for (const m of winners) m.character!.bounty += Math.round((foe.tier + 1) ** 2 * 1_000_000 * pct(fxOf(m.character!, 'bountyPct')))
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
      // Guard crews and training foes pay their own XP every time; story foes pay by tier, less on each repeat.
      const base = foe.xp ?? tierXp[foe.tier]
      const xp = grantXp(m.character!, foe.surrendered ? Math.floor(base / 2) : base, foe.xp ? undefined : 'defeat:' + (foe.npc ?? foe.name))
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
  // What the beaten foes carried goes to whoever brought them down.
  for (const foe of beaten.filter(foe => foe.items)) {
    const holder = (lastHit.get(foe.id) ?? winners[0])?.character
    if (!holder) continue
    for (const [item, count] of Object.entries(foe.items!)) holder.inventory[item] = (holder.inventory[item] ?? 0) + count
    lines.push(holder.name + '從' + foe.name + '身上拿到' + Object.entries(foe.items!).map(([item, count]) => item + (count > 1 ? ' × ' + count : '')).join('、') + '。')
  }
  if (combat.gate && winners.length) {
    ;(world.gates ??= {})[combat.gate] = true
    lines.push('守關的「' + gateCrews[combat.gate].crew + '」被打倒了！往下一座島的航路打開了。')
    queuePaper(world, '【報紙】' + islands[combat.gate].name + '的「' + gateCrews[combat.gate].crew + '」被一支新起的隊伍擊潰，帶頭的是' +
      winners.map(m => m.character!.name).join('、') + '。', world.minute + 6 * 60)
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
  drain(world, combat, lines)
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
    lines.push(shipName(world.ship!) + '在海上漂流，最後還是到了目的地。', voyage.text)
    return { text: lines.join('\n'), announce: true, minutes: 1 + voyage.minutes }
  }
  return { text: lines.join('\n'), announce: true, minutes: 1 }
}

/** A merchant's combat item named in the action, if it is one. */
function battleItem(item: string): SpecialId | undefined {
  const id = specialByLabel(item) ?? (Object.keys(specials) as SpecialId[]).find(key => item.includes(specials[key].label))
  return id && (specials[id] as { kind: string }).kind === 'combat' ? id : undefined
}

/** 火藥星 blinds a foe for the round, 火焰貝 burns one, 鹽 drops a zombie, 煙霧彈 gets the whole party away. */
function useBattleItem(combat: Combat, member: Member, id: SpecialId, target: string | undefined, lastHit: Map<string, Member>) {
  const c = member.character!
  const ware = specials[id] as { label: string, effect?: string }
  if (!--c.inventory[ware.label]) delete c.inventory[ware.label]
  if (ware.effect === 'escape') return { text: c.name + '把煙霧彈摔在地上，白煙瞬間吞沒了整個戰場！', escape: true }
  const foe = findFoe(combat, target) ?? standing(combat)[0]
  if (!foe) return { text: c.name + '想用' + ware.label + '，但已經沒有對手了。' }
  if (ware.effect === 'blind') {
    foe.blind = 1
    return { text: c.name + '把火藥星砸在' + foe.name + '臉上，' + foe.name + '咳個不停、睜不開眼！' }
  }
  if (ware.effect === 'salt') {
    if (!foe.name.includes('殭屍')) return { text: c.name + '把鹽撒向' + foe.name + '，對方只是皺了皺眉。鹽只對殭屍有用。' }
    foe.down = true
    lastHit.set(foe.id, member)
    return { text: c.name + '把鹽塞進' + foe.name + '嘴裡，影子從它身上飛走，殭屍當場倒下了！' }
  }
  if (canHurt(foe, c) === false) return { text: c.name + '的火焰穿過了' + foe.name + '的身體，自然系讓這一擊落空。' + weakHint(foe) }
  const damage = (15 + c.level) * scale
  foe.hp = Math.max(0, foe.hp - damage)
  if (!foe.hp) { foe.down = true; lastHit.set(foe.id, member) }
  return { text: c.name + '按下火焰貝，一道火柱噴向' + foe.name + '，傷害 ' + damage + '。' + foe.name + ' HP ' + foe.hp + '／' + foe.maxHp + '。' + (foe.hp ? '' : foe.name + '倒下了。') }
}

/** To-hit every blow of this character shares: level, forged weapon, race, attack method. */
const baseHit = (c: Character, combat: Combat) => levelHit(c.level) + tierHit(tierOf(c)) + raceHit(c, !!combat.sea) + (masteryOf(c)?.hit ?? 0)
/** Damage every blow of this character shares: level, forge, fruit, race, attack method, armament haki. */
const baseDamage = (c: Character) => levelDamage(c.level) + tierDamage(tierOf(c)) + fruitDamage(c.fruit, c.level) + (traitOf(c).damage ?? 0) +
  (masteryOf(c)?.damage ?? 0) + hakiRank(c, '武裝色')

/** What the fighter's talents add to this blow at this moment of the fight. */
function talentBlow(world: World, combat: Combat, c: Character, foe: Foe, style: AttackStyle, fruitArt: boolean) {
  const w = c.weapon
  const mine = marks(combat, c.name)
  const here = party(world).map(m => m.character!).filter(x => x.place === combat.place && x.hp > 0)
  const first = combat.round === 1
  const downed = party(world).some(m => m.character!.place === combat.place && m.character!.hp <= 0)
  return {
    hit: fxOf(c, 'hit', w) + (first ? fxOf(c, 'firstRoundHit', w) + bestFx(here, 'round1AuraHit') : 0) + bestFx(here, 'auraHit') +
      (foe.haki ? fxOf(c, 'vsHakiHit') : 0) + (marks(combat, 'party').kingly ? 1 : 0) + (mine.missHit ?? 0) + (fruitArt ? fxOf(c, 'fruitHit') : 0),
    dmg: fxOf(c, 'dmg', w) + (style === 'power' ? fxOf(c, 'powerDmg', w) : 0) + (style === 'flurry' ? fxOf(c, 'flurryDmg', w) : 0) +
      (!mine.opened ? fxOf(c, 'openingDmg', w) : 0) + (mine.heat ? fxOf(c, 'heatDmg') : 0) + (downed ? fxOf(c, 'downedAllyDmg') : 0) +
      (c.hp < maxHP(c) / 2 ? fxOf(c, 'lowHpDmg') : 0) + (foe.haki ? fxOf(c, 'vsHakiDmg') : 0) + fxOf(c, 'armamentDmg', w) * hakiRank(c, '武裝色') +
      (fruitArt ? fxOf(c, 'fruitDmg') : 0),
    pierce: fxOf(c, 'pierce', w),
    crit: fxOf(c, 'crit', w) + (fruitArt ? fxOf(c, 'fruitCrit') : 0),
    critDice: fxOf(c, 'critDice', w),
    scaleBy: pct(fxOf(c, 'dmgPct', w) + (fruitArt ? fxOf(c, 'fruitDmgPct') : 0)),
  }
}

/** What follows a blow: falls, broken guards, stunned foes, fruit splash, and the talents that remember the blow. */
function afterBlow(world: World, combat: Combat, member: Member, foe: Foe, hit: ReturnType<typeof attackCheck>, roll: Roll, lines: string[], lastHit: Map<string, Member>, fruitArt: boolean) {
  const c = member.character!
  const mine = marks(combat, c.name)
  const choice = combat.choices[member.id]
  const effect = choice?.kind === 'attack' && choice.technique ? c.techniques.find(m => m.name === choice.technique)?.effect : undefined
  mine.missHit = 0
  mine.heat = hit.hit ? 1 : 0
  if (hit.hit && fxOf(c, 'openingDmg', c.weapon)) mine.opened = 1
  if (!foe.hp) {
    foe.down = true
    lastHit.set(foe.id, member)
    lines.push(foe.name + '倒下了。')
  } else if (hit.hit) {
    if (effect === 'breach') {
      foe.breached = 2
      lines.push(foe.name + '的架勢被打破了！直到下一回合結束，大家打他時他的防禦 −' + breachDef + '。')
    }
    const critical = hit.natural >= 20 - fxOf(c, 'crit', c.weapon)
    const stun = fxOf(c, 'aweOnHit', c.weapon)
    if (!foe.awed && ((stun && roll(100) <= stun) || (critical && fxOf(c, 'aweOnCrit', c.weapon)))) {
      foe.awed = 1
      lines.push(foe.name + '被打得愣住了，這回合無法出手。')
    }
  }
  if (hit.hit && fruitArt && fxOf(c, 'fruitSplash')) splash(combat, foe, Math.floor(hit.damage / 2), member, lastHit, lines, '果實的力量')
  if (fruitArt) {
    mine.fruitUses = (mine.fruitUses ?? 0) + 1
    if (fxOf(c, 'awakened') && mine.fruitUses >= 3 && c.sta > 0) { c.sta = 0; lines.push(c.name + '用盡了覺醒的力量，STA 歸零。') }
  }
}

/** Half (or another share) of a blow reaching every other foe still standing. */
function splash(combat: Combat, struck: Foe, damage: number, member: Member, lastHit: Map<string, Member>, lines: string[], cause: string) {
  if (damage <= 0) return
  const others = standing(combat).filter(foe => foe !== struck && !(foe.logia && !(foe.exposed ?? 0)))
  if (!others.length) return
  for (const foe of others) {
    foe.hp = Math.max(0, foe.hp - damage)
    if (!foe.hp) { foe.down = true; lastHit.set(foe.id, member) }
  }
  lines.push(cause + '波及' + others.map(foe => foe.name + (foe.hp ? '（HP ' + foe.hp + '）' : '（倒下）')).join('、') + '，各受 ' + damage + ' 點傷害。')
}

/** How much of a blow the character takes after their talents (殘影, 鋼鐵之軀, 武裝硬化, and the small cuts to harm). */
function soften(c: Character, mine: Record<string, number>, damage: number) {
  if (fxOf(c, 'fadeFirst') && !mine.faded) { mine.faded = 1; damage = Math.ceil(damage / 2) }
  damage = Math.max(0, damage - fxOf(c, 'dr') * scale)
  return Math.round(damage * Math.max(.5, 1 - fxOf(c, 'drPct') / 100))
}

/** 反擊: a plain blow back at a foe who swung and missed someone on guard. */
function counter(world: World, combat: Combat, member: Member, foe: Foe, roll: Roll, lines: string[], lastHit: Map<string, Member>) {
  const c = member.character!
  if (foe.down || foe.surrendered || canHurt(foe, c) === false) return
  const [die, skill, attr, weaponHit, weaponDamage] = weaponOf(c)
  const t = talentBlow(world, combat, c, foe, 'normal', false)
  const hit = attackCheck(roll, { attr, skill: rankOf(c, skill) + weaponHit + baseHit(c, combat) + t.hit, def: defOf(foe), die, bonus: baseDamage(c) + weaponDamage + t.dmg,
    armor: Math.max(0, foe.armor - t.pierce), crit: t.crit, critDice: t.critDice, scaleBy: t.scaleBy })
  foe.hp = Math.max(0, foe.hp - hit.damage)
  lines.push(c.name + '擋下攻擊順勢反擊' + foe.name + '，D20 ' + hit.natural + '，合計 ' + hit.total + '／' + defOf(foe) +
    (hit.hit ? '，傷害 ' + hit.damage + '。' + foe.name + ' HP ' + foe.hp + '／' + foe.maxHp + '。' : '，未命中。'))
  if (!foe.hp) { foe.down = true; lastHit.set(foe.id, member); lines.push(foe.name + '倒下了。') }
}

/** 霸氣全開: whoever fought with it is spent when the fight ends. */
function drain(world: World, combat: Combat, lines: string[]) {
  for (const m of world.members.filter(m => combat.participants.includes(m.id))) {
    const c = m.character!
    if (!fxOf(c, 'hakiDrain') || !c.sta) continue
    c.sta = 0
    lines.push(c.name + '把霸氣用到了極限，STA 歸零。')
  }
}

/** A note on whoever's talents made their share of the loot bigger. */
function luckyShare(winners: Member[]) {
  const lucky = winners.filter(m => fxOf(m.character!, 'beliPct') > 0).map(m => m.character!.name)
  return lucky.length ? lucky.join('、') + '的天賦讓自己多分到一些。' : ''
}

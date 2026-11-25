// Reads the blows that landed back out of a fight's result text, and decides how each one looks: which effect,
// how heavy, and the name of the move. Pure presentation; the rules have already decided everything.
import { npcs } from '../shared/protocol.ts'
import type { NpcId, Weapon } from '../shared/protocol.ts'
import type { DiceRoll } from '../shared/dice.ts'
import { recruitable } from './companions.ts'
import { fruitMoves, fruitOf, fruits } from './fruits.ts'
import type { FruitId } from './fruits.ts'
import { npcProfiles } from './foes.ts'

export const effects = [
  // Bodies and weapons.
  'punch', 'bigPunch', 'kick', 'fireKick', 'gum', 'slash', 'dual', 'threeSword', 'blackBlade', 'axe', 'thrust', 'claw', 'finger', 'airSlash', 'bite', 'hammer', 'whip',
  'gun', 'rapid', 'cannon', 'daggers', 'arrow', 'sling', 'rocketFist', 'hypno', 'electro', 'water', 'weather', 'petalBlade', 'buddha', 'tackle',
  // Devil fruits.
  'smoke', 'sand', 'lightning', 'fire', 'magma', 'ice', 'light', 'dark', 'beast', 'phoenix', 'dino', 'soul', 'room', 'magnet', 'age', 'paw', 'string', 'ghost',
  'wax', 'munch', 'diamond', 'split', 'hands', 'shadow', 'poison', 'ballet', 'straw', 'door', 'bubble', 'quake', 'spring', 'hormone', 'love',
] as const
export type Effect = (typeof effects)[number]

export const fruitEffect: Record<FruitId, Effect> = {
  moku: 'smoke', suna: 'sand', goro: 'lightning', mera: 'fire', magu: 'magma', hie: 'ice', pika: 'light', yami: 'dark', hito: 'beast', tori: 'phoenix', ryu: 'dino',
  ushi: 'finger', neko: 'claw', yomi: 'soul', ope: 'room', jiki: 'magnet', toshi: 'age', nikyu: 'paw', ito: 'string', horo: 'ghost', doru: 'wax', baku: 'munch',
  dia: 'diamond', bara: 'split', hana: 'hands', kage: 'shadow', doku: 'poison', mane: 'ballet', wara: 'straw', doa: 'door', awa: 'bubble', gura: 'quake',
  bane: 'spring', horm: 'hormone', mero: 'love',
}

/** People whose style is their own rather than a fruit's or a word in the move's name. `move` is shown when they have no other. */
const people: Partial<Record<NpcId, { effect: Effect, move?: string }>> = {
  luffy: { effect: 'gum', move: '橡膠手槍' }, zoro: { effect: 'threeSword' }, sanji: { effect: 'fireKick' }, usopp: { effect: 'sling' }, nami: { effect: 'weather' },
  franky: { effect: 'rocketFist' }, robin: { effect: 'hands' }, chopper: { effect: 'beast' }, brook: { effect: 'soul' }, mihawk: { effect: 'blackBlade' },
  rayleigh: { effect: 'slash' }, shanks: { effect: 'blackBlade' }, garp: { effect: 'bigPunch', move: '鐵拳' }, sengoku: { effect: 'buddha' }, zeff: { effect: 'fireKick' },
  smoker: { effect: 'smoke' }, crocodile: { effect: 'sand' }, enel: { effect: 'lightning' }, hancock: { effect: 'love' }, jinbe: { effect: 'water' }, arlong: { effect: 'water' },
  vista: { effect: 'petalBlade' }, marco: { effect: 'phoenix' }, dragon: { effect: 'airSlash' }, tsuru: { effect: 'bubble' }, kuma: { effect: 'paw' },
  lucci: { effect: 'finger' }, kaku: { effect: 'airSlash' }, jabra: { effect: 'claw' }, fukurou: { effect: 'finger' }, nero: { effect: 'finger' }, blueno: { effect: 'door' },
  daz: { effect: 'dual' }, killer: { effect: 'dual' }, krieg: { effect: 'rapid' }, wyper: { effect: 'cannon' }, absalom: { effect: 'cannon' }, ganfall: { effect: 'thrust' },
  marguerite: { effect: 'arrow' }, marigold: { effect: 'fire' }, sandersonia: { effect: 'whip' }, kumadori: { effect: 'whip' }, squard: { effect: 'dual' },
  izo: { effect: 'rapid' }, curiel: { effect: 'rapid' }, oarsJr: { effect: 'bigPunch' }, blenheim: { effect: 'bigPunch' }, laboon: { effect: 'tackle' }, pell: { effect: 'claw' },
}

/** A word in a move's name picks the effect; the first that matches wins. Player-made techniques use this too. */
const words: [RegExp, Effect][] = [
  [/魚人空手道|水流|海嘯|水|浪|鯊/, 'water'], [/電擊/, 'electro'], [/雷|電|閃電/, 'lightning'], [/熔岩|岩漿|火山|冥狗/, 'magma'], [/冰|凍|霜|雪|寒/, 'ice'],
  [/砲|炮|爆|轟/, 'cannon'], [/火|炎|焰|燃|烈/, 'fire'], [/沙|砂/, 'sand'], [/煙|霧/, 'smoke'], [/毒/, 'poison'], [/闇|暗|黑洞/, 'dark'], [/影/, 'shadow'], [/光|輝|星/, 'light'],
  [/幽靈|鬼|魂|靈/, 'ghost'], [/花|櫻|瓣/, 'petalBlade'], [/線|絲/, 'string'], [/泡/, 'bubble'], [/震|地裂|崩/, 'quake'], [/龍捲|旋風|風|嵐/, 'airSlash'],
  [/三刀/, 'threeSword'], [/雙刀|雙刃|鋸|亂揮|雙劍|二刀/, 'dual'], [/指槍/, 'finger'], [/天候/, 'weather'], [/彈弓/, 'sling'], [/小刀|飛刀|手術刀/, 'daggers'],
  [/連射|雙槍|掃射|機槍/, 'rapid'], [/火槍|射擊|狙擊|槍擊|開槍/, 'gun'], [/弓|箭/, 'arrow'], [/斧/, 'axe'], [/槌|鎚|鐵球|錘|棒|十手/, 'hammer'], [/鞭|鏈/, 'whip'],
  [/圓環|催眠/, 'hypno'], [/爪/, 'claw'], [/咬|噬|牙/, 'bite'], [/長槍|突刺|刺|穿|貫|槍/, 'thrust'], [/踢|腿|腳|蹴/, 'kick'], [/斬|劍|刀|刃|砍|切/, 'slash'],
  [/巨人鐵拳|巨掌|鐵拳|大拳/, 'bigPunch'], [/拳|打|揍|掌|擊/, 'punch'], [/衝撞|突擊|撞/, 'tackle'],
]
export const effectOfMove = (move: string): Effect | undefined => words.find(([pattern]) => pattern.test(move))?.[1]
const weaponEffect: Record<Weapon, Effect> = { fist: 'punch', sword: 'slash', spear: 'thrust', musket: 'gun' }

const npcByName = Object.fromEntries(Object.entries(npcs).map(([id, name]) => [name, id as NpcId]))
export const npcNamed = (name: string): NpcId | undefined => npcByName[name]

/** Unnamed enemies, by what they are called. */
function gruntEffect(name: string): Effect {
  if (/海王類/.test(name)) return 'bite'
  if (/魚人/.test(name)) return 'water'
  if (/殭屍/.test(name)) return 'claw'
  if (/女戰士/.test(name)) return 'arrow'
  if (/海軍|守軍|士兵|上尉/.test(name)) return 'gun'
  if (/山賊/.test(name)) return 'axe'
  if (/船長/.test(name)) return 'dual'
  if (/小弟/.test(name)) return 'hammer'
  return 'slash'
}
const generic = /^(?:拳打腳踢|蠻力攻擊|撲咬)$/

/** How someone who is not a player fights. Whoever lost their fruit falls back to their bare hands. */
export function npcStyle(name: string, lost: Partial<Record<NpcId, true>> = {}): { effect: Effect, move?: string } {
  const npc = npcNamed(name)
  if (!npc) return { effect: gruntEffect(name) }
  if (lost[npc] && fruitOf[npc]) return { effect: npcProfiles[npc].faction === 'marine' ? 'slash' : 'punch' }
  const fruit = fruitOf[npc]
  const known = recruitable[npc]?.fight.move
  const move = people[npc]?.move ?? (known && !generic.test(known) ? known : fruit && fruits[fruit].move)
  const effect = people[npc]?.effect ?? (fruit && fruitEffect[fruit]) ?? (move ? effectOfMove(move) : undefined) ??
    (known === '撲咬' ? 'bite' : npcProfiles[npc].faction === 'marine' ? 'slash' : 'punch')
  return { effect, move }
}

export type Attacker = { name: string, weapon: Weapon, fruit?: FruitId, techniques: { name: string, style: string, fruit?: true }[] }
export type Strike = {
  from: string, to: string
  side: 'ours' | 'foe'
  effect: Effect
  /** Shown big as the blow lands; a plain blow has no name. */
  move?: string
  /** 1 an ordinary blow, up to 2.4 for a fruit's final move. Drives size, shake and how long the blow hangs. */
  power: number
  damage: number
  /** The target's HP after the blow, when the text says it. */
  hp?: number, maxHp?: number
  crit: boolean, ko: boolean
}

const stylePower: Record<string, number> = { 普通攻擊: 1, 攻擊: 1, 強力攻擊: 1.4, 基礎特殊招式: 1.5, 進階招式: 1.8, 高強度連續攻擊: 1.5 }
const techniquePower: Record<string, number> = { special: 1.5, advanced: 1.85, flurry: 2 }

function playerBlow(player: Attacker | undefined, spoken: string): { effect: Effect, move?: string, power: number } {
  const weapon = weaponEffect[player?.weapon ?? 'fist']
  const named = /^「(.+)」$/.exec(spoken)?.[1]
  if (!named) {
    const power = stylePower[spoken] ?? 1
    return { effect: power > 1.3 && player?.fruit ? fruitEffect[player.fruit] : weapon, move: power > 1 ? spoken : undefined, power }
  }
  const technique = player?.techniques.find(move => move.name === named)
  const rank = player?.fruit ? (fruitMoves[player.fruit] as readonly string[]).indexOf(named) : -1
  // The five fruit moves grow with each level learned; the last one is the showpiece.
  if (player?.fruit && rank >= 0) return { effect: fruitEffect[player.fruit], move: named, power: [1.5, 1.6, 1.85, 2, 2.4][rank] }
  return { effect: effectOfMove(named) ?? weapon, move: named, power: techniquePower[technique?.style ?? 'special'] ?? 1.5 }
}

const tail = '，D20 (\\d+)，合計 -?\\d+／-?\\d+，傷害 (\\d+)'
const left = '(?:（[^）]*）)?。(?:.+? HP (\\d+)／(\\d+))?'
const byPlayer = new RegExp('^(.+?)對(.+?)使出(.+?)' + tail + left)
const byCannon = new RegExp('^(.+?)對(.+?)(開砲)' + tail + left)
const byAlly = new RegExp('^(.+?)使出(.+)攻擊(.+?)' + tail + left)
const byFoe = new RegExp('^(.+?)反擊(.+?)' + tail)
const byDial = /^(.+?)按下火焰貝，一道火柱噴向(.+?)，傷害 (\d+)。(?:.+? HP (\d+)／(\d+))?/

/** Every blow that did damage, in the order it was struck. */
export function strikesIn(text: string, players: Attacker[], lost?: Partial<Record<NpcId, true>>): Strike[] {
  const lines = text.split('\n')
  const out: Strike[] = []
  lines.forEach((line, i) => {
    const felled = (name: string) => line.includes(name + '倒下') || (lines[i + 1] ?? '').startsWith(name + '倒下')
    const push = (strike: Omit<Strike, 'ko' | 'crit' | 'damage' | 'hp' | 'maxHp'>, natural: string, damage: string, hp?: string, maxHp?: string) => {
      if (!Number(damage)) return
      out.push({ ...strike, damage: Number(damage), crit: natural === '20', ko: hp === '0' || felled(strike.to), ...(hp !== undefined && { hp: Number(hp), maxHp: Number(maxHp) }) })
    }
    let m = byCannon.exec(line)
    if (m) return push({ from: m[1], to: m[2], side: 'ours', effect: 'cannon', move: '砲擊', power: 1.6 }, m[4], m[5], m[6], m[7])
    m = byPlayer.exec(line)
    if (m) return push({ from: m[1], to: m[2], side: 'ours', ...playerBlow(players.find(p => p.name === m![1]), m[3]) }, m[4], m[5], m[6], m[7])
    m = byDial.exec(line)
    if (m) return push({ from: m[1], to: m[2], side: 'ours', effect: 'fire', move: '火焰貝', power: 1.6 }, '', m[3], m[4], m[5])
    m = byAlly.exec(line)
    if (m) {
      const style = npcStyle(m[1], lost)
      return push({ from: m[1], to: m[3], side: 'ours', effect: style.effect, move: style.move ?? m[2], power: 1.35 }, m[4], m[5], m[6], m[7])
    }
    m = byFoe.exec(line)
    if (m) {
      const npc = npcNamed(m[1])
      const tier = npc ? npcProfiles[npc].tier : /巨型海王類/.test(m[1]) ? 4 : 1
      push({ from: m[1], to: m[2], side: 'foe', ...npcStyle(m[1], lost), power: 1 + tier * .16 }, m[3], m[4])
    }
  })
  return out
}

/** At most `limit` blows to play: finishing blows and the players' own come first, the order stays as it was. */
export function pickStrikes(strikes: Strike[], players: string[], limit = 7) {
  if (strikes.length <= limit) return strikes
  const weight = (strike: Strike) => (strike.ko ? 4 : 0) + (players.includes(strike.from) ? 3 : 0) + (players.includes(strike.to) ? 2 : 0) + (strike.crit ? 1 : 0)
  const keep = new Set([...strikes].sort((a, b) => weight(b) - weight(a)).slice(0, limit))
  return strikes.filter(strike => keep.has(strike))
}

/** Someone on the tray: their name and the dice they rolled this round. */
export type Fighter = { name: string, rolls: DiceRoll[] }

/** Everyone in the round by side, in the order they first acted or were aimed at. `more` counts dice that did not fit. */
export function lineUp(rolls: DiceRoll[], strikes: Strike[], players: string[], perSide = 5) {
  const sides = { ours: new Map<string, DiceRoll[]>(), foe: new Map<string, DiceRoll[]>() }
  const add = (side: 'ours' | 'foe', name: string, roll?: DiceRoll) => {
    const list = sides[side].get(name) ?? []
    if (roll) list.push(roll)
    sides[side].set(name, list)
  }
  for (const roll of rolls) {
    const [who, target] = roll.label.split(' → ')
    const side = roll.blow === 'foe' ? 'foe' : 'ours'
    add(side, who, roll)
    if (target) add(side === 'ours' ? 'foe' : 'ours', target)
  }
  for (const strike of strikes) {
    add(strike.side, strike.from)
    add(strike.side === 'ours' ? 'foe' : 'ours', strike.to)
  }
  const busy = new Set(strikes.flatMap(strike => [strike.from, strike.to]))
  let more = 0
  const pick = (side: 'ours' | 'foe'): Fighter[] => {
    const all = [...sides[side]].map(([name, list]) => ({ name, rolls: list.slice(0, 2), left: Math.max(0, list.length - 2) }))
    const weight = (name: string) => (players.includes(name) ? 2 : 0) + (busy.has(name) ? 1 : 0)
    const keep = new Set([...all].sort((a, b) => weight(b.name) - weight(a.name)).slice(0, perSide))
    for (const one of all) more += keep.has(one) ? one.left : one.rolls.length + one.left
    return all.filter(one => keep.has(one)).map(({ name, rolls }) => ({ name, rolls }))
  }
  const ours = pick('ours')
  const foes = pick('foe')
  const there = new Set([...ours, ...foes].map(one => one.name))
  // A blow needs both names on the tray to fly between.
  return { ours, foes, more, strikes: strikes.filter(strike => there.has(strike.from) && there.has(strike.to)) }
}

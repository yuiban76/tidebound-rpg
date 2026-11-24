import type { CharacterInput, Intent, IslandId, LocationId, NpcId, Weapon } from '../shared/protocol.ts'
import { npcs } from '../shared/protocol.ts'
import type { Ship, SailingPlan, IslandTask, RouteChoice } from './sea.ts'
import type { Foe } from './foes.ts'
import type { FruitId } from './fruits.ts'
import { scale } from './scale.ts'
import { canonIslands, canonPeople } from './canon.ts'
import { castPeople } from './cast.ts'
import { addedSites, islandLayouts } from './sites.ts'
import { applyRace, raceTraits } from './races.ts'

/** Canon islands default to port ↔ second place ↔ third place; islands in sites.ts bring their own roads. */
const canonPaths = Object.fromEntries(Object.values(canonIslands).flatMap(({ places: [[a], [b], [c]] }) =>
  [[a, [b]], [b, [a, c]], [c, [b]]])) as Record<string, LocationId[]>
const roads = Object.values(islandLayouts).flatMap(layout => layout!.roads)
const roadPaths: Record<string, LocationId[]> = {}
for (const [a, b] of roads) (roadPaths[a] ??= []).push(b), (roadPaths[b] ??= []).push(a)
const roadMinutes = new Map(roads.flatMap(([a, b, minutes]) => minutes ? [[a + '|' + b, minutes], [b + '|' + a, minutes]] : []))
const canonLandmarks = Object.fromEntries([...Object.values(canonIslands).flatMap(island => island.places), ...addedSites]
  .map(([id, , landmark]) => [id, landmark])) as Record<string, string>

// Canon start snapshot (spec §1.2): the morning Luffy leaves Foosha Village on Dawn Island, before he meets Zoro.
// Named canon people only appear through facts stated here.
export const opening = '今天清晨，魯夫乘著一艘小船離開了黎明島的風車村，說要成為海賊王。港口的人還在談論這件事。' +
  '你們是相識多年的朋友，此刻在風車村廣場碰頭。你們還沒有海賊團、船長或共同的船；派對酒吧飄來瑪琪諾烤麵包的香氣。' +
  '往哪裡去、要成為什麼樣的人，由你們自己決定。'
export const paths = {
  square: ['tavern', 'dock', 'road'], tavern: ['square'],
  dock: ['square', 'road'], road: ['square', 'dock', 'hill', 'goa'], hill: ['road'], goa: ['road'],
  shellsPort: ['shellsTown'], shellsTown: ['shellsPort', 'marineBase'], marineBase: ['shellsTown'],
  orangePort: ['orangeStreet'], orangeStreet: ['orangePort', 'petShop'], petShop: ['orangeStreet'],
  ...canonPaths,
  ...roadPaths,
} as Record<LocationId, LocationId[]>
/** Game minutes to walk one path segment. The Goa Kingdom lies beyond the forest road; sites.ts sets longer roads. */
export function walkMinutes(from: LocationId, to: LocationId) {
  return from === 'goa' || to === 'goa' ? 40 : roadMinutes.get(from + '|' + to) ?? 6
}
/** Starting place (null: away at sea), role and Day-1 knowledge. The timeline can change both via World. */
export const people: Record<NpcId, { place: LocationId | null, role: string, known: string }> = {
  ...canonPeople,
  ...castPeople,
  keeper: { place: 'tavern', role: '派對酒吧老闆娘', known: '魯夫今天清晨乘小船出海了，說要成為海賊王。他從小就在店裡聽香克斯說海上的故事。' },
  mayor: { place: 'square', role: '風車村村長', known: '魯夫那小子今早真的出海當海賊去了。村民都是老實人；有事可以到酒吧找瑪琪諾。' },
  // Canon East Blue snapshot for the starting day. These are present states, not scripted futures:
  // what happens next depends on the players.
  rika: { place: 'shellsTown', role: '鎮上的小女孩', known: '劍士索隆被綁在海軍基地的廣場上，好幾天沒吃東西了。她做了飯糰想送去，但上校的兒子貝魯梅柏不准任何人靠近。' },
  zoro: { place: 'marineBase', role: '被綁在基地廣場的劍士', known: '他砍了上校兒子養的狼，和對方約好撐過一個月就放人。他不要別人替他鬆綁，只是餓得厲害。' },
  boodle: { place: 'orangeStreet', role: '橘子鎮鎮長', known: '小丑巴其海賊團佔據了鎮上，居民都躲到郊外。小狗修修還守著已故主人留下的寵物店，不肯離開。' },
  chouchou: { place: 'petShop', role: '守著寵物店的小狗', known: '牠守著已故主人留下的寵物店。店裡的狗糧袋被海賊踢散了，門板也壞了。' },
}
export const boatCrewReplies: Partial<Record<NpcId, string>> = {
  keeper: '是魯夫喔。他天一亮就乘著小船出海，說要成為海賊王。船上只有他一個人。',
  mayor: '那是魯夫的小船！那小子終於出海了，真是不讓人省心。',
}
export const landmarks = {
  square: '村子的集合點，村長常在這裡，鐵匠鋪可以強化武器、買傷藥',
  tavern: '找瑪琪諾聊天或點餐',
  dock: '補給鋪與船塢在這裡，可以買船出海',
  road: '穿過森林，往科爾波山或哥亞王國',
  hill: '山賊達丹一家的地盤',
  goa: '城下町的武器鋪販售武士刀和火槍，也能強化武器',
  shellsPort: '停泊或搭船離開謝爾茲鎮',
  shellsTown: '找莉卡，鎮民都很怕海軍上校',
  marineBase: '基地廣場綁著劍士索隆',
  orangePort: '停泊或搭船離開橘子鎮',
  orangeStreet: '找布德鎮長，街上空無一人',
  petShop: '小狗修修守著的店',
  ...canonLandmarks,
} as Record<LocationId, string>
export const meals = {
  bread: { name: '烤麵包', price: 15, hp: 2 * scale, sta: 4 },
  rice: { name: '燉肉飯', price: 35, hp: 5 * scale, sta: 8 },
}

export const shops: Partial<Record<LocationId, string>> = { square: '風車村鐵匠鋪', dock: '港口補給鋪', goa: '城下町武器鋪', logueShop: '一本松武器店', nanohana: '那諾哈娜雜貨攤', angelBeach: '天使海灘貝殼攤' }
export const goods = {
  spear: { label: '普通長槍', price: 500, initial: 1, shop: 'dock' },
  bandage: { label: '繃帶', price: 80, initial: 4, shop: 'dock' },
  bullets: { label: '火槍彈藥', price: 30, initial: 12, shop: 'dock' },
  sword: { label: '普通武士刀', price: 600, initial: 2, shop: 'goa' },
  musket: { label: '普通火槍', price: 900, initial: 2, shop: 'goa' },
  tonic: { label: '傷藥', price: 120, initial: 10, shop: 'square' },
  logPose: { label: '記錄指針', price: 1000, initial: 4, shop: 'logueShop' },
  // Answers to logia bodies before haki exists (see foes.ts Weakness).
  waterskin: { label: '水壺', price: 30, initial: 6, shop: 'nanohana' },
  seastone: { label: '海樓石十手', price: 3000, initial: 1, shop: 'logueShop' },
  dial: { label: '衝擊貝', price: 300, initial: 4, shop: 'angelBeach' },
} as const satisfies Record<string, { label: string, price: number, initial: number, shop: LocationId }>
export type Good = keyof typeof goods
/** Inventory item that lets a character wield each weapon. Bare hands need nothing. */
export const weaponItems: Record<Exclude<Weapon, 'fist'>, string> = { sword: '普通武士刀', spear: '普通長槍', musket: '普通火槍' }
export const weaponNames: Record<Weapon, string> = { fist: '徒手', ...weaponItems }
/** The attack method picked at creation: the starting weapon, and a bonus whenever the character fights that way.
 * Bare hands roll a smaller die (d4), so their mastery adds more damage. */
export const fightingStyles: Record<Weapon, { label: string, hit: number, damage: number, kit: string }> = {
  fist: { label: '拳腳', hit: 1, damage: 2, kit: '空手或用腳打，不必帶武器' },
  sword: { label: '刀劍', hit: 1, damage: 1, kit: '開局帶一把普通武士刀' },
  spear: { label: '長兵器', hit: 1, damage: 1, kit: '開局帶一把普通長槍' },
  musket: { label: '火槍', hit: 1, damage: 1, kit: '開局帶一把普通火槍和 5 發彈藥' },
}
/** The mastery bonus applies only while the character fights with their own attack method. */
export const masteryOf = (c: Pick<Character, 'weapon' | 'fighting'>) => c.weapon === c.fighting ? fightingStyles[c.fighting] : undefined
export const fightingSummary = (style: Weapon) =>
  fightingStyles[style].kit + '；用這種方式戰鬥時命中 +' + fightingStyles[style].hit + '、傷害 +' + fightingStyles[style].damage

export type Character = CharacterInput & {
  place: LocationId
  conversingWith?: NpcId | null
  money: number
  inventory: Record<string, number>
  weapon: Weapon
  loaded: boolean
  hp: number
  sta: number
  level: number
  xp: number
  /** Free attribute points earned at levels 4, 8, 12… */
  unspent: number
  /** Skill points, one per level gained, spent on any skill up to world/skills.ts skillCap. */
  skillPoints: number
  /** Times each repeatable activity has paid XP, for diminishing returns. */
  xpLog: Record<string, number>
  skillRanks: Record<string, number>
  /** Bounty the Marines have put on this character's head. */
  bounty: number
  /** Self-made techniques (spec §7.6): a name and a cost tier only; flashy names add no damage. */
  techniques: Technique[]
  /** The devil fruit this character ate, if any (only one may be eaten). */
  fruit?: FruitId
  /** The race's one-time gifts (a human's extra point, a mink's Electro) were handed out. */
  raceReady?: boolean
  /** Forge tier (0–3) of each weapon kind, from reforging at a forge (see world/forge.ts). */
  gear?: Partial<Record<Weapon, number>>
}
export type Technique = { name: string, style: 'special' | 'advanced' | 'flurry', /** Granted by a devil fruit; does not count toward the six self-made moves. */ fruit?: true,
  /** Born with it (a race's move); does not count either. */ innate?: true }
/** Moves the player made up themselves (at most six). */
export const selfMade = (move: Technique) => !move.fruit && !move.innate
export type CombatChoice = Extract<Intent, { kind: 'attack' | 'guard' | 'flee' | 'negotiate' | 'reload' | 'useItem' }>
/** A voyage interrupted by a sea encounter; it resumes once the fight is over. */
export type PendingVoyage = RouteChoice & { from: IslandId, miles: number, minutes: number, damage: number, text: string, landfallXp: number }
export type Combat = {
  round: number
  /** Where the fight happens; at sea it is the port the ship left from. */
  place: LocationId
  participants: string[]
  foes: Foe[]
  choices: Record<string, CombatChoice>
  sea?: PendingVoyage
}
export type Member = {
  id: string, host: boolean, ready: boolean, agree: boolean, approved: boolean, character?: Character
  /** Joined after the story started; not part of N until admitted at a safe port. */
  pendingJoin?: boolean
}
export type Proposal = {
  id: string
  type: 'formCrew' | 'ordinary' | 'depart' | 'sellShip'
  title: string
  votes: Record<string, boolean>
  passed: boolean
}
/** An NPC who joined the party. Their place is always their leader's place, so they follow, board and fight with the players. */
export type Companion = {
  /** Member id of the player who recruited them; if that player is gone they follow the first party member. */
  leader: string
  /** Game minute when they joined. */
  since: number
  hp: number
  /** The party level their numbers were last scaled to; they grow with the party. */
  level?: number
  /** What they knew before joining, restored when they leave the party. */
  facts?: string
}
/** What the party has heard, newest last: rumors before an event, warnings, eyewitness reports, the morning paper. */
export type NewsItem = {
  minute: number
  kind: 'rumor' | 'warning' | 'scene' | 'witness' | 'paper' | 'after'
  text: string
  island?: IslandId
  event?: string
}
/** A headline waiting for the next morning paper that is due at or after `due`. */
export type PaperItem = { minute: number, due: number, text: string, island?: IslandId, event?: string }

export type World = {
  code: string
  version: number
  started: boolean
  minute: number
  members: Member[]
  /** Number scale the saved HP values use (see world/scale.ts); missing means 1. */
  scale?: number
  stock: Record<Good, number>
  /** Fruits dropped by knocked-out NPCs, waiting for the last-blow player to eat or release them. */
  fruitOffers?: { fruit: FruitId, npc: NpcId, to: string, since: number }[]
  /** Fruits released into the world: they appear at the Sabaody auction once `ready` has passed. */
  fruitStalls?: { fruit: FruitId, from: NpcId, ready: number }[]
  /** NPCs whose fruit is gone (eaten or released): they lose the power. */
  fruitLost?: Partial<Record<NpcId, true>>
  memories: Record<NpcId, string[]>
  combat?: Combat
  proposals: Proposal[]
  crew: boolean
  ship?: Ship
  sailing?: SailingPlan
  islandTasks?: Partial<Record<IslandId, IslandTask>>
  /** NPC places changed by the timeline or quests; null means gone. Overrides people[npc].place. */
  npcPlaces?: Partial<Record<NpcId, LocationId | null>>
  /** NPC knowledge changed by the timeline or quests. Overrides people[npc].known. */
  npcFacts?: Partial<Record<NpcId, string>>
  /** Timeline events that already fired, and whether players changed the outcome. */
  timeline?: Record<string, 'canon' | 'changed'>
  /** What the players did, by flag name (see world/flags.ts). The value is the minute it first happened. */
  flags?: Record<string, number>
  /** Per-event bookkeeping: `<event>:omen`, `:warn`, `:scene`, `:until`, `:fired`, `:after`, and `:omen:heard` / `:warn:heard`. -1 means skipped. */
  phases?: Record<string, number>
  /** News the party has received, for the calendar panel (the newest 80). */
  news?: NewsItem[]
  /** Headlines that are not out yet: they wait for the next 06:00 paper after the news has had time to travel. */
  paperQueue?: PaperItem[]
  /** Index of the newest morning paper already printed (paper d is out at day d, 06:00). */
  paperDay?: number
  /** Dice-checked free actions, newest last. Every AI prompt sees them so the story can leave canon. */
  chronicle?: string[]
  /** Named NPCs knocked out until this minute; they cannot talk or fight before then. */
  npcDown?: Partial<Record<NpcId, number>>
  /** Named NPCs the players have beaten at least once (the timeline reacts to some of them). */
  defeated?: NpcId[]
  /** Separate reputations (spec §9): Marine attention and how each island sees the party. */
  renown?: { marineHeat: number, islandRep: Partial<Record<IslandId, number>> }
  /** Turns off random sea encounters (quiet story stretches or tests). */
  calmSeas?: boolean
  /** NPCs who joined the party (see world/companions.ts). Their place follows their leader. */
  companions?: Partial<Record<NpcId, Companion>>
  /** Which side the party took in the Summit War (see world/war.ts). */
  warSide?: 'whitebeard' | 'marine' | 'none'
  /** Failed attempts at each war goal; every try adds +1 to the next. */
  warTries?: Record<string, number>
  /** Day (0-based) each wild spot was last gathered; one gathering per spot per day. */
  gathered?: Partial<Record<LocationId, number>>
  /** Minute before which an NPC who refused an invitation will not listen to another one. */
  recruitRetry?: Partial<Record<NpcId, number>>
}

/** What place lookups need: companions resolve through the members, so pass the whole world when you have it. */
type PlaceWorld = Pick<World, 'npcPlaces'> & Partial<Pick<World, 'companions' | 'members'>>

/** Where a companion is: with the player who recruited them, or with the first party member if that player is gone. */
export function companionPlace(world: Partial<Pick<World, 'members'>>, companion: Companion): LocationId | null {
  const members = world.members ?? []
  const here = (m: Member) => !!m.character && !m.pendingJoin
  const leader = members.find(m => m.id === companion.leader && here(m)) ?? members.find(here)
  return leader?.character?.place ?? null
}
export function npcPlace(world: PlaceWorld, npc: NpcId): LocationId | null {
  const companion = world.companions?.[npc]
  if (companion) return companionPlace(world, companion)
  const moved = world.npcPlaces?.[npc]
  return moved !== undefined ? moved : people[npc].place
}
export function npcFacts(world: Pick<World, 'npcFacts'>, npc: NpcId) {
  return world.npcFacts?.[npc] ?? people[npc].known
}
export function npcsAt(world: PlaceWorld, place: LocationId) {
  return (Object.keys(people) as NpcId[]).filter(npc => npcPlace(world, npc) === place)
}

/** The N of spec §1.3: joined players who hold an admitted character. Disconnected members still count. */
export function party<M extends Member>(world: { members: M[] }): M[] {
  return world.members.filter(m => m.character && !m.pendingJoin)
}

const initialStock = () => Object.fromEntries(Object.entries(goods).map(([id, good]) => [id, good.initial])) as Record<Good, number>
const emptyMemories = () => Object.fromEntries(Object.keys(npcs).map(id => [id, []])) as unknown as Record<NpcId, string[]>

export function newWorld(code: string, host: string): World {
  return {
    code, version: 0, started: false, minute: 8 * 60,
    members: [{ id: host, host: true, ready: false, agree: false, approved: false }],
    scale,
    stock: initialStock(), memories: emptyMemories(), proposals: [], crew: false,
  }
}

/** Fills fields added after a save was written. Idempotent; never changes values that already exist. */
export function normalizeWorld(world: World): World {
  // Saves written before (or under another) number scale: multiply every stored HP once.
  const ratio = scale / (world.scale ?? 1)
  if (ratio !== 1) {
    for (const member of world.members) if (member.character) member.character.hp = Math.round(member.character.hp * ratio)
    for (const companion of Object.values(world.companions ?? {})) if (companion) companion.hp = Math.round(companion.hp * ratio)
    for (const foe of world.combat?.foes ?? []) { foe.hp = Math.round(foe.hp * ratio); foe.maxHp = Math.round(foe.maxHp * ratio) }
    world.scale = scale
  }
  const stock = initialStock()
  for (const id of Object.keys(stock) as Good[]) world.stock[id] ??= stock[id]
  for (const id of Object.keys(npcs) as NpcId[]) world.memories[id] ??= []
  for (const member of world.members) {
    const c = member.character
    if (!c) continue
    c.unspent ??= 0
    // Skills grew with levels only after this was added: older characters get the points they would have earned.
    c.skillPoints ??= c.level - 1
    c.xpLog ??= {}
    c.bounty ??= 0
    c.techniques ??= []
    // Age and background were dropped from the character card; the attack method used to follow the main skill.
    const card = c as Character & { age?: number, background?: string }
    delete card.age
    delete card.background
    c.fighting ??= ({ 劍術: 'sword', 長兵器: 'spear', 射擊: 'musket' } as Record<string, Weapon>)[c.major] ?? 'fist'
    // 「其他」 is no longer a race: custom races become humans.
    const old = c as Character & { otherRace?: string }
    if (!(c.race in raceTraits)) c.race = '人類'
    delete old.otherRace
    applyRace(c)
  }
  dropRemovedContent(world)
  return world
}

// The original side content (潮燈島, 霧灣島, the 潮汐簿 quest and its five NPCs) was removed; saves that still
// mention it are moved back into the canon world. Ids are plain strings here because the types no longer know them.
const removedPlaces = new Set(['lanternPort', 'lighthouse', 'tideCave', 'mistPort', 'netSlope', 'whiteBay'])
const removedIslands = ['lantern', 'mist']
const removedNpcs = ['clerk', 'watch', 'courier', 'lamplighter', 'sounder']
function dropRemovedContent(world: World) {
  const old = world as World & Record<string, unknown>
  for (const key of ['quest', 'clue', 'courierHP', 'settled', 'logHolder']) delete old[key]
  for (const member of world.members) {
    const c = member.character
    if (!c) continue
    if (removedPlaces.has(c.place)) c.place = 'dock'
    if (c.conversingWith && removedNpcs.includes(c.conversingWith)) c.conversingWith = null
    delete c.inventory['潮汐簿']
  }
  if (world.ship) {
    if (removedPlaces.has(world.ship.port)) world.ship.port = 'dock'
    delete (world.ship as { borrowed?: boolean }).borrowed
  }
  const sailing = world.sailing
  if (sailing && (removedIslands.includes(sailing.from) || Object.values(sailing.ballots).some(b => removedIslands.includes(b.to)))) delete world.sailing
  // Saves from before the general combat system had a fight without foes (against the courier).
  const combat = world.combat as (Combat & { foes?: Foe[] }) | undefined
  if (combat && (!combat.foes || removedPlaces.has(combat.place) || combat.foes.some(foe => foe.npc && removedNpcs.includes(foe.npc)) ||
    (combat.sea && removedIslands.includes(combat.sea.to)))) delete world.combat
  for (const island of removedIslands) {
    delete (world.islandTasks as Record<string, unknown> | undefined)?.[island]
    delete (world.renown?.islandRep as Record<string, unknown> | undefined)?.[island]
  }
  for (const npc of removedNpcs) for (const table of [world.memories, world.companions, world.npcDown, world.npcPlaces, world.npcFacts, world.recruitRetry])
    delete (table as Record<string, unknown> | undefined)?.[npc]
  if (world.defeated) world.defeated = world.defeated.filter(npc => !removedNpcs.includes(npc))
  if (world.fruitOffers) world.fruitOffers = world.fruitOffers.filter(offer => !removedNpcs.includes(offer.npc))
}

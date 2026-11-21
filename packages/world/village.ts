import type { CharacterInput, Intent, IslandId, LocationId, NpcId, Weapon } from '../shared/protocol.ts'
import { npcs } from '../shared/protocol.ts'
import type { Ship, SailingPlan, IslandTask, RouteChoice } from './sea.ts'
import type { Foe } from './foes.ts'
import { canonIslands, canonPeople } from './canon.ts'
import { npcFoe } from './foes.ts'

/** Canon islands are laid out as port ↔ second place ↔ third place. */
const canonPaths = Object.fromEntries(Object.values(canonIslands).flatMap(({ places: [[a], [b], [c]] }) =>
  [[a, [b]], [b, [a, c]], [c, [b]]])) as Record<string, LocationId[]>
const canonLandmarks = Object.fromEntries(Object.values(canonIslands).flatMap(island =>
  island.places.map(([id, , landmark]) => [id, landmark]))) as Record<string, string>

// Canon start snapshot (spec §1.2): the morning Luffy leaves Foosha Village on Dawn Island, before he meets Zoro.
// Named canon people only appear through facts stated here; the 潮汐簿 side quest and its cast are original.
export const opening = '今天清晨，魯夫乘著一艘小船離開了黎明島的風車村，說要成為海賊王。港口的人還在談論這件事。' +
  '你們是相識多年的朋友，此刻在風車村廣場碰頭。你們還沒有海賊團、船長或共同的船；派對酒吧飄來瑪琪諾烤麵包的香氣。' +
  '往哪裡去、要成為什麼樣的人，由你們自己決定。'
export const tideEvent = { minute: 8 * 60 + 30, text: '風車村港口響起漲潮鐘。提奧在木樁上劃下今天的第一道水位記號。' }
export const paths = {
  square: ['tavern', 'dock', 'road'], tavern: ['square'],
  dock: ['square', 'road'], road: ['square', 'dock', 'hill', 'goa'], hill: ['road'], goa: ['road'],
  lanternPort: ['lighthouse'], lighthouse: ['lanternPort', 'tideCave'], tideCave: ['lighthouse'],
  mistPort: ['netSlope'], netSlope: ['mistPort', 'whiteBay'], whiteBay: ['netSlope'],
  shellsPort: ['shellsTown'], shellsTown: ['shellsPort', 'marineBase'], marineBase: ['shellsTown'],
  orangePort: ['orangeStreet'], orangeStreet: ['orangePort', 'petShop'], petShop: ['orangeStreet'],
  ...canonPaths,
} as Record<LocationId, LocationId[]>
/** Game minutes to walk one path segment. The Goa Kingdom lies beyond the forest road. */
export function walkMinutes(from: LocationId, to: LocationId) {
  return from === 'goa' || to === 'goa' ? 40 : 6
}
/** Starting place (null: away at sea), role and Day-1 knowledge. The timeline can change both via World. */
export const people: Record<NpcId, { place: LocationId | null, role: string, known: string }> = {
  ...canonPeople,
  keeper: { place: 'tavern', role: '派對酒吧老闆娘', known: '魯夫今天清晨乘小船出海了，說要成為海賊王。港口的提奧正在尋找遺失的潮汐簿。' },
  clerk: { place: 'dock', role: '港務記錄員', known: '港務的潮汐簿失蹤了。昨夜的搬運工曾往科爾波山山道去。' },
  watch: { place: 'road', role: '巡守', known: '昨晚有人抱著包裹往山坡走，可在山道注意鞋印。科爾波山深處是山賊的地盤，別走太深。' },
  courier: { place: 'hill', role: '搬運工', known: '潮汐簿被他帶走。他想補上帳簿裡漏記的工錢；願意有人替他轉達。' },
  lamplighter: { place: 'lighthouse', role: '守燈人', known: '防波堤旁滅了一盞燈。備用透鏡落在海蝕洞裡，我需要它讓航道重新點亮。' },
  sounder: { place: 'netSlope', role: '領潮員', known: '一艘測潮艇早上漂到白灘灣，探潮人也還沒回來，請沿著岸邊找找。' },
  mayor: { place: 'square', role: '風車村村長', known: '魯夫那小子今早真的出海當海賊去了。村民都是老實人；有事可以去港口找提奧，或到酒吧找瑪琪諾。' },
  // Canon East Blue snapshot for the starting day. These are present states, not scripted futures:
  // what happens next depends on the players.
  rika: { place: 'shellsTown', role: '鎮上的小女孩', known: '劍士索隆被綁在海軍基地的廣場上，好幾天沒吃東西了。她做了飯糰想送去，但上校的兒子貝魯梅柏不准任何人靠近。' },
  zoro: { place: 'marineBase', role: '被綁在基地廣場的劍士', known: '他砍了上校兒子養的狼，和對方約好撐過一個月就放人。他不要別人替他鬆綁，只是餓得厲害。' },
  boodle: { place: 'orangeStreet', role: '橘子鎮鎮長', known: '小丑巴其海賊團佔據了鎮上，居民都躲到郊外。小狗修修還守著已故主人留下的寵物店，不肯離開。' },
  chouchou: { place: 'petShop', role: '守著寵物店的小狗', known: '牠守著已故主人留下的寵物店。店裡的狗糧袋被海賊踢散了，門板也壞了。' },
}
export const boatCrewReplies: Partial<Record<NpcId, string>> = {
  keeper: '是魯夫喔。他天一亮就乘著小船出海，說要成為海賊王。港口的提奧負責登記船隻，細節可以問他。',
  clerk: '那艘小艇是魯夫的，他沒來登記就出港了，船上只有他一個人。',
  mayor: '那是魯夫的小船！那小子終於出海了，真是不讓人省心。',
}
export const landmarks = {
  square: '村子的集合點，村長常在這裡',
  tavern: '找瑪琪諾聊天或點餐',
  dock: '找提奧問潮汐簿，補給鋪與船塢也在這裡',
  road: '找巡守蘇芮，往科爾波山或哥亞王國',
  hill: '查看山道上的痕跡',
  goa: '城下町的武器鋪販售武士刀',
  lanternPort: '停泊或搭船離開潮燈島',
  lighthouse: '找守燈人蕊卡',
  tideCave: '踏勘洞口的石階和沉積物',
  mistPort: '停泊或搭船離開霧灣島',
  netSlope: '找領潮員洛汀',
  whiteBay: '沿岸搜索漂流船和探潮人',
  shellsPort: '停泊或搭船離開謝爾茲鎮',
  shellsTown: '找莉卡，鎮民都很怕海軍上校',
  marineBase: '基地廣場綁著劍士索隆',
  orangePort: '停泊或搭船離開橘子鎮',
  orangeStreet: '找布德鎮長，街上空無一人',
  petShop: '小狗修修守著的店',
  ...canonLandmarks,
} as Record<LocationId, string>
export const meals = {
  bread: { name: '烤麵包', price: 15 },
  rice: { name: '燉肉飯', price: 35 },
}

export const shops: Partial<Record<LocationId, string>> = { dock: '港口補給鋪', goa: '城下町武器鋪', logueShop: '一本松武器店' }
export const goods = {
  spear: { label: '普通長槍', price: 500, initial: 1, shop: 'dock' },
  bandage: { label: '繃帶', price: 80, initial: 4, shop: 'dock' },
  bullets: { label: '火槍彈藥', price: 30, initial: 12, shop: 'dock' },
  sword: { label: '普通武士刀', price: 600, initial: 2, shop: 'goa' },
  logPose: { label: '記錄指針', price: 1000, initial: 4, shop: 'logueShop' },
} as const satisfies Record<string, { label: string, price: number, initial: number, shop: LocationId }>
export type Good = keyof typeof goods
/** Inventory item that lets a character wield each weapon. Bare hands need nothing. */
export const weaponItems: Record<Exclude<Weapon, 'fist'>, string> = { sword: '普通武士刀', spear: '普通長槍', musket: '普通火槍' }
export const weaponNames: Record<Weapon, string> = { fist: '徒手', ...weaponItems }

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
  /** Times each repeatable activity has paid XP, for diminishing returns. */
  xpLog: Record<string, number>
  skillRanks: Record<string, number>
  /** Bounty the Marines have put on this character's head. */
  bounty: number
  /** Self-made techniques (spec §7.6): a name and a cost tier only; flashy names add no damage. */
  techniques: Technique[]
}
export type Technique = { name: string, style: 'special' | 'advanced' | 'flurry' }
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
export type World = {
  code: string
  version: number
  started: boolean
  minute: number
  members: Member[]
  quest: 'unoffered' | 'offered' | 'active' | 'recovered' | 'done' | 'abandoned'
  clue: boolean
  courierHP: number
  settled: boolean
  logHolder?: string
  stock: Record<Good, number>
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
}

export function npcPlace(world: Pick<World, 'npcPlaces'>, npc: NpcId): LocationId | null {
  const moved = world.npcPlaces?.[npc]
  return moved !== undefined ? moved : people[npc].place
}
export function npcFacts(world: Pick<World, 'npcFacts'>, npc: NpcId) {
  return world.npcFacts?.[npc] ?? people[npc].known
}
export function npcsAt(world: Pick<World, 'npcPlaces'>, place: LocationId) {
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
    quest: 'unoffered', clue: false, courierHP: 20, settled: false,
    stock: initialStock(), memories: emptyMemories(), proposals: [], crew: false,
  }
}

/** Fills fields added after a save was written. Idempotent; never changes values that already exist. */
export function normalizeWorld(world: World): World {
  const stock = initialStock()
  for (const id of Object.keys(stock) as Good[]) world.stock[id] ??= stock[id]
  for (const id of Object.keys(npcs) as NpcId[]) world.memories[id] ??= []
  for (const member of world.members) {
    const c = member.character
    if (!c) continue
    c.unspent ??= 0
    c.xpLog ??= {}
    c.bounty ??= 0
    c.techniques ??= []
  }
  // Saves from before the general combat system only had the hill fight against the courier.
  const legacy = world.combat as (Combat & { foes?: Foe[] }) | undefined
  if (legacy && !legacy.foes) {
    legacy.place = 'hill'
    legacy.foes = [{ ...npcFoe('courier', world.minute), hp: world.courierHP }]
  }
  return world
}

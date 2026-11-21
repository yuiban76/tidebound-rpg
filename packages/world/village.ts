import type { CharacterInput, Intent, IslandId, LocationId, NpcId, Weapon } from '../shared/protocol.ts'
import { npcs } from '../shared/protocol.ts'
import type { Ship, SailingPlan, IslandTask } from './sea.ts'

// Canon start snapshot (spec §1.2): the morning Luffy leaves Foosha Village on Dawn Island, before he meets Zoro.
// Named canon people only appear through facts stated here; the 潮汐簿 side quest and its cast are original.
export const opening = '今天清晨，魯夫乘著一艘小船離開了黎明島的風車村，說要成為海賊王。港口的人還在談論這件事。' +
  '你們是相識多年的朋友，此刻在風車村廣場碰頭。你們還沒有海賊團、船長或共同的船；派對酒吧飄來瑪琪諾烤麵包的香氣。' +
  '往哪裡去、要成為什麼樣的人，由你們自己決定。'
export const tideEvent = { minute: 8 * 60 + 30, text: '風車村港口響起漲潮鐘。提奧在木樁上劃下今天的第一道水位記號。' }
export const paths: Record<LocationId, LocationId[]> = {
  square: ['tavern', 'dock', 'road'], tavern: ['square'],
  dock: ['square', 'road'], road: ['square', 'dock', 'hill', 'goa'], hill: ['road'], goa: ['road'],
  lanternPort: ['lighthouse'], lighthouse: ['lanternPort', 'tideCave'], tideCave: ['lighthouse'],
  mistPort: ['netSlope'], netSlope: ['mistPort', 'whiteBay'], whiteBay: ['netSlope'],
}
/** Game minutes to walk one path segment. The Goa Kingdom lies beyond the forest road. */
export function walkMinutes(from: LocationId, to: LocationId) {
  return from === 'goa' || to === 'goa' ? 40 : 6
}
export const people: Record<NpcId, { place: LocationId, role: string, known: string }> = {
  keeper: { place: 'tavern', role: '派對酒吧老闆娘', known: '魯夫今天清晨乘小船出海了，說要成為海賊王。港口的提奧正在尋找遺失的潮汐簿。' },
  clerk: { place: 'dock', role: '港務記錄員', known: '港務的潮汐簿失蹤了。昨夜的搬運工曾往科爾波山山道去。' },
  watch: { place: 'road', role: '巡守', known: '昨晚有人抱著包裹往山坡走，可在山道注意鞋印。科爾波山深處是山賊的地盤，別走太深。' },
  courier: { place: 'hill', role: '搬運工', known: '潮汐簿被他帶走。他想補上帳簿裡漏記的工錢；願意有人替他轉達。' },
  lamplighter: { place: 'lighthouse', role: '守燈人', known: '防波堤旁滅了一盞燈。備用透鏡落在海蝕洞裡，我需要它讓航道重新點亮。' },
  sounder: { place: 'netSlope', role: '領潮員', known: '一艘測潮艇早上漂到白灘灣，探潮人也還沒回來，請沿著岸邊找找。' },
  mayor: { place: 'square', role: '風車村村長', known: '魯夫那小子今早真的出海當海賊去了。村民都是老實人；有事可以去港口找提奧，或到酒吧找瑪琪諾。' },
}
export const boatCrewReplies: Partial<Record<NpcId, string>> = {
  keeper: '是魯夫喔。他天一亮就乘著小船出海，說要成為海賊王。港口的提奧負責登記船隻，細節可以問他。',
  clerk: '那艘小艇是魯夫的，他沒來登記就出港了，船上只有他一個人。',
  mayor: '那是魯夫的小船！那小子終於出海了，真是不讓人省心。',
}
export const landmarks: Record<LocationId, string> = {
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
}
export const meals = {
  bread: { name: '烤麵包', price: 15 },
  rice: { name: '燉肉飯', price: 35 },
}

export const shops: Partial<Record<LocationId, string>> = { dock: '港口補給鋪', goa: '城下町武器鋪' }
export const goods = {
  spear: { label: '普通長槍', price: 500, initial: 1, shop: 'dock' },
  bandage: { label: '繃帶', price: 80, initial: 4, shop: 'dock' },
  bullets: { label: '火槍彈藥', price: 30, initial: 12, shop: 'dock' },
  sword: { label: '普通武士刀', price: 600, initial: 2, shop: 'goa' },
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
}
export type CombatChoice = Extract<Intent, { kind: 'attack' | 'guard' | 'flee' | 'negotiate' | 'reload' }>
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
  combat?: { round: number, participants: string[], choices: Record<string, CombatChoice> }
  proposals: Proposal[]
  crew: boolean
  ship?: Ship
  sailing?: SailingPlan
  islandTasks?: Partial<Record<IslandId, IslandTask>>
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
  }
  return world
}

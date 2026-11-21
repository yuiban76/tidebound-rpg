import { z } from 'zod'
import { canonIslandIds, canonLocations, canonNpcs } from './atlas.ts'

export const attributes = ['STR', 'AGI', 'CON', 'PER', 'INT', 'WIL'] as const
export const attributeLabels = { STR: '力量', AGI: '敏捷', CON: '體魄', PER: '感知', INT: '智識', WIL: '意志' }
export const races = ['人類', '魚人', '人魚', '毛皮族', '空島居民', '長手族', '長腿族', '小人族', '巨人', '其他'] as const
export const skills = ['格鬥', '劍術', '長兵器', '射擊', '閃避', '觀察', '說服', '醫術', '航海', '工藝', '採集', '烹飪'] as const
export const locations = {
  square: '風車村廣場', tavern: '派對酒吧', dock: '風車村港口', road: '村外小路', hill: '科爾波山山道',
  goa: '哥亞王國城下町',
  lanternPort: '潮燈碼頭', lighthouse: '潮燈塔', tideCave: '海蝕洞',
  mistPort: '霧灣泊位', netSlope: '曬網坡', whiteBay: '白灘灣',
  shellsPort: '謝爾茲鎮港口', shellsTown: '謝爾茲鎮大街', marineBase: '海軍第153分部',
  orangePort: '橘子鎮港口', orangeStreet: '橘子鎮大街', petShop: '寵物店',
  ...canonLocations,
}
export const npcs = { keeper: '瑪琪諾', clerk: '提奧', watch: '蘇芮', courier: '岬恩', lamplighter: '蕊卡', sounder: '洛汀', mayor: '村長',
  rika: '莉卡', zoro: '索隆', boodle: '布德鎮長', chouchou: '修修', ...canonNpcs }
export const weapons = ['fist', 'sword', 'spear', 'musket'] as const
export type Weapon = (typeof weapons)[number]
const locationIds = Object.keys(locations) as (keyof typeof locations)[]
const npcIds = Object.keys(npcs) as (keyof typeof npcs)[]
export const islandIds = ['wind', 'lantern', 'mist', 'shells', 'orange', ...canonIslandIds] as const
export type IslandId = (typeof islandIds)[number]
export const sailingPaces = ['steady', 'fast'] as const
export type SailingPace = (typeof sailingPaces)[number]
const text = (length: number) => z.string().trim().min(1).max(length)
const identifier = z.uuid()
const stats = z.strictObject({
  STR: z.number().int().min(2).max(4), AGI: z.number().int().min(2).max(4),
  CON: z.number().int().min(2).max(4), PER: z.number().int().min(2).max(4),
  INT: z.number().int().min(2).max(4), WIL: z.number().int().min(2).max(4),
})

export const characterInput = z.strictObject({
  name: text(24), age: z.number().int().min(1).max(400),
  race: z.enum(races), otherRace: z.string().trim().max(32).optional(),
  appearance: text(300), personality: text(300), dream: text(300),
  origin: text(300), background: text(600), style: text(300),
  stats, major: z.enum(skills), basics: z.tuple([z.enum(skills), z.enum(skills)]),
  life: z.enum(['航海', '醫術', '工藝', '採集', '烹飪']),
}).superRefine((value, ctx) => {
  if (Object.values(value.stats).reduce((a, b) => a + b, 0) !== 18)
    ctx.addIssue({ code: 'custom', path: ['stats'], message: '六項屬性合計必須是 18。' })
  if (new Set([value.major, ...value.basics, value.life]).size !== 4)
    ctx.addIssue({ code: 'custom', path: ['major'], message: '四項初始技能不可重複。' })
  if (value.race === '其他' && !value.otherRace)
    ctx.addIssue({ code: 'custom', path: ['otherRace'], message: '請填寫自訂種族。' })
})
export type CharacterInput = z.infer<typeof characterInput>
export type LocationId = keyof typeof locations
export type NpcId = keyof typeof npcs

export const aiInput = z.strictObject({
  baseUrl: z.url({ protocol: /^https?$/ }).max(500),
  model: text(180),
  apiKey: z.string().trim().max(1024).optional(),
})
export type AiInput = z.infer<typeof aiInput>
export const aiErrorCategories = ['refused', 'notFound', 'auth', 'model', 'timeout', 'empty', 'format', 'interrupted', 'http'] as const
export type AiErrorCategory = (typeof aiErrorCategories)[number]
export type AiStatus = {
  state: 'unconfigured' | 'testing' | 'passed' | 'failed' | 'lost'
  model?: string
  lastSuccessfulTest?: string
  reason?: string
  errorCategory?: AiErrorCategory
}

export const freeDifficulties = ['easy', 'normal', 'hard', 'extreme'] as const
export const intentSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('move'), to: z.enum(locationIds), talkTo: z.enum(npcIds).optional() }),
  z.strictObject({ kind: z.literal('guide') }),
  z.strictObject({ kind: z.literal('location') }),
  z.strictObject({ kind: z.literal('talk'), npc: z.enum(npcIds) }),
  z.strictObject({ kind: z.literal('meal'), dish: z.enum(['bread', 'rice']) }),
  z.strictObject({ kind: z.literal('crew') }),
  z.strictObject({ kind: z.literal('sail'), order: z.enum(['buy', 'borrow', 'materials', 'repair', 'vote', 'ready', 'unready', 'depart']), destination: z.enum(islandIds).optional(), pace: z.enum(sailingPaces).optional() }),
  z.strictObject({ kind: z.literal('islandTask'), step: z.enum(['accept', 'search', 'deliver']) }),
  z.strictObject({ kind: z.literal('check'), method: z.enum(['observe', 'climb', 'search', 'sneak']) }),
  z.strictObject({ kind: z.literal('attack'), npc: z.literal('courier'), power: z.boolean() }),
  z.strictObject({ kind: z.literal('negotiate'), npc: z.literal('courier') }),
  z.strictObject({ kind: z.literal('guard') }),
  z.strictObject({ kind: z.literal('flee') }),
  z.strictObject({ kind: z.literal('quest'), step: z.enum(['accept', 'deliver', 'abandon']) }),
  z.strictObject({ kind: z.literal('rest'), sleep: z.boolean() }),
  z.strictObject({ kind: z.literal('aid'), patient: z.string().min(1).max(24) }),
  z.strictObject({ kind: z.literal('buy'), item: z.enum(['spear', 'bandage', 'bullets', 'sword', 'logPose']) }),
  z.strictObject({ kind: z.literal('wait'), hours: z.number().int().min(1).max(240) }),
  z.strictObject({
    kind: z.literal('give'), to: z.string().trim().min(1).max(24),
    item: z.string().trim().min(1).max(24).optional(), count: z.number().int().min(1).max(99).optional(),
    money: z.number().int().min(1).max(10_000_000).optional(),
  }),
  z.strictObject({ kind: z.literal('equip'), weapon: z.enum(weapons) }),
  z.strictObject({ kind: z.literal('reload') }),
  z.strictObject({ kind: z.literal('social') }),
  z.strictObject({
    kind: z.literal('free'),
    /** Present when the outcome is uncertain: the rules roll D20 + attribute + skill against the difficulty. */
    check: z.strictObject({ attr: z.enum(attributes), skill: z.enum(skills).optional(), difficulty: z.enum(freeDifficulties) }).optional(),
    /** The NPC on the scene the action is aimed at, whose knowledge records the outcome. */
    npc: z.enum(npcIds).optional(),
  }),
  z.strictObject({ kind: z.literal('unsupported') }),
])
export type Intent = z.infer<typeof intentSchema>
export const proposals = ['formCrew', 'ordinary', 'depart', 'sellShip'] as const
export const messageSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('character'), character: characterInput }),
  z.strictObject({ kind: z.literal('ready'), ready: z.boolean(), agree: z.boolean() }),
  z.strictObject({ kind: z.literal('sync'), after: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER) }),
  z.strictObject({ kind: z.literal('history'), before: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) }),
  z.strictObject({ kind: z.literal('act'), id: identifier, version: z.number().int().nonnegative(), text: text(1000) }),
  z.strictObject({ kind: z.literal('cancel'), id: identifier }),
  z.strictObject({ kind: z.literal('chat'), id: identifier, text: text(500) }),
  z.strictObject({ kind: z.literal('propose'), type: z.enum(proposals), title: text(60) }),
  z.strictObject({ kind: z.literal('vote'), id: identifier, yes: z.boolean() }),
  z.strictObject({ kind: z.literal('allocate'), attr: z.enum(attributes) }),
])
export type Message = z.infer<typeof messageSchema>
export const peerRequest = z.strictObject({
  id: identifier,
  body: z.union([
    z.strictObject({ kind: z.literal('hello'), token: z.string().regex(/^[a-f0-9]{64}$/).optional() }),
    messageSchema,
  ]),
})
export type PeerRequest = z.infer<typeof peerRequest>

export const aiLabels: Record<AiStatus['state'], string> = {
  unconfigured: '未設定', testing: '連線檢查中', passed: '已連線',
  failed: '測試失敗', lost: '遊戲中失聯',
}
export const aiCategoryLabels: Record<AiErrorCategory, string> = {
  refused: '連線被拒', notFound: '找不到端點', auth: '認證失敗', model: '模型不存在或參數無效',
  timeout: '逾時', empty: '空白輸出', format: '格式不符', interrupted: '推論中斷', http: 'HTTP 錯誤',
}

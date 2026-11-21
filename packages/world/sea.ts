import { locations } from '../shared/protocol.ts'
import type { IslandId, LocationId, NpcId, SailingPace } from '../shared/protocol.ts'

// 黎明島 is the canon start; 潮燈島 and 霧灣島 are original East Blue islets (spec §6.3 allows original side content).
export const islands: Record<IslandId, {
  name: string, port: LocationId, places: LocationId[], about: string,
}> = {
  wind: { name: '黎明島', port: 'dock', places: ['square', 'tavern', 'dock', 'road', 'hill', 'goa'], about: '風車村、哥亞王國、船塢與潮汐簿委託' },
  lantern: { name: '潮燈島', port: 'lanternPort', places: ['lanternPort', 'lighthouse', 'tideCave'], about: '東海小島：從海蝕洞找回透鏡，讓航道重新亮起' },
  mist: { name: '霧灣島', port: 'mistPort', places: ['mistPort', 'netSlope', 'whiteBay'], about: '東海小島：在潮水上來前救出失聯的探潮人' },
  shells: { name: '謝爾茲鎮', port: 'shellsPort', places: ['shellsPort', 'shellsTown', 'marineBase'], about: '東海：海軍第153分部所在，基地廣場綁著劍士索隆' },
  orange: { name: '橘子鎮', port: 'orangePort', places: ['orangePort', 'orangeStreet', 'petShop'], about: '東海：被小丑巴其海賊團佔據的小鎮' },
}

// New lanes are appended so existing first-route defaults (wind → lantern) stay stable.
export const seaLanes = [
  { ends: ['wind', 'lantern'], miles: 8 },
  { ends: ['wind', 'mist'], miles: 12 },
  { ends: ['lantern', 'mist'], miles: 7 },
  { ends: ['wind', 'shells'], miles: 15 },
  { ends: ['shells', 'orange'], miles: 12 },
  { ends: ['mist', 'orange'], miles: 18 },
] as const satisfies readonly { ends: readonly [IslandId, IslandId], miles: number }[]

export function islandAt(place: LocationId) {
  return (Object.keys(islands) as IslandId[]).find(id => islands[id].places.includes(place))!
}

export function routesFrom(from: IslandId) {
  return seaLanes.flatMap<{ to: IslandId, miles: number }>(({ ends: [a, b], miles }) =>
    a === from ? [{ to: b, miles }] : b === from ? [{ to: a, miles }] : [])
}

export const boatYard = { name: '迎潮號', price: 650, speed: 7, seats: 4, sale: 480, woodPrice: 50, repairGain: 25 }
export const shipPurchaseInfo = locations.dock + '的船塢販售可載四人的迎潮號，售價 ' + boatYard.price + ' 貝里。到碼頭輸入「買船」即可。完成潮汐簿委託也能向提奧借船。'
export const paceNames: Record<SailingPace, string> = { steady: '穩健', fast: '快航' }
export type Ship = { owner: string, port: LocationId, hull: number, wood: number, trips: number, borrowed?: boolean }
export type RouteChoice = { to: IslandId, pace: SailingPace }
export type SailingPlan = { from: IslandId, ballots: Record<string, RouteChoice>, ready: string[] }
export type IslandTask = { stage: 'active' | 'found' | 'done', attempts?: number }

export function sameRoute(a: RouteChoice | undefined, b: RouteChoice | undefined) {
  return a?.to === b?.to && a?.pace === b?.pace
}
export function ballotCount(plan: SailingPlan | undefined, option: RouteChoice) {
  return Object.values(plan?.ballots ?? {}).filter(ballot => sameRoute(ballot, option)).length
}
export function selectedRoute(plan: SailingPlan | undefined, members: number) {
  return Object.values(plan?.ballots ?? {}).find(ballot => ballotCount(plan, ballot) > members / 2)
}

export const islandStories: Partial<Record<IslandId, {
  title: string, guide: NpcId, meeting: LocationId, search: LocationId,
  lead: string, find: string, close: string, reward: number, samples: [string, string, string],
  /** Shown after a failed search; later attempts get +3 each. */
  miss?: string,
}>> = {
  lantern: {
    title: '潮燈塔熄滅事件', guide: 'lamplighter', meeting: 'lighthouse', search: 'tideCave',
    lead: '蕊卡請你前往海蝕洞，找回沖進洞裡的備用透鏡。',
    find: '你從洞壁的一道裂縫撿到備用透鏡，用乾布包好。',
    close: '蕊卡裝回透鏡，潮燈塔照亮霧中的航道。',
    reward: 420, samples: ['接下燈塔委託', '搜索海蝕洞', '歸還透鏡'],
  },
  mist: {
    title: '失聯的探潮人', guide: 'sounder', meeting: 'netSlope', search: 'whiteBay',
    lead: '洛汀請你去白灘灣尋找失聯的探潮人，沿海看有沒有翻覆的測潮艇。',
    find: '你循著測潮艇拖出的痕跡，在岩棚找到了探潮人。他能跟你走回去。',
    close: '探潮人平安回到曬網坡，洛汀接過他帶回的水位記錄。',
    reward: 360, samples: ['接下探潮委託', '搜索白灘灣', '帶探潮人回去'],
  },
  shells: {
    title: '基地廣場上的劍士', guide: 'rika', meeting: 'shellsTown', search: 'marineBase',
    lead: '莉卡請你把她做的飯糰送到海軍基地廣場，交給被綁著的索隆，別讓巡邏的海軍發現。',
    find: '你趁巡邏換班溜到柱子旁，把飯糰塞給索隆。他嚼得滿嘴是沙，還是全部吃完了。',
    close: '莉卡聽說索隆把飯糰吃完了，開心得跳起來。她的母親塞給你們一些謝禮。',
    miss: '巡邏的海軍正好經過，你只好先退開。下次會更清楚他們換班的時間。',
    reward: 200, samples: ['接下莉卡的請託', '送飯糰給索隆', '回報莉卡'],
  },
  orange: {
    title: '守護寵物店的修修', guide: 'boodle', meeting: 'orangeStreet', search: 'petShop',
    lead: '布德鎮長請你到寵物店看看修修，把被海賊踢散的狗糧收回店裡，修好門板。',
    find: '你在瓦礫間撿回三袋狗糧，修好門板。修修叼著一袋，乖乖回到店門口守著。',
    close: '布德鎮長看見寵物店重新關好門，紅著眼眶向你們道謝，拿出鎮上僅存的公款當謝禮。',
    miss: '修修對著陌生人狂吠，你只整理好店裡一角。再試一次牠會比較放心。',
    reward: 300, samples: ['接下鎮長的請託', '整理寵物店', '回報布德鎮長'],
  },
}

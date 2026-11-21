import { locations } from '../shared/protocol.ts'
import type { IslandId, LocationId, NpcId, SailingPace } from '../shared/protocol.ts'

// 黎明島 is the canon start; 潮燈島 and 霧灣島 are original East Blue islets (spec §6.3 allows original side content).
export const islands: Record<IslandId, {
  name: string, port: LocationId, places: LocationId[], about: string,
}> = {
  wind: { name: '黎明島', port: 'dock', places: ['square', 'tavern', 'dock', 'road', 'hill', 'goa'], about: '風車村、哥亞王國、船塢與潮汐簿委託' },
  lantern: { name: '潮燈島', port: 'lanternPort', places: ['lanternPort', 'lighthouse', 'tideCave'], about: '東海小島：從海蝕洞找回透鏡，讓航道重新亮起' },
  mist: { name: '霧灣島', port: 'mistPort', places: ['mistPort', 'netSlope', 'whiteBay'], about: '東海小島：在潮水上來前救出失聯的探潮人' },
}

export const seaLanes = [
  { ends: ['wind', 'lantern'], miles: 8 },
  { ends: ['wind', 'mist'], miles: 12 },
  { ends: ['lantern', 'mist'], miles: 7 },
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
}

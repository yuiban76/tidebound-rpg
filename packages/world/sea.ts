import { locations } from '../shared/protocol.ts'
import type { IslandId, LocationId, SailingPace } from '../shared/protocol.ts'
import { canonIslands, canonLanes, canonStories } from './canon.ts'
import type { canonIslandIds as canonIslandIdList } from '../shared/atlas.ts'
import type { IslandStory, SeaLane } from './canon.ts'
import { islandLayouts } from './sites.ts'
import { beli } from './scale.ts'

// 黎明島 is the canon start; every island follows the original story.
export const islands: Record<IslandId, {
  name: string, port: LocationId, places: LocationId[], about: string,
}> = {
  wind: { name: '黎明島', port: 'dock', places: ['square', 'tavern', 'dock', 'road', 'hill', 'goa'], about: '東海：魯夫的故鄉風車村、哥亞王國與科爾波山' },
  shells: { name: '謝爾茲鎮', port: 'shellsPort', places: ['shellsPort', 'shellsTown', 'marineBase', 'shellsDiner', 'shellsWall'], about: '東海：海軍第153分部所在，基地廣場綁著劍士索隆' },
  orange: { name: '橘子鎮', port: 'orangePort', places: ['orangePort', 'orangeStreet', 'petShop', 'buggyBar', 'orangeShelter'], about: '東海：被小丑巴其海賊團佔據的小鎮' },
  ...Object.fromEntries(Object.entries(canonIslands).map(([id, island]) => [id, {
    name: island.name, about: island.about, port: island.places[0][0],
    places: [...island.places, ...islandLayouts[id as IslandId]?.add ?? []].map(([place]) => place),
  }])) as Record<(typeof canonIslandIdList)[number], { name: string, port: LocationId, places: LocationId[], about: string }>,
}

export const seaLanes: readonly SeaLane[] = [
  { ends: ['wind', 'shells'], miles: 15 },
  { ends: ['shells', 'orange'], miles: 12 },
  ...canonLanes,
]

export function islandAt(place: LocationId) {
  return (Object.keys(islands) as IslandId[]).find(id => islands[id].places.includes(place))!
}

export type Route = Omit<SeaLane, 'ends'> & { to: IslandId }
/** Lanes leaving an island. One-way Grand Line lanes only run ends[0] → ends[1]. */
export function routesFrom(from: IslandId): Route[] {
  return seaLanes.flatMap(({ ends: [a, b], ...lane }) =>
    a === from ? [{ ...lane, to: b }] : b === from && !lane.oneWay ? [{ ...lane, to: a }] : [])
}
/** What a lane needs before departure, for display. */
export function routeNeeds(route: Route) {
  return [
    route.logPose && '需記錄指針',
    route.needsTask && '需先完成「' + islandStories[route.needsTask]?.title + '」',
    route.hazard?.name,
    route.oneWay && '單向航線',
  ].filter(Boolean) as string[]
}

export const boatYard = { name: '小帆船', price: 32_500, speed: 7, seats: 4, sale: 24_000, woodPrice: 2_500, repairGain: 25 }
export const shipPurchaseInfo = locations.dock + '的船塢販售可載四人的' + boatYard.name + '，售價 ' + beli(boatYard.price) + '。到碼頭輸入「買船」即可。'
export const paceNames: Record<SailingPace, string> = { steady: '穩健', fast: '快航' }
export type Ship = { owner: string, port: LocationId, hull: number, wood: number, trips: number }
export type RouteChoice = { to: IslandId, pace: SailingPace }
export type SailingPlan = { from: IslandId, ballots: Record<string, RouteChoice>, ready: string[] }
/** closed: the matter was settled by the timeline before the players finished it. */
export type IslandTask = { stage: 'active' | 'found' | 'done' | 'closed', attempts?: number }

export function sameRoute(a: RouteChoice | undefined, b: RouteChoice | undefined) {
  return a?.to === b?.to && a?.pace === b?.pace
}
export function ballotCount(plan: SailingPlan | undefined, option: RouteChoice) {
  return Object.values(plan?.ballots ?? {}).filter(ballot => sameRoute(ballot, option)).length
}
export function selectedRoute(plan: SailingPlan | undefined, members: number) {
  return Object.values(plan?.ballots ?? {}).find(ballot => ballotCount(plan, ballot) > members / 2)
}

export const islandStories: Partial<Record<IslandId, IslandStory>> = {
  ...canonStories,
  shells: {
    title: '基地廣場上的劍士', guide: 'rika', meeting: 'shellsTown', search: 'marineBase',
    lead: '莉卡請你把她做的飯糰送到海軍基地廣場，交給被綁著的索隆，別讓巡邏的海軍發現。',
    find: '你趁巡邏換班溜到柱子旁，把飯糰塞給索隆。他嚼得滿嘴是沙，還是全部吃完了。',
    close: '莉卡聽說索隆把飯糰吃完了，開心得跳起來。她的母親塞給你們一些謝禮。',
    miss: '巡邏的海軍正好經過，你只好先退開。下次會更清楚他們換班的時間。',
    reward: 10_000, samples: ['接下莉卡的請託', '送飯糰給索隆', '回報莉卡'],
  },
  orange: {
    title: '守護寵物店的修修', guide: 'boodle', meeting: 'orangeStreet', search: 'petShop',
    lead: '布德鎮長請你到寵物店看看修修，把被海賊踢散的狗糧收回店裡，修好門板。',
    find: '你在瓦礫間撿回三袋狗糧，修好門板。修修叼著一袋，乖乖回到店門口守著。',
    close: '布德鎮長看見寵物店重新關好門，紅著眼眶向你們道謝，拿出鎮上僅存的公款當謝禮。',
    miss: '修修對著陌生人狂吠，你只整理好店裡一角。再試一次牠會比較放心。',
    reward: 15_000, samples: ['接下鎮長的請託', '整理寵物店', '回報布德鎮長'],
  },
}

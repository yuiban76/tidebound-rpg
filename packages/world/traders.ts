// Original traveling merchants of the 潮行商會: one stands at every island's port (on Dawn Island, the road outside the
// village, so the village shops keep their limited stock) and sells the same weapons and
// supplies, so a party never sails somewhere it cannot re-arm. They are not canon characters and never join a crew.
import type { IslandId, LocationId, NpcId } from '../shared/protocol.ts'
import type { traderNpcs } from '../shared/atlas.ts'

export type TraderId = keyof typeof traderNpcs
/** What every merchant sells, by goods id (see village.ts goods). Merchants restock from their guild ship, so stock never runs out. */
export const traderWares = ['sword', 'spear', 'musket', 'bullets', 'bandage', 'tonic'] as const

export const traders: Record<TraderId, { island: IslandId, place: LocationId, role: string, known: string }> = {
  traderWind: { island: 'wind', place: 'road', role: '潮行商會的行商', known: '推著貨車在村外小路歇腳的圓臉中年商人，正要進風車村，笑說這裡的人買東西從不殺價。' },
  traderShells: { island: 'shells', place: 'shellsPort', role: '潮行商會的行商', known: '說話壓得很低的女商人，總提防著海軍基地那邊的動靜，生意只在碼頭做。' },
  traderOrange: { island: 'orange', place: 'orangePort', role: '潮行商會的行商', known: '個子矮小、背著比自己還大的貨箱，鎮上被海賊佔了，他就把攤子擺在港口，隨時準備開溜。' },
  traderSyrup: { island: 'syrup', place: 'syrupPort', role: '潮行商會的行商', known: '戴草帽的老商人，常在海岸邊打盹；他說村裡那個愛說謊的小子每天都來喊海賊來了。' },
  traderBaratie: { island: 'baratie', place: 'baratiePort', role: '潮行商會的行商', known: '把小貨船繫在海上餐廳旁邊做生意的商人，最怕廚師們打架時把他的貨踢進海裡。' },
  traderCocoyasi: { island: 'cocoyasi', place: 'cocoyasiPort', role: '潮行商會的行商', known: '年輕的女商人，說這一帶被魚人收保護費，她只停一下就走，從不在村裡過夜。' },
  traderLogue: { island: 'loguetown', place: 'loguePort', role: '潮行商會的行商', known: '精明的商人，說要進偉大航路的人都會在羅格鎮補貨，這裡是他一年賺最多的地方。' },
  traderTwin: { island: 'twinCape', place: 'twinPort', role: '潮行商會的行商', known: '剛翻過紅土大陸的老行商，渾身濕透還在數貨，說進了偉大航路後每一箱都得綁緊。' },
  traderWhisky: { island: 'whiskyPeak', place: 'whiskyPort', role: '潮行商會的行商', known: '總是不停東張西望的女商人，提醒客人別在這個鎮上喝太多，這裡的人太熱情了。' },
  traderGarden: { island: 'littleGarden', place: 'gardenShore', role: '潮行商會的行商', known: '被叢林裡的吼聲嚇得臉色發白的商人，說他只是在等記錄指針重新指路就走。' },
  traderDrum: { island: 'drum', place: 'drumShore', role: '潮行商會的行商', known: '裹著厚皮襖的商人，貨箱上積了一層雪，說這個國家沒有醫生，傷藥賣得特別快。' },
  traderAlabasta: { island: 'alabasta', place: 'nanohana', role: '潮行商會的行商', known: '頭纏白布的沙漠商人，說國內久旱不雨、到處都有人在談叛亂，刀槍最近很好賣。' },
  traderJaya: { island: 'jaya', place: 'mockPort', role: '潮行商會的行商', known: '在莫克鎮混了多年的商人，見慣了海賊鬧事，說在這裡做生意只收現金、不問來歷。' },
  traderSkypiea: { island: 'skypiea', place: 'angelBeach', role: '潮行商會的行商', known: '不知怎麼把貨船弄上天空的商人，說雲上的人沒見過火槍，看到都會嚇一跳。' },
  traderWater7: { island: 'water7', place: 'water7Port', role: '潮行商會的行商', known: '跟造船廠做了很多年生意的商人，說七水之都最近不太平，工人們都疑神疑鬼。' },
  traderEnies: { island: 'eniesLobby', place: 'eniesGate', role: '潮行商會的行商', known: '替司法島的衛兵送補給的商人，嘴很緊，只說這裡的門從不為外人開。' },
  traderThriller: { island: 'thrillerBark', place: 'thrillerDock', role: '潮行商會的行商', known: '臉色蒼白的商人，說他的船被霧困住好幾天了，晚上總聽到奇怪的腳步聲。' },
  traderSabaody: { island: 'sabaody', place: 'sabaodyGrove', role: '潮行商會的行商', known: '在泡泡樹下擺攤的女商人，提醒客人看到天龍人要立刻低頭，別惹麻煩。' },
  traderAmazon: { island: 'amazonLily', place: 'kujaPort', role: '九蛇島的女行商', known: '少數被准許和島外做生意的九蛇女商人，對男人特別好奇，但價錢一分也不讓。' },
  traderImpel: { island: 'impelDown', place: 'impelGate', role: '暗中做生意的獄卒', known: '在推進城門口偷偷賣東西的獄卒，說只要付得起錢，他什麼都沒看見。' },
  traderMarineford: { island: 'marineford', place: 'marinefordBay', role: '海軍的軍需商', known: '替海軍本部供應武器的商人，說最近軍隊調動頻繁，整個港口都在準備大事。' },
}

export const isTrader = (npc: NpcId): npc is TraderId => Object.hasOwn(traders, npc)

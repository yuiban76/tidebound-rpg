// The crews that guard each island: the story's own enemies of that island (Buggy at Orange Town, Arlong at Cocoyasi…),
// met here only as a fight the party must win itself before sailing on. The guard fight changes nothing else: the
// same people still live on as the story's characters (the 「主線」 crews), whom the party or the Straw Hats may beat on
// the canon calendar. Only that fight drops fruits and changes history, so a party may fight them twice, or skip it.
import type { IslandId } from '../shared/protocol.ts'
import { levelCaps, seas } from './growth.ts'
import type { Sea } from './growth.ts'
import type { Faction } from './foes.ts'

export type GateCrew = {
  crew: string
  captain: string
  /** The captain's epithet or rank, shown in front of the name. */
  title: string
  faction: Faction
  /** The level the crew fights at: what a party should have to beat it. */
  level: number
  officers: [string, string]
  grunt: string
  /** One line on who they are and why they block the way. */
  text: string
}

/** The islands in the order the voyage reaches them. Leaving an island towards a later one needs its crew beaten. */
export const islandOrder: IslandId[] = [
  'wind', 'shells', 'orange', 'syrup', 'baratie', 'cocoyasi', 'loguetown',
  'twinCape', 'whiskyPeak', 'littleGarden', 'drum', 'alabasta', 'jaya', 'skypiea', 'water7', 'eniesLobby', 'thrillerBark',
  'sabaody', 'amazonLily', 'impelDown', 'marineford',
  'fishmanIsland', 'punkHazard', 'dressrosa', 'zou', 'wholeCake', 'wano', 'egghead',
] as IslandId[]

const newWorldIslands = new Set<string>(['fishmanIsland', 'punkHazard', 'dressrosa', 'zou', 'wholeCake', 'wano', 'egghead'])
const eastBlue = new Set<string>(['wind', 'shells', 'orange', 'syrup', 'baratie', 'cocoyasi', 'loguetown'])
/** Which sea an island lies in. Fishman Island, under the Red Line, opens the New World. */
export const seaOf = (island: string): Sea => eastBlue.has(island) ? 'east' : newWorldIslands.has(island) ? 'newWorld' : 'paradise'

/** A guard fight: who stands at the port, at what level, and one line on why they are in the way. */
const gate = (crew: string, captain: string, title: string, faction: Faction, level: number, officers: [string, string], grunt: string, text: string): GateCrew =>
  ({ crew, captain, title, faction, level, officers, grunt, text })

export const gateCrews: Record<IslandId, GateCrew> = {
  wind: gate('希古瑪山賊團', '希古瑪', '山賊頭子', 'bandit', 2, ['山賊副頭目', '拿刀的山賊'], '山賊',
    '在風車村橫行的山賊，當年在酒吧嘲笑過紅髮傑克。想出海，得先過他們這關。'),
  shells: gate('海軍第 153 分部', '蒙卡', '斧手', 'marine', 4, ['貝魯梅柏', '海軍士兵長'], '海軍士兵',
    '把謝爾茲鎮當成自己地盤的蒙卡上校，不准任何海賊從他的港口離開。'),
  orange: gate('巴其海賊團', '巴其', '小丑', 'pirate', 6, ['摩奇', '卡巴吉'], '巴其海賊團員',
    '占領橘子鎮的巴其海賊團，正在找偉大航路的海圖，看到船就想搶。'),
  syrup: gate('黑貓海賊團', '克洛', '百計', 'pirate', 8, ['詹哥', '喵喵兄弟'], '黑貓海賊團員',
    '百計的克洛和他的黑貓海賊團，從西羅布村的坡道衝上來，誰擋路就收拾誰。'),
  baratie: gate('克里克海賊艦隊', '唐・克里克', '首領', 'pirate', 10, ['吉恩', '珍珠'], '克里克海賊團員',
    '從偉大航路敗逃回來的東海霸主，看上了巴拉蒂這艘船。'),
  cocoyasi: gate('惡龍一夥', '惡龍', '鋸鯊', 'pirate', 13, ['小八', '克羅歐比'], '魚人海賊',
    '統治可可亞西村一帶的魚人海賊團，港口和海上都是他們的地盤。'),
  loguetown: gate('羅格鎮海軍', '斯摩格', '白獵', 'marine', 16, ['塔希吉', '海軍士兵長'], '海軍士兵',
    '不讓任何海賊從羅格鎮駛進偉大航路的斯摩格上校和他的部下。'),
  twinCape: gate('巴洛克工作社（雙子岬）', 'Mr.9', '巴洛克工作社', 'bandit', 18, ['Miss 星期三', '巴洛克工作社社員'], '巴洛克工作社社員',
    '想獵捕巨鯨拉布的巴洛克工作社搭檔，把剛進偉大航路的船也攔下來。'),
  whiskyPeak: gate('巴洛克工作社（威士忌山峰）', 'Mr.5', '巴洛克工作社', 'bandit', 20, ['Miss 情人節', 'Miss 星期一'], '賞金獵人',
    '把威士忌山峰變成賞金獵人巢穴的巴洛克工作社，熱情款待之後就是一網打盡。'),
  littleGarden: gate('巴洛克工作社（小花園）', 'Mr.3', '巴洛克工作社', 'bandit', 22, ['Miss 黃金週', 'Miss 情人節'], '巴洛克工作社社員',
    '在小花園設下蠟燭陷阱的 Mr.3 一行，要把上島的人做成蠟像。'),
  drum: gate('瓦波爾一行', '瓦波爾', '鐵皮國王', 'tyrant', 25, ['傑斯', '庫洛馬利莫'], '瓦波爾的士兵',
    '丟下國民逃走、又回來搶國家的瓦波爾，守在磁鼓島的海岸。'),
  alabasta: gate('巴洛克工作社', '克洛克達爾', 'Mr.0', 'tyrant', 28, ['Mr.1', '邦・克雷'], '巴洛克工作社社員',
    '要奪下阿拉巴斯坦的巴洛克工作社本部，連那諾哈娜港也布滿了他們的人。'),
  jaya: gate('貝拉米海賊團', '貝拉米', '鬣狗', 'pirate', 30, ['撒基斯', '貝拉米海賊團幹部'], '貝拉米海賊團員',
    '在嘲笑鎮嘲笑夢想的貝拉米海賊團，誰說要上天空就打誰。'),
  skypiea: gate('艾涅爾的神官', '艾涅爾', '神', 'tyrant', 32, ['神官 薩多利', '歐姆'], '神兵',
    '自稱為神的艾涅爾和他的神官，不准任何人離開他的空島。'),
  water7: gate('佛朗基一家', '佛朗基', '改造人', 'bandit', 35, ['札姆巴', '摩茲與奇維'], '佛朗基一家成員',
    '七水之都的拆船混混，看上哪艘船就拆下來賣錢。'),
  eniesLobby: gate('CP9', '羅布・路基', '豹', 'government', 37, ['卡庫', '賈布拉'], '司法島衛兵',
    '世界政府的諜報機關，守在司法島，靠近的海賊全部送進正義之門。'),
  thrillerBark: gate('摩利亞的手下', '月光・摩利亞', '七武海', 'tyrant', 40, ['霍古巴克', '佩羅娜'], '殭屍',
    '在魔之三角地帶搶影子的摩利亞一夥，迷路的船都逃不出他的鬼船。'),
  sabaody: gate('海軍本部（夏波帝）', '黃猿', '大將', 'marine', 43, ['戰桃丸', '和平主義者'], '海軍士兵',
    '為了逮捕在夏波帝鬧事的海賊而趕來的大將與兵器。'),
  amazonLily: gate('九蛇海賊團', '波雅・漢考克', '海賊女帝', 'pirate', 44, ['桑達索尼亞', '馬里哥爾特'], '九蛇戰士',
    '不准男人踏進亞馬遜百合的九蛇海賊團，在無風帶巡邏。'),
  impelDown: gate('推進城獄卒', '麥哲倫', '署長', 'government', 46, ['漢尼巴爾', '獄卒獸莎蒂'], '獄卒',
    '海底大監獄的署長與獄卒，任何船靠近都會被當成劫獄。'),
  marineford: gate('海軍本部', '戰國', '元帥', 'marine', 48, ['卡普', '赤犬'], '海軍士兵',
    '海軍總部的元帥和英雄，守在馬林福特。'),
  fishmanIsland: gate('新魚人海賊團', '霍迪・瓊斯', '新魚人', 'pirate', 52, ['新魚人海賊團幹部 達順', '新魚人海賊團幹部 伊卡洛斯・瑪奇'], '新魚人海賊團員',
    '仇恨人類的霍迪・瓊斯一夥，把要浮上新世界的人類船全部擋下。'),
  punkHazard: gate('凱薩的研究所', '凱薩・克朗', 'M', 'tyrant', 58, ['莫內', '威爾可'], '凱薩的部下',
    '在龐克哈薩特做毒氣實驗的凱薩，把島上的出入口全封了起來。'),
  dressrosa: gate('唐吉訶德家族', '多佛朗明哥', '天夜叉', 'tyrant', 65, ['托雷波爾', '迪亞曼帝'], '家族成員',
    '用謊言統治德雷斯羅薩的唐吉訶德家族，港口都在他們的監視下。'),
  zou: gate('百獸海賊團（佐烏）', '傑克', '旱災', 'pirate', 72, ['百獸海賊團 真打', '百獸海賊團 獸人兵'], '百獸海賊團員',
    '為了找光月家的人而攻打佐烏的傑克，象腳下的登島口被他們堵住了。'),
  wholeCake: gate('Big Mom 海賊團', '夏洛特・玲玲', '四皇', 'pirate', 80, ['夏洛特・卡塔克利', '夏洛特・克力架'], '棋子士兵',
    '統治托特蘭的四皇，不讓任何人帶著她要的東西離開。'),
  wano: gate('百獸海賊團', '凱多', '四皇', 'pirate', 88, ['燼', '奎因'], '百獸海賊團員',
    '控制和之國的凱多和他的大看板，鬼島的海域由他們把守。'),
  egghead: gate('世界政府與海軍（蛋頭島）', '黃猿', '大將', 'marine', 95, ['羅布・路基', '卡庫'], '海軍士兵',
    '包圍蛋頭島的大將與 CP0，要抹消貝加龐克和島上的一切。'),
}

/** Whether the guard crew of this island is beaten (by the party: nobody else does it for them). */
export const gateOpen = (world: { gates?: Partial<Record<string, true>> }, island: string) => !!world.gates?.[island]
/** Why the party cannot sail from one island to another yet, or undefined. Going back the way they came is always open. */
export function gateBlock(world: { gates?: Partial<Record<string, true>> }, from: IslandId, to: IslandId) {
  const [a, b] = [islandOrder.indexOf(from), islandOrder.indexOf(to)]
  if (a < 0 || b <= a || gateOpen(world, from)) return undefined
  const gate = gateCrews[from]
  return '「' + gate.crew + '」守在這裡（船長「' + gate.title + '」' + gate.captain + '，建議 ' + gate.level + ' 級）。要先打倒他們才能往下一座島：到港口輸入「挑戰守關海賊團」。'
}

/** The highest level a character can reach once the party has got as far as this island. */
export const capAt = (island: string) => levelCaps[seaOf(island)]
/** The furthest sea any of these islands lies in. */
export const furthestSea = (islandIds: string[]): Sea => seas[Math.max(0, ...islandIds.map(id => seas.indexOf(seaOf(id))))]

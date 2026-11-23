// Canon One Piece content from East Blue to the Summit War (fan work; all wording is original summary).
// The facts below are the world on the morning of Day 1. The timeline then plays out canon events on
// fixed in-game days unless the players have already changed them, so the manga is a default, not a script.
import type { IslandId, LocationId, NpcId } from '../shared/protocol.ts'
import type { canonIslandIds, canonNpcs } from '../shared/atlas.ts'

type CanonIslandId = (typeof canonIslandIds)[number]
type Attribute = 'STR' | 'AGI' | 'CON' | 'PER' | 'INT' | 'WIL'

/** Changes an event or a finished quest applies to the shared world. */
export type WorldEffect = {
  /** New place for an NPC; null means the NPC has left every reachable place. */
  move?: Partial<Record<NpcId, LocationId | null>>
  /** Replaces what an NPC knows and will talk about. */
  facts?: Partial<Record<NpcId, string>>
  /** Island quests that can no longer be taken because the matter is settled. */
  close?: IslandId[]
  repairShip?: boolean
}

export type IslandStory = {
  title: string, guide: NpcId, meeting: LocationId, search: LocationId,
  lead: string, find: string, close: string, reward: number, samples: [string, string, string],
  /** Shown after a failed search. */
  miss?: string
  /** XP for every party member on the island when the quest is delivered. Default 60. */
  xp?: number
  /** Search difficulty (default 11), retry bonus per failed attempt (default 3) and minutes per try (default 10). */
  dc?: number, retry?: number, searchMinutes?: number
  check?: { attr: Attribute, skill: string }
  /** Highest party level needed before the quest can be accepted (spec §7.7: luck alone can't bridge power gaps). */
  minLevel?: number
  /** [day, hour] before which the situation does not exist yet. */
  availableFrom?: [number, number]
  /** The quest is moot once this other island's quest is done. */
  blockedBy?: IslandId
  onDone?: WorldEffect
}

export type SeaLane = {
  ends: readonly [IslandId, IslandId], miles: number
  /** The Log Pose only points forward: sail ends[0] → ends[1] only. */
  oneWay?: boolean
  /** Grand Line waters: someone in the party must carry a 記錄指針. */
  logPose?: boolean
  /** This island's quest must be done first (e.g. the South Bird before the Knock Up Stream). */
  needsTask?: IslandId
  /** Extra hull damage: Reverse Mountain or the Calm Belt. */
  hazard?: { name: string, damage: number }
}

export type CanonEvent = {
  id: string, at: [number, number], island: IslandId, title: string
  text: string, effect?: WorldEffect
  /** First matching entry replaces the canon outcome: that island's quest was done, or the players beat that NPC. */
  changed?: { by?: IslandId, defeated?: NpcId, /** Every flag must hold (see flags.ts). */ when?: string[], text: string, effect?: WorldEffect }[]
}

/** What happens to the world right away when the players beat a canon villain in a fight. */
export const bossDefeats: Partial<Record<NpcId, { text: string, effect: WorldEffect }>> = {
  klahadore: { text: '管家克拉哈德的真面目——海賊「百計的克洛」——被打倒了，他再也無法威脅西羅布村。',
    effect: { move: { klahadore: null }, facts: { kaya: '原來克拉哈德是海賊……謝謝你們保護了這個村子。' } } },
  arlong: { text: '惡龍倒下了！可可亞西村的人們不敢相信八年的統治就這樣結束。',
    effect: { move: { arlong: null }, facts: { genzo: '惡龍被你們打倒了，村子自由了！', nojiko: '娜美終於不用再替惡龍做事了。' } } },
  buggy: { text: '小丑巴其被打得鼻青臉腫，橘子鎮的海賊們一哄而散。', effect: { move: { buggy: null }, facts: { boodle: '那個小丑被打趴了！鎮子總算能慢慢恢復原樣。' } } },
  wapol: { text: '前國王瓦波爾被打得抱頭鼠竄，磁鼓島的人們鬆了一口氣。', effect: { move: { wapol: null }, facts: { dalton: '瓦波爾被你們趕走了，這個國家總算能重新開始。' } } },
  bellamy: { text: '「鬣狗」貝拉米被打得爬不起來，莫克鎮的海賊們一哄而散。', effect: { facts: { cricket: '你們把貝拉米那小子揍趴了？痛快！' } } },
  crocodile: { text: '七武海克洛克達爾敗了！他的陰謀隨之瓦解，海軍很快就會趕到雨地。',
    effect: { move: { crocodile: null }, facts: { pell: '克洛克達爾被打倒了，真相終於能讓國民知道。' } } },
  enel: { text: '自稱為神的艾涅爾倒下了，空島的人們終於從恐懼中解放。', effect: { move: { enel: null } } },
  lucci: { text: 'CP9 最強的羅布・路基被打倒了，司法島陷入一片混亂。', effect: { move: { lucci: null } } },
  moria: { text: '七武海月光・摩利亞倒下了，被奪走的影子紛紛回到主人身上。', effect: { move: { moria: null }, facts: { brook: '我的影子……回來了！喲吼吼吼！' } } },
}

export const minuteOf = ([day, hour]: [number, number]) => (day - 1) * 1440 + hour * 60

/** [place id, short map label, what the place offers]; the first place is the island's port. */
export const canonIslands: Record<CanonIslandId, { name: string, about: string, places: [LocationId, string, string][] }> = {
  syrup: { name: '西羅布村', about: '東海：騙人布的故鄉，可雅的宅邸在山丘上', places: [
    ['syrupPort', '海岸', '停泊或搭船離開西羅布村'], ['syrupVillage', '村子', '找騙人布'], ['kayaMansion', '宅邸', '可雅和管家住在這裡']] },
  baratie: { name: '海上餐廳巴拉蒂', about: '東海：漂在海上的餐廳，廚師個個能打', places: [
    ['baratiePort', '停泊處', '停泊或搭船離開巴拉蒂'], ['baratieHall', '大廳', '找老闆哲夫'], ['baratieKitchen', '廚房', '副料理長香吉士在這裡']] },
  cocoyasi: { name: '可可亞西村', about: '東海：被魚人惡龍統治的村子', places: [
    ['cocoyasiPort', '港口', '停泊或搭船離開可可亞西村'], ['cocoyasiVillage', '村子', '找駐警阿健，村民都在惡龍的陰影下過日子'], ['arlongPark', '惡龍樂園', '魚人惡龍的據點']] },
  loguetown: { name: '羅格鎮', about: '東海：海賊王羅傑出生與被處決的城鎮，偉大航路前的最後一站', places: [
    ['loguePort', '港口', '停泊或搭船離開羅格鎮'], ['logueSquare', '處刑台', '海賊王被處決的處刑台，海軍斯摩格坐鎮'], ['logueShop', '武器店', '一本松的武器店，賣記錄指針']] },
  twinCape: { name: '雙子岬', about: '偉大航路入口：翻越顛倒山後的第一站', places: [
    ['twinPort', '港灣', '停泊或搭船離開雙子岬'], ['capeLighthouse', '燈塔', '找燈塔看守人庫卡斯'], ['laboonBay', '海灣', '巨鯨拉布在這裡']] },
  whiskyPeak: { name: '威士忌山峰', about: '偉大航路：熱情歡迎海賊的賞金獵人小鎮', places: [
    ['whiskyPort', '港口', '停泊或搭船離開威士忌山峰'], ['whiskyTown', '小鎮', '鎮民熱情得可疑'], ['cactusRock', '岩頂', '找伊卡萊姆']] },
  littleGarden: { name: '小花園', about: '偉大航路：恐龍漫步的史前島嶼，兩個巨人在決鬥', places: [
    ['gardenShore', '海岸', '停泊或搭船離開小花園'], ['giantsArena', '決鬥場', '巨人東利與布洛基在這裡'], ['waxHouse', '蠟燭屋', '用蠟燭做成的怪房子']] },
  drum: { name: '磁鼓島', about: '偉大航路：失去國王的雪國', places: [
    ['drumShore', '海岸', '停泊或搭船離開磁鼓島'], ['bighorn', '大角鎮', '找多爾頓'], ['drumCastle', '磁鼓城', '醫生古蕾娃住在山頂']] },
  alabasta: { name: '阿拉巴斯坦', about: '偉大航路：三年無雨、內戰一觸即發的沙漠王國', places: [
    ['nanohana', '那諾哈娜', '停泊或搭船離開阿拉巴斯坦'], ['rainbase', '雨地', '克洛克達爾的賭場所在'], ['alubarna', '阿爾巴那', '王宮，找貝爾或寇布拉國王']] },
  jaya: { name: '加亞島', about: '偉大航路：嘲笑夢想的莫克鎮，以及相信黃金之鄉的人', places: [
    ['mockPort', '港口', '停泊或搭船離開加亞島'], ['mockTown', '莫克鎮', '海賊聚集的城鎮'], ['cricketHouse', '庫力克斯家', '找庫力克斯，屋後是森林']] },
  skypiea: { name: '空島', about: '偉大航路：白海之上的天空島嶼，由「神」艾涅爾統治', places: [
    ['angelBeach', '海灘', '找前任神甘・佛爾'], ['upperYard', '上層雲', '危機四伏的森林'], ['godShrine', '神之社', '艾涅爾的居所']] },
  water7: { name: '七水之都', about: '偉大航路：造船之都', places: [
    ['water7Port', '港口', '停泊或搭船離開七水之都'], ['galleyLa', '船塢', '卡雷拉公司，找冰山市長'], ['frankyHouse', '佛朗基之家', '解體屋佛朗基一家的據點']] },
  eniesLobby: { name: '司法島', about: '偉大航路：世界政府的司法島，正義之門通往推進城與海軍本部', places: [
    ['eniesGate', '正門', '停泊或搭船離開司法島'], ['justiceTower', '司法塔', 'CP9 坐鎮'], ['gateOfJustice', '正義之門', '押送罪犯的巨門']] },
  thrillerBark: { name: '恐怖三桅帆船', about: '偉大航路：魔之三角地帶裡的巨船島', places: [
    ['thrillerDock', '停泊處', '停泊或搭船離開'], ['graveyard', '墓園', '布魯克在這裡'], ['moriaMansion', '宅邸', '摩利亞的宅邸']] },
  sabaody: { name: '夏波帝諸島', about: '偉大航路前半段終點：泡泡飄浮的群島，天龍人出沒', places: [
    ['sabaodyGrove', '13號樹', '停泊或搭船離開夏波帝'], ['auctionHouse', '拍賣所', '人口拍賣所'], ['shakkyBar', '酒吧', '找雷利或夏琪']] },
  amazonLily: { name: '亞馬遜百合', about: '無風帶：只有女人的九蛇島', places: [
    ['kujaPort', '港口', '停泊或搭船離開女兒島'], ['kujaCastle', '九蛇城', '女帝漢考克的城'], ['amazonForest', '森林', '找尼歐魯皇太后']] },
  impelDown: { name: '推進城', about: '無風帶：世界政府的海底大監獄', places: [
    ['impelGate', '正門', '停泊或搭船離開推進城'], ['impelLevel5', '第五層', '極寒地獄，伊娃可夫藏身附近'], ['impelLevel6', '第六層', '無限地獄，關押最兇惡的犯人']] },
  marineford: { name: '馬林福特', about: '偉大航路：海軍本部所在地', places: [
    ['marinefordBay', '海灣', '停泊或搭船離開馬林福特'], ['scaffold', '處刑台', '海軍本部前的處刑台'], ['hqFortress', '要塞', '元帥戰國坐鎮']] },
}

export const canonPeople: Record<keyof typeof canonNpcs, { place: LocationId | null, role: string, known: string }> = {
  usopp: { place: 'syrupVillage', role: '愛說謊的少年', known: '他說自己在海岸偷聽到有人計畫殺害可雅大小姐，但村民早就習慣他喊「海賊來了」，沒人相信他。' },
  kaya: { place: 'kayaMansion', role: '宅邸的大小姐', known: '體弱多病的富家千金，最信任照顧了她三年的管家克拉哈德。' },
  klahadore: { place: 'kayaMansion', role: '可雅家的管家', known: '總是用手掌推眼鏡的管家，對大小姐恭敬有禮，卻不願多談自己的過去。' },
  zeff: { place: 'baratieHall', role: '巴拉蒂的老闆', known: '曾是海賊「紅腳哲夫」，如今經營海上餐廳。他說來者是客，就算是海賊也要讓他吃飽。' },
  sanji: { place: 'baratieKitchen', role: '副料理長', known: '脾氣火爆、對女士格外溫柔的廚師，夢想找到傳說中匯集四海魚群的 ALL BLUE。' },
  genzo: { place: 'cocoyasiVillage', role: '村裡的駐警', known: '惡龍統治可可亞西村八年，每個人每月都得繳「人頭稅」。附近的海軍第16分部對此視而不見。' },
  nojiko: { place: 'bellemereGrove', role: '橘子園的主人', known: '她的妹妹娜美在惡龍手下當測量士，村民都不懂娜美為什麼要幫魚人做事。' },
  arlong: { place: 'arlongPark', role: '惡龍海賊團船長', known: '自稱魚人是至高無上的種族，統治著這一帶的村子。' },
  smoker: { place: 'logueSquare', role: '海軍上校', known: '羅格鎮的海軍上校。他說海賊王羅傑就是在這座處刑台被處死，大海賊時代也由此開始。' },
  ipponmatsu: { place: 'logueShop', role: '武器店老闆', known: '他說要進偉大航路，一定得先買記錄指針——那裡的磁場會讓普通羅盤失靈。' },
  crocus: { place: 'capeLighthouse', role: '燈塔看守人', known: '偉大航路的磁場很怪，記錄指針要記住一座島的磁場才能指向下一座島，不能隨意亂開。' },
  laboon: { place: 'laboonBay', role: '巨大的鯨魚', known: '這頭鯨魚五十年來一直撞著紅土大陸，在等一群約好會回來的海賊。' },
  vivi: { place: 'whiskyTown', role: '自稱 Miss.星期三 的女子', known: '她在鎮上用代號行動，似乎在暗中調查一個叫巴洛克工作社的組織。' },
  igaram: { place: 'cactusRock', role: '自稱 Mr.8 的男人', known: '說話前總要清清喉嚨的男人。他向你透露自己真正效忠的是阿拉巴斯坦王室。' },
  dorry: { place: 'giantsArena', role: '艾爾巴夫的巨人戰士', known: '他和布洛基為了榮譽已經決鬥了一百年，至今勝負未分。' },
  brogy: { place: 'giantsArena', role: '艾爾巴夫的巨人戰士', known: '他說戰士之間的決鬥不容外人插手，輸贏都要光明正大。' },
  dalton: { place: 'bighorn', role: '大角鎮的守護者', known: '前國王瓦波爾丟下國民逃走後，他一直守著這座雪國。島上唯一的醫生住在山頂的城堡。' },
  kureha: { place: 'drumCastle', role: '磁鼓島的老醫生', known: '醫術高明、脾氣古怪的老醫生。她說城裡有隻會說話的馴鹿在跟她學醫。' },
  chopper: { place: 'drumCastle', role: '會說話的馴鹿', known: '吃了人人果實的馴鹿，夢想成為能治好任何疾病的醫生。被稱讚時會一邊罵人一邊扭來扭去。' },
  pell: { place: 'alubarna', role: '王國的守護神', known: '阿拉巴斯坦三年沒下雨了。叛亂軍認為是國王用舞粉偷走了雨，但國王從未用過。' },
  cobra: { place: 'alubarna', role: '阿拉巴斯坦國王', known: '他相信國民，不願對叛亂軍動武。他的女兒薇薇已經離開王宮兩年。' },
  crocodile: { place: 'rainbase', role: '王下七武海', known: '雨地賭場的主人，在國民眼中是打退海賊的英雄。' },
  bellamy: { place: 'mockTown', role: '鬣狗貝拉米', known: '莫克鎮的海賊，嘲笑所有相信夢想和空島的人。' },
  cricket: { place: 'cricketHouse', role: '尋寶人', known: '他相信祖先說的黃金之鄉是真的，也說空島確實存在，要靠衝天海流才能上去。' },
  ganfall: { place: 'angelBeach', role: '前任空島之神', known: '六年前被艾涅爾奪走神之位的老騎士。他說上層雲的森林裡藏著四百年前的秘密。' },
  enel: { place: 'godShrine', role: '空島之神', known: '自稱為神的男人，能聽見整座空島上所有人的聲音。' },
  iceburg: { place: 'galleyLa', role: '七水之都市長', known: '卡雷拉公司的社長兼市長。他說最近總覺得船塢裡有人在盯著他。' },
  franky: { place: 'frankyHouse', role: '解體屋的老大', known: '喜歡可樂、開口閉口都是「超級」的改造人，年輕時是造船大師湯姆的弟子。' },
  spandam: { place: 'justiceTower', role: 'CP9 長官', known: '世界政府諜報機關 CP9 的長官，滿腦子想著立功升官。' },
  lucci: { place: 'justiceTower', role: 'CP9 特務', known: '他相信「黑暗的正義」，為了政府可以不擇手段。' },
  robin: { place: null, role: '考古學家', known: '能讀懂歷史本文的考古學家，從小被世界政府追捕。' },
  brook: { place: 'graveyard', role: '只剩骨頭的音樂家', known: '吃了黃泉果實復活的骷髏。影子被摩利亞奪走，不能在陽光下行走。' },
  moria: { place: 'moriaMansion', role: '王下七武海', known: '能奪走他人影子、放進殭屍體內的七武海。' },
  rayleigh: { place: 'shakkyBar', role: '鍍膜師', known: '在酒吧打發時間、替船隻鍍膜維生的老人。據說他曾是海賊王羅傑的副船長。' },
  shakky: { place: 'shakkyBar', role: '酒吧老闆娘', known: '她說最近天龍人來到群島，大家都躲著走；人口拍賣所又要開張了。' },
  hancock: { place: 'kujaCastle', role: '九蛇海賊團船長', known: '王下七武海之一、被稱為世界第一美女的女帝。女兒島向來不歡迎外人。' },
  nyon: { place: 'amazonForest', role: '前任九蛇皇帝', known: '見多識廣的老婆婆。她說推進城在無風帶裡，只有九蛇的船能安全往來。' },
  magellan: { place: 'impelGate', role: '推進城典獄長', known: '能操控劇毒的典獄長，從來沒讓任何犯人逃出推進城。' },
  ivankov: { place: 'impelLevel5', role: '人妖王', known: '躲在推進城暗處的革命軍幹部，在監獄裡建立了一個秘密的人妖王國。' },
  ace: { place: null, role: '白鬍子海賊團第二隊隊長', known: '火拳艾斯正在追捕叛徒黑鬍子。' },
  sengoku: { place: 'hqFortress', role: '海軍元帥', known: '海軍的最高指揮官，被稱為「佛之戰國」。' },
  whitebeard: { place: null, role: '四皇', known: '把船員都當作自己兒子的大海賊，白鬍子海賊團的船長。' },
  // Luffy is not the player. He sails his own canon route (luffyRoute) and the party may cross paths with him.
  luffy: { place: null, role: '戴草帽的少年', known: '吃了橡膠果實、身體能像橡膠一樣伸縮的少年。他說要成為海賊王，正在找夥伴。' },
}

// East Blue lanes are open water. Grand Line lanes need a Log Pose and mostly run one way.
export const canonLanes: SeaLane[] = [
  { ends: ['orange', 'syrup'], miles: 10 },
  { ends: ['syrup', 'baratie'], miles: 14 },
  { ends: ['baratie', 'cocoyasi'], miles: 12 },
  { ends: ['cocoyasi', 'loguetown'], miles: 20 },
  { ends: ['loguetown', 'twinCape'], miles: 60, oneWay: true, logPose: true, hazard: { name: '翻越顛倒山', damage: 10 } },
  { ends: ['twinCape', 'whiskyPeak'], miles: 300, oneWay: true, logPose: true },
  { ends: ['whiskyPeak', 'littleGarden'], miles: 400, oneWay: true, logPose: true },
  { ends: ['littleGarden', 'drum'], miles: 450, oneWay: true, logPose: true },
  { ends: ['drum', 'alabasta'], miles: 500, oneWay: true, logPose: true },
  { ends: ['alabasta', 'jaya'], miles: 600, oneWay: true, logPose: true },
  { ends: ['jaya', 'skypiea'], miles: 50, oneWay: true, logPose: true, needsTask: 'jaya', hazard: { name: '乘衝天海流', damage: 12 } },
  { ends: ['jaya', 'water7'], miles: 900, oneWay: true, logPose: true },
  { ends: ['skypiea', 'water7'], miles: 700, oneWay: true, logPose: true },
  { ends: ['water7', 'eniesLobby'], miles: 80, logPose: true },
  { ends: ['water7', 'thrillerBark'], miles: 700, oneWay: true, logPose: true },
  { ends: ['thrillerBark', 'sabaody'], miles: 700, oneWay: true, logPose: true },
  { ends: ['sabaody', 'marineford'], miles: 150, logPose: true },
  { ends: ['sabaody', 'amazonLily'], miles: 300, logPose: true, hazard: { name: '穿越無風帶', damage: 15 } },
  { ends: ['amazonLily', 'impelDown'], miles: 250, logPose: true, needsTask: 'amazonLily', hazard: { name: '穿越無風帶', damage: 15 } },
  { ends: ['impelDown', 'marineford'], miles: 200, oneWay: true, logPose: true, hazard: { name: '穿越無風帶', damage: 15 } },
]

export const canonStories: Record<CanonIslandId, IslandStory> = {
  syrup: {
    title: '管家的真面目', guide: 'usopp', meeting: 'syrupVillage', search: 'kayaMansion',
    lead: '騙人布說他在海岸偷聽到可怕的計畫，可是沒人相信他。他請你到可雅的宅邸找出證據。',
    find: '你在管家房裡找到黑貓海賊團的航海日誌，上面寫著明天黎明的襲擊計畫。',
    close: '騙人布拿著日誌跑遍全村，大家這次終於相信了他。',
    miss: '管家正好巡視宅邸，你只好先躲開。', reward: 300, xp: 80,
    samples: ['接下騙人布的請託', '調查管家的房間', '把證據交給騙人布'],
  },
  baratie: {
    title: '海上餐廳的人手', guide: 'zeff', meeting: 'baratieHall', search: 'baratieKitchen',
    lead: '哲夫說今晚可能有麻煩上門，廚房缺人手備料，請你去幫香吉士。',
    find: '你在廚房切了一整晚的菜。香吉士嘴上嫌你慢，還是分了你一盤員工餐。',
    close: '哲夫看了看備好的料，點頭塞給你們一包工錢。',
    miss: '你差點把鹽當糖撒進湯裡，被香吉士趕出廚房。', reward: 250, xp: 80, check: { attr: 'AGI', skill: '烹飪' },
    samples: ['接下哲夫的請託', '到廚房幫忙', '回報哲夫'],
  },
  cocoyasi: {
    title: '惡龍樂園的黑幕', guide: 'genzo', meeting: 'cocoyasiVillage', search: 'arlongPark',
    lead: '阿健說海軍第16分部對惡龍的暴行視而不見，請你潛進惡龍樂園，找出他們勾結的證據。',
    find: '你在惡龍樂園的帳房找到付給海軍老鼠上校的賄款帳冊。',
    close: '阿健把帳冊寄往海軍總部，村民第一次覺得事情有了轉機。',
    miss: '魚人守衛聽見動靜，你只能先撤退。', reward: 300, xp: 100, dc: 13,
    samples: ['接下阿健的請託', '潛入惡龍樂園', '把帳冊交給阿健'],
  },
  loguetown: {
    title: '一本松的委託', guide: 'ipponmatsu', meeting: 'logueShop', search: 'logueSquare',
    lead: '一本松說有扒手在處刑台廣場偷走了店裡的刀，請你在人群裡把刀找回來。',
    find: '你在處刑台下的人群裡逮到扒手，拿回了刀。',
    close: '一本松收回刀，送你們一些謝禮，再三提醒進偉大航路前一定要有記錄指針。',
    miss: '扒手鑽進人群跑了，你記下了他逃走的方向。', reward: 300, xp: 100,
    samples: ['接下一本松的委託', '在廣場找扒手', '把刀還給一本松'],
  },
  twinCape: {
    title: '拉布的傷口', guide: 'crocus', meeting: 'capeLighthouse', search: 'laboonBay',
    lead: '庫卡斯說鯨魚拉布又撞了紅土大陸，請你幫忙把藥抹到牠頭上的傷口。',
    find: '你爬上拉布的頭，把藥膏抹在傷口上。拉布低低叫了一聲。',
    close: '庫卡斯說拉布在等一群約好要回來的海賊，然後付給你們謝禮。',
    miss: '拉布一甩頭，你掉進了海灣。', reward: 300, xp: 150, check: { attr: 'AGI', skill: '醫術' },
    samples: ['接下庫卡斯的請託', '替拉布上藥', '回報庫卡斯'],
  },
  whiskyPeak: {
    title: '賞金獵人小鎮的秘密', guide: 'igaram', meeting: 'cactusRock', search: 'whiskyTown',
    lead: '伊卡萊姆低聲說這座鎮其實是巴洛克工作社的據點，請你找出他們下一道指令。',
    find: '你在酒館地窖找到一張指令：暗殺阿拉巴斯坦的公主。',
    close: '伊卡萊姆臉色發白，請你們務必保護薇薇，再塞給你們一袋盤纏。',
    miss: '鎮民熱情地拉你喝酒，你找不到機會溜開。', reward: 400, xp: 150,
    samples: ['接下伊卡萊姆的請託', '搜查小鎮', '把指令交給伊卡萊姆'],
  },
  littleGarden: {
    title: '爆炸的酒桶', guide: 'dorry', meeting: 'giantsArena', search: 'waxHouse',
    lead: '東利喝的酒桶突然爆炸，他懷疑有人在決鬥裡搗亂，請你查出是誰。',
    find: '你在一棟蠟燭做成的怪屋裡找到火藥和巴洛克工作社的標記。',
    close: '東利放聲大笑說，這場決鬥不容任何人玷污，並送給你們一份謝禮。',
    miss: '一頭恐龍擋住了去路，你只好繞回來。', reward: 400, xp: 180,
    samples: ['接下東利的請託', '調查蠟燭屋', '回報東利'],
  },
  drum: {
    title: '山頂的醫生', guide: 'dalton', meeting: 'bighorn', search: 'drumCastle',
    lead: '多爾頓說鎮上有病人急需治療，唯一的醫生住在山頂的磁鼓城。',
    find: '你冒著風雪爬上磁鼓城。古蕾娃答應下山看診，一隻小馴鹿躲在門後偷看你。',
    close: '病人得救了。多爾頓代表大角鎮向你們道謝。',
    miss: '暴風雪太大，你只能先退回鎮上。', reward: 400, xp: 180, check: { attr: 'CON', skill: '採集' },
    samples: ['接下多爾頓的請託', '登上磁鼓城', '回報多爾頓'],
  },
  alabasta: {
    title: '舞粉的真相', guide: 'pell', meeting: 'alubarna', search: 'rainbase',
    lead: '貝爾說叛亂軍相信國王用舞粉偷走了雨，請你到雨地找出真正使用舞粉的人。',
    find: '你在雨地賭場的地下室找到舞粉的帳本，上面蓋著巴洛克工作社社長的印章。',
    close: '寇布拉國王當眾公開帳本，叛亂軍首領柯沙沉默許久，終於放下了武器。',
    miss: '賭場守衛擋住了地下室的門，你只好先撤。', reward: 1000, xp: 300,
    dc: 15, retry: 2, searchMinutes: 60, minLevel: 3,
    samples: ['接下貝爾的請託', '潛入雨地賭場', '把帳本交給貝爾'],
  },
  jaya: {
    title: '南方鳥', guide: 'cricket', meeting: 'cricketHouse', search: 'cricketHouse',
    lead: '庫力克斯說要上空島，得先抓到一隻頭永遠朝南的南方鳥，才找得到衝天海流的方向。',
    find: '你在屋後的森林抓到一隻南方鳥。牠的頭果然一直朝著南方。',
    close: '庫力克斯把南方鳥交給你們，說衝天海流明天中午就會出現。',
    miss: '南方鳥飛進樹林深處，你追丟了。', reward: 300, xp: 200,
    samples: ['接下庫力克斯的請託', '到森林抓南方鳥', '把南方鳥帶回來'],
  },
  skypiea: {
    title: '黃金鐘的下落', guide: 'ganfall', meeting: 'angelBeach', search: 'upperYard',
    lead: '甘・佛爾說上層雲的森林裡藏著傳說中的黃金鐘，請你找出它的位置。',
    find: '你在上層雲的巨大豆藤頂端看見一座黃金鐘的輪廓。',
    close: '甘・佛爾說黃金鐘的聲音能讓分隔四百年的人們和解，並送給你們空島的貝殼當謝禮。',
    miss: '神官的試煉陷阱擋住了你的路。', reward: 500, xp: 300, dc: 13,
    samples: ['接下甘・佛爾的請託', '搜索上層雲', '回報甘・佛爾'],
  },
  water7: {
    title: '市長遇襲事件', guide: 'iceburg', meeting: 'galleyLa', search: 'frankyHouse',
    lead: '冰山市長昨夜遇襲。他說兇手可能就在身邊，請你暗中找出線索。',
    find: '你在佛朗基之家附近撿到一張 CP9 的密令，上面寫著要奪取古代兵器的設計圖。',
    close: '冰山看完密令嘆了口氣，請你們小心世界政府，並讓卡雷拉公司免費把你們的船修好。',
    miss: '船塢的工人起了疑心，你只好先離開。', reward: 600, xp: 250, dc: 13,
    onDone: { repairShip: true },
    samples: ['接下冰山的請託', '調查佛朗基之家', '把密令交給冰山'],
  },
  eniesLobby: {
    title: '正義之門前的救援', guide: 'robin', meeting: 'justiceTower', search: 'gateOfJustice',
    lead: '你們決定救出被押解的妮可・羅賓。她就要被帶進正義之門，時間不多了。',
    find: '你在正義之門的吊橋上擋下押送的 CP9，把羅賓從鐐銬裡救了出來。',
    close: '羅賓終於說出「我想活下去」。你們帶著她撤離了司法島。',
    miss: 'CP9 的六式把你擊退，你只能先找掩護。', reward: 800, xp: 400,
    dc: 16, retry: 2, searchMinutes: 30, minLevel: 5, availableFrom: [46, 10],
    onDone: { move: { robin: null }, facts: { robin: '她被你們從正義之門前救了出來，第一次說出想活下去。' } },
    samples: ['決定救出羅賓', '衝向正義之門', '帶羅賓撤離'],
  },
  thrillerBark: {
    title: '被奪走的影子', guide: 'brook', meeting: 'graveyard', search: 'moriaMansion',
    lead: '只剩骨頭的布魯克說他的影子被摩利亞奪走了，沒有影子就不能在陽光下行走。',
    find: '你在摩利亞的宅邸找到封著影子的箱子，布魯克的影子從裡面竄了出來。',
    close: '布魯克的影子回來了，他拉起小提琴為你們演奏了一曲。',
    miss: '殭屍守衛發現了你，你只好先退。', reward: 600, xp: 350, dc: 14, minLevel: 5,
    samples: ['接下布魯克的請託', '闖進摩利亞的宅邸', '回報布魯克'],
  },
  sabaody: {
    title: '拍賣會上的人魚', guide: 'rayleigh', meeting: 'shakkyBar', search: 'auctionHouse',
    lead: '雷利說人口販子抓走了一個人魚女孩，明天就要上拍賣台，請你在開拍前救她出來。',
    find: '你從拍賣所後台找到關著人魚的水槽，趁亂把她帶了出來。',
    close: '人魚女孩平安回到夏琪的酒吧。雷利笑著說，你們很像他年輕時的某個船長。',
    miss: '拍賣所的保鏢加強了戒備，你只能先撤。', reward: 800, xp: 300,
    dc: 15, retry: 2, minLevel: 6, availableFrom: [57, 8],
    samples: ['接下雷利的請託', '潛入人口拍賣所', '把人魚帶回酒吧'],
  },
  amazonLily: {
    title: '女帝的協助', guide: 'nyon', meeting: 'amazonForest', search: 'kujaCastle',
    lead: '尼歐魯皇太后說，只有女帝漢考克能讓船安全穿越無風帶前往推進城。你得說服她。',
    find: '你在九蛇城見到漢考克。她冷冷地答應借出拉船的海王類。',
    close: '尼歐魯皇太后說，九蛇的船隨時可以帶你們穿越無風帶。',
    miss: '漢考克連看都不看你一眼，侍衛把你趕了出去。', reward: 500, xp: 300,
    dc: 15, minLevel: 6, check: { attr: 'WIL', skill: '說服' },
    samples: ['接下皇太后的請託', '覲見女帝', '回報皇太后'],
  },
  impelDown: {
    title: '推進城大脫獄', guide: 'ivankov', meeting: 'impelLevel5', search: 'impelLevel6',
    lead: '伊娃可夫說火拳艾斯被關在最下層的無限地獄，只有趁守衛換班才有機會。',
    find: '你闖進無限地獄，打開了艾斯的鐐銬。',
    close: '你們和伊娃可夫的人妖軍團一起衝出推進城，艾斯重獲自由。',
    miss: '麥哲倫的毒霧逼得你退回第五層。', reward: 1000, xp: 600,
    dc: 17, retry: 2, searchMinutes: 30, minLevel: 7, availableFrom: [52, 8],
    onDone: { move: { ace: null }, facts: { ace: '他從推進城脫逃了，下落成謎。', ivankov: '火拳小子平安逃出去了！人妖王國永遠不會忘記這場大脫獄！' } },
    samples: ['接下伊娃可夫的計畫', '闖入無限地獄', '和艾斯一起逃出'],
  },
  marineford: {
    title: '頂上戰爭', guide: 'whitebeard', meeting: 'marinefordBay', search: 'scaffold',
    lead: '白鬍子在海灣怒吼要海軍交出艾斯。你們決定加入救援。',
    find: '你衝上處刑台，在刀落下之前斬斷了艾斯的海樓石鐐銬。',
    close: '你們護著艾斯殺出包圍，白鬍子海賊團的船接應你們撤離。',
    miss: '海軍大將的攻擊把你轟下了處刑台。', reward: 0, xp: 800,
    dc: 18, retry: 2, searchMinutes: 30, minLevel: 9, availableFrom: [72, 12], blockedBy: 'impelDown',
    onDone: { move: { ace: null, whitebeard: null } },
    samples: ['加入白鬍子的救援', '衝上處刑台', '護送艾斯撤離'],
  },
}

// Canon events on the in-game calendar (Day 1 08:00 is the morning Luffy leaves Foosha Village).
/** One step of Luffy's own voyage: where he is from that moment (null: at sea), and what he can tell people. */
export type RouteStop = {
  at: [number, number], place: LocationId | null, facts?: string, unless?: IslandId
  /** Who joins his crew at this stop. If the players recruited them first, the story shows the gap instead. */
  joins?: NpcId
  /** A flag (see flags.ts); when it holds he skips this stop and stays at sea with `skipFacts`. */
  skip?: string, skipFacts?: string
}

// Luffy follows the canon route on the same calendar as the timeline, independent of the players.
// `unless` skips a stop when the players' finished quest has removed his reason to be there.
export const luffyRoute: RouteStop[] = [
  { at: [2, 8], place: 'shellsTown' },
  { at: [2, 16], place: null, joins: 'zoro', facts: '剛讓劍士索隆成為夥伴，兩個人乘著小船繼續找夥伴。' },
  { at: [3, 10], place: 'orangeStreet' },
  { at: [3, 18], place: null, facts: '航海士娜美暫時跟他們同行，她說只是合作關係。' },
  { at: [3, 22], place: 'syrupVillage' },
  { at: [4, 12], place: null, joins: 'usopp', facts: '騙人布加入了，他們還得到一艘叫前進梅利號的船。' },
  { at: [5, 20], place: 'baratieHall' },
  { at: [6, 18], place: null, joins: 'sanji', facts: '在海上餐廳找到了廚師香吉士，一夥人正追著娜美出海。' },
  { at: [7, 14], place: 'cocoyasiVillage', skip: 'defeated:arlong', skipFacts: '聽說可可亞西村的惡龍已經被別人打倒了，他改變了航線。' },
  { at: [8, 20], place: null, joins: 'nami', facts: '草帽一夥的旗子豎起來了：劍士、航海士、狙擊手、廚師都到齊了。' },
  { at: [9, 12], place: 'logueSquare' },
  { at: [9, 20], place: null, facts: '草帽一夥正朝偉大航路前進。' },
  { at: [10, 12], place: 'capeLighthouse' },
  { at: [11, 6], place: null },
  { at: [11, 20], place: 'whiskyTown' },
  { at: [12, 4], place: null, joins: 'vivi', facts: '答應護送阿拉巴斯坦的公主薇薇回國。' },
  { at: [13, 12], place: 'giantsArena' },
  { at: [14, 16], place: null },
  { at: [16, 10], place: 'bighorn' },
  { at: [17, 8], place: 'drumCastle' },
  { at: [18, 14], place: null, joins: 'chopper', facts: '船上多了一隻會說話的馴鹿醫生喬巴。' },
  { at: [21, 10], place: 'nanohana' },
  { at: [23, 10], place: 'rainbase' },
  { at: [25, 10], place: 'alubarna', skip: 'defeated:crocodile', skipFacts: '聽說克洛克達爾已經被擊敗，阿拉巴斯坦的危機解除了，他轉往別處。' },
  { at: [27, 8], place: null, joins: 'robin', facts: '在阿拉巴斯坦和薇薇道別後，考古學家妮可・羅賓上了他們的船。' },
  { at: [28, 12], place: 'mockTown' },
  { at: [29, 6], place: 'cricketHouse' },
  { at: [29, 12], place: null },
  { at: [30, 10], place: 'angelBeach' },
  { at: [33, 12], place: 'godShrine' },
  { at: [34, 8], place: null, facts: '從空島回來了，說天上真的有黃金。' },
  { at: [40, 10], place: 'water7Port' },
  { at: [44, 10], place: 'galleyLa' },
  { at: [46, 12], place: null, facts: '羅賓被帶走了，他正追著海列車去司法島。' },
  { at: [48, 8], place: 'justiceTower' },
  { at: [48, 14], place: null },
  { at: [49, 8], place: 'water7Port', joins: 'franky', facts: '從司法島救回羅賓。佛朗基替他們造了新船千陽號，也成了船匠夥伴。' },
  { at: [53, 8], place: null },
  { at: [55, 10], place: 'thrillerDock' },
  { at: [56, 4], place: 'moriaMansion', skip: 'defeated:moria', skipFacts: '聽說摩利亞已經被打倒，影子都回來了，他沒有登上那艘鬼船。' },
  { at: [56, 12], place: null, joins: 'brook', facts: '骷髏音樂家布魯克加入了，草帽一夥共有九個人。' },
  { at: [57, 10], place: 'sabaodyGrove' },
  { at: [58, 12], place: 'auctionHouse' },
  { at: [59, 12], place: null, facts: '在夏波帝被巴索羅繆・大熊打散，下落不明。' },
  { at: [61, 10], place: 'kujaCastle', facts: '被大熊打飛到女兒島，聽說哥哥艾斯要被處刑，急著去救他。' },
  { at: [63, 8], place: null },
  { at: [64, 10], place: 'impelGate', unless: 'impelDown' },
  { at: [66, 8], place: 'impelLevel5', unless: 'impelDown' },
  { at: [70, 6], place: null },
  { at: [72, 12], place: 'scaffold', unless: 'impelDown' },
  { at: [72, 20], place: null, facts: '頂上戰爭結束後，他的消息暫時斷了。' },
]

export const canonTimeline: CanonEvent[] = [
  { id: 'shells', at: [2, 12], island: 'shells', title: '謝爾茲鎮的海軍上校倒下',
    text: '戴草帽的少年在謝爾茲鎮擊敗了海軍上校蒙卡，被綁在基地廣場的劍士索隆成為他的第一個夥伴。',
    effect: { move: { zoro: null }, facts: { rika: '蒙卡上校被打倒了！索隆哥哥跟著一個戴草帽的人出海了。' }, close: ['shells'] },
    changed: [{ when: ['recruited:zoro'], text: '戴草帽的少年在謝爾茲鎮擊敗了海軍上校蒙卡；被綁在廣場的劍士索隆早已被一群旅人帶走，少年只能繼續獨自找夥伴。',
      effect: { facts: { rika: '蒙卡上校被打倒了！索隆哥哥早就跟著別的旅人走了。' }, close: ['shells'] } }] },
  { id: 'orange', at: [3, 15], island: 'orange', title: '小丑巴其海賊團敗走',
    text: '小丑巴其海賊團在橘子鎮被草帽少年擊敗，鎮民陸續回到家園。',
    effect: { facts: { boodle: '海賊被趕走了！鎮子雖然破破爛爛，但總能重建。修修還守著寵物店。' } },
    changed: [{ when: ['recruited:buggy'], text: '小丑巴其被一群旅人收服、帶離了橘子鎮，海賊團群龍無首，鎮民陸續回到家園。',
      effect: { facts: { boodle: '那個小丑被別人帶走了！鎮子雖然破破爛爛，但總能重建。修修還守著寵物店。' } } }] },
  { id: 'syrup', at: [4, 6], island: 'syrup', title: '西羅布村的黎明',
    text: '黑貓海賊團在黎明時分襲擊西羅布村，被騙人布與草帽一夥擊退；管家克拉哈德的真面目是海賊克洛。騙人布隨後出海。',
    effect: { move: { usopp: null, klahadore: null }, facts: { kaya: '騙人布出海了。我要好好學醫，等他回來。' }, close: ['syrup'] },
    changed: [{ defeated: 'klahadore', text: '海賊克洛早已被一群旅人打倒，黑貓海賊團群龍無首，沒敢登陸西羅布村。' },
      { by: 'syrup', text: '黑貓海賊團還沒登陸就被識破。克洛的陰謀敗露後倉皇逃走，西羅布村毫髮無傷。',
      effect: { move: { klahadore: null }, facts: { kaya: '我差點被最信任的人騙了……謝謝你們相信騙人布。' } } },
      { when: ['recruited:usopp'], text: '黑貓海賊團在黎明時分襲擊西羅布村，被趕來的草帽一夥擊退；騙人布早已跟著旅人出海，管家克拉哈德的真面目是海賊克洛。',
        effect: { move: { klahadore: null }, facts: { kaya: '騙人布跟著旅人出海了。我要好好學醫，等他回來。' }, close: ['syrup'] } },
      { when: ['recruited:klahadore'], text: '黑貓海賊團在黎明時分來到西羅布村，但「百計的克洛」早已被一群旅人收服、離開了這裡，海賊團群龍無首，沒敢登陸。',
        effect: { facts: { kaya: '克拉哈德……他跟著那群旅人走了。我不知道能不能相信他，但村子平安了。' }, close: ['syrup'] } }] },
  { id: 'baratie', at: [6, 14], island: 'baratie', title: '海上餐廳之戰',
    text: '首領・克利克海賊團襲擊海上餐廳巴拉蒂後被擊退；副料理長香吉士告別哲夫，跟著草帽一夥出海。',
    effect: { move: { sanji: null }, facts: { zeff: '那個臭小子終於出海去找 ALL BLUE 了。' }, close: ['baratie'] },
    changed: [{ when: ['recruited:sanji'], text: '首領・克利克海賊團襲擊海上餐廳巴拉蒂後被擊退；副料理長香吉士早已跟著旅人出海，哲夫獨自守著餐廳。',
      effect: { facts: { zeff: '那個臭小子跟著別人出海找 ALL BLUE 去了。' }, close: ['baratie'] } },
      { when: ['recruited:krieg'], text: '首領・克利克已被一群旅人收服、帶離，他的海賊團群龍無首，沒敢靠近海上餐廳；副料理長香吉士告別哲夫，跟著草帽一夥出海。',
        effect: { move: { sanji: null }, facts: { zeff: '那個臭小子終於出海去找 ALL BLUE 了。' }, close: ['baratie'] } }] },
  { id: 'arlong', at: [8, 16], island: 'cocoyasi', title: '惡龍樂園倒塌',
    text: '惡龍樂園倒塌，魚人惡龍被打倒，可可亞西村重獲自由；航海士娜美加入了草帽一夥。',
    effect: { move: { arlong: null }, facts: { genzo: '村子自由了！娜美跟著那個草帽小子出海了。', nojiko: '娜美終於能為自己而活了。' }, close: ['cocoyasi'] },
    changed: [{ defeated: 'arlong', text: '惡龍早已被一群旅人打倒，惡龍樂園群龍無首，可可亞西村提前重獲自由。' },
      { by: 'cocoyasi', text: '海軍總部收到惡龍與第16分部勾結的帳冊，派兵查辦；惡龍樂園應聲倒塌，可可亞西村重獲自由。',
      effect: { move: { arlong: null }, facts: { genzo: '多虧你們找到的帳冊，村子自由了！' } } },
      { when: ['recruited:arlong'], text: '惡龍早已被一群旅人收服、帶離了村子，惡龍樂園群龍無首，可可亞西村提前重獲自由。',
        effect: { facts: { genzo: '惡龍竟然跟那群旅人走了……村子自由了，不過我還是不敢放鬆。' }, close: ['cocoyasi'] } },
      { when: ['recruited:nami'], text: '惡龍樂園倒塌，魚人惡龍被打倒，可可亞西村重獲自由；航海士娜美早已跟著旅人們出海，草帽少年少了一位航海士。',
        effect: { move: { arlong: null }, facts: { genzo: '村子自由了！娜美早就跟別人出海了。', nojiko: '娜美終於能為自己而活了。' }, close: ['cocoyasi'] } }] },
  { id: 'loguetown', at: [9, 18], island: 'loguetown', title: '處刑台上的雷光',
    text: '草帽少年在羅格鎮處刑台險些被巴其斬首，一道落雷救了他。斯摩格上校隨即追向偉大航路。',
    effect: { move: { smoker: null }, facts: { ipponmatsu: '聽說有群小鬼差點在處刑台上掉腦袋，還是笑著跑去偉大航路了。' } },
    changed: [{ when: ['recruited:buggy'], text: '草帽少年在羅格鎮處刑台旁被捕，一道落雷救了他；巴其不在處刑台上，是別的海賊布置了處刑。斯摩格上校隨即追向偉大航路。',
      effect: { move: { smoker: null }, facts: { ipponmatsu: '聽說有群小鬼差點在處刑台上掉腦袋，還是笑著跑去偉大航路了。' } } }] },
  { id: 'whisky', at: [12, 2], island: 'whiskyPeak', title: '威士忌山峰的伏兵',
    text: '巴洛克工作社在威士忌山峰的伏兵被擊潰，阿拉巴斯坦公主薇薇搭上草帽一夥的船返國。',
    effect: { move: { vivi: null, igaram: null }, close: ['whiskyPeak'] },
    changed: [{ when: ['recruited:vivi'], text: '巴洛克工作社在威士忌山峰的伏兵被擊潰；阿拉巴斯坦公主薇薇早已和旅人們一起啟程返國。',
      effect: { move: { igaram: null }, close: ['whiskyPeak'] } }] },
  { id: 'littleGarden', at: [14, 12], island: 'littleGarden', title: '小花園的陷阱被破',
    text: 'Mr.3 在小花園設下的陷阱被破，巨人東利與布洛基繼續他們百年的決鬥。', effect: { close: ['littleGarden'] } },
  { id: 'drum', at: [18, 10], island: 'drum', title: '磁鼓島的櫻花',
    text: '前國王瓦波爾被擊敗，磁鼓島的夜空飄起粉紅色的雪；馴鹿醫生喬巴隨草帽一夥出海。',
    effect: { move: { chopper: null }, facts: { dalton: '瓦波爾被打倒了，這個國家可以重新開始。那隻馴鹿也出海了。' } },
    changed: [{ when: ['recruited:chopper'], text: '前國王瓦波爾被擊敗，磁鼓島的夜空飄起粉紅色的雪；馴鹿醫生喬巴早已跟著旅人出海。',
      effect: { facts: { dalton: '瓦波爾被打倒了，這個國家可以重新開始。那隻馴鹿早就跟著別人出海了。' } } },
      { when: ['recruited:wapol'], text: '前國王瓦波爾被一群旅人收服、帶離了磁鼓島，磁鼓島的夜空飄起粉紅色的雪；馴鹿醫生喬巴隨草帽一夥出海。',
        effect: { move: { chopper: null }, facts: { dalton: '瓦波爾竟然跟那群旅人走了……這個國家總算能重新開始。那隻馴鹿也出海了。' } } }] },
  { id: 'alabastaMarch', at: [20, 8], island: 'alabasta', title: '叛亂軍集結',
    text: '阿拉巴斯坦的叛亂軍集結完畢，準備向首都阿爾巴那進軍。',
    changed: [{ by: 'alabasta', text: '叛亂軍得知舞粉的真相後解散，沒有向首都進軍。' }] },
  { id: 'alabasta', at: [25, 16], island: 'alabasta', title: '阿拉巴斯坦的雨',
    text: '克洛克達爾在阿爾巴那被草帽少年擊敗，久違的雨水落在阿拉巴斯坦，內戰終於結束。',
    effect: { move: { crocodile: null }, facts: { pell: '雨下了，內戰結束了。草帽一夥送薇薇公主回到了王宮。', cobra: '是那群海賊救了這個國家。' }, close: ['alabasta'] },
    changed: [{ defeated: 'crocodile', text: '克洛克達爾已被一群旅人擊敗，陰謀敗露，內戰在爆發前就平息了。' },
      { by: 'alabasta', text: '王國提前公開了舞粉的真相，內戰沒有爆發。克洛克達爾的陰謀敗露，在雨地被海軍逮捕。',
      effect: { move: { crocodile: null }, facts: { pell: '多虧你們的帳本，國民沒有互相殘殺。', cobra: '這個國家欠你們一份恩情。' } } },
      { when: ['recruited:crocodile'], text: '克洛克達爾已被一群旅人收服、帶離，陰謀敗露，內戰在爆發前就平息了。',
        effect: { facts: { pell: '克洛克達爾被那群旅人帶走了，內戰沒有發生。', cobra: '這個國家欠你們一份恩情。' }, close: ['alabasta'] } }] },
  { id: 'jaya', at: [29, 12], island: 'jaya', title: '衝天海流',
    text: '一艘海賊船在加亞島外海乘著衝天海流飛上了天空。',
    effect: { facts: { cricket: '那群小鬼真的飛上天了！我就知道空島是存在的！' } } },
  { id: 'skypiea', at: [33, 20], island: 'skypiea', title: '黃金鐘響',
    text: '空島之神艾涅爾被打倒，黃金鐘的聲音響徹空島，也傳到了地上的加亞島。',
    effect: { move: { enel: null }, facts: { ganfall: '鐘聲響了，空島的人們終於能放下四百年的仇恨。' }, close: ['skypiea'] },
    changed: [{ defeated: 'enel', text: '艾涅爾早已被一群地上來的旅人打倒，黃金鐘的聲音響徹空島。', effect: { close: ['skypiea'] } },
      { when: ['recruited:enel'], text: '艾涅爾已被一群地上來的旅人收服、帶離了空島，黃金鐘的聲音響徹空島。', effect: { close: ['skypiea'] } }] },
  { id: 'water7', at: [46, 10], island: 'water7', title: '海列車的乘客',
    text: 'CP9 在七水之都襲擊市長冰山後，押著考古學家妮可・羅賓搭上海列車前往司法島。',
    effect: { move: { robin: 'justiceTower' }, facts: { iceburg: '兇手是我的秘書和船匠……他們是 CP9。羅賓被押往司法島了。' }, close: ['water7'] } },
  { id: 'enies', at: [48, 12], island: 'eniesLobby', title: '向世界政府宣戰',
    text: '草帽一夥向世界政府宣戰，在正義之門前救出妮可・羅賓；司法島在屠魔令下化為廢墟。',
    effect: { move: { robin: null, lucci: null, spandam: null }, close: ['eniesLobby'] },
    changed: [{ defeated: 'lucci', text: '路基早已被打倒，CP9 押送失手，妮可・羅賓獲救；屠魔令依然落下，司法島化為廢墟。',
      effect: { move: { robin: null, spandam: null } } },
      { by: 'eniesLobby', text: '妮可・羅賓在被押進正義之門前就獲救了。屠魔令依然落下，司法島化為廢墟。',
      effect: { move: { lucci: null, spandam: null } } },
      { when: ['recruited:lucci'], text: '路基已被一群旅人收服、帶離，CP9 押送失手，妮可・羅賓獲救；屠魔令依然落下，司法島化為廢墟。',
        effect: { move: { robin: null, spandam: null } } }] },
  { id: 'aceCaptured', at: [52, 8], island: 'impelDown', title: '火拳艾斯被捕',
    text: '白鬍子海賊團第二隊隊長火拳艾斯被黑鬍子擊敗，押進了推進城。',
    effect: { move: { ace: 'impelLevel6' }, facts: { ace: '他被黑鬍子擊敗後關進推進城的最下層，仍然不肯低頭。' } } },
  { id: 'thriller', at: [56, 6], island: 'thrillerBark', title: '影子回到主人身上',
    text: '王下七武海月光・摩利亞被擊敗，被奪走的影子回到主人身上；音樂家布魯克加入草帽一夥。',
    effect: { move: { brook: null }, close: ['thrillerBark'] },
    changed: [{ when: ['recruited:moria'], text: '摩利亞已被一群旅人收服、帶離，被奪走的影子紛紛回到主人身上；布魯克隨草帽一夥出海。', effect: { move: { brook: null }, close: ['thrillerBark'] } },
      { when: ['recruited:brook'], text: '王下七武海月光・摩利亞被擊敗，被奪走的影子回到主人身上；音樂家布魯克早已跟著旅人出海。', effect: { close: ['thrillerBark'] } },
      { defeated: 'moria', text: '摩利亞早已被一群旅人打倒，影子都回來了；布魯克隨草帽一夥出海。', effect: { move: { brook: null } } }] },
  { id: 'sabaody', at: [58, 15], island: 'sabaody', title: '天龍人被揍了',
    text: '草帽少年在夏波帝的人口拍賣所毆打了天龍人，海軍大將黃猿率兵前來鎮壓。',
    effect: { facts: { shakky: '那小子竟然揍了天龍人！整座群島都翻天了。' }, close: ['sabaody'] },
    changed: [{ by: 'sabaody', text: '人魚女孩在拍賣前就被救走，人口拍賣所白等了一場；天龍人大發雷霆，海軍大將黃猿率兵前來搜查。' }] },
  { id: 'kuma', at: [59, 12], island: 'sabaody', title: '草帽一夥消失',
    text: '草帽一夥在夏波帝被王下七武海巴索羅繆・大熊擊散到世界各地。' },
  { id: 'execution', at: [60, 9], island: 'marineford', title: '公開處刑公告',
    text: '海軍本部宣布：將在馬林福特公開處刑火拳艾斯。白鬍子海賊團的動向成了全世界的焦點。',
    changed: [{ by: 'impelDown', text: '海軍本部原訂公開處刑火拳艾斯，但推進城發生大脫獄，處刑被迫無限期延後。' }] },
  { id: 'aceTransfer', at: [70, 8], island: 'impelDown', title: '押送處刑台',
    text: '火拳艾斯從推進城被押往馬林福特的處刑台。',
    effect: { move: { ace: 'scaffold' }, facts: { ace: '他被綁在馬林福特的處刑台上，說自己的人生沒有遺憾。' }, close: ['impelDown'] },
    changed: [{ by: 'impelDown', text: '海軍原本要把火拳艾斯押往馬林福特，但他早已不在推進城的牢房裡。' }] },
  { id: 'warBegins', at: [72, 12], island: 'marineford', title: '頂上戰爭爆發',
    text: '白鬍子海賊團率領大艦隊殺到馬林福特，頂上戰爭爆發！',
    effect: { move: { whitebeard: 'marinefordBay' }, facts: { whitebeard: '他站在船頭，要海軍交出他的兒子艾斯。' } },
    changed: [{ by: 'impelDown', text: '白鬍子海賊團與海軍在馬林福特外海對峙，但處刑台空無一人，雙方沒有全面開戰。' }] },
  { id: 'warEnds', at: [72, 20], island: 'marineford', title: '頂上戰爭落幕',
    text: '火拳艾斯為保護弟弟而倒下，白鬍子也戰死沙場。頂上戰爭落幕，大海賊時代迎來新的轉折。',
    effect: { move: { ace: null, whitebeard: null }, close: ['marineford'] },
    changed: [
      { by: 'marineford', text: '火拳艾斯被救下處刑台，白鬍子海賊團掩護他撤離。頂上戰爭在混亂中結束，世界局勢從此改寫。' },
      { by: 'impelDown', text: '沒有處刑的馬林福特恢復平靜；逃出推進城的火拳艾斯下落成謎，世界局勢從此改寫。' },
    ] },
]

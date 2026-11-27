// After the Summit War: the two years, the reunion at Sabaody, and the New World from Fishman Island to Egghead
// (fan work; all wording is original summary). Same rules as canon.ts: the calendar plays the original story out unless
// the players have already changed it. The party reaches Day 803 by voting for the two years of training
// (packages/rules/timeskip.ts); before that the New World is already there for anyone who sails in early.
import type { IslandId, LocationId, NpcId } from '../shared/protocol.ts'
import type { CanonEvent, IslandStory, RouteStop, SeaLane, WorldEffect } from './canon.ts'
import type { CastStop } from './cast.ts'
import type { Faction } from './foes.ts'
import type { EventPhases } from './phases.ts'
import type { Saga, SagaGoal } from './water7.ts'

type NewIsland = 'fishmanIsland' | 'punkHazard' | 'dressrosa' | 'zou' | 'wholeCake' | 'wano' | 'egghead'
type Day = [number, number]

/** Two years after the war: the crew meets again at Sabaody. */
export const reunion: Day = [803, 8]
/** The war ends at Day 72 20:00; from then on the crew can set out to train. */
export const warOver: Day = [72, 20]
const at = ([day, hour]: Day) => (day - 1) * 1440 + hour * 60
export const reunionMinute = at(reunion)

export const newWorldIslands: Record<NewIsland, { name: string, about: string, places: [LocationId, string, string][] }> = {
  fishmanIsland: { name: '魚人島', about: '偉大航路：紅土大陸正下方、海底一萬公尺的泡泡之國，龍宮王國的所在', places: [
    ['fishmanPort', '港灣', '船穿過泡泡外膜後停靠的地方'], ['ryugu', '龍宮城', '尼普頓國王的王宮，硬殼塔裡住著人魚公主'], ['fishmanDistrict', '魚人街', '被遺棄的貧民區，新魚人海賊團的據點']] },
  punkHazard: { name: '龐克哈薩特', about: '新世界：一半燃燒、一半冰封的禁地，政府封鎖的舊研究島', places: [
    ['phShore', '海岸', '停泊或搭船離開龐克哈薩特'], ['phFire', '燃燒之地', '終年燃燒的焦土，到處是巨大的骨骸'], ['phIce', '冰封之地', '大雪覆蓋的一側，G-5 的海軍在這裡紮營']] },
  dressrosa: { name: '德雷斯羅薩', about: '新世界：愛與熱情、玩具與小人族的王國，國王是唐吉訶德・多佛朗明哥', places: [
    ['drPort', '港口', '停泊或搭船離開德雷斯羅薩'], ['acacia', '阿卡西亞', '港邊的城鎮，玩具和人一起生活'], ['corrida', '競技場', '科羅西姆競技場，正在舉辦獎品是惡魔果實的大會']] },
  zou: { name: '佐烏', about: '新世界：活了上千年的巨象背上的國度，毛皮族的家', places: [
    ['zouFoot', '象腳', '爬上巨象之前的落腳處'], ['mokomo', '莫可莫公國', '毛皮族的城鎮，白天由犬嵐公爵治理'], ['whaleForest', '鯨之森', '夜晚由貓蝮蛇老大守著的森林']] },
  wholeCake: { name: '蛋糕島', about: '新世界：四皇夏洛特・玲玲（Big Mom）統治的萬國托特蘭本島', places: [
    ['wcPort', '港口', '停泊或搭船離開蛋糕島'], ['sweetCity', '甜點之城', '住著各國種族的城鎮，房子都能吃'], ['wcChateau', '城堡', '全蛋糕城堡，茶會就在這裡舉行']] },
  wano: { name: '和之國', about: '新世界：武士之國，被瀑布圍起的鎖國，凱多與黑炭大蛇掌權', places: [
    ['kuriBeach', '九里海岸', '登上瀑布後的海岸，停泊或搭船離開和之國'], ['kuri', '九里', '曾是光月御田的領地，如今一片荒涼'], ['flowerCapital', '花之都', '將軍黑炭大蛇所在的都城']] },
  egghead: { name: '蛋頭島', about: '新世界：天才科學家貝加龐克的研究島，又叫「未來島」', places: [
    ['eggShore', '海岸', '停泊或搭船離開蛋頭島'], ['fabriophase', '工廠層', '機器人與工廠的樓層'], ['labophase', '研究層', '漂在空中的蛋形研究所，貝加龐克在這裡']] },
}

/** Places beyond the first three, their map positions, and the walking network (as in sites.ts). */
export const newWorldLayouts: Partial<Record<NewIsland, { add: [LocationId, string, string][], at: Partial<Record<LocationId, [number, number]>>, roads: [LocationId, LocationId, number?][] }>> = {
  fishmanIsland: {
    add: [
      ['mermaidCafe', '咖啡廳', '人魚咖啡廳，占卜師夏莉夫人是老闆'],
      ['fishmanPlaza', '中央廣場', '王國的大廣場，大事都在這裡發生'],
      ['seaForest', '海之森', '沉船的墓場，也是乙姬王妃長眠的地方'],
    ],
    at: { fishmanPort: [20, 84], mermaidCafe: [20, 48], fishmanPlaza: [50, 56], ryugu: [80, 16], fishmanDistrict: [80, 84], seaForest: [24, 14] },
    roads: [['fishmanPort', 'mermaidCafe'], ['fishmanPort', 'fishmanPlaza'], ['fishmanPlaza', 'ryugu'], ['fishmanPlaza', 'fishmanDistrict'], ['mermaidCafe', 'seaForest', 12], ['fishmanPlaza', 'mermaidCafe']],
  },
  punkHazard: {
    add: [['phLab', '研究所', '凱薩・克朗的研究所，孩子們被關在裡面']],
    at: { phShore: [20, 84], phFire: [20, 22], phIce: [80, 82], phLab: [76, 20] },
    roads: [['phShore', 'phFire', 12], ['phShore', 'phIce', 12], ['phFire', 'phLab', 12], ['phIce', 'phLab', 12]],
  },
  dressrosa: {
    add: [
      ['toyHouse', '玩具之家', '玩具們被製造出來的地方，砂糖在這裡'],
      ['drPalace', '王宮', '高地上的王宮，多佛朗明哥坐在王位上'],
      ['greenBit', '綠地', '綠地格林比特，小人族的故鄉'],
    ],
    at: { drPort: [20, 84], acacia: [50, 60], corrida: [80, 84], toyHouse: [80, 44], drPalace: [64, 14], greenBit: [20, 26] },
    roads: [['drPort', 'acacia'], ['acacia', 'corrida'], ['acacia', 'toyHouse'], ['toyHouse', 'drPalace', 10], ['corrida', 'toyHouse'], ['drPort', 'greenBit', 15]],
  },
  wholeCake: {
    add: [['seducingWoods', '誘惑之森', '會說話的樹會讓迷路的人走不出去']],
    at: { wcPort: [20, 84], sweetCity: [50, 50], wcChateau: [80, 16], seducingWoods: [20, 18] },
    roads: [['wcPort', 'sweetCity'], ['sweetCity', 'wcChateau'], ['sweetCity', 'seducingWoods', 12], ['seducingWoods', 'wcChateau', 15]],
  },
  wano: {
    add: [
      ['udon', '兔丼', '採石場兼監獄，囚犯在百獸海賊團的監視下做苦工'],
      ['onigashima', '鬼島', '和之國外海的骷髏島，凱多的根據地（得坐船過去）'],
    ],
    at: { kuriBeach: [20, 84], kuri: [36, 50], flowerCapital: [64, 46], udon: [80, 84], onigashima: [82, 14] },
    roads: [['kuriBeach', 'kuri'], ['kuri', 'flowerCapital', 30], ['flowerCapital', 'udon', 30], ['flowerCapital', 'onigashima', 60]],
  },
  egghead: {
    add: [['frontierDome', '邊境圓頂', '包住整座島的防禦罩，從外面打不進來']],
    at: { eggShore: [20, 84], fabriophase: [50, 50], labophase: [80, 16], frontierDome: [80, 82] },
    roads: [['eggShore', 'fabriophase'], ['fabriophase', 'labophase', 10], ['eggShore', 'frontierDome'], ['frontierDome', 'fabriophase']],
  },
}

/** New World lanes. Sabaody to Fishman Island dives 10,000 m: the ship must be coated first. */
export const newWorldLanes: SeaLane[] = [
  { ends: ['sabaody', 'fishmanIsland'], miles: 30, logPose: true, needsCoating: true, hazard: { name: '潛入海底一萬公尺', damage: 8 } },
  { ends: ['fishmanIsland', 'punkHazard'], miles: 500, oneWay: true, logPose: true, needsCoating: true, newWorld: true, hazard: { name: '從海底浮上新世界', damage: 10 } },
  { ends: ['punkHazard', 'dressrosa'], miles: 400, logPose: true, newWorld: true },
  { ends: ['dressrosa', 'zou'], miles: 900, logPose: true, newWorld: true },
  { ends: ['zou', 'wholeCake'], miles: 1100, logPose: true, newWorld: true },
  { ends: ['zou', 'wano'], miles: 1000, logPose: true, newWorld: true, hazard: { name: '逆流登上和之國的瀑布', damage: 10 } },
  { ends: ['wholeCake', 'wano'], miles: 1200, logPose: true, newWorld: true, hazard: { name: '逆流登上和之國的瀑布', damage: 10 } },
  { ends: ['wano', 'egghead'], miles: 1300, logPose: true, newWorld: true },
]

export const newWorldStories: Record<NewIsland, IslandStory> = {
  fishmanIsland: {
    title: '人魚公主的護衛', guide: 'fukaboshi', meeting: 'ryugu', search: 'fishmanDistrict',
    lead: '鯊星王子說，魚人街有人在囤積「能量藥」，準備推翻龍宮王國。他請你潛進魚人街，找出這個計畫的證據。',
    find: '你在魚人街的廢屋裡找到成箱的能量藥，還有一張龍宮城的地圖，上面圈著國王會出現的時間。',
    close: '鯊星王子拿著地圖立刻調整了護衛，說至少這一次，他們不會措手不及。',
    miss: '新魚人海賊團的哨兵聞到了你的味道，你只好先退出魚人街。', reward: 300_000, xp: 900,
    dc: 17, minLevel: 12, availableFrom: [804, 8], check: { attr: 'AGI', skill: '閃避' },
    samples: ['接下鯊星王子的請託', '潛入魚人街', '把證據交給鯊星王子'],
  },
  punkHazard: {
    title: '被關起來的孩子們', guide: 'tashigi', meeting: 'phIce', search: 'phLab',
    lead: '塔希吉說研究所裡關著一群變成巨人的孩子，凱薩每天給他們吃一種糖果。她請你潛進研究所，查出糖果是什麼。',
    find: '你在研究所的藥櫃裡找到那種糖果：裡面摻了會讓人上癮的藥。',
    close: '塔希吉把糖果的事告訴了 G-5 的海軍，他們發誓不會再讓孩子吃下任何一顆。',
    miss: '凱薩的部下在走廊上巡邏，你沒能靠近藥櫃。', reward: 300_000, xp: 900,
    dc: 17, minLevel: 12, availableFrom: [810, 12], check: { attr: 'PER', skill: '觀察' },
    samples: ['接下塔希吉的請託', '潛入研究所', '把糖果交給塔希吉'],
  },
  dressrosa: {
    title: '玩具們的祕密', guide: 'leo', meeting: 'greenBit', search: 'toyHouse',
    lead: '小人族的雷歐說，城裡的玩具其實都是被變成玩具、被所有人遺忘的人。只要讓玩具之家的砂糖昏過去，大家就能變回來。他請你去查清楚砂糖在哪裡。',
    find: '你摸清了玩具之家的守備：砂糖總在最深處的房間吃葡萄，身邊只有一個人在守。',
    close: '雷歐把砂糖的位置告訴了所有小人族。他們說，這一次一定能讓大家想起來。',
    miss: '玩具之家的守衛起了疑心，你只能先退回去。', reward: 400_000, xp: 1_100,
    dc: 18, minLevel: 14, availableFrom: [813, 8], check: { attr: 'AGI', skill: '閃避' },
    samples: ['接下雷歐的請託', '潛入玩具之家', '把砂糖的位置告訴雷歐'],
  },
  zou: {
    title: '巨象背上的傷者', guide: 'wanda', meeting: 'mokomo', search: 'whaleForest',
    lead: '傑克的毒氣讓莫可莫公國滿是傷者。汪達請你到鯨之森，把貓蝮蛇老大那邊需要的藥送過去。',
    find: '你把藥送到鯨之森，替倒下的毛皮族換好了繃帶。',
    close: '汪達說，佐烏會記住在最難的時候幫過他們的人。',
    miss: '鯨之森太大了，你在樹根之間繞了一圈還沒找到傷者。', reward: 250_000, xp: 800,
    dc: 15, minLevel: 12, availableFrom: [819, 18], check: { attr: 'INT', skill: '醫術' },
    samples: ['接下汪達的請託', '把藥送到鯨之森', '回報汪達'],
  },
  wholeCake: {
    title: '茶會的暗殺計畫', guide: 'bege', meeting: 'seducingWoods', search: 'wcChateau',
    lead: '卡彭・培基說，Big Mom 只有在看見一張照片時會失神。他要你在茶會前溜進城堡，把那張照片的位置找出來。',
    find: '你在城堡的迴廊盡頭找到了那張照片，也記下了茶會的座位。',
    close: '培基收下你畫的圖，冷冷地說：「這下，四皇的命就在我手上了。」他還是付了錢。',
    miss: '城堡的牆會說話，它們大聲喊有入侵者，你只好退出去。', reward: 500_000, xp: 1_300,
    dc: 18, minLevel: 15, availableFrom: [829, 8], check: { attr: 'AGI', skill: '閃避' },
    samples: ['接下培基的委託', '潛入全蛋糕城堡', '把圖交給培基'],
  },
  wano: {
    title: '兔丼的囚犯', guide: 'kiku', meeting: 'kuri', search: 'udon',
    lead: '菊之丞說，河松大人還被關在兔丼。她請你把起事的暗號送進監獄，讓囚犯們準備好。',
    find: '你混進採石場，把寫著暗號的紙條塞給了河松。他看完，把紙條吞了下去。',
    close: '菊之丞收起刀，輕聲說：「二十年了，終於……」',
    miss: '百獸海賊團的看守盯得太緊，你沒能靠近囚犯。', reward: 500_000, xp: 1_400,
    dc: 18, minLevel: 15, availableFrom: [834, 10], check: { attr: 'AGI', skill: '閃避' },
    samples: ['接下菊之丞的請託', '潛入兔丼', '回報菊之丞'],
  },
  egghead: {
    title: '未來島的實驗', guide: 'vegapunk', meeting: 'labophase', search: 'fabriophase',
    lead: '貝加龐克說，工廠層有一台熾天使的控制裝置被人動過手腳。他請你去找出是誰。',
    find: '你在工廠層找到被改寫的控制裝置，上面留著某個「分身」的權限記號。',
    close: '貝加龐克看著記號沉默了很久，說他早該想到的。他還是把一份研究經費塞給你們。',
    miss: '工廠層的機器人把你當成入侵者趕了出來。', reward: 600_000, xp: 1_500,
    dc: 19, minLevel: 16, availableFrom: [862, 10], check: { attr: 'INT', skill: '觀察' },
    samples: ['接下貝加龐克的委託', '調查工廠層', '回報貝加龐克'],
  },
}

type NewPerson = { place: LocationId | null, role: string, known: string, tier: number, faction: Faction, bounty?: number, logia?: boolean, move: string }
/** The New World's people on the morning of Day 1, how strong they are, and how they fight. */
export const newWorldPeople: Record<string, NewPerson> = {
  // Fishman Island
  shirahoshi: { place: 'ryugu', role: '人魚公主', known: '比任何人都巨大、比任何人都膽小的人魚公主，十年來一直躲在硬殼塔裡，因為有個魚人一直在追她。', tier: 1, faction: 'civilian', move: '海王類的呼喚' },
  neptune: { place: 'ryugu', role: '龍宮王國國王', known: '笑聲「嘛嘛嘛」的魚人國王，說魚人島總有一天要和地上的人類並肩生活，那是乙姬王妃的心願。', tier: 4, faction: 'civilian', move: '人魚三叉戟' },
  fukaboshi: { place: 'ryugu', role: '龍宮王國第一王子', known: '尼普頓國王的長子，溫和卻嚴肅，說魚人街最近有人在暗中集結。', tier: 4, faction: 'civilian', move: '珊瑚長槍' },
  hody: { place: 'fishmanDistrict', role: '新魚人海賊團船長', known: '魚人街的大白鯊魚人，從小就被教著仇恨人類，比任何人都崇拜當年的惡龍。', tier: 4, faction: 'pirate', move: '魚人空手道' },
  shyarly: { place: 'mermaidCafe', role: '人魚咖啡廳的老闆', known: '叼著菸的占卜師，從不輕易說出看見的未來，因為她說出口的預言從沒落空過。', tier: 2, faction: 'civilian', move: '水晶球' },
  // Punk Hazard
  caesar: { place: 'phLab', role: '瘋狂科學家', known: '笑聲「咻嚕嚕嚕」的科學家，說自己是世界第一的天才，研究所裡的孩子們都叫他「凱薩老大」。', tier: 4, faction: 'tyrant', bounty: 300_000_000, logia: true, move: '毒氣' },
  monet: { place: 'phLab', role: '凱薩的祕書', known: '鳥腳的女性，總是溫柔地笑著照顧孩子們，卻從不讓人靠近研究所深處。', tier: 4, faction: 'tyrant', logia: true, move: '雪之爪' },
  vergo: { place: null, role: '海軍中將', known: '臉上總黏著食物的中將，自己從不在意；他說話平淡，出手卻像鋼鐵一樣硬。', tier: 5, faction: 'marine', move: '武裝色・竹棍' },
  // Dressrosa
  trebol: { place: 'drPalace', role: '唐吉訶德家族最高幹部', known: '鼻涕永遠掛著的幹部，說話黏黏糊糊，總在多佛朗明哥耳邊小聲說話。', tier: 5, faction: 'tyrant', move: '黏黏之矛' },
  sugar: { place: 'toyHouse', role: '唐吉訶德家族幹部', known: '看起來像小女孩的幹部，手裡的葡萄從不離手；她碰過的人會變成玩具，所有人都會忘了那個人。', tier: 3, faction: 'tyrant', move: '玩具化' },
  pica: { place: 'drPalace', role: '唐吉訶德家族最高幹部', known: '高大的石頭男，說話聲音尖得出奇，誰笑他就會被石頭埋掉。', tier: 5, faction: 'tyrant', move: '石之巨人' },
  diamante: { place: 'corrida', role: '唐吉訶德家族最高幹部', known: '科羅西姆競技場的英雄，披著飄揚的披風，自稱「天下無敵」。', tier: 5, faction: 'tyrant', move: '飄飄之劍' },
  rebecca: { place: 'corrida', role: '競技場的女鬥士', known: '從不傷人、只把對手推出場外的女鬥士。觀眾討厭她，她卻每天都站在場上，說有人在等她拿下冠軍。', tier: 3, faction: 'civilian', move: '不殺之劍' },
  kyros: { place: 'acacia', role: '獨腳的玩具士兵', known: '只有一隻腳的錫兵玩具，說話一板一眼，暗中守護著一個在競技場戰鬥的女孩。', tier: 5, faction: 'civilian', move: '劍鬥士之劍' },
  viola: { place: 'acacia', role: '舞孃薇歐蕾特', known: '在酒館跳舞的美麗舞孃，眼睛好像能看穿牆壁和人心。', tier: 3, faction: 'civilian', move: '透視之眼' },
  riku: { place: 'greenBit', role: '綠地的老人', known: '被人們叫做「老頭」的落魄老人，和小人族一起住在綠地，說十年前這個國家不是這樣的。', tier: 1, faction: 'civilian', move: '老兵之劍' },
  sabo: { place: null, role: '革命軍參謀總長', known: '戴著禮帽、拿著鐵管的青年，據說是革命軍的二號人物。沒人知道他從哪裡來。', tier: 5, faction: 'civilian', move: '龍爪拳' },
  bartolomeo: { place: null, role: '食人巴托洛米奧', known: '雞冠頭的凶惡海賊，一提到草帽小子就會哭著喊「學長」，能造出誰也打不破的屏障。', tier: 4, faction: 'pirate', bounty: 150_000_000, move: '屏障' },
  cavendish: { place: null, role: '白馬卡文迪許', known: '自戀的美男子海賊，最討厭有人搶走他的風頭，尤其是兩年前那群新人。', tier: 4, faction: 'pirate', bounty: 280_000_000, move: '白馬之劍' },
  fujitora: { place: null, role: '浪人一笑', known: '雙眼失明的浪人，喜歡賭骰子，說自己看不見這世間醜陋的東西反倒輕鬆。', tier: 5, faction: 'marine', move: '重力刀' },
  leo: { place: 'greenBit', role: '小人族戰士隊長', known: '只有手掌大的小人族戰士，非常容易相信別人，說話時總會一邊縫補衣服。', tier: 2, faction: 'civilian', move: '縫縫刺擊' },
  // The Kozuki retainers (time travellers from twenty years ago) and the minks
  kinemon: { place: null, role: '和之國的武士', known: '自稱來自和之國的武士，說是來找失散的兒子，對外國人說話很講禮數。', tier: 4, faction: 'civilian', move: '狐火流' },
  momonosuke: { place: null, role: '和之國的小少主', known: '一個綁著小髮髻的孩子，硬撐著武士的樣子，一被誇就臉紅。', tier: 0, faction: 'civilian', move: '小刀' },
  kanjuro: { place: null, role: '和之國的畫師武士', known: '畫什麼什麼就會動起來的武士，說話像在唱戲。', tier: 3, faction: 'civilian', move: '筆之刃' },
  raizo: { place: 'whaleForest', role: '和之國的忍者', known: '頭很大的忍者，躲在佐烏的鯨之森裡；毛皮族寧可受傷也不肯說出他在哪裡。', tier: 4, faction: 'civilian', move: '捲物忍術' },
  kiku: { place: null, role: '和之國的女武士', known: '溫柔有禮、刀法卻凌厲的武士，總是一個人望著遠方，像在等什麼人。', tier: 4, faction: 'civilian', move: '居合斬' },
  kawamatsu: { place: 'udon', role: '兔丼的囚犯', known: '戴著斗笠的河童武士，被關在兔丼做苦工，卻從不肯吃監獄的爛飯。', tier: 4, faction: 'civilian', move: '河童流' },
  denjiro: { place: 'flowerCapital', role: '花之都的頭目「狂死郎」', known: '將軍黑炭大蛇最信任的保鑣，花之都的賭場和夜街都由他管；沒人見過他真正的笑。', tier: 5, faction: 'tyrant', move: '居合斬' },
  hiyori: { place: 'flowerCapital', role: '花魁小紫', known: '花之都最美的花魁，聽說她冷冷一笑，將軍就會為她做任何事。', tier: 2, faction: 'civilian', move: '三味線' },
  inuarashi: { place: 'mokomo', role: '莫可莫公國的公爵', known: '白天統治佐烏的狗族公爵，說話正經，和夜晚之王貓蝮蛇從不同時出現。', tier: 5, faction: 'civilian', move: '劍之嵐' },
  nekomamushi: { place: 'whaleForest', role: '鯨之森的老大', known: '夜晚統治佐烏的貓族老大，豪爽愛笑，說話「嘎魯嚕嚕」。', tier: 5, faction: 'civilian', move: '貓爪' },
  carrot: { place: 'mokomo', role: '毛皮族的兔族戰士', known: '好奇心旺盛的兔族女孩，一直想跟外面的人一起出海冒險。', tier: 3, faction: 'civilian', move: '電擊' },
  pedro: { place: 'mokomo', role: '毛皮族的豹族戰士', known: '少了一隻眼的豹族戰士，曾經想去尋找傳說中的歷史本文，說話沉穩。', tier: 4, faction: 'civilian', move: '豹爪' },
  wanda: { place: 'mokomo', role: '犬嵐的護衛', known: '狗族的女戰士，對公爵忠心耿耿，說話直來直往。', tier: 3, faction: 'civilian', move: '電擊' },
  // Totto Land
  bigMom: { place: 'wcChateau', role: '四皇・Big Mom 海賊團船長', known: '萬國托特蘭的女王，夢想是讓所有種族坐在同一張餐桌上。發起脾氣來，整個國家都會跟著發抖。', tier: 6, faction: 'pirate', bounty: 4_388_000_000, move: '靈魂之火' },
  katakuri: { place: 'sweetCity', role: 'Big Mom 海賊團甜點三將星', known: '從不在人前張嘴的將星，據說他能看見一點點的未來，從沒躺下過。', tier: 6, faction: 'pirate', bounty: 1_057_000_000, move: '年糕槍' },
  perospero: { place: 'wcChateau', role: 'Big Mom 的長子', known: '舔著糖果棒的長子，說話黏膩，城堡裡大小事都經過他的手。', tier: 5, faction: 'pirate', bounty: 700_000_000, move: '糖果之牆' },
  cracker: { place: 'seducingWoods', role: 'Big Mom 海賊團甜點三將星', known: '穿著餅乾盔甲的將星，一個人就能變出一整支餅乾大軍。', tier: 5, faction: 'pirate', bounty: 860_000_000, move: '餅乾士兵' },
  brulee: { place: 'seducingWoods', role: 'Big Mom 的女兒', known: '尖鼻子的女巫模樣，能在鏡子之間穿梭，最疼她的哥哥。', tier: 3, faction: 'pirate', move: '鏡之世界' },
  pudding: { place: 'sweetCity', role: 'Big Mom 的女兒', known: '有三隻眼睛的少女，開著一家巧克力店，大家都說她溫柔又可愛。', tier: 2, faction: 'pirate', move: '記憶剪輯' },
  bege: { place: null, role: '火拳幫幫主', known: '叼著雪茄的黑幫老大，身體裡藏著一座城堡，從不做沒把握的生意。', tier: 4, faction: 'pirate', bounty: 350_000_000, move: '城堡大砲' },
  // Wano and the Beasts
  kaido: { place: 'onigashima', role: '四皇・百獸海賊團總督', known: '被稱為「這世上最強的生物」，常常喝醉了就想死，卻從來沒有人殺得了他。', tier: 6, faction: 'pirate', bounty: 4_611_100_000, move: '雷鳴八卦' },
  king: { place: 'onigashima', role: '百獸海賊團大看板「火災」', known: '戴著黑面具的大看板，身上帶著火，聽說被打也不會痛。', tier: 5, faction: 'pirate', bounty: 1_390_000_000, move: '火焰' },
  queen: { place: 'onigashima', role: '百獸海賊團大看板「疫災」', known: '愛唱歌跳舞的胖大看板，研究病毒和改造身體，說話又吵又得意。', tier: 5, faction: 'pirate', bounty: 1_320_000_000, move: '病毒拳' },
  jack: { place: 'onigashima', role: '百獸海賊團大看板「旱災」', known: '戴著鐵面具的大看板，從不說多餘的話，只做凱多交代的事。', tier: 5, faction: 'pirate', bounty: 1_000_000_000, move: '象牙衝撞' },
  yamato: { place: 'onigashima', role: '凱多的孩子', known: '自稱光月御田的大和，被凱多用手銬鎖在鬼島上二十年，一直在等能帶他出海的人。', tier: 5, faction: 'pirate', move: '鳴鏑' },
  orochi: { place: 'flowerCapital', role: '和之國將軍', known: '戴著華麗頭冠的將軍，對任何不順他心的人都一句「斬了」。', tier: 3, faction: 'tyrant', move: '八岐之噬' },
  // Egghead
  vegapunk: { place: 'labophase', role: '世界政府的天才科學家', known: '腦袋大得像氣球的科學家，說科學能改變世界，但不知道世界會不會讓它改變。', tier: 1, faction: 'civilian', move: '光束' },
  york: { place: 'fabriophase', role: '貝加龐克的分身「約克」', known: '貝加龐克的六個分身之一，負責「貪欲」，總是一邊吃東西一邊聽人說話。', tier: 2, faction: 'government', move: '光束' },
  sentomaru: { place: 'eggShore', role: '蛋頭島的警備隊長', known: '頂著斧頭的大個子，說自己是世界最強的防禦，誰也別想碰貝加龐克一根頭髮。', tier: 4, faction: 'marine', move: '足柄山之掌' },
  saturn: { place: null, role: '五老星', known: '世界政府的最高權力者之一，從沒在世人面前出手過。', tier: 6, faction: 'government', move: '神之光' },
}

const after = (stops: CastStop[], flag: string): CastStop[] => stops.map(stop => ({ ...stop, unless: [flag] }))
/** Where everyone goes on the calendar after Day 1 (castRoutes). */
export const newWorldRoutes: Partial<Record<NpcId, CastStop[]>> = {
  shirahoshi: [{ at: [806, 12], place: 'fishmanPlaza', facts: '她第一次走出硬殼塔，哭著要大家停手。' }, { at: [806, 20], place: 'ryugu', facts: '她說魚人島和地上，總有一天可以手牽手。' }],
  neptune: [{ at: [806, 8], place: 'fishmanPlaza', facts: '他被新魚人海賊團綁在廣場上，說只要能保住國民，他不在乎自己。' }, { at: [806, 18], place: 'ryugu', facts: '嘛嘛嘛，你們救了這個國家。龍宮城的宴會，想吃什麼就吃什麼！' }],
  fukaboshi: [{ at: [806, 8], place: 'fishmanPlaza', facts: '他要全國的人看清楚：真正的敵人是誰。' }, { at: [806, 18], place: 'ryugu' }],
  hody: [{ at: [806, 8], place: 'fishmanPlaza', facts: '他站在處刑台旁大喊，說要把人類從海底趕出去。' }],
  vergo: [{ at: [809, 8], place: 'phIce', facts: '他說 G-5 基地一切照舊，要大家別多事。' }, { at: [811, 14], place: null, facts: '他在研究所被打倒後，被一群海軍帶走了。' }],
  sabo: [{ at: [814, 8], place: 'corrida', facts: '他戴著面具報名了決賽，說有一樣東西，他無論如何都要替弟弟拿到。' }, { at: [816, 8], place: null, facts: '他帶著哥哥的火焰回到革命軍。' }],
  bartolomeo: [{ at: [813, 10], place: 'corrida', facts: '他一邊抹眼淚一邊說：「學長要來了，學長要來了！」' }, { at: [817, 8], place: null, facts: '他說自己的船隊從此跟著草帽學長。' }],
  cavendish: [{ at: [813, 10], place: 'corrida', facts: '他說今天的觀眾一定只會記住他的名字。' }, { at: [817, 8], place: null, facts: '他嘴上說是自己的意思，卻跟著一起成了草帽大船團。' }],
  fujitora: [{ at: [813, 14], place: 'acacia', facts: '他在街頭擲骰子，說這個國家的笑聲聽起來有點假。' }, { at: [817, 8], place: null, facts: '他說要把向國民下跪這件事，帶回海軍本部。' }],
  rebecca: [{ at: [815, 22], place: 'drPalace', role: '德雷斯羅薩的公主', facts: '她說爸爸回來了，媽媽也終於可以被大家記住了。' }],
  kyros: [{ at: [815, 22], place: 'drPalace', role: '前科羅西姆的傳奇鬥士', facts: '他說自己只是一個父親，終於可以抱女兒了。' }],
  viola: [{ at: [814, 12], place: 'drPalace', role: '德雷斯羅薩的公主薇歐拉', facts: '她用眼睛看著整座城，說哪裡有人需要幫忙。' }],
  riku: [{ at: [815, 22], place: 'drPalace', role: '德雷斯羅薩國王', facts: '他說自己曾經讓國民失望過一次，不會有第二次。' }],
  kinemon: [
    { at: [809, 8], place: 'phFire', facts: '他的身體被切成好幾塊，只剩頭還在大喊找兒子。' }, { at: [812, 8], place: null },
    { at: [813, 8], place: 'acacia', facts: '他說同伴被困在這個國家，一定要把他救出來。' }, { at: [817, 8], place: null },
    { at: [823, 10], place: 'mokomo', role: '赤鞘九人男・錦衛門', facts: '他終於說出了真相：他們要打倒凱多，奪回和之國。' }, { at: [826, 8], place: null },
    { at: [834, 10], place: 'kuri', facts: '二十年的約定，就在下一個火祭之夜。' }, { at: [848, 0], place: 'onigashima' }, { at: [849, 12], place: 'flowerCapital', facts: '和之國的天亮了。' },
  ],
  momonosuke: [
    { at: [809, 8], place: 'phLab', facts: '他在研究所裡變成了一條小龍，嚇得一直哭。' }, { at: [812, 8], place: null },
    { at: [822, 8], place: 'mokomo', role: '光月家的繼承人', facts: '他說自己是光月御田的兒子，一定要回和之國。' }, { at: [826, 8], place: null },
    { at: [834, 10], place: 'kuri' }, { at: [848, 0], place: 'onigashima' },
    { at: [849, 12], place: 'flowerCapital', role: '和之國將軍', facts: '他是新的將軍，說要讓和之國打開國門。' },
  ],
  kanjuro: [
    { at: [813, 8], place: 'acacia' }, { at: [817, 8], place: null }, { at: [823, 10], place: 'mokomo', role: '赤鞘九人男・勘十郎' }, { at: [826, 8], place: null },
    { at: [834, 10], place: 'flowerCapital' }, { at: [848, 0], place: 'onigashima', facts: '他撕下了面具：他一直是黑炭家的人。' }, { at: [849, 6], place: null },
  ],
  raizo: [{ at: [826, 8], place: null }, { at: [834, 10], place: 'kuri', role: '赤鞘九人男・雷藏' }, { at: [848, 0], place: 'onigashima' }, { at: [849, 12], place: 'flowerCapital' }],
  kiku: [{ at: [834, 10], place: 'kuri', role: '赤鞘九人男・菊之丞', facts: '她說等了二十年的那一天，終於要到了。' }, { at: [847, 12], place: 'flowerCapital' }, { at: [848, 0], place: 'onigashima' }, { at: [849, 12], place: 'flowerCapital' }],
  kawamatsu: [{ at: [841, 10], place: 'kuri', role: '赤鞘九人男・河松', facts: '他終於出了兔丼，第一件事是要一碗白飯。' }, { at: [848, 0], place: 'onigashima' }, { at: [849, 12], place: 'flowerCapital' }],
  denjiro: [{ at: [848, 0], place: 'onigashima', role: '赤鞘九人男・傳次郎', facts: '他摘下了狂死郎的臉：二十年的忍耐，就是為了今晚。' }, { at: [849, 12], place: 'flowerCapital' }],
  hiyori: [{ at: [840, 8], place: 'kuri', role: '光月日和', facts: '她不再是花魁小紫，而是光月御田的女兒。' }, { at: [849, 12], place: 'flowerCapital' }],
  inuarashi: [{ at: [826, 8], place: null }, { at: [834, 10], place: 'kuri', role: '赤鞘九人男・犬嵐' }, { at: [848, 0], place: 'onigashima' }, { at: [849, 12], place: 'flowerCapital' }, { at: [856, 8], place: 'mokomo' }],
  nekomamushi: [{ at: [826, 8], place: null }, { at: [834, 10], place: 'kuri', role: '赤鞘九人男・貓蝮蛇' }, { at: [848, 0], place: 'onigashima' }, { at: [849, 12], place: 'flowerCapital' }, { at: [856, 8], place: 'whaleForest' }],
  carrot: [{ at: [826, 8], place: null, facts: '她偷偷躲上了船，跟著出海了。' }, { at: [834, 10], place: 'kuri' }, { at: [848, 0], place: 'onigashima' }, { at: [856, 8], place: 'mokomo', role: '毛皮族的新國王' }],
  pedro: [{ at: [826, 8], place: null }, { at: [829, 8], place: 'seducingWoods', facts: '他說這一次，要讓他們帶回真正的歷史本文。' }, { at: [831, 10], place: null }],
  bigMom: [{ at: [847, 12], place: 'onigashima', facts: '她追著草帽小子來到和之國，嘴裡喊著要吃紅豆丸子。' }],
  katakuri: [{ at: [831, 12], place: 'wcChateau', facts: '他說那小子會成為海賊王也不奇怪。' }],
  bege: [{ at: [829, 8], place: 'seducingWoods', facts: '他躲在誘惑之森裡，說茶會就是最好的時機。' }, { at: [830, 12], place: 'wcChateau', facts: '他坐在茶會的賓客席上，雪茄沒有點。' }, { at: [831, 12], place: null }],
  jack: [{ at: [818, 8], place: null }, { at: [819, 6], place: 'zouFoot', facts: '他在巨象的腳下，要毛皮族交出一個叫雷藏的忍者。' }, { at: [820, 12], place: null }, { at: [840, 8], place: 'onigashima' }],
  yamato: [{ at: [849, 12], place: 'flowerCapital', facts: '他說自己終於可以出海了，只是還得留下來守護這個國家。' }],
  orochi: [{ at: [848, 0], place: 'onigashima', facts: '他在鬼島的宴會上喝酒，說今晚要親眼看著光月家的人消失。' }, { at: [849, 12], place: null }],
  saturn: [{ at: [865, 12], place: 'frontierDome', facts: '他說：「抹去。」' }, { at: [867, 18], place: null }],
}

/** Straw Hats and other old faces after the war: scattered for two years, then together again at Sabaody. */
const strawLine: Partial<Record<NpcId, string>> = {
  zoro: '他被打飛到一座滿是狒狒的島，跟世界第一的劍豪學劍。', nami: '她落在空中的天候科學島，研究天氣。',
  usopp: '他落在一座長滿奇怪植物的島，跟著一位狙擊手師父修行。', sanji: '他落在人妖王國的島上，每天被追著跑。',
  chopper: '他落在鳥人族的島上，研究那裡的醫學。', robin: '她被革命軍接走了。', franky: '他落在貝加龐克的舊研究所，研究失落的科技。',
  brook: '他被當成惡魔崇拜的對象，在長手族的國家成了明星。',
}
export const strawHatAfterWar: Partial<Record<NpcId, CastStop[]>> = Object.fromEntries(Object.entries(strawLine).map(([npc, line]) => [npc, after([
  { at: [59, 12], place: null, facts: line },
  { at: [803, 6], place: 'shakkyBar', facts: '兩年了。約好的日子到了。' },
  { at: [804, 16], place: null },
], 'recruited:' + npc)]))

/** Others who move after the war (appended to their existing calendars). */
export const othersAfterWar: Partial<Record<NpcId, CastStop[]>> = {
  jinbe: [
    { at: [74, 10], place: 'amazonForest', facts: '他守在昏迷的草帽小子身邊，說失去的東西已經回不來了，要看還剩下什麼。' },
    { at: [77, 8], place: null, facts: '他回到海上，說兩年後還會再見。' },
    { at: [805, 12], place: 'seaForest', facts: '他說魚人島和人類之間的事，必須在這一代做個了斷。' },
    { at: [807, 18], place: null }, { at: [830, 8], place: 'wcChateau', facts: '他說要親口向 Big Mom 辭行，再去追隨草帽小子。' },
    { at: [831, 12], place: null }, { at: [848, 0], place: 'onigashima', facts: '他終於趕到了，說從今天起是草帽一夥的舵手。' },
    { at: [849, 12], place: null, role: '草帽一夥的舵手' },
  ],
  law: [
    { at: [810, 8], place: 'phLab', role: '王下七武海', facts: '他說要和草帽小子結成同盟，一起打倒四皇。' }, { at: [812, 8], place: null },
    { at: [813, 8], place: 'acacia' }, { at: [814, 12], place: 'drPalace', facts: '他被海樓石銬在王宮裡，說這是十三年前就該了結的事。' },
    { at: [817, 8], place: null }, { at: [823, 10], place: 'mokomo' }, { at: [826, 8], place: null },
    { at: [834, 10], place: 'kuri' }, { at: [848, 0], place: 'onigashima' }, { at: [856, 8], place: null },
  ],
  kid: [{ at: [834, 10], place: 'udon', facts: '他被關在兔丼做苦工，說出去之後第一個要殺的就是凱多。' }, { at: [841, 10], place: null }, { at: [848, 0], place: 'onigashima' }, { at: [856, 8], place: null }],
  killer: [{ at: [834, 10], place: 'udon', facts: '他變得只會笑，笑得停不下來。' }, { at: [841, 10], place: null }, { at: [848, 0], place: 'onigashima' }, { at: [856, 8], place: null }],
  marco: [{ at: [848, 0], place: 'onigashima', facts: '他說老爹的故鄉，他不能不管。' }, { at: [850, 8], place: null }],
  smoker: [{ at: [810, 12], place: 'phIce', role: 'G-5 海軍中將', facts: '他說這座島上的研究，海軍本部一定有人在掩護。' }, { at: [812, 8], place: null }],
  tashigi: [{ at: [810, 12], place: 'phIce', role: 'G-5 海軍上校', facts: '她說這座島上關著孩子，海軍不能不管。' }, { at: [812, 8], place: null }],
  doflamingo: [{ at: [76, 8], place: 'drPalace', role: '德雷斯羅薩國王・王下七武海', facts: '他坐在王位上笑著說，海軍和海賊的時代都要變了。' }],
  rayleigh: [{ at: [76, 14], place: null, facts: '他陪著草帽小子到無人島修行。' }, { at: [803, 6], place: 'shakkyBar', facts: '那小子已經不用我教了。' }],
  camie: [{ at: [805, 8], place: 'mermaidCafe', facts: '她回到魚人島的咖啡廳，說歡迎大家來玩。' }],
  bonney: [{ at: [862, 10], place: 'eggShore', facts: '她說自己在找一個人，是她的爸爸。' }, { at: [867, 18], place: null }],
  kuma: [{ at: [866, 8], place: 'frontierDome', facts: '他什麼也沒說，只是擋在女兒前面。' }, { at: [867, 18], place: null }],
  kizaru: [{ at: [864, 12], place: 'eggShore', facts: '他說這次的任務，他其實不太想做呢～' }, { at: [867, 18], place: null }],
  lucci: [{ at: [863, 12], place: 'labophase', role: 'CP0 特務', facts: '他奉命來回收貝加龐克。' }, { at: [867, 18], place: null }],
  kaku: [{ at: [863, 12], place: 'labophase', role: 'CP0 特務', facts: '長頸鼻子還在，任務也還在。' }, { at: [867, 18], place: null }],
}

const flagsDefeated = (npc: NpcId) => 'defeated:' + npc
export const newWorldTimeline: CanonEvent[] = [
  { id: 'threeD2Y', at: [76, 12], island: 'marineford', title: '十六聲鐘響',
    text: '草帽小子和冥王雷利、甚平闖進戰後的馬林福特，敲響了十六聲的鐘，向大海默哀。他的手臂上寫著「3D2Y」：三天後的約定，改成兩年後。',
    effect: { facts: { luffy: '兩年。夥伴們，我們兩年後再見。' } },
    changed: [{ by: 'impelDown', text: '草帽小子出現在馬林福特外海，向世界宣告他的夥伴們要先各自變強，兩年後再見。' }] },
  { id: 'newAdmiral', at: [120, 8], island: 'marineford', title: '新元帥誕生',
    text: '赤犬在與青雉的決鬥中勝出，成為海軍元帥；青雉離開了海軍。新的大將藤虎、綠牛被召進了海軍本部，本部也搬到了新世界。',
    effect: { move: { aokiji: null, sengoku: null }, roles: { akainu: '海軍元帥', aokiji: '前海軍大將', sengoku: '前海軍元帥', fujitora: '海軍大將「藤虎」' },
      facts: { akainu: '他坐上了元帥的位子，說海賊一個也別想留。', aokiji: '他離開了海軍，騎著腳踏車不知道去了哪裡。' } } },
  { id: 'reunion', at: reunion, island: 'sabaody', title: '兩年後的重聚',
    text: '兩年過去了。夏波帝諸島上，草帽一夥一個接一個回來；冒牌的草帽一夥被海軍一網打盡，真正的船長笑著跳上了千陽號。',
    effect: { facts: { shakky: '兩年真快啊。大家都長大了。', rayleigh: '去吧，這次輪到你們自己的時代了。' } } },
  { id: 'fishman', at: [806, 15], island: 'fishmanIsland', title: '魚人島決戰',
    text: '新魚人海賊團在中央廣場叛變，霍迪・瓊斯要處決尼普頓國王。草帽一夥站上廣場，打倒了霍迪，擋下了砸向魚人島的巨船諾亞。白星公主說：「魚人島和地上，總有一天會手牽手。」',
    effect: { move: { hody: null }, close: ['fishmanIsland'], facts: { neptune: '這個國家欠草帽小子們一次。', shirahoshi: '我第一次走出塔外，原來外面這麼大。' } },
    changed: [{ defeated: 'hody', text: '霍迪・瓊斯早已被一群旅人打倒，新魚人海賊團群龍無首，叛變還沒開始就結束了。白星公主第一次走出硬殼塔，看見了魚人島的天空。',
      effect: { close: ['fishmanIsland'] } },
      { by: 'fishmanIsland', text: '鯊星王子事先拿到了叛變的計畫，國王的護衛擋下了第一波。草帽一夥隨後打倒了霍迪，擋下了砸向魚人島的巨船諾亞。',
        effect: { move: { hody: null } } }] },
  { id: 'punkHazard', at: [811, 16], island: 'punkHazard', title: '龐克哈薩特的毒氣',
    text: '凱薩・克朗放出了致命的毒氣「死神」。草帽一夥和 G-5 的海軍救出了被關的孩子，打倒了凱薩；特拉法爾加・羅和草帽小子結成了海賊同盟。',
    effect: { move: { caesar: null, monet: null }, close: ['punkHazard'], facts: { tashigi: '孩子們都救出來了。這次，海軍欠海賊一次。' } },
    changed: [{ defeated: 'caesar', text: '凱薩・克朗早已被一群旅人打倒，「死神」毒氣沒能放出來。孩子們被 G-5 的海軍平安救出。', effect: { move: { monet: null }, close: ['punkHazard'] } },
      { by: 'punkHazard', text: '糖果的祕密早已傳開，孩子們不再吃凱薩給的東西。凱薩放出毒氣，卻撲了個空，最後被草帽一夥打倒。', effect: { move: { caesar: null, monet: null } } }] },
  { id: 'drColosseum', at: [814, 14], island: 'dressrosa', title: '科羅西姆的火焰',
    text: '科羅西姆競技場的決賽上，戴著面具的「路西」奪下冠軍，燒燒果實落入了革命軍參謀總長薩波的手中。他繼承了哥哥艾斯的火焰。',
    effect: { facts: { sabo: '艾斯的火焰，由我來守護。' } },
    changed: [{ when: ['saga:dr.rebecca'], text: '科羅西姆競技場的決賽一片混亂，蕾貝卡在一群旅人的保護下沒有受傷；燒燒果實落入了革命軍參謀總長薩波的手中。',
      effect: { facts: { rebecca: '有人保護了我。我終於不是一個人了。', sabo: '艾斯的火焰，由我來守護。' } } }] },
  { id: 'drToys', at: [814, 18], island: 'dressrosa', title: '玩具們恢復原形',
    text: '狙擊手騙人布讓砂糖嚇昏了過去。城裡的玩具一個個變回了人，十年來被遺忘的人們，又被想起來了。',
    effect: { roles: { kyros: '前科羅西姆的傳奇鬥士', sugar: '唐吉訶德家族幹部' }, facts: { kyros: '我想起來了……大家也想起來了。', sugar: '她昏過去之後，再也變不出玩具了。' } },
    changed: [{ when: ['saga:dr.toys'], text: '砂糖在玩具之家被一群旅人搶先嚇昏，玩具們比原作更早變回了人，叛亂提早開始。' },
      { defeated: 'sugar', text: '砂糖早已被一群旅人打倒，玩具們全都變回了人。被遺忘的人們，又被想起來了。' }] },
  { id: 'birdcage', at: [815, 10], island: 'dressrosa', title: '鳥籠',
    text: '多佛朗明哥放下了「鳥籠」：用線織成的巨籠罩住整個國家，一點一點往內收，要把所有人一起切碎。',
    effect: { facts: { riku: '這個國家又要再一次被他毀掉嗎……' } },
    changed: [{ when: ['saga:dr.palace'], text: '多佛朗明哥在王宮被逼得走投無路，倉促放下了「鳥籠」，線卻還沒來得及收緊。' }] },
  { id: 'dressrosa', at: [815, 20], island: 'dressrosa', title: '多佛朗明哥敗北',
    text: '草帽小子用「四檔」打倒了多佛朗明哥，鳥籠消失了。藤虎向國民下跪道歉，唐吉訶德家族被海軍逮捕，前國王力庫重新回到王位。',
    effect: { move: { doflamingo: null, trebol: null, pica: null, diamante: null, sugar: null }, close: ['dressrosa'],
      facts: { riku: '我讓國民失望過一次，不會有第二次了。' } },
    changed: [{ defeated: 'doflamingo', text: '多佛朗明哥早已被一群旅人打倒，鳥籠沒能收緊。藤虎向國民下跪道歉，唐吉訶德家族被海軍逮捕。',
      effect: { move: { trebol: null, pica: null, diamante: null, sugar: null }, close: ['dressrosa'] } },
      { when: ['saga:dr.palace'], text: '一群旅人和草帽一夥一起攻上王宮，多佛朗明哥在鳥籠收緊之前倒下了。藤虎向國民下跪道歉，前國王力庫重新回到王位。',
        effect: { move: { doflamingo: null, trebol: null, pica: null, diamante: null, sugar: null }, close: ['dressrosa'] } }] },
  { id: 'zouJack', at: [819, 12], island: 'zou', title: '傑克襲擊佐烏',
    text: '百獸海賊團的傑克襲擊了佐烏，要毛皮族交出忍者雷藏。毛皮族打了五天五夜，最後被毒氣擊倒，卻沒有一個人說出雷藏在哪裡。',
    effect: { facts: { inuarashi: '我們寧死也不會出賣朋友。', wanda: '公爵大人受了重傷……可是我們守住了。' } },
    changed: [{ defeated: 'jack', text: '傑克早已被一群旅人打倒，他的船隊在巨象的腳下潰散。佐烏逃過了一劫。',
      effect: { facts: { inuarashi: '你們替佐烏擋下了這場災難，毛皮族不會忘記。' } } }] },
  { id: 'zou', at: [824, 8], island: 'zou', title: '佐烏的同盟',
    text: '在佐烏，錦衛門說出了真相：光月家的家臣們要打倒凱多、奪回和之國。草帽一夥、羅和毛皮族結成了同盟。',
    effect: { close: ['zou'], facts: { kinemon: '凱多……二十年前的仇，該清算了。' } } },
  { id: 'wholeCake', at: [830, 15], island: 'wholeCake', title: '破壞茶會',
    text: 'Big Mom 的茶會變成了戰場：草帽一夥、卡彭・培基和甚平聯手，在婚禮上用一張照片讓 Big Mom 失神，趁亂逃出了全蛋糕城堡。',
    effect: { close: ['wholeCake'], facts: { bigMom: '她氣得掀翻了城堡，說要把草帽小子抓回來當甜點。' } },
    changed: [{ by: 'wholeCake', text: '培基拿著一群旅人畫的圖，比原作更順利地讓 Big Mom 失神。草帽一夥趁亂逃出了全蛋糕城堡。' }] },
  { id: 'katakuri', at: [831, 10], island: 'wholeCake', title: '鏡中世界的決鬥',
    text: '草帽小子在鏡中世界和卡塔克利打了一整夜，最後擊倒了從未躺下的將星。千陽號衝出了萬國的包圍。',
    effect: { facts: { katakuri: '你會成為海賊王。這不是預知，是我的感覺。' } },
    changed: [{ defeated: 'katakuri', text: '卡塔克利早已被一群旅人打倒，草帽一夥不必在鏡中世界決鬥，千陽號直接衝出了萬國的包圍。' }] },
  { id: 'reverie', at: [833, 12], island: 'sabaody', title: '世界會議',
    text: '各國國王聚集在聖地瑪力喬亞召開世界會議。會議結束時傳出消息：王下七武海制度被廢除了。',
    effect: { roles: { hancock: '九蛇海賊團船長', law: '海賊同盟的船長', doflamingo: '前王下七武海', mihawk: '世界第一大劍豪' } } },
  { id: 'udon', at: [841, 10], island: 'wano', title: '兔丼監獄失守',
    text: '草帽小子在兔丼打倒了大看板奎因的部下，佔領了監獄。囚犯們扛起石頭，準備在火祭之夜一起起事。',
    effect: { facts: { kawamatsu: '兔丼的弟兄，全都跟你們走！' } },
    changed: [{ when: ['saga:wn.udon'], text: '兔丼早已被一群旅人解放，囚犯們比原作更早拿起了武器。' }] },
  { id: 'wanoRaid', at: [848, 0], island: 'wano', title: '火祭之夜',
    text: '火祭之夜，赤鞘九人男和五位船長攻上了鬼島。百獸海賊團和 Big Mom 海賊團正在開宴會，鬼島上的戰爭開始了。',
    effect: { facts: { kinemon: '二十年了！今晚，我們要讓光月御田的夢想成真！' } },
    changed: [{ when: ['saga:wn.allies'], text: '火祭之夜，一群旅人在九里集結的同伴比原作更多。赤鞘九人男和五位船長帶著大軍攻上了鬼島。' }] },
  { id: 'onigashima', at: [849, 6], island: 'wano', title: '凱多敗北',
    text: '鬼島的屋頂上，草帽小子覺醒了果實的力量，打倒了凱多；基德和羅擊敗了 Big Mom。天亮了，和之國迎來了二十年來第一個沒有凱多的早晨。',
    effect: { move: { kaido: null, bigMom: null, king: null, queen: null, jack: null }, close: ['wano'], facts: { yamato: '他做到了。御田的夢想，有人替他實現了。' } },
    changed: [{ defeated: 'kaido', text: '凱多早已被一群旅人打倒，鬼島上的百獸海賊團群龍無首，提早投降。天亮了，和之國迎來了沒有凱多的早晨。',
      effect: { move: { bigMom: null, king: null, queen: null, jack: null }, close: ['wano'] } },
      { when: ['saga:wn.roof'], text: '一群旅人和五位船長一起攻上鬼島的屋頂，凱多在夾擊下倒下了。天亮了，和之國迎來了二十年來第一個沒有凱多的早晨。',
        effect: { move: { kaido: null, bigMom: null, king: null, queen: null, jack: null }, close: ['wano'] } }] },
  { id: 'wanoDawn', at: [849, 12], island: 'wano', after: 'onigashima', title: '和之國開國',
    text: '光月桃之助成為新的將軍。黑炭大蛇倒下了，和之國決定打開國門。甚平正式成為草帽一夥的舵手，草帽小子成了新的四皇。',
    effect: { move: { orochi: null }, roles: { luffy: '四皇・草帽小子' }, facts: { momonosuke: '我要讓和之國打開國門，讓大家都能去看大海。' } },
    changed: [{ when: ['saga:wn.orochi'], text: '黑炭大蛇在鬼島上被一群旅人找出來，交給了光月家的家臣。光月桃之助成為新的將軍，和之國決定打開國門。',
      effect: { move: { orochi: null }, roles: { luffy: '四皇・草帽小子' } } }] },
  { id: 'egghead', at: [863, 12], island: 'egghead', title: '未來島',
    text: '草帽一夥來到了未來島蛋頭島，見到了天才科學家貝加龐克。他說，自己被世界政府盯上了。',
    effect: { facts: { vegapunk: '科學能讓世界更好。只要世界讓它改變的話。' } } },
  { id: 'eggSiege', at: [865, 12], island: 'egghead', title: '五老星降臨',
    text: '海軍大將黃猿和五老星沙坦聖率領艦隊包圍了蛋頭島，CP0 也混進了研究層。世界政府要抹去貝加龐克，和他知道的一切。',
    effect: { facts: { sentomaru: '誰也別想碰博士一根頭髮！' } } },
  { id: 'eggEscape', at: [867, 18], island: 'egghead', title: '突破包圍',
    text: '貝加龐克向全世界播出了一段訊息；巨人族的戰士趕來接應，草帽一夥衝出了海軍的包圍，航向巨人之國艾爾巴夫。',
    effect: { close: ['egghead'], facts: { vegapunk: '我把該說的話，留給了全世界。' } },
    changed: [{ by: 'egghead', text: '多虧一群旅人找出了動手腳的分身，熾天使沒能在包圍中倒戈。草帽一夥衝出了海軍的包圍，航向艾爾巴夫。' }] },
]

export const newWorldPhases: Record<string, EventPhases> = {
  threeD2Y: { omen: '戰爭結束了，海軍說有人在女兒島附近看見了草帽小子。', warn: '有一艘小船朝戰後的馬林福特駛去。' },
  newAdmiral: { omen: '海軍本部裡傳說，赤犬和青雉都想當下一任元帥。', warn: '聽說兩位大將要用決鬥決定元帥的位子。' },
  reunion: { omen: '夏波帝諸島出現了一群「草帽一夥」，正到處招兵買馬。', warn: '真的草帽一夥成員一個個在夏波帝現身了。', after: '海軍追著冒牌貨跑了一整天，真的草帽一夥早已潛入海底。' },
  fishman: { omen: '魚人街的新魚人海賊團最近在大量招兵。', warn: '中央廣場搭起了處刑台。', after: '廣場上，人類和魚人一起清理著戰場。',
    scene: { foe: 'hody', minutes: 240, intro: '霍迪・瓊斯站在中央廣場的處刑台旁，吃下能量藥的眼睛布滿血絲。趁國王還沒被處決，你們有機會先打倒他。' } },
  punkHazard: { omen: 'G-5 的海軍說，龐克哈薩特的研究所裡藏著不能見光的東西。', warn: '研究所的煙囪冒出了紫色的煙。', after: '毒氣散去了，孩子們抱著 G-5 的海軍哭了出來。',
    scene: { foe: 'caesar', minutes: 180, intro: '凱薩・克朗在研究所裡笑得停不下來，手指正伸向放出毒氣的開關。現在動手，也許來得及。' } },
  drColosseum: { omen: '科羅西姆競技場的大會獎品是燒燒果實，報名的人擠滿了港口。', warn: '決賽的鬥士們進場了。' },
  drToys: { omen: '小人族在城裡奔走，說今天玩具們會想起一切。', warn: '玩具之家附近的守衛突然變多了。', after: '街上到處是相擁而泣的人。' },
  birdcage: { omen: '王宮上空的雲有點奇怪，像是有線垂下來。', warn: '王宮頂端，多佛朗明哥舉起了手。' },
  dressrosa: { omen: '整個國家的人都在看王宮的方向。', warn: '鳥籠的線越收越緊，已經切到了城牆。', after: '國民們看著藤虎下跪，說不出話來。',
    scene: { foe: 'doflamingo', minutes: 300, intro: '多佛朗明哥站在王宮的高台上，笑著看鳥籠一點一點收緊。現在攻上去，還來得及。' } },
  zouJack: { omen: '有人說百獸海賊團的船隊正往佐烏的方向開。', warn: '巨象的腳邊出現了一整支船隊。', after: '莫可莫公國到處是倒下的毛皮族，空氣裡還有毒氣的味道。',
    scene: { foe: 'jack', minutes: 240, intro: '傑克站在巨象的腳下，命令手下往象背上爬。現在動手，佐烏也許不必受這場劫難。' } },
  zou: { omen: '佐烏的毛皮族說，有一群武士在找他們的同伴。', warn: '犬嵐公爵和貓蝮蛇老大都來到了莫可莫公國。' },
  wholeCake: { omen: '萬國的人都在說，Big Mom 的女兒要和一位王子結婚。', warn: '全蛋糕城堡的茶會開始了。', after: '城堡被掀翻了一半，到處是蛋糕的碎片。',
    scene: { foe: 'bigMom', minutes: 180, intro: 'Big Mom 坐在茶會的主位上，正等著婚禮開始。要在婚禮之前和四皇正面交手，你們得有被吃掉的覺悟。' } },
  katakuri: { omen: '萬國的艦隊正在集結，要攔住逃走的千陽號。', warn: '卡塔克利走進了鏡子。',
    scene: { foe: 'katakuri', minutes: 180, intro: '卡塔克利站在甜點之城的街口，看了你們一眼，好像早就知道你們會來。' } },
  reverie: { omen: '各國的國王正搭船前往聖地瑪力喬亞。', warn: '世界會議就要開始了，夏波帝的天龍人比平常多。' },
  udon: { omen: '兔丼的囚犯說，有個戴草帽的新犯人吃了很多飯糰。', warn: '採石場的看守全都被叫了過去。' },
  wanoRaid: { omen: '九里的人都在說，二十年前的預言要應驗了。', warn: '火祭的燈籠點亮了，海上有一整支船隊朝鬼島前進。' },
  onigashima: { omen: '鬼島傳來震天的爆炸聲，戰爭已經打了一整夜。', warn: '鬼島的屋頂上，兩個人影正在對峙。', after: '鬼島安靜了，太陽從海平面升起。',
    scene: { foe: 'kaido', minutes: 240, intro: '凱多站在鬼島的屋頂上，酒壺還在手裡。要在天亮之前打倒「這世上最強的生物」，現在是最後的機會。' } },
  wanoDawn: { omen: '花之都的人都在等鬼島的消息。', warn: '光月家的家臣回到了花之都。' },
  egghead: { omen: '新世界的報紙說，天才科學家貝加龐克被政府盯上了。', warn: '蛋頭島的邊境圓頂打開了。' },
  eggSiege: { omen: '海軍的大艦隊正往蛋頭島集結。', warn: '海平面上，一整排軍艦的砲口轉向了蛋頭島。', after: '研究層的燈一盞一盞地熄滅了。' },
  eggEscape: { omen: '有人說巨人族的戰士正從艾爾巴夫趕來。', warn: '貝加龐克的聲音從所有電話蟲裡傳了出來。' },
}

/** Luffy after the war: two years on a lonely island, then the New World. */
export const luffyAfterWar: RouteStop[] = [
  { at: [74, 10], place: 'amazonForest', unless: 'impelDown' },
  { at: [76, 12], place: 'oris', unless: 'impelDown', facts: '他回到戰後的馬林福特，敲響十六聲鐘，手臂上寫著「3D2Y」。' },
  { at: [76, 14], place: null, facts: '他和冥王雷利在無人島修行，兩年後要和夥伴們在夏波帝重聚。' },
  { at: reunion, place: 'sabaodyGrove', facts: '兩年了，他說夥伴們一定都變得很強。' },
  { at: [804, 16], place: null },
  { at: [805, 10], place: 'fishmanPort' },
  { at: [805, 16], place: 'ryugu' },
  { at: [806, 12], place: 'fishmanPlaza', skip: flagsDefeated('hody'), skipFacts: '聽說霍迪早就被別人打倒了，他在龍宮城吃宴會。' },
  { at: [807, 18], place: null, facts: '他浮上了新世界的海面。' },
  { at: [810, 10], place: 'phFire' },
  { at: [811, 10], place: 'phLab', skip: flagsDefeated('caesar'), skipFacts: '聽說凱薩早就被人打倒了，他帶著羅離開了龐克哈薩特。' },
  { at: [812, 8], place: null, facts: '他和羅結成了海賊同盟，帶著凱薩當人質。' },
  { at: [813, 12], place: 'corrida', facts: '他戴上假鬍子，以「路西」的名字報名了競技場大會。' },
  { at: [815, 8], place: 'drPalace', skip: flagsDefeated('doflamingo'), skipFacts: '聽說多佛朗明哥早已被人打倒，他在城裡跟玩具們一起慶祝。' },
  { at: [815, 22], place: 'acacia' },
  { at: [817, 8], place: null, facts: '七支海賊團自願成了他的「草帽大船團」，他說不要，他們還是跟了。' },
  { at: [823, 10], place: 'mokomo' },
  { at: [824, 12], place: null, facts: '他說要去把香吉士帶回來。' },
  { at: [828, 10], place: 'seducingWoods' },
  { at: [830, 15], place: 'wcChateau' },
  { at: [831, 10], place: 'sweetCity', skip: flagsDefeated('katakuri'), skipFacts: '聽說卡塔克利早被人打倒，他沒在鏡中世界停留，直接衝出了萬國。' },
  { at: [831, 18], place: null, facts: '他在萬國的海上被一整支艦隊追著跑，一邊大笑。' },
  { at: [834, 10], place: 'kuri' },
  { at: [839, 12], place: 'flowerCapital' },
  { at: [841, 8], place: 'udon' },
  { at: [848, 0], place: 'onigashima', skip: flagsDefeated('kaido'), skipFacts: '聽說凱多早已被人打倒，火祭之夜變成了全國的宴會。' },
  { at: [849, 12], place: 'flowerCapital', joins: 'jinbe', facts: '甚平成了他的舵手。他說要去找下一座島。' },
  { at: [856, 8], place: null, facts: '他成了四皇之一，正往下一座島航行。' },
  { at: [862, 10], place: 'eggShore' },
  { at: [863, 12], place: 'labophase' },
  { at: [865, 12], place: 'frontierDome' },
  { at: [867, 18], place: null, facts: '他衝出了海軍的包圍，航向巨人之國艾爾巴夫。' },
]

type Doing = { text: string, where?: string, instead?: { when: string[], text: string, where?: string }[], then?: [string, string][] }
const if_ = (flag: string, text: string, where?: string) => ({ when: [flag], text, where })
export const luffyDoingAfterWar: Record<string, Doing> = {
  '74-10': { text: '在女兒島的森林裡醒來，一直在找艾斯，誰也攔不住。', instead: [if_('war:pullAce', '在女兒島的森林裡醒來，聽說哥哥平安撤走了，鬆了一口氣。')] },
  '76-12': { text: '回到戰後的馬林福特，敲響十六聲鐘，向全世界傳遞夥伴們才看得懂的訊息。' },
  '76-14': { text: '在無人島魯斯卡伊納跟雷利學霸氣，兩年後要和夥伴們重聚。', where: '魯斯卡伊納島（修行中）' },
  '803-8': { text: '回到夏波帝，戴著草帽、披著外套，笑著說要出發去魚人島。' },
  '804-16': { text: '千陽號鍍好了膜，正潛向海底一萬公尺的魚人島。', where: '海底（前往魚人島）' },
  '805-10': { text: '剛到魚人島，就被海流沖散了，一個人在港灣找東西吃。' },
  '805-16': { text: '在龍宮城遇見了巨大的人魚公主白星，答應要保護她。' },
  '806-12': { text: '站在中央廣場上，要打倒霍迪・瓊斯。', then: [['fishman', '打倒了霍迪，正在龍宮城的宴會上大吃大喝。']] },
  '807-18': { text: '浮上了新世界的海面，說第一站要去哪裡都好。', where: '新世界的海上' },
  '810-10': { text: '在龐克哈薩特的燃燒之地探險，撿到了一個武士的頭。' },
  '811-10': { text: '闖進凱薩的研究所，要救那些孩子。', then: [['punkHazard', '打倒了凱薩，正和孩子們一起吃宴會。']] },
  '812-8': { text: '和羅結成了海賊同盟，正航向德雷斯羅薩。', where: '前往德雷斯羅薩的海上' },
  '813-12': { text: '戴著假鬍子，在科羅西姆競技場報名了大會，想拿下哥哥的果實。' },
  '815-8': { text: '攻上王宮，要打倒多佛朗明哥。', then: [['dressrosa', '打倒了多佛朗明哥，在城裡睡了三天三夜。']] },
  '815-22': { text: '在阿卡西亞的屋子裡呼呼大睡，外面是整個國家的感謝。' },
  '817-8': { text: '帶著草帽大船團的盟約出航了，他說不需要部下。', where: '前往佐烏的海上' },
  '823-10': { text: '爬上巨象，在莫可莫公國聽毛皮族說凱多的事。' },
  '824-12': { text: '要去萬國把香吉士帶回來。', where: '前往蛋糕島的海上' },
  '828-10': { text: '在誘惑之森裡迷路，跟自己打了一架。' },
  '830-15': { text: '闖進 Big Mom 的茶會，要帶香吉士回家。', then: [['wholeCake', '在茶會上大鬧一場後逃了出來。']] },
  '831-10': { text: '在鏡中世界跟卡塔克利打了一整夜。', then: [['katakuri', '打倒了卡塔克利，正被萬國的艦隊追著跑。']] },
  '831-18': { text: '在萬國的海上被一整支艦隊追著跑，一邊大笑。', where: '萬國的海上' },
  '834-10': { text: '登上和之國，在九里替一個小女孩出頭。' },
  '839-12': { text: '在花之都打探凱多的消息。' },
  '841-8': { text: '被關進兔丼，跟囚犯們一起扛石頭。', then: [['udon', '佔領了兔丼，帶著囚犯們準備起事。']] },
  '848-0': { text: '攻上鬼島，要打倒凱多。', then: [['onigashima', '打倒了凱多，正在九里睡大覺。']] },
  '849-12': { text: '在花之都參加開國的宴會，說下一站要去更遠的地方。' },
  '856-8': { text: '成了四皇之一，正往下一座島航行。', where: '新世界的海上' },
  '862-10': { text: '登上了未來島蛋頭島，對每一台機器都很好奇。' },
  '863-12': { text: '在研究層見到了貝加龐克，問他能不能做出無限的肉。' },
  '865-12': { text: '在邊境圓頂擋住海軍，要保護研究島上的人。' },
  '867-18': { text: '衝出了包圍，正航向巨人之國艾爾巴夫。', where: '前往艾爾巴夫的海上' },
}

export const newWorldBossDefeats: Partial<Record<NpcId, { text: string, effect: WorldEffect }>> = {
  hody: { text: '霍迪・瓊斯倒下了，新魚人海賊團的叛變在開始前就失去了首領。', effect: { move: { hody: null }, facts: { fukaboshi: '魚人街的那些人，終究不會再跟著他了。' } } },
  caesar: { text: '凱薩・克朗被打倒了，研究所裡的孩子們有救了。', effect: { move: { caesar: null }, facts: { tashigi: '凱薩倒下了，孩子們可以回家了。' } } },
  doflamingo: { text: '唐吉訶德・多佛朗明哥倒下了！德雷斯羅薩十年的謊言開始崩塌。', effect: { move: { doflamingo: null }, facts: { riku: '他倒下了……這個國家終於可以醒過來了。' } } },
  jack: { text: '大看板傑克倒下了，百獸海賊團的船隊在佐烏外海潰散。', effect: { move: { jack: null } } },
  katakuri: { text: '從未躺下的將星卡塔克利倒下了，萬國一片譁然。', effect: { move: { katakuri: null } } },
  bigMom: { text: '四皇 Big Mom 被打倒了！萬國托特蘭的天空一片混亂。', effect: { move: { bigMom: null } } },
  kaido: { text: '「這世上最強的生物」凱多倒下了！和之國的人們不敢相信二十年的統治就這樣結束。', effect: { move: { kaido: null }, facts: { kinemon: '凱多……倒下了？二十年的仇，終於……' } } },
  orochi: { text: '將軍黑炭大蛇被打倒了，花之都的人們第一次敢抬頭看城。', effect: { move: { orochi: null } } },
}

/** Story arcs with goals, like Water 7 (water7.ts). */
const did = (...goals: string[]) => goals.map(goal => 'saga:' + goal)
export const dressrosaGoals: SagaGoal[] = [
  { id: 'dr.tontatta', title: '護送綠地的小人族', place: 'greenBit', from: [813, 12], until: [814, 16],
    check: { attr: 'AGI', skill: '閃避', dc: 16 }, allies: ['leo', 'usopp', 'robin'], rep: ['dressrosa', 15],
    done: '你帶著小人族的戰士們穿過守衛的眼線，一個也沒被抓到。', miss: '唐吉訶德家族的巡邏太密，你們只好先躲回綠地。' },
  { id: 'dr.rebecca', title: '保護競技場的蕾貝卡', place: 'corrida', from: [813, 12], until: [814, 14],
    check: { attr: 'STR', skill: '格鬥', dc: 18 }, minLevel: 14, allies: ['kyros', 'bartolomeo', 'cavendish'],
    done: '決賽一片混亂，你擋下了衝向蕾貝卡的每一把刀。她第一次在競技場上沒有受傷。', miss: '鬥士們太多了，你被擠出了擂台。' },
  { id: 'dr.toys', title: '搶先嚇昏砂糖', place: 'toyHouse', from: [813, 12], until: [814, 18],
    check: { attr: 'PER', skill: '觀察', dc: 18 }, minLevel: 14, helpedBy: ['task:dressrosa', ...did('dr.tontatta')], allies: ['usopp', 'leo', 'robin'],
    done: '你把一顆辣到不行的東西塞進了砂糖手上的葡萄裡。她尖叫一聲，昏了過去。', miss: '砂糖身邊的守衛發現了你，你只能先撤退。' },
  { id: 'dr.palace', title: '攻上王宮的高台', place: 'drPalace', from: [814, 18], until: [815, 18],
    check: { attr: 'STR', skill: '格鬥', dc: 20 }, minLevel: 16, helpedBy: [...did('dr.toys'), 'defeated:trebol', 'defeated:pica', 'defeated:diamante'],
    allies: ['luffy', 'law', 'zoro', 'kyros', 'sabo'],
    done: '你和草帽一夥一路殺上王宮的高台，多佛朗明哥第一次收起了笑容。', miss: '石頭巨人擋住了階梯，你被打了下來。' },
  { id: 'dr.birdcage', title: '撐住鳥籠下的居民', place: 'acacia', from: [815, 10], until: [815, 20],
    check: { attr: 'WIL', skill: '說服', dc: 17 }, allies: ['rebecca', 'viola', 'riku', 'fujitora'], rep: ['dressrosa', 20],
    done: '你帶著居民往鳥籠的中心退，一路上沒有人被線碰到。', miss: '人群慌成一團，你只帶走了一小部分人。' },
]
export const dressrosaStages: string[] = ['drColosseum', 'drToys', 'birdcage', 'dressrosa']

export const wanoGoals: SagaGoal[] = [
  { id: 'wn.allies', title: '在九里集結同伴', place: 'kuri', from: [834, 10], until: [847, 22],
    check: { attr: 'WIL', skill: '說服', dc: 17 }, helpedBy: ['task:wano'], allies: ['kinemon', 'kiku', 'raizo', 'kawamatsu', 'inuarashi', 'nekomamushi'], rep: ['wano', 20],
    done: '你走遍九里的村子，說服了一個又一個不敢抬頭的人。火祭之夜，他們都會來。', miss: '村民說二十年前也有人這麼說過，最後什麼都沒變。' },
  { id: 'wn.udon', title: '攻佔兔丼監獄', place: 'udon', from: [840, 8], until: [841, 10],
    check: { attr: 'STR', skill: '格鬥', dc: 19 }, minLevel: 16, allies: ['luffy', 'kawamatsu', 'kid', 'killer'],
    done: '你打倒了採石場的看守，囚犯們扛起石頭，跟著你一起喊了出來。', miss: '百獸海賊團的 Gifters 太多，你被逼回了礦坑。' },
  { id: 'wn.capital', title: '保護花之都的居民', place: 'flowerCapital', from: [847, 12], until: [848, 0],
    check: { attr: 'WIL', skill: '說服', dc: 16 }, allies: ['hiyori', 'denjiro', 'kiku'], rep: ['wano', 20],
    done: '你把花之都的居民帶到了安全的地方，今晚不會有人被牽連。', miss: '居民不相信外國人，你只勸動了幾戶人家。' },
  { id: 'wn.orochi', title: '找出躲起來的黑炭大蛇', place: 'onigashima', from: [848, 0], until: [849, 6],
    check: { attr: 'PER', skill: '觀察', dc: 18 }, minLevel: 15, allies: ['denjiro', 'kiku', 'hiyori'],
    done: '你在鬼島的倉庫裡找到了躲在箱子後面的大蛇，把他交給了光月家的家臣。', miss: '鬼島太大了，大蛇像蛇一樣不見了蹤影。' },
  { id: 'wn.roof', title: '攻上鬼島的屋頂', place: 'onigashima', from: [848, 0], until: [849, 6],
    check: { attr: 'STR', skill: '格鬥', dc: 21 }, minLevel: 18, helpedBy: [...did('wn.udon', 'wn.allies'), 'defeated:king', 'defeated:queen', 'defeated:jack'],
    allies: ['luffy', 'law', 'kid', 'zoro', 'yamato', 'marco'],
    done: '你和五位船長一起站上了鬼島的屋頂，凱多的酒壺第一次掉在地上。', miss: '凱多的雷鳴八卦把你從屋頂打了下去。' },
]
export const wanoStages: string[] = ['udon', 'wanoRaid', 'onigashima', 'wanoDawn']

export const newWorldSagas: Saga[] = [
  { id: 'dressrosa', title: '德雷斯羅薩', islands: ['dressrosa'], from: [813, 8], until: [817, 8], goals: dressrosaGoals, stages: dressrosaStages },
  { id: 'wano', title: '和之國', islands: ['wano'], from: [834, 10], until: [856, 8], goals: wanoGoals, stages: wanoStages },
]

/** The crews of the New World (crews.ts): who fights beside whom. */
export const newWorldCrews = {
  newFishman: { name: '新魚人海賊團', captain: 'hody' as NpcId, faction: 'pirate' as Faction, members: [] as { npc: NpcId }[],
    grunts: { name: '新魚人海賊團的團員', tier: 3, count: 2, home: ['fishmanDistrict', 'fishmanPlaza'] as LocationId[] } },
  caesar: { name: '凱薩的研究所', captain: 'caesar' as NpcId, faction: 'tyrant' as Faction, members: [{ npc: 'monet' as NpcId }],
    grunts: { name: '凱薩的部下', tier: 3, count: 2, home: ['phLab', 'phFire'] as LocationId[] } },
  donquixote: { name: '唐吉訶德家族', captain: 'doflamingo' as NpcId, faction: 'tyrant' as Faction,
    members: [{ npc: 'trebol' as NpcId }, { npc: 'pica' as NpcId }, { npc: 'diamante' as NpcId }, { npc: 'sugar' as NpcId }, { npc: 'vergo' as NpcId }],
    grunts: { name: '唐吉訶德家族的部下', tier: 3, count: 2, home: ['drPalace', 'toyHouse'] as LocationId[] } },
  bigMom: { name: 'Big Mom 海賊團', captain: 'bigMom' as NpcId, faction: 'pirate' as Faction,
    members: [{ npc: 'katakuri' as NpcId }, { npc: 'perospero' as NpcId }, { npc: 'cracker' as NpcId }, { npc: 'brulee' as NpcId }, { npc: 'pudding' as NpcId }],
    grunts: { name: '萬國的棋子士兵', tier: 3, count: 2, home: ['wcChateau', 'sweetCity', 'seducingWoods'] as LocationId[] } },
  beasts: { name: '百獸海賊團', captain: 'kaido' as NpcId, faction: 'pirate' as Faction,
    members: [{ npc: 'king' as NpcId }, { npc: 'queen' as NpcId }, { npc: 'jack' as NpcId }],
    grunts: { name: '百獸海賊團的 Gifters', tier: 4, count: 2, home: ['onigashima', 'udon'] as LocationId[] } },
  orochi: { name: '黑炭大蛇的手下', captain: 'orochi' as NpcId, faction: 'tyrant' as Faction, members: [] as { npc: NpcId }[],
    grunts: { name: '大蛇的見迴組', tier: 3, count: 2, home: ['flowerCapital'] as LocationId[] } },
}

/** One guild merchant on every new island, with what the island is known for (traders.ts, market.ts). */
export const newWorldTraders = {
  traderFishman: { island: 'fishmanIsland' as IslandId, place: 'fishmanPort' as LocationId, role: '潮行商會的行商', known: '把貨裝在泡泡裡運下海底的商人，說魚人島的東西運上去都比黃金還貴。' },
  traderPunk: { island: 'punkHazard' as IslandId, place: 'phShore' as LocationId, role: '潮行商會的行商', known: '裹著防毒面具做生意的商人，說這座島左邊熱死人、右邊冷死人，賣藥最好賺。' },
  traderDressrosa: { island: 'dressrosa' as IslandId, place: 'drPort' as LocationId, role: '潮行商會的行商', known: '跳著舞叫賣的女商人，說這個國家什麼都好，就是玩具多得有點怪。' },
  traderZou: { island: 'zou' as IslandId, place: 'zouFoot' as LocationId, role: '潮行商會的行商', known: '在象腳邊等了三天才爬上來的商人，說毛皮族的草藥是新世界最好的。' },
  traderCake: { island: 'wholeCake' as IslandId, place: 'wcPort' as LocationId, role: '潮行商會的行商', known: '說話很小聲的女商人，提醒客人千萬別在這裡說「不想吃甜點」。' },
  traderWano: { island: 'wano' as IslandId, place: 'kuriBeach' as LocationId, role: '偷偷做生意的商人', known: '在鎖國的和之國偷偷做買賣的商人，說這裡的刀匠打出來的刀，外面再貴也買不到。' },
  traderEgghead: { island: 'egghead' as IslandId, place: 'eggShore' as LocationId, role: '潮行商會的行商', known: '跟研究所做生意的女商人，說這裡的東西都是試作品，壞了別找她。' },
}

/** Chart positions: the New World lies beyond the Red Line; Fishman Island sits right under it. */
export const newWorldChart: Record<NewIsland, { at: [number, number], biome: 'green' | 'town' | 'desert' | 'snow' | 'jungle' | 'stone' | 'dark' | 'cloud' | 'sea' }> = {
  fishmanIsland: { at: [1530, 790], biome: 'sea' },
  punkHazard: { at: [1700, 610], biome: 'stone' },
  dressrosa: { at: [1850, 770], biome: 'town' },
  zou: { at: [2010, 600], biome: 'jungle' },
  wholeCake: { at: [2170, 770], biome: 'town' },
  wano: { at: [2340, 610], biome: 'green' },
  egghead: { at: [2510, 760], biome: 'town' },
}

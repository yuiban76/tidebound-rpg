// The popular canon characters beyond the first fifty-odd: where each one stands on the morning of Day 1,
// and where the canon calendar takes them afterwards. Positions follow the same days as luffyRoute and
// canonTimeline (Day 1 = the morning Luffy leaves Dawn Island). Every stop is a present state, not a script:
// the players can meet, fight or recruit anyone, and a recruited companion is never moved by this calendar.
import type { LocationId } from '../shared/protocol.ts'
import type { castNpcs } from '../shared/atlas.ts'
import type { Faction } from './foes.ts'

export type CastId = keyof typeof castNpcs
export type CastPerson = { place: LocationId | null, role: string, known: string }
export type CastProfile = { tier: number, faction: Faction, bounty?: number, logia?: boolean }
/** From [day, hour] on, the character is at `place` (null: away at sea) and knows `facts`. Stops are sorted by time. */
export type CastStop = { at: [number, number], place: LocationId | null, facts?: string }

export const castPeople: Record<CastId, CastPerson> = {
  // East Blue
  dadan: { place: 'hill', role: '科爾波山的山賊頭目', known: '嘴巴很凶的女頭目，嘴上說討厭小鬼，卻把山裡的野孩子都養大了。她說魯夫那小子今早真的出海了，活該被海浪打濕。' },
  koby: { place: null, role: '想當海軍的少年', known: '他在海賊船上當了兩年雜工，唯一的心願是成為海軍。' },
  nami: { place: null, role: '航海士、專偷海賊的小偷', known: '她只偷海賊的財寶，常說自己最討厭海賊；那張自己畫的海圖，她從不輕易給人看。' },
  buggy: { place: 'orangeStreet', role: '小丑巴其海賊團船長', known: '他的海賊團占了橘子鎮，說這裡的一切都是他的；誰碰他的寶藏海圖，他就拿大砲轟過去。' },
  tashigi: { place: 'logueSquare', role: '海軍曹長', known: '眼鏡一掉就會被絆倒的女劍士，見到名刀會忍不住多看兩眼，非常討厭海賊。' },
  gin: { place: null, role: '克利克海賊團的副手', known: '他的艦隊在偉大航路被打垮，只剩一艘破船漂回東海，整個人餓得走不動。' },
  krieg: { place: null, role: '首領・克利克海賊團船長', known: '據說這個靠兵器橫行海上的男人，在偉大航路慘敗後只帶著一艘破船逃回了東海。' },
  mihawk: { place: null, role: '王下七武海・世界第一大劍豪', known: '他乘著一艘小黑船在海上閒晃，自稱只是在找值得拔劍的對手。' },
  dragon: { place: null, role: '革命軍總司令', known: '世界政府最想抓到的男人。沒有人知道他長什麼樣子，只知道他的組織正在暗中集結。' },
  // Grand Line, first half
  galdino: { place: null, role: 'Mr.3・蠟果實的暗殺者', known: '自稱藝術家的賞金獵人，其實是巴洛克工作社的暗殺者，總愛把人封進蠟裡當作品。' },
  wapol: { place: null, role: '磁鼓島的前國王', known: '當年丟下國民逃走的國王。聽說他正帶著手下在海上漂流，想把王位搶回來。' },
  bonclay: { place: null, role: 'Mr.2・芭蕾舞者', known: '巴洛克工作社的二號人物，笑容比蝴蝶還誇張，總是邊旋轉邊說「不用在意，朋友」。' },
  // Water 7 and the Judicial Island
  kokoro: { place: 'water7Port', role: '海列車的列車長', known: '她說海列車是七水之都的命脈，只要付一點車票錢，就能去水上各處。' },
  paulie: { place: 'galleyLa', role: '卡雷拉公司的職工', known: '一邊擦汗一邊把木材搬上船的壯漢，說公司最近人心惶惶，大家都在互相猜疑。' },
  kaku: { place: 'galleyLa', role: '卡雷拉公司的造船工匠', known: '手藝好到工頭都挑不出錯的木匠，開玩笑時語尾拖得特別長，卻不願多談自己的來歷。' },
  kalifa: { place: 'galleyLa', role: '冰山市長的祕書', known: '戴眼鏡的優雅秘書，替市長整理文件從不出錯；有人說她的笑容完美得不像真的。' },
  blueno: { place: 'water7Port', role: '酒吧老闆', known: '沉默寡言的酒吧老闆，凶光壓都壓不住，對客人的來歷從不多問。' },
  // Thriller Bark and Sabaody
  perona: { place: null, role: '鬼魂公主', known: '總是「Horo horo」地笑，最受不了無聊的人；她喜歡可愛的東西，也喜歡把人嚇出眼淚。' },
  law: { place: null, role: '「死亡外科醫生」', known: '年輕的海賊船長，總把長刀扛在肩上，說話像在診斷病人；他說只要有必要，什麼都能切開重組。' },
  kid: { place: null, role: '海賊團船長', known: '他的磁鐵能力能把整艘船的鐵器都吸過去，脾氣比能力更不穩定。' },
  killer: { place: null, role: '殺戮武人', known: '戴著面具、揮舞雙刃的男人，是基德海賊團的副手，很少說話。' },
  drake: { place: null, role: '海賊團船長', known: '原本是海軍少將，現在成了海賊船長，沒有人知道他為什麼要放棄那身制服。' },
  hawkins: { place: null, role: '「魔術師」', known: '總是低聲念著占卜結果的海賊，據說他的稻草身體能把傷害轉到別人身上。' },
  bonney: { place: null, role: '大胃王海賊', known: '嘴裡永遠塞滿肉的賞金海賊，據說只要伸手碰到人，就能讓對方變老或變小。' },
  kuma: { place: null, role: '王下七武海', known: '一個總是在看書、說話毫無起伏的七武海，手掌一拍就能把人彈到千里之外。' },
  // Impel Down and the Summit War
  jinbe: { place: null, role: '王下七武海・魚人空手道師範', known: '重情義的魚人，雖然是七武海，卻討厭海軍的作法。' },
  shanks: { place: null, role: '紅髮海賊團船長・四皇', known: '據說他很久以前常在風車村的酒吧喝酒，如今已是四皇之一，海上的人提到他都會壓低聲音。' },
  teach: { place: null, role: '白鬍子海賊團的叛徒', known: '他殺了同伴、偷走了暗暗果實，正乘船逃亡；火拳艾斯正在追捕他。' },
  doflamingo: { place: null, role: '王下七武海', known: '穿著粉紅羽毛大衣的七武海，笑著說話，聽說在暗處經營著龐大的地下生意。' },
  garp: { place: 'hqFortress', role: '海軍中將・海軍英雄', known: '總是邊啃仙貝邊喊著要把海賊全抓起來的老中將。據說他有個和海賊王一樣愛闖禍的孫子。' },
  akainu: { place: 'hqFortress', role: '海軍大將「赤犬」', known: '信奉「徹底的正義」，認為放走海賊就等於縱容惡行，連同伴的猶豫也容不下。' },
  aokiji: { place: 'hqFortress', role: '海軍大將「青雉」', known: '總把眼罩推到額頭上打盹，自稱信奉「悠閒的正義」，卻能把整片海面凍成冰。' },
  kizaru: { place: 'hqFortress', role: '海軍大將「黃猿」', known: '說話拖長尾音，像在閒聊天氣，出手卻快得像一道光。' },
  marco: { place: null, role: '白鬍子海賊團第一隊隊長', known: '被稱為「不死鳥」的男人，一副沒睡醒的樣子，卻是白鬍子最信賴的副手。' },
  jozu: { place: null, role: '白鬍子海賊團第三隊隊長', known: '身體能變成鑽石的壯漢，說話沉穩，是白鬍子海賊團中最可靠的盾牌。' },
  vista: { place: null, role: '白鬍子海賊團第五隊隊長', known: '雙手各持一把長劍的劍士，留著整齊的八字鬍，愛打理自己的花。' },
}

// [tier, faction] follow the canon tiers in foes.ts: 0 civilian … 6 legend.
export const castProfiles: Record<CastId, CastProfile> = {
  dadan: { tier: 2, faction: 'bandit' }, koby: { tier: 1, faction: 'civilian' }, nami: { tier: 1, faction: 'civilian' },
  buggy: { tier: 3, faction: 'pirate', bounty: 15_000_000 }, tashigi: { tier: 3, faction: 'marine' },
  gin: { tier: 3, faction: 'pirate', bounty: 7_000_000 }, krieg: { tier: 4, faction: 'pirate', bounty: 17_000_000 },
  mihawk: { tier: 6, faction: 'tyrant' }, dragon: { tier: 6, faction: 'pirate' },
  galdino: { tier: 3, faction: 'pirate', bounty: 24_000_000 }, wapol: { tier: 3, faction: 'tyrant' },
  bonclay: { tier: 4, faction: 'pirate', bounty: 32_000_000 },
  kokoro: { tier: 1, faction: 'civilian' }, paulie: { tier: 2, faction: 'civilian' },
  kaku: { tier: 4, faction: 'government' }, kalifa: { tier: 3, faction: 'government' }, blueno: { tier: 4, faction: 'government' },
  perona: { tier: 3, faction: 'pirate' },
  law: { tier: 5, faction: 'pirate', bounty: 200_000_000 }, kid: { tier: 5, faction: 'pirate', bounty: 315_000_000 },
  killer: { tier: 4, faction: 'pirate', bounty: 162_000_000 }, drake: { tier: 5, faction: 'pirate', bounty: 222_000_000 },
  hawkins: { tier: 4, faction: 'pirate', bounty: 140_000_000 }, bonney: { tier: 4, faction: 'pirate', bounty: 140_000_000 },
  kuma: { tier: 6, faction: 'tyrant' },
  shanks: { tier: 6, faction: 'pirate', bounty: 1_000_000_000 },
  jinbe: { tier: 5, faction: 'pirate' }, teach: { tier: 5, faction: 'pirate', logia: true }, doflamingo: { tier: 5, faction: 'tyrant', bounty: 340_000_000 },
  garp: { tier: 6, faction: 'marine' },
  akainu: { tier: 5, faction: 'marine', logia: true }, aokiji: { tier: 5, faction: 'marine', logia: true }, kizaru: { tier: 5, faction: 'marine', logia: true },
  marco: { tier: 5, faction: 'pirate' }, jozu: { tier: 5, faction: 'pirate' }, vista: { tier: 5, faction: 'pirate' },
}

const war = (hour: number, place: LocationId, facts: string): CastStop[] =>
  [{ at: [72, hour], place, facts }, { at: [72, 21], place: null }]

/** Where each character goes after Day 1. Only people who actually move have an entry. */
export const castRoutes: Partial<Record<CastId, CastStop[]>> = {
  koby: [
    { at: [2, 6], place: 'shellsTown', facts: '他抖著腿站在鎮上，卻說自己一定要成為海軍。' },
    { at: [2, 13], place: 'marineBase', facts: '他剛加入海軍，從打雜的見習生做起，說有朝一日要追上自己心中的英雄。' },
    ...war(10, 'marinefordBay', '他被調來馬林福特，親眼看著這場戰爭。'),
  ],
  nami: [
    { at: [3, 6], place: 'orangeStreet', facts: '她在橘子鎮偷走了巴其海賊團的海圖，正想辦法脫身，嘴上說只想要錢。' },
    { at: [3, 18], place: null, facts: '暫時和一個戴草帽的少年同路，她說這只是合作關係。' },
    { at: [7, 8], place: 'arlongPark', facts: '她替惡龍畫著海圖，臉上的笑容一點也不真心。' },
    { at: [8, 17], place: null, facts: '惡龍樂園倒下後，她成了草帽一夥的航海士。' },
  ],
  buggy: [
    { at: [3, 16], place: null, facts: '被趕出橘子鎮後乘著小船逃走，嘴裡仍在揚言報仇。' },
    { at: [9, 12], place: 'logueSquare', facts: '他把一個戴草帽的少年綁上處刑台，打算親手處刑。' },
    { at: [9, 20], place: null, facts: '處刑失敗後，他灰頭土臉地逃走了。' },
  ],
  tashigi: [
    { at: [9, 19], place: null, facts: '她跟著上校追向偉大航路。' },
    ...war(10, 'marinefordBay', '她被調來馬林福特，加入對白鬍子的戰線。'),
  ],
  gin: [
    { at: [5, 10], place: 'baratiePort', facts: '他餓得走不動，跪在海上餐廳門口求一口飯吃。' },
    { at: [6, 15], place: null, facts: '離開了巴拉蒂，沒有人知道他往哪裡去。' },
  ],
  krieg: [
    { at: [5, 12], place: 'baratiePort', facts: '他的破船停在餐廳旁，他打算搶走這裡的船重整旗鼓。' },
    { at: [6, 15], place: null, facts: '被擊退後下落不明。' },
  ],
  mihawk: [
    { at: [6, 13], place: 'baratiePort', facts: '他為了找一個劍士而來，順手一刀劈開了克利克的船。' },
    { at: [6, 20], place: null, facts: '看過想看的劍士後，他又乘著小黑船離開了。' },
    ...war(11, 'marinefordBay', '身為七武海，他被召來頂上戰場。'),
  ],
  dragon: [
    { at: [9, 17], place: 'logueSquare', facts: '他在暴風雨中現身羅格鎮，沒有人看清他的臉。' },
    { at: [9, 21], place: null, facts: '雷聲過後，他像從來沒有出現過一樣消失了。' },
  ],
  galdino: [
    { at: [13, 6], place: 'waxHouse', facts: '他把小花園的蠟燭屋當成據點，專門埋伏路過的海賊。' },
    { at: [14, 16], place: null, facts: '陷阱被識破後，他不知逃到了哪裡。' },
  ],
  wapol: [
    { at: [17, 6], place: 'bighorn', facts: '他帶著手下回到磁鼓島，要把城堡奪回去。' },
    { at: [18, 12], place: null, facts: '被趕出磁鼓島後，他下落不明。' },
  ],
  bonclay: [
    { at: [21, 12], place: 'nanohana', facts: '他在阿拉巴斯坦的港口露面，替巴洛克工作社辦事。' },
    { at: [25, 18], place: null, facts: '任務結束後，他不告而別地消失了。' },
    { at: [64, 6], place: 'impelLevel5', facts: '他在推進城裡替落難者打氣，說只要夠熱情，監獄也能變成舞台。' },
    ...war(12, 'marinefordBay', '他和朋友們一起趕到頂上戰爭。'),
  ],
  kaku: [
    { at: [46, 12], place: 'justiceTower', facts: '他撤回了司法塔，不再裝成木匠。' },
    { at: [48, 16], place: null, facts: '司法島陷落後，他不知逃去了哪裡。' },
  ],
  kalifa: [
    { at: [46, 12], place: 'justiceTower', facts: '她已經摘下秘書的面具，回到司法塔。' },
    { at: [48, 16], place: null, facts: '司法島陷落後，她下落不明。' },
  ],
  blueno: [
    { at: [46, 12], place: 'justiceTower', facts: '他關了酒吧，一語不發地回到司法塔。' },
    { at: [48, 16], place: null, facts: '司法島陷落後，他下落不明。' },
  ],
  perona: [
    { at: [55, 12], place: 'graveyard', facts: '她負責在墓園放鬼魂，替摩利亞看守這座船。' },
    { at: [56, 12], place: null, facts: '摩利亞倒下後，她揪著腳邊的玩偶逃走了。' },
  ],
  law: [
    { at: [57, 8], place: 'sabaodyGrove', facts: '他在夏波帝的樹下靜靜觀察，不插手眼前的騷動。' },
    { at: [60, 6], place: null, facts: '他離開了群島。' },
    ...war(10, 'marinefordBay', '他站在戰場邊緣，平靜地觀察這場戰爭。'),
  ],
  kid: [
    { at: [57, 6], place: 'sabaodyGrove', facts: '他在夏波帝找人晦氣，周圍的人都躲著走。' },
    { at: [60, 6], place: null, facts: '他離開了夏波帝。' },
  ],
  killer: [
    { at: [57, 6], place: 'sabaodyGrove', facts: '他默默跟在船長身後，一句話也不多說。' },
    { at: [60, 6], place: null, facts: '他離開了夏波帝。' },
  ],
  drake: [
    { at: [57, 7], place: 'sabaodyGrove', facts: '他站在遠處觀察每個海賊，似乎在評估誰值得提防。' },
    { at: [60, 6], place: null, facts: '他離開了夏波帝。' },
  ],
  hawkins: [
    { at: [57, 7], place: 'sabaodyGrove', facts: '他把算出的結果寫在紙上，低聲說今天不宜多事。' },
    { at: [60, 6], place: null, facts: '他離開了夏波帝。' },
  ],
  bonney: [
    { at: [57, 8], place: 'sabaodyGrove', facts: '她邊吃烤肉邊逛街，賭錢賭到輸光了就轉去找下一桌。' },
    { at: [60, 6], place: null, facts: '她離開了夏波帝。' },
  ],
  kuma: [
    { at: [56, 14], place: 'thrillerDock', facts: '他悄悄出現在船邊，像是奉命來看守什麼。' },
    { at: [57, 4], place: null },
    { at: [58, 6], place: 'sabaodyGrove', facts: '他站在群島的樹下，手掌一揮，就能把人拍到千里之外。' },
    { at: [60, 6], place: null },
    ...war(12, 'marinefordBay', '身為七武海，他被召來頂上戰場。'),
  ],
  jinbe: [
    { at: [61, 12], place: 'impelLevel6', facts: '他拒絕對白鬍子出兵，被關進推進城的最底層。' },
    { at: [70, 6], place: null, facts: '他逃出了推進城。' },
    ...war(12, 'marinefordBay', '他趕到頂上戰場，站在艾斯與魯夫身旁。'),
  ],
  teach: [
    { at: [52, 8], place: 'impelGate', facts: '他把艾斯交給海軍，換取七武海的位子。' },
    { at: [52, 20], place: null, facts: '離開了推進城，沒有人知道他的下一步。' },
    ...war(12, 'marinefordBay', '他成了七武海，在戰場上與白鬍子正面對決。'),
  ],
  shanks: [
    { at: [72, 19], place: 'marinefordBay', facts: '他在戰爭的最後一刻現身，一句話就讓雙方停了手。' },
    { at: [73, 6], place: null },
  ],
  doflamingo: war(12, 'marinefordBay', '身為七武海，他被召來頂上戰場，一直笑著。'),
  garp: war(12, 'scaffold', '他守在處刑台前，拳頭一直沒放下。'),
  akainu: war(12, 'scaffold', '他站在處刑台前，每一拳都像岩漿。'),
  aokiji: war(12, 'marinefordBay', '他在海灣一側，把海面凍成冰面。'),
  kizaru: [
    { at: [58, 17], place: 'sabaodyGrove', facts: '他奉命前來鎮壓夏波帝的騷動，說話還是那麼慢。' },
    { at: [60, 6], place: 'hqFortress', facts: '他回到海軍本部待命。' },
    ...war(12, 'marinefordBay', '他站在海灣前線，光速的腳尖讓敵人無法接近。'),
  ],
  marco: war(9, 'marinefordBay', '他隨白鬍子艦隊趕來，站在戰場最前線。'),
  jozu: war(9, 'marinefordBay', '他隨白鬍子艦隊趕來，擋在老爹身前。'),
  vista: war(9, 'marinefordBay', '他隨白鬍子艦隊趕來，雙劍已經出鞘。'),
}

/** Who is on the Summit War battlefield from the Day 72 morning: used by the final-day guard in the tests. */
export const warCast: CastId[] = ['koby', 'tashigi', 'mihawk', 'bonclay', 'law', 'kuma', 'jinbe', 'teach', 'doflamingo', 'garp', 'akainu', 'aokiji', 'kizaru', 'marco', 'jozu', 'vista']

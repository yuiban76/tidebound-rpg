// The officers and named hands of the pirate crews (and the bands that fight like crews), so that a fight with a crew
// brings out the people who stood beside its captain in the story. Most of them go wherever the one they follow goes:
// while they belong, their place is that person's place, so a captain the story moves (beaten, jailed, sailing on)
// takes them along. Outside the time they belong they stand at their own place.
// Names follow the Chinese Wikipedia entries; the display names live in shared/atlas.ts (castNpcs).
import type { LocationId } from '../shared/protocol.ts'
import type { Faction } from './foes.ts'

type Day = [number, number]
export type Crewmate = {
  /** The crew they fight with (a key of crews in crews.ts). */
  crew: string
  /** Whose place they share while they belong (default: the crew's captain). */
  follow: string
  from?: Day, until?: Day
  /** Where they stand outside that time (null: away at sea). */
  place: LocationId | null
  role: string, known: string
  tier: number, faction: Faction, bounty?: number, logia?: boolean
  /** One number, or [before the two years, after]; see canonLevels in foes.ts. */
  level: number | [number, number]
  move: string
}

const reunion: Day = [803, 8]
/** After the two years the strong ones fight with haki. */
export const crewmateHaki = (mate: Crewmate) => (Array.isArray(mate.level) ? mate.level[1] : mate.level) >= 50 && mate.tier >= 4

export const crewmates: Record<string, Crewmate> = {
  // 惡龍海賊團
  hatchan: { crew: 'arlong', follow: 'arlong', place: null, role: '惡龍海賊團幹部・章魚魚人', known: '六隻手各拿一把刀的章魚魚人，自稱魚人島第一的劍士，其實很容易忘事，也很愛做章魚燒。', tier: 3, faction: 'pirate', level: 12, move: '六刀流' },
  kuroobi: { crew: 'arlong', follow: 'arlong', place: null, role: '惡龍海賊團幹部・魟魚魚人', known: '面無表情的魟魚魚人，魚人空手道四十段，說人類的拳頭在水裡連一成力都使不出來。', tier: 3, faction: 'pirate', level: 13, move: '魚人空手道' },
  chew: { crew: 'arlong', follow: 'arlong', place: null, role: '惡龍海賊團幹部・河豚魚人', known: '嘴巴尖尖的河豚魚人，說話總在句尾加上「啾」，能把吸進去的水當砲彈噴出來。', tier: 3, faction: 'pirate', level: 12, move: '水大砲' },
  // 黑貓海賊團
  sham: { crew: 'kuro', follow: 'jango', place: null, role: '黑貓海賊團的喵喵兄弟・夏姆', known: '瘦瘦的貓男，手上戴著貓爪，說自己膽子很小，其實是想讓對手鬆懈。', tier: 2, faction: 'pirate', level: 7, move: '貓爪' },
  buchi: { crew: 'kuro', follow: 'jango', place: null, role: '黑貓海賊團的喵喵兄弟・布奇', known: '胖胖的貓男，最得意的招式是跳到半空中再一屁股坐下來。', tier: 2, faction: 'pirate', level: 7, move: '貓踩' },
  // 首領・克利克海賊團
  pearl: { crew: 'krieg', follow: 'krieg', place: null, role: '克利克海賊團的「鐵壁」珍珠', known: '全身掛滿鐵盾的大塊頭，說自己從沒流過一滴血；一流血就會慌張得點火。', tier: 3, faction: 'pirate', level: 10, move: '鐵壁盾擊' },
  // 小丑巴其海賊團
  alvida: { crew: 'buggy', follow: 'buggy', from: [9, 12], until: [60, 6], place: null, role: '女海賊亞爾麗塔', known: '自稱全海最美的女海賊，拿著一根鐵棒；據說她吃了果實之後，連攻擊都會從身上滑開。', tier: 3, faction: 'pirate', bounty: 5_000_000, level: 9, move: '鐵棒' },
  // 瓦波爾一行
  chess: { crew: 'wapol', follow: 'wapol', place: null, role: '瓦波爾的參謀傑斯', known: '戴著小丑帽、拿著弓的參謀，總是跟在瓦波爾身邊出主意。', tier: 3, faction: 'tyrant', level: 18, move: '弓箭' },
  kuromarimo: { crew: 'wapol', follow: 'wapol', place: null, role: '瓦波爾的參謀克羅馬利摩', known: '頂著一頭毛球的參謀，會把頭髮扯下來黏在人身上點火。', tier: 3, faction: 'tyrant', level: 18, move: '毛球爆炸' },
  // 貝拉米海賊團
  sarquiss: { crew: 'bellamy', follow: 'bellamy', place: null, role: '貝拉米海賊團副船長沙奇斯', known: '總是陪著貝拉米嘲笑「做夢的人」的副船長，腰上掛著鎖鐮。', tier: 3, faction: 'pirate', level: 22, move: '鎖鐮' },
  // 巴洛克工作社
  zala: { crew: 'baroque', follow: 'crocodile', until: [27, 6], place: null, role: 'Miss 雙指寶拉', known: 'Mr.1 的搭檔，全身能長出尖刺的女殺手，嘴上總叼著菸，說話慢條斯理。', tier: 4, faction: 'pirate', level: 26, move: '尖刺' },
  mr4: { crew: 'baroque', follow: 'crocodile', until: [27, 6], place: null, role: '巴洛克工作社 Mr.4', known: '說話慢吞吞的大個子，揮著四噸重的球棒，身邊跟著一隻會吐炸彈的狗槍。', tier: 3, faction: 'pirate', level: 24, move: '四噸球棒' },
  merryChristmas: { crew: 'baroque', follow: 'crocodile', until: [27, 6], place: null, role: '聖誕快樂小姐', known: 'Mr.4 的搭檔，說話快得像連珠炮，能變成鼴鼠在地底鑽洞。', tier: 3, faction: 'pirate', level: 24, move: '鼴鼠衝撞' },
  mr5: { crew: 'baroque', follow: 'galdino', until: [27, 6], place: null, role: '巴洛克工作社 Mr.5', known: '摳鼻孔的炸彈人，彈出去的鼻屎會爆炸，說自己是最冷酷的殺手。', tier: 3, faction: 'pirate', level: 17, move: '鼻屎炸彈' },
  valentine: { crew: 'baroque', follow: 'galdino', until: [27, 6], place: null, role: '情人節小姐', known: 'Mr.5 的搭檔，撐著陽傘飄在空中，能讓身體重到一萬公斤再砸下來。', tier: 3, faction: 'pirate', level: 15, move: '萬噸壓' },
  goldenweek: { crew: 'baroque', follow: 'galdino', until: [27, 6], place: null, role: '黃金週小姐', known: 'Mr.3 的搭檔，總是在喝茶吃點心；她畫的顏色能讓人忍不住照著顏色的心情行動。', tier: 2, faction: 'pirate', level: 16, move: '顏色陷阱' },
  // 摩利亞一行：殭屍
  oars: { crew: 'moria', follow: 'moria', until: [59, 0], place: null, role: '摩利亞的特別殭屍歐斯', known: '傳說中的巨人歐斯被做成了殭屍，身體比山還大，說話卻像個孩子。', tier: 5, faction: 'tyrant', level: 44, move: '巨人鐵拳' },
  ryuma: { crew: 'moria', follow: 'moria', until: [59, 0], place: null, role: '將軍殭屍「龍馬」', known: '和之國傳說中的劍豪變成的殭屍，拿著名刀秋水，說想再好好戰一次。', tier: 4, faction: 'tyrant', level: 40, move: '獅子歌歌' },
  // 艾涅爾的神官們
  satori: { crew: 'enel', follow: 'ohm', place: null, role: '森林的神官薩托利', known: '圓滾滾的神官，在上層雲的森林等著闖入者，說話總愛「喝呵呵」地笑。', tier: 4, faction: 'tyrant', level: 26, move: '球雲' },
  shura: { crew: 'enel', follow: 'ohm', place: null, role: '天空的神官修拉', known: '騎著巨鳥在天上巡邏的神官，手裡的長槍能噴出火焰。', tier: 4, faction: 'tyrant', level: 28, move: '熱槍' },
  gedatsu: { crew: 'enel', follow: 'ohm', place: null, role: '沼澤的神官葛達茲', known: '嘴唇翻在上面的神官，非常健忘，常常忘記自己正在做什麼。', tier: 4, faction: 'tyrant', level: 27, move: '噴射衝擊貝' },
  // 基德海賊團
  heat: { crew: 'kid', follow: 'kid', place: null, role: '基德海賊團的海特', known: '臉色蒼白、嘴裡會噴火的男人，一直跟在基德身邊。', tier: 4, faction: 'pirate', level: [40, 72], move: '火焰吐息' },
  wire: { crew: 'kid', follow: 'kid', place: null, role: '基德海賊團的懷亞', known: '高大的男人，背著一根三叉戟，很少開口。', tier: 4, faction: 'pirate', level: [40, 72], move: '三叉戟' },
  // 紅心海賊團
  bepo: { crew: 'heart', follow: 'law', place: null, role: '紅心海賊團航海士・白熊貝波', known: '會說話的白熊，一被罵就馬上道歉，但踢起人來比誰都狠。', tier: 4, faction: 'pirate', level: [38, 68], move: '熊踢' },
  shachi: { crew: 'heart', follow: 'law', place: null, role: '紅心海賊團的夏奇', known: '戴著帽子和墨鏡的船員，對船長羅非常崇拜。', tier: 3, faction: 'pirate', level: [30, 58], move: '短刀' },
  penguin: { crew: 'heart', follow: 'law', place: null, role: '紅心海賊團的佩金', known: '帽子上寫著「PENGUIN」的船員，和夏奇總是形影不離。', tier: 3, faction: 'pirate', level: [30, 58], move: '短刀' },
  // 紅髮海賊團
  benn: { crew: 'redHair', follow: 'shanks', place: null, role: '紅髮海賊團副船長班・貝克曼', known: '叼著菸、拿著火槍的副船長，據說是全世界最聰明的海賊之一，只要他一舉槍，連海軍大將都不敢亂動。', tier: 5, faction: 'pirate', level: 90, move: '火槍射擊' },
  roo: { crew: 'redHair', follow: 'shanks', place: null, role: '紅髮海賊團的拉奇・路', known: '永遠拿著一根帶骨肉在啃的胖子，笑起來很和氣，開槍時也照樣在吃。', tier: 5, faction: 'pirate', level: 84, move: '連射' },
  yasopp: { crew: 'redHair', follow: 'shanks', place: null, role: '紅髮海賊團狙擊手耶穌布', known: '說能射中螞蟻眼睛的狙擊手，一聊起留在東海的兒子就停不下來。', tier: 5, faction: 'pirate', level: 86, move: '狙擊' },
  // 黑鬍子海賊團
  laffitte: { crew: 'blackbeard', follow: 'teach', place: null, role: '黑鬍子海賊團航海士拉菲特', known: '拿著手杖、臉色蒼白的紳士，以前是西海的警長，說話客氣得讓人發毛。', tier: 5, faction: 'pirate', level: [55, 82], move: '催眠手杖' },
  augur: { crew: 'blackbeard', follow: 'teach', place: null, role: '黑鬍子海賊團狙擊手范・奧卡', known: '戴著高帽的狙擊手，說話總提到「命運」，能在看不見的距離外命中目標。', tier: 5, faction: 'pirate', level: [55, 82], move: '狙擊' },
  burgess: { crew: 'blackbeard', follow: 'teach', place: null, role: '黑鬍子海賊團一號船長傑斯・巴傑斯', known: '戴著摔角面具的大力士，最喜歡比力氣，說要成為世界最強的男人。', tier: 5, faction: 'pirate', bounty: 20_000_000, level: [56, 84], move: '摔角重擊' },
  docQ: { crew: 'blackbeard', follow: 'teach', place: null, role: '黑鬍子海賊團船醫多克Q', known: '騎著一匹瘦馬的病人醫生，一直咳嗽，手上的蘋果有的能吃、有的會爆炸。', tier: 4, faction: 'pirate', bounty: 72_000_000, level: [52, 78], move: '炸彈蘋果' },
  shiryu: { crew: 'blackbeard', follow: 'teach', from: [70, 4], place: 'impelLevel6', role: '雨之希留', known: '推進城以前的看守長，因為殺了太多囚犯被關進第六層；他說自己只是想找值得砍的人。', tier: 5, faction: 'pirate', level: [62, 88], move: '雨之斬' },
  // The Level 6 prisoners Blackbeard freed: his Titanic Captains after the breakout.
  pizarro: { crew: 'blackbeard', follow: 'teach', from: [70, 4], place: 'impelLevel6', role: '「破戒王」阿瓦羅・皮薩羅', known: '被關在第六層的大海賊，據說曾經一個人毀掉一整個國家；他說等出去以後，要把島嶼當成自己的身體來用。', tier: 5, faction: 'pirate', level: [60, 85], move: '島嶼之拳' },
  devon: { crew: 'blackbeard', follow: 'teach', from: [70, 4], place: 'impelLevel6', role: '「新月獵人」卡塔莉娜・戴彭', known: '被關在第六層的女海賊，最喜歡獵捕美麗的東西，笑起來像狐狸一樣。', tier: 5, faction: 'pirate', level: [58, 82], move: '九尾之爪' },
  wolf: { crew: 'blackbeard', follow: 'teach', from: [70, 4], place: 'impelLevel6', role: '「巨艦」桑・范・沃爾夫', known: '連巨人族都覺得巨大的男人，因為太大被關在第六層的角落，說話慢吞吞的。', tier: 5, faction: 'pirate', level: [58, 80], move: '巨足踐踏' },
  vascoShot: { crew: 'blackbeard', follow: 'teach', from: [70, 4], place: 'impelLevel6', role: '「大酒豪」巴斯可・修特', known: '整天抱著酒桶的大塊頭，醉醺醺地說只要有酒喝，跟誰走都可以。', tier: 5, faction: 'pirate', level: [58, 80], move: '酒火噴射' },
  // 紅心海賊團
  jeanBart: { crew: 'heart', follow: 'law', from: [58, 12], place: 'auctionHouse', role: '前海賊船長尚・巴爾', known: '在人口拍賣所被天龍人當成奴隸的大個子，以前是有名的海賊船長，脖子上還掛著爆炸項圈。', tier: 4, faction: 'pirate', level: [34, 62], move: '巨拳' },
  // 魚人島：和新魚人海賊團聯手的人
  vanderDecken: { crew: 'newFishman', follow: 'hody', place: null, role: '飛翔海賊團船長范德・戴肯九世', known: '一直想娶白星公主的鯛魚魚人，被拒絕之後，他說要把她和整座島一起砸沉。', tier: 4, faction: 'pirate', level: 52, move: '必中投擲' },
  wadatsumi: { crew: 'newFishman', follow: 'hody', place: null, role: '飛翔海賊團的大入道瓦達茲米', known: '比船還大的大入道，膽子很小，被罵就會哭，一生氣卻會把身體吹得更大。', tier: 4, faction: 'pirate', level: 50, move: '膨脹衝撞' },
  // 新魚人海賊團
  dosun: { crew: 'newFishman', follow: 'hody', place: null, role: '新魚人海賊團幹部達斯康', known: '揮著巨鎚的鎚頭鯊魚人，說話很少，一開口就要人「別擋路」。', tier: 4, faction: 'pirate', level: 50, move: '巨鎚' },
  zeo: { crew: 'newFishman', follow: 'hody', place: null, role: '新魚人海賊團幹部澤歐', known: '能把身體顏色變得和周圍一樣的魚人，總愛說「看不見我吧」。', tier: 4, faction: 'pirate', level: 50, move: '保護色突襲' },
  daruma: { crew: 'newFishman', follow: 'hody', place: null, role: '新魚人海賊團幹部達魯瑪', known: '長著一排利牙的魚人，什麼都能咬碎，連岩石都在他嘴裡像餅乾一樣。', tier: 4, faction: 'pirate', level: 48, move: '撕咬' },
  ikaros: { crew: 'newFishman', follow: 'hody', place: null, role: '新魚人海賊團幹部伊卡洛斯・木希', known: '十隻手各拿一把長槍的烏賊魚人，個子大得要彎腰才能進門。', tier: 4, faction: 'pirate', level: 50, move: '十槍突刺' },
  // 唐吉訶德家族
  gladius: { crew: 'donquixote', follow: 'doflamingo', place: null, role: '唐吉訶德家族幹部古拉迪烏斯', known: '戴著防毒面具的幹部，一生氣身體就會膨脹爆炸，最討厭事情不照計畫走。', tier: 4, faction: 'tyrant', level: 62, move: '爆破' },
  senorPink: { crew: 'donquixote', follow: 'doflamingo', place: null, role: '唐吉訶德家族幹部塞尼歐爾・皮克', known: '戴著嬰兒帽、叼著奶嘴的硬漢，能在地面像在水裡一樣游泳，說話卻比誰都有男子氣概。', tier: 4, faction: 'tyrant', level: 60, move: '游泳突擊' },
  machvise: { crew: 'donquixote', follow: 'doflamingo', place: null, role: '唐吉訶德家族幹部馬哈拜斯', known: '能讓身體重到好幾噸的胖男人，說話總愛加上「嗯」。', tier: 4, faction: 'tyrant', level: 60, move: '噸位壓' },
  dellinger: { crew: 'donquixote', follow: 'doflamingo', place: null, role: '唐吉訶德家族幹部德林傑', known: '穿著高跟鞋的鬥魚魚人少年，踢起人來比刀還利。', tier: 4, faction: 'tyrant', level: 58, move: '高跟踢' },
  laoG: { crew: 'donquixote', follow: 'doflamingo', place: null, role: '唐吉訶德家族幹部拉歐G', known: '駝背的老拳法家，出招前一定要先喊「G」。', tier: 4, faction: 'tyrant', level: 60, move: '老拳' },
  baby5: { crew: 'donquixote', follow: 'doflamingo', place: null, role: '唐吉訶德家族幹部貝比5', known: '全身能變成武器的女殺手，只要有人說「需要你」，她就沒辦法拒絕。', tier: 4, faction: 'tyrant', level: 56, move: '武器化' },
  buffalo: { crew: 'donquixote', follow: 'doflamingo', place: null, role: '唐吉訶德家族幹部巴法羅', known: '頭上長著螺旋槳的大個子，和貝比5總是一起行動，說話尾音拖著「達斯陽」。', tier: 4, faction: 'tyrant', level: 56, move: '迴旋衝撞' },
  jora: { crew: 'donquixote', follow: 'doflamingo', place: null, role: '唐吉訶德家族幹部喬拉', known: '自稱藝術家的胖女人，碰過的東西都會變成扭曲的「藝術」。', tier: 4, faction: 'tyrant', level: 54, move: '藝術化' },
  // Big Mom 海賊團
  smoothie: { crew: 'bigMom', follow: 'bigMom', place: null, role: 'Big Mom 海賊團甜點三將星斯慕吉', known: '高挑冷靜的將星，能把任何東西的水分榨乾，做成果汁。', tier: 5, faction: 'pirate', bounty: 932_000_000, level: 84, move: '榨汁之劍' },
  oven: { crew: 'bigMom', follow: 'bigMom', place: null, role: 'Big Mom 海賊團的大臣歐文', known: '身體熱得像火爐的大塊頭，脾氣跟身體一樣火爆。', tier: 5, faction: 'pirate', level: 82, move: '灼熱之拳' },
  daifuku: { crew: 'bigMom', follow: 'bigMom', place: null, role: 'Big Mom 海賊團的大臣大福', known: '摸摸肚子就會跑出一個巨大魔人的男人，對兄弟姊妹很有義氣。', tier: 5, faction: 'pirate', level: 80, move: '魔人之斧' },
  montdor: { crew: 'bigMom', follow: 'bigMom', place: null, role: 'Big Mom 海賊團的大臣夏洛特・蒙多爾', known: '抱著一本大書的大臣，能把人關進書裡，說話總是慢條斯理。', tier: 5, faction: 'pirate', level: 72, move: '書之牢' },
  opera: { crew: 'bigMom', follow: 'bigMom', place: null, role: 'Big Mom 海賊團的大臣夏洛特・歐培拉', known: '頂著奶油色捲髮的大臣，說話像在唱歌劇，能噴出滾燙的鮮奶油。', tier: 5, faction: 'pirate', level: 70, move: '鮮奶油' },
  tamago: { crew: 'bigMom', follow: 'bigMom', place: null, role: 'Big Mom 海賊團的塔瑪戈男爵', known: '蛋形身體的騎士，說話時句尾總加上「蛋・蛋・蛋」，被打碎了還會孵出更強的自己。', tier: 4, faction: 'pirate', level: 64, move: '蛋之劍' },
  pekoms: { crew: 'bigMom', follow: 'bigMom', place: null, role: 'Big Mom 海賊團的佩克姆斯', known: '戴著墨鏡的獅子毛皮族，背上的龜殼什麼都擋得住；他嘴上說是海賊，其實很重情義。', tier: 4, faction: 'pirate', level: 66, move: '龜殼衝撞' },
  // 百獸海賊團：飛六胞
  ulti: { crew: 'beasts', follow: 'kaido', place: null, role: '百獸海賊團「飛六胞」烏爾緹', known: '戴著頭盔的女孩，脾氣一上來就用頭撞人，把弟弟佩吉萬保護得緊緊的。', tier: 5, faction: 'pirate', bounty: 400_000_000, level: 74, move: '頭槌' },
  pageOne: { crew: 'beasts', follow: 'kaido', place: null, role: '百獸海賊團「飛六胞」佩吉萬', known: '能變成恐龍的少年，最怕姊姊烏爾緹生氣。', tier: 5, faction: 'pirate', bounty: 290_000_000, level: 70, move: '恐龍衝撞' },
  whosWho: { crew: 'beasts', follow: 'kaido', place: null, role: '百獸海賊團「飛六胞」呼死呼', known: '以前是 CP9 的特務，說話時總愛講自己當年的祕密。', tier: 5, faction: 'pirate', bounty: 546_000_000, level: 76, move: '指槍' },
  blackMaria: { crew: 'beasts', follow: 'kaido', place: null, role: '百獸海賊團「飛六胞」布拉克瑪利亞', known: '比房子還高的女人，在鬼島經營著一間花街，說話溫柔，但被她的絲網纏上就逃不掉。', tier: 5, faction: 'pirate', bounty: 480_000_000, level: 74, move: '蛛網' },
  sasaki: { crew: 'beasts', follow: 'kaido', place: null, role: '百獸海賊團「飛六胞」佐佐木', known: '帶著一支重甲部隊的武士，能變成三角龍，說話很講道理。', tier: 5, faction: 'pirate', bounty: 472_000_000, level: 72, move: '迴旋盾' },
  holdem: { crew: 'beasts', follow: 'kaido', place: null, role: '百獸海賊團「真打」霍爾德姆', known: '腰上長著一顆獅子頭的男人，在和之國的城鎮作威作福，一不順心就拿刀砍人。', tier: 4, faction: 'pirate', level: 60, move: '獅子咬' },
  // CP0 (the CP9 of before, after the two years)
  stussy: { crew: 'cp9', follow: 'lucci', from: reunion, place: null, role: 'CP0 特務史特西', known: '穿著時髦的女特務，總是笑著說話，沒人知道她真正替誰做事。', tier: 5, faction: 'government', level: 80, move: '吸血之吻' },
  // 火拳幫
  vito: { crew: 'fireTank', follow: 'bege', place: null, role: '火拳幫的維特', known: '說話尾音總帶著「囉嗚囉嗚」的槍手，對老大培基崇拜得不得了。', tier: 4, faction: 'pirate', level: 60, move: '連射' },
  gotti: { crew: 'fireTank', follow: 'bege', place: null, role: '火拳幫的哥提', known: '扛著大槍的沉默殺手，從不多話，只聽老大的命令。', tier: 4, faction: 'pirate', level: 62, move: '大口徑' },
  // 革命軍
  koala: { crew: 'revolution', follow: 'sabo', place: null, role: '革命軍的克爾拉', known: '戴著帽子的開朗女性，魚人空手道的師範，總在替薩波收拾爛攤子。', tier: 4, faction: 'civilian', level: 66, move: '魚人空手道' },
  hack: { crew: 'revolution', follow: 'sabo', place: null, role: '革命軍的魚人哈庫', known: '魚人空手道的高手，說話一板一眼，曾經在德雷斯羅薩的競技場出賽。', tier: 4, faction: 'civilian', level: 70, move: '魚人空手道' },
  // 推進城的獄卒
  sadie: { crew: 'impel', follow: 'magellan', place: null, role: '推進城的獄卒長莎蒂', known: '拿著鞭子的獄卒長，說話嬌媚，最喜歡看囚犯痛苦的樣子。', tier: 4, faction: 'government', level: 44, move: '鞭擊' },
  domino: { crew: 'impel', follow: 'magellan', place: null, role: '推進城的副看守長多米諾', known: '戴著墨鏡的副看守長，一絲不苟，把推進城的規矩記得比誰都清楚。', tier: 3, faction: 'government', level: 40, move: '電擊棒' },
  // 巴托俱樂部
  gambia: { crew: 'bartoClub', follow: 'bartolomeo', place: null, role: '巴托俱樂部的甘比亞', known: '巴托洛米奧的手下，和老大一樣崇拜草帽小子，說話又急又大聲。', tier: 3, faction: 'pirate', level: 50, move: '亂鬥' },
  // 黑炭大蛇的手下
  fukurokuju: { crew: 'orochi', follow: 'orochi', place: null, role: '御庭番眾頭目福祿壽', known: '額頭很長的忍者頭目，率領將軍的忍者部隊，對大蛇忠心耿耿。', tier: 4, faction: 'tyrant', level: 56, move: '忍法' },
}

/** People who are already in the world (cast.ts) and join a crew for a while, sharing its captain's place. */
export const crewJoins: { npc: string, crew: string, follow?: string, from?: Day, until?: Day }[] = [
  // After losing to Kaido in the New World, Hawkins and Drake sail under the Beasts.
  { npc: 'hawkins', crew: 'beasts', follow: 'kaido', from: [reunion[0] + 27, 0] },
  { npc: 'drake', crew: 'beasts', follow: 'kaido', from: [reunion[0] + 27, 0] },
  // Kuzan sails with Blackbeard after the two years.
  { npc: 'aokiji', crew: 'blackbeard', follow: 'teach', from: reunion },
  // The revolutionaries and the jailers already in the world fight beside their leaders.
  { npc: 'sabo', crew: 'revolution' },
  { npc: 'ivankov', crew: 'revolution' },
  { npc: 'hannyabal', crew: 'impel' },
  // Kyoshiro guards the shogun until the night he shows who he is.
  { npc: 'denjiro', crew: 'orochi', until: [848, 0] },
]

/** Who shares whose place, and when: every crewmate above, and the joins that follow someone. */
export const followers: Record<string, { follow: string, from?: Day, until?: Day }> = {
  ...Object.fromEntries(Object.entries(crewmates).map(([id, { follow, from, until }]) => [id, { follow, from, until }])),
  ...Object.fromEntries(crewJoins.filter(join => join.follow).map(({ npc, follow, from, until }) => [npc, { follow: follow!, from, until }])),
}

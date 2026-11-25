// The popular canon characters beyond the first fifty-odd: where each one stands on the morning of Day 1,
// and where the canon calendar takes them afterwards. Positions follow the same days as luffyRoute and
// canonTimeline (Day 1 = the morning Luffy leaves Dawn Island). Every stop is a present state, not a script:
// the players can meet, fight or recruit anyone, and a recruited companion is never moved by this calendar.
import type { LocationId, NpcId } from '../shared/protocol.ts'
import type { castNpcs } from '../shared/atlas.ts'
import type { Faction } from './foes.ts'

export type CastId = keyof typeof castNpcs
export type CastPerson = { place: LocationId | null, role: string, known: string }
export type CastProfile = { tier: number, faction: Faction, bounty?: number, logia?: boolean }
/** From [day, hour] on, the character is at `place` (null: away at sea) and knows `facts`. Stops are sorted by time. */
export type CastStop = { at: [number, number], place: LocationId | null, facts?: string,
  /** The stop is skipped when every flag holds (see flags.ts), e.g. no war after the Impel Down breakout. */
  unless?: string[],
  /** The role people know them by from now on (a cover blown). */
  role?: string }

export const castPeople: Record<CastId, CastPerson> = {
  // East Blue
  dadan: { place: 'hill', role: '科爾波山的山賊頭目', known: '嘴巴很凶的女頭目，嘴上說討厭小鬼，卻把山裡的野孩子都養大了。她說魯夫那小子今早真的出海了，活該被海浪打濕。' },
  koby: { place: null, role: '想當海軍的少年', known: '他在海賊船上當了兩年雜工，唯一的心願是成為海軍。' },
  nami: { place: null, role: '航海士、專偷海賊的小偷', known: '她只偷海賊的財寶，常說自己最討厭海賊；那張自己畫的海圖，她從不輕易給人看。' },
  buggy: { place: 'buggyBar', role: '小丑巴其海賊團船長', known: '他的海賊團占了橘子鎮、把酒館當成據點，說這裡的一切都是他的；誰碰他的寶藏海圖，他就拿大砲轟過去。' },
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
  kokoro: { place: 'blueStation', role: '海列車的列車長', known: '她說海列車是七水之都的命脈，只要付一點車票錢，就能去水上各處。' },
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
  // People at the islands' important places
  morgan: { place: 'marineBase', role: '海軍第153分部上校', known: '右手裝著一把大斧頭的上校，仗著官階要鎮民替他立雕像、繳重稅；誰敢違抗他，就會被當成罪犯處置。' },
  helmeppo: { place: 'shellsTown', role: '蒙卡上校的兒子', known: '仗著父親的權勢在鎮上作威作福，動不動就喊「我要告訴我爸」；被綁在廣場上的劍士，就是他設局關起來的。' },
  cabaji: { place: 'buggyBar', role: '巴其海賊團參謀長', known: '踩著獨輪車、耍著雜技劍術的劍士，最看不起別的劍士，總想找人比一場。' },
  mohji: { place: 'buggyBar', role: '巴其海賊團的猛獸使', known: '頭上頂著熊耳朵的男人，帶著一頭叫利奇的大獅子；他說世上沒有他馴服不了的動物。' },
  jango: { place: 'syrupSlope', role: '黑貓海賊團代理船長', known: '戴著心形墨鏡、晃著吊墜的催眠師，常在北海岸的斜坡上和某人碰頭，說話時總愛擺月光步的姿勢。' },
  merry: { place: 'kayaMansion', role: '可雅家的管家', known: '頭髮捲得像綿羊的老管家，比任何人都關心大小姐的身體，也很疼愛村裡那個愛說謊的少年。' },
  usoppKids: { place: 'syrupHill', role: '騙人布海賊團的小孩們', known: '胡蘿蔔、洋蔥和青椒三個孩子，自稱騙人布海賊團的團員；他們說隊長騙人布雖然愛說謊，其實是個好人。' },
  patty: { place: 'baratieDeck', role: '巴拉蒂的廚師', known: '脾氣火爆的廚師，常說「不付錢的客人就是敵人」；巴拉蒂的廚師個個都能把找碴的客人踢出去。' },
  carne: { place: 'baratieDeck', role: '巴拉蒂的廚師', known: '和派迪一起掌管甲板的廚師，覺得那個副料理長香吉士太愛對女客人獻殷勤。' },
  nezumi: { place: 'marine16', role: '海軍第16分部上校', known: '留著老鼠鬍子的上校，收了惡龍的錢，對可可亞西村的求救一律裝作沒聽見。' },
  toto: { place: 'yuba', role: '尤巴的老人', known: '三年沒下雨，綠洲被沙暴掩埋，他還是每天在沙裡挖井，相信水一定會再湧出來；他的兒子是叛亂軍的首領。' },
  kohza: { place: 'katorea', role: '叛亂軍首領', known: '和薇薇公主一起長大的青年，認定國王奪走了國家的雨，帶著叛亂軍在卡多雷亞集結。' },
  amazon: { place: 'heavenGate', role: '天國之門的看守婆婆', known: '笑嘻嘻地向每個入境者收十億埃克斯特爾的入境費；她說不付錢也行，她不會攔你。' },
  wyper: { place: 'shandiaVillage', role: '香迪亞的戰士', known: '叼著香菸、扛著燃燒砲的戰士，發誓要奪回四百年前被搶走的故鄉上層雲，任何妨礙的人都是敵人。' },
  ohm: { place: 'upperYard', role: '艾涅爾的神官', known: '在上層雲審判入侵者的神官，帶著一條叫赫利的狗；他說闖進神之島的人只會走向天國之門的另一邊。' },
  zambai: { place: 'backStreet', role: '佛朗基一家的頭目代理', known: '帶著一幫解體屋兄弟的男人，佛朗基不在時由他管事；他們接各種解體和賞金的活。' },
  baskerville: { place: 'courthouse', role: '司法島的法官', known: '有三顆頭的法官，坐在不做審理、只做判決的法院裡；送到這裡的人，判決早就寫好了。' },
  hogback: { place: 'hogbackLab', role: '天才外科醫生', known: '據說是傳說中的天才醫生，如今躲在恐怖三桅帆船的研究室裡，替船主把屍體改造成殭屍。' },
  absalom: { place: 'thrillerForest', role: '墓場的阿布薩羅姆', known: '長著獅子嘴的男人，能讓自己完全透明，在魔之森林裡偷看路過的人。' },
  disco: { place: 'auctionHouse', role: '人口拍賣所的拍賣官', known: '戴著墨鏡、說話誇張的拍賣官，口口聲聲說這裡的拍賣全都合法。' },
  charloss: { place: null, role: '天龍人', known: '世界貴族之一，頭上罩著泡泡、出門要奴隸背著走；聽說他想在拍賣會上買一條人魚當寵物。' },
  camie: { place: 'sabaodyPark', role: '章魚燒店的人魚', known: '和海星帕帕古一起賣章魚燒的人魚，天真又愛笑；朋友都提醒她，在夏波帝一定要小心人口販子。' },
  marguerite: { place: 'kujaVillage', role: '九蛇海賊團的戰士', known: '女兒島的年輕戰士，從沒見過男人，對外面的世界充滿好奇。' },
  sandersonia: { place: 'kujaArena', role: '九蛇海賊團的副船長', known: '漢考克的妹妹，身材高大，常在競技場上和戰士們比試，背上藏著一個不能讓人看見的秘密。' },
  marigold: { place: 'kujaArena', role: '九蛇海賊團的副船長', known: '漢考克的另一個妹妹，在競技場上和姊姊一起看守著九蛇的戰士。' },
  hannyabal: { place: 'impelLevel4', role: '推進城副典獄長', known: '整天說要把典獄長的位子搶過來的副典獄長，嘴上囂張，守起監獄來卻從不偷懶。' },
  jabra: { place: 'justiceTower', role: 'CP9 特務', known: '留著長辮子、能變成狼的特務，最看路基不順眼，動不動就說自己才是最強的。' },
  kumadori: { place: 'justiceTower', role: 'CP9 特務', known: '像歌舞伎演員一樣說話的特務，一有過失就嚷著要切腹謝罪，卻從來切不進去。' },
  fukurou: { place: 'justiceTower', role: 'CP9 特務', known: '嘴巴上有拉鍊的圓滾滾特務，管不住嘴，什麼祕密都會說溜出來。' },
  nero: { place: null, role: 'CP9 新人', known: '剛補進 CP9 的海上暗殺者，六式只學會四式，說話卻比誰都狂。' },
  oimo: { place: 'eniesGate', role: '守門的巨人', known: '他說自己守這扇門已經五十年了，只要守滿一百年，世界政府就會放了他們的首領。' },
  kashii: { place: 'eniesGate', role: '守門的巨人', known: '來自艾爾巴夫的巨人戰士，為了救回被抓的首領，答應替世界政府守門一百年。' },
  lulu: { place: 'galleyLa', role: '卡雷拉公司的工頭', known: '頭髮老是從奇怪的地方翹起來的工頭，按下去又會從別的地方冒出來，手藝倒是一流。' },
  tilestone: { place: 'galleyLa', role: '卡雷拉公司的工頭', known: '嗓門大得像打雷的壯漢，一個人就能扛起整根桅杆。' },
  kiwi: { place: 'frankyHouse', role: '佛朗基一家的方塊姐妹', known: '頂著方塊頭的姐妹之一，開口就是「老大最棒了哇哇」，跳起舞來停不下來。' },
  mozu: { place: 'frankyHouse', role: '佛朗基一家的方塊姐妹', known: '頂著方塊頭的姐妹之一，總跟姐妹一搭一唱，誰敢說老大壞話就跟誰翻臉。' },
  chimney: { place: 'blueStation', role: '可可蘿的孫女', known: '成天在車站玩耍的小女孩，說奶奶年輕時是美人魚，沒有人相信她。' },
  gonbe: { place: 'blueStation', role: '車站的兔子', known: '長得像貓、叫聲像貓，但蒂姆妮堅持牠是一隻兔子。' },
  daz: { place: null, role: 'Mr.1・刀刃人', known: '巴洛克工作社的頭號殺手，全身都能變成刀刃；沉默寡言，只對克洛克達爾忠心。' },
  tsuru: { place: 'hqFortress', role: '海軍中將「大參謀」', known: '和戰國、卡普同一輩的老中將，說話溫和，卻能用洗洗果實把海賊「洗乾淨」。' },
  squard: { place: null, role: '白鬍子傘下的海賊船長', known: '人稱「大渦蜘蛛」的船長，把白鬍子當成父親；他的同伴多年前被海賊王的手下殺光，他至今恨著羅傑的一切。' },
  oarsJr: { place: null, role: '白鬍子傘下的巨人船長', known: '比普通巨人還大上好幾倍的小奧茲Jr.，說話慢吞吞的，對艾斯敬重得像對親大哥。' },
  izo: { place: null, role: '白鬍子海賊團第十六隊隊長', known: '穿著和服、拿著兩把短槍的隊長，舉止優雅，開槍時從不猶豫。' },
  namur: { place: null, role: '白鬍子海賊團第八隊隊長', known: '鯊魚魚人，揮著一把大刀，說在老爹的船上，從沒有人因為他是魚人而看輕他。' },
  rakuyo: { place: null, role: '白鬍子海賊團第七隊隊長', known: '綁著長髮辮、揮著鐵球錘的隊長，笑起來豪爽，打起來毫不留情。' },
  curiel: { place: null, role: '白鬍子海賊團第十隊隊長', known: '扛著大火槍的隊長，說話直來直往，最看不慣海軍拿處刑當表演。' },
  blenheim: { place: null, role: '白鬍子海賊團第九隊隊長', known: '高大的隊長，能用身體擋下炮彈，說兄弟有難時自己就是一面牆。' },
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
  morgan: { tier: 3, faction: 'marine' }, helmeppo: { tier: 1, faction: 'marine' },
  cabaji: { tier: 2, faction: 'pirate' }, mohji: { tier: 2, faction: 'pirate' },
  jango: { tier: 3, faction: 'pirate', bounty: 9_000_000 }, merry: { tier: 0, faction: 'civilian' }, usoppKids: { tier: 0, faction: 'civilian' },
  patty: { tier: 2, faction: 'civilian' }, carne: { tier: 2, faction: 'civilian' }, nezumi: { tier: 2, faction: 'marine' },
  toto: { tier: 0, faction: 'civilian' }, kohza: { tier: 2, faction: 'civilian' },
  amazon: { tier: 1, faction: 'civilian' }, wyper: { tier: 4, faction: 'civilian' }, ohm: { tier: 4, faction: 'tyrant' },
  zambai: { tier: 2, faction: 'bandit' }, baskerville: { tier: 3, faction: 'government' },
  hogback: { tier: 2, faction: 'tyrant' }, absalom: { tier: 3, faction: 'tyrant' },
  disco: { tier: 1, faction: 'tyrant' }, charloss: { tier: 1, faction: 'government' }, camie: { tier: 0, faction: 'civilian' },
  marguerite: { tier: 3, faction: 'pirate' }, sandersonia: { tier: 4, faction: 'pirate' }, marigold: { tier: 4, faction: 'pirate' },
  hannyabal: { tier: 4, faction: 'government' },
  jabra: { tier: 4, faction: 'government' }, kumadori: { tier: 4, faction: 'government' }, fukurou: { tier: 4, faction: 'government' },
  nero: { tier: 3, faction: 'government' }, oimo: { tier: 4, faction: 'government' }, kashii: { tier: 4, faction: 'government' },
  lulu: { tier: 2, faction: 'civilian' }, tilestone: { tier: 2, faction: 'civilian' },
  kiwi: { tier: 1, faction: 'bandit' }, mozu: { tier: 1, faction: 'bandit' }, chimney: { tier: 0, faction: 'civilian' }, gonbe: { tier: 0, faction: 'beast' },
  daz: { tier: 4, faction: 'pirate' }, tsuru: { tier: 5, faction: 'marine' },
  squard: { tier: 4, faction: 'pirate' }, oarsJr: { tier: 5, faction: 'pirate' }, izo: { tier: 4, faction: 'pirate' },
  namur: { tier: 4, faction: 'pirate' }, rakuyo: { tier: 4, faction: 'pirate' }, curiel: { tier: 4, faction: 'pirate' }, blenheim: { tier: 4, faction: 'pirate' },
}

/** The Impel Down breakout (an island quest the players can finish) calls the war off. */
const noWar = ['task:impelDown']
/** On the Summit War battlefield from `hour` on Day 72 until the evening. */
const war = (hour: number, place: LocationId, facts: string): CastStop[] =>
  [{ at: [72, hour], place, facts, unless: noWar }, { at: [72, 21], place: null }]
/** The breakout on Day 70, and the fall from the sky onto Oris Plaza at 15:00 with Luffy. */
const breakout = (facts: string): CastStop[] => [
  { at: [70, 6], place: null, facts: '他趁著大暴動逃出了推進城，和一群逃犯搶了一艘軍艦。' },
  ...war(15, 'oris', facts),
]

/** Water 7 and Enies Lobby: whoever the players already took along or beat does not follow the canon calendar. */
const unless = (flag: string, stops: CastStop[]): CastStop[] => stops.map(stop => ({ ...stop, unless: [flag] }))
/** The Straw Hats through Enies Lobby and back to the shipyard until they sail on Day 53. */
const enies = (facts: string, from: [number, number] = [47, 18]): CastStop[] => [
  { at: from, place: from[1] === 18 ? 'blueStation' : null }, { at: [47, 22], place: null },
  { at: [48, 6], place: 'eniesFront' }, { at: [48, 7], place: 'courthouse', facts }, { at: [48, 9], place: 'justiceTower' }, { at: [48, 14], place: null },
]
const home: CastStop[] = [{ at: [49, 8], place: 'galleyLa' }, { at: [53, 8], place: null }]
/** CP9 in hiding: the masks come off in the mansion, and the Judicial Tower is where they wait. */
const cp9 = (npc: NpcId, last: string): CastStop[] => [
  ...unless('defeated:' + npc, [
    { at: [46, 22], place: 'iceburgMansion', role: 'CP9 特務', facts: '面具已經摘下。五年的偽裝，只為了今晚。' },
    { at: [48, 1], place: npc === 'blueno' ? 'courthouse' : 'justiceTower', facts: '任務完成，只等把人送進正義之門。' },
  ]),
  { at: [48, 13], place: null, facts: last },
]
/** Galley-La's foremen and the Franky Family ride the Rocketman to Enies Lobby. */
const riders = (back: LocationId, facts: string): CastStop[] => [
  { at: [47, 22], place: null }, { at: [48, 5], place: 'eniesFront', facts }, { at: [48, 14], place: null }, { at: [49, 8], place: back },
]

/** Where each character goes after Day 1. Only people who actually move have an entry. */
export const castRoutes: Partial<Record<CastId, CastStop[]>> = {
  koby: [
    { at: [2, 6], place: 'shellsTown', facts: '他抖著腿站在鎮上，卻說自己一定要成為海軍。' },
    { at: [2, 13], place: 'marineBase', facts: '他剛加入海軍，從打雜的見習生做起，說有朝一日要追上自己心中的英雄。' },
    { at: [4, 6], place: null, facts: '他被海軍英雄卡普帶走，當起了見習生。' },
    { at: [50, 12], place: 'water7Port', facts: '他長高了，也變強了。他說下次見面，會以海軍的身分抓住那個朋友。' }, { at: [50, 20], place: null },
    ...war(10, 'marinefordBay', '他被調來馬林福特，親眼看著這場戰爭。'),
  ],
  nami: [
    { at: [3, 6], place: 'orangeStreet', facts: '她在橘子鎮偷走了巴其海賊團的海圖，正想辦法脫身，嘴上說只想要錢。' },
    { at: [3, 18], place: null, facts: '暫時和一個戴草帽的少年同路，她說這只是合作關係。' },
    { at: [7, 8], place: 'arlongPark', facts: '她替惡龍畫著海圖，臉上的笑容一點也不真心。' },
    { at: [8, 17], place: null, facts: '惡龍樂園倒下後，她成了草帽一夥的航海士。' },
    ...unless('recruited:nami', [
      { at: [40, 10], place: 'water7Port', role: '草帽一夥的航海士', facts: '她抱著從空島帶回來的黃金，笑得合不攏嘴，說終於能好好修船了。' },
      { at: [41, 12], place: 'galleyLa' }, { at: [44, 12], place: 'water7Port' }, { at: [46, 20], place: 'iceburgMansion' }, { at: [47, 8], place: 'backStreet' },
      ...enies('她說不管來幾個政府的人，羅賓一定要搶回來。'), ...home,
    ]),
  ],
  buggy: [
    { at: [3, 16], place: null, facts: '被趕出橘子鎮後乘著小船逃走，嘴裡仍在揚言報仇。' },
    { at: [9, 12], place: 'logueSquare', facts: '他把一個戴草帽的少年綁上處刑台，打算親手處刑。' },
    { at: [9, 20], place: null, facts: '處刑失敗後，他灰頭土臉地逃走了。' },
    { at: [60, 6], place: 'impelLevel1', facts: '他不知怎麼被海軍抓住，關在推進城第一層，嘴上還吹噓自己是大海賊。' },
    ...breakout('他從天而降，掉進了頂上戰場，嚷著要搶白鬍子的財寶。'),
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
    { at: [60, 6], place: 'impelLevel1', facts: '他被關在推進城第一層，和巴其關在一起。' },
    ...breakout('他和巴其一起從天而降，用蠟替同伴擋下了攻擊。'),
  ],
  wapol: [
    { at: [17, 6], place: 'bighorn', facts: '他帶著手下回到磁鼓島，要把城堡奪回去。' },
    { at: [18, 12], place: null, facts: '被趕出磁鼓島後，他下落不明。' },
  ],
  bonclay: [
    { at: [21, 12], place: 'nanohana', facts: '他在阿拉巴斯坦的港口露面，替巴洛克工作社辦事。' },
    { at: [25, 18], place: null, facts: '任務結束後，他不告而別地消失了。' },
    { at: [64, 6], place: 'impelLevel5', facts: '他在推進城裡替落難者打氣，說只要夠熱情，監獄也能變成舞台。' },
    { at: [70, 6], place: 'impelGate', facts: '他留在推進城的正義之門控制室，替大家打開了門，自己被留了下來。' },
  ],
  kaku: cp9('kaku', '司法島一戰後，他不知逃去了哪裡。'),
  kalifa: cp9('kalifa', '司法島一戰後，她下落不明。'),
  blueno: cp9('blueno', '司法島一戰後，他下落不明。'),
  perona: [
    { at: [55, 12], place: 'graveyard', facts: '她負責在墓園放鬼魂，替摩利亞看守這座船。' },
    { at: [56, 12], place: null, facts: '摩利亞倒下後，她揪著腳邊的玩偶逃走了。' },
  ],
  law: [
    { at: [57, 8], place: 'sabaodyGrove', facts: '他在夏波帝的樹下靜靜觀察，不插手眼前的騷動。' },
    { at: [60, 6], place: null, facts: '他離開了群島。' },
    ...war(19, 'marinefordBay', '他開著潛水艇衝進戰場，說要把戴草帽的小子帶走治療。'),
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
    ...breakout('他和魯夫一起從天而降，站在艾斯與魯夫身旁。'),
  ],
  teach: [
    { at: [52, 8], place: 'impelGate', facts: '他把艾斯交給海軍，換取七武海的位子。' },
    { at: [52, 20], place: null, facts: '離開了推進城，沒有人知道他的下一步。' },
    { at: [69, 12], place: 'impelLevel6', facts: '他趁亂闖進推進城最底層，招攬最兇惡的犯人當同伴。' },
    { at: [70, 4], place: null, facts: '他帶著新同伴離開了推進城。' },
    ...war(18, 'marinefordBay', '他在白鬍子最後一戰時現身，咧著嘴笑，說自己是來收東西的。'),
  ],
  shanks: [
    { at: [72, 19], place: 'marinefordBay', facts: '他在戰爭的最後一刻現身，一句話就讓雙方停了手。' },
    { at: [73, 6], place: null },
  ],
  doflamingo: war(12, 'marinefordBay', '身為七武海，他被召來頂上戰場，一直笑著。'),
  garp: [
    { at: [50, 12], place: 'water7Port', facts: '他一拳捶醒了睡著的孫子，又哭又罵，把人家的牆打穿了一個大洞。' },
    { at: [50, 20], place: 'hqFortress', facts: '他回到海軍本部，仙貝吃得比平常少。' },
    ...war(12, 'scaffold', '他守在處刑台前，拳頭一直沒放下。'),
  ],
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
  jabra: [{ at: [48, 13], place: null, facts: '司法島一戰後下落不明。' }],
  kumadori: [{ at: [48, 13], place: null, facts: '司法島一戰後下落不明。' }],
  fukurou: [{ at: [48, 13], place: null, facts: '司法島一戰後下落不明。' }],
  nero: [
    { at: [47, 14], place: 'blueStation', facts: '他守在海列車旁，說要讓大家見識新人的厲害。' },
    { at: [47, 20], place: null, facts: '他在海列車上被人撂倒，從此沒再出現。' },
  ],
  paulie: [{ at: [46, 5], place: 'iceburgMansion', facts: '他守在冰山床邊，發誓要把兇手綁在桅杆上。' }, ...riders('galleyLa', '冰山先生的仇，我要親手討回來！')],
  lulu: [{ at: [46, 5], place: 'iceburgMansion' }, ...riders('galleyLa', '他帶著船匠們衝進司法島，頭髮翹得比平常還高。')],
  tilestone: [{ at: [46, 5], place: 'iceburgMansion' }, ...riders('galleyLa', '他扛著大槌替大家開路，吼聲蓋過了砲聲。')],
  zambai: riders('backStreet', '老大被抓走了，我們就是爬也要爬到司法島！'),
  kiwi: riders('backStreet', '老大等我們哇哇！'),
  mozu: riders('backStreet', '老大等我們哇哇！'),
  kokoro: [{ at: [48, 0], place: null }, { at: [48, 5], place: 'eniesGate', facts: '火箭人撞壞了大門，也撞壞了自己。嗯嘎嘎嘎，老太婆的駕駛技術不錯吧。' }, { at: [48, 14], place: null }, { at: [49, 8], place: 'blueStation' }],
  chimney: [{ at: [48, 0], place: null }, { at: [48, 5], place: 'eniesGate' }, { at: [48, 14], place: null }, { at: [49, 8], place: 'blueStation', facts: '奶奶真的是美人魚喔！大家都看到了！' }],
  gonbe: [{ at: [48, 0], place: null }, { at: [48, 5], place: 'eniesGate' }, { at: [48, 14], place: null }, { at: [49, 8], place: 'blueStation' }],
  daz: [
    { at: [27, 6], place: 'impelLevel4', facts: '輸給一個綠髮劍士後被押進推進城，關在第四層的焦熱地獄。' },
    ...breakout('他跟著老闆克洛克達爾從天而降，兩隻手臂已經變成了刀刃。'),
  ],
  tsuru: war(12, 'marinefordBay', '她在海灣前線指揮艦隊，洗洗果實讓衝上來的海賊一個個軟倒。'),
  squard: war(12, 'marinefordBay', '他帶著自己的艦隊跟在老爹身後，卻一直盯著處刑台，臉色很難看。'),
  oarsJr: war(12, 'mfWall', '他拖著一整艘船往處刑台前進，說一定要把艾斯救出來。'),
  izo: war(9, 'marinefordBay', '他隨白鬍子艦隊趕來，兩把短槍都已經上膛。'),
  namur: war(9, 'marinefordBay', '他隨白鬍子艦隊趕來，大刀扛在肩上。'),
  rakuyo: war(9, 'marinefordBay', '他隨白鬍子艦隊趕來，甩著鐵球錘說要把處刑台砸爛。'),
  curiel: war(9, 'marinefordBay', '他隨白鬍子艦隊趕來，大火槍對準了海軍的陣線。'),
  blenheim: war(9, 'marinefordBay', '他隨白鬍子艦隊趕來，擋在兄弟們的前面。'),
  morgan: [{ at: [2, 12], place: null, facts: '被戴草帽的少年打倒後，他被自己的部下綁起來押走了。' }],
  helmeppo: [
    { at: [2, 13], place: 'marineBase', facts: '父親倒台後，他被留在基地從雜工做起，嘴上還是不服氣。' },
    { at: [4, 6], place: null, facts: '他跟著可比一起被海軍英雄卡普帶走，當起了見習生。' },
    { at: [50, 12], place: 'water7Port', facts: '他跟在卡普身後，雙刀已經有模有樣了。' }, { at: [50, 20], place: null },
    ...war(10, 'marinefordBay', '他跟著可比被調來馬林福特，嚇得腿都在抖。'),
  ],
  // Buggy's officers leave Orange Town with him and sail with him afterwards (see crews.ts).
  cabaji: [{ at: [3, 16], place: null, facts: '輸了一場劍術對決後，他跟著船長逃離了橘子鎮。' }],
  mohji: [{ at: [3, 16], place: null, facts: '他和獅子利奇一起，跟著船長逃離了橘子鎮。' }],
  jango: [{ at: [4, 6], place: null, facts: '計畫失敗後，他帶著黑貓海賊團的人逃上了船。' }],
  kohza: [
    { at: [25, 6], place: 'alubarna', facts: '他帶著叛亂軍攻進了首都，決心逼國王交出雨。' },
    { at: [26, 12], place: 'yuba', facts: '內戰結束了，他回到尤巴，和父親一起挖井、重建綠洲。' },
  ],
  ohm: [{ at: [32, 12], place: null, facts: '在上層雲被打倒後，他不知倒在森林的哪個角落。' }],
  hogback: [{ at: [56, 6], place: null, facts: '船主倒下後，他帶著辛蒂莉逃離了恐怖三桅帆船。' }],
  absalom: [{ at: [56, 6], place: null, facts: '船主倒下後，他趁亂逃走了。' }],
  charloss: [
    { at: [58, 10], place: 'auctionHouse', facts: '他坐在拍賣會的貴賓席，舉手要買下那條人魚。' },
    { at: [58, 16], place: null, facts: '在拍賣會上被一個戴草帽的少年揍飛之後，他被護衛抬回了聖地。' },
  ],
  camie: [
    { at: [58, 10], place: 'auctionHouse', facts: '她被人口販子抓走，關在水槽裡擺上了拍賣台。' },
    { at: [58, 16], place: 'sabaodyPark', facts: '她被救了出來，回到遊樂園附近的章魚燒攤，哭著說謝謝大家。' },
  ],
}

/** Main canon characters (canon.ts) on the same kind of calendar, for Impel Down and the Summit War. */
export const canonRoutes: Partial<Record<NpcId, CastStop[]>> = {
  // The Straw Hats in Water 7 and Enies Lobby.
  zoro: unless('recruited:zoro', [
    { at: [40, 10], place: 'water7Port', role: '草帽一夥的劍士', facts: '他留在船上看守，結果睡著了。' }, { at: [46, 20], place: 'iceburgMansion' }, { at: [47, 8], place: 'galleyLa' },
    ...enies('他說要走的人別攔，要救的人就一定救到底。'), ...home,
  ]),
  usopp: unless('recruited:usopp', [
    { at: [40, 10], place: 'water7Port', role: '草帽一夥的狙擊手', facts: '他說梅利號的傷要趕快修，那是可雅送的船，是最重要的夥伴。' }, { at: [41, 18], place: 'frankyHouse' },
    { at: [42, 8], place: 'water7Port' }, { at: [45, 8], place: 'backStreet' }, { at: [47, 10], place: 'frankyHouse' },
    ...enies('他戴上面具，說自己不是騙人布，是來自狙擊島的狙擊王。', [47, 20]), { at: [49, 8], place: 'backStreet' }, { at: [53, 6], place: 'water7Port' }, { at: [53, 8], place: null },
  ]),
  sanji: unless('recruited:sanji', [
    { at: [40, 10], place: 'water7Port', role: '草帽一夥的廚師', facts: '他說這裡的水水肉很適合做成宴會大餐。' }, { at: [41, 12], place: 'backStreet' }, { at: [47, 12], place: 'blueStation' },
    ...enies('誰敢讓美麗的小姐掉眼淚，我就踢飛誰。', [47, 20]), ...home,
  ]),
  chopper: unless('recruited:chopper', [
    { at: [40, 10], place: 'water7Port', role: '草帽一夥的船醫', facts: '他第一次看到這麼多船，眼睛都亮了。' }, { at: [46, 10], place: 'backStreet' }, { at: [47, 8], place: 'galleyLa' },
    ...enies('他把藍波球握得緊緊的，說這次換他來保護羅賓。'), ...home,
  ]),
  robin: unless('recruited:robin', [
    { at: [40, 10], place: 'water7Port', role: '草帽一夥的考古學家', facts: '她望著海列車的鐵軌，若有所思地笑了笑。' }, { at: [41, 14], place: null },
    { at: [46, 22], place: 'iceburgMansion', facts: '我不會再回去了。這是我自己的決定，請不要追問。' }, { at: [49, 8], place: 'galleyLa', facts: '能活著，真是太好了。' }, { at: [53, 8], place: null },
  ]),
  franky: unless('recruited:franky', [
    { at: [48, 6], place: 'eniesFront' }, { at: [48, 7], place: 'courthouse', facts: '那張設計圖，我當著他們的面燒了。超級痛快！' }, { at: [48, 9], place: 'justiceTower' }, { at: [48, 14], place: null },
    { at: [49, 8], place: 'galleyLa', facts: '我要造一艘夢想之船，能撐到世界盡頭的那種！超級期待吧！' }, { at: [53, 8], place: null, role: '草帽一夥的船匠' },
  ]),
  iceburg: [{ at: [49, 8], place: 'galleyLa', facts: '海列車會修好，城市也會修好。那孩子終於要出海了，湯姆先生一定也很高興。' }],
  lucci: unless('defeated:lucci', [
    { at: [46, 22], place: 'iceburgMansion', role: 'CP9 特務', facts: '他不再讓鴿子替他說話：「任務就是任務，五年的交情也一樣。」' },
    { at: [48, 1], place: 'justiceTower', facts: '他相信「黑暗的正義」，為了政府可以不擇手段。' }, { at: [48, 10], place: 'gateOfJustice' },
  ]),
  crocodile: [
    { at: [27, 6], place: 'impelLevel6', facts: '他失去七武海的頭銜，被關進推進城最底層的無限地獄。' },
    ...breakout('他從天而降，說自己不是來救人的，只是要取白鬍子的命。'),
  ],
  ivankov: breakout('他帶著人妖王國的同伴從天而降，大喊要為革命軍的未來出一份力。'),
  hancock: [
    { at: [63, 8], place: null, facts: '她以七武海的身分出航，船上偷偷藏著一個戴草帽的少年。' },
    { at: [64, 10], place: 'impelGate', facts: '她在推進城正門的船上等著，說是奉命來看看囚犯艾斯。' },
    { at: [66, 6], place: null },
    ...war(12, 'marinefordBay', '身為七武海，她站在海軍陣營，眼睛卻一直在找一個戴草帽的少年。'),
    { at: [73, 12], place: 'kujaCastle', facts: '她回到女兒島，常常望著海平線發呆。' },
  ],
  moria: war(12, 'marinefordBay', '身為七武海，他被召來頂上戰場，影子在冰面上蠕動。'),
  smoker: war(12, 'oris', '他在奧利斯廣場攔截衝向處刑台的海賊，十手一直沒離手。'),
  sengoku: [
    { at: [72, 9], place: 'scaffold', facts: '他站在處刑台上，親自向全世界宣讀艾斯的身世與罪狀。', unless: noWar },
    { at: [72, 21], place: 'hqFortress', facts: '戰爭結束了，他說自己會辭去元帥的職位。' },
  ],
}

/** Who is on the Summit War battlefield from the Day 72 morning: used by the final-day guard in the tests. */
export const warCast: CastId[] = ['koby', 'tashigi', 'mihawk', 'bonclay', 'law', 'kuma', 'jinbe', 'teach', 'doflamingo', 'garp', 'akainu', 'aokiji', 'kizaru', 'marco', 'jozu', 'vista', 'squard', 'oarsJr', 'izo', 'namur', 'rakuyo', 'curiel', 'blenheim', 'tsuru']

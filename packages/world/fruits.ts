// Devil fruits. A fruit belongs to one NPC; when a player party knocks that NPC down, the player who landed the last blow
// may eat it (taking the power) or let it go. A fruit that is let go drifts into the world and shows up at the Sabaody
// auction house three days later. There is only ever one of each, and nobody may eat two.
import type { NpcId } from '../shared/protocol.ts'
import { npcs } from '../shared/protocol.ts'
import { queuePaper } from './flags.ts'
import { registerFruitKinds } from './talents.ts'
import type { World } from './village.ts'

export type FruitKind = 'paramecia' | 'zoan' | 'logia'
export type Fruit = { name: string, kind: FruitKind, rank: 1 | 2 | 3, owner: NpcId, move: string, text: string }
export const kindNames: Record<FruitKind, string> = { paramecia: '超人系', zoan: '動物系', logia: '自然系' }

export const fruits = {
  moku: { name: '煙煙果實', kind: 'logia', rank: 3, owner: 'smoker', move: '白色煙霧', text: '身體能化為煙霧，纏住對手。' },
  suna: { name: '沙沙果實', kind: 'logia', rank: 3, owner: 'crocodile', move: '沙漠之劍', text: '身體能化為沙，吸乾所有碰到的水分。' },
  goro: { name: '雷電果實', kind: 'logia', rank: 3, owner: 'enel', move: '雷鳴', text: '身體能化為雷，以光速出手。' },
  mera: { name: '火焰果實', kind: 'logia', rank: 3, owner: 'ace', move: '火拳', text: '身體能化為火焰，一拳就能燒穿對手。' },
  magu: { name: '熔岩果實', kind: 'logia', rank: 3, owner: 'akainu', move: '大噴火', text: '身體能化為熔岩，火力壓過火焰。' },
  hie: { name: '冰凍果實', kind: 'logia', rank: 3, owner: 'aokiji', move: '冰河時期', text: '身體能化為冰，連海面都能凍住。' },
  pika: { name: '閃光果實', kind: 'logia', rank: 3, owner: 'kizaru', move: '八尺瓊勾玉', text: '身體能化為光，快到沒人看得見。' },
  yami: { name: '暗暗果實', kind: 'logia', rank: 3, owner: 'teach', move: '黑洞', text: '身體能化為黑暗，吸住一切，包括其他自然系的力量。' },
  hito: { name: '人人果實', kind: 'zoan', rank: 1, owner: 'chopper', move: '怪物強點', text: '吃下後獲得人的智慧與變形能力。' },
  tori: { name: '鳥鳥果實 幻獸種：不死鳥', kind: 'zoan', rank: 3, owner: 'marco', move: '不死鳥之焰', text: '能化身不死鳥，藍色火焰會讓傷口癒合。' },
  ryu: { name: '龍龍果實 古代種：異龍', kind: 'zoan', rank: 2, owner: 'drake', move: '恐龍衝撞', text: '變成古代的巨龍，力量遠超一般動物系。' },
  ushi: { name: '牛牛果實 型態：長頸鹿', kind: 'zoan', rank: 1, owner: 'kaku', move: '指槍', text: '長頸鹿的力量，配合六式的指技十分好用。' },
  neko: { name: '貓貓果實 型態：豹', kind: 'zoan', rank: 2, owner: 'lucci', move: '豹爪', text: '獵豹般的敏捷，配合爪擊極為致命。' },
  yomi: { name: '黃泉果實', kind: 'paramecia', rank: 1, owner: 'brook', move: '靈魂出竅', text: '死過一次還能復活，靈魂可以離開身體。' },
  ope: { name: '手術果實', kind: 'paramecia', rank: 3, owner: 'law', move: '房間・切割', text: '展開圓形空間，空間內的一切由你切割、重組。' },
  jiki: { name: '磁力果實', kind: 'paramecia', rank: 2, owner: 'kid', move: '磁力彈', text: '操縱鐵質物體，連武器也能吸過來。' },
  toshi: { name: '年齡果實', kind: 'paramecia', rank: 2, owner: 'bonney', move: '老化拳', text: '碰到的人或物，可以變老或變年輕。' },
  nikyu: { name: '肉球果實', kind: 'paramecia', rank: 3, owner: 'kuma', move: '彈飛', text: '手掌的肉球能彈飛一切，連痛苦也能彈走。' },
  ito: { name: '線線果實', kind: 'paramecia', rank: 3, owner: 'doflamingo', move: '操縱線', text: '放出細線切割、操縱對手，連人也能當傀儡。' },
  horo: { name: '幽靈果實', kind: 'paramecia', rank: 1, owner: 'perona', move: '負面幽靈', text: '放出幽靈，讓被穿過的人陷入無盡低落。' },
  doru: { name: '蠟蠟果實', kind: 'paramecia', rank: 1, owner: 'galdino', move: '蠟拳', text: '能分泌蠟並任意塑形、硬化。' },
  baku: { name: '啃啃果實', kind: 'paramecia', rank: 1, owner: 'wapol', move: '吞噬砲擊', text: '吞下的東西能與身體融合，變成自己的武器。' },
  dia: { name: '鑽石果實', kind: 'paramecia', rank: 2, owner: 'jozu', move: '鑽石拳', text: '全身變成鑽石，防禦與攻擊都十分驚人。' },
  bara: { name: '切切果實', kind: 'paramecia', rank: 1, owner: 'buggy', move: '分離攻擊', text: '身體能切成幾塊，不怕刀劍，卻怕被刺。' },
  hana: { name: '花花果實', kind: 'paramecia', rank: 1, owner: 'robin', move: '千紫萬紅', text: '身體的部位能在任何地方長出來。' },
  kage: { name: '影子果實', kind: 'paramecia', rank: 2, owner: 'moria', move: '影之軍團', text: '能抽走別人的影子，注入屍體操縱它。' },
  doku: { name: '毒毒果實', kind: 'paramecia', rank: 2, owner: 'magellan', move: '毒龍', text: '能製造各種毒液，連呼吸都帶毒。' },
  mane: { name: '模仿果實', kind: 'paramecia', rank: 1, owner: 'bonclay', move: '芭蕾踢', text: '碰過一次的臉和身體，都能完整複製。' },
  wara: { name: '稻草果實', kind: 'paramecia', rank: 1, owner: 'hawkins', move: '稻草人反擊', text: '身體變成稻草，傷害能轉移到別人身上。' },
  doa: { name: '門門果實', kind: 'paramecia', rank: 1, owner: 'blueno', move: '空間門', text: '可以在任何東西上打開一扇門。' },
  awa: { name: '泡泡果實', kind: 'paramecia', rank: 1, owner: 'kalifa', move: '泡泡擒拿', text: '能放出泡泡，洗去對手的力氣。' },
  gura: { name: '震動果實', kind: 'paramecia', rank: 3, owner: 'whitebeard', move: '地震拳', text: '能放出震動，連大地與海洋都能震裂。' },
  bane: { name: '彈簧果實', kind: 'paramecia', rank: 1, owner: 'bellamy', move: '彈簧衝撞', text: '雙腳能像彈簧一樣彈跳，用衝撞戰鬥。' },
  horm: { name: '荷爾蒙果實', kind: 'paramecia', rank: 1, owner: 'ivankov', move: '荷爾蒙注射', text: '能用荷爾蒙操控身體，甚至改變性別。' },
  mero: { name: '戀戀果實', kind: 'paramecia', rank: 2, owner: 'hancock', move: '魅惑攻擊', text: '被你迷住的人會變成石頭。' },
  gasu: { name: '瓦斯瓦斯果實', kind: 'logia', rank: 3, owner: 'caesar', move: '毒氣', text: '身體能化為瓦斯，能抽走一個地方的氧氣。' },
  yuki: { name: '雪雪果實', kind: 'logia', rank: 2, owner: 'monet', move: '雪之爪', text: '身體能化為雪，暴風雪隨她的心意捲起。' },
  hobi: { name: '童趣果實', kind: 'paramecia', rank: 2, owner: 'sugar', move: '玩具化', text: '碰到的人會變成玩具，所有人都會忘記那個人。' },
  beta: { name: '黏黏果實', kind: 'paramecia', rank: 1, owner: 'trebol', move: '黏黏之矛', text: '全身能分泌黏液，黏住對手、也能點火燃燒。' },
  ishi: { name: '石石果實', kind: 'paramecia', rank: 2, owner: 'pica', move: '石之巨人', text: '能和石頭融為一體，把整座城變成自己的身體。' },
  hira: { name: '飄飄果實', kind: 'paramecia', rank: 1, owner: 'diamante', move: '飄飄之劍', text: '能讓碰到的東西像旗子一樣飄動，鋼鐵也一樣。' },
  zushi: { name: '重重果實', kind: 'paramecia', rank: 3, owner: 'fujitora', move: '重力刀', text: '能操縱重力，把天上的隕石拉下來。' },
  giro: { name: '透視果實', kind: 'paramecia', rank: 1, owner: 'viola', move: '透視之眼', text: '能看穿任何東西，連人心裡的記憶也看得見。' },
  soru: { name: '靈魂果實', kind: 'paramecia', rank: 3, owner: 'bigMom', move: '靈魂之火', text: '能奪走別人的壽命，把靈魂注進物體裡讓它們活過來。' },
  mochi: { name: '年糕果實', kind: 'paramecia', rank: 3, owner: 'katakuri', move: '年糕槍', text: '身體能化為年糕，伸縮自如、黏住一切。' },
  pero: { name: '糖果果實', kind: 'paramecia', rank: 1, owner: 'perospero', move: '糖果之牆', text: '能生出糖果，把人困在糖果裡。' },
  bisu: { name: '餅乾果實', kind: 'paramecia', rank: 2, owner: 'cracker', move: '餅乾士兵', text: '能做出餅乾，變成一整支餅乾士兵。' },
  mira: { name: '鏡子果實', kind: 'paramecia', rank: 1, owner: 'brulee', move: '鏡之世界', text: '能在鏡子之間穿梭，把人拉進鏡中世界。' },
  memo: { name: '記憶果實', kind: 'paramecia', rank: 1, owner: 'pudding', move: '記憶剪輯', text: '能把人的記憶像底片一樣剪下、拼上。' },
  uo: { name: '魚魚果實 幻獸種：青龍', kind: 'zoan', rank: 3, owner: 'kaido', move: '雷鳴八卦', text: '能化身為青龍，吐出熱息、喚來雷雲。' },
  ryuPtera: { name: '龍龍果實 古代種：無齒翼龍', kind: 'zoan', rank: 2, owner: 'king', move: '火焰', text: '能化身為無齒翼龍，在空中帶著火焰衝撞。' },
  ryuBrachio: { name: '龍龍果實 古代種：腕龍', kind: 'zoan', rank: 2, owner: 'queen', move: '病毒拳', text: '能化身為巨大的腕龍，用長頸橫掃一切。' },
  zouMammoth: { name: '象象果實 古代種：猛瑪象', kind: 'zoan', rank: 2, owner: 'jack', move: '象牙衝撞', text: '能化身為猛瑪象，象牙一撞就能掀翻船隊。' },
  inuMakami: { name: '犬犬果實 幻獸種：大口真神', kind: 'zoan', rank: 3, owner: 'yamato', move: '鳴鏑', text: '能化身為白狼神大口真神，冰之力守護一切。' },
  hebiOrochi: { name: '蛇蛇果實 幻獸種：八岐大蛇', kind: 'zoan', rank: 2, owner: 'orochi', move: '八岐之噬', text: '能化身為八頭的大蛇，砍掉一個頭還有別的頭。' },
  fude: { name: '筆筆果實', kind: 'paramecia', rank: 1, owner: 'kanjuro', move: '筆之刃', text: '畫出來的東西都會變成真的，動起來。' },
  nomi: { name: '腦腦果實', kind: 'paramecia', rank: 1, owner: 'vegapunk', move: '光束', text: '腦袋能無限地記住知識，是他一切發明的源頭。' },
  shiro: { name: '城堡果實', kind: 'paramecia', rank: 2, owner: 'bege', move: '城堡大砲', text: '身體裡藏著一座城堡，士兵和大砲都在裡面。' },
} as const satisfies Record<string, Fruit>
export type FruitId = keyof typeof fruits

type Ten = [string, string, string, string, string, string, string, string, string, string]
/** Ten moves per fruit, weakest first; the first is the fruit's signature move (fruits[id].move), the last its showpiece. */
export const fruitMoves: Record<FruitId, Ten> = {
  moku: ['白色煙霧', '白拳', '白蛇', '白色出口', '白色發射', '白色獵手', '煙霧纏繞', '白色煙幕', '白色煙霧・牢獄', '白色・大煙龍'],
  suna: ['沙漠之劍', '沙暴', '乾燥之手', '新月沙丘', '沙漠之泉', '地面乾涸', '沙漠囚牢', '流沙', '沙塵暴・重', '沙漠・大浪嵐'],
  goro: ['雷鳴', '放電', '雷光', '雷鳥', '雷獸', '雷龍', '神之裁決', '雷迎', '二億伏特・雷神', '萬雷・一億伏特'],
  mera: ['火拳', '十字火', '火銃', '火柱', '火達摩', '炎上網', '螢火・火達摩', '陽炎', '火拳・大炎', '大炎戒・炎帝'],
  magu: ['大噴火', '熔岩拳', '冥狗', '流星火山', '犬噛紅蓮', '熔岩之河', '赤犬之牙', '熔岩・大地', '大噴火・冥狗', '流星火山・滅'],
  hie: ['冰河時期', '冰劍', '冰塊・兩刃槍', '冰時計', '冰球', '冰塊・暴雉嘴', '冰之牢', '冰時間膠囊', '冰河時期・凍結海面', '冰河時期・千年冰封'],
  pika: ['八尺瓊勾玉', '光速踢', '天叢雲劍', '光之子彈', '八咫鏡', '閃光', '光之雨', '光速亂踢', '天叢雲劍・斬光', '八尺瓊勾玉・光之雨'],
  yami: ['黑洞', '黑渦', '黑繩', '闇水', '解放', '暗黑之拳', '闇穴道', '黑龍', '闇之吞噬', '闇穴道・黑洞吞噬'],
  hito: ['怪物強點', '腕力強化', '跳躍強化', '重量強化', '角強化', '毛皮強化', '刻蹄・櫻', '刻蹄・薔薇', '刻蹄・十字櫻', '怪物點・巨獸形態'],
  tori: ['不死鳥之焰', '鳳凰印', '青炎雁', '鶴翼', '鳳凰之爪', '藍炎・療癒', '不死鳥再生', '鳳凰・飛翔踢', '藍炎・蘇生之焰', '不死鳥・大翼'],
  ryu: ['恐龍衝撞', '古龍之尾', '暴龍撕咬', '古龍衝擊', '龍爪', '古龍之鞭', '大顎', '異龍・踐踏', '古龍・咆哮', '異龍・滅之顎'],
  ushi: ['指槍', '嵐腳', '長頸鹿・槍', '嵐腳・周斷', '麒麟之鼻', '長頸鹿・刀', '嵐腳・線', '四刀流・麒麟', '指槍・長頸鹿腳', '長頸鹿・六式亂舞'],
  neko: ['豹爪', '指槍・黃蓮', '嵐腳・凱鳥', '剃・豹', '指銃・斑', '豹爪・剃', '嵐腳・豹', '六王槍', '豹形態・嵐腳', '六王銃・豹'],
  yomi: ['靈魂出竅', '鼻歌三丁・矢筈斬', '冰凍斬', '黃泉之寒氣', '前奏曲・冰凍', '靈魂之劍', '靈魂・冰結', '夜想曲・冰河', '黃泉冷斬・魂之歌', '黃泉・魂之劍舞'],
  ope: ['房間・切割', '注射射擊', '交換', '指揮棒', '心臟摘除', '無線電刀', '反擊衝擊', '伽瑪刀', '王之房間・電擊', '穿刺・維勒'],
  jiki: ['磁力彈', '排斥', '磁力之臂', '磁力・刺蝟', '磁力・重砲', '龐克吉普森', '磁力・鐵牢', '磁力・破壞之軍', '龐克・雷槍', '電磁砲・天譴龐克'],
  toshi: ['老化拳', '返老還童', '大人化', '年齡操縱', '未來之姿', '孩童化', '歲月流逝', '扭曲的未來', '歲月・逆轉', '解放・未來之拳'],
  nikyu: ['彈飛', '熊之衝擊', '肉球砲', '彈飛・肉球', '壓力砲', '無痛彈', '熊之旅行', '肉球・連打', '肉球・無痛彈', '熊之衝擊・大氣壓'],
  ito: ['操縱線', '五色線', '超過熱', '寄生線', '白色線', '線之槍', '神誅殺', '鳥籠', '天夜叉・線之牢', '覺醒・線之海'],
  horo: ['負面幽靈', '迷你幽靈', '特別幽靈・爆', '負面霍洛霍洛', '幽體離脫', '幽靈・跟蹤', '幽靈之城', '特別幽靈・連爆', '負面・幽靈大軍', '幽靈・大負面'],
  doru: ['蠟拳', '蠟劍', '蠟弓', '蠟牆', '蠟之槍', '蠟之鎧', '蠟之刃', '蠟・蛋糕之城', '蠟・巨像', '蠟之冠・大鎚'],
  baku: ['吞噬砲擊', '啃食', '吞噬・重組', '啃啃・大砲', '啃啃・鐵拳', '吞噬・刀刃', '啃啃・合體', '瓦波爾之屋', '啃啃・巨砲', '啃啃・大軍'],
  dia: ['鑽石拳', '鑽石・衝撞', '鑽石之臂', '鑽石・連拳', '鑽石・投擲', '鑽石・巨冰投', '鑽石・崩擊', '鑽石・碎岩', '鑽石・獅子之鬃', '鑽石・大投'],
  bara: ['分離攻擊', '分離・飛刀', '分離・快速移動', '分裂亂舞', '巴其球', '分離・八方', '分離・飛拳', '巴其・特製大砲', '分離・巴其大砲', '巴其・大分離'],
  hana: ['千紫萬紅', '六輪開花', '雙臂開花・扭轉', '十二輪開花・掐', '百花繚亂', '雙手・翼', '千手・大樹', '巨大樹', '千紫萬紅・巨大樹', '惡魔之手・大樹'],
  kage: ['影之軍團', '影之刃', '影之箱', '影子・蝙蝠', '影之革命', '影子・人偶', '影子・吞噬', '影之軍團・突擊', '影之軍團・百鬼夜行', '影子・大革命'],
  doku: ['毒龍', '毒雲', '毒之拳', '毒龍・怒濤', '毒之雨', '地獄審判', '毒之巨兵', '毒龍・三頭', '毒龍・地獄', '毒之巨兵・大審判'],
  mane: ['芭蕾踢', '複製攻擊', '天鵝踢', '芭蕾・旋轉', '天鵝・連踢', '白鳥之翼', '模仿・猛擊', '芭蕾・急襲', '芭蕾・大回旋', '天鵝・天上之舞'],
  wara: ['稻草人反擊', '稻草之劍', '稻草之釘', '稻草人・詛咒', '稻草・千本針', '稻草人・傷害轉移', '稻草・大蛇', '稻草人・惡魔', '稻草人・咒怨', '稻草・大人偶'],
  doa: ['空間門', '門之連擊', '穿門', '空間・連門', '空間・大門', '空氣門', '門之奇襲', '穿越之拳', '門・牢籠', '空氣門・大反擊'],
  awa: ['泡泡擒拿', '泡泡洗滌', '光滑泡泡', '泡泡・洗淨', '泡泡之鞭', '泡泡・潤滑', '泡泡・大浪', '泡泡・連鞭', '泡泡・淨化', '泡泡・大洗淨'],
  gura: ['地震拳', '震地', '海嘯', '震動・空間', '海震', '震動・薙刀', '大氣震動', '震動・地崩', '震動・世界', '震動・天地崩裂'],
  bane: ['彈簧衝撞', '彈簧連撞', '彈簧跳躍', '彈簧・狙擊', '彈簧・蚱蜢', '彈簧・鐵拳', '彈簧・暴走', '彈簧・亂舞', '彈簧・流星', '彈簧・地獄衝撞'],
  horm: ['荷爾蒙注射', '荷爾蒙・活力', '死亡之眼', '地獄閃耀', '地獄・眨眼', '荷爾蒙・腎上腺', '顏面・巨大化', '荷爾蒙・大轉換', '荷爾蒙・覺醒', '伊娃・大眨眼'],
  mero: ['魅惑攻擊', '魅惑・慢', '芳香腳', '甜蜜吻', '戀之箭', '芳香・連腳', '魅惑・百矢', '石化之吻', '魅惑・石化之光', '魅惑・千本箭'],
  gasu: ['毒氣', '瓦斯爆破', '氧氣抽離', '毒氣之槍', '瓦斯・刀', '瓦斯・巨人', '瓦斯・火焰', '死神・毒氣彈', '瓦斯・大爆炸', '死神・瓦斯大軍'],
  yuki: ['雪之爪', '雪兔', '白色地獄', '雪之陷阱', '雪之鞭', '暴風雪', '冰雪城牆', '雪崩', '雪之女王・吹雪', '雪之女王・白魔'],
  hobi: ['玩具化', '契約', '玩具之手', '遺忘之觸', '玩具之舞', '玩具士兵', '葡萄之觸', '玩具之家的命令', '玩具之國', '忘卻之夜'],
  beta: ['黏黏之矛', '黏液網', '黏黏之錘', '黏黏火燒', '黏黏之鞭', '黏黏・陷阱', '黏黏・鳥餅', '黏黏・大爆發', '黏黏火燒・大火', '黏黏・世界'],
  ishi: ['石之巨人', '石之拳', '石刃', '石之牆', '石之槍', '石之巨劍', '岩之海', '石之巨像・崩落', '石之巨人・踏碎', '石・城下崩落'],
  hira: ['飄飄之劍', '飄飄披風', '鋼鐵之旗', '飄飄斬', '飄飄・刀槍', '飄飄・旗槍', '飄飄・鐵板', '英雄之劍', '飄飄・大劍舞', '英雄・飄飄大斬'],
  zushi: ['重力刀', '重力壓制', '猛虎', '重力之牢', '重力・紫', '重力・浮岩', '重力刀・猛虎', '隕石召喚', '隕石之刀', '重力・大隕石'],
  giro: ['透視之眼', '心之窺視', '千里眼', '記憶之眼', '淚之劍', '心之破碎', '千里眼・洞察', '透視・弱點', '透視・心之鏡', '千里眼・全知'],
  soru: ['靈魂之火', '雷雲之拳', '壽命奪取', '普羅米修斯', '宙斯', '拿破崙', '天上之火', '神火・不知火', '雷霆・天上之拳', '靈魂・萬國之火'],
  mochi: ['年糕槍', '年糕之拳', '力餅', '流浪年糕', '柏餅', '焦餅・切', '年糕・巨人', '斬・切餅', '力餅・燒', '流星年糕・千手'],
  pero: ['糖果之牆', '糖果之槍', '糖果之蛇', '糖果牢籠', '糖果之鞭', '糖果・蠟像', '糖果・陷阱', '糖果・巨蛇', '糖果・大波', '糖果・大地獄'],
  bisu: ['餅乾士兵', '餅乾劍', '餅乾盔甲', '普茲劍', '餅乾・巨劍', '餅乾・連斬', '千手餅乾', '普茲・大劍', '餅乾・大軍', '千手・餅乾大軍'],
  mira: ['鏡之世界', '鏡之反射', '鏡之門', '鏡之分身', '鏡之刃', '鏡之陷阱', '鏡之迷宮', '鏡・千面', '鏡中世界・閉鎖', '鏡中世界・崩壞'],
  memo: ['記憶剪輯', '記憶之底片', '遺忘', '記憶之剪刀', '三隻眼', '記憶竄改', '記憶之迴廊', '記憶・重組', '記憶・全部剪掉', '記憶・全面消除'],
  uo: ['雷鳴八卦', '熱息', '龍卷', '壞風', '金剛鏑', '白雷', '火龍大炬', '降三世・引奈落', '龍卷・壞風', '雷鳴八卦・剛'],
  ryuPtera: ['火焰', '翼之斬', '烈火之爪', '炎上衝撞', '火焰・急降', '炎之翼', '皇帝劍・破刃', '炎・無齒翼龍', '皇帝劍・宴', '炎・大翼'],
  ryuBrachio: ['病毒拳', '長頸橫掃', '巨尾', '腕龍衝撞', '武裝色・黑腕', '冰鬼病毒', '腕龍・粉碎', '腕龍・重踏', '腕龍・大地震', '腕龍・大衝擊'],
  zouMammoth: ['象牙衝撞', '象鼻之鞭', '猛瑪踐踏', '象牙・雙斬', '猛瑪・突進', '象鼻・巨擊', '象牙・大衝撞', '猛瑪・大踐踏', '猛瑪象・大災', '旱災・大象牙'],
  inuMakami: ['鳴鏑', '冰之牙', '冰狼之咆', '神速', '冰之結界', '白狼・突擊', '無賴男・鳴鏑', '冰狼・八卦', '大口真神・冰狼', '冰之神・大鳴鏑'],
  hebiOrochi: ['八岐之噬', '蛇之咬', '蛇之纏', '毒牙', '八頭齊噬', '大蛇之鞭', '大蛇・橫掃', '蛇頭・連噬', '八岐大蛇・吞天', '八岐大蛇・八首亂舞'],
  fude: ['筆之刃', '墨之鳥', '墨之刀', '墨之大蛇', '畫中火', '畫中雨', '墨之火龍', '墨之軍勢', '墨之大鬼', '墨之大鬼・炎'],
  nomi: ['光束', '電擊網', '雷射炮', '電磁網', '發明・鐵拳', '光束砲', '雷射・連射', '光束・掃射', '巨大光束', '科學・終極光束'],
  shiro: ['城堡大砲', '城牆衝撞', '開砲', '城中士兵', '大砲・連射', '要塞・全砲門', '城堡・巨人', '要塞・大砲', '城堡・總攻擊', '城堡・大進擊'],
}
/** Character levels at which each of the ten fruit moves is learned: the power keeps growing all the way to level 70. */
export const moveLevels = [1, 5, 10, 15, 20, 30, 40, 50, 60, 70] as const
/** Cost tier of each of the ten moves (spec §7.4: special 3, advanced 5, flurry 7 STA). */
export const moveStyles = ['special', 'special', 'special', 'special', 'advanced', 'advanced', 'advanced', 'advanced', 'flurry', 'flurry'] as const

/** NPC → the fruit they carry. Luffy's is left out on purpose: the story depends on it staying with him. */
export const fruitOf: Partial<Record<NpcId, FruitId>> = Object.fromEntries(
  (Object.entries(fruits) as [FruitId, Fruit][]).map(([id, fruit]) => [fruit.owner, id])) as Partial<Record<NpcId, FruitId>>

/** Auction price by rank. */
export const fruitPrice: Record<Fruit['rank'], number> = { 1: 50_000_000, 2: 100_000_000, 3: 300_000_000 }
/** Hours between a fruit being let go and it turning up at the auction. */
export const driftHours = 72

/** Extra damage a fruit adds to every blow. */
/** Damage a fruit adds to every blow: +1 per 4 levels up to 30, then +1 per 10 (like the levels' own growth, it slows). */
export const fruitDamage = (fruit: FruitId | undefined, level: number) =>
  fruit ? 1 + fruits[fruit].rank + Math.floor(Math.min(level, 30) / 4) + Math.floor(Math.max(0, level - 30) / 10) : 0
export const isLogia = (fruit: FruitId | undefined) => !!fruit && fruits[fruit].kind === 'logia'

/** Starts the drift: the fruit is on the market after three days, and the paper says so. */
export function releaseFruit(world: World, id: FruitId, from: NpcId) {
  ;(world.fruitLost ??= {})[from] = true
  ;(world.fruitStalls ??= []).push({ fruit: id, from, ready: world.minute + driftHours * 60 })
  queuePaper(world, '【報紙】傳聞' + npcs[from] + '身上的' + fruits[id].name + '流落在外，據說三天後會在夏波帝的人口拍賣所露面。')
}

registerFruitKinds(fruit => fruits[fruit as FruitId]?.kind)

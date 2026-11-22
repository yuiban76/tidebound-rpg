// Devil fruits. A fruit belongs to one NPC; when a player party knocks that NPC down, the player who landed the last blow
// may eat it (taking the power) or let it go. A fruit that is let go drifts into the world and shows up at the Sabaody
// auction house three days later. There is only ever one of each, and nobody may eat two.
import type { NpcId } from '../shared/protocol.ts'
import { npcs } from '../shared/protocol.ts'
import { queuePaper } from './flags.ts'
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
} as const satisfies Record<string, Fruit>
export type FruitId = keyof typeof fruits

/** Five moves per fruit; the first is the fruit's signature move (fruits[id].move). */
export const fruitMoves: Record<FruitId, [string, string, string, string, string]> = {
  moku: ['白色煙霧', '白蛇', '白色出口', '白色煙霧纏繞', '白色煙霧・牢獄'],
  suna: ['沙漠之劍', '沙漠之泉', '乾燥之手', '沙塵暴', '沙漠・大浪嵐'],
  goro: ['雷鳴', '放電', '雷鳥', '雷霆', '雷神・萬雷'],
  mera: ['火拳', '十字火', '火達摩', '炎上網', '大炎戒・炎帝'],
  magu: ['大噴火', '熔岩拳', '冥狗', '流星火山', '大噴火・冥狗'],
  hie: ['冰河時期', '冰塊時代', '冰時計', '冰塊暴雉嘴', '冰河時期・凍結海面'],
  pika: ['八尺瓊勾玉', '光速踢', '天叢雲劍', '八咫鏡', '八咫鏡・光速亂踢'],
  yami: ['黑洞', '黑繩', '闇水', '解放', '闇穴道・黑洞吞噬'],
  hito: ['怪物強點', '腕力強化', '跳躍強化', '強化點・重點', '怪物點・巨獸形態'],
  tori: ['不死鳥之焰', '鳳凰印', '青炎雁', '不死鳥再生', '藍炎・蘇生之焰'],
  ryu: ['恐龍衝撞', '古龍之尾', '暴龍撕咬', '古龍衝擊', '古龍・咆哮'],
  ushi: ['指槍', '嵐腳', '鐵塊', '指槍・長頸鹿腳', '長頸鹿・六式亂舞'],
  neko: ['豹爪', '剃', '鐵塊・剛', '豹爪・剃', '豹形態・嵐腳'],
  yomi: ['靈魂出竅', '鼻歌三丁・矢筈斬', '冰凍斬', '黃泉之寒氣', '黃泉冷斬・魂之歌'],
  ope: ['房間・切割', '注射射擊', 'Shambles', 'Gamma Knife', '反擊衝擊'],
  jiki: ['磁力彈', '排斥', '磁力・重砲', '磁力・刺蝟', '磁力・破壞之軍'],
  toshi: ['老化拳', '返老還童', '大人化', '年齡操縱', '歲月・逆轉'],
  nikyu: ['彈飛', '熊之衝擊', '肉球砲', '彈飛・肉球', '肉球・無痛彈'],
  ito: ['操縱線', '五色線', '超過熱', '鳥籠', '天夜叉・線之牢'],
  horo: ['負面幽靈', '迷你幽靈', '特別幽靈・爆', '負面霍洛霍洛', '負面・幽靈大軍'],
  doru: ['蠟拳', '蠟劍', '蠟弓', '蠟牆', '蠟・巨像'],
  baku: ['吞噬砲擊', '啃食', '吞噬・重組', '啃啃・大砲', '啃啃・巨砲'],
  dia: ['鑽石拳', '鑽石盾', '鑽石・衝撞', '鑽石壁', '鑽石・獅子之鬃'],
  bara: ['分離攻擊', '分離・飛刀', '分離・快速移動', '分裂亂舞', '分離・巴其大砲'],
  hana: ['千紫萬紅', '六輪開花', '雙臂開花・扭轉', '千手・大樹', '千紫萬紅・巨大樹'],
  kage: ['影之軍團', '影之刃', '影之盾', '影之軍團・突擊', '影之軍團・百鬼夜行'],
  doku: ['毒龍', '毒雲', '毒之拳', '毒龍・怒濤', '毒龍・地獄'],
  mane: ['芭蕾踢', '複製攻擊', '天鵝踢', '芭蕾・旋轉', '芭蕾・大回旋'],
  wara: ['稻草人反擊', '稻草人迴避', '稻草之釘', '稻草人・詛咒', '稻草人・傷害轉移'],
  doa: ['空間門', '門之連擊', '穿門', '空間・連門', '空間・大門'],
  awa: ['泡泡擒拿', '泡泡洗滌', '光滑泡泡', '泡泡・洗淨', '泡泡・淨化'],
  gura: ['地震拳', '震地', '海嘯', '震動・空間', '震動・地崩'],
  bane: ['彈簧衝撞', '彈簧連撞', '彈簧跳躍', '彈簧・狙擊', '彈簧・暴走'],
  horm: ['荷爾蒙注射', '荷爾蒙・活力', '死亡之眼', '地獄閃耀', '荷爾蒙・大轉換'],
  mero: ['魅惑攻擊', '魅惑・慢', '芳香腳', '甜蜜吻', '魅惑・石化之光'],
}
/** Character levels at which each of the five fruit moves is learned. */
export const moveLevels = [1, 3, 6, 9, 12] as const
/** Cost tier of each of the five moves (spec §7.4: special 3, advanced 5, flurry 7 STA). */
export const moveStyles = ['special', 'special', 'advanced', 'advanced', 'flurry'] as const

/** NPC → the fruit they carry. Luffy's is left out on purpose: the story depends on it staying with him. */
export const fruitOf: Partial<Record<NpcId, FruitId>> = Object.fromEntries(
  (Object.entries(fruits) as [FruitId, Fruit][]).map(([id, fruit]) => [fruit.owner, id])) as Partial<Record<NpcId, FruitId>>

/** Auction price by rank. */
export const fruitPrice: Record<Fruit['rank'], number> = { 1: 2_000_000, 2: 5_000_000, 3: 12_000_000 }
/** Hours between a fruit being let go and it turning up at the auction. */
export const driftHours = 72

/** Extra damage a fruit adds to every blow. */
export const fruitDamage = (fruit: FruitId | undefined, level: number) => fruit ? 1 + fruits[fruit].rank + Math.floor(level / 4) : 0
export const isLogia = (fruit: FruitId | undefined) => !!fruit && fruits[fruit].kind === 'logia'

/** Starts the drift: the fruit is on the market after three days, and the paper says so. */
export function releaseFruit(world: World, id: FruitId, from: NpcId) {
  ;(world.fruitLost ??= {})[from] = true
  ;(world.fruitStalls ??= []).push({ fruit: id, from, ready: world.minute + driftHours * 60 })
  queuePaper(world, '【報紙】傳聞' + npcs[from] + '身上的' + fruits[id].name + '流落在外，據說三天後會在夏波帝的人口拍賣所露面。')
}

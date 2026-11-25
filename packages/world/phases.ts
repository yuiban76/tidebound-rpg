// How each canon event shows up before and after it happens (spec §6.2): a rumor, a warning, and a short aftermath.
// Events with a `scene` become a playable stand-off when the party is on the island and the villain is there.
import type { NpcId } from '../shared/protocol.ts'

export type EventPhases = {
  /** Heard on the island about 36 hours ahead, e.g. as a tavern rumor. */
  omen?: string
  /** Heard on the island about 6 hours ahead: it is about to happen. */
  warn?: string
  /** Heard on the island about 12 hours after it happened. */
  after?: string
  /** Hours before the event for omen / warn, and after it for the aftermath. */
  lead?: { omen?: number, warn?: number, after?: number }
  /** The first matching entry moves the event: negative hours bring it forward, positive ones delay it. */
  shifts?: { when: string[], hours: number }[]
  /** A stand-off with the villain. The players have `minutes` to beat him; if they do the outcome changes. */
  scene?: { foe: NpcId, minutes: number, intro: string }
}

export const eventPhases: Record<string, EventPhases> = {
  shells: {
    omen: '酒館裡有人說，謝爾茲鎮基地廣場綁著一個叫索隆的劍士，誰也不敢靠近。',
    warn: '有一艘小船載著戴草帽的少年靠岸，他直直往海軍基地走去。',
    after: '基地廣場空蕩蕩的，士兵們還沒回過神來。',
  },
  orange: {
    omen: '水手說橘子鎮被小丑巴其海賊團佔了，居民躲在家裡不敢出聲。',
    warn: '橘子鎮方向傳來爆炸聲，海賊團似乎正在和誰起衝突。',
  },
  syrup: {
    omen: '西羅布村的騙人布又在喊「海賊來了」，這次他說海岸有黑貓海賊團的影子。',
    warn: '天快亮了，海岸邊的黑貓海賊團開始集結，今晚恐怕不會平靜。',
    after: '村民望著黎明的海面，不確定昨夜發生的是夢還是真的。',
    scene: { foe: 'klahadore', minutes: 180, intro: '黎明前的海岸邊，黑貓海賊團的人影逼近村子，管家克拉哈德正獨自站在宅邸前。現在動手，還來得及阻止他。' },
  },
  baratie: {
    omen: '航海人都說海上餐廳巴拉蒂最近客人特別凶，副料理長整天在叫人滾出去。',
    warn: '外海出現一艘滿是傷痕的巨艦，旗幟是首領・克利克海賊團。',
    after: '餐廳的甲板上滿是碎木板，廚師們一邊罵一邊收拾。',
  },
  arlong: {
    omen: '可可亞西村的人們低著頭交保護費，惡龍樂園的魚人們最近特別暴躁。',
    warn: '惡龍樂園的方向傳出怒吼聲，今天恐怕有人要翻天了。',
    after: '村民們站在街上，不敢相信八年的陰影真的散了。',
    shifts: [{ when: ['task:cocoyasi'], hours: -8 }],
    scene: { foe: 'arlong', minutes: 240, intro: '惡龍樂園的大門前，魚人惡龍正得意地俯瞰著村民。趁這一天還沒結束，你們有機會挑戰他。' },
  },
  loguetown: {
    omen: '羅格鎮來了一個新的賞金首，聽說處刑台已經準備好了。',
    warn: '處刑台旁聚了一大群人，天色驟暗，雷雲正在逼近。',
  },
  whisky: {
    omen: '威士忌山峰的居民熱情得詭異，每個海賊上岸都被請去喝酒。',
    warn: '山峰上的歡迎宴會已經準備妥當，今晚的賓客恐怕沒有人能全身而退。',
  },
  littleGarden: {
    omen: '商船說小花園一年到頭有兩個巨人在決鬥，他們已經打了一百年。',
    warn: '叢林深處傳來震耳欲聾的金屬撞擊聲，決鬥快分出勝負了。',
  },
  drum: {
    omen: '磁鼓島的冬夜特別冷，聽說山頂的城堡亮起了不尋常的燈光。',
    warn: '雪越下越大，山頂城堡的方向傳來陣陣爆炸聲。',
    after: '粉紅色的雪還在飄，島民們抬頭看著夜空發呆。',
  },
  alabastaMarch: {
    omen: '阿拉巴斯坦各地盛傳一種「雨之粉」，說是國王害得王國沒了雨。',
    warn: '叛亂軍的營火佈滿沙漠，明天一早就要出發了。',
  },
  alabasta: {
    omen: '阿爾巴那城內人心惶惶，親衛隊整天巡邏卻查不出是誰在搗亂。',
    warn: '首都外的沙漠聚集了大批叛亂軍，今天恐怕要決一死戰。',
    after: '久違的雨水打在街道上，人們捧著水，說不出話來。',
    shifts: [{ when: ['task:alabasta'], hours: -12 }],
    scene: { foe: 'crocodile', minutes: 240, intro: '阿爾巴那王宮前，克洛克達爾已經走到了他計畫的最後一步。要阻止他，只有現在。' },
  },
  jaya: {
    omen: '加亞島的老海賊說，下一次衝天海流就在這幾天，他們已經等很久了。',
    warn: '海面的水位開始異常升高，有船影正靠近衝天海流的入口。',
  },
  skypiea: {
    omen: '空島的雲海傳出神官的命令：外來者又入侵了，守護神域。',
    warn: '聖地的天空閃起一道道雷光，今天恐怕有一場決戰。',
    after: '黃金鐘的餘音還在雲海上迴盪。',
    scene: { foe: 'enel', minutes: 240, intro: '黃金鐘塔下的雷光越來越亮，艾涅爾正站在神殿頂端俯視一切。想阻止他，只有現在。' },
  },
  w7Gold: {
    lead: { omen: 10, warn: 2, after: 6 },
    omen: '港口的小混混在打聽一艘掛著草帽旗的船，說船上有一大筆黃金。',
    warn: '佛朗基一家的小船從四面八方的水道靠了過來。',
    after: '後街有人說，佛朗基之家只剩下一堆木頭。',
  },
  w7Merry: {
    lead: { omen: 10, warn: 2, after: 6 },
    omen: '船塢的船匠說，昨天送來的那艘羊頭船，傷得比看起來重得多。',
    warn: '卡庫從羊頭船上下來，臉色很凝重。',
    after: '船塢裡沒有人大聲說話。',
  },
  w7Duel: {
    lead: { omen: 10, warn: 2, after: 6 },
    omen: '草帽一夥的船上傳出爭吵聲，有人摔門離開。',
    warn: '港口的風停了，兩個人影隔著一艘船對峙。',
    after: '港口邊只剩下一個人，抱著膝蓋坐在羊頭船旁。',
  },
  w7Shot: {
    lead: { omen: 10, warn: 2, after: 6 },
    omen: '市長冰山最近常常一個人待到深夜，祕書說他誰也不見。',
    warn: '半夜的宅邸閃過幾個戴面具的影子。',
    after: '到處都貼上了草帽一夥的通緝單，風向變了。',
  },
  w7Mansion: {
    lead: { omen: 10, warn: 2, after: 6 },
    omen: '宅邸四周站滿了拿著工具的船匠，他們說今晚誰也別想靠近冰山。',
    warn: '有人在宅邸屋頂上，撕下了臉上的面具。',
    after: '宅邸還在冒煙，船匠們不敢相信兇手是每天一起吃飯的人。',
  },
  water7: {
    lead: { omen: 10, warn: 2, after: 6 },
    omen: '車站被黑衣人封鎖了，一般班次全部停開。',
    warn: '往司法島的海列車已經升火，車上的旗子是世界政府的。',
    after: '車站空了，鐵軌一路通進黑漆漆的海裡。',
  },
  w7Laguna: {
    lead: { omen: 10, warn: 2, after: 6 },
    omen: '海水退得不像話，老人說今年的大潮特別凶。',
    warn: '遠方的海平面，比屋頂還高。',
    after: '後街泡在水裡，鐘樓上還掛著一艘小船。',
  },
  enGate: {
    lead: { omen: 3, warn: 1, after: 2 },
    omen: '守門的巨人說，今天不准任何人過這扇門。',
    warn: '海上有一列沒有煞車的火車，正朝正門撞過來！',
    after: '正門倒了一半，守軍到處在找巨人。',
  },
  enCourt: {
    lead: { omen: 3, warn: 1, after: 2 },
    omen: '法院的鐘響個不停，守軍全都往屋頂跑。',
    warn: '有一群人爬上了法院屋頂，隔著瀑布望向司法塔。',
    after: '司法島上空，世界政府的旗子燒出了一個洞。',
  },
  enTower: {
    lead: { omen: 3, warn: 1, after: 2 },
    omen: '司法塔裡傳出打鬥聲，每一層都有。',
    warn: 'CP9 把鑰匙分開帶在身上，笑著說一把一把來搶。',
    after: '司法塔的牆一面一面地倒。',
  },
  enies: {
    lead: { omen: 3, warn: 1, after: 2 },
    omen: '有人看見斯潘達姆拖著一個女人往正義之門去。',
    warn: '猶豫橋的另一頭，正義之門正在打開。',
    after: '橋斷了一半，海面上漂著一頂禮帽。',
    scene: { foe: 'lucci', minutes: 120, intro: '通往正義之門的橋墩裡，路基擋住了去路。這是搶回羅賓的最後機會。' },
  },
  enBuster: {
    lead: { omen: 3, warn: 1, after: 2 },
    omen: '斯潘達姆的手在發抖，他好像按錯了什麼。',
    warn: '海平面上出現了十艘軍艦。',
    after: '海面上只剩下濃煙。',
  },
  enMerry: {
    lead: { omen: 3, warn: 1, after: 2 },
    omen: '有人說聽見了聲音，像是在叫大家往海裡看。',
    warn: '砲火之間，有一艘很小的船正在靠近。',
    after: '沒有人說話，海上飄起了細細的雪。',
  },
  w7Garp: {
    lead: { omen: 10, warn: 2, after: 6 },
    omen: '港口來了一艘狗頭軍艦，船上的老人一直在吃仙貝。',
    warn: '一名老海軍朝船塢走去，說要給孫子一記愛的鐵拳。',
    after: '船塢的牆上多了一個拳頭大的洞。',
  },
  w7Sunny: {
    lead: { omen: 10, warn: 2, after: 6 },
    omen: '船塢日夜敲敲打打，蓋著布的船台上傳來獅子的輪廓。',
    warn: '佛朗基一家在船塢外排成一列，每個人都在哭。',
    after: '船台空了，船匠們睡得東倒西歪。',
  },
  w7Usopp: {
    lead: { omen: 10, warn: 2, after: 6 },
    omen: '有人在後街對著牆練習道歉，練了一整晚。',
    warn: '獅頭船已經升帆，岸上有人一邊跑一邊喊。',
    after: '獅頭船飛過了海軍的頭頂，消失在海平面。',
  },
  aceCaptured: {
    omen: '報紙上說火拳艾斯正在海上追捕黑鬍子，已經好幾天沒有消息。',
    warn: '海軍巡邏艦收到急電：白鬍子海賊團的隊長出事了。',
  },
  thriller: {
    omen: '航海者都說，有一座像鬼船的島正在偉大航路上漂流。',
    warn: '怪霧漸濃，島上的僵屍開始出動，今晚恐怕沒人睡得著。',
    after: '霧散了，天空露出了久違的太陽。',
    scene: { foe: 'moria', minutes: 240, intro: '摩利亞的宅邸燈火通明，影子的收集已經到了最後階段。現在還來得及阻止他。' },
  },
  sabaody: {
    omen: '夏波帝諸島的人口拍賣所今晚有稀有商品，據說有人魚。',
    warn: '拍賣所門口排滿了貴客，天龍人的轎子正朝這裡走來。',
    shifts: [{ when: ['task:sabaody'], hours: 6 }],
  },
  kuma: {
    omen: '海軍在夏波帝一帶增派了大批兵力，似乎有大人物要來。',
    warn: '天空忽然出現一道巨大的影子，有人正朝這邊逼近。',
  },
  execution: {
    omen: '海軍本部的通訊兵連夜發出密電，有大事要宣布。',
    warn: '海軍本部公布了公告，頭條就是火拳艾斯的處刑日。',
    shifts: [{ when: ['task:impelDown'], hours: 72 }],
  },
  aceTransfer: {
    omen: '推進城的獄卒傳出消息：最底層的死刑犯要被轉移了。',
    warn: '押送艦已經在港口升帆，艾斯即將被帶出牢房。',
  },
  warBegins: {
    omen: '世界各地的海賊與海軍都收到了消息：馬林福特將發生史上最大的戰事。',
    warn: '馬林福特外海的海面沸騰了，白鬍子的大艦隊逼近。',
    shifts: [{ when: ['task:impelDown'], hours: 24 }],
  },
  // The war day's stages: heard only on Marineford, two hours and one hour ahead, so the party knows what is coming next.
  warSquard: {
    lead: { omen: 2, warn: 1, after: 2 },
    omen: '傘下的船長們之間流傳著一張海軍的告示，說白鬍子打算拿他們換艾斯的命。',
    warn: '斯庫亞多握著刀的手在發抖，一步步走向白鬍子身後。',
  },
  warWall: {
    lead: { omen: 2, warn: 1, after: 2 },
    omen: '海灣四周的地面傳來轟隆聲，像有巨大的機關正在啟動。',
    warn: '鋼鐵的包圍牆開始從海灣邊緣升起，小奧茲Jr.拖著船加快了腳步。',
  },
  warLuffy: {
    lead: { omen: 2, warn: 1, after: 2 },
    omen: '海軍的通訊兵大喊：推進城出事了，有一艘軍艦被搶走。',
    warn: '有人指著天空大叫：上面有東西掉下來了！',
  },
  warRescue: {
    lead: { omen: 2, warn: 1, after: 2 },
    omen: '奧利斯廣場上，海軍的人牆越來越厚，卡普站在最前面。',
    warn: '處刑台上的劊子手舉起了刀。',
  },
  warAkainu: {
    lead: { omen: 2, warn: 1, after: 2 },
    omen: '赤犬沒有去追別人，只盯著艾斯逃走的方向。',
    warn: '赤犬的拳頭冒出岩漿，一步步逼近兄弟倆。',
  },
  warTeach: {
    lead: { omen: 2, warn: 1, after: 2 },
    omen: '白鬍子說要留下來斷後，叫兒子們全部上船。',
    warn: '黑鬍子一夥扛著一塊巨大的黑布出現在海灣邊。',
  },
  warEnds: {
    omen: '馬林福特的炮聲日夜不停，戰況越來越慘烈。',
    warn: '戰場上空的硝煙散去了一半，最後的決戰就要見分曉。',
    after: '戰場上一片沉默，只有海浪聲。',
  },
}

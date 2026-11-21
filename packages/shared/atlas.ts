// Names of the canon islands, places and people from East Blue to Marineford.
// Pure data with no imports so protocol.ts can derive its literal id types from it.
// Rich data (roles, facts, quests, lanes, timeline) lives in packages/world/canon.ts.

export const canonIslandIds = [
  'syrup', 'baratie', 'cocoyasi', 'loguetown',
  'twinCape', 'whiskyPeak', 'littleGarden', 'drum', 'alabasta', 'jaya', 'skypiea',
  'water7', 'eniesLobby', 'thrillerBark', 'sabaody', 'amazonLily', 'impelDown', 'marineford',
] as const

export const canonLocations = {
  syrupPort: '西羅布村海岸', syrupVillage: '西羅布村', kayaMansion: '可雅的宅邸',
  baratiePort: '巴拉蒂停泊處', baratieHall: '巴拉蒂大廳', baratieKitchen: '巴拉蒂廚房',
  cocoyasiPort: '可可亞西港', cocoyasiVillage: '可可亞西村', arlongPark: '惡龍樂園',
  loguePort: '羅格鎮港', logueSquare: '處刑台廣場', logueShop: '一本松武器店',
  twinPort: '雙子岬港灣', capeLighthouse: '雙子岬燈塔', laboonBay: '拉布的海灣',
  whiskyPort: '威士忌山峰港', whiskyTown: '威士忌山峰鎮', cactusRock: '仙人掌岩頂',
  gardenShore: '小花園海岸', giantsArena: '巨人決鬥場', waxHouse: '蠟燭屋',
  drumShore: '磁鼓島海岸', bighorn: '大角鎮', drumCastle: '磁鼓城',
  nanohana: '那諾哈娜', rainbase: '雨地', alubarna: '阿爾巴那',
  mockPort: '莫克鎮港', mockTown: '莫克鎮', cricketHouse: '庫力克斯的家',
  angelBeach: '天使海灘', upperYard: '上層雲', godShrine: '神之社',
  water7Port: '七水之都港', galleyLa: '卡雷拉公司船塢', frankyHouse: '佛朗基之家',
  eniesGate: '司法島正門', justiceTower: '司法塔', gateOfJustice: '正義之門',
  thrillerDock: '恐怖三桅帆船停泊處', graveyard: '墓園', moriaMansion: '摩利亞的宅邸',
  sabaodyGrove: '夏波帝13號樹', auctionHouse: '人口拍賣所', shakkyBar: '夏琪的酒吧',
  kujaPort: '九蛇港', kujaCastle: '九蛇城', amazonForest: '女兒島森林',
  impelGate: '推進城正門', impelLevel5: '推進城第五層', impelLevel6: '推進城第六層',
  marinefordBay: '馬林福特海灣', scaffold: '馬林福特處刑台', hqFortress: '海軍本部要塞',
} as const

export const canonNpcs = {
  usopp: '騙人布', kaya: '可雅', klahadore: '管家克拉哈德',
  zeff: '哲夫', sanji: '香吉士',
  genzo: '阿健', nojiko: '諾琪高', arlong: '惡龍',
  smoker: '斯摩格', ipponmatsu: '一本松',
  crocus: '庫卡斯', laboon: '拉布',
  vivi: '薇薇', igaram: '伊卡萊姆',
  dorry: '東利', brogy: '布洛基',
  dalton: '多爾頓', kureha: '古蕾娃', chopper: '喬巴',
  pell: '貝爾', cobra: '寇布拉國王', crocodile: '克洛克達爾',
  bellamy: '貝拉米', cricket: '庫力克斯',
  ganfall: '甘・佛爾', enel: '艾涅爾',
  iceburg: '冰山', franky: '佛朗基',
  spandam: '斯潘達姆', lucci: '羅布・路基', robin: '妮可・羅賓',
  brook: '布魯克', moria: '月光・摩利亞',
  rayleigh: '雷利', shakky: '夏琪',
  hancock: '波雅・漢考克', nyon: '尼歐魯皇太后',
  magellan: '麥哲倫', ivankov: '伊娃可夫', ace: '艾斯',
  sengoku: '戰國', whitebeard: '白鬍子',
} as const

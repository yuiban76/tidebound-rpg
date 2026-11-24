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

/** Canon landmarks added beyond each island's first three places (layouts in packages/world/sites.ts). */
export const addedLocations = {
  shellsDiner: '謝爾茲鎮的餐館', shellsWall: '基地圍牆外',
  buggyBar: '巴其佔據的酒館', orangeShelter: '鎮外避難所',
  syrupSlope: '北海岸斜坡', syrupHill: '村外的小山丘',
  baratieDeck: '巴拉蒂魚鰭甲板', baratieOffice: '哲夫的船長室',
  bellemereGrove: '貝爾梅爾的橘子園', marine16: '海軍第16分部',
  logueStreet: '羅格鎮大街', logueBase: '羅格鎮海軍基地',
  redLineCliff: '紅土大陸峭壁',
  cactusGraves: '仙人掌墓地',
  gardenJungle: '小花園叢林', gardenVolcano: '小花園火山',
  cocoaWeed: '可可亞威德', drumCliff: '磁鼓山山壁',
  yuba: '尤巴綠洲', katorea: '卡多雷亞', mausoleum: '王家葬祭殿',
  jayaForest: '加亞叢林',
  heavenGate: '天國之門', shandiaVillage: '香迪亞村', shandora: '黃金鄉香朵拉',
  blueStation: '海列車藍色車站', backStreet: '七水之都後街', iceburgMansion: '冰山的宅邸',
  eniesFront: '司法島前院', courthouse: '司法島法院',
  thrillerForest: '魔之森林', hogbackLab: '霍古巴克的研究室',
  coatingYard: '鍍膜工坊', sabaodyPark: '夏波帝遊樂園',
  kujaVillage: '九蛇村', kujaArena: '九蛇競技場',
  impelLevel1: '推進城第一層', impelLevel2: '推進城第二層', impelLevel3: '推進城第三層', impelLevel4: '推進城第四層',
  newkama: '人妖王國',
  oris: '奧利斯廣場', mfWall: '馬林福特包圍牆',
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
  luffy: '魯夫',
} as const

/** More popular canon characters (positions and details live in packages/world/cast.ts). */
export const castNpcs = {
  dadan: '達丹', koby: '可比', nami: '娜美', buggy: '巴其', tashigi: '塔希吉', gin: '吉恩', krieg: '唐・克里克',
  mihawk: '密佛格', dragon: '蒙其・D・龍',
  galdino: '加爾迪諾', wapol: '瓦波爾', bonclay: '邦・克雷',
  kokoro: '可可蘿', paulie: '保利', kaku: '卡庫', kalifa: '卡莉法', blueno: '布魯諾',
  perona: '佩羅娜', law: '特拉法爾加・羅', kid: '尤斯塔斯・基德', killer: '奇拉', drake: '德雷克', hawkins: '霍金斯', bonney: '邦妮',
  kuma: '巴索羅繆・大熊', shanks: '香克斯',
  jinbe: '甚平', teach: '黑鬍子', doflamingo: '多佛朗明哥',
  garp: '卡普', akainu: '赤犬', aokiji: '青雉', kizaru: '黃猿',
  marco: '馬可', jozu: '喬茲', vista: '比斯塔',
  // The people who live at each island's important places.
  morgan: '斧手蒙卡', helmeppo: '貝魯梅柏', cabaji: '卡巴吉', mohji: '摩奇',
  jango: '詹哥', merry: '梅利', usoppKids: '騙人布海賊團三人組', patty: '派迪', carne: '卡爾涅', nezumi: '老鼠上校',
  toto: '托多', kohza: '寇沙', amazon: '阿瑪佐尼亞', wyper: '瓦伊巴', ohm: '歐姆',
  zambai: '札姆巴', baskerville: '巴斯卡比魯', hogback: '霍古巴克', absalom: '阿布薩羅姆',
  disco: '迪士可', charloss: '查爾羅斯聖', camie: '凱米',
  marguerite: '瑪格麗特', sandersonia: '桑達索尼亞', marigold: '馬里哥爾特', hannyabal: '漢尼巴爾',
  // The rest of Whitebeard's sons who matter at the Summit War.
  daz: '達茲・波涅斯', tsuru: '鶴中將',
  squard: '斯庫亞多', oarsJr: '小奧茲Jr.', izo: '以藏', namur: '那謬爾', rakuyo: '拉克約', curiel: '庫利', blenheim: '布倫海姆',
} as const

/** Original traveling merchants of the 潮行商會, one at every island's port (details in packages/world/traders.ts). */
export const traderNpcs = {
  traderWind: '行商托賓', traderShells: '行商瑪洛', traderOrange: '行商皮普', traderSyrup: '行商歐蘭',
  traderBaratie: '行商塞吉', traderCocoyasi: '行商汐莉', traderLogue: '行商貝克', traderTwin: '行商歐佛',
  traderWhisky: '行商卡絲', traderGarden: '行商薩洛', traderDrum: '行商伊格納', traderAlabasta: '行商哈米德',
  traderJaya: '行商巴托', traderSkypiea: '行商菲亞', traderWater7: '行商德魯', traderEnies: '行商文森',
  traderThriller: '行商葛林', traderSabaody: '行商艾琳', traderAmazon: '行商薩娜', traderImpel: '行商莫茲',
  traderMarineford: '行商霍爾',
} as const

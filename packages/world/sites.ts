// Canon landmarks beyond each island's original three spots, with map positions and the walking network.
// Existing place ids never change, so saves, quests and NPC placements keep working.
import type { IslandId, LocationId } from '../shared/protocol.ts'

/** [place id, short map label, what the place offers]. Names live in shared/atlas.ts. */
export type Site = [LocationId, string, string]
/** Two places linked by a path, with walking minutes when it is not the usual 6. */
export type Road = [LocationId, LocationId, number?]

export type IslandLayout = {
  /** Places added to the island, appended after its existing ones. */
  add: Site[]
  /** Map position (percent of the chart) for every place; label centres sit on a grid so they never overlap. */
  at: Partial<Record<LocationId, [number, number]>>
  /** The island's complete path network; it replaces the default port–middle–far chain. */
  roads: Road[]
}

export const islandLayouts: Partial<Record<IslandId, IslandLayout>> = {
  shells: {
    add: [
      ['shellsDiner', '餐館', '莉卡的母親開的小餐館，鎮民在這裡壓低聲音抱怨上校'],
      ['shellsWall', '圍牆外', '從基地圍牆的縫隙能看見廣場上被綁著的人'],
    ],
    at: { shellsPort: [20, 84], shellsTown: [50, 50], marineBase: [80, 16], shellsDiner: [20, 18], shellsWall: [80, 82] },
    roads: [['shellsPort', 'shellsTown'], ['shellsTown', 'marineBase'], ['shellsTown', 'shellsDiner'], ['shellsTown', 'shellsWall'], ['shellsWall', 'marineBase']],
  },
  orange: {
    add: [
      ['buggyBar', '酒館據點', '巴其海賊團把這間酒館當據點，屋頂上架著巴其大砲'],
      ['orangeShelter', '避難所', '鎮民躲在鎮外的避難所，等海賊離開'],
    ],
    at: { orangePort: [20, 84], orangeStreet: [50, 50], petShop: [80, 82], buggyBar: [80, 16], orangeShelter: [20, 18] },
    roads: [['orangePort', 'orangeStreet'], ['orangeStreet', 'petShop'], ['orangeStreet', 'buggyBar'], ['orangeStreet', 'orangeShelter', 15]],
  },
  syrup: {
    add: [
      ['syrupSlope', '斜坡', '通往村子的窄坡，誰想從北海岸偷襲村子都得從這裡上來'],
      ['syrupHill', '小山丘', '騙人布每天早上在這裡大喊「海賊來了」'],
    ],
    at: { syrupPort: [20, 84], syrupSlope: [20, 18], syrupVillage: [50, 50], kayaMansion: [80, 16], syrupHill: [80, 82] },
    roads: [['syrupPort', 'syrupVillage'], ['syrupPort', 'syrupSlope'], ['syrupSlope', 'syrupVillage'], ['syrupVillage', 'kayaMansion'], ['syrupVillage', 'syrupHill']],
  },
  baratie: {
    add: [
      ['baratieDeck', '魚鰭甲板', '餐廳向兩側展開的海上甲板，打架都在這裡'],
      ['baratieOffice', '船長室', '哲夫的船長室，牆上掛著他當年的海賊照片'],
    ],
    at: { baratiePort: [20, 84], baratieDeck: [20, 18], baratieHall: [50, 50], baratieKitchen: [80, 16], baratieOffice: [80, 82] },
    roads: [['baratiePort', 'baratieHall'], ['baratiePort', 'baratieDeck'], ['baratieDeck', 'baratieHall'], ['baratieHall', 'baratieKitchen'], ['baratieHall', 'baratieOffice']],
  },
  cocoyasi: {
    add: [
      ['bellemereGrove', '橘子園', '貝爾梅爾留下的橘子園，諾琪高在這裡照顧果樹'],
      ['marine16', '第16分部', '海軍第16分部，老鼠上校的駐所'],
    ],
    at: { cocoyasiPort: [20, 84], cocoyasiVillage: [50, 50], arlongPark: [80, 16], bellemereGrove: [20, 18], marine16: [80, 82] },
    roads: [['cocoyasiPort', 'cocoyasiVillage'], ['cocoyasiVillage', 'arlongPark'], ['cocoyasiVillage', 'bellemereGrove'], ['cocoyasiPort', 'marine16', 12]],
  },
  loguetown: {
    add: [
      ['logueStreet', '大街', '偉大航路前的最後一條大街，海賊們在這裡採買'],
      ['logueBase', '海軍基地', '斯摩格上校坐鎮的羅格鎮海軍基地'],
    ],
    at: { loguePort: [20, 84], logueStreet: [20, 22], logueSquare: [50, 52], logueShop: [80, 84], logueBase: [80, 18] },
    roads: [['loguePort', 'logueStreet'], ['logueStreet', 'logueSquare'], ['loguePort', 'logueSquare'], ['logueSquare', 'logueShop'], ['logueSquare', 'logueBase']],
  },
  twinCape: {
    add: [['redLineCliff', '峭壁', '顛倒山的出口，紅土大陸的岩壁直入雲端']],
    at: { twinPort: [20, 84], capeLighthouse: [50, 50], laboonBay: [80, 82], redLineCliff: [80, 16] },
    roads: [['twinPort', 'capeLighthouse'], ['capeLighthouse', 'laboonBay'], ['capeLighthouse', 'redLineCliff']],
  },
  whiskyPeak: {
    add: [['cactusGraves', '墓地', '島上一根根仙人掌，其實全是墓碑']],
    at: { whiskyPort: [20, 84], whiskyTown: [50, 50], cactusRock: [80, 16], cactusGraves: [20, 18] },
    roads: [['whiskyPort', 'whiskyTown'], ['whiskyTown', 'cactusRock'], ['whiskyTown', 'cactusGraves']],
  },
  littleGarden: {
    add: [
      ['gardenJungle', '叢林', '恐龍出沒的史前叢林'],
      ['gardenVolcano', '火山', '島中央的火山，每次噴發就是巨人決鬥的鐘聲'],
    ],
    at: { gardenShore: [20, 84], gardenJungle: [20, 18], giantsArena: [50, 50], waxHouse: [80, 16], gardenVolcano: [80, 82] },
    roads: [['gardenShore', 'giantsArena'], ['gardenShore', 'gardenJungle'], ['gardenJungle', 'giantsArena'], ['giantsArena', 'waxHouse'], ['giantsArena', 'gardenVolcano', 12]],
  },
  drum: {
    add: [
      ['cocoaWeed', '可可亞威德', '雪地裡的另一座小鎮，居民是多爾頓的老朋友'],
      ['drumCliff', '山壁', '通往山頂城堡的垂直山壁，只能徒手攀爬'],
    ],
    at: { drumShore: [20, 84], cocoaWeed: [20, 18], bighorn: [40, 62], drumCliff: [80, 64], drumCastle: [80, 16] },
    roads: [['drumShore', 'bighorn'], ['drumShore', 'cocoaWeed', 20], ['cocoaWeed', 'bighorn', 20], ['bighorn', 'drumCastle', 45], ['bighorn', 'drumCliff', 15], ['drumCliff', 'drumCastle', 30]],
  },
  alabasta: {
    add: [
      ['yuba', '尤巴', '被沙暴掩埋的綠洲，叛亂軍最初在這裡起事'],
      ['katorea', '卡多雷亞', '叛亂軍的集結據點'],
      ['mausoleum', '葬祭殿', '王家之墓，地下藏著歷史本文'],
    ],
    at: { nanohana: [16, 60], yuba: [40, 84], rainbase: [42, 20], katorea: [72, 66], alubarna: [74, 32], mausoleum: [82, 9] },
    // Crossing the desert takes hours, not minutes.
    roads: [['nanohana', 'rainbase', 240], ['rainbase', 'alubarna', 240], ['nanohana', 'yuba', 180], ['yuba', 'katorea', 180],
      ['katorea', 'alubarna', 120], ['alubarna', 'mausoleum', 10]],
  },
  jaya: {
    add: [['jayaForest', '叢林', '南方鳥棲息的叢林，大樹高得看不到樹頂']],
    at: { mockPort: [20, 84], mockTown: [50, 50], cricketHouse: [80, 16], jayaForest: [80, 82] },
    roads: [['mockPort', 'mockTown'], ['mockTown', 'cricketHouse', 30], ['cricketHouse', 'jayaForest']],
  },
  skypiea: {
    add: [
      ['heavenGate', '天國之門', '從白海進入空島的入口，守門的婆婆會收入境費'],
      ['shandiaVillage', '香迪亞村', '香迪亞戰士躲在雲層後的村落'],
      ['shandora', '香朵拉', '上層雲深處的黃金鄉遺跡'],
    ],
    at: { heavenGate: [16, 14], angelBeach: [16, 80], upperYard: [50, 50], godShrine: [84, 16], shandiaVillage: [84, 82], shandora: [50, 12] },
    roads: [['heavenGate', 'angelBeach'], ['angelBeach', 'upperYard'], ['upperYard', 'godShrine'], ['upperYard', 'shandiaVillage', 15], ['upperYard', 'shandora', 15]],
  },
  water7: {
    add: [
      ['blueStation', '車站', '海列車的藍色車站，往司法島的列車也從這裡出發'],
      ['backStreet', '後街', '下層的舊街區，一漲潮水就淹上來'],
      ['iceburgMansion', '冰山宅邸', '市長冰山的宅邸，戒備森嚴'],
    ],
    at: { water7Port: [16, 84], blueStation: [16, 20], galleyLa: [46, 56], iceburgMansion: [50, 14], backStreet: [84, 40], frankyHouse: [84, 84] },
    roads: [['water7Port', 'galleyLa'], ['water7Port', 'blueStation'], ['galleyLa', 'frankyHouse'], ['galleyLa', 'iceburgMansion'],
      ['galleyLa', 'backStreet'], ['backStreet', 'frankyHouse']],
  },
  eniesLobby: {
    add: [
      ['eniesFront', '前院', '正門與法院之間的廣場'],
      ['courthouse', '法院', '只做判決、不做審理的司法島法院'],
    ],
    at: { eniesGate: [20, 84], eniesFront: [20, 50], courthouse: [20, 16], justiceTower: [62, 52], gateOfJustice: [80, 14] },
    roads: [['eniesGate', 'justiceTower'], ['eniesGate', 'eniesFront'], ['eniesFront', 'courthouse'], ['courthouse', 'justiceTower'], ['justiceTower', 'gateOfJustice']],
  },
  thrillerBark: {
    add: [
      ['thrillerForest', '森林', '魔之森林，奇形怪狀的動物殭屍在樹間遊蕩'],
      ['hogbackLab', '研究室', '天才外科醫生霍古巴克製造殭屍的研究室'],
    ],
    at: { thrillerDock: [20, 84], thrillerForest: [20, 18], graveyard: [50, 50], moriaMansion: [80, 16], hogbackLab: [80, 82] },
    roads: [['thrillerDock', 'graveyard'], ['thrillerDock', 'thrillerForest'], ['thrillerForest', 'graveyard'], ['graveyard', 'moriaMansion'], ['graveyard', 'hogbackLab']],
  },
  sabaody: {
    add: [
      ['coatingYard', '鍍膜工坊', '替船鍍上泡泡膜、潛往魚人島前的必經之處'],
      ['sabaodyPark', '遊樂園', '夏波帝遊樂園，摩天輪在泡泡之間轉動'],
    ],
    at: { sabaodyGrove: [20, 84], sabaodyPark: [20, 18], auctionHouse: [50, 50], shakkyBar: [80, 82], coatingYard: [80, 16] },
    roads: [['sabaodyGrove', 'auctionHouse'], ['auctionHouse', 'shakkyBar'], ['sabaodyGrove', 'sabaodyPark'], ['shakkyBar', 'coatingYard']],
  },
  amazonLily: {
    add: [
      ['kujaVillage', '九蛇村', '只有女人的村落，男人一踏進來就會引起騷動'],
      ['kujaArena', '競技場', '九蛇城旁的競技場，戰士們在這裡比試'],
    ],
    at: { kujaPort: [20, 84], kujaVillage: [50, 50], kujaCastle: [80, 16], kujaArena: [20, 18], amazonForest: [80, 82] },
    roads: [['kujaPort', 'kujaVillage'], ['kujaVillage', 'kujaCastle'], ['kujaCastle', 'kujaArena'], ['kujaCastle', 'amazonForest']],
  },
  impelDown: {
    add: [
      ['impelLevel1', '第一層', '紅蓮地獄：一整片會割傷人的血紅森林'],
      ['impelLevel2', '第二層', '猛獸地獄：放養著兇猛野獸的牢區'],
      ['impelLevel3', '第三層', '飢餓地獄：灼熱又沒有食物的牢區'],
      ['impelLevel4', '第四層', '焦熱地獄：煮沸的血之池與典獄長室'],
      ['newkama', '人妖王國', '第五層與第六層之間，守衛不知道的祕密樂園'],
    ],
    at: { impelGate: [16, 8], impelLevel1: [50, 18], impelLevel2: [84, 28], impelLevel3: [50, 40], impelLevel4: [16, 52], impelLevel5: [50, 66], newkama: [84, 74], impelLevel6: [50, 90] },
    // Every level has to be passed on the way down.
    roads: [['impelGate', 'impelLevel1'], ['impelLevel1', 'impelLevel2'], ['impelLevel2', 'impelLevel3'], ['impelLevel3', 'impelLevel4'],
      ['impelLevel4', 'impelLevel5'], ['impelLevel5', 'newkama'], ['impelLevel5', 'impelLevel6']],
  },
  marineford: {
    add: [
      ['oris', '廣場', '處刑台前的奧利斯廣場，戰場的中心'],
      ['mfWall', '包圍牆', '海軍為了圍住海灣升起的鋼牆'],
    ],
    at: { marinefordBay: [20, 84], oris: [50, 52], mfWall: [80, 84], scaffold: [20, 18], hqFortress: [80, 16] },
    roads: [['marinefordBay', 'oris'], ['oris', 'scaffold'], ['scaffold', 'hqFortress'], ['oris', 'mfWall'], ['marinefordBay', 'scaffold']],
  },
}

/** Every added place's short label and landmark, flattened. */
export const addedSites = Object.values(islandLayouts).flatMap(layout => layout!.add)

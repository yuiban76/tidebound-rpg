import { locations, npcs } from '../shared/protocol.ts'
import type { Intent, IslandId, LocationId, NpcId, Weapon } from '../shared/protocol.ts'
import { goods, landmarks, meals, paths, people, shops } from './village.ts'
import type { Good } from './village.ts'
import { islandAt, islands, islandStories } from './sea.ts'

const locationNames: Record<string, LocationId> = {
  ...Object.fromEntries(Object.entries(locations).map(([id, name]) => [name, id as LocationId])),
  廣場: 'square', 村子廣場: 'square', 風車村: 'square',
  酒館: 'tavern', 酒吧: 'tavern', 瑪琪諾的店: 'tavern', 瑪琪諾的酒吧: 'tavern', 瑪琪諾的酒館: 'tavern',
  碼頭: 'dock', 港口: 'dock', 港邊: 'dock', 風車村碼頭: 'dock',
  小路: 'road', 村道: 'road', 村外: 'road',
  科爾波山: 'hill', 山道: 'hill', 山徑: 'hill', 山上: 'hill',
  哥亞王國: 'goa', 哥亞: 'goa', 王國: 'goa', 城下町: 'goa',
  海軍基地: 'marineBase', 基地: 'marineBase', 第153分部: 'marineBase', 基地廣場: 'marineBase', 刑場: 'marineBase',
  寵物店廢墟: 'petShop', 鐵匠鋪: 'square', 鐵匠: 'square',
}
/** Generic words that mean "the one on this island", resolved against the speaker's current island. */
const portOf = Object.fromEntries(Object.entries(islands).map(([id, island]) => [id, island.port])) as Record<IslandId, LocationId>
const localAliases: Record<string, Partial<Record<IslandId, LocationId>>> = {
  港口: portOf, 碼頭: portOf, 港邊: portOf, 船邊: portOf,
  大街: { shells: 'shellsTown', orange: 'orangeStreet', loguetown: 'logueStreet' },
  鎮上: { shells: 'shellsTown', orange: 'orangeStreet', loguetown: 'logueStreet', whiskyPeak: 'whiskyTown', jaya: 'mockTown' },
  處刑台: { loguetown: 'logueSquare', marineford: 'scaffold' }, 廣場: { loguetown: 'logueSquare', marineford: 'oris' },
  第一層: { impelDown: 'impelLevel1' }, 第二層: { impelDown: 'impelLevel2' }, 第三層: { impelDown: 'impelLevel3' },
  第四層: { impelDown: 'impelLevel4' }, 第五層: { impelDown: 'impelLevel5' }, 第六層: { impelDown: 'impelLevel6' },
  海灘: { skypiea: 'angelBeach' }, 墓園: { thrillerBark: 'graveyard' }, 墓地: { whiskyPeak: 'cactusGraves', thrillerBark: 'graveyard' },
  森林: { amazonLily: 'amazonForest', thrillerBark: 'thrillerForest', jaya: 'jayaForest', littleGarden: 'gardenJungle', skypiea: 'upperYard' },
  叢林: { littleGarden: 'gardenJungle', jaya: 'jayaForest' },
  餐館: { shells: 'shellsDiner' }, 酒館: { orange: 'buggyBar', sabaody: 'shakkyBar' }, 酒吧: { orange: 'buggyBar', sabaody: 'shakkyBar' },
  避難所: { orange: 'orangeShelter' }, 斜坡: { syrup: 'syrupSlope' }, 山丘: { syrup: 'syrupHill' }, 小山丘: { syrup: 'syrupHill' },
  甲板: { baratie: 'baratieDeck' }, 船長室: { baratie: 'baratieOffice' }, 大廳: { baratie: 'baratieHall' }, 廚房: { baratie: 'baratieKitchen' },
  橘子園: { cocoyasi: 'bellemereGrove' }, 海軍基地: { loguetown: 'logueBase', cocoyasi: 'marine16', shells: 'marineBase' },
  基地: { loguetown: 'logueBase', cocoyasi: 'marine16', shells: 'marineBase' },
  燈塔: { twinCape: 'capeLighthouse' }, 峭壁: { twinCape: 'redLineCliff' }, 紅土大陸: { twinCape: 'redLineCliff' },
  火山: { littleGarden: 'gardenVolcano' }, 山壁: { drum: 'drumCliff' }, 城堡: { drum: 'drumCastle' },
  王宮: { alabasta: 'alubarna' }, 綠洲: { alabasta: 'yuba' }, 賭場: { alabasta: 'rainbase' },
  車站: { water7: 'blueStation' }, 船塢: { water7: 'galleyLa' }, 宅邸: { water7: 'iceburgMansion', syrup: 'kayaMansion', thrillerBark: 'moriaMansion' },
  前院: { eniesLobby: 'eniesFront' }, 法院: { eniesLobby: 'courthouse' }, 研究室: { thrillerBark: 'hogbackLab' },
  遊樂園: { sabaody: 'sabaodyPark' }, 拍賣所: { sabaody: 'auctionHouse' }, 村子: { amazonLily: 'kujaVillage', syrup: 'syrupVillage', cocoyasi: 'cocoyasiVillage' },
  競技場: { amazonLily: 'kujaArena' }, 包圍牆: { marineford: 'mfWall' }, 要塞: { marineford: 'hqFortress' },
}
const weaponWords: Record<string, Weapon> = {
  普通武士刀: 'sword', 武士刀: 'sword', 刀: 'sword', 普通長槍: 'spear', 長槍: 'spear', 普通火槍: 'musket', 火槍: 'musket',
  徒手: 'fist', 空手: 'fist', 拳頭: 'fist',
}
const npcByName = Object.fromEntries(Object.entries(npcs).map(([id, name]) => [name, id])) as Record<string, NpcId>
const npcNames = Object.values(npcs).join('|')
const namedNpc = new RegExp('^(?:問|請問)?(' + npcNames + ')[，,：:\\s]*([\\s\\S]*)$')
const talkWithNpc = new RegExp('^(?:找|問|拜訪|跟|和|向)(' + npcNames + ')(?:$|聊|講|問|詢問|打招呼|交談|說話|談話|談|關於|有沒有|是不是|[，,：「])')
const islandByName = Object.fromEntries(Object.entries(islands).map(([id, island]) => [island.name, id])) as Record<string, IslandId>
const routeName = Object.keys(islandByName).join('|')
const voteForRoute = new RegExp('^選擇航線[：:]?\\s*(' + routeName + ')(?:\\s*[（(]?(穩健|快航)[）)]?)?$')
const departFor = new RegExp('^(?:(?:出海|出航|啟航)(?:去|前往|到)?|前往|去|返航(?:回|到)?|回到?|返回)\\s*(' + routeName + ')$')
const normalizeQuestion = (input: string) => input.trim().replace(/[什甚][麼么]/g, '什麼')

export function sceneQuestion(input: string): 'guide' | 'location' | undefined {
  const text = normalizeQuestion(input)
    .replace(/^請問(?:一下)?[\s，,：:]*/, '')
    .replace(/[?？。!！]+$/, '')
    .replace(/[呢嗎呀啊吧]$/, '')
    .trim()
  const topic = text.replace(/^(?:(?:我們?|大家|目前|現在|接下來|下一步|先|還|在?[這这][裡里邊边]|在?附近)[\s，,]*)+/, '')
  // Task-specific questions like 「去哪買船」 belong in conversation.
  if (/^(?:能|可以|該|應該|要)?去(?:哪[裡里邊边兒儿]?|什麼地方)$/.test(topic) ||
      /^(?:(?:能|可以)做(?:些|點)?什麼|要?怎麼(?:玩|走)|有(?:誰|什麼(?:可以做)?|哪些(?:人|地方(?:可以去|能去)?))|看看(?:附近|四周)|查看附近)$/.test(topic))
    return 'guide'
  if (/^(?:請問)?(?:(?:我(?:們|人)?(?:現在|目前)?|現在|目前)?在(?:哪[裡里]?|什麼地方)|(?:我(?:的)?|現在|目前)?位置)[?？。!！\s]*$/.test(text))
    return 'location'
}

export function routeBetween(from: LocationId, to: LocationId, hillClosed = false): LocationId[] {
  const queue: LocationId[][] = [[from]]
  const visited = new Set<LocationId>([from])
  for (const route of queue) {
    const place = route.at(-1)!
    if (place === to) return route
    for (const next of paths[place]) {
      if (visited.has(next) || (hillClosed && next === 'hill')) continue
      visited.add(next)
      queue.push([...route, next])
    }
  }
  return []
}

export function directions(place: LocationId, { hillClosed = false, inCombat = false, down = false, present = undefined as NpcId[] | undefined } = {}) {
  const nearby = paths[place].filter(id => !hillClosed || id !== 'hill')
  const local = present ?? Object.keys(people).filter(id => people[id as NpcId].place === place) as NpcId[]
  if (down) return { text: '你倒在' + locations[place] + '。可以原地「睡覺」恢復，或請同伴用繃帶包紮。', suggestions: place === 'hill' ? [] : ['睡覺'] }
  if (inCombat) return {
    text: '你在' + locations[place] + '的戰鬥中。可以防守、撤回村道，或和岬恩交涉。',
    suggestions: ['防守', '撤退', '和岬恩交涉'],
  }
  const wares = (Object.keys(goods) as Good[]).filter(id => goods[id].shop === place)
  const text = [
    '你在' + locations[place] + '。',
    ...nearby.map(id => '可以去' + locations[id] + '，' + landmarks[id] + '。'),
    ...local.map(id => '這裡有' + npcs[id] + '（' + people[id].role + '），可以找對方交談。'),
    ...(place === 'tavern' ? ['酒吧有烤麵包 ' + meals.bread.price + ' 貝里、燉肉飯 ' + meals.rice.price + ' 貝里。'] : []),
    ...(wares.length ? [shops[place] + '販售' + wares.map(id => goods[id].label + ' ' + goods[id].price + ' 貝里').join('、') + '。'] : []),
    ...(hillClosed && place === 'road' ? ['山道目前有正在結算的遭遇。'] : []),
  ].join('\n')
  const suggestions = [
    ...nearby.map(id => '前往' + locations[id]),
    ...local.map(id => '找' + npcs[id] + '聊聊'),
    ...(place === 'tavern' ? ['點烤麵包'] : place === 'hill' ? ['查看山道上的痕跡'] : []),
    ...(place === 'goa' ? ['買普通武士刀', '買普通火槍', '強化武器'] : []),
    ...(place === 'square' ? ['買傷藥', '強化武器'] : []),
  ]
  return { text, suggestions }
}

export function dialogueQuestion(input: string) {
  const text = normalizeQuestion(input)
  if (/^(?:我們?)?(?:想要|想|要|打算|先)?\s*(?:觀察|查看|察看|檢查|調查|搜索|打量|眺望|看向|試著)/.test(text)) return false
  return /^(?:請問|說明|說說|告訴我|想請教|我想知道|能否告訴我|能不能告訴我)|(?:是誰|有誰|誰在|載了誰|哪些人|什麼|怎麼|怎樣|如何|為什麼|為何|多少|幾個人|在哪|去哪|哪[裡里邊边兒儿]買|有賣|嗎[？?。]*$)|[？?]$/.test(text)
}

export function asksAboutBoatCrew(text: string) {
  return dialogueQuestion(text) && /小艇|船/.test(text) && /誰|人員|乘客|船員|搭乘|哪些人|幾人|幾個人|多少人/.test(text)
}

export function asksAboutShipPurchase(input: string) {
  return dialogueQuestion(input) &&
    /(?:[買买賣卖]|[購购][買买置]|出售)(?:一?[艘條条])?(?:小艇|帆船|船[隻只]?)(?![上票員员長长])|(?:小艇|帆船|船[隻只]?)(?![上票員员長长]).{0,5}(?:哪[裡里邊边兒儿]?)?[買买賣卖]/.test(input)
}

function talkIntent(text: string) {
  const namedQuestion = namedNpc.exec(text)
  if (namedQuestion && (!namedQuestion[2].trim() || dialogueQuestion(namedQuestion[2])))
    return { kind: 'talk', npc: npcByName[namedQuestion[1]] } as const
  const talk = talkWithNpc.exec(text)
  if (talk) return { kind: 'talk', npc: npcByName[talk[1]] } as const
}

const inviteWords = '(?:加入|入夥|入伙|入團|同行|跟(?:著)?(?:我們?|我)(?:走|一起|出海|航行|冒險)|當(?:我(?:們)?的)?(?:夥伴|同伴|船員|隊友)|成為(?:我(?:們)?的)?(?:夥伴|同伴|船員|隊友)|一起(?:出海|冒險|航行|走))'
const askingAbout = /為什麼|為何|怎麼|什麼|誰|哪[裡里]|多少|是不是|有沒有|是否|曾經|以前|之前|了嗎|了沒/
const inviteNpc = new RegExp('(' + npcNames + ')')
const leaveWords = '(?:離隊|離開(?:隊伍|船團|海賊團|我們|這裡)?|退出(?:隊伍|船團|海賊團)?|下船|留在這裡|留下來?|不用跟(?:著)?(?:我們?|我)?了?)'

/** Someone is being invited to join the crew: 「叫騙人布加入我的海賊團」「邀請索隆入夥」「騙人布要不要跟我們走」. */
export function recruitRequest(input: string): NpcId | undefined {
  const text = input.trim().replace(/[。！!?？，,]+/g, ' ')
  if (askingAbout.test(text) && !/要不要|願不願意|想不想|肯不肯/.test(text)) return undefined
  const named = inviteNpc.exec(text)
  if (!named) return undefined
  const after = text.slice(named.index + named[1].length)
  // 「招募香吉士」 is already an invitation; otherwise the line must say what they are being invited to do.
  const bare = !after.trim() && /^(?:邀請|招募|拉攏|邀)$/.test(text.slice(0, named.index).trim())
  if (!bare && !new RegExp(inviteWords).test(after)) return undefined
  if (/^(?:問|請問|向|跟|和)/.test(text)) return undefined
  return npcByName[named[1]]
}

/** A companion is handed to another player: 「把騙人布交給娜美」「騙人布改跟娜美」. */
export function handoverRequest(input: string): { npc: NpcId, to: string } | undefined {
  const text = input.trim().replace(/[。！!?？，,]+/g, ' ').trim()
  const given = new RegExp('^(?:把|將|請)?\\s*(' + npcNames + ')\\s*(?:轉交給|交給|轉給|託付給|改跟(?:著)?|改由)\\s*(.+?)\\s*(?:帶著?|照顧|負責|帶領|行動)?$').exec(text)
  if (!given) return undefined
  return { npc: npcByName[given[1]], to: given[2].trim() }
}

/** Someone in the party is being asked to leave: 「請騙人布離隊」「索隆下船」. */
export function dismissRequest(input: string): NpcId | undefined {
  const text = input.trim().replace(/[。！!?？，,]+/g, ' ')
  const named = inviteNpc.exec(text)
  if (!named || askingAbout.test(text)) return undefined
  const rest = text.slice(named.index + named[1].length).trim()
  if (new RegExp('^(?:先|可以|要)?' + leaveWords + '(?:吧|了)?$').test(rest) || /^(?:不要|別|不用)?(?:再)?跟(?:著)?(?:我們?|我)了$/.test(rest)) return npcByName[named[1]]
}

function seaIntent(text: string): Intent | undefined {
  if (/^(?:買|購買)(?:一艘)?(?:船|小艇|迎潮號)$/.test(text)) return { kind: 'sail', order: 'buy' }
  if (/^借(?:一艘)?(?:船|迎潮號)$/.test(text)) return { kind: 'sail', order: 'borrow' }
  if (/^買(?:一份)?木料$/.test(text)) return { kind: 'sail', order: 'materials' }
  if (/^(?:修船|維修船隻|修理迎潮號)$/.test(text)) return { kind: 'sail', order: 'repair' }
  if (/^準備出航$/.test(text)) return { kind: 'sail', order: 'ready' }
  if (/^取消出航準備$/.test(text)) return { kind: 'sail', order: 'unready' }
  const vote = voteForRoute.exec(text)
  if (vote) return { kind: 'sail', order: 'vote', destination: islandByName[vote[1]], pace: vote[2] === '快航' ? 'fast' : 'steady' }
  const depart = departFor.exec(text)
  if (depart) return { kind: 'sail', order: 'depart', destination: islandByName[depart[1]] }
  if (text === '返航') return { kind: 'sail', order: 'depart', destination: 'wind' }
  if (/^(?:出海|出航|啟航|開船)$/.test(text)) return { kind: 'sail', order: 'depart' }
}

export function familiarIntent(input: string, here?: LocationId): Intent | undefined {
  const question = sceneQuestion(input)
  if (question) return { kind: question }
  const text = input.trim().replace(/[。！!?？]+$/, '')
    .replace(/^(?:我們?|大家)?(?:想要|打算|想|要|先)?(?:先)?\s*/, '')
  const sailing = seaIntent(text)
  // 「前往西羅布村」 on Syrup island means the village spot, not a voyage to the island you are already on.
  const sameIsland = sailing?.kind === 'sail' && sailing.order === 'depart' && here &&
    sailing.destination === islandAt(here)
  if (sailing && !sameIsland) return sailing
  for (const story of Object.values(islandStories)) {
    const step = story.samples.indexOf(text)
    if (step !== -1) return { kind: 'islandTask', step: (['accept', 'search', 'deliver'] as const)[step] }
  }
  if (/^(?:找[^，。]{1,24}(?:一起)?|和[^，。]{1,24}(?:一起)?|跟[^，。]{1,24}(?:一起)?)?(?:想|要|來)?(?:成立|組建|組成)(?:一個|一支)?(?:海賊團|船團)$/.test(text)) return { kind: 'crew' }
  const handed = handoverRequest(text)
  if (handed) return { kind: 'handover', ...handed }
  const invited = recruitRequest(text)
  if (invited) return { kind: 'recruit', npc: invited }
  const dismissed = dismissRequest(text)
  if (dismissed) return { kind: 'dismiss', npc: dismissed }
  if (/^(?:吃|點|點一份|買|來一份|來份)(?:一個|一份|一片)?(?:烤)?麵包$/.test(text)) return { kind: 'meal', dish: 'bread' }
  if (/^(?:吃|點|買|來一份|來份)(?:一碗|一份)?(?:爌肉飯|控肉飯|燉肉飯|滷肉飯)$/.test(text)) return { kind: 'meal', dish: 'rice' }
  if (/^(?:接受|接下|接)(?:潮汐簿)?(?:的)?委託$/.test(text)) return { kind: 'quest', step: 'accept' }
  if (/^(?:交還|還回|歸還)潮汐簿$/.test(text)) return { kind: 'quest', step: 'deliver' }
  if (/^(?:和|跟|找)?岬恩(?:交涉|談(?:工錢|潮汐簿))$/.test(text)) return { kind: 'negotiate', target: '岬恩' }
  const parley = /^(?:和|跟|向)(.+?)(?:交涉|談判|講和)$/.exec(text)
  if (parley) return { kind: 'negotiate', target: parley[1].trim() }
  const technique = /^(?:用|使出|施展)(?:招式)?「(.+?)」(?:攻擊)?\s*(.*)$/.exec(text)
  if (technique) return { kind: 'attack', technique: technique[1], ...(technique[2].trim() && { target: technique[2].trim() }) }
  const styled = /^(強力攻擊|特殊招式|進階招式|連續攻擊|連擊)\s*(.*)$/.exec(text)
  if (styled) {
    const style = ({ 強力攻擊: 'power', 特殊招式: 'special', 進階招式: 'advanced', 連續攻擊: 'flurry', 連擊: 'flurry' } as const)[styled[1] as '強力攻擊']
    return { kind: 'attack', style, ...(styled[2].trim() && { target: styled[2].trim() }) }
  }
  const strike = /^(?:攻擊|揍|砍|踢|射擊|開槍打|偷襲|出手打)\s*(.+)$/.exec(text)
  if (strike) return { kind: 'attack', target: strike[1].trim() }
  if (/^(?:攻擊|出手)$/.test(text)) return { kind: 'attack' }
  if (/^(?:逃跑|逃走|撤離)$/.test(text)) return { kind: 'flee' }
  if (/^(?:裝填|裝彈|裝填火槍)$/.test(text)) return { kind: 'reload' }
  const bandage = /^(?:使用|用)繃帶(?:給|替|幫)?\s*(.*)$/.exec(text)
  if (bandage) return { kind: 'useItem', item: '繃帶', ...(bandage[1].trim() && { target: bandage[1].trim() }) }
  if (/^(?:吸收|吃下|吃掉|吞下)(?:那顆|這顆|該顆)?(?:惡魔)?果實$/.test(text)) return { kind: 'fruit', take: true }
  if (/^(?:放走|放棄|不吸收|不吃|丟掉|放生)(?:那顆|這顆|該顆)?(?:惡魔)?果實$/.test(text)) return { kind: 'fruit', take: false }
  const absorb = /^(?:吸收|吃下|吃掉|吞下)(.{1,12}果實.*)$/.exec(text)
  if (absorb) return { kind: 'fruit', take: true, fruit: absorb[1] }
  const auction = /^(?:買|購買|標下|競標)(?:一顆)?(.{0,12}果實.*|惡魔果實)$/.exec(text)
  if (auction) return { kind: 'buyFruit', ...(auction[1] !== '惡魔果實' && { fruit: auction[1] }) }
  const soak = /^(?:用|使用)(水壺|衝擊貝)(?:對|向|朝|攻擊|潑|淋|打)?\s*(.*)$/.exec(text) ?? /^()潑水(?:給|到|在)?\s*(.*)$/.exec(text)
  if (soak) return { kind: 'useItem', item: soak[1] || '水壺', ...(soak[2].trim() && { target: soak[2].trim() }) }
  if (/^(?:查看|觀察|調查)(?:山徑|山道|山路)上的(?:痕跡|鞋印)$/.test(text)) return { kind: 'check', method: 'observe' }
  if (/^(?:強化|升級|鍛造|重新鍛打|打磨|精煉)(?:我的|目前的|手上的)?(?:武器|刀|槍|長槍|火槍|武士刀|拳套|護手)?$/.test(text)) return { kind: 'upgrade' }
  const potion = /^(?:使用|用|喝|喝下|服用)(?:一瓶|一罐)?傷藥$/.exec(text)
  if (potion) return { kind: 'use', item: '傷藥' }
  if (/^(?:買|購買)(?:一把)?(?:普通)?火槍$/.test(text)) return { kind: 'buy', item: 'musket' }
  if (/^(?:買|購買)(?:一瓶|一罐|一份)?傷藥$/.test(text)) return { kind: 'buy', item: 'tonic' }
  if (/^(?:買|購買)(?:一把)?(?:普通)?武士刀$/.test(text)) return { kind: 'buy', item: 'sword' }
  if (/^(?:買|購買)(?:一個)?(?:記錄指針|永久指針|指針)$/.test(text)) return { kind: 'buy', item: 'logPose' }
  // Any shop item by its name ("買繃帶", "買兩捲繃帶", "購買水壺"), so buying never depends on the AI.
  const shopping = /^(?:買|購買)(?:[一兩二三四五六七八九十\d]+)?(?:個|份|捲|把|瓶|罐|支|只|包)?\s*(.+)$/.exec(text)
  const ware = shopping && (Object.keys(goods) as Good[]).find(id => goods[id].label === shopping[1].trim())
  if (ware) return { kind: 'buy', item: ware }
  const gear = /^(?:買|購買)(?:一個|一把|一顆|一個)?(水壺|海樓石十手|海樓石|衝擊貝)$/.exec(text)
  if (gear) return { kind: 'buy', item: gear[1] === '水壺' ? 'waterskin' : gear[1] === '衝擊貝' ? 'dial' : 'seastone' }
  if (/^(?:睡覺|睡一覺|睡一晚|睡一下覺|過夜|休息一晚|好好睡一覺|去睡覺)$/.test(text)) return { kind: 'rest', sleep: true }
  if (/^(?:休息|休息一下|休息一會兒?|歇一歇|歇息|小憩|小睡|喘口氣|稍作休息|恢復體力|回復體力)$/.test(text)) return { kind: 'rest', sleep: false }
  const wait = /^(?:等待|等|待|休息|原地等待)\s*(\d+)\s*(?:個)?(小時|天)$/.exec(text)
  if (wait) return { kind: 'wait', hours: Math.min(240, Math.max(1, Number(wait[1]) * (wait[2] === '天' ? 24 : 1))) }
  const equip = /^(?:裝備|改用|換成|換上|拿起|使用)\s*(\S+)$/.exec(text)
  if (equip && Object.hasOwn(weaponWords, equip[1])) return { kind: 'equip', weapon: weaponWords[equip[1]] }
  if (/^收起武器$/.test(text)) return { kind: 'equip', weapon: 'fist' }
  const moneyFirst = /^(?:把|將)\s*(\d+)\s*貝里\s*(?:交給|轉給|送給|給)\s*(.+)$/.exec(text)
  if (moneyFirst) return { kind: 'give', to: moneyFirst[2].trim(), money: Number(moneyFirst[1]) }
  const nameFirst = /^(?:給|交給|轉給|送給)\s*(.+?)\s*(\d+)\s*貝里$/.exec(text)
  if (nameFirst) return { kind: 'give', to: nameFirst[1].trim(), money: Number(nameFirst[2]) }
  const giveItem = /^(?:把|將)\s*(?:(\d+)\s*(?:個|份|把|捲|發|件|本)\s*)?(.+?)\s*(?:轉交給|交給|送給|給)\s*(.+)$/.exec(text)
  // Handing things to NPCs is a story action (e.g. returning the log), so only teammates get the give shortcut.
  if (giveItem && !Object.hasOwn(npcByName, giveItem[3].trim())) return { kind: 'give', to: giveItem[3].trim(), item: giveItem[2].trim(), ...(giveItem[1] ? { count: Number(giveItem[1]) } : {}) }
  if (text === '防守') return { kind: 'guard' }
  if (text === '撤退') return { kind: 'flee' }
  const movement = /^(?:前往|走到|走去|走向|走進|進入|移動到|跑到|回到|返回|去|到|回)\s*([^，,。\s]+?)(?:\s*[，,、]?\s*(?:再|然後)?\s*(找|問|拜訪|跟|和|向)([^，,。]+))?$/.exec(text)
  const local = movement && here ? localAliases[movement[1]]?.[islandAt(here)] : undefined
  if (movement && (local || Object.hasOwn(locationNames, movement[1]))) {
    const destination = local ?? locationNames[movement[1]]
    const next = movement[2] && talkIntent(movement[2] + movement[3])
    if (next) return { kind: 'move', to: destination, talkTo: next.npc }
    return { kind: 'move', to: destination }
  }
  return talkIntent(text)
}

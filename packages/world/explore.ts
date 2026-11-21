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
  寵物店廢墟: 'petShop',
}
/** Generic words that mean "the one on this island", resolved against the speaker's current island. */
const portOf = Object.fromEntries(Object.entries(islands).map(([id, island]) => [id, island.port])) as Record<IslandId, LocationId>
const localAliases: Record<string, Partial<Record<IslandId, LocationId>>> = {
  港口: portOf, 碼頭: portOf, 港邊: portOf, 船邊: portOf,
  大街: { shells: 'shellsTown', orange: 'orangeStreet' }, 鎮上: { shells: 'shellsTown', orange: 'orangeStreet' },
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

export function directions(place: LocationId, { hillClosed = false, inCombat = false, down = false } = {}) {
  const nearby = paths[place].filter(id => !hillClosed || id !== 'hill')
  const local = Object.keys(people).filter(id => people[id as NpcId].place === place) as NpcId[]
  if (down) return { text: '你倒在' + locations[place] + '。請同伴帶繃帶前來包紮。', suggestions: [] }
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
    ...(place === 'goa' ? ['買普通武士刀'] : []),
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
  if (sailing) return sailing
  for (const story of Object.values(islandStories)) {
    const step = story.samples.indexOf(text)
    if (step !== -1) return { kind: 'islandTask', step: (['accept', 'search', 'deliver'] as const)[step] }
  }
  if (/^(?:找[^，。]{1,24}(?:一起)?|和[^，。]{1,24}(?:一起)?|跟[^，。]{1,24}(?:一起)?)?(?:想|要|來)?(?:成立|組建|組成)(?:一個|一支)?(?:海賊團|船團)$/.test(text)) return { kind: 'crew' }
  if (/^(?:吃|點|點一份|買|來一份|來份)(?:一個|一份|一片)?(?:烤)?麵包$/.test(text)) return { kind: 'meal', dish: 'bread' }
  if (/^(?:吃|點|買|來一份|來份)(?:一碗|一份)?(?:爌肉飯|控肉飯|燉肉飯|滷肉飯)$/.test(text)) return { kind: 'meal', dish: 'rice' }
  if (/^(?:接受|接下|接)(?:潮汐簿)?(?:的)?委託$/.test(text)) return { kind: 'quest', step: 'accept' }
  if (/^(?:交還|還回|歸還)潮汐簿$/.test(text)) return { kind: 'quest', step: 'deliver' }
  if (/^(?:和|跟|找)?岬恩(?:交涉|談(?:工錢|潮汐簿))$/.test(text)) return { kind: 'negotiate', npc: 'courier' }
  if (/^(?:查看|觀察|調查)(?:山徑|山道|山路)上的(?:痕跡|鞋印)$/.test(text)) return { kind: 'check', method: 'observe' }
  if (/^(?:買|購買)(?:一把)?(?:普通)?武士刀$/.test(text)) return { kind: 'buy', item: 'sword' }
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

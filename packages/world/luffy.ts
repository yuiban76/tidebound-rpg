// What Luffy is doing at every stop of his voyage (luffyRoute in canon.ts), for the 魯夫 tab.
import { locations, npcs } from '../shared/protocol.ts'
import { isDown } from '../rules/combat.ts'
import { luffyRoute, minuteOf } from './canon.ts'
import type { RouteStop } from './canon.ts'
import { flagsHold, hasFlag } from './flags.ts'
import { islandAt, islands } from './sea.ts'
import { npcPlace } from './village.ts'
import type { World } from './village.ts'

type Doing = {
  text: string
  /** Instead of 海上 while he is on no island. */
  where?: string
  /** What the players did changes it: the first one whose flags all hold (see flags.ts) wins. */
  instead?: { when: string[], text: string, where?: string }[]
  /** Canon events at this stop that went as in the manga: the latest one that has happened wins. */
  then?: [event: string, text: string][]
}

const if_ = (flag: string, text: string, where?: string) => ({ when: [flag], text, where })

export const stopId = (stop: RouteStop) => stop.at.join('-')
const setOut: Doing = { text: '清晨獨自乘著小船離開風車村，說要成為海賊王。', where: '東海上（剛離開風車村）' }

export const luffyDoing: Record<string, Doing> = {
  '2-8': { text: '在謝爾茲鎮打聽被綁在基地的劍士索隆，想拉他當第一個夥伴。',
    instead: [if_('recruited:zoro', '在謝爾茲鎮聽說劍士索隆早已跟別人走了，吃了頓飯，準備繼續找夥伴。')],
    then: [['shells', '打倒了蒙卡上校，替索隆鬆了綁，正一起大吃一頓。']] },
  '2-16': { text: '和新夥伴索隆乘著小船，漫無目的地漂著找下一個夥伴。' },
  '3-10': { text: '在橘子鎮跟小丑巴其的海賊團起了衝突。',
    instead: [if_('recruited:buggy', '來到橘子鎮時，巴其早已被一群旅人帶走，他在鎮上找東西吃。')],
    then: [['orange', '把小丑巴其打飛了，正和鎮上的小狗一起慶祝。']] },
  '3-18': { text: '和航海士娜美同行，駕著小船找一艘像樣的船。', instead: [if_('recruited:nami', '駕著小船，想找一艘像樣的船。')] },
  '3-22': { text: '為了找船來到西羅布村，聽說了黑貓海賊團的計畫。',
    instead: ['task:syrup', 'defeated:klahadore', 'recruited:klahadore'].map(flag => if_(flag, '為了找船來到西羅布村。村子平安無事，他在到處找肉吃。')),
    then: [['syrup', '打退了黑貓海賊團，正和騙人布一夥慶祝。']] },
  '4-12': { text: '得到了前進梅利號，正帶著狙擊手騙人布航行。' },
  '5-20': { text: '撞壞了海上餐廳巴拉蒂，正在當打雜的還債，還想拉廚師香吉士入夥。',
    instead: [if_('recruited:sanji', '撞壞了海上餐廳巴拉蒂，正在當打雜的還債，聽說副料理長早就跟別人出海了。')],
    then: [['baratie', '打退了克利克海賊團，等著香吉士跟哲夫道別。']] },
  '6-18': { text: '帶著新夥伴香吉士，追著娜美的去向。', instead: [if_('recruited:nami', '帶著新夥伴香吉士，繼續找下一個夥伴。')] },
  '7-14': { text: '追著娜美來到可可亞西村，要跟惡龍算帳。',
    instead: [...['task:cocoyasi', 'recruited:arlong'].map(flag => if_(flag, '來到可可亞西村時，惡龍已經不在了，他跟著村民一起吃吃喝喝。')),
      if_('recruited:nami', '來到可可亞西村，聽說惡龍欺負村民，要去跟他算帳。')],
    then: [['arlong', '打垮了惡龍樂園，正在村裡的宴會上大吃大喝。']] },
  '8-20': { text: '豎起草帽一夥的旗子，正要去看海賊王被處死的城鎮。' },
  '9-12': { text: '來看海賊王羅傑的處刑台，還自己爬了上去。' },
  '9-20': { text: '迎著暴風雨，朝偉大航路的入口顛倒山前進。' },
  '10-12': { text: '衝下顛倒山，撞上了巨鯨拉布，正跟牠約好再打一場。' },
  '11-6': { text: '跟著記錄指針，航向威士忌山峰。' },
  '11-20': { text: '在威士忌山峰的歡迎宴會上大吃大喝，肚子吃得圓滾滾的。' },
  '12-4': { text: '答應送公主薇薇回阿拉巴斯坦，正在航行。' },
  '13-12': { text: '在小花園和巨人東利、布洛基交了朋友，看他們決鬥。' },
  '14-16': { text: '娜美發了高燒，全船正在找有醫生的島。', instead: [if_('recruited:nami', '離開小花園，正在找下一座島。')] },
  '16-10': { text: '在大角鎮打聽醫生，要揹著娜美爬上山。', instead: [if_('recruited:nami', '在大角鎮聽說山頂的城堡住著一位老醫生。')] },
  '17-8': { text: '爬上磁鼓山頂的城堡，看中了會說話的馴鹿喬巴。',
    instead: [if_('recruited:chopper', '爬上磁鼓山頂的城堡，聽說會說話的馴鹿早已跟別人走了。')],
    then: [['drum', '把瓦波爾打飛了，正看著滿天的粉紅色雪花。']] },
  '18-14': { text: '帶著船醫喬巴，全速航向阿拉巴斯坦。' },
  '21-10': { text: '在那諾哈娜的餐廳狂吃，遇見了哥哥艾斯。' },
  '23-10': { text: '闖進雨地的賭場，要找克洛克達爾算帳。',
    instead: ['defeated:crocodile', 'recruited:crocodile', 'task:alabasta'].map(flag => if_(flag, '來到雨地時，克洛克達爾已經不在了，他在賭場的廚房裡找肉吃。')) },
  '25-10': { text: '趕到首都阿爾巴那，要打倒克洛克達爾。',
    instead: ['recruited:crocodile', 'task:alabasta'].map(flag => if_(flag, '來到首都阿爾巴那，內戰已經平息，他在王宮裡大吃大喝。')),
    then: [['alabasta', '打倒了克洛克達爾，在王宮裡睡得不省人事。']] },
  '27-8': { text: '跟薇薇道別，離開阿拉巴斯坦，船上多了考古學家羅賓。', instead: [if_('recruited:vivi', '離開阿拉巴斯坦，船上多了考古學家羅賓。')] },
  '28-12': { text: '在莫克鎮打聽怎麼去空島，被一群海賊嘲笑。' },
  '29-6': { text: '在庫力克斯的家，準備搭衝天海流飛上空島。' },
  '29-12': { text: '乘著衝天海流，連人帶船飛上了天空。', where: '衝天海流上' },
  '30-10': { text: '抵達空島，在天使海灘的雲上玩得不亦樂乎。' },
  '33-12': { text: '闖到神之社，要跟自稱神的艾涅爾分個高下。',
    instead: ['defeated:enel', 'recruited:enel', 'task:skypiea'].map(flag => if_(flag, '來到神之社時，自稱神的艾涅爾已經不在了，他正在找黃金鐘。')),
    then: [['skypiea', '敲響了黃金鐘，正和空島的人們一起開宴會。']] },
  '34-8': { text: '從空島回到了海上，正帶著黃金找地方修理梅利號。' },
  '40-10': { text: '剛到七水之都，準備賣掉黃金、修理梅利號。' },
  '41-12': { text: '在卡雷拉公司找船匠替梅利號估價。',
    then: [['w7Merry', '聽到梅利號再也不能航行，正為了要不要換船跟夥伴爭執。']] },
  '44-21': { text: '在港口望著梅利號，誰跟他說話都不太理。',
    instead: [if_('recruited:usopp', '在港口跟梅利號道別。'), if_('saga:w7.duel', '和騙人布一起守著梅利號，說要送它走完最後一程。')],
    then: [['w7Duel', '跟騙人布決鬥完，一個人把草帽壓得低低的。']] },
  '45-8': { text: '離開了梅利號，在船塢附近落腳，到處找失蹤的羅賓。',
    then: [['w7Shot', '全城都在追捕草帽一夥，他躲著追兵找羅賓。']] },
  '46-20': { text: '要闖進冰山的宅邸，當面問羅賓為什麼要走。',
    then: [['w7Mansion', '跟路基交手後被打倒，宅邸陷入一片火海。']] },
  '47-8': { text: '重新站了起來，正在打聽羅賓會被帶去哪裡。' },
  '47-18': { text: '趕到藍色車站，要追上載著羅賓的海列車。',
    then: [['water7', '海列車開走了。他說就算用游的，也要追到司法島。']] },
  '47-22': { text: '站在火箭人的車頭，衝破亞誇・拉格娜往司法島去。', where: '開往司法島的火箭人上' },
  '48-6': { text: '一個人衝進司法島前院，跟守軍打成一團。' },
  '48-7': { text: '在法院屋頂跟布魯諾交手。',
    instead: ['defeated:blueno', 'recruited:blueno'].map(flag => if_(flag, '站上法院屋頂，隔著瀑布大喊羅賓的名字。')),
    then: [['enCourt', '向全世界宣戰，正要衝進司法塔。']] },
  '48-9': { text: '衝進司法塔，要把被押走的羅賓搶回來。', instead: [if_('task:eniesLobby', '羅賓已經平安了，他衝進司法塔，要跟 CP9 算總帳。')] },
  '48-12': { text: '在猶豫橋的橋墩裡跟路基決戰。',
    instead: ['defeated:lucci', 'recruited:lucci'].map(flag => if_(flag, '趕到猶豫橋，準備帶大家離開司法島。')),
    then: [['enies', '打倒了路基，累得連手指都動不了。']] },
  '48-14': { text: '乘著來接夥伴的梅利號衝出火海，回七水之都。', where: '前進梅利號上',
    instead: [if_('saga:en.buster', '乘著來接夥伴的梅利號，回七水之都。')] },
  '49-8': { text: '在船塢養傷，等新船造好。',
    then: [['w7Garp', '挨了爺爺卡普一拳，正在等新船造好。'], ['w7Sunny', '新船千陽號下水了，正等全員到齊出航。']] },
  '53-8': { text: '乘著新船千陽號出航，航向魔之三角地帶。' },
  '55-10': { text: '在恐怖三桅帆船登岸探險，想拉會說話的骷髏布魯克入夥。', instead: [if_('recruited:brook', '在恐怖三桅帆船登岸探險。')] },
  '56-4': { text: '闖進摩利亞的宅邸，要搶回被奪走的影子。', instead: [if_('recruited:moria', '闖進宅邸時摩利亞已經不在了，他正在找廚房。')],
    then: [['thriller', '打倒摩利亞、搶回了影子，正和大家開宴會。']] },
  '56-12': { text: '帶著音樂家布魯克，正航向夏波帝諸島。' },
  '57-10': { text: '在夏波帝諸島找鍍膜師，準備前往魚人島。' },
  '58-12': { text: '闖進人口拍賣所，要救出人魚凱米。', instead: [if_('task:sabaody', '來到人口拍賣所，人魚凱米已經被救走了。')],
    then: [['sabaody', '揍飛了天龍人，正被海軍追捕。']] },
  '59-12': { text: '在夏波帝被大熊拍飛，沒有人知道他在哪裡。', where: '下落不明' },
  '61-10': { text: '落在女兒島，聽說哥哥艾斯要被處刑，正想辦法去救他。',
    instead: [if_('task:impelDown', '落在女兒島，聽說哥哥艾斯已經逃出了推進城，鬆了一口氣。')] },
  '63-8': { text: '偷偷躲在漢考克身邊，要潛入推進城救哥哥。', where: '漢考克搭乘的軍艦上',
    instead: [if_('task:impelDown', '離開女兒島，正在打聽哥哥和夥伴們的下落。', '海上（剛離開女兒島）')] },
  '64-10': { text: '潛入推進城，要救哥哥艾斯。' },
  '66-8': { text: '中了麥哲倫的毒，在第五層撐著一口氣，還想往下走。' },
  '70-6': { text: '和逃犯們衝出推進城，正趕往馬林福特。', where: '搶來的軍艦上',
    instead: [if_('task:impelDown', '正在打聽哥哥和夥伴們的下落。', '海上（剛離開女兒島）')] },
  '72-15': { text: '從天而降，正一路衝向處刑台。' },
  '72-17': { text: '在處刑台前拼命，要救哥哥艾斯。', instead: [if_('war:pullAce', '和哥哥艾斯一起撤往海灣。')],
    then: [['warRescue', '救下了艾斯，兄弟倆正並肩殺向海灣。'], ['warAkainu', '抱著倒下的哥哥，再也說不出話來。']] },
  '72-20': { text: '頂上戰爭結束後，沒有人知道他去了哪裡。', where: '下落不明',
    instead: [if_('task:impelDown', '沒有人知道他去了哪裡。', '下落不明')] },
}

type LuffyWorld = Pick<World, 'members' | 'minute' | 'npcPlaces'> & Partial<Pick<World, 'timeline' | 'islandTasks' | 'npcDown' | 'defeated' | 'flags' | 'companions' | 'crew'>>
/** Where Luffy is right now and what he is up to, following what the players changed. */
export function luffyNow(world: LuffyWorld) {
  const place = npcPlace(world, 'luffy')
  const passed = luffyRoute.filter(stop => minuteOf(stop.at) <= world.minute && world.timeline?.['luffy@' + stopId(stop)])
  const cancelled = (stop: RouteStop) => !!stop.unless && stop.place !== place && world.islandTasks?.[stop.unless]?.stage === 'done'
  const stop = passed.findLast(item => !cancelled(item))
  const note = stop ? luffyDoing[stopId(stop)] : setOut
  const since = stop ? minuteOf(stop.at) : minuteOf([1, 6])
  const left = passed.findLast(item => item.place && !cancelled(item) && !(item.skip && hasFlag(world, item.skip)))
  const changed = note.instead?.find(option => flagsHold(world, option.when))
  // A stop he skipped (see followLuffy) leaves him at sea.
  const skipped = !!stop?.place && !place
  const where = place ? locations[place] : changed?.where ?? note.where ?? (left ? '海上（剛離開' + islands[islandAt(left.place!)].name + '）' : '海上')
  const taken = !!stop?.joins && hasFlag(world, 'recruited:' + stop.joins)
  const doing = isDown(world, 'luffy') ? '被打倒了，正在休養。'
    : skipped ? stop.skipFacts ?? '改變了航線，正在海上。'
    : taken ? '想拉' + npcs[stop.joins!] + '入夥，卻發現對方早已跟著別人走了，正在繼續找夥伴。'
    : note.then?.findLast(([event]) => world.timeline?.[event] === 'canon')?.[1] ?? changed?.text ?? note.text
  // The island to draw him at: the one he is on, or the one he last left.
  const near = place ? islandAt(place) : where === '下落不明' ? null : left ? islandAt(left.place!) : 'wind'
  return { place, where, doing, since, near }
}

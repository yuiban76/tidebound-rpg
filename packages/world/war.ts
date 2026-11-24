// The Summit War (Day 72 at Marineford), played out in stages instead of one roll. Each stage is a canon event
// (canon.ts) that fires at its hour; before it fires, the party can take on battlefield goals that change how it
// plays out. The players pick a side first: helping Whitebeard save Ace, helping the Marines, or only watching.
// Legendary fighters are not meant to be beaten: goals are about holding, reaching or pulling someone away in time.
import type { LocationId, NpcId } from '../shared/protocol.ts'
import type { CanonEvent } from './canon.ts'
import type { World } from './village.ts'

export type WarSide = 'whitebeard' | 'marine' | 'none'
export const warSides: Record<WarSide, string> = { whitebeard: '協助白鬍子救出艾斯', marine: '協助海軍守住處刑', none: '只在一旁觀戰' }

type Attribute = 'STR' | 'AGI' | 'CON' | 'PER' | 'INT' | 'WIL'
export type WarGoal = {
  id: string, side: Exclude<WarSide, 'none'>, title: string, place: LocationId
  /** Open from..until, as [hour, minute] on Day 72. The stage it changes fires at `until`. */
  from: [number, number], until: [number, number]
  check: { attr: Attribute, skill: string, dc: number }
  minLevel?: number
  /** Each of these goals already reached adds +2: an open wall or a clear path makes the next step easier. */
  helpedBy?: string[]
  done: string, miss: string
}

export const warDay = 72
/** Minute of a Day 72 [hour, minute]. */
export const warMinute = ([hour, minute]: [number, number]) => (warDay - 1) * 1440 + hour * 60 + minute

export const warGoals: WarGoal[] = [
  { id: 'stopSquard', side: 'whitebeard', title: '擋下斯庫亞多的刀', place: 'marinefordBay', from: [12, 0], until: [13, 0],
    check: { attr: 'PER', skill: '觀察', dc: 15 }, minLevel: 8,
    done: '你看穿了斯庫亞多眼裡的動搖，在他拔刀的一瞬間撞開了他的手臂；白鬍子回頭看了你一眼，什麼也沒說。',
    miss: '戰場太亂，你沒能靠近白鬍子身邊，只看到傘下的船長們臉色越來越難看。' },
  { id: 'holdWall', side: 'whitebeard', title: '卡住包圍牆的機關', place: 'mfWall', from: [12, 0], until: [14, 0],
    check: { attr: 'INT', skill: '工藝', dc: 15 },
    done: '你把殘破的船錨塞進升降機的齒輪，一段包圍牆卡在半空，留下一道能讓船衝進來的缺口。',
    miss: '守牆的海軍把你逼了回來，牆面還在一點一點升起。' },
  { id: 'coverLanding', side: 'whitebeard', title: '掩護逃犯落地', place: 'oris', from: [14, 0], until: [15, 0],
    check: { attr: 'AGI', skill: '閃避', dc: 14 },
    done: '你在廣場清出一塊空地，擋下了瞄準落點的炮擊；從天而降的軍艦砸進冰面時，下面沒有海軍的槍口。',
    miss: '炮火太密，你只能先找掩護，看著海軍把槍口對準天空。' },
  { id: 'openPath', side: 'whitebeard', title: '替魯夫開路', place: 'oris', from: [15, 0], until: [17, 0],
    check: { attr: 'STR', skill: '格鬥', dc: 16 }, minLevel: 9, helpedBy: ['holdWall', 'coverLanding'],
    done: '你和白鬍子海賊團的人一起撞開了海軍的人牆，戴草帽的少年從你身邊衝了過去，直奔處刑台。',
    miss: '海軍的人牆又補上了，你被擠回廣場邊緣。' },
  { id: 'pullAce', side: 'whitebeard', title: '在赤犬出手前把艾斯拉開', place: 'oris', from: [17, 0], until: [18, 0],
    check: { attr: 'AGI', skill: '閃避', dc: 20 }, minLevel: 10, helpedBy: ['holdWall', 'coverLanding', 'openPath'],
    done: '岩漿拳落下的前一刻，你從側面撲倒了艾斯；熔岩擦過你們頭頂，打穿了身後的冰面。',
    miss: '你還沒衝到，赤犬已經擋在他們面前。再快一點，也許還來得及。' },
  { id: 'escortWhitebeard', side: 'whitebeard', title: '護送白鬍子撤離', place: 'marinefordBay', from: [18, 0], until: [19, 0],
    check: { attr: 'WIL', skill: '說服', dc: 18 }, helpedBy: ['stopSquard', 'pullAce'],
    done: '你喊住了要留下斷後的白鬍子：「兒子們還需要你！」老人沉默了一會兒，被馬可他們架上了船。',
    miss: '白鬍子把你推回船邊，說這裡由他一個人擋著就夠了。' },
  { id: 'stopTeach', side: 'whitebeard', title: '阻止黑鬍子奪走震震果實', place: 'marinefordBay', from: [18, 30], until: [19, 0],
    check: { attr: 'PER', skill: '觀察', dc: 19 }, minLevel: 10, helpedBy: ['escortWhitebeard'],
    done: '你發現黑鬍子一夥帶著一塊巨大的黑布靠近，搶先一步把他們引開；他們最後空著手離開了海灣。',
    miss: '黑鬍子的人圍成一圈，你看不清裡面在做什麼。' },
  { id: 'holdBay', side: 'marine', title: '守住海灣的冰面', place: 'marinefordBay', from: [12, 0], until: [13, 0],
    check: { attr: 'CON', skill: '閃避', dc: 14 },
    done: '你和海軍士兵一起守住冰面，白鬍子艦隊的第一波衝鋒被擋了下來。',
    miss: '海賊們像潮水一樣湧上冰面，你被迫後退。' },
  { id: 'intercept', side: 'marine', title: '攔截從天而降的逃犯', place: 'oris', from: [14, 0], until: [15, 0],
    check: { attr: 'STR', skill: '格鬥', dc: 15 },
    done: '軍艦落地的瞬間你帶隊包圍上去，逃犯們沒能散開，被困在廣場中央。',
    miss: '逃犯們落地後四散奔逃，你只攔住了其中一兩個。' },
  { id: 'holdScaffold', side: 'marine', title: '守住處刑台', place: 'scaffold', from: [15, 0], until: [17, 0],
    check: { attr: 'CON', skill: '閃避', dc: 16 }, minLevel: 9, helpedBy: ['intercept'],
    done: '你站在處刑台的階梯上，一次又一次把衝上來的人打下去。',
    miss: '一個戴草帽的少年衝破了防線，你被撞下了階梯。' },
]

export const warFlag = (goal: string) => 'war:' + goal
export const goalById = (id: string) => warGoals.find(goal => goal.id === id)

/** The Whitebeard Pirates (or the Marines) on the spot lend a hand: +1 per named fighter of your side there, at most +3. */
export const sideAllies: Record<Exclude<WarSide, 'none'>, NpcId[]> = {
  whitebeard: ['whitebeard', 'marco', 'jozu', 'vista', 'izo', 'namur', 'rakuyo', 'curiel', 'blenheim', 'oarsJr', 'jinbe', 'ivankov', 'luffy'],
  marine: ['sengoku', 'garp', 'akainu', 'aokiji', 'kizaru', 'koby', 'tashigi', 'helmeppo', 'smoker'],
}

/** Stage events, in order. `skip` makes a stage pass silently when the war never happened (the players emptied Impel Down). */
const noWar = ['task:impelDown']
const all = (...flags: string[]) => flags.map(warFlag)

/** The last event's text is built from three independent outcomes, so every combination has its own ending. */
function endings(): NonNullable<CanonEvent['changed']> {
  const ace = { saved: '火拳艾斯活著離開了戰場，被白鬍子海賊團接走', lost: '火拳艾斯為了保護弟弟倒下' }
  const father = { saved: '白鬍子在兒子們的護送下撤出了馬林福特', lost: '白鬍子站著迎來了最後一刻' }
  const teach = { stopped: '黑鬍子空手而歸', took: '黑鬍子奪走了震震果實' }
  const options: NonNullable<CanonEvent['changed']> = []
  for (const aceSaved of [true, false]) for (const fatherSaved of [true, false]) for (const teachStopped of [true, false]) {
    if (!aceSaved && !fatherSaved && !teachStopped) continue // That one is the canon ending.
    const when = [aceSaved && warFlag('pullAce'), fatherSaved && warFlag('escortWhitebeard'), teachStopped && warFlag('stopTeach')].filter(Boolean) as string[]
    const parts = [aceSaved ? ace.saved : ace.lost, fatherSaved ? father.saved : father.lost, teachStopped ? teach.stopped : teach.took]
    options.push({
      when,
      text: parts.join('；') + '。紅髮香克斯現身，一句話讓雙方停手，頂上戰爭落幕，世界局勢從此改寫。',
      effect: {
        move: { ace: null, whitebeard: null },
        facts: {
          ...(aceSaved && { ace: '他從處刑台被救了下來，正和白鬍子海賊團一起離開。' }),
          ...(fatherSaved && { whitebeard: '他被兒子們護送著離開了馬林福特，背上的傷還在流血。' }),
          ...(!teachStopped && { teach: '他奪走了白鬍子的震震果實，在新世界掀起了風浪。' }),
        },
        close: ['marineford'],
      },
    })
  }
  // More conditions first, so the most specific ending wins.
  return options.sort((a, b) => b.when!.length - a.when!.length)
}

export const warStages: CanonEvent[] = [
  { id: 'warSquard', at: [warDay, 13], island: 'marineford', title: '傘下船長的刀',
    text: '傘下船長斯庫亞多聽信了海軍的挑撥，從背後刺傷了白鬍子；白鬍子卻抱住他，說自己是所有兒子的父親。',
    skip: noWar,
    changed: [{ when: all('stopSquard'), text: '斯庫亞多的刀被一個陌生人撞開，白鬍子毫髮無傷；海軍的挑撥沒有得逞。' }] },
  { id: 'warWall', at: [warDay, 14], island: 'marineford', title: '包圍牆升起',
    text: '海軍升起包圍牆，把白鬍子艦隊困在海灣；拖著船衝向處刑台的巨人小奧茲Jr.倒在牆前。',
    effect: { move: { oarsJr: null }, facts: { oarsJr: '他在包圍牆前倒下，被同伴們拖回了船上。' } },
    skip: noWar,
    changed: [{ when: all('holdWall'), text: '包圍牆升到一半就卡住了，留下一道缺口；小奧茲Jr.拖著船衝了進去，白鬍子艦隊沒有被困住。' }] },
  { id: 'warLuffy', at: [warDay, 15], island: 'marineford', title: '從天而降的逃犯',
    text: '一艘軍艦從天而降，戴草帽的少年和推進城的逃犯們——巴其、甚平、伊娃可夫、克洛克達爾——掉進了戰場。',
    skip: noWar,
    changed: [
      { when: all('coverLanding'), text: '一艘軍艦從天而降，有人事先清空了落點，戴草帽的少年和推進城的逃犯們毫髮無傷地殺進了戰場。' },
      { when: all('intercept'), text: '一艘軍艦從天而降，海軍早有準備，逃犯們一落地就被包圍在廣場中央。' },
    ] },
  { id: 'warRescue', at: [warDay, 17], island: 'marineford', title: '處刑台上的救援',
    text: '戴草帽的少年衝破了海軍的防線，在處刑台上救下了艾斯；兄弟倆並肩殺向海灣。',
    skip: noWar,
    changed: [
      { by: 'marineford', text: '處刑台上空空如也：艾斯早已被一群旅人救走，戴草帽的少年追著他們的方向衝了出去。' },
      { when: all('holdScaffold', 'intercept'), text: '海軍守住了處刑台，戴草帽的少年一次又一次被打下階梯，始終沒能靠近艾斯。' },
    ] },
  { id: 'warAkainu', at: [warDay, 18], island: 'marineford', title: '岩漿拳',
    text: '赤犬追上了逃走的兄弟倆。艾斯擋在弟弟身前，承受了岩漿拳。',
    effect: { facts: { luffy: '他抱著倒下的哥哥，再也說不出話來。' } },
    skip: noWar,
    changed: [
      { when: all('pullAce'), text: '赤犬的岩漿拳落空了：一群旅人搶先一步把艾斯拉開，兄弟倆被白鬍子海賊團接應上船。',
        effect: { facts: { luffy: '他和哥哥一起逃出來了，說這份恩情一輩子不會忘。' } } },
      { when: all('holdScaffold', 'intercept'), text: '救援失敗了。處刑在海軍的護衛下執行，馬林福特陷入一片寂靜。' },
    ] },
  { id: 'warTeach', at: [warDay, 19], island: 'marineford', title: '最後的戰場',
    text: '白鬍子留下來斷後，站著迎來了最後一刻；黑鬍子一夥趁機現身，用黑布罩住他的身體，奪走了震震果實。',
    skip: noWar,
    changed: [
      { when: all('escortWhitebeard', 'stopTeach'), text: '白鬍子被兒子們護送上船撤離；黑鬍子一夥被引開，空著手離開了海灣。' },
      { when: all('escortWhitebeard'), text: '白鬍子被兒子們護送上船撤離；黑鬍子一夥撲了個空，轉身在戰場上搶奪別的東西。' },
      { when: all('stopTeach'), text: '白鬍子站著迎來了最後一刻；黑鬍子一夥被引開，沒能碰到他的身體。' },
    ] },
]

export const warEndings = endings()

/** Where the war stands for a world: which stages have happened, and which goals were reached. */
export function warState(world: Pick<World, 'timeline' | 'flags' | 'minute'>) {
  return {
    stages: warStages.map(stage => ({ stage, result: world.timeline?.[stage.id] })),
    reached: warGoals.filter(goal => world.flags?.[warFlag(goal.id)] !== undefined).map(goal => goal.id),
  }
}

/** The war day is on: from the morning of Day 72 until the war has ended. */
export const warOn = (world: Pick<World, 'timeline' | 'minute'>) =>
  world.minute >= warMinute([9, 0]) && !world.timeline?.warEnds

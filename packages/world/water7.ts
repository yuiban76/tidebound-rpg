// Water 7 to Enies Lobby (Days 40–53), played out in stages like the Summit War (war.ts): each stage is a canon
// event, and the party can take on goals beforehand that change how it plays out. Without the players everything
// happens as in the original story.
import type { IslandId, LocationId, NpcId } from '../shared/protocol.ts'
import type { CanonEvent } from './canon.ts'
import { newWorldSagas } from './newworld.ts'

type Attribute = 'STR' | 'AGI' | 'CON' | 'PER' | 'INT' | 'WIL'
export type SagaGoal = {
  id: string, title: string, place: LocationId
  /** Open from..until, as [day, hour]; the stage it changes fires at `until`. */
  from: [number, number], until: [number, number]
  check: { attr: Attribute, skill: string, dc: number }
  minLevel?: number
  /** Flags (flags.ts) that each add +2. */
  helpedBy?: string[]
  /** People who lend a hand when they stand on the spot: +1 each, at most +3. */
  allies: NpcId[]
  /** Reputation gained on an island. */
  rep?: [IslandId, number]
  done: string, miss: string
}
export type Saga = {
  id: string, title: string, islands: IslandId[]
  from: [number, number], until: [number, number]
  goals: SagaGoal[], /** Canon event ids in order. */ stages: string[]
}

export const sagaFlag = (goal: string) => 'saga:' + goal
const did = (...goals: string[]) => goals.map(sagaFlag)

const strawHats: NpcId[] = ['luffy', 'zoro', 'nami', 'usopp', 'sanji', 'chopper']
const shipwrights: NpcId[] = ['paulie', 'lulu', 'tilestone']
const frankyFamily: NpcId[] = ['franky', 'zambai', 'kiwi', 'mozu']
/** CP9 agents who each carry a key to the sea-stone cuffs: beating one makes the keys easier to win. */
const keyHolders = ['kaku', 'kalifa', 'jabra', 'kumadori', 'fukurou'].map(npc => 'defeated:' + npc)

export const water7Goals: SagaGoal[] = [
  { id: 'w7.gold', title: '保護草帽一夥的黃金', place: 'water7Port', from: [40, 12], until: [41, 18],
    check: { attr: 'STR', skill: '格鬥', dc: 13 }, allies: ['nami', 'usopp', 'zoro'],
    done: '佛朗基一家從水道裡竄出來搶箱子，你把帶頭的人丟進水裡，黃金一袋也沒少。',
    miss: '他們仗著人多把你擠開，你只搶回了一頂帽子。' },
  { id: 'w7.merry', title: '替梅利號做最後的整修', place: 'galleyLa', from: [40, 12], until: [43, 12],
    check: { attr: 'INT', skill: '工藝', dc: 15 }, allies: ['paulie', 'lulu', 'tilestone', 'franky'],
    done: '龍骨救不回來了，但你和船匠把能補的地方全補上，梅利號至少還能再跑一段路。',
    miss: '木板補上又裂開，船匠搖搖頭，要你再試一次別的接法。' },
  { id: 'w7.duel', title: '勸住要離隊的騙人布', place: 'water7Port', from: [43, 12], until: [44, 22],
    check: { attr: 'WIL', skill: '說服', dc: 16 }, helpedBy: did('w7.gold', 'w7.merry'), allies: ['chopper', 'nami'],
    done: '你陪騙人布在梅利號上坐了一整晚。天亮前他終於哭了出來，說自己只是怕有一天也會像船一樣被丟下。',
    miss: '騙人布甩開你的手：「你不懂！這艘船是我們的夥伴！」' },
  { id: 'w7.guard', title: '守住冰山的宅邸', place: 'iceburgMansion', from: [46, 6], until: [46, 22],
    check: { attr: 'PER', skill: '觀察', dc: 16 }, minLevel: 5, helpedBy: ['task:water7', 'defeated:lucci', 'defeated:kaku'],
    allies: ['iceburg', ...shipwrights],
    done: '你認出面具下的走路姿勢，當著眾人的面喊破了 CP9 的身分。船匠們圍了上來，沒有人碰得到冰山。',
    miss: '宅邸太大，你追著影子跑了一圈，回到原地時門已經被打開過了。' },
  { id: 'w7.laguna', title: '疏散後街的居民', place: 'backStreet', from: [47, 8], until: [47, 22],
    check: { attr: 'WIL', skill: '說服', dc: 14 }, allies: ['zambai', 'chopper', ...shipwrights], rep: ['water7', 20],
    done: '你挨家挨戶敲門，把走不動的老人背到造船廠的高地，後街最後一盞燈熄滅時，海平面剛好開始退。',
    miss: '居民說大潮年年都來，不肯走。你只勸動了幾戶人家。' },
  { id: 'w7.board', title: '趕在發車前救人', place: 'blueStation', from: [47, 12], until: [47, 20],
    check: { attr: 'AGI', skill: '閃避', dc: 17 }, minLevel: 5, allies: ['sanji', 'nami', 'chopper'],
    done: '你鑽過月台下的黑衣人，扯開最後一節車廂的門，把被捆成粽子的佛朗基和騙人布拖了出來。羅賓隔著車窗對你搖了搖頭。',
    miss: '政府的人把月台圍得水洩不通，你被推回了階梯下。' },
  { id: 'en.giants', title: '說服正門的巨人', place: 'eniesGate', from: [48, 1], until: [48, 6],
    check: { attr: 'WIL', skill: '說服', dc: 16 }, helpedBy: ['task:littleGarden', 'recruited:usopp'], allies: ['usopp', 'kokoro'],
    done: '你說出小花園那兩位還在決鬥的巨人的名字。歐伊摩和卡西愣住了，原來世界政府騙他們守門，騙了五十年。',
    miss: '巨人的斧頭劈開了你腳邊的石板：「我們答應過要守一百年！」' },
  { id: 'en.court', title: '擋住衝向法院的守軍', place: 'courthouse', from: [48, 3], until: [48, 8],
    check: { attr: 'STR', skill: '格鬥', dc: 16 }, minLevel: 5, helpedBy: did('en.giants'), allies: [...strawHats, ...frankyFamily, ...shipwrights],
    done: '你守住通往屋頂的樓梯，上萬守軍硬是沒有一個人擠得上去。',
    miss: '守軍一波接一波，你被逼退到門廊外。' },
  { id: 'en.keys', title: '搶下海樓石手銬的鑰匙', place: 'justiceTower', from: [48, 8], until: [48, 10],
    check: { attr: 'AGI', skill: '閃避', dc: 17 }, minLevel: 6, helpedBy: [...did('en.court'), ...keyHolders], allies: strawHats,
    done: '你在迴廊裡穿過六式的縫隙，把一串鑰匙扯到手上。其中一把，對得上羅賓的手銬。',
    miss: 'CP9 的人一眨眼就換了位置，你撲了個空。' },
  { id: 'en.buster', title: '搶走屠魔令的金色電話蟲', place: 'gateOfJustice', from: [48, 10], until: [48, 13],
    check: { attr: 'PER', skill: '觀察', dc: 19 }, minLevel: 8, helpedBy: [...did('en.keys'), 'defeated:spandam'], allies: strawHats,
    done: '斯潘達姆得意地掏錯口袋的那一瞬間，你一把搶下金色電話蟲，丟進了無底的瀑布。',
    miss: '斯潘達姆縮到衛兵身後，死死抱著那隻電話蟲。' },
  { id: 'en.merry', title: '接應梅利號', place: 'gateOfJustice', from: [48, 12], until: [48, 14],
    check: { attr: 'INT', skill: '航海', dc: 15 }, helpedBy: [...did('w7.merry'), 'defeated:lucci'], allies: ['nami', 'usopp', 'franky'],
    done: '你聽見有人在叫大家往下看。你打信號引開砲火，那艘小小的船穿過漩渦，停在了猶豫橋下。',
    miss: '砲火把海面打成一片白，你看不見任何船影。' },
]

const plea = '我不能讓他們死在屠魔令底下。所以拜託，不要來救我。'
/** Who is on the sea train depends on what the party did before, in any combination; robin goes of her own will. */
function trainOutcomes(): NonNullable<CanonEvent['changed']> {
  const options: NonNullable<CanonEvent['changed']> = []
  for (const lucci of ['recruited:lucci', 'defeated:lucci', '']) for (const board of [true, false])
    for (const franky of [true, false]) for (const usopp of [true, false]) {
      const when = [lucci, board && sagaFlag('w7.board'), franky && 'recruited:franky', usopp && 'recruited:usopp'].filter(Boolean) as string[]
      if (!when.length) continue // The canon departure.
      const others = [!franky && '佛朗基', !usopp && '騙人布'].filter(Boolean) as string[]
      const taken = board ? [] : others
      options.push({
        when,
        text: (lucci === 'defeated:lucci' ? '路基倒下了，但屠魔令的威脅還在。' : lucci ? '路基跟著一群旅人走了，但屠魔令的威脅還在。' : '') +
          (lucci ? '剩下的 CP9' : 'CP9') + ' 押著妮可・羅賓' + (taken.length ? '、' + taken.join('、') : '') + '搭上海列車前往司法島。' +
          (board && others.length ? '一群旅人在發車前救下了' + others.join('和') + '，但羅賓自己選擇留在車上。' : '羅賓說，只要她走，草帽一夥就能平安離開。'),
        effect: {
          move: { robin: 'justiceTower', ...(!franky && { franky: board ? null : 'justiceTower' }) }, close: ['water7'],
          facts: { robin: plea, ...(!franky && { franky: board ? '欠你們一次，超級大的一次！那個女人，我也要去救。' : '設計圖在我這裡的事被他們知道了，超級不妙啊。' }) },
        },
      })
    }
  return options.sort((x, y) => y.when!.length - x.when!.length)
}

export const water7Stages: CanonEvent[] = [
  { id: 'w7Gold', at: [41, 18], island: 'water7', title: '被搶走的黃金',
    text: '佛朗基一家搶走了草帽一夥從空島帶回的黃金。騙人布獨自去討，被打得遍體鱗傷；憤怒的草帽一夥隨後踏平了佛朗基之家。',
    effect: { facts: { usopp: '他說對不起，那些錢本來是要給梅利號修理的。', zambai: '老大拿那筆錢出海買東西去了。後來房子就被那群海賊拆了，我們也沒話說。' } },
    changed: [{ when: ['recruited:usopp', ...did('w7.gold')], text: '佛朗基一家想搶草帽一夥的黃金，卻被一群旅人擋了下來，雙方在港口打成一團後不歡而散。' },
      { when: ['recruited:usopp'], text: '佛朗基一家搶走了草帽一夥從空島帶回的黃金。憤怒的草帽一夥踏平了佛朗基之家，錢卻已經被老大花掉了。' },
      { when: did('w7.gold'), text: '佛朗基一家想搶草帽一夥的黃金，卻被一群旅人擋了下來，雙方在港口打成一團後不歡而散。',
      effect: { facts: { usopp: '多虧你們，黃金沒被搶走。接下來就等船匠把梅利號修好了！' } } }] },
  { id: 'w7Merry', at: [43, 12], island: 'water7', title: '梅利號的宣判',
    text: '卡雷拉公司的船匠檢查了草帽一夥的前進梅利號：龍骨已經重傷，再也無法航行。',
    effect: { facts: { paulie: '龍骨是船的命，沒有一艘船能換掉龍骨再活過來。那艘船已經很了不起了。' } },
    changed: [{ when: did('w7.merry'), text: '船匠宣判前進梅利號的龍骨無法修復。不過有人連夜替它補好了船身，讓它還能再撐一段路。',
      effect: { facts: { paulie: '龍骨救不了。但你們補得很用心，那艘船自己一定知道。' } } }] },
  { id: 'w7Duel', at: [44, 22], island: 'water7', title: '船長與狙擊手的決鬥',
    text: '為了梅利號，騙人布脫離草帽一夥，向船長魯夫提出決鬥。魯夫贏了，兩個人都沒有笑。',
    effect: { facts: { usopp: '我已經不是草帽一夥的人了。梅利號是我的船，我會自己修好它。', luffy: '好重啊……這就是當船長。' } },
    changed: [
      { when: ['recruited:usopp'], text: '草帽一夥在七水之都與梅利號道別。少了狙擊手的他們，甲板上安靜得不像話。' },
      { when: did('w7.duel'), text: '騙人布和魯夫在梅利號前大吵一架，最後誰也沒有動手。他們決定一起送這艘船走完最後一程。',
        effect: { facts: { usopp: '謝謝你們那晚聽我說話。我還是草帽一夥的狙擊手！', luffy: '騙人布哭得好醜喔，嘻嘻嘻。' } } },
    ] },
  { id: 'w7Shot', at: [46, 4], island: 'water7', title: '市長遇襲',
    text: '七水之都的市長冰山深夜在床上中槍。他醒來後說，兇手裡有妮可・羅賓。全城開始追捕草帽一夥。',
    effect: { move: { iceburg: 'iceburgMansion' }, facts: {
      iceburg: '我看見了，戴面具的大漢，還有妮可・羅賓。可是我總覺得，他們找的東西只有身邊的人才知道。',
      kalifa: '市長需要靜養。追查兇手的事，交給我們就好。', luffy: '羅賓才不會做那種事！我要自己去問她！' } } },
  { id: 'w7Mansion', at: [46, 22], island: 'water7', title: '宅邸之夜',
    text: 'CP9 闖入冰山的宅邸搶奪古代兵器的設計圖，兇手竟是祕書卡莉法、船匠路基與卡庫、酒吧老闆布魯諾。羅賓說她要離開草帽一夥；宅邸陷入火海，魯夫被打飛到城市的另一頭。',
    effect: { close: ['water7'], facts: { iceburg: '路基、卡庫、卡莉法……他們從五年前就在騙我。設計圖不在我這裡，他們要去找佛朗基了。' } },
    changed: [
      { when: did('w7.guard'), text: 'CP9 闖入冰山的宅邸，卻被一群旅人當眾喊破身分：祕書卡莉法、船匠路基與卡庫、酒吧老闆布魯諾。冰山平安無事，但羅賓仍然說要離開草帽一夥。',
        effect: { close: ['water7'], facts: { iceburg: '要不是你們，我這條命就沒了。可是羅賓那孩子……她是在保護誰呢？' } } },
      { when: ['recruited:lucci'], text: '路基跟著一群旅人離開了，剩下的 CP9 仍然闖入冰山的宅邸，身分在混亂中曝光。羅賓說她要離開草帽一夥。',
        effect: { close: ['water7'], facts: { iceburg: '兇手是我身邊的人……他們要去找佛朗基了。' } } },
      { when: ['defeated:lucci'], text: '少了路基的 CP9 仍然闖入冰山的宅邸，身分在混亂中曝光。羅賓說她要離開草帽一夥。',
        effect: { close: ['water7'], facts: { iceburg: '兇手是我身邊的人……他們要去找佛朗基了。' } } },
    ] },
  { id: 'water7', at: [47, 20], island: 'water7', title: '海列車的乘客',
    text: 'CP9 押著妮可・羅賓、佛朗基和騙人布搭上海列車前往司法島。羅賓說，只要她走，草帽一夥就能平安離開。',
    effect: { move: { robin: 'justiceTower', franky: 'justiceTower' }, close: ['water7'],
      facts: { robin: plea, franky: '設計圖在我這裡的事被他們知道了，超級不妙啊。' } },
    changed: trainOutcomes() },
  { id: 'w7Laguna', at: [47, 22], island: 'water7', title: '亞誇・拉格娜',
    text: '一年一度的大潮亞誇・拉格娜吞沒了七水之都的後街。可可蘿開出失控的海列車「火箭人」，載著草帽一夥、佛朗基一家和船匠們衝破巨浪，追向司法島。',
    changed: [{ when: did('w7.laguna'), text: '大潮亞誇・拉格娜吞沒了後街，但居民早已撤到高地，沒有人受傷。「火箭人」載著草帽一夥、佛朗基一家和船匠們衝破巨浪，追向司法島。' }] },
  { id: 'enGate', at: [48, 6], island: 'eniesLobby', title: '衝破正門',
    text: '草帽一夥的先鋒衝進司法島。兩名巨人守在正門，佛朗基一家和船匠們拼死拖住他們；狙擊王告訴巨人真相，他們才放下武器倒戈。',
    effect: { facts: { oimo: '原來東利老大和布洛基老大根本沒被抓……我們守錯了門啊！', kashii: '五十年啊！我們被騙了五十年！' } },
    changed: [{ when: ['recruited:usopp', '!saga:en.giants'], text: '草帽一夥的先鋒衝進司法島。兩名巨人守在正門，佛朗基一家和船匠們拼死拖住他們，直到巨人力竭倒下。' },
      { when: did('en.giants'), text: '草帽一夥的先鋒衝進司法島時，正門的兩名巨人已經知道了真相，親手替他們推開了大門。',
      effect: { facts: { oimo: '是你們告訴我們真相的。這扇門，我們再也不守了！', kashii: '謝謝你們，我們可以回艾爾帕布了。' } } }] },
  { id: 'enCourt', at: [48, 8], island: 'eniesLobby', title: '屋頂上的宣戰',
    text: '草帽一夥站上法院屋頂，與司法塔上的羅賓對望。魯夫要狙擊王射穿世界政府的旗幟，向全世界宣戰。羅賓終於哭著喊出：她想活下去。',
    effect: { facts: { robin: '我想活下去……請帶我一起出海！', luffy: '我們一定會救妳！', usopp: '我是狙擊王！來自狙擊島，什麼旗子都射得穿！' } },
    changed: [{ when: ['recruited:usopp'], text: '草帽一夥站上法院屋頂，與司法塔上的羅賓對望。一團火焰燒穿了世界政府的旗幟，草帽一夥向全世界宣戰。羅賓終於哭著喊出：她想活下去。',
        effect: { facts: { robin: '我想活下去……請帶我一起出海！', luffy: '我們一定會救妳！' } } },
      { when: did('en.court'), text: '有人替他們擋下了整座法院的守軍，草帽一夥毫髮無傷地站上屋頂。狙擊王射穿世界政府的旗幟，羅賓終於哭著喊出：她想活下去。',
      effect: { facts: { robin: '我想活下去……請帶我一起出海！', luffy: '我們一定會救妳！', usopp: '我是狙擊王！來自狙擊島，什麼旗子都射得穿！' } } }] },
  { id: 'enTower', at: [48, 10], island: 'eniesLobby', title: '司法塔的鑰匙',
    text: 'CP9 把海樓石手銬的鑰匙分開保管。草帽一夥各自挑上一名對手，斯潘達姆則拖著羅賓走向正義之門。',
    effect: { move: { robin: 'gateOfJustice', spandam: 'gateOfJustice' }, facts: { spandam: '他拖著羅賓往正義之門走，一路摔了三次。' } },
    changed: [{ when: ['task:eniesLobby'], text: '羅賓早已被一群旅人救走。草帽一夥在司法塔裡各自挑上一名 CP9，斯潘達姆氣得把空手銬摔在地上。',
        effect: { move: { spandam: 'gateOfJustice' }, facts: { spandam: '手銬是空的。他抓著頭髮大吼，說回去不知道要怎麼交代。' } } },
      { when: did('en.keys'), text: 'CP9 分開保管的鑰匙，有一把已經被一群旅人搶先拿走。斯潘達姆慌張地拖著羅賓走向正義之門。',
        effect: { move: { robin: 'gateOfJustice', spandam: 'gateOfJustice' }, facts: { spandam: '他拖著羅賓往正義之門走，一路摔了三次。' } } }] },
]

/** After the fight on the bridge (the `enies` event in canon.ts): the Buster Call, the Merry, and the days in Water 7. */
export const water7Aftermath: CanonEvent[] = [
  { id: 'enBuster', at: [48, 13], after: 'enies', island: 'eniesLobby', title: '屠魔令',
    text: '十艘軍艦的砲火落下，斯潘達姆誤觸的屠魔令把司法島轟成一片火海。',
    effect: { flags: ['ruined:eniesLobby'], move: { baskerville: null, traderEnies: null } },
    changed: [{ when: did('en.buster'), text: '斯潘達姆發現金色電話蟲不見了，屠魔令始終沒有發出去。司法島保住了，世界政府的面子沒有。',
      effect: { facts: { baskerville: '判決……判決無法執行。本庭第一次不知道該說什麼。' } } }] },
  { id: 'enMerry', at: [48, 14], after: 'enBuster', island: 'eniesLobby', title: '來接夥伴的船',
    text: '前進梅利號出現在猶豫橋下，載著所有人衝出火海。抵達七水之都外海時，它的船身斷成兩截。草帽一夥含著淚，親手為它送行。',
    effect: { evacuate: { from: 'eniesLobby', to: 'water7Port' }, move: { oimo: null, kashii: null } },
    changed: [
      { when: did('en.merry', 'w7.merry'), text: '前進梅利號出現在猶豫橋下，載著所有人回到了七水之都。補過的船身撐到了港口，冰山答應讓它永遠停在造船廠裡。',
        effect: { evacuate: { from: 'eniesLobby', to: 'water7Port' }, move: { oimo: null, kashii: null },
          facts: { iceburg: '它就停在造船廠最好的船台上。一艘船能為夥伴做到這個地步，我還是第一次見到。' } } },
      { when: did('en.merry'), text: '在旅人的接應下，前進梅利號平安載著所有人離開司法島。它在七水之都外海沉沒前，草帽一夥有時間好好道別。',
        effect: { evacuate: { from: 'eniesLobby', to: 'water7Port' }, move: { oimo: null, kashii: null } } },
    ] },
  { id: 'w7Garp', at: [50, 12], island: 'water7', title: '海軍英雄的來訪',
    text: '海軍中將卡普帶著可比和貝魯梅柏來到七水之都，一拳打醒了睡著的魯夫。原來他是魯夫的爺爺；魯夫的父親，是革命軍總司令龍。',
    effect: { facts: { luffy: '爺爺的拳頭還是好痛……爸爸？我有爸爸喔？' } } },
  { id: 'w7Sunny', at: [52, 18], island: 'water7', title: '千陽號下水',
    text: '佛朗基和卡雷拉公司的船匠用亞當木造好了草帽一夥的新船，千陽號。佛朗基一家哭著要老大跟他們出海。',
    changed: [{ when: ['recruited:franky'], text: '卡雷拉公司的船匠照著佛朗基留下的圖紙，替草帽一夥造好了新船千陽號。佛朗基本人早已跟著別的旅人出海了。' }] },
  { id: 'w7Usopp', at: [53, 7], island: 'water7', title: '歸隊',
    text: '千陽號出港時，騙人布在岸上哭著道歉。魯夫伸長了手把他拉上船，草帽一夥又到齊了。',
    effect: { facts: { usopp: '對不起……讓我回來吧！' } },
    changed: [
      { when: ['recruited:usopp'], text: '千陽號出港了。草帽一夥的狙擊手位置空著，魯夫說總有一天會找到人。' },
      { when: did('w7.duel'), text: '千陽號出港了。騙人布站在船頭吹牛，說這艘船的大砲全都要歸他管，草帽一夥一個也沒少。' },
    ] },
]

export const water7Saga: Saga = {
  id: 'water7', title: '七水之都與司法島', islands: ['water7', 'eniesLobby'], from: [40, 10], until: [53, 8], goals: water7Goals,
  stages: [...water7Stages.map(stage => stage.id), 'enies', ...water7Aftermath.map(stage => stage.id)],
}
export const sagas: Saga[] = [water7Saga, ...newWorldSagas]
export const sagaGoals = sagas.flatMap(saga => saga.goals)

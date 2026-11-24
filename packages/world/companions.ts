// NPC companions: named NPCs who join the party and follow it, board the ship and fight beside the players.
// The rules core owns every fact here. The narrator only describes it, so a companion can never "say yes"
// in the story and then stay behind on the island.
import { scale } from './scale.ts'
import { npcs } from '../shared/protocol.ts'
import type { IslandId, NpcId } from '../shared/protocol.ts'
import { npcProfiles } from './foes.ts'
import { npcPlace, party, people } from './village.ts'
import type { Companion, World } from './village.ts'

/** Hammocks on the ship: how many NPC companions can travel with the party at once. */
/** The whole crew, real players and companions together, tops out at ten. */
export const maxCrew = 10
/** Minutes before the same NPC will listen to another invitation after refusing. */
export const retryMinutes = 120

export type RecruitProfile = {
  /** How they carry themselves; the narrator uses it to keep their manner consistent. */
  trait: string
  /** Spoken lines. They are rules text, so the story never contradicts the party state. */
  join: string, refuse: string, leave: string
  /** D20 + WIL + 說服 (+4 when the trust quest is done) must reach this. */
  dc: number
  /** Hard requirements: this island's quest must be finished, and/or the party must reach this level. */
  needsTask?: IslandId, minLevel?: number
  /** A finished quest that makes them trust the party. */
  trustTask?: IslandId
  /** An enemy of the party: harder to win over, and only follows a party that is strong enough. */
  villain?: boolean
  /** What they know and talk about while in the party. */
  facts: string
  /** Fighting numbers when they fight beside the players: roll D20 + attr + skill, damage die + attr + bonus. */
  fight: { hp: number, def: number, attr: number, skill: number, die: number, bonus: number, move: string }
  /** Treats the party while resting: everyone recovers a little more. */
  medic?: boolean
}

// The hand-written profiles: the Straw Hats. The generator below fills in everyone else.
const featured: Partial<Record<NpcId, RecruitProfile>> = {
  usopp: {
    trait: '愛吹牛、膽子小，關鍵時刻卻會豁出去；夢想是成為勇敢的海上戰士',
    join: '包在我身上！我可是八千個部下的老大……好啦，其實是一個人。不過跟你們出海，我騙人布大爺答應了！',
    refuse: '呃……我想想喔，我還得顧著可雅小姐這邊，這種大事不能隨便答應啦！',
    leave: '好吧，我先在這裡等你們。回來記得來找我，我會編個超厲害的故事等你們！',
    dc: 9, trustTask: 'syrup',
    facts: '已加入玩家的船團，跟著大家航行。愛吹牛、容易害怕，但關鍵時刻會拿彈弓挺身掩護同伴。',
    fight: { hp: 28, def: 13, attr: 1, skill: 3, die: 6, bonus: 0, move: '彈弓狙擊' },
  },
  zoro: {
    trait: '寡言、方向感很差，只認有實力又講義氣的人；夢想是成為世界第一的大劍豪',
    join: '……要我當你們的夥伴？行。不過我只認一個規矩：誰擋了我的路，我就砍誰。',
    refuse: '我不跟弱的人走。等你們有那個本事再來說。',
    leave: '我在這裡等。別讓我等太久，不然我就自己亂逛去了。',
    dc: 15, minLevel: 3, trustTask: 'shells',
    facts: '已加入玩家的船團，是個沉默的劍士。三把刀並用，方向感差，最討厭欠人情。',
    fight: { hp: 70, def: 16, attr: 4, skill: 5, die: 8, bonus: 3, move: '三刀流' },
  },
  sanji: {
    trait: '脾氣火爆卻對女士溫柔的廚師，只用腳戰鬥；夢想是找到 ALL BLUE',
    join: '要我上你們的船當廚師？哼，只要你們不浪費食物，這份工作我接了！',
    refuse: '我欠哲夫老頭的債還沒還清，餐廳的事我不能丟下。',
    leave: '我先回廚房晃晃。想吃好東西的時候再來找我。',
    dc: 13, needsTask: 'baratie',
    facts: '已加入玩家的船團，負責船上的伙食。只用腳戰鬥，絕不弄髒雙手，對女士特別客氣。',
    fight: { hp: 60, def: 16, attr: 4, skill: 4, die: 8, bonus: 2, move: '踢技' },
  },
  vivi: {
    trait: '堅強的公主，說話有禮；一心想保護祖國阿拉巴斯坦',
    join: '我能幫上忙的話，請讓我同行。但我也有必須完成的事，希望你們能理解。',
    refuse: '很抱歉，我現在還不能離開崗位，還有任務沒有完成。',
    leave: '我會在這裡等你們，一切保重。',
    dc: 12, trustTask: 'whiskyPeak',
    facts: '已加入玩家的船團。是阿拉巴斯坦的公主，說話有禮，使用孔雀弦月刃。',
    fight: { hp: 30, def: 13, attr: 1, skill: 2, die: 6, bonus: 0, move: '孔雀弦月刃' },
  },
  chopper: {
    trait: '害羞的馴鹿醫生，被稱讚會一邊罵人一邊扭來扭去；夢想是治好所有疾病',
    join: '你、你們真的要帶我走？才、才不會高興呢！……我會好好照顧大家的！',
    refuse: '我、我還不能走，我的老師還有很多東西沒教完……',
    leave: '我、我會在這裡等你們喔。有人受傷的話，要馬上回來找我！',
    dc: 10, needsTask: 'drum',
    facts: '已加入玩家的船團，是船醫。害羞，被稱讚時會嘴硬地扭動，隨時準備替受傷的人包紮。',
    fight: { hp: 45, def: 13, attr: 2, skill: 2, die: 6, bonus: 0, move: '蹄技' },
    medic: true,
  },
  robin: {
    trait: '冷靜、神秘，喜歡讀歷史；說話帶著淡淡的笑意',
    join: '呵呵，好啊，我就暫時跟著你們吧。有你們在，說不定能找到我想知道的答案。',
    refuse: '我還不太習慣相信別人。再給我一點時間吧。',
    leave: '那我先在這裡待著。需要我的時候，隨時來找我。',
    dc: 14, needsTask: 'eniesLobby',
    facts: '已加入玩家的船團，是考古學家。冷靜神秘，擅長讀歷史本文，戰鬥時以擒拿制住對手。',
    fight: { hp: 45, def: 14, attr: 2, skill: 4, die: 6, bonus: 2, move: '擒拿' },
  },
  franky: {
    trait: '誇張的改造人，開口閉口都是「超級」；造船技術一流，愛喝可樂',
    join: '哦哦哦！超級好！我佛朗基就跟你們走了！船壞了儘管叫我！',
    refuse: '現在還不行啦！我這邊有一堆事沒處理完，超級忙的！',
    leave: '超級沒問題！我先在這邊顧著，回來記得帶可樂啊！',
    dc: 12, needsTask: 'water7',
    facts: '已加入玩家的船團，是造船師傅兼改造人。說話誇張，船出狀況時最可靠。',
    fight: { hp: 75, def: 14, attr: 4, skill: 2, die: 8, bonus: 2, move: '改造人拳擊' },
  },
  brook: {
    trait: '愛開骷髏玩笑的音樂家，彬彬有禮卻有點色；劍術高強',
    join: '喲吼吼吼！我是只剩骨頭的布魯克，願意為各位的旅程拉一曲！',
    refuse: '很抱歉，我還有一件放不下的事……喲吼吼吼，骷髏的玩笑。',
    leave: '那我先在這裡等你們，順便練練新曲子。喲吼吼吼！',
    dc: 10, needsTask: 'thrillerBark',
    facts: '已加入玩家的船團，是音樂家兼劍士。彬彬有禮，常自嘲只剩骨頭。',
    fight: { hp: 45, def: 15, attr: 2, skill: 5, die: 6, bonus: 1, move: '拔劍' },
  },
}


// Everyone else can be recruited too, with a profile built from their role and strength. Villains are tougher to
// win over (and want a party that is strong enough); ordinary residents mostly worry about what they leave behind.
// The few who cannot follow the party are the story's anchors, listed in `cannotJoin` with their reason.
export const cannotJoin: Partial<Record<NpcId, string>> = {
  luffy: '魯夫有自己的航路，而且他早就有自己的船長夢想，不會當別人的夥伴。',
  ace: '艾斯是白鬍子海賊團的隊長，他的命運繫在別的地方，不會離隊。',
  whitebeard: '白鬍子是四皇，他的兒子們才是他的船員，他不會跟著別人走。',
  sengoku: '戰國是海軍元帥，肩上扛著整個海軍，不可能加入海賊團。',
  rayleigh: '雷利只是個在酒吧喝酒的老人，他不會再出海了。',
  laboon: '拉布是一頭巨大的鯨魚，上不了你們的船，何況他還在等一個約定。',
  dragon: '革命軍總司令有他自己的戰場，不會讓任何人把他帶上船。',
  charloss: '天龍人只會叫人跪下，不可能跟任何人一起出海。',
  shanks: '香克斯是四皇，有自己的海賊團和船，不會加入別人的船團。',
  garp: '卡普是海軍中將，不會跟海賊同船。',
  akainu: '赤犬信奉「徹底的正義」，絕不會跟海賊並肩。',
  aokiji: '青雉是海軍大將，肩上的身分不允許他加入海賊團。',
  kizaru: '黃猿是海軍大將，不可能離開海軍。',
  kuma: '大熊已被改造成人形兵器，沒有自己的意志，無法被邀請。',
}

const tierFight = [
  { hp: 14, def: 11, attr: 0, skill: 0, die: 4, bonus: 0 },
  { hp: 24, def: 12, attr: 1, skill: 1, die: 4, bonus: 0 },
  { hp: 40, def: 13, attr: 2, skill: 2, die: 6, bonus: 1 },
  { hp: 55, def: 14, attr: 3, skill: 3, die: 6, bonus: 2 },
  { hp: 70, def: 16, attr: 4, skill: 4, die: 8, bonus: 3 },
  { hp: 100, def: 17, attr: 4, skill: 5, die: 10, bonus: 4 },
]
const moves: Partial<Record<NpcId, string>> = {
  morgan: '斧頭右手', helmeppo: '雙刀亂揮', cabaji: '雜技劍術', mohji: '猛獸突擊', jango: '圓環催眠', patty: '料理重拳', carne: '料理重拳',
  nezumi: '指揮刀', kohza: '叛亂軍軍刀', wyper: '燃燒砲', ohm: '鐵雲劍', zambai: '鐵鏈甩擊', baskerville: '三頭長槍', hogback: '手術刀',
  absalom: '獅子砲', marguerite: '蛇弓射擊', sandersonia: '蛇之鞭', marigold: '蛇之火', hannyabal: '拿破崙長槍',
  klahadore: '貓爪突襲', arlong: '魚人空手道', smoker: '十手', crocodile: '沙之攻擊', enel: '雷擊', lucci: '指槍',
  moria: '影子操控', hancock: '媚功踢擊', magellan: '毒霧', bellamy: '彈簧腿', spandam: '指揮刀', dorry: '巨人之斧', brogy: '巨人之斧',
  kureha: '手術刀', chouchou: '撲咬',
  nami: '天候棒', buggy: '小刀亂擲', krieg: '火砲連射', gin: '雙鐵棒', mihawk: '黑刀', tashigi: '長刀斬', dadan: '大砍刀',
  galdino: '蠟拳', wapol: '吞噬砲擊', bonclay: '芭蕾踢', kaku: '指槍', kalifa: '泡泡擒拿', blueno: '鐵塊拳', perona: '負面幽靈',
  law: '房間・切割', kid: '磁力攻擊', killer: '旋轉雙刃', drake: '恐龍衝撞', hawkins: '稻草人反擊', bonney: '老化拳',
  jinbe: '魚人空手道', teach: '黑洞', doflamingo: '操線', marco: '不死鳥之爪', jozu: '鑽石拳', vista: '花之劍舞', ivankov: '新娘拳', pell: '鷹之爪', zeff: '紅腳踢技', igaram: '鐵劍', ganfall: '長槍突刺',
}
/** Hand-written lines for the ones most players will try first; everyone else gets a line by temperament. */
const lines: Partial<Record<NpcId, Pick<RecruitProfile, 'join' | 'refuse' | 'leave'>>> = {
  kaya: { join: '我一直想親眼看看宅邸外面的世界……如果我能幫上忙，請讓我同行。', refuse: '我還不能丟下這座宅邸和村子，請讓我再想想。', leave: '那我先回家等你們。出海回來，請再說說外面的故事給我聽。' },
  klahadore: { join: '……哼，與其繼續演一個管家，不如跟著你們看看有什麼可圖。別指望我對你們太客氣。', refuse: '想要我跟你們走？先讓我看看你們配不配。', leave: '我走了。你們不用謝我，這只是各取所需。' },
  arlong: { join: '嘖……魚人也不是沒有跟人類並肩的時候。我跟你們走，但敢瞧不起我，我照咬！', refuse: '人類憑什麼指揮我？先讓我服氣再說！', leave: '我自己走。要是想讓我回來，拿出點誠意。' },
  smoker: { join: '我是海軍，這點不會變。不過……跟著你們，也許能看到更多該抓的傢伙。我就暫時同行。', refuse: '海軍的上校不會隨便跟海賊同行，別多費唇舌。', leave: '到此為止。下次見面，我可不會手下留情。' },
  crocodile: { join: '呵，跟著你們也不是不行。我只對值得利用的人有興趣，你們最好繼續值得。', refuse: '憑你們也想讓我聽令？笑話。', leave: '就到這裡。你們已經沒有利用價值了。' },
  hancock: { join: '妾身看在你們的份上，勉為其難跟你們走一趟。別以為這是什麼恩惠。', refuse: '妾身的意志豈是你們說動就能動的？', leave: '妾身回九蛇城了。別來打擾。' },
  zeff: { join: '哼，臭小鬼們，既然你們這麼說，老夫就上船去照看你們這群麻煩精。', refuse: '老夫的餐廳還要人看，這種事別再提。', leave: '老夫回餐廳去。想吃飯，隨時來。' },
  kureha: { join: '嘻嘻嘻，有意思，我就跟你們走一趟，看看你們能不能活得夠久讓我治。', refuse: '病人都等著我，你們這群小鬼別來煩我。', leave: '老太婆回城堡去了。要是受了傷，記得來找我。' },
  nojiko: { join: '我也想看看姊姊看過的大海……好，我跟你們走。', refuse: '橘子園和村子還需要我，現在不行。', leave: '我先回村子。要是回來，別忘了帶姊姊的消息。' },
}
const castLines: Partial<Record<NpcId, Pick<RecruitProfile, 'join' | 'refuse' | 'leave'>>> = {
  nami: { join: '好，我們合作！不過先說好，寶藏要分我一半，不然我隨時會把你們賣掉。', refuse: '我才不跟海賊一夥，除非你們能證明對我有用。', leave: '算了，我自己賺錢比較快。有好價錢再來找我。' },
  buggy: { join: '哈哈哈，華麗的巴其大爺就勉為其難加入你們！分贓要算我一份啊！', refuse: '想要我跟你們走？先把華麗的寶藏拿出來再說！', leave: '哼，巴其大爺要去找更華麗的舞台了！' },
  law: { join: '……暫時同行也可以。我只是不想錯過有趣的手術對象。', refuse: '我只和值得的人合作。你們還不夠格。', leave: '到此為止。別以為我欠你們什麼。' },
  jinbe: { join: '既然你們以誠相待，我甚平就陪你們走一程。', refuse: '我身上還有未了的義理，現在不能離開。', leave: '我先告辭。需要我時，隨時來找我。' },
  mihawk: { join: '……有點意思。我暫時與你們同行，看看你們能不能讓我拔劍。', refuse: '我沒有興趣為無趣的對手出劍。', leave: '無聊了，我走了。' },
  marco: { join: '嗯……好吧，我就跟你們走一趟。這種事想想也挺有趣的。', refuse: '老爹的兒子們還等著我，現在不行。', leave: '我先回去了。需要幫忙的話，叫一聲。' },
  perona: { join: 'Horo horo，好吧，我就陪你們玩玩。要給我吃好吃的點心喔！', refuse: '無聊的人我才不要，除非你們夠有趣。', leave: '好無聊喔，我要回去了啦。' },
  dadan: { join: '哼，既然你們這麼說，老娘就跟你們去瞧瞧。可別讓我後悔！', refuse: '山裡一堆小鬼等著我，沒空陪你們玩。', leave: '老娘回山上去了。要是有人欺負你們，就說老娘的名字。' },
}
const manner = (civilian: boolean) => civilian
  ? { join: '好，既然你們都這麼說，我就跟你們走一趟。請多指教。', refuse: '現在不行，我還有放不下的事。以後再說吧。', leave: '那我先回到原本的地方，有需要再來找我。' }
  : { join: '……哼，輸給你們了。與其被你們一直追著，不如跟著你們走。別指望我會對你們客氣。', refuse: '想讓我跟你們走？先讓我心服口服再說。', leave: '我走了。別以為我會感謝你們。' }

const villainFactions = new Set(['pirate', 'tyrant', 'government', 'bandit', 'marine'])
// Roles that tie someone to their place or duty make them slower to agree.
const dutyRole = /村長|鎮長|市長|國王|皇太后|老闆|大小姐|守護|看守|警|醫生|女帝|元帥|長老|駐警/

for (const id of Object.keys(npcs) as NpcId[]) {
  if (featured[id] || cannotJoin[id]) continue
  const profile = npcProfiles[id]
  const person = people[id]
  const villain = villainFactions.has(profile.faction) || profile.faction === 'tyrant'
  const base = tierFight[Math.min(profile.tier, tierFight.length - 1)]
  featured[id] = {
    trait: person.role + '；' + (villain ? '不好相處，只服實力' : '有自己的生活與牽掛'),
    ...(lines[id] ?? castLines[id] ?? manner(!villain)),
    dc: Math.min(20, villain ? 10 + profile.tier * 2 : 7 + profile.tier * 2 + (dutyRole.test(person.role) ? 3 : 0)),
    ...(villain && { minLevel: Math.max(3, profile.tier + 2), villain: true }),
    facts: '已加入玩家的船團，跟著大家航行。' + person.known,
    fight: { ...base, move: moves[id] ?? (profile.faction === 'beast' ? '撲咬' : villain ? '蠻力攻擊' : '拳打腳踢') },
    ...(id === 'kureha' && { medic: true }),
  }
}
export const recruitable = featured

export const companionIds = (world: Pick<World, 'companions'>) => Object.keys(world.companions ?? {}) as NpcId[]
export const isCompanion = (world: Pick<World, 'companions'>, npc: NpcId) => !!world.companions?.[npc]
type Crewed = { members: { character?: { level: number } | null, pendingJoin?: boolean }[] }
/** The party's highest level, which companions grow to match and which gates NPCs who only follow someone strong enough. */
export const partyLevel = (world: Crewed) => Math.max(1, ...world.members.filter(m => m.character && !m.pendingJoin).map(m => m.character!.level))

/** Companions gain +4 max HP per party level, like players. */
export const companionMaxHp = (world: Crewed, npc: NpcId) => ((recruitable[npc]?.fight.hp ?? 20) + 4 * (partyLevel(world) - 1)) * scale

/** Fighting numbers scaled to the party the same way players grow: +3 to hit per 4 levels, +1 damage per 2, +1 defense per 3. */
export function companionFight(world: Crewed, npc: NpcId) {
  const base = recruitable[npc]!.fight
  const level = partyLevel(world)
  return {
    ...base, hp: companionMaxHp(world, npc), skill: base.skill + Math.floor(level * .75),
    def: base.def + Math.floor((level - 1) / 3), bonus: base.bonus + Math.floor(level / 2),
  }
}

/** When the party levels up, companions gain the extra HP too (not a free full heal). */
export function growCompanions(world: World) {
  const level = partyLevel(world)
  for (const npc of companionIds(world)) {
    const companion = world.companions![npc]!
    const before = companion.level ?? 1
    if (level <= before) continue
    if (companion.hp > 0) companion.hp += 4 * (level - before) * scale
    companion.level = level
  }
}
export const companionDown = (world: Pick<World, 'companions'>, npc: NpcId) => (world.companions?.[npc]?.hp ?? 1) <= 0

/** The companion the player means, by full or partial name. */
export function companionByName(world: Pick<World, 'companions'>, name: string): NpcId | undefined {
  const wanted = name.trim()
  if (!wanted) return undefined
  const ids = companionIds(world)
  return ids.find(npc => npcs[npc] === wanted) ?? ids.find(npc => npcs[npc].includes(wanted) || wanted.includes(npcs[npc]))
}

/** Companions who are on this spot and still able to fight. Their place always equals their leader's. */
export function alliesAt(world: World, place: string): NpcId[] {
  return companionIds(world).filter(npc => !companionDown(world, npc) && npcPlace(world, npc) === place)
}

/** Deals damage to a companion. At 0 HP they are out of action for eight game hours; HP 0 is never death. */
export function hurtCompanion(world: World, npc: NpcId, damage: number) {
  const companion = world.companions?.[npc]
  if (!companion) return false
  companion.hp = Math.max(0, companion.hp - damage)
  if (companion.hp > 0) return false
  ;(world.npcDown ??= {})[npc] = world.minute + 480
  return true
}

/** Restores HP to every companion; `fraction` 1 is a full recovery. Downed companions get up on a full rest. */
export function healCompanions(world: World, fraction: number) {
  for (const npc of companionIds(world)) {
    const companion = world.companions![npc]!
    const max = companionMaxHp(world, npc)
    companion.hp = Math.min(max, companion.hp + Math.ceil(max * fraction))
    if (companion.hp > 0 && world.npcDown?.[npc]) delete world.npcDown[npc]
  }
}

/** Downed companions stand back up (at half HP) once their eight hours have passed. */
export function reviveCompanions(world: World) {
  for (const npc of companionIds(world)) {
    const companion = world.companions![npc]!
    if (companion.hp > 0 || (world.npcDown?.[npc] ?? 0) > world.minute) continue
    companion.hp = Math.ceil(companionMaxHp(world, npc) / 2)
    delete world.npcDown?.[npc]
  }
}

/** True when a standing medic companion is with the party; resting then heals everyone a little more. */
export const hasMedic = (world: World) => companionIds(world).some(npc => recruitable[npc]?.medic && !companionDown(world, npc))

/** Why this NPC cannot be recruited right now, or undefined when the invitation may go ahead. */
export function recruitBlock(world: World, npc: NpcId): string | undefined {
  const profile = recruitable[npc]
  const name = npcs[npc]
  if (!profile) return cannotJoin[npc] ?? name + '有自己要走的路，不會加入你們的船團。'
  if (isCompanion(world, npc)) return name + '已經在你們的隊伍裡了。'
  if (!world.crew) return '還沒有正式成立船團。先提議「成立海賊團」並完成投票，才能邀請夥伴。'
  if (companionIds(world).length >= companionSlots(world))
    return '船團已滿 ' + maxCrew + ' 人（含玩家）。想邀請新的夥伴，可以先請一位離隊（例如「請' +
      npcs[companionIds(world)[0]] + '離隊」）。'
  const retry = world.recruitRetry?.[npc] ?? 0
  if (retry > world.minute) return name + '還在考慮上一次的邀請，大約 ' + (retry - world.minute) + ' 分鐘後再問比較好。'
  return undefined
}

/** How many companions the crew can hold: ten minus the real players. */
export const companionSlots = (world: Pick<World, 'members'>) => Math.max(0, maxCrew - party(world).length)

/** The recruitable NPCs standing on this spot, for hints in the UI and the guide. */
export function recruitableAt(world: Pick<World, 'npcPlaces'> & Partial<Pick<World, 'companions' | 'members'>>, place: string): NpcId[] {
  return (Object.keys(recruitable) as NpcId[]).filter(npc => !isCompanion(world, npc) && npcPlace(world, npc) === place)
}


export type { Companion }

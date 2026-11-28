import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { AiFault, AiProvider, IntentFormatFault } from '../../packages/ai/provider.ts'
import { aiInput, locations, npcs } from '../../packages/shared/protocol.ts'
import type { Intent, Message, NpcId } from '../../packages/shared/protocol.ts'
import { allocatePoint, guideFor, makeCharacter, needsReview, resolve, trainSkill, voteThreshold } from '../../packages/rules/engine.ts'
import { learnTalents, refundTalent, resetTalents } from '../../packages/rules/talents.ts'
import { ownedTalents, talentNodes } from '../../packages/world/talents.ts'
import { addressedNpc, asksAboutShipPurchase, dialogueQuestion, familiarIntent, sceneQuestion } from '../../packages/world/explore.ts'
import { effectLabels, npcFacts, npcPlace, npcRole, npcsAt, opening, party, paths, people, selfMade } from '../../packages/world/village.ts'
import { advanceTimeline } from '../../packages/world/timeline.ts'
import { companionIds, companionMaxHp, isCompanion, recruitable } from '../../packages/world/companions.ts'
import { islandAt, islands, routesFrom, shipPurchaseInfo } from '../../packages/world/sea.ts'
import { sellMainShip, shipSaleBlock } from '../../packages/rules/sailing.ts'
import type { Character, Member, World } from '../../packages/world/village.ts'
import { traitOf } from '../../packages/world/races.ts'
import { professions } from '../../packages/world/professions.ts'
import { warOn, warSides, warState } from '../../packages/world/war.ts'
import { canonTimeline, minuteOf } from '../../packages/world/canon.ts'
import { hasFlag } from '../../packages/world/flags.ts'
import { sagaFlag, sagas } from '../../packages/world/water7.ts'

/** During the war the narrator hears the latest stage and the party's side, so every turn is not the same melee. */
function warContext(world: World, place: Character['place']) {
  if (!warOn(world) || islandAt(place) !== 'marineford') return {}
  const fired = warState(world).stages.filter(item => item.result)
  const last = fired.at(-1)?.stage
  return { war: { side: warSides[world.warSide ?? 'none'], stage: last ? last.title : '開戰前的對峙' } }
}
/** During a story arc the narrator hears its latest stage, and the classifier which goals are open right here. */
function sagaContext(world: World, place: Character['place']) {
  const saga = sagas.find(item => item.islands.includes(islandAt(place)) && world.minute >= minuteOf(item.from) && world.minute < minuteOf(item.until))
  if (!saga) return {}
  const last = canonTimeline.filter(event => saga.stages.includes(event.id) && world.timeline?.[event.id]).at(-1)
  const goals = saga.goals.filter(goal => goal.place === place && !hasFlag(world, sagaFlag(goal.id)) && world.minute >= minuteOf(goal.from) && world.minute < minuteOf(goal.until))
  return { saga: { title: saga.title, stage: last?.title, ruined: hasFlag(world, 'ruined:' + islandAt(place)) || undefined, goals: goals.map(goal => goal.title) } }
}
import { portraitRevision } from './portrait.ts'
import { catchUpTraining, timeskip, timeskipBlock } from '../../packages/rules/timeskip.ts'
import type { Entry, Store } from './store.ts'

export class GameError extends Error {}
const demand: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new GameError(message)
}

/** Letters and digits nobody mixes up when reading a code aloud: no I, O, 0 or 1. 32 of them, so a byte picks evenly. */
const transferLetters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const transferMinutes = 10
const transferTries = 10

export class Game {
  ai = new AiProvider()
  readonly store: Store
  #presence = new Map<string, Map<string, number>>()
  #probe?: AbortController
  #action?: { code: string, id: string, controller: AbortController }
  #running = true
  #room?: string
  #monitor?: ReturnType<typeof setInterval>
  /** Partial narration per pending action id while the model streams it. */
  #drafts = new Map<string, string>()
  /** Open device codes by seat. They live in memory only: restarting the host voids them. */
  #transfers = new Map<string, { room: string, code: string, until: number, /** The player asked for it, so their own screen may show it. */ own: boolean }>()
  /** Wrong device codes tried per room. */
  #misses = new Map<string, { count: number, until: number }>()

  constructor(store: Store) {
    this.store = store
    this.#monitor = setInterval(() => this.monitor(), 5000)
    this.#monitor.unref()
  }
  stop() {
    this.#running = false
    clearInterval(this.#monitor)
    this.#probe?.abort()
    this.#action?.controller.abort()
  }
  private get busy() {
    return !!(this.#probe || this.#action)
  }
  private monitor() {
    const room = this.#room && this.store.get(this.#room)
    if (!room || !this.connected(room).has(room.members[0].id)) {
      this.#action?.controller.abort()
      return
    }
    const tested = this.ai.status.lastSuccessfulTest
    // Every successful generation refreshes lastSuccessfulTest, so this only probes after five idle minutes.
    if (this.ai.status.state === 'passed' && tested && Date.now() - Date.parse(tested) > 300_000 && !this.busy) {
      void this.checking(signal => this.ai.probe(room.started, signal)).catch(() => undefined)
    }
  }
  room(code: string) {
    const room = this.store.get(code)
    demand(room, '找不到房間或存檔。')
    return room
  }
  private connected(world: World) {
    const times = this.#presence.get(world.code)
    const now = Date.now()
    return new Set(world.members.filter(m => now - (times?.get(m.id) ?? 0) < 10_000).map(m => m.id))
  }
  touch(code: string, id: string) {
    if (!this.#presence.has(code)) this.#presence.set(code, new Map())
    this.#presence.get(code)!.set(id, Date.now())
  }
  disconnect(code: string, id: string) {
    this.#presence.get(code)?.delete(id)
  }
  private async checking<T>(run: (signal: AbortSignal) => Promise<T>) {
    demand(!this.busy, '正在處理模型請求，請稍候。')
    const controller = this.#probe = new AbortController()
    try {
      return await run(controller.signal)
    } finally {
      this.#probe = undefined
      if (this.#room) this.kick(this.#room)
    }
  }
  cancelProbe() {
    this.#probe?.abort()
  }
  async configure(input: unknown) {
    const room = this.#room ? this.store.get(this.#room) : undefined
    return this.checking(async signal => {
      try {
        const parsed = aiInput.safeParse(input)
        if (!parsed.success) throw new AiFault('請檢查 Base URL 與 Model ID。')
        return await this.ai.configure(parsed.data, !!room?.started, signal)
      } catch (error) {
        if (!signal.aborted) this.ai.fail(error, !!room?.started)
        throw error
      }
    })
  }
  private requireAI() {
    demand(this.ai.status.state === 'passed', this.ai.status.reason ?? '請先完成 AI 連線測試並成功生成回覆。')
    demand(!this.busy, '正在處理模型請求，請稍候。')
  }
  /** Spec §2.2: no room may be created or reopened until the host's AI has produced a real reply. */
  private requireAIForRoom() {
    demand(this.ai.status.state === 'passed', '請先完成 AI 連線測試並成功生成回覆，才能建立或開啟房間。' +
      (this.ai.status.reason ? '（' + this.ai.status.reason + '）' : ''))
  }
  create() {
    this.requireAIForRoom()
    let code: string
    do code = randomBytes(5).toString('hex').toUpperCase()
    while (this.store.get(code))
    this.store.create(code, randomUUID())
    return this.open(code)
  }
  open(code: string) {
    this.requireAIForRoom()
    const room = this.room(code)
    if (this.#room && this.#room !== code) {
      this.#presence.delete(this.#room)
      this.#action?.controller.abort()
    }
    this.#room = code
    this.touch(code, room.members[0].id)
    this.kick(code)
    return this.view(code, room.members[0].id)
  }
  join(code: string, token?: string, claim?: string) {
    const world = this.room(code)
    demand(this.#room === code && this.connected(world).has(world.members[0].id), '房主離線或已切換房間。')
    if (claim) {
      const id = this.redeem(code, claim)
      const before = token && this.store.identity(code, token)
      const credentials = this.store.transaction(() => this.store.renew(code, id))
      // Someone who first joined by mistake on this device leaves that empty seat behind.
      const mistake = before && before !== id ? world.members.find(m => m.id === before) : undefined
      if (mistake && !mistake.host && !mistake.character) this.remove(code, mistake.id)
      this.touch(code, id)
      return { token: credentials, view: this.view(code, id) }
    }
    if (token) {
      const id = this.guest(code, token)
      this.touch(code, id)
      return { token, view: this.view(code, id) }
    }
    demand(world.members.length < 4, '房間已滿，最多四位真人。')
    const id = randomUUID()
    const credentials = this.store.transaction(() => {
      // After the story starts, newcomers create a character first and meet the party at a safe port (spec §1.3).
      world.members.push({ id, host: false, ready: false, agree: false, approved: false, ...(world.started && { pendingJoin: true }) })
      world.version++
      this.store.save(world)
      return this.store.token(code, id)
    })
    this.touch(code, id)
    return { token: credentials, view: this.view(code, id) }
  }
  guest(code: string, token: string) {
    const id = this.store.identity(code, token)
    demand(id, '這台設備的重連憑證已失效：角色可能已換到另一台設備。要接回角色，請輸入換設備碼（在原設備產生，或向房主索取）。')
    return id
  }
  /** A one-time code that moves a seat to another device. Asking again voids the code before it. */
  issueTransfer(code: string, id: string, own: boolean) {
    const world = this.room(code)
    demand(this.#room === code, '請先開啟這個房間。')
    const member = world.members.find(m => m.id === id)
    demand(member, '找不到這位玩家。')
    demand(!member.host, '房主的角色跟著房主的電腦，不使用換設備碼。')
    const text = [...randomBytes(8)].map(byte => transferLetters[byte % transferLetters.length]).join('')
    const ticket = { room: code, code: text.slice(0, 4) + '-' + text.slice(4), until: Date.now() + transferMinutes * 60_000, own }
    this.#transfers.set(id, ticket)
    return { code: ticket.code, until: ticket.until }
  }
  private redeem(code: string, claim: string) {
    const now = Date.now()
    const misses = this.#misses.get(code)
    demand(!misses || misses.until <= now || misses.count < transferTries, '換設備碼錯誤太多次，請十分鐘後再試，並向房主重新索取。')
    const bare = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]/g, '')
    const typed = Buffer.from(bare(claim))
    for (const [id, ticket] of this.#transfers) {
      if (ticket.until <= now) { this.#transfers.delete(id); continue }
      const wanted = Buffer.from(bare(ticket.code))
      if (ticket.room !== code || typed.length !== wanted.length || !timingSafeEqual(typed, wanted)) continue
      this.#transfers.delete(id)
      this.#misses.delete(code)
      return id
    }
    const count = (misses && misses.until > now ? misses.count : 0) + 1
    this.#misses.set(code, { count, until: now + transferMinutes * 60_000 })
    // A guesser gets nothing for their trouble: the codes of the room are void, too.
    if (count >= transferTries) for (const [id, ticket] of this.#transfers) if (ticket.room === code) this.#transfers.delete(id)
    throw new GameError('換設備碼不正確或已過期。')
  }
  /** Frees a seat taken by mistake. Whoever is already part of the party stays. */
  remove(code: string, id: string) {
    const world = this.room(code)
    const member = world.members.find(m => m.id === id)
    demand(member, '找不到這位玩家。')
    demand(!member.host && (!world.started || member.pendingJoin), '已經入隊的玩家不能移除。')
    this.store.transaction(() => {
      world.members = world.members.filter(m => m.id !== id)
      world.version++
      this.store.save(world)
      this.store.revoke(code, id)
      this.store.dropPortrait(code, id)
    })
    this.#transfers.delete(id)
    this.disconnect(code, id)
  }
  private ready(world: World) {
    const connected = this.connected(world)
    return world.members.every(m => m.character && m.approved && m.ready && m.agree && connected.has(m.id))
  }
  async start(code: string) {
    const world = this.room(code)
    demand(this.#room === code && !world.started && this.ready(world), '請等所有參與者在線、完成創角並準備。')
    this.requireAI()
    return this.checking(async signal => {
      await this.ai.probe(false, signal)
      const latest = this.room(code)
      demand(this.#running && this.#room === code && !latest.started && this.ready(latest), '開局條件已變更，請重新確認大廳。')
      this.store.transaction(() => {
        latest.version++
        latest.started = true
        this.store.save(latest)
        this.store.entry(latest, null, 'world', opening)
      })
      return this.view(code, world.members[0].id)
    })
  }
  review(code: string, id: string, approved: boolean) {
    const world = this.room(code)
    const member = world.members.find(m => m.id === id)
    demand((!world.started || member?.pendingJoin) && member?.character, '目前無法審核此角色。')
    member.approved = approved
    member.ready = false
    world.version++
    this.store.save(world)
  }
  view(code: string, player: string, after?: number) {
    const w = this.room(code)
    const connected = this.connected(w)
    const entries = this.store.entries(code)
    const { memories: _memories, members, combat, ...publicWorld } = w
    const ticket = this.#transfers.get(player)
    const portraits = this.store.portraits(code)
    return {
      /** This host keeps portraits. */
      portraits: true,
      // Only the seat that asked for a device code ever sees it; a code from the host is for someone whose device is gone.
      transfer: ticket?.own && ticket.until > Date.now() ? { code: ticket.code, until: ticket.until } : undefined,
      player, ai: { ...this.ai.status },
      phase: w.started ? (this.ai.status.state === 'passed' ? 'playing' : 'paused') : 'lobby',
      hostOnline: this.#room === code && connected.has(w.members[0].id),
      canStart: this.#room === code && !w.started && this.ready(w) && this.ai.status.state === 'passed',
      world: {
        ...publicWorld,
        members: members.map(m => ({ ...m, connected: connected.has(m.id), portrait: portraits[m.id] })),
        combat: combat && {
          round: combat.round, place: combat.place, participants: combat.participants, locked: Object.keys(combat.choices),
          atSea: !!combat.sea,
          foes: combat.foes.map(({ id, name, npc, tier, faction, hp, maxHp, logia, exposed, breached, bounty, down, surrendered }) =>
            ({ id, name, npc, tier, faction, hp, maxHp, logia, exposed, breached, bounty, down, surrendered })),
          waitingForConnection: combat.participants.some(id => !connected.has(id)),
        },
      },
      // Narration still being written, so players can read it as it streams in.
      pending: this.store.active(code).map(job => ({ ...job, draft: this.#drafts.get(job.id) })), entries,
      cursor: entries.at(-1)?.seq ?? 0,
      unread: after ? this.store.unseen(code, after) : 0,
    }
  }
  message(code: string, id: string, msg: Exclude<Message, { kind: 'portraits' }>): ReturnType<Game['view']> | Entry[]
  message(code: string, id: string, msg: Message): ReturnType<Game['view']> | Entry[] | { pictures: Record<string, string> }
  message(code: string, id: string, msg: Message) {
    const world = this.room(code)
    const actor = world.members.find(m => m.id === id)
    demand(actor, '你不在此房間。')
    // Heartbeats from the host browser, rather than relayed guest traffic, own host liveness.
    if (actor.host && msg.kind === 'sync') {
      if (this.#room !== code) throw new GameError('目前已在另一個房間，請從本機存檔重新開啟。')
      this.touch(code, id)
    }
    demand(this.#room === code && this.connected(world).has(world.members[0].id), '房主離線，世界已暫停。')
    this.touch(code, id)
    if (msg.kind === 'sync') {
      this.kick(code)
      return this.view(code, id, msg.after)
    }
    if (msg.kind === 'history') return this.store.entries(code, msg.before)
    if (msg.kind === 'portraits')
      return { pictures: Object.fromEntries(msg.want.map(revision => [revision, this.store.picture(code, revision)] as const).filter((row): row is readonly [string, string] => !!row[1])) }
    if (msg.kind === 'portrait') {
      const revision = msg.image === null ? null : portraitRevision(msg.image)
      demand(revision !== undefined, '這張圖片不能當頭貼，請換一張。')
      if (revision === null) this.store.dropPortrait(code, id)
      else this.store.setPortrait(code, id, revision, msg.image!)
      return this.view(code, id)
    }
    if (msg.kind === 'transfer') {
      this.issueTransfer(code, id, true)
      return this.view(code, id)
    }
    if (msg.kind === 'character' || msg.kind === 'ready') {
      demand(!world.started || actor.pendingJoin, '故事開始後不能更改創角。')
      let arrival: string | undefined
      if (msg.kind === 'character') {
        demand(!world.members.some(m => m.id !== id && m.character?.name === msg.character.name), '已有同名角色。')
        actor.character = makeCharacter(msg.character)
        actor.ready = false
        actor.agree = false
        actor.approved = !needsReview(msg.character)
      } else {
        demand(!msg.ready || (actor.character && actor.approved && msg.agree), '請先完成創角、審核與共同背景確認。')
        actor.ready = msg.ready
        actor.agree = msg.agree
        if (actor.pendingJoin && actor.ready) arrival = this.admit(world, actor)
      }
      this.store.transaction(() => {
        world.version++
        this.store.save(world)
        if (arrival) this.store.entry(world, null, 'world', arrival)
      })
      return this.view(code, id)
    }
    demand(world.started && actor.character, '遊戲尚未開始。')
    demand(!actor.pendingJoin, '請先完成創角並準備，與隊伍會合後才能行動。')
    if (msg.kind === 'allocate' || msg.kind === 'train' || msg.kind === 'learnTalents' || msg.kind === 'refundTalent' || msg.kind === 'resetTalents') {
      demand(!world.combat?.participants.includes(id), msg.kind === 'train' ? '戰鬥中無法分配技能點。' : msg.kind === 'allocate' ? '戰鬥中無法分配屬性點。' : '戰鬥中不能調整天賦。')
      const c = actor.character
      const result = msg.kind === 'train' ? trainSkill(c, msg.skill) : msg.kind === 'allocate' ? allocatePoint(c, msg.attr)
        : msg.kind === 'learnTalents' ? learnTalents(c, msg.ids) : msg.kind === 'refundTalent' ? refundTalent(c, msg.id) : resetTalents(c)
      demand(!result.rejected, result.text)
      this.store.transaction(() => {
        world.version++
        this.store.save(world)
        this.store.entry(world, id, 'result', result.text)
      })
      return this.view(code, id)
    }
    if (msg.kind === 'technique') {
      // Spec §7.6: a self-made move becomes a rules card with a name and a cost tier; the name adds no power.
      const c = actor.character
      demand(c.techniques.filter(selfMade).length < 6, '最多建立 6 個招式。')
      demand(!c.techniques.some(move => move.name === msg.name), '已經有同名的招式。')
      demand(!(msg.effect === 'sweep' && msg.style === 'flurry'), '橫掃不能搭配連續攻擊。')
      c.techniques.push({ name: msg.name, style: msg.style, ...msg.effect && { effect: msg.effect } })
      const tier = { special: '基礎特殊招式（3 STA）', advanced: '進階招式（5 STA）', flurry: '高強度連續攻擊（7 STA）' }[msg.style]
      const effect = msg.effect ? '・' + effectLabels[msg.effect] : ''
      this.store.transaction(() => {
        world.version++
        this.store.save(world)
        this.store.entry(world, id, 'result', c.name + '練成了招式「' + msg.name + '」：' + tier + effect + '。戰鬥中輸入「用「' + msg.name + '」攻擊 對手」。')
      })
      return this.view(code, id)
    }
    if (msg.kind === 'forgetTechnique') {
      const c = actor.character
      const at = c.techniques.findIndex(move => move.name === msg.name && selfMade(move))
      demand(at >= 0, '沒有名為「' + msg.name + '」的自創招式。')
      demand(!world.combat?.participants.includes(id), '戰鬥中不能刪除招式。')
      c.techniques.splice(at, 1)
      this.store.transaction(() => {
        world.version++
        this.store.save(world)
        this.store.entry(world, id, 'result', c.name + '放棄了招式「' + msg.name + '」。')
      })
      return this.view(code, id)
    }
    if (msg.kind === 'chat') {
      if (!this.store.chatSeen(code, msg.id, id)) this.store.entry(world, id, 'chat', msg.text, msg.id)
      return this.view(code, id)
    }
    if (msg.kind === 'cancel') {
      const job = this.store.pending(code, msg.id)
      demand(job?.actor === id && ['queued', 'interpret', 'narrate'].includes(job.phase), '目前沒有可取消的待處理行動。')
      this.store.transaction(() => {
        this.store.phase(code, job.id, 'cancelled')
        this.store.entry(world, id, 'cancelled', job.result ? '已停止旁白，正式結果已保留。' : '已取消行動。', job.id)
      })
      if (this.#action?.code === code && this.#action.id === job.id) this.#action.controller.abort()
      return this.view(code, id)
    }
    if (msg.kind === 'act') {
      const existing = this.store.pending(code, msg.id)
      if (existing) {
        demand(existing.actor === id, '行動 ID 已被使用。')
        return this.view(code, id)
      }
      demand(msg.version <= world.version, '世界版本無效，請重新同步。')
      const question = sceneQuestion(msg.text)
      if (question) {
        this.store.transaction(() => {
          this.store.enqueue(code, msg.id, id, msg.text, msg.version, 'done')
          this.store.entry(world, id, 'input', msg.text, msg.id)
          this.store.entry(world, id, question, this.sceneAnswer(world, actor, question), msg.id)
        })
        return this.view(code, id)
      }
      demand(this.ai.status.state === 'passed', 'AI 暫停中，請保留草稿並等待房主重測。')
      demand(!this.store.active(code).some(job => job.actor === id), '你已有待處理行動。')
      this.store.transaction(() => {
        this.store.enqueue(code, msg.id, id, msg.text, msg.version)
        this.store.entry(world, id, 'input', msg.text, msg.id)
      })
      this.kick(code)
      return this.view(code, id)
    }
    this.decide(world, actor, msg)
    return this.view(code, id)
  }
  private decide(world: World, actor: Member, msg: Extract<Message, { kind: 'vote' | 'propose' }>) {
    demand(this.ai.status.state === 'passed', 'AI 暫停中，世界決議暫停。')
    let sale: string | undefined
    let skipped: string | undefined
    if (msg.kind === 'propose') {
      demand(world.proposals.length < 50, '提案數量已達本章上限。')
      demand(msg.type !== 'depart', '請在航海面板選航線。')
      if (msg.type === 'sellShip') {
        const blocked = shipSaleBlock(world)
        demand(!blocked, blocked ?? '')
        demand(!world.proposals.some(proposal => proposal.type === 'sellShip' && !proposal.passed), '已有出售主船的提案。')
      }
      demand(msg.type !== 'formCrew' || !world.crew, '隊伍已正式成立。')
      if (msg.type === 'timeskip') {
        const blocked = timeskipBlock(world)
        demand(!blocked, blocked ?? '')
        demand(!world.proposals.some(proposal => proposal.type === 'timeskip' && !proposal.passed), '已經有出發修行的提案了。')
      }
      world.proposals.push({ id: randomUUID(), type: msg.type, title: msg.title, votes: {}, passed: false })
    } else {
      const proposal = world.proposals.find(p => p.id === msg.id && !p.passed)
      demand(proposal, '提案不存在或已結案。')
      const major = proposal.type !== 'ordinary'
      const crew = party(world)
      const connected = this.connected(world)
      if (major) demand(crew.every(m => connected.has(m.id)), '有成員離線，重大決議暫停。')
      proposal.votes[actor.id] = msg.yes
      const yes = crew.filter(m => proposal.votes[m.id]).length
      proposal.passed = yes >= voteThreshold(crew.length, major)
      if (proposal.type === 'formCrew') {
        demand(!world.crew, '隊伍已正式成立。')
        if (proposal.passed) world.crew = true
      }
      if (proposal.type === 'timeskip' && proposal.passed) {
        const blocked = timeskipBlock(world)
        demand(!blocked, blocked ?? '')
        skipped = timeskip(world, this.store.roller(world.code, proposal.id))
      }
      if (proposal.type === 'sellShip' && proposal.passed) {
        const blocked = shipSaleBlock(world)
        demand(!blocked, blocked ?? '')
        sale = sellMainShip(world)
      }
    }
    this.store.transaction(() => {
      world.version++
      this.store.save(world)
      const proposal = msg.kind === 'vote' ? world.proposals.find(p => p.id === msg.id) : undefined
      if (proposal?.passed) this.store.entry(world, null, 'world', '團隊決議通過：' + proposal.title)
      if (sale) this.store.entry(world, null, 'world', sale)
      if (skipped) {
        this.store.entry(world, null, 'world', skipped)
        // Two years of news arrive at once: only the headlines of what happened are kept.
        const news = advanceTimeline(world)
        this.store.save(world)
        for (const item of news.slice(-12)) this.store.entry({ ...world, minute: item.minute }, null, 'world', item.text)
      }
    })
  }
  /** Places an approved late joiner at the party's port, which is never a combat or open-sea scene. */
  private admit(world: World, member: Member) {
    const place = world.ship?.port ?? 'dock'
    member.character!.place = place
    member.character!.conversingWith = null
    delete member.pendingJoin
    // Someone joining after the two years trained too.
    const trained = catchUpTraining(world).join('')
    return '新夥伴' + member.character!.name + '在' + locations[place] + '與大家會合。' + trained
  }
  private sceneAnswer(world: World, actor: Member, question: 'guide' | 'location') {
    if (question === 'guide') return guideFor(world, actor).text
    return '你在' + locations[actor.character!.place] + '。'
  }

  /** What this player has seen lately, so free-form scenes can build on earlier ones. */
  private recentStory(world: World, actor: string) {
    return this.store.entries(world.code)
      .filter(e => (e.actor === null || e.actor === actor) && ['narrative', 'world', 'input'].includes(e.type))
      .slice(-8).map(e => (e.type === 'input' ? '玩家：' : '') + e.text)
  }

  private interlocutor(world: World, actor: Member) {
    const c = actor.character!
    const candidate = c.conversingWith === undefined
      ? this.store.lastConversation(world.code, actor.id, locations[c.place])
      : c.conversingWith
    const npc = candidate as NpcId | null | undefined
    if (npc && Object.hasOwn(people, npc) && npcPlace(world, npc) === c.place) return npc
  }

  /**
   * What the model needs about the scene. Prompt size is most of a local model's wait, so the intent classifier gets
   * the island's NPCs and places, and narration (forNarration) gets only the scene itself.
   */
  private context(world: World, actor: Member, intent?: Intent, forNarration = false) {
    const c = actor.character!
    const local = npcsAt(world, c.place).map(key => {
      return { id: key, name: npcs[key], role: npcRole(world, key),
        ...(isCompanion(world, key) ? { companion: true, trait: recruitable[key]?.trait } : {}),
        ...(intent?.kind === 'talk' && intent.npc === key
          ? {
              facts: npcFacts(world, key),
              memory: (world.memories[key] ?? []).slice(-3),
            }
          : {}),
      }
    })
    const island = islands[islandAt(c.place)].places
    const navigation = forNarration ? {} : {
      adjacent: Object.fromEntries(paths[c.place].map(id => [id, locations[id]])),
      destinations: Object.fromEntries(island.map(id => [id, locations[id]])),
      people: Object.fromEntries(island.flatMap(place => npcsAt(world, place)).map(id => [id, npcs[id]])),
      routes: routesFrom(islandAt(c.place)), ship: world.ship, items: c.inventory,
      techniques: c.techniques.map(move => move.name),
    }
    return {
      actor: c.name, race: c.race + '（' + traitOf(c).perk + '）', job: professions[c.profession].label, place: locations[c.place], ...navigation,
      // The named talents (not the small ones), so the narrator can colour a blow or a feat with them.
      talents: [...ownedTalents(c)].map(t => talentNodes.get(t)!).filter(t => t.kind === 'notable' || t.kind === 'keystone').map(t => t.name),
      local,
      ...(world.ship?.name && { ourShip: world.ship.name }),
      ...warContext(world, c.place),
      ...sagaContext(world, c.place),
      combat: world.combat && { foes: world.combat.foes.map(foe => ({ name: foe.name, hp: foe.hp, maxHp: foe.maxHp, down: !!foe.down })), atSea: !!world.combat.sea },
      speaker: intent?.kind === 'talk' ? npcs[intent.npc] : undefined,
      // Who the player is facing, so 「來對戰阿」 without a name means this person.
      talkingWith: forNarration ? undefined : (npc => npc && { id: npc, name: npcs[npc] })(this.interlocutor(world, actor)),
      party: party(world).map(m => m.character!.name),
      partyHere: party(world).filter(m => m.character!.place === c.place).map(m => m.character!.name),
      // NPC companions follow the players, so the narrator can describe them as part of the party.
      companions: companionIds(world).map(npc => ({
        id: npc, name: npcs[npc], trait: recruitable[npc]?.trait, hp: world.companions![npc]!.hp, maxHp: companionMaxHp(world, npc),
        here: npcPlace(world, npc) === c.place,
      })),
      // Rumors and warnings the party has heard about this island that have not happened yet; locals can mention them.
      rumors: (world.news ?? []).filter(item => (item.kind === 'rumor' || item.kind === 'warning') && item.island === islandAt(c.place) && item.event && !world.timeline?.[item.event])
        .slice(-3).map(item => item.text),
      chronicle: world.chronicle ?? [],
    }
  }
  private kick(code: string) {
    if (!this.#running || this.busy || this.#room !== code || this.ai.status.state !== 'passed') return
    const world = this.room(code)
    const job = this.store.pending(code)
    if (!job || !this.connected(world).has(world.members[0].id)) return
    const controller = new AbortController()
    this.#action = { code, id: job.id, controller }
    void this.process(code, job.id, controller.signal).catch(error => {
      if (this.#running && !controller.signal.aborted) this.ai.fail(error, true)
    }).finally(() => {
      this.#action = undefined
      if (this.#room) this.kick(this.#room)
    })
  }
  private async process(code: string, id: string, signal: AbortSignal) {
    let job = this.store.pending(code, id)!
    const actorAt = (world: World) => world.members.find(m => m.id === job.actor)!
    const allowed = (world: World) => this.#running && !signal.aborted && this.#room === code &&
      this.connected(world).has(world.members[0].id) && this.store.pending(code, id)?.phase !== 'cancelled'
    const finishWithoutAction = (world: World, text: string) => {
      this.store.transaction(() => {
        this.store.entry(world, job.actor, 'result', text, id)
        this.store.outcome(code, id, text, false, null, false)
      })
    }
    let world = this.room(code)
    if (job.phase !== 'narrate') {
      this.store.phase(code, id, 'interpret')
      let shortcut = familiarIntent(job.text, actorAt(world).character!.place)
      const question = dialogueQuestion(job.text)
      if (question && !shortcut) {
        const actor = actorAt(world)
        const npc = this.interlocutor(world, actor)
        if (!npc) {
          if (asksAboutShipPurchase(job.text)) {
            finishWithoutAction(world, shipPurchaseInfo)
            return
          }
          const [here] = npcsAt(world, actor.character!.place)
          finishWithoutAction(world, here
            ? '你目前沒有交談對象。可以用「問' + npcs[here] + '……」指定要問的人。'
            : '這裡沒有可以回答你的人。先找到要詢問的角色，再提出問題。')
          return
        }
        shortcut = { kind: 'talk', npc }
      }
      let intent: Intent
      try {
        intent = shortcut ?? await this.ai.interpret(this.context(world, actorAt(world)), job.text, signal)
      } catch (error) {
        if (!(error instanceof IntentFormatFault)) throw error
        // An action the classifier cannot name is still something the player wants to try.
        intent = { kind: 'free' }
      }
      if (signal.aborted) return
      world = this.room(code)
      if (!allowed(world)) return
      // Mid-conversation, a line goes to the person you are facing unless it clearly turns to someone else:
      // 「可雅在我手上」 said to the butler is a threat to the butler, not a word with Kaya.
      const facing = this.interlocutor(world, actorAt(world))
      if (intent.kind === 'talk' && facing && intent.npc !== facing && addressedNpc(job.text) !== intent.npc)
        intent = { kind: 'talk', npc: facing }
      if (intent.kind === 'guide' || intent.kind === 'location') {
        const question = sceneQuestion(job.text) ?? 'location'
        this.store.transaction(() => {
          this.store.entry(world, job.actor, question, this.sceneAnswer(world, actorAt(world), question), id)
          this.store.phase(code, id, 'done')
        })
        return
      }
      const before = this.context(world, actorAt(world), intent, true)
      const result = resolve(world, actorAt(world), intent, job.text, this.store.roller(code, id), this.connected(world))
      // Each AI call is a full wait on a local model, so the rules' own text stands alone for routine upkeep,
      // and a fight gets one narration when it ends instead of one per round.
      const fightGoesOn = ['attack', 'cannon', 'guard', 'flee', 'negotiate', 'useItem', 'conqueror'].includes(intent.kind) && !!world.combat
      const narrate = !result.rejected && !result.directReply && !fightGoesOn &&
        !['sail', 'ship', 'cannon', 'islandTask', 'give', 'equip', 'wait', 'recruit', 'dismiss', 'handover', 'fruit', 'buyFruit', 'upgrade', 'use', 'rest', 'meal', 'useItem'].includes(intent.kind) &&
        (!!result.spokeWith || !['move', 'meal', 'crew'].includes(shortcut?.kind ?? ''))
      const narrationContext = intent.kind === 'move' && result.spokeWith
        ? this.context(world, actorAt(world), { kind: 'talk', npc: result.spokeWith }, true) : before
      const text = result.rejected ? result.text + '\n\n' + this.sceneAnswer(world, actorAt(world), 'location') : result.text
      this.store.transaction(() => {
        if (!result.rejected) {
          if (result.proposeCrew)
            world.proposals.push({ id, type: 'formCrew', title: '成立船團', votes: {}, passed: false })
          const previousMinute = world.minute
          world.version++
          world.minute += result.minutes ?? 0
          // Canon events due by the new time fire inside the same transaction as the action.
          const news = advanceTimeline(world)
          // Waiting out the two years (or joining afterwards) is training too.
          const trained = catchUpTraining(world)
          this.store.save(world)
          for (const item of news) this.store.entry({ ...world, minute: item.minute }, null, 'world', item.text)
          for (const line of trained) this.store.entry(world, null, 'world', line)
        }
        this.store.entry(world, result.announce ? null : job.actor, 'result', text, id)
        const story = result.free
          ? { free: true, outcome: result.text, chronicle: world.chronicle ?? [], recent: this.recentStory(world, job.actor) } : {}
        this.store.outcome(code, id, text, !!result.announce, { ...narrationContext, ...story, input: job.text, question }, narrate)
      })
      if (!narrate) return
      job = this.store.pending(code, id)!
    }
    demand(job.result && job.context, '待處理敘事缺少正式結果。')
    const context = JSON.parse(job.context)
    const draft = (text: string) => { this.#drafts.set(id, text) }
    let narrative: string
    try {
      narrative = context.free ? await this.ai.narrateFree(context, signal, draft)
        : context.question && typeof context.speaker === 'string'
          ? await this.ai.answerNpc(context, context.speaker, signal, draft)
          : await this.ai.narrate(context, job.result, !!job.announce, signal, draft)
    } finally {
      this.#drafts.delete(id)
    }
    if (signal.aborted) return
    world = this.room(code)
    if (!allowed(world)) return
    this.store.transaction(() => {
      this.store.entry(world, job.announce ? null : job.actor, 'narrative', narrative, id)
      this.store.phase(code, id, 'done')
    })
  }
}

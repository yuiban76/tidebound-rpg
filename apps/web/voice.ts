import { useEffect, useMemo, useRef, useState } from 'react'
import { linesOf, soundOf, speakerNames, spokenIn } from '../../packages/shared/speech.ts'
import type { Line } from '../../packages/shared/speech.ts'
import type { Entry } from '../host/store.ts'

export type VoiceSettings = {
  on: boolean, volume: number, rate: number
  /** voiceURI of the narrator; empty picks the first Chinese voice. */
  voice: string
  /** Give characters voices of their own, and read the world bulletin too. */
  cast: boolean, world: boolean
}
const defaults: VoiceSettings = { on: false, volume: 1, rate: 1, voice: '', cast: true, world: true }
const key = 'tide-voice'

function load(): VoiceSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? '{}') as Partial<VoiceSettings>
    const number = (value: unknown, low: number, high: number, or: number) => typeof value === 'number' && value >= low && value <= high ? value : or
    return {
      on: saved.on === true, volume: number(saved.volume, 0, 1, 1), rate: number(saved.rate, .5, 2, 1), voice: typeof saved.voice === 'string' ? saved.voice : '',
      cast: saved.cast !== false, world: saved.world !== false,
    }
  } catch { return defaults }
}

const engine = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window ? window.speechSynthesis : undefined
export const speechSupported = () => !!engine()

const isChinese = (voice: SpeechSynthesisVoice) => /^(?:zh|cmn)/i.test(voice.lang)
/** Taiwan voices first, then the rest of Mandarin; Cantonese reads this text as another language. */
export function chineseVoices(all: SpeechSynthesisVoice[]) {
  const rank = (voice: SpeechSynthesisVoice) => /TW|Hant/i.test(voice.lang) ? 0 : /HK|yue/i.test(voice.lang) ? 2 : 1
  return all.filter(isChinese).sort((a, b) => rank(a) - rank(b))
}
const femaleNames = /hanhan|yating|hsiaochen|hsiaoyu|xiaoxiao|xiaoyi|huihui|yaoyao|meijia|mei-jia|tingting|ting-ting|female|女/i
const maleNames = /zhiwei|yunjhe|yunxi|yunjian|yunyang|kangkang|male|男/i
const genderOf = (voice: SpeechSynthesisVoice) => femaleNames.test(voice.name) ? 'female' : maleNames.test(voice.name) ? 'male' : undefined

/** The browser voice, pitch and speed a line is read with. */
export function voiceFor(line: Line, settings: VoiceSettings, voices: SpeechSynthesisVoice[]) {
  const chinese = chineseVoices(voices)
  const narrator = chinese.find(voice => voice.voiceURI === settings.voice) ?? chinese[0]
  if (!line.who || !settings.cast) return { voice: narrator, pitch: 1, rate: settings.rate }
  const sound = soundOf(line.who)
  const fitting = chinese.filter(voice => !/HK|yue/i.test(voice.lang) && (!sound.gender || genderOf(voice) === sound.gender))
  const others = fitting.filter(voice => voice.voiceURI !== narrator?.voiceURI)
  let hash = 3
  for (const char of line.who) hash = (hash * 33 + char.codePointAt(0)!) >>> 0
  const pool = others.length ? others : fitting
  const voice = pool.length ? pool[hash % pool.length] : narrator
  // With no voice of the right kind, the narrator plays the part a little higher or lower.
  const stretch = pool.length || !sound.gender ? 0 : sound.gender === 'female' ? .25 : -.22
  return { voice, pitch: Math.max(.5, Math.min(1.8, sound.pitch + stretch)), rate: Math.max(.5, Math.min(2, settings.rate * sound.rate)) }
}

type Queued = Line & { tag: string, seq?: number }
/** How many breaths may wait; a long stretch of news keeps only the newest. */
const longestQueue = 60

/** The speaking queue. One sentence at a time, so it can stop between any two and never trips Chrome's length limit. */
export class Speaker {
  queue: Queued[] = []
  now: Queued | undefined
  paused = false
  blocked = false
  settings = defaults
  #utterance: SpeechSynthesisUtterance | undefined
  #watch: ReturnType<typeof setTimeout> | undefined
  #changed: () => void
  constructor(changed: () => void) { this.#changed = changed }

  add(lines: Line[], tag: string, seq?: number) {
    this.queue.push(...lines.map(line => ({ ...line, tag, seq })))
    if (this.queue.length > longestQueue) this.queue = this.queue.slice(-longestQueue)
    this.#next()
  }
  stop() {
    this.queue = []
    this.#end()
    this.paused = false
    engine()?.cancel()
    this.#changed()
  }
  skip() {
    this.#end()
    this.paused = false
    engine()?.cancel()
    this.#next()
  }
  pause(on: boolean) {
    this.paused = on
    if (on) engine()?.pause()
    else engine()?.resume()
    this.#changed()
  }
  #end() {
    clearTimeout(this.#watch)
    if (this.#utterance) this.#utterance.onend = this.#utterance.onerror = this.#utterance.onstart = null
    this.#utterance = undefined
    this.now = undefined
  }
  #next() {
    const synth = engine()
    if (!synth || this.now || this.paused) { this.#changed(); return }
    const line = this.queue.shift()
    if (!line) { this.#changed(); return }
    this.now = line
    const { voice, pitch, rate } = voiceFor(line, this.settings, synth.getVoices())
    const utterance = this.#utterance = new SpeechSynthesisUtterance(line.text)
    if (voice) utterance.voice = voice
    utterance.lang = voice?.lang ?? 'zh-TW'
    utterance.pitch = pitch
    utterance.rate = rate
    utterance.volume = this.settings.volume
    const over = (event?: SpeechSynthesisErrorEvent) => {
      if (this.#utterance !== utterance) return
      if (event?.error === 'not-allowed') { this.blocked = true; this.queue = [] }
      this.#end()
      this.#next()
    }
    utterance.onstart = () => {
      this.blocked = false
      clearTimeout(this.#watch)
      // Some engines never report the end; a generous limit keeps the story moving.
      this.#watch = setTimeout(() => { engine()?.cancel(); over() }, 8_000 + line.text.length * 600 / rate)
      this.#changed()
    }
    utterance.onend = () => over()
    utterance.onerror = event => over(event)
    // Nothing started: the browser is still waiting for a click on the page, or has no usable voice.
    this.#watch = setTimeout(() => { if (this.#utterance === utterance) { this.blocked = true; this.queue = []; this.#end(); engine()?.cancel(); this.#changed() } }, 5_000)
    // Chrome swallows a line spoken in the same breath as a cancel.
    setTimeout(() => { if (this.#utterance === utterance) synth.speak(utterance) }, 30)
    this.#changed()
  }
}

/** What an entry sounds like; nothing for kinds that are only read on screen. */
export function linesOfEntry(entry: Pick<Entry, 'type' | 'text'>, names: ReturnType<typeof speakerNames>): Line[] {
  if (entry.type === 'narrative' || entry.type === 'world') return linesOf(entry.text, names)
  if (entry.type === 'result') return spokenIn(entry.text, names)
  return []
}

/** Reads new story aloud as it arrives. `entries` are the ones on screen, so a result still hidden behind its dice stays silent. */
export function useNarrator({ entries, draft, player, players }: {
  entries: Entry[], /** The narration being written for this player right now. */ draft?: { id: string, text: string }, player: string, players: string[],
}) {
  const [settings, setSettings] = useState(load)
  const [, refresh] = useState(0)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const speaker = useRef<Speaker>(undefined)
  speaker.current ??= new Speaker(() => refresh(n => n + 1))
  const talk = speaker.current
  talk.settings = settings
  const names = useMemo(() => speakerNames(players), [players.join('\n')])
  /** Everything up to here has been read or was on screen before. */
  const heard = useRef(entries.at(-1)?.seq ?? 0)
  /** What was already read of a narration while it was being written, by action. */
  const read = useRef(new Map<string, string[]>())

  useEffect(() => {
    const synth = engine()
    if (!synth) return
    const update = () => setVoices(synth.getVoices())
    update()
    synth.addEventListener?.('voiceschanged', update)
    const quiet = () => synth.cancel()
    window.addEventListener('pagehide', quiet)
    return () => { synth.removeEventListener?.('voiceschanged', update); window.removeEventListener('pagehide', quiet); talk.stop() }
  }, [])

  useEffect(() => {
    if (!settings.on || !draft) return
    const done = read.current.get(draft.id) ?? []
    const lines = linesOf(draft.text, names, true)
    // The model started over: wait for the finished text.
    if (done.some((text, i) => lines[i]?.text !== text)) return
    const fresh = lines.slice(done.length)
    if (!fresh.length) return
    read.current.set(draft.id, [...done, ...fresh.map(line => line.text)])
    talk.add(fresh, draft.id)
  }, [draft?.id, draft?.text, settings.on])

  const latest = entries.at(-1)?.seq ?? 0
  useEffect(() => {
    const fresh = entries.filter(entry => entry.seq > heard.current && (entry.actor === null || entry.actor === player))
    heard.current = Math.max(heard.current, latest)
    if (!settings.on || !fresh.length) return
    const aloud = fresh.filter(entry => entry.type !== 'world' || settings.world).map(entry => ({ entry, lines: linesOfEntry(entry, names) })).filter(one => one.lines.length)
    // Days of news at once (a long wait, a reconnect) would take minutes: the newest few are enough.
    const news = aloud.filter(one => one.entry.type === 'world')
    const skip = new Set(news.slice(0, Math.max(0, news.length - 4)))
    for (const { entry, lines } of aloud.filter(one => !skip.has(one))) {
      const before = entry.action && entry.type === 'narrative' ? read.current.get(entry.action) ?? [] : []
      if (entry.action && entry.type === 'narrative') read.current.delete(entry.action)
      let same = 0
      while (same < before.length && lines[same]?.text === before[same]) same++
      // The part read while it was being written belongs to this entry too.
      for (const line of [talk.now, ...talk.queue]) if (line && line.tag === entry.action) line.seq = entry.seq
      talk.add(lines.slice(same), String(entry.seq), entry.seq)
    }
  }, [latest, settings.on, names])

  return {
    settings, voices: chineseVoices(voices), supported: speechSupported(), blocked: talk.blocked,
    now: talk.now, waiting: talk.queue.length, paused: talk.paused,
    change(patch: Partial<VoiceSettings>) {
      const next = { ...settings, ...patch }
      setSettings(next)
      talk.settings = next
      try { localStorage.setItem(key, JSON.stringify(next)) } catch { /* The choice just lasts for this visit. */ }
      if (patch.on === false) talk.stop()
      if (patch.on) heard.current = latest
    },
    stop: () => talk.stop(), skip: () => talk.skip(), pause: (on: boolean) => talk.pause(on),
    replay(entry: Entry) {
      talk.stop()
      const lines = linesOfEntry(entry, names)
      talk.add(lines.length ? lines : linesOf(entry.text, names), String(entry.seq), entry.seq)
    },
    sample() {
      talk.stop()
      talk.blocked = false
      talk.add([{ text: '風吹過風車村的港口，新的冒險就要開始了。' }, { who: '魯夫', text: '我要成為海賊王！' }, { who: '娜美', text: '先把寶藏找到再說。' }], 'sample')
    },
  }
}
export type Narrator = ReturnType<typeof useNarrator>

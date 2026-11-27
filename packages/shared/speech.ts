// What the storyteller reads aloud: a text becomes short sentences, each in the narrator's or a character's voice.
// Pure text work; the browser's speech engine lives in apps/web/voice.ts.
import { npcs } from './protocol.ts'
import type { NpcId } from './protocol.ts'

/** One breath of speech. `who` is the character speaking; nobody means the narrator. */
export type Line = { who?: string, text: string }

const ender = /[。！？!?…]/
const longest = 80

/** Symbols a voice would stumble over become pauses or disappear. */
export function speakable(text: string) {
  return text
    .replace(/【([^】]*)】/g, '$1。')
    .replace(/[*_#`>|~～◆◇→▸★☆]+/g, ' ')
    .replace(/(\d),(?=\d{3})/g, '$1')
    .replace(/[・·]/g, ' ')
    .replace(/[（(]([^）)]*)[）)]/g, '，$1，')
    .replace(/[／/]/g, '，')
    .replace(/[-—–]{2,}/g, '，')
    .replace(/\.{3,}|⋯+|…{2,}/g, '…')
    .replace(/，+(?=[。！？!?…，、；：」』])/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

/** Sentences short enough for any speech engine; `open` is a last piece that has not ended yet. */
export function sentences(text: string): { done: string[], open: string } {
  const done: string[] = []
  let part = ''
  const push = (piece: string) => { const line = piece.trim(); if (/[\p{L}\p{N}]/u.test(line)) done.push(line) }
  const chars = [...text]
  chars.forEach((char, i) => {
    if (char === '\n') { push(part); part = ''; return }
    part += char
    // 「真的嗎？！」 is one sentence: wait for the last of a run of marks.
    if (ender.test(char) && !ender.test(chars[i + 1] ?? '')) { push(part); part = '' }
    else if (part.length >= longest && /[，、；：,;:]/.test(char)) { push(part); part = '' }
  })
  return { done, open: part.trim() }
}

const aliases = (name: string) => [name, ...name.split('・').slice(1).filter(piece => piece.length >= 2)]
/** Names a speaker can be recognised by, longest first; 「羅賓」 stands for 「妮可・羅賓」. */
export function speakerNames(players: string[] = []) {
  const map = new Map<string, string>()
  for (const name of [...players, ...Object.values(npcs)]) for (const alias of aliases(name)) if (!map.has(alias)) map.set(alias, name)
  return [...map].sort((a, b) => b[0].length - a[0].length)
}
type Names = ReturnType<typeof speakerNames>

function lastName(text: string, names: Names) {
  let best: { at: number, name: string, length: number } | undefined
  for (const [alias, name] of names) {
    const at = text.lastIndexOf(alias)
    if (at < 0) continue
    // 「桑達索尼亞」 must not be heard as a shorter name that happens to be inside it.
    if (!best || at + alias.length > best.at + best.length || (at + alias.length === best.at + best.length && alias.length > best.length)) best = { at, name, length: alias.length }
  }
  return best?.name
}
const firstName = (text: string, names: Names) => names.map(([alias, name]) => ({ at: text.indexOf(alias), name })).filter(one => one.at >= 0).sort((a, b) => a.at - b.at)[0]?.name
const said = /[說道問答喊叫笑吼嘆罵唸念嚷低聲回應開口補充]/

type Part = { quote: boolean, text: string, closed: boolean }
function parts(text: string): Part[] {
  const out: Part[] = []
  const opens = '「『“'
  const closes = '」』”'
  let depth = 0
  let buffer = ''
  const flush = (quote: boolean, closed: boolean) => { if (buffer) out.push({ quote, text: buffer, closed }); buffer = '' }
  for (const char of text) {
    if (opens.includes(char)) { if (depth++ === 0) { flush(false, true); continue } }
    else if (closes.includes(char) && depth) { if (--depth === 0) { flush(true, true); continue } }
    buffer += char
  }
  flush(depth > 0, depth === 0)
  return out
}

/**
 * Who says what. Words in quotation marks are a character's when someone is named as saying them; otherwise (a move's
 * or a ship's name) they are read along with the sentence. `writing` is a text still being written: only what can no
 * longer change is returned.
 */
export function linesOf(raw: string, names: Names, writing = false): Line[] {
  const pieces = parts(raw)
  const out: Line[] = []
  let narration = ''
  let speaker: string | undefined
  const say = (who: string | undefined, text: string, last: boolean) => {
    const { done, open } = sentences(speakable(text))
    // 「真的嗎？」 may still grow into 「真的嗎？！」: the very last sentence waits for what follows it.
    if (writing && last && !open) done.pop()
    for (const line of done) out.push({ ...(who && { who }), text: line })
    if (open && /[\p{L}\p{N}]/u.test(open) && !(writing && last)) out.push({ ...(who && { who }), text: open })
  }
  for (const [i, piece] of pieces.entries()) {
    const last = i === pieces.length - 1
    if (!piece.quote) { narration += piece.text; if (last) say(undefined, narration, true); continue }
    const before = narration.slice(-40)
    const after = (pieces[i + 1]?.text ?? '').split(/[。！？\n]/)[0].slice(0, 16)
    const introduced = /[：:]\s*$/.test(before)
    const sentence = introduced || ender.test(piece.text) || piece.text.length >= 12
    const beside = said.test(after) ? firstName(after, names) : undefined
    const who = lastName(before, names) ?? beside ?? (before.replace(/\s/g, '').length <= 14 ? speaker : undefined)
    if (!sentence || !(introduced || said.test(before) || beside || ender.test(piece.text))) {
      // Not speech: a name or a term inside the sentence.
      if (writing && last) { narration += piece.text; break }
      narration += piece.text
      if (last) say(undefined, narration, true)
      continue
    }
    // While it is being written, the next words may still say who spoke.
    if (writing && !who && (last || (i === pieces.length - 2 && after.length < 12 && !/[。！？\n]/.test(pieces[i + 1].text)))) { say(undefined, narration, false); narration = ''; return out }
    say(undefined, narration.replace(/[：:]\s*$/, '。'), false)
    narration = ''
    speaker = who
    // A streamed reply carries its closing mark before the speech is over, so the last sentence still has to end by itself.
    say(who, piece.text, last || !piece.closed)
  }
  if (writing && narration && pieces.at(-1)?.quote) return out
  return out
}

/** The parts of a formal result worth hearing: only what somebody says. Dice, HP and other numbers stay on screen. */
export function spokenIn(result: string, names: Names): Line[] {
  return result.split('\n').flatMap(line => /[：:]\s*「/.test(line) && !/D20|HP \d/.test(line) ? linesOf(line, names) : [])
}

// --- Who sounds like what ----------------------------------------------------------------------------------------
export type Sound = { gender?: 'female' | 'male', pitch: number, rate: number }
const women = new Set<NpcId>(['keeper', 'rika', 'kaya', 'nojiko', 'vivi', 'kureha', 'robin', 'hancock', 'nyon', 'shakky', 'dadan', 'nami', 'tashigi', 'kokoro', 'kalifa', 'perona', 'bonney',
  'amazon', 'marguerite', 'sandersonia', 'marigold', 'camie', 'tsuru', 'kiwi', 'mozu', 'chimney',
  'shirahoshi', 'shyarly', 'monet', 'sugar', 'rebecca', 'viola', 'carrot', 'wanda', 'bigMom', 'pudding', 'brulee', 'kiku', 'hiyori', 'yamato'])
const small = new Set<NpcId>(['rika', 'chopper', 'usoppKids', 'chimney', 'camie', 'momonosuke', 'sugar', 'leo'])
const deep = new Set<NpcId>(['dorry', 'brogy', 'oimo', 'kashii', 'oarsJr', 'whitebeard', 'jinbe', 'kuma', 'moria', 'magellan', 'akainu', 'garp', 'crocodile', 'zoro', 'mihawk', 'smoker', 'arlong', 'blenheim', 'teach', 'jozu', 'krieg', 'morgan',
  'neptune', 'kaido', 'king', 'jack', 'katakuri', 'fujitora', 'vergo', 'sentomaru', 'saturn', 'inuarashi'])
const old = new Set<NpcId>(['mayor', 'boodle', 'kureha', 'kokoro', 'tsuru', 'nyon', 'crocus', 'zeff', 'rayleigh', 'ganfall', 'toto', 'cobra', 'sengoku', 'amazon', 'genzo', 'riku', 'vegapunk', 'saturn'])
const brisk = new Set<NpcId>(['luffy', 'usopp', 'buggy', 'franky', 'bonclay', 'ivankov', 'enel', 'bellamy', 'spandam', 'wapol', 'caesar', 'bartolomeo', 'cavendish', 'carrot', 'queen'])
const npcByName = Object.fromEntries(Object.entries(npcs).map(([id, name]) => [name, id as NpcId]))
// Everyone in the original who is a person with a known voice; merchants, animals and players keep whatever voice is free.
const unknown = new Set<NpcId>(['chouchou', 'laboon', 'gonbe', 'usoppKids'])

/** A character's voice: which kind, how high and how quick. The same name always sounds the same. */
export function soundOf(name: string): Sound {
  const npc = npcByName[name]
  let hash = 7
  for (const char of name) hash = (hash * 31 + char.codePointAt(0)!) >>> 0
  const nudge = (hash % 21 - 10) / 100
  const gender = npc && !unknown.has(npc) && !npc.startsWith('trader') ? women.has(npc) ? 'female' as const : 'male' as const : undefined
  const pitch = npc && small.has(npc) ? 1.45 : npc && deep.has(npc) ? .72 : npc && old.has(npc) ? .9 : 1
  const rate = npc && old.has(npc) ? .9 : npc && brisk.has(npc) ? 1.12 : 1
  return { ...(gender && { gender }), pitch: Math.round((pitch + nudge) * 100) / 100, rate }
}

// Reads the D20 rolls back out of a result text, for the dice animation. The rules stay the only place that rolls.

export type DiceRoll = {
  /** What was rolled for: 觀察, 阿浪 → 海王類… */
  label: string
  natural: number
  total?: number, target?: number
  /** undefined when the roll has no pass or fail (a navigation roll on an ordinary voyage). */
  success?: boolean
  /** A blow in a fight; `foe` when the other side strikes, so its success is bad news. */
  blow?: 'ours' | 'foe'
}

const failed = /未命中|未成功|失敗|沒能甩開|不肯罷休|落在海裡|沒找到|被砸得變形/
const passed = /成功|傷害 \d|收手了|採到|穩住車身/

function labelOf(before: string) {
  const text = before.split(/[。！\n]/).at(-1)!.trim().replace(/[：:，,]+$/, '').trim()
  const blow = /^(.+?)對(.+?)(?:使出.*|開砲)$/.exec(text) ?? /^(.+?)反擊(.+)$/.exec(text) ?? /^(.+?)使出.*攻擊(.+)$/.exec(text) ?? /^(.+?)勸(.+?)住手/.exec(text)
  if (blow) return blow[1] + ' → ' + blow[2]
  const free = /^自由行動判定（(.+)）$/.exec(text)
  return free ? free[1] : text.split(/[：:，,]/).filter(Boolean).at(-1)?.trim() || '判定'
}

export function diceIn(text: string): DiceRoll[] {
  const parts = text.split(/D20 (\d{1,2})(?!\d)/)
  const rolls: DiceRoll[] = []
  for (let i = 1; i < parts.length; i += 2) {
    const natural = Number(parts[i])
    if (natural < 1 || natural > 20) continue
    const line = parts[i + 1].split('\n')[0]
    const sum = /^[，＋\d\s]*?(?:合計 |＝)(-?\d+)(?:／(\d+))?/.exec(line)
    const [total, target] = [sum?.[1], sum?.[2]].map(n => n === undefined ? undefined : Number(n))
    // The sentence the roll stands in says how it went; a bare score is compared, with 1 and 20 deciding by themselves.
    const said = line.split('。')[0]
    const success = target === undefined ? undefined : failed.test(said) ? false : passed.test(said) ? true
      : natural === 20 ? true : natural === 1 ? false : total! >= target
    const spoken = parts[i - 1].split(/[。！\n]/).at(-1)!
    const blow = /反擊/.test(spoken) ? 'foe' as const : /使出|開砲/.test(spoken) ? 'ours' as const : undefined
    rolls.push({ label: labelOf(parts[i - 1]), natural, total, target, success, ...(blow && { blow }) })
  }
  return rolls
}

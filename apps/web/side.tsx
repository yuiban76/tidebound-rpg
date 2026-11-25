// What the info panel is built from. Every tab uses the same cards, rows, tiles and segments, so a new feature
// finds its place instead of adding another look.
import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import type { View } from './network.ts'
import './side.css'

export type PanelProps = { world: View['world'], player: string, suggest: (command: string) => void }
type Tone = 'on' | 'gold' | 'alert' | 'quiet'

export const meIn = (world: View['world'], player: string) => world.members.find(m => m.id === player)!.character!
export const clock = (minutes: number) => '第 ' + (Math.floor(minutes / 1440) + 1) + ' 日 ' +
  String(Math.floor(minutes / 60) % 24).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0')

export function Card({ title, meta, tone, className, children }: {
  title: ReactNode, meta?: ReactNode, tone?: Tone, className?: string, children?: ReactNode,
}) {
  const id = useId()
  return <section className={'card' + (className ? ' ' + className : '')} data-tone={tone} aria-labelledby={id}>
    <header className="card-head"><h3 id={id}>{title}</h3>{meta && <div className="card-meta">{meta}</div>}</header>
    {children}
  </section>
}

/** A card that folds down to its title; each browser remembers what it left open. */
export function Fold({ id, title, meta, tone, open = false, children }: {
  id: string, title: ReactNode, meta?: ReactNode, tone?: Tone, open?: boolean, children: ReactNode,
}) {
  const heading = useId()
  const [shown, setShown] = useState(() => {
    try { return (localStorage.getItem('tide-fold-' + id) ?? (open ? 'open' : 'closed')) === 'open' } catch { return open }
  })
  function toggle(event: { preventDefault: () => void }) {
    event.preventDefault()
    setShown(!shown)
    try { localStorage.setItem('tide-fold-' + id, shown ? 'closed' : 'open') } catch { /* It just will not be remembered. */ }
  }
  return <section className="card fold" data-tone={tone} aria-labelledby={heading}>
    <details open={shown}>
      <summary onClick={toggle}><h3 id={heading}>{title}</h3>{meta && <span className="card-meta">{meta}</span>}</summary>
      <div className="fold-body">{children}</div>
    </details>
  </section>
}

/** Something smaller inside a card that stays closed until asked for. */
export function More({ label, open, children }: { label: ReactNode, open?: boolean, children: ReactNode }) {
  return <details className="more" open={open}><summary>{label}</summary><div className="more-body">{children}</div></details>
}

export function Rows({ label, children }: { label?: string, children: ReactNode }) {
  return <ul className="rows" aria-label={label}>{children}</ul>
}
export function Row({ title, note, lead, children }: { title: ReactNode, note?: ReactNode, lead?: ReactNode, children?: ReactNode }) {
  return <li className="row">
    {lead}
    <div className="row-text"><div className="row-title">{title}</div>{note && <div className="row-note">{note}</div>}</div>
    {children && <div className="row-actions">{children}</div>}
  </li>
}

export function Pill({ tone, children }: { tone?: Tone, children: ReactNode }) {
  return <span className="pill" data-tone={tone}>{children}</span>
}

/** A handful of numbers side by side. */
export function Tiles({ items }: { items: [label: string, value: ReactNode][] }) {
  return <dl className="tiles">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
}

export function Bar({ label, value, max, tone = 'sea' }: { label: string, value: number, max: number, tone?: 'hp' | 'sea' | 'gold' }) {
  return <div className="bar" data-tone={tone} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
    <span>{label}</span><i><b style={{ width: Math.max(0, Math.min(100, value / max * 100)) + '%' }}/></i><strong>{value}／{max}</strong>
  </div>
}

/** Levels as filled and empty marks. */
export function Pips({ level, max }: { level: number, max: number }) {
  return <span className="pips" role="img" aria-label={level + '／' + max + ' 級'}>{Array.from({ length: max }, (_, i) => <i key={i} data-on={i < level || undefined}/>)}</span>
}

/** A picture in a round frame, or the first character of a name: always the same colour for the same name. */
export function Avatar({ name, src, size }: { name: string, src?: string, size?: 'tiny' | 'small' | 'large' | 'huge' }) {
  if (src) return <span className="avatar" data-size={size} aria-hidden="true"><img src={src} alt="" draggable={false}/></span>
  const hue = [...name].reduce((sum, letter) => (sum * 31 + letter.codePointAt(0)!) % 360, 7)
  return <span className="avatar" data-size={size} aria-hidden="true" style={{ background: `hsl(${hue} 32% 40%)` }}>{[...name][0]}</span>
}

/** Pages inside a tab. */
export function Segments<T extends string>({ label, value, options, onPick }: {
  label: string, value: T, options: [id: T, text: ReactNode, badge?: number | boolean][], onPick: (id: T) => void,
}) {
  return <div className="segments" role="tablist" aria-label={label}>{options.map(([id, text, badge]) =>
    <button key={id} type="button" role="tab" className="segment" aria-selected={value === id} onClick={() => onPick(id)}>
      {text}{badge ? <span className="badge" aria-label="有新內容">{typeof badge === 'number' ? badge : ''}</span> : null}
    </button>)}</div>
}
const picked = new Map<string, string>()
/** The page a tab was left on, for as long as the game stays open. */
export function useSegment<T extends string>(id: string, first: T) {
  const [value, setValue] = useState(() => (picked.get(id) ?? first) as T)
  return [value, (next: T) => { picked.set(id, next); setValue(next) }] as const
}

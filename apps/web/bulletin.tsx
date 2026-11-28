import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react'

/** Wide screens put the bulletin beside the player's window instead of above it. */
const besideQuery = '(min-width: 1200px)'
const keys = { beside: 'tide-bulletin-width', above: 'tide-bulletin-height' } as const
const smallest = { beside: 240, above: 96 }
/** Room always left for the player's own window next to (or under) the bulletin. */
const windowRoom = { beside: 420, above: 180 }

function saved(key: string, least: number) {
  try { const value = Number(localStorage.getItem(key)); return value >= least ? value : null } catch { return null }
}
function save(key: string, value: number | null) {
  try { if (value) localStorage.setItem(key, String(Math.round(value))); else localStorage.removeItem(key) } catch { /* private mode: it just is not remembered */ }
}
function useBeside() {
  const [beside, setBeside] = useState(() => typeof matchMedia === 'function' && matchMedia(besideQuery).matches)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const query = matchMedia(besideQuery)
    const change = () => setBeside(query.matches)
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])
  return beside
}

/**
 * The world bulletin (spec §5.1). On a wide screen it stands beside the player's window, both as tall as the column;
 * otherwise it sits above it. The line between them can be dragged (or moved with the arrow keys) and is remembered;
 * 「放大閱讀」 gives the bulletin most of the room for a while. On a phone the page scrolls, so only that applies.
 */
export function Bulletin({ children }: { children: ReactNode }) {
  const beside = useBeside()
  const mode = beside ? 'beside' : 'above'
  const box = useRef<HTMLElement>(null)
  const [size, setSize] = useState(() => ({ beside: saved(keys.beside, smallest.beside), above: saved(keys.above, smallest.above) }))
  const [wide, setWide] = useState(false)
  const drag = useRef<{ at: number, start: number } | null>(null)
  const measure = () => { const rect = box.current!.getBoundingClientRect(); return beside ? rect.width : rect.height }
  const room = () => {
    const column = box.current?.parentElement
    return column ? (beside ? column.clientWidth : column.clientHeight) - windowRoom[mode] : 600
  }
  const resize = (value: number) => {
    const next = Math.max(smallest[mode], Math.min(room(), value))
    setSize(now => ({ ...now, [mode]: next }))
    setWide(false)
    return next
  }
  const down = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { at: beside ? event.clientX : event.clientY, start: measure() }
  }
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current) resize(drag.current.start + (beside ? event.clientX : event.clientY) - drag.current.at)
  }
  const up = () => {
    if (!drag.current) return
    drag.current = null
    save(keys[mode], measure())
  }
  const press = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 80 : 24
    const [less, more] = beside ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown']
    if (event.key === less || event.key === more) {
      event.preventDefault()
      save(keys[mode], resize(measure() + (event.key === more ? step : -step)))
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      save(keys[mode], resize(event.key === 'Home' ? smallest[mode] : room()))
    }
  }
  const chosen = size[mode]
  return <>
    <section ref={box} className="bulletin world-log" aria-label="世界公告" data-wide={wide || undefined}
      style={!wide && chosen ? { flexBasis: chosen + 'px' } : undefined}>
      <header className="bulletin-head">
        <h2>世界公告</h2>
        <button type="button" className="link bulletin-toggle" aria-pressed={wide} onClick={() => setWide(w => !w)}>{wide ? '縮回' : '放大閱讀'}</button>
      </header>
      {children}
    </section>
    <div className="bulletin-resize" role="separator" aria-orientation={beside ? 'vertical' : 'horizontal'}
      aria-label={'拖曳或用方向鍵調整世界公告的' + (beside ? '寬度' : '高度') + '，按兩下回到預設'}
      tabIndex={0} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={press}
      onDoubleClick={() => { setSize(now => ({ ...now, [mode]: null })); setWide(false); save(keys[mode], null) }}>
      <span aria-hidden="true"/>
    </div>
  </>
}

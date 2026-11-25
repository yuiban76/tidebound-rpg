// Player portraits: fetched from the host once per picture, shown wherever a player's name stands, and chosen here.
import { createContext, useContext, useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react'
import { portraitLimit } from '../../packages/shared/protocol.ts'
import type { Message } from '../../packages/shared/protocol.ts'
import type { Pictures, View } from './network.ts'
import { Avatar } from './side.tsx'
import './portrait.css'

/** Pictures by revision, for as long as the page stays open. */
const cache = new Map<string, string>()
const Portraits = createContext<Record<string, string | undefined>>({})

export function PortraitProvider({ members, load, children }: {
  members: View['world']['members'], load: (want: string[]) => Promise<Pictures>, children: ReactNode,
}) {
  const [, redraw] = useState(0)
  const latest = useRef(load)
  latest.current = load
  const missing = [...new Set(members.map(m => m.portrait))].filter(revision => revision && !cache.has(revision)).join()
  useEffect(() => {
    if (!missing) return
    let timer: ReturnType<typeof setTimeout>
    let stopped = false
    const ask = () => void latest.current(missing.split(',')).then(({ pictures }) => {
      for (const [revision, image] of Object.entries(pictures)) cache.set(revision, image)
      redraw(n => n + 1)
    }).catch(() => { if (!stopped) timer = setTimeout(ask, 4000) })
    ask()
    return () => { stopped = true; clearTimeout(timer) }
  }, [missing])
  return <Portraits value={Object.fromEntries(members.map(m => [m.id, m.portrait && cache.get(m.portrait)]))}>{children}</Portraits>
}

/** A player's portrait, if they set one. */
export const usePortraits = () => useContext(Portraits)
/** A player's portrait, or the first character of their name. */
export function MemberAvatar({ id, name, size }: { id: string, name: string, size?: 'tiny' | 'small' | 'large' }) {
  return <Avatar name={name} src={usePortraits()[id]} size={size}/>
}

const frame = 240
type Crop = { picture: ImageBitmap, x: number, y: number, zoom: number }
/** The square of the picture that is kept; it never leaves the picture. */
function square({ picture, x, y, zoom }: Crop) {
  const side = Math.min(picture.width, picture.height) / zoom
  const within = (value: number, length: number) => Math.min(length - side / 2, Math.max(side / 2, value))
  return { side, x: within(x, picture.width), y: within(y, picture.height) }
}
function draw(canvas: HTMLCanvasElement, crop: Crop, size: number) {
  canvas.width = canvas.height = size
  const c = canvas.getContext('2d')!
  const { side, x, y } = square(crop)
  c.fillStyle = '#e6eeec'
  c.fillRect(0, 0, size, size)
  c.imageSmoothingQuality = 'high'
  c.drawImage(crop.picture, x - side / 2, y - side / 2, side, side, 0, 0, size, size)
}
/** A small JPEG drawn afresh, so nothing the camera wrote into the file (place, time) leaves this device. */
function encode(crop: Crop) {
  const canvas = document.createElement('canvas')
  for (const size of [160, 128, 96]) {
    draw(canvas, crop, size)
    for (const quality of [.88, .78, .66, .52]) {
      const image = canvas.toDataURL('image/jpeg', quality)
      if (image.length <= portraitLimit) return image
    }
  }
  throw new Error('這張圖片壓不下來，請換一張。')
}
async function open(file: File): Promise<ImageBitmap> {
  if (file.size > 25_000_000) throw new Error('圖片太大了，請選 25 MB 以內的圖片。')
  try {
    const picture = await createImageBitmap(file)
    const scale = 1024 / Math.max(picture.width, picture.height)
    if (scale >= 1) return picture
    // Shrinking a photo in one go to thumbnail size makes it grainy.
    const smaller = await createImageBitmap(picture, { resizeWidth: Math.max(1, Math.round(picture.width * scale)), resizeHeight: Math.max(1, Math.round(picture.height * scale)), resizeQuality: 'high' })
    picture.close()
    return smaller
  } catch { throw new Error('這張圖片打不開，請改用 JPG、PNG 或 WebP。') }
}

/** Choosing a portrait: pick a picture, drag and zoom until it fits the circle. */
function PortraitDialog({ name, current, send, onClose }: {
  name: string, current?: string, send: (msg: Message) => Promise<unknown>, onClose: () => void,
}) {
  const title = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [crop, setCrop] = useState<Crop>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const grip = useRef<{ x: number, y: number } | undefined>(undefined)
  useEffect(() => { dialog.current!.showModal() }, [])
  useEffect(() => { if (crop) draw(canvas.current!, crop, frame * 2) }, [crop])
  async function choose(file: File | undefined) {
    if (!file) return
    setError('')
    try {
      const picture = await open(file)
      setCrop({ picture, x: picture.width / 2, y: picture.height / 2, zoom: 1 })
    } catch (e) { setError((e as Error).message) }
  }
  async function save(make: () => string | null) {
    setError('')
    setBusy(true)
    try {
      await send({ kind: 'portrait', image: make() })
      onClose()
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }
  /** Moves the picture under the frame by screen pixels. */
  const shift = (dx: number, dy: number) => setCrop(old => {
    if (!old) return old
    const { side, x, y } = square(old)
    return { ...old, x: x - dx * side / frame, y: y - dy * side / frame }
  })
  function drag(event: PointerEvent<HTMLCanvasElement>) {
    if (!grip.current) return
    shift(event.clientX - grip.current.x, event.clientY - grip.current.y)
    grip.current = { x: event.clientX, y: event.clientY }
  }
  function nudge(event: KeyboardEvent) {
    const step = ({ ArrowLeft: [12, 0], ArrowRight: [-12, 0], ArrowUp: [0, 12], ArrowDown: [0, -12] } as Record<string, [number, number]>)[event.key]
    if (!step) return
    event.preventDefault()
    shift(...step)
  }
  return <dialog ref={dialog} className="portrait-dialog" aria-labelledby={title} onClose={onClose}
    onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void choose(e.dataTransfer.files[0]) }}>
    <h2 id={title}>{name ? name + '的頭貼' : '我的頭貼'}</h2>
    {crop ? <>
      <canvas ref={canvas} className="portrait-crop" tabIndex={0} aria-label="拖曳調整位置，也可以用方向鍵" style={{ width: frame, height: frame }}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); grip.current = { x: e.clientX, y: e.clientY } }}
        onPointerMove={drag} onPointerUp={() => { grip.current = undefined }} onPointerCancel={() => { grip.current = undefined }} onKeyDown={nudge}
        onWheel={e => setCrop(old => old && { ...old, zoom: Math.min(4, Math.max(1, old.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08))) })}/>
      <label className="portrait-zoom">縮放<input type="range" min={1} max={4} step={.02} value={crop.zoom} onChange={e => setCrop({ ...crop, zoom: Number(e.target.value) })}/></label>
      <p className="hint">拖曳圖片調整位置。</p>
    </> : <div className="portrait-now"><Avatar name={name || '？'} src={current} size="huge"/>
      <p className="hint">選一張圖片，裁成圓形頭貼。全隊都看得到。</p></div>}
    {error && <p className="notice warning" role="alert">{error}</p>}
    <div className="button-row">
      <label className="button light"><input type="file" accept="image/*" className="sr-only" onChange={e => { void choose(e.target.files?.[0]); e.target.value = '' }}/>{crop ? '換一張圖片' : '選圖片'}</label>
      {crop && <button type="button" disabled={busy} onClick={() => void save(() => encode(crop))}>{busy ? '上傳中' : '使用這張'}</button>}
      {!crop && current && <button type="button" className="light" disabled={busy} onClick={() => void save(() => null)}>移除頭貼</button>}
      <button type="button" className="light" onClick={onClose}>取消</button>
    </div>
  </dialog>
}

/** The player's own portrait as a button to change it. A host that is not up to date yet cannot keep one. */
export function PortraitPicker({ view, name, send, children }: {
  view: Pick<View, 'player' | 'portraits'>, name: string, send: (msg: Message) => Promise<unknown>, children?: ReactNode,
}) {
  const [open, setOpen] = useState(false)
  const current = usePortraits()[view.player]
  if (!view.portraits) return <><Avatar name={name || '？'} src={current} size="large"/>{children}</>
  return <>
    <button type="button" className="portrait-button" aria-label="換頭貼" title="換頭貼" onClick={() => setOpen(true)}>
      <Avatar name={name || '？'} src={current} size="large"/>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5h3.2L8.8 6h6.4l1.6 2.5H20V18.5H4ZM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>
    </button>
    {children}
    {open && <PortraitDialog name={name} current={current} send={send} onClose={() => setOpen(false)}/>}
  </>
}

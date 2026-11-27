import { useId, useState } from 'react'
import { locations, npcs, shipParts } from '../../packages/shared/protocol.ts'
import type { LocationId } from '../../packages/shared/protocol.ts'
import { beli } from '../../packages/world/scale.ts'
import { islandAt } from '../../packages/world/sea.ts'
import type { Ship } from '../../packages/world/sea.ts'
import { crippled, holdCount, maxPart, modelOf, models, partLevel, partPrice, parts, sameIsland, shipName, shipSpeed, shipwright, shipyards, tradeIn, yardAt } from '../../packages/world/ships.ts'
import { Bar, Card, Fold, meIn, More, Pips, Row, Rows, Tiles } from './side.tsx'
import { coatingPrice } from '../../packages/rules/ship.ts'
import type { PanelProps } from './side.tsx'
import './ship.css'

const looks = {
  boat: { from: 95, to: 225, deck: 138, masts: [160], tall: 88, wood: '#a9713f', dark: '#7a4d28' },
  caravel: { from: 70, to: 250, deck: 134, masts: [128, 195], tall: 100, wood: '#9c6637', dark: '#6d4424' },
  brig: { from: 50, to: 272, deck: 130, masts: [112, 198], tall: 102, wood: '#8a5730', dark: '#5d391e' },
  adam: { from: 46, to: 286, deck: 130, masts: [98, 164, 228], tall: 96, wood: '#b98a52', dark: '#7c5527' },
} as const

/** The ship from the side: bigger hulls, and every fitted part, can be seen on her. */
function ShipArt({ ship }: { ship: Ship }) {
  const look = looks[ship.model ?? 'boat']
  const { from, to, deck } = look
  const [armor, sail, cannon, lookout, cabin] = shipParts.map(part => partLevel(ship, part))
  const spots = (count: number, pad: number) => Array.from({ length: count }, (_, i) => from + pad + (to - from - pad * 2) * (count === 1 ? .5 : i / (count - 1)))
  const name = ship.name ?? modelOf(ship).label
  const cloth = ['#fbf6e8', '#fdf3d2', '#fff0c0', '#ffe9a3'][sail]
  return <svg className="ship-art" viewBox="0 0 320 200" role="img" aria-label={name + '的樣子'}>
    <defs><linearGradient id="ship-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dceff2"/><stop offset="1" stopColor="#f4f3de"/></linearGradient></defs>
    <rect width="320" height="200" fill="url(#ship-sky)"/>
    <path d="M28 40q8 -14 24 -8q10 -12 24 0q14 0 14 12H20Q18 42 28 40ZM236 28q8 -12 20 -6q10 -8 20 2q12 2 10 12H230Q228 30 236 28Z" fill="#fff" opacity=".8"/>
    <g stroke="#33241a" strokeWidth="1.5" strokeLinejoin="round">
      {look.masts.map((x, i) => {
        const top = deck - look.tall + (i === 1 && look.masts.length === 3 ? -8 : 0)
        const half = 24 + sail * 2 + (look.masts.length === 1 ? 8 : 0)
        return <g key={x}>
          <path d={`M${x} ${deck + 4}V${top - 10}`} strokeWidth="4" stroke="#6a4526"/>
          <path d={`M${x - half} ${top + 6}Q${x + 6} ${top + 14} ${x + half} ${top + 6}Q${x + half + 8} ${top + 32} ${x + half - 2} ${deck - 18}Q${x + 4} ${deck - 8} ${x - half + 2} ${deck - 18}Q${x - half + 8} ${top + 32} ${x - half} ${top + 6}Z`} fill={cloth}/>
          {Array.from({ length: sail }, (_, n) => <path key={n} d={`M${x - half + 5} ${top + 20 + n * 13}Q${x + 6} ${top + 28 + n * 13} ${x + half} ${top + 20 + n * 13}`} fill="none" stroke="#b5573f" strokeWidth="2.4"/>)}
          <path d={`M${x} ${top - 10}l16 4l-16 5Z`} fill="#b5413a"/>
        </g>
      })}
      {lookout > 0 && <g>{look.masts.slice(0, lookout).map(x => <path key={x} d={`M${x - 11} ${deck - look.tall - 8}h22l-4 13h-14Z`} fill="#c79a5b"/>)}</g>}
      {/* Cabin on the quarterdeck: one more row of windows each level. */}
      {cabin > 0 && <g><path d={`M${to - 62} ${deck + 4}V${deck - 14 - cabin * 4}H${to - 8}V${deck + 4}Z`} fill="#d8b27c"/><path d={`M${to - 66} ${deck - 14 - cabin * 4}L${to - 35} ${deck - 24 - cabin * 4}L${to - 4} ${deck - 14 - cabin * 4}Z`} fill="#8a3b26"/>
        {Array.from({ length: cabin + 1 }, (_, i) => <rect key={i} x={to - 56 + i * 12} y={deck - 10 - cabin * 2} width="7" height="8" fill="#ffe08a"/>)}</g>}
      <path d={`M${from - 20} ${deck - 10}Q${from} ${deck + 4} ${from + 14} ${deck + 4}H${to - 6}Q${to + 10} ${deck} ${to + 16} ${deck - 12}Q${to + 12} ${deck + 34} ${to - 20} ${deck + 46}H${from + 26}Q${from - 8} ${deck + 34} ${from - 20} ${deck - 10}Z`} fill={look.wood}/>
      <path d={`M${from - 6} ${deck + 16}H${to + 9}M${from + 2} ${deck + 28}H${to + 2}`} fill="none" stroke={look.dark} strokeWidth="1.3"/>
      {Array.from({ length: armor }, (_, n) => <path key={n} d={`M${from - 8 + n * 5} ${deck + 12 + n * 11}H${to + 10 - n * 5}`} stroke="#59666d" strokeWidth="5"/>)}
      {armor > 0 && spots(6, 14).map(x => <circle key={x} cx={x} cy={deck + 12} r="1.4" fill="#cfd8dc" stroke="none"/>)}
      {cannon > 0 && spots(cannon, 48).map(x => <g key={x}><rect x={x - 7} y={deck + 19} width="14" height="11" fill="#33241a"/><path d={`M${x - 3} ${deck + 22}h14v5h-14Z`} fill="#4a5258"/></g>)}
      <path d={`M${from - 20} ${deck - 10}l-18 -10l14 18Z`} fill={ship.model === 'adam' ? '#f0c24d' : look.wood}/>
      {crippled(ship) && <g stroke="#2a1c12" fill="#2a1c12"><path d={`M${from + 50} ${deck + 20}l8 -6l6 8l9 -2l-4 10l-12 4Z`}/><path d={`M${to - 70} ${deck + 30}l7 -5l8 5l-3 7l-9 1Z`}/></g>}
    </g>
    <path d="M0 172Q20 162 40 172T80 172T120 172T160 172T200 172T240 172T280 172T320 172V200H0Z" fill="#5f9fb3"/>
    <path d="M0 182Q20 174 40 182T80 182T120 182T160 182T200 182T240 182T280 182T320 182V200H0Z" fill="#3f7f97"/>
  </svg>
}

/** The party's ship: her name, condition, parts, and what lies in her hold. */
export function ShipPanel({ world, player, suggest }: PanelProps) {
  const title = useId()
  const [name, setName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const c = meIn(world, player)
  const { ship } = world
  const yard = yardAt(c.place)
  if (!ship) return <Card title="我們的船">
    <p className="hint">還沒有船。{Object.entries(shipyards).filter(([, shop]) => shop.models.includes('boat')).map(([place]) => locations[place as LocationId]).join('、')}買得到{models.boat.label}（{beli(models.boat.price)}）。</p>
  </Card>
  const model = modelOf(ship)
  const here = c.place === ship.port
  const atYard = !!yard && sameIsland(ship, c.place)
  const wright = shipwright(world)
  const hold = Object.entries(ship.hold ?? {}).filter(([, n]) => n > 0)
  const bigger = atYard ? yard!.models.filter(id => models[id].price > model.price) : []
  return <>
    <section className="card ship-card" aria-labelledby={title}>
      <ShipArt ship={ship}/>
      <header className="card-head">
        <h3 id={title}>{shipName(ship)}</h3>
        {ship.name && <button type="button" className="light slim" aria-expanded={renaming} onClick={() => setRenaming(!renaming)}>改名</button>}
      </header>
      <p className="hint">{model.label} · 停在{locations[ship.port]} · 出航 {ship.trips} 次</p>
      {(!ship.name || renaming) && <form className="ship-name" onSubmit={e => { e.preventDefault(); if (name.trim()) { suggest('替船取名「' + name.trim() + '」'); setName(''); setRenaming(false) } }}>
        <label className="sr-only" htmlFor={title + 'name'}>船名</label>
        <input id={title + 'name'} maxLength={12} value={name} placeholder={ship.name ? '改成別的名字' : '替船取個名字'} onChange={e => setName(e.target.value)}/>
        <button type="submit" className="light" disabled={!name.trim()}>{ship.name ? '確定' : '取名'}</button>
      </form>}
      <Bar label="船體" value={ship.hull} max={100} tone={ship.hull < 30 ? 'hp' : 'sea'}/>
      {crippled(ship) && <p className="hint">船體破損，航程多 25%。先修船吧。</p>}
      <Tiles items={[['航速', Math.round(shipSpeed(ship) * 10) / 10], ['座位', model.seats], ['木料', ship.wood], ['鍍膜', ship.coated ? '已鍍膜' : '沒有']]}/>
      {!ship.coated && c.place === 'coatingYard' && islandAt(ship.port) === 'sabaody' && <button type="button" className="light wide" onClick={() => suggest('鍍膜')}>替船鍍膜（{beli(coatingPrice)}）</button>}
    </section>

    <Fold id="ship-hold" title="船艙與金庫" open meta={holdCount(ship) + '／' + model.hold}>
      <div className="safe"><span>金庫</span><strong>{beli(ship.safe ?? 0)}</strong></div>
      {hold.length > 0 && <ul className="items">{hold.map(([item, n]) => <li key={item}><span><strong>{item}</strong> <b>× {n}</b></span>
        {here && <button type="button" className="link" onClick={() => suggest('從船艙拿出' + item)}>拿出</button>}</li>)}</ul>}
      <p className="hint">{here ? '全隊共用。放在船上的貝里，被打倒時不會被搶走。' : islandAt(c.place) === islandAt(ship.port) ? '到' + locations[ship.port] + '的船邊才能拿放東西。' : '船不在這座島。'}</p>
      {here && <More label="放進去、拿出來">
        <div className="button-row">
          {c.money >= 10_000 && <button type="button" className="light" onClick={() => suggest('把 ' + Math.floor(c.money / 2) + ' 貝里放進金庫')}>存一半貝里</button>}
          {!!ship.safe && <button type="button" className="light" onClick={() => suggest('從金庫拿 ' + ship.safe + ' 貝里')}>拿出全部貝里</button>}
          {Object.entries(c.inventory).filter(([, n]) => n > 0).map(([item]) => <button key={item} type="button" className="light" onClick={() => suggest('把 1 個' + item + '放進船艙')}>{item}</button>)}
        </div>
      </More>}
    </Fold>

    <Fold id="ship-parts" title="改裝" open meta={atYard ? yard!.name : '這裡不能改裝'}>
      <Rows>{shipParts.map(part => {
        const level = partLevel(ship, part)
        const full = level >= maxPart(ship)
        return <Row key={part} title={<>{parts[part].label}<Pips level={level} max={maxPart(ship)}/></>}
          note={<>{level > 0 && <>{parts[part].text(level)}<br/></>}{!full && <>下一級：{parts[part].text(level + 1)}</>}</>}>
          {full ? <span className="hint">{maxPart(ship) < 3 ? '換船才能再升' : '最高級'}</span>
            : <button type="button" className="light price" data-poor={c.money < partPrice(world, part, level + 1) || undefined} disabled={!atYard || level + 1 > (yard?.level ?? 0)}
              aria-label={'升級' + parts[part].label + '，' + beli(partPrice(world, part, level + 1))} onClick={() => suggest('升級' + parts[part].label)}>{beli(partPrice(world, part, level + 1))}</button>}
        </Row>
      })}</Rows>
      <p className="hint">{atYard ? yard!.name + '可以改裝到 ' + yard!.level + ' 級。' : '改裝和換船的地方：' + Object.keys(shipyards).map(place => locations[place as LocationId]).join('、') + '。'}
        {wright ? wright + '在船上：改裝便宜兩成、修船多修 15。' : '隊伍裡有船匠（玩家或夥伴，例如' + npcs.franky + '）時，改裝便宜兩成、修船多修 15。'}</p>
    </Fold>
    {bigger.length > 0 && <Fold id="ship-swap" title="換船" meta={bigger.length + ' 種'}>
      <Rows>{bigger.map(id => <Row key={id} title={models[id].label}
        note={<>{models[id].text}<br/>航速 {models[id].speed} · 座位 {models[id].seats} · 船艙 {models[id].hold} · 船體損傷 −{Math.round((1 - models[id].wear) * 100)}% · 改裝上限 {models[id].parts} 級{models[id].adamWood ? ' · 需要 ' + models[id].adamWood + ' 份亞當木' : ''}</>}>
        <button type="button" className="light price" aria-label={'換成' + models[id].label + '，' + beli(models[id].price - tradeIn(ship))} data-poor={c.money < models[id].price - tradeIn(ship) || undefined}
          onClick={() => suggest('換成' + models[id].label)}>{beli(models[id].price - tradeIn(ship))}</button>
      </Row>)}</Rows>
      <p className="hint">價格已扣掉舊船折抵；船名、改裝、船艙和金庫都會搬過去。</p>
    </Fold>}
  </>
}

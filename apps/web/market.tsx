import { npcs } from '../../packages/shared/protocol.ts'
import { brokers, marineOffices, priceFor, slipValue, slipsOf, specials, traderSpecials } from '../../packages/world/market.ts'
import { islandAt } from '../../packages/world/sea.ts'
import { isTrader, traderWares } from '../../packages/world/traders.ts'
import { goods, npcsAt } from '../../packages/world/village.ts'
import type { View } from './network.ts'

type Props = { world: View['world'], player: string, suggest: (command: string) => void }
const beli = (n: number) => n.toLocaleString('en-US') + ' 貝里'

/** The merchant on this spot with every ware and price, and where bounty slips in the bag can be cashed here. */
export function MarketPanel({ world, player, suggest }: Props) {
  const character = world.members.find(m => m.id === player)!.character!
  const here = npcsAt(world, character.place).filter(npc => (world.npcDown?.[npc] ?? 0) <= world.minute)
  const trader = here.find(isTrader)
  const broker = here.find(npc => brokers[npc])
  const slips = slipsOf(character)
  const value = slips.reduce((sum, slip) => sum + slipValue(slip) * character.inventory[slip], 0)
  const office = marineOffices.includes(character.place)
  if (!trader && !(slips.length && (office || broker))) return null
  const island = islandAt(character.place)
  const price = (base: number) => priceFor(world, island, trader, base)
  return <section className="subsection" aria-label="買賣">
    {trader && <details open>
      <summary>{npcs[trader]}的貨</summary>
      <ul className="plain">
        {traderWares.map(id => <li key={id}><button type="button" className="link" onClick={() => suggest('買' + goods[id].label)}>{goods[id].label}</button> · {beli(price(goods[id].price))}</li>)}
        {traderSpecials[trader].map(id => <li key={id}><button type="button" className="link" onClick={() => suggest('買' + specials[id].label)}>{specials[id].label}</button> · {beli(price(specials[id].price))}
          <div className="hint">{specials[id].text}</div></li>)}
      </ul>
      <p className="hint">行商用半價收購，例如輸入「賣掉普通長槍」。</p>
    </details>}
    {slips.length > 0 && (office || broker) && <div>
      <p>賞金單 {slips.length} 張，共 {beli(value)}。{office
        ? character.bounty > 0 ? '海軍不付錢給有懸賞金的人。' : '這裡的海軍付全額。'
        : npcs[broker!] + '用 ' + Math.round(brokers[broker!]! * 100) + '% 收購。'}</p>
      {!(office && character.bounty > 0) && <button type="button" className="light" onClick={() => suggest('兌換賞金單')}>兌換賞金單</button>}
    </div>}
  </section>
}

import { npcs } from '../../packages/shared/protocol.ts'
import { brokers, marineOffices, priceFor, slipValue, slipsOf, specials, traderSpecials } from '../../packages/world/market.ts'
import { beli } from '../../packages/world/scale.ts'
import { islandAt } from '../../packages/world/sea.ts'
import { isTrader, traderWares } from '../../packages/world/traders.ts'
import { goods, npcsAt, shops } from '../../packages/world/village.ts'
import type { Good } from '../../packages/world/village.ts'
import { Card, Fold, meIn, Row, Rows } from './side.tsx'
import type { PanelProps } from './side.tsx'

/** The shop and the merchant on this spot with every ware and price, and where bounty slips in the bag can be cashed here. */
export function MarketPanel({ world, player, suggest }: PanelProps) {
  const character = meIn(world, player)
  const here = npcsAt(world, character.place).filter(npc => (world.npcDown?.[npc] ?? 0) <= world.minute)
  const trader = here.find(isTrader)
  const broker = here.find(npc => brokers[npc])
  const slips = slipsOf(character)
  const value = slips.reduce((sum, slip) => sum + slipValue(slip) * character.inventory[slip], 0)
  const office = marineOffices.includes(character.place)
  const wanted = office && character.bounty > 0
  const island = islandAt(character.place)
  const price = (base: number) => priceFor(world, island, trader, base)
  const stocked = (Object.keys(goods) as Good[]).filter(id => goods[id].shop === character.place)
  const ware = (label: string, cost: number, note?: string, left?: number) => <Row key={label} title={label} note={note}>
    <button type="button" className="light price" data-poor={character.money < cost || undefined} disabled={left === 0}
      aria-label={'買' + label + '，' + beli(cost)} onClick={() => suggest('買' + label)}>{left === 0 ? '賣完了' : beli(cost)}</button></Row>
  return <>
    {slips.length > 0 && (office || broker) && <Card title="賞金單" meta={slips.length + ' 張'} tone="gold">
      <p>共 {beli(value)}。{wanted ? '海軍不付錢給有懸賞金的人。' : office ? '這裡的海軍付全額。'
        : npcs[broker!] + '用 ' + Math.round(brokers[broker!]! * 100) + '% 收購。'}</p>
      {!wanted && <button type="button" onClick={() => suggest('兌換賞金單')}>兌換賞金單</button>}
    </Card>}
    {stocked.length > 0 && <Fold id="shop" title={shops[character.place]} meta={stocked.length + ' 項商品'}>
      <Rows>{stocked.map(id => ware(goods[id].label, goods[id].price, '剩 ' + world.stock[id], world.stock[id]))}</Rows>
    </Fold>}
    {trader && <Fold id="trader" title={npcs[trader] + '的貨'} meta={traderWares.length + traderSpecials[trader].length + ' 項商品'}>
      <h4>這裡的特產</h4>
      <Rows>{traderSpecials[trader].map(id => ware(specials[id].label, price(specials[id].price), specials[id].text))}</Rows>
      <h4>常備貨</h4>
      <Rows>{traderWares.map(id => ware(goods[id].label, price(goods[id].price)))}</Rows>
      <p className="hint">行商用半價收購，例如輸入「賣掉普通長槍」。</p>
    </Fold>}
  </>
}

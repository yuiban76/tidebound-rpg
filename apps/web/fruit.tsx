import { npcs } from '../../packages/shared/protocol.ts'
import { fruitMoves, fruitPrice, fruits, kindNames, moveLevels } from '../../packages/world/fruits.ts'
import { beli } from '../../packages/world/scale.ts'
import { party } from '../../packages/world/village.ts'
import { Card, meIn, Pill, Row, Rows } from './side.tsx'
import type { PanelProps } from './side.tsx'

/** The player's devil fruit with the moves learned so far, and a fruit waiting for a decision. */
export function FruitPanel({ world, player, suggest }: PanelProps) {
  const character = meIn(world, player)
  const offers = (world.fruitOffers ?? []).filter(offer => offer.to === player)
  const own = character.fruit && fruits[character.fruit]
  // Teammates on the spot who can take the decision over (a fight on either side stops it).
  const busy = !!world.combat?.participants.includes(player)
  const mates = party(world).filter(m => m.id !== player && m.character!.place === character.place && !world.combat?.participants.includes(m.id)).map(m => m.character!)
  return <>
    {offers.length > 0 && <Card title="掉落的惡魔果實" tone="gold">
      <Rows>{offers.map(offer => <Row key={offer.npc} title={fruits[offer.fruit].name} note={npcs[offer.npc] + '倒下後掉出的果實。'}>
        <button type="button" disabled={!!character.fruit} onClick={() => suggest('吸收' + fruits[offer.fruit].name)}>吸收</button>
        <button type="button" className="light" onClick={() => suggest('放走' + fruits[offer.fruit].name)}>放走</button>
        {!busy && mates.map(mate => <button key={mate.name} type="button" className="light" title={mate.fruit ? mate.name + '已經吃過果實，只能放走或再轉交' : undefined}
          onClick={() => suggest('把' + fruits[offer.fruit].name + '交給' + mate.name)}>交給{mate.name}</button>)}</Row>)}</Rows>
      <p className="hint">吃下後不能游泳，一個人只能吃一顆；不吃就會流到外面，三天後在夏波帝拍賣所出現。也可以交給在同一個地點的隊友決定。</p>
    </Card>}
    {own && <Card title={own.name} meta={<Pill tone="gold">{kindNames[own.kind]}</Pill>}>
      <p>{own.text}</p>
      <ul className="moves">{fruitMoves[character.fruit!].map((name, i) => <li key={name} data-locked={character.level < moveLevels[i] || undefined}>
        <strong>{name}</strong><small>{character.level < moveLevels[i] ? '等級 ' + moveLevels[i] + ' 學會' : '已學會'}</small></li>)}</ul>
      <p className="hint">代價：不能游泳，海上戰鬥防禦 −2。</p>
    </Card>}
  </>
}

/** What the Sabaody auction house has up for sale. */
export function FruitStalls({ world, player, suggest }: PanelProps) {
  const character = meIn(world, player)
  const stalls = character.place === 'auctionHouse' ? (world.fruitStalls ?? []).filter(stall => stall.ready <= world.minute) : []
  if (!stalls.length) return null
  return <Card title="拍賣中的惡魔果實" meta={stalls.length + ' 顆'}>
    <Rows>{stalls.map(stall => {
      const price = fruitPrice[fruits[stall.fruit].rank]
      return <Row key={stall.fruit} title={fruits[stall.fruit].name} note={fruits[stall.fruit].text}>
        <button type="button" className="light price" data-poor={character.money < price || undefined} disabled={!!character.fruit}
          aria-label={'標下' + fruits[stall.fruit].name + '，' + beli(price)} onClick={() => suggest('買' + fruits[stall.fruit].name)}>{beli(price)}</button></Row>
    })}</Rows>
    {character.fruit && <p className="hint">你已經吃過惡魔果實，不能再吃第二顆。</p>}
  </Card>
}

import { npcs } from '../../packages/shared/protocol.ts'
import { fruitMoves, fruitPrice, fruits, kindNames, moveLevels } from '../../packages/world/fruits.ts'
import type { View } from './network.ts'

type Props = { world: View['world'], player: string, suggest: (command: string) => void }

/** The player's devil fruit, a fruit waiting for a decision, and the fruits on sale at the Sabaody auction. */
export function FruitPanel({ world, player, suggest }: Props) {
  const character = world.members.find(m => m.id === player)!.character!
  const offers = (world.fruitOffers ?? []).filter(offer => offer.to === player)
  const atAuction = character.place === 'auctionHouse'
  const stalls = atAuction ? (world.fruitStalls ?? []).filter(stall => stall.ready <= world.minute) : []
  if (!character.fruit && !offers.length && !stalls.length) return null
  const own = character.fruit && fruits[character.fruit]
  return <section className="subsection" aria-label="惡魔果實">
    <h3>惡魔果實</h3>
    {own && <p className="hint"><strong>{own.name}</strong>（{kindNames[own.kind]}）· 招式：{fruitMoves[character.fruit!].map((name, i) => '「' + name + '」（等級 ' + moveLevels[i] + '）').join('、')}· {own.text}　代價：不能游泳，海上戰鬥防禦 −2。</p>}
    <ul className="roster">
      {offers.map(offer => <li key={offer.npc}>
        <div><strong>{fruits[offer.fruit].name}</strong><div className="hint">{npcs[offer.npc]}倒下後掉出的果實。吃下後不能游泳，一個人只能吃一顆；不吃就會流到外面，三天後在夏波帝拍賣所出現。</div></div>
        <div className="button-row">
          <button type="button" className="light" disabled={!!character.fruit} onClick={() => suggest('吸收' + fruits[offer.fruit].name)}>吸收</button>
          <button type="button" className="light" onClick={() => suggest('放走' + fruits[offer.fruit].name)}>放走</button></div></li>)}
      {stalls.map(stall => <li key={stall.fruit}>
        <div><strong>{fruits[stall.fruit].name}</strong><div className="hint">{fruits[stall.fruit].text} 標價 {fruitPrice[fruits[stall.fruit].rank].toLocaleString('en-US')} 貝里</div></div>
        <button type="button" className="light" disabled={!!character.fruit} onClick={() => suggest('買' + fruits[stall.fruit].name)}>標下</button></li>)}
    </ul>
  </section>
}

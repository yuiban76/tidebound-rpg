import { locations } from '../../packages/shared/protocol.ts'
import { maxHP, maxSTA } from '../../packages/rules/engine.ts'
import { meals } from '../../packages/world/village.ts'
import type { View } from './network.ts'

type Props = { world: View['world'], player: string, suggest: (command: string) => void }

/** Where and how to get HP and STA back, with the options that work right here highlighted. */
export function RecoveryPanel({ world, player, suggest }: Props) {
  const character = world.members.find(m => m.id === player)!.character!
  const hurt = character.hp < maxHP(character)
  const tired = character.sta < maxSTA(character)
  const bandages = character.inventory['繃帶'] ?? 0
  const atTavern = character.place === 'tavern'
  const inCombat = !!world.combat?.participants.includes(player)
  return <section className="subsection" aria-label="恢復">
    <h3>恢復 HP／STA</h3>
    <p className="hint">HP {character.hp}／{maxHP(character)} · STA {character.sta}／{maxSTA(character)}
      {!hurt && !tired ? ' · 狀態良好' : ''}</p>
    {inCombat && <p className="hint">戰鬥中只能防守、撤退或使用繃帶；結束後再休息。</p>}
    <ul className="roster">
      <li><div><strong>休息一下</strong><div className="hint">30 分鐘 · 回復約 1/4 STA 與少量 HP</div></div>
        <button type="button" className="light" disabled={inCombat} onClick={() => suggest('休息')}>休息</button></li>
      <li><div><strong>睡一覺</strong><div className="hint">8 小時 · STA 全滿，HP 回復 1/4（山徑除外）</div></div>
        <button type="button" className="light" disabled={inCombat} onClick={() => suggest('睡一覺')}>睡覺</button></li>
      <li><div><strong>吃東西</strong><div className="hint">
        {atTavern ? '這裡就能吃：' : '去' + locations.tavern + '：'}
        {Object.values(meals).map(m => m.name + '（' + m.price + ' 貝里，HP+' + m.hp + '、STA+' + m.sta + '）').join('、')}</div></div>
        {atTavern && <div className="button-row">
          <button type="button" className="light" onClick={() => suggest('吃烤麵包')}>烤麵包</button>
          <button type="button" className="light" onClick={() => suggest('吃燉肉飯')}>燉肉飯</button></div>}</li>
      <li><div><strong>繃帶</strong><div className="hint">{bandages ? '背包有 ' + bandages + ' 條，可替自己或同地隊友、夥伴包紮' : '港口補給鋪購買（80 貝里）'}</div></div>
        {bandages > 0 && <button type="button" className="light" onClick={() => suggest('使用繃帶')}>包紮</button>}</li>
    </ul>
  </section>
}

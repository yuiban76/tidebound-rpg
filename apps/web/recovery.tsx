import { locations } from '../../packages/shared/protocol.ts'
import { maxHP, maxSTA } from '../../packages/rules/engine.ts'
import { beli } from '../../packages/world/scale.ts'
import { dressingOf } from '../../packages/world/skills.ts'
import { goods, meals, shops } from '../../packages/world/village.ts'
import { Card, meIn } from './side.tsx'
import type { PanelProps } from './side.tsx'

/** How to get HP and STA back, as buttons for whatever works right here. */
export function RecoveryPanel({ world, player, suggest }: PanelProps) {
  const c = meIn(world, player)
  const dressing = dressingOf(c)
  const inCombat = !!world.combat?.participants.includes(player)
  const fine = c.hp >= maxHP(c) && c.sta >= maxSTA(c)
  const choice = (title: string, note: string, command: string, disabled = inCombat) => <li key={title}>
    <button type="button" className="light choice" disabled={disabled} onClick={() => suggest(command)}><strong>{title}</strong><small>{note}</small></button></li>
  return <Card title="恢復" meta={fine ? '狀態良好' : 'HP ' + c.hp + '／' + maxHP(c) + ' · STA ' + c.sta + '／' + maxSTA(c)}>
    {inCombat && <p className="hint">戰鬥中只能防守、撤退或使用繃帶；結束後再休息。</p>}
    <ul className="choices">
      {choice('休息', '30 分鐘 · STA 回復約 1/4、少量 HP', '休息')}
      {choice('睡覺', '8 小時 · STA 全滿、HP 回復 1/4（山徑除外）', '睡一覺')}
      {dressing && choice('包紮', dressing + ' × ' + c.inventory[dressing] + ' · 自己、隊友或夥伴', '使用' + dressing, false)}
      {!!c.inventory['傷藥'] && choice('喝傷藥', '傷藥 × ' + c.inventory['傷藥'], '喝傷藥')}
      {c.place === 'tavern' && Object.values(meals).map(meal => choice(meal.name, beli(meal.price) + ' · HP+' + meal.hp + '、STA+' + meal.sta, '吃' + meal.name))}
    </ul>
    {c.place !== 'tavern' && <p className="hint">{locations.tavern}有熱食：{Object.values(meals).map(meal => meal.name + '（' + beli(meal.price) + '，HP+' + meal.hp + '、STA+' + meal.sta + '）').join('、')}。
      {!dressing && shops[goods.bandage.shop] + '和行商賣繃帶（' + beli(goods.bandage.price) + '）。'}</p>}
  </Card>
}

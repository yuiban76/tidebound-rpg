import { armorOf, slipValue, specialByLabel, specials } from '../../packages/world/market.ts'
import type { Special } from '../../packages/world/market.ts'
import { forges, weaponLabel } from '../../packages/world/forge.ts'
import { masteryOf, party, weaponItems, weaponNames } from '../../packages/world/village.ts'
import { RecoveryPanel } from './recovery.tsx'
import { Card, meIn, Pill } from './side.tsx'
import type { PanelProps } from './side.tsx'

const groups = ['武器', '防具', '食藥', '道具', '其他'] as const
const specialGroups: Record<Special['kind'], (typeof groups)[number]> = {
  weapon: '武器', armor: '防具', food: '食藥', heal: '食藥', combat: '道具', ship: '其他',
}
const plainGroups: Record<string, (typeof groups)[number]> = {
  ...Object.fromEntries(Object.values(weaponItems).map(item => [item, '武器' as const])), 火槍彈藥: '武器',
  繃帶: '食藥', 草藥: '食藥', 傷藥: '食藥', 醫療工具: '道具', 記錄指針: '道具', 水壺: '道具', 海樓石十手: '道具', 衝擊貝: '道具',
}
const special = (item: string): Special | undefined => { const id = specialByLabel(item); return id && specials[id] }
const groupOf = (item: string) => plainGroups[item] ?? (special(item) ? specialGroups[special(item)!.kind] : '其他')
/** What a click on the item does, when it can be used right away. */
function use(item: string): [string, string] | undefined {
  const kind = special(item)?.kind
  return kind === 'food' ? ['吃', '吃' + item] : kind === 'heal' ? ['服用', '服用' + item] : kind === 'ship' ? ['修船', '使用' + item] : undefined
}

export function BagPanel({ world, player, suggest }: PanelProps) {
  const c = meIn(world, player)
  const mastery = masteryOf(c)
  const armor = armorOf(c)
  const items = Object.entries(c.inventory).filter(([, count]) => count > 0)
  const busy = !!world.combat?.participants.includes(player)
  return <>
    <RecoveryPanel world={world} player={player} suggest={suggest}/>
    <Card title="裝備">
      <div className="slots">
        <div className="slot"><small>目前武器：</small><strong>{weaponLabel(c, weaponNames[c.weapon])}</strong>
          {mastery && <Pill tone="on">擅長：命中 +{mastery.hit}、傷害 +{mastery.damage}</Pill>}</div>
        <div className="slot"><small>防具：</small><strong>{armor?.label ?? '沒有'}</strong>
          {armor && <Pill tone="on">防禦 +{armor.def}{armor.agi ? '、敏捷 −' + -armor.agi : ''}</Pill>}</div>
      </div>
      <div className="button-row">
        {(Object.keys(weaponItems) as (keyof typeof weaponItems)[]).filter(id => id !== c.weapon && c.inventory[weaponItems[id]])
          .map(id => <button key={id} type="button" className="light" onClick={() => suggest('改用' + weaponItems[id])}>改用{weaponItems[id]}</button>)}
        {c.fighting === 'kick' && c.weapon !== 'kick' && <button type="button" className="light" onClick={() => suggest('改用腿技')}>改用腿技</button>}
        {c.weapon !== 'fist' && <button type="button" className="light" onClick={() => suggest('收起武器')}>改為徒手</button>}
        {forges[c.place] && <button type="button" className="light" onClick={() => suggest('強化武器')}>強化武器</button>}
      </div>
    </Card>
    <Card title="物品" meta={items.reduce((sum, [, count]) => sum + count, 0) + ' 件'}>
      {groups.map(group => {
        const inside = items.filter(([item]) => groupOf(item) === group)
        return inside.length > 0 && <div key={group} className="item-group">
          <h4>{group}</h4>
          <ul className="items">{inside.map(([item, count]) => {
            const action = use(item)
            return <li key={item} data-wide={slipValue(item) > 0 || undefined} title={special(item)?.text}>
              <span><strong>{item}</strong> <b>× {count}</b></span>
              {action && <button type="button" className="link" disabled={busy} onClick={() => suggest(action[1])}>{action[0]}</button>}
            </li>
          })}</ul>
        </div>
      })}
      {!items.length && <p className="hint">背包是空的。</p>}
      {party(world).some(m => m.id !== player && m.character!.place === c.place) &&
        <p className="hint">同地的隊友可以轉交物品或貝里，例如「把繃帶交給隊友名字」或「給隊友名字 100 貝里」。</p>}
    </Card>
  </>
}

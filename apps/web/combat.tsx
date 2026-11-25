import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { Message } from '../../packages/shared/protocol.ts'
import { tierNames } from '../../packages/world/foes.ts'
import type { Character } from '../../packages/world/village.ts'
import { selfMade } from '../../packages/world/village.ts'
import type { View } from './network.ts'
import { Field } from './lobby.tsx'

type Combat = NonNullable<View['world']['combat']>
const styleLabels = { special: '基礎特殊招式・3 STA', advanced: '進階招式・5 STA', flurry: '連續攻擊・7 STA' }

/** The fight in progress: who is left standing and one-click commands for this round. */
export function CombatPanel({ combat, guns, character, player, suggest }: {
  combat: Combat, /** Cannons the ship can fire this round (0 on land). */ guns: number, character: Character, player: string, suggest: (command: string) => void,
}) {
  const title = useId()
  const standing = combat.foes.filter(foe => !foe.down && !foe.surrendered)
  const target = standing[0]?.name ?? ''
  const locked = combat.locked.includes(player)
  return <section className="panel combat-panel" aria-labelledby={title}>
    <div className="section-head">
      <h2 id={title}>{combat.atSea ? '海上戰鬥' : '戰鬥'} · 第 {combat.round} 回合</h2>
      <span>{combat.locked.length}／{combat.participants.length} 已鎖定</span>
    </div>
    <ul className="foe-list" aria-label="對手">
      {combat.foes.map(foe => <li key={foe.id} data-down={foe.down || foe.surrendered}>
        <strong>{foe.name}</strong>
        <span className="hint">{tierNames[foe.tier]}{foe.logia ? (foe.exposed ? ' · 自然系（現形中，剩 ' + foe.exposed + ' 回合）' : ' · 自然系') : ''}{foe.bounty ? ' · 懸賞 ' + foe.bounty.toLocaleString('en-US') : ''}</span>
        <meter min={0} max={foe.maxHp} value={foe.hp} aria-label={foe.name + ' HP'}/>
        <span>{foe.down ? '倒下' : foe.surrendered ? '收手' : 'HP ' + foe.hp + '／' + foe.maxHp}</span>
      </li>)}
    </ul>
    <p className="hint" role="status">{combat.waitingForConnection ? '等待離線的參戰者重連。'
      : locked ? '你已鎖定這回合的行動，等待其他參戰者。'
      : '你的 STA ' + character.sta + '。所有參戰者鎖定後同時結算。'}</p>
    {!locked && <div className="button-row">
      {standing.map(foe => <button key={foe.id} type="button" className="light" onClick={() => suggest('攻擊' + foe.name)}>攻擊{foe.name}</button>)}
      <button type="button" className="light" disabled={character.sta < 2} onClick={() => suggest('強力攻擊 ' + target)}>強力攻擊（2 STA）</button>
      <button type="button" className="light" disabled={character.sta < 7} onClick={() => suggest('連續攻擊 ' + target)}>連續攻擊（7 STA）</button>
      {character.techniques.map(move => <button key={move.name} type="button" className="light"
        onClick={() => suggest('用「' + move.name + '」攻擊 ' + target)}>「{move.name}」</button>)}
      {guns > 0 && <button type="button" className="light" onClick={() => suggest('對' + target + '開砲')}>開砲（{guns} 門）</button>}
      <button type="button" className="light" onClick={() => suggest('防守')}>防守</button>
      {!!character.inventory['繃帶'] && <button type="button" className="light" onClick={() => suggest('使用繃帶')}>使用繃帶</button>}
      {character.weapon === 'musket' && !character.loaded && <button type="button" className="light" onClick={() => suggest('裝填')}>裝填</button>}
      {standing.length > 0 && <button type="button" className="light" onClick={() => suggest('和' + target + '交涉')}>交涉</button>}
      <button type="button" className="light" onClick={() => suggest('撤退')}>{combat.atSea ? '甩開對手' : '撤退'}</button>
    </div>}
  </section>
}

/** Self-made techniques (spec §7.6): only a name and a cost tier; a flashy name adds no damage. */
export function Techniques({ character, post, disabled }: { character: Character, post: (msg: Message) => void, disabled: boolean }) {
  const [name, setName] = useState('')
  const [style, setStyle] = useState<'special' | 'advanced' | 'flurry'>('special')
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return
    post({ kind: 'technique', name: name.trim(), style })
    setName('')
  }
  return <details><summary>招式（{character.techniques.filter(selfMade).length}／6）</summary>
    {character.techniques.length > 0 && <ul>{character.techniques.map(move =>
      <li key={move.name}>「{move.name}」· {styleLabels[move.style]}</li>)}</ul>}
    <p className="hint">自創招式只決定名稱與等級；傷害和命中由等級與武器決定，華麗的名字不會讓它更強。</p>
    {character.techniques.filter(selfMade).length < 6 && <form onSubmit={create}>
      <Field label="招式名稱"><input maxLength={12} value={name} onChange={e => setName(e.target.value)} required/></Field>
      <Field label="招式等級"><select value={style} onChange={e => setStyle(e.target.value as typeof style)}>
        {Object.entries(styleLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></Field>
      <button type="submit" className="light" disabled={disabled}>建立招式</button>
    </form>}
  </details>
}

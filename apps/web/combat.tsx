import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { Message } from '../../packages/shared/protocol.ts'
import { tierNames } from '../../packages/world/foes.ts'
import type { Character, Technique, TechniqueEffect } from '../../packages/world/village.ts'
import { effectLabels, selfMade, techniqueEffects } from '../../packages/world/village.ts'
import type { View } from './network.ts'
import { Field } from './lobby.tsx'
import { Card, More } from './side.tsx'

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
        <span className="hint">{tierNames[foe.tier]}{foe.logia ? (foe.exposed ? ' · 自然系（現形中，剩 ' + foe.exposed + ' 回合）' : ' · 自然系') : ''}{foe.breached ? ' · 破甲（剩 ' + foe.breached + ' 回合）' : ''}{foe.bounty ? ' · 懸賞 ' + foe.bounty.toLocaleString('en-US') : ''}</span>
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
      {character.haki?.conqueror && <button type="button" className="light" disabled={character.sta < 10} onClick={() => suggest('霸王色')}>霸王色（10 STA）</button>}
      <button type="button" className="light" onClick={() => suggest('防守')}>防守</button>
      {!!character.inventory['繃帶'] && <button type="button" className="light" onClick={() => suggest('使用繃帶')}>使用繃帶</button>}
      {standing.length > 0 && <button type="button" className="light" onClick={() => suggest('和' + target + '交涉')}>交涉</button>}
      <button type="button" className="light" onClick={() => suggest('撤退')}>{combat.atSea ? '甩開對手' : '撤退'}</button>
    </div>}
  </section>
}

/** What each effect does, in the player's words (rules: packages/rules/combat.ts effectRules). */
const effectHints: Record<'' | TechniqueEffect, string> = {
  '': '單體：打一名對手，等級的加成全拿。',
  sweep: '橫掃：每名站著的對手各打一次；命中 −2，等級的傷害加成不算。不能搭配連續攻擊。',
  breach: '破甲：傷害 −2；打中後對手防禦 −2，直到下一回合結束，全隊受益。',
}

/** Self-made techniques (spec §7.6): a name, a cost tier and an effect; a flashy name adds no damage. */
export function Techniques({ character, post, disabled }: { character: Character, post: (msg: Message) => void, disabled: boolean }) {
  const [name, setName] = useState('')
  const [style, setStyle] = useState<'special' | 'advanced' | 'flurry'>('special')
  const [effect, setEffect] = useState<'' | TechniqueEffect>('')
  const [forgetting, setForgetting] = useState<string>()
  const clash = effect === 'sweep' && style === 'flurry'
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || clash) return
    post({ kind: 'technique', name: name.trim(), style, ...effect && { effect } })
    setName('')
  }
  const own = character.techniques.filter(selfMade)
  const granted = character.techniques.filter(move => move.innate)
  const label = (move: Technique) => styleLabels[move.style] + (move.effect ? '・' + effectLabels[move.effect] : '')
  return <>
    {granted.length > 0 && <Card title="天生招式"><ul className="moves">{granted.map(move =>
      <li key={move.name}><strong>{move.name}</strong><small>{label(move)}</small></li>)}</ul></Card>}
    <Card title="自創招式" meta={own.length + '／6'}>
      {own.length > 0 ? <ul className="moves">{own.map(move => <li key={move.name}>
        <strong>{move.name}</strong><small>{label(move)}</small>
        <button type="button" className="light forget" disabled={disabled}
          onClick={() => forgetting === move.name ? (post({ kind: 'forgetTechnique', name: move.name }), setForgetting(undefined)) : setForgetting(move.name)}>
          {forgetting === move.name ? '確定刪除' : '刪除'}</button>
      </li>)}</ul> : <p className="hint">還沒有自創招式。</p>}
      {own.length < 6 && <More label="自創新招式" open={!own.length}><form onSubmit={create}>
        <Field label="招式名稱"><input maxLength={12} value={name} onChange={e => setName(e.target.value)} required/></Field>
        <Field label="招式等級"><select value={style} onChange={e => setStyle(e.target.value as typeof style)}>
          {Object.entries(styleLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select></Field>
        <Field label="招式效果"><select value={effect} onChange={e => setEffect(e.target.value as typeof effect)}>
          <option value="">單體</option>
          {techniqueEffects.map(id => <option key={id} value={id} disabled={id === 'sweep' && style === 'flurry'}>{effectLabels[id]}</option>)}
        </select></Field>
        <p className="hint">{clash ? '橫掃不能搭配連續攻擊，請換一個等級或效果。' : effectHints[effect]}</p>
        <button type="submit" className="light" disabled={disabled || clash}>建立招式</button>
      </form></More>}
      <p className="hint">自創招式只決定名稱、等級與效果；傷害和命中由等級與武器決定，華麗的名字不會讓它更強。</p>
    </Card>
  </>
}

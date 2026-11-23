import { useState } from 'react'
import type { FormEvent } from 'react'
import { attributeLabels, attributes, characterInput, races, skills, weapons } from '../../packages/shared/protocol.ts'
import type { CharacterInput, Message, Race, Weapon } from '../../packages/shared/protocol.ts'
import { fightingStyles, fightingSummary } from '../../packages/world/village.ts'
import { skillUses } from '../../packages/world/skills.ts'
import { raceSummary } from '../../packages/world/races.ts'
import type { View } from './network.ts'

export function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>
}

const life = ['航海', '醫術', '工藝', '採集', '烹飪'] as const
const defaults = { STR: 3, AGI: 3, CON: 3, PER: 3, INT: 3, WIL: 3 }

function CharacterForm({ initial, submit }: { initial?: CharacterInput, submit: (data: CharacterInput) => Promise<void> }) {
  const [stats, setStats] = useState(initial?.stats ?? defaults)
  const [race, setRace] = useState<Race>(initial?.race ?? '人類')
  const [fighting, setFighting] = useState<Weapon>(initial?.fighting ?? 'sword')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const total = Object.values(stats).reduce((a, b) => a + b, 0)
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = {
      name: form.get('name'), race, fighting,
      stats, major: form.get('major'),
      basics: [form.get('basic1'), form.get('basic2')], life: form.get('life'),
    }
    const validated = characterInput.safeParse(payload)
    if (!validated.success) return setError(validated.error.issues[0].message)
    setBusy(true)
    try {
      setError('')
      await submit(validated.data)
      setError('角色已存檔。請在名冊區確認背景並準備。')
    } catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }
  return <form className="panel" onSubmit={save}>
    <h2>角色卡</h2>
    <div className="form-grid">
      <Field label="角色姓名"><input name="name" maxLength={24} required defaultValue={initial?.name}/></Field>
      <div>
        <Field label="種族"><select value={race} onChange={e => setRace(e.target.value as Race)}>
          {races.map(item => <option key={item}>{item}</option>)}
        </select></Field>
        <p className="hint race-note">{raceSummary(race)}{race === '巨人' ? '。巨人角色需要房主核准。' : ''}</p>
      </div>
      <div>
        <Field label="攻擊方式"><select value={fighting} onChange={e => setFighting(e.target.value as Weapon)}>
          {weapons.map(item => <option key={item} value={item}>{fightingStyles[item].label}</option>)}
        </select></Field>
        <p className="hint race-note">{fightingSummary(fighting)}</p>
      </div>
    </div>
    <fieldset><legend>六項屬性 · 已分配 {total}／18</legend>
      <p className="hint">每項 2～4 點，合計 18 點。</p>
      <div className="stat-grid">{attributes.map(key =>
        <Field label={attributeLabels[key]} key={key}><select value={stats[key]} onChange={e => setStats({ ...stats, [key]: Number(e.target.value) })}>
          {[2, 3, 4].map(value => <option key={value}>{value}</option>)}
        </select></Field>)}</div>
    </fieldset>
    <fieldset><legend>初始技能</legend>
      <div className="form-grid">
        {([
          ['major', '主要專長 ＋2', initial?.major ?? '劍術', skills],
          ['basic1', '基礎技能一 ＋1', initial?.basics[0] ?? '觀察', skills],
          ['basic2', '基礎技能二 ＋1', initial?.basics[1] ?? '閃避', skills],
          ['life', '生活技能 ＋1', initial?.life ?? '工藝', life],
        ] as const).map(([name, label, value, options]) =>
          <Field key={name} label={label}><select name={name} defaultValue={value}>{options.map(skill => <option key={skill}>{skill}</option>)}</select></Field>)}
      </div>
      <details className="skill-guide"><summary>每個技能的用途</summary>
        <ul className="skill-list">{skills.map(skill => <li key={skill}><strong>{skill}</strong><span>{skillUses[skill]}</span></li>)}</ul>
        <p className="hint">升級時每級得到 1 個技能點，可以再提升任何技能。</p>
      </details>
    </fieldset>
    {error && <p className="notice" role="status">{error}</p>}
    <button type="submit" disabled={busy || total !== 18}>{busy ? '存檔中' : '儲存角色'}</button>
  </form>
}

export function Lobby({ view, send, start, review, busy }: {
  view: View, send: (msg: Message) => Promise<void>, start?: () => void,
  review?: (id: string, approved: boolean) => void, busy: boolean,
}) {
  const me = view.world.members.find(m => m.id === view.player)!
  const [confirm, setConfirm] = useState(me.agree)
  const [editing, setEditing] = useState(!me.character)
  return <div className="lobby-grid">
    <section className="panel manifest">
      <div className="section-head"><h2>出發名冊</h2><span>{view.world.members.length}／4 人</span></div>
      <ul className="roster">
        {view.world.members.map(m => <li key={m.id}>
          <div><strong>{m.character?.name ?? '未創角'}</strong> <small>{m.host ? '房主' : ''}{m.id === me.id ? ' · 你' : ''}</small>
            <div className="hint">{!m.connected ? '離線' : !m.character ? '創角中' : !m.approved ? '等待角色審核' : m.ready ? '已準備' : '未準備'}</div>
          </div>
          {review && m.character && !m.approved && <button className="light" onClick={() => review(m.id, true)}>核准</button>}
        </li>)}
      </ul>
      <p className="hint">你們原本就是朋友。其他共同行動或私交由當事人同意後決定。</p>
      <label className="check"><input type="checkbox" checked={confirm} disabled={me.ready} onChange={e => setConfirm(e.target.checked)}/> 我確認這段共同背景</label>
      <div className="button-row">
        <button className="light" disabled={busy || (!me.ready && (!me.approved || !confirm))} onClick={() => void send({ kind: 'ready', ready: !me.ready, agree: confirm }).catch(() => {})}>
          {me.ready ? '取消準備' : '我已準備'}
        </button>
        {start && <button disabled={!view.canStart || busy} onClick={start}>開始遊戲</button>}
      </div>
      {start && !view.canStart && <p className="hint">{view.ai.state !== 'passed' ? '開啟上方「AI 連線設定」，按「測試連線並生成回覆」通過後即可開局。' : '目前加入的玩家都須在線、完成創角並準備。'}</p>}
    </section>
    {editing
      ? <CharacterForm initial={me.character} submit={async character => {
        await send({ kind: 'character', character })
        setConfirm(false)
      }}/>
      : <section className="panel"><h2>{me.character?.name}</h2><p>{me.character?.race} · {me.character && fightingStyles[me.character.fighting].label} · {me.character?.major}</p>
        <button className="light" onClick={() => setEditing(true)}>編輯角色卡</button></section>}
  </div>
}

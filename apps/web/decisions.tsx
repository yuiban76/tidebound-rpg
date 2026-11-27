import { useState } from 'react'
import type { Message } from '../../packages/shared/protocol.ts'
import { voteThreshold } from '../../packages/rules/engine.ts'
import { shipName } from '../../packages/world/ships.ts'
import { party } from '../../packages/world/village.ts'
import { timeskipBlock } from '../../packages/rules/timeskip.ts'
import type { View } from './network.ts'
import { Field } from './lobby.tsx'
import { Bar, Card, More } from './side.tsx'

/** What the party has to vote on, and how to put something new to the vote. */
export function DecisionsPanel({ world, player, post, paused }: { world: View['world'], player: string, post: (msg: Message) => void, paused: boolean }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<'ordinary' | 'formCrew' | 'sellShip' | 'timeskip'>('ordinary')
  const crew = party(world)
  const open = world.proposals.filter(p => !p.passed)
  const passed = world.proposals.filter(p => p.passed)
  return <>
    <Card title="團隊決議" meta={(world.crew ? '船團已成立' : '尚未成立船團') + ' · ' + (world.ship ? '主船' + shipName(world.ship) : '尚無主船')}>
      {!open.length && <p className="hint">目前沒有要表決的事。</p>}
      {open.map(p => <div className="proposal" key={p.id}>
        <strong>{p.title}</strong>
        <Bar label="贊成" value={crew.filter(m => p.votes[m.id]).length} max={voteThreshold(crew.length, p.type !== 'ordinary')}/>
        <div className="button-row">
          <button type="button" className="light" aria-pressed={p.votes[player] === true} disabled={paused} onClick={() => post({ kind: 'vote', id: p.id, yes: true })}>贊成</button>
          <button type="button" className="light" aria-pressed={p.votes[player] === false} disabled={paused} onClick={() => post({ kind: 'vote', id: p.id, yes: false })}>反對</button>
        </div>
      </div>)}
      {!timeskipBlock(world as never) && !world.proposals.some(p => p.type === 'timeskip' && !p.passed) && <div className="timeskip">
        <strong>兩年修行</strong>
        <p className="hint">頂上戰爭結束了。全隊同意就出發修行：日曆跳到兩年後，在夏波帝重聚，每個人至少升 5 級、學會武裝色與見聞色霸氣，少數人會覺醒霸王色。新世界的故事從那天開始。</p>
        <button type="button" disabled={paused} onClick={() => post({ kind: 'propose', type: 'timeskip', title: '出發修行兩年' })}>提議出發修行</button>
      </div>}
      <More label="提出新決議" open={!world.crew}>
        <form onSubmit={e => { e.preventDefault(); post({ kind: 'propose', type, title }); setTitle('') }}>
          <Field label="提案類型"><select value={type} onChange={e => setType(e.target.value as typeof type)}>
            <option value="ordinary">一般決議</option><option value="formCrew" disabled={world.crew}>成立船團</option>
            <option value="sellShip" disabled={!world.ship}>出售主船</option>
            <option value="timeskip" disabled={!!timeskipBlock(world as never)}>出發修行兩年</option>
          </select></Field>
          <Field label="提案名稱"><input required maxLength={60} value={title} onChange={e => setTitle(e.target.value)}/></Field>
          <button type="submit" className="light" disabled={paused}>提出決議</button>
        </form>
      </More>
      {passed.length > 0 && <More label={'已通過的 ' + passed.length + ' 項決議'}>
        <ul className="passed">{passed.map(p => <li key={p.id}>{p.title}</li>)}</ul></More>}
    </Card>
  </>
}

import { attributes, attributeLabels, hakiSkills, skills } from '../../packages/shared/protocol.ts'
import type { Message } from '../../packages/shared/protocol.ts'
import { xpToNext } from '../../packages/rules/engine.ts'
import { beli } from '../../packages/world/scale.ts'
import { islandAt } from '../../packages/world/sea.ts'
import { raceSummary, stat } from '../../packages/world/races.ts'
import { skillCap, skillUses } from '../../packages/world/skills.ts'
import { fightingStyles, fightingSummary, selfMade } from '../../packages/world/village.ts'
import { Techniques } from './combat.tsx'
import { conquerorSta } from '../../packages/rules/combat.ts'
import { FruitPanel } from './fruit.tsx'
import { PortraitPicker } from './portrait.tsx'
import type { View } from './network.ts'
import { Bar, Card, meIn, More, Pill, Segments, Tiles, useSegment } from './side.tsx'
import type { PanelProps } from './side.tsx'

const hakiUses = { 武裝色: '攻擊打得到自然系，每級傷害 +1；每兩級防禦 +1', 見聞色: '讀出對手的攻擊：每級防禦約 +0.5' }

/** Who the player is on top; abilities and moves on two pages below. Points to spend show up right where they go. */
export function CharacterPanel({ view, world, player, suggest, send, post, paused }: PanelProps & { view: View, send: (msg: Message) => Promise<unknown>, post: (msg: Message) => void, paused: boolean }) {
  const [page, setPage] = useSegment<'skills' | 'moves'>('me', 'skills')
  const c = meIn(world, player)
  const locked = paused || !!world.combat?.participants.includes(player)
  const cap = skillCap(c.level)
  const points = c.skillPoints ?? 0
  const offers = (world.fruitOffers ?? []).filter(offer => offer.to === player).length
  const known = skills.filter(skill => c.skillRanks[skill])
  const unknown = skills.filter(skill => !c.skillRanks[skill])
  const skillRow = (skill: typeof skills[number]) => <li key={skill}>
    <span className="rank">{c.skillRanks[skill] ?? 0}</span>
    <span className="skill-text"><strong>{skill}</strong><small>{skillUses[skill]}</small></span>
    {points > 0 && <button type="button" className="plus" aria-label={skill + ' ' + (c.skillRanks[skill] ?? 0) + ' ＋1'} disabled={locked || (c.skillRanks[skill] ?? 0) >= cap}
      onClick={() => post({ kind: 'train', skill })}>＋</button>}
  </li>
  return <>
    <section className="card profile" aria-label="角色資料">
      <div className="profile-head">
        <PortraitPicker view={view} name={c.name} send={send}/>
        <div><h3>{c.name}</h3><p className="hint">{c.race} · {fightingStyles[c.fighting].label}</p></div>
        <span className="level"><small>等級</small>{c.level}</span>
      </div>
      <Bar label="XP" value={c.xp} max={xpToNext(c.level)} tone="gold"/>
      <Tiles items={[['懸賞金', <span title={beli(c.bounty)}>{c.bounty.toLocaleString('en-US')}</span>],
        ['海軍注意度', (world.renown?.marineHeat ?? 0) + '／100'], ['本島聲望', world.renown?.islandRep[islandAt(c.place)] ?? 0]]}/>
      <More label="種族與攻擊方式">
        <dl className="notes">
          <div><dt>{c.race}</dt><dd>{raceSummary(c.race)}</dd></div>
          <div><dt>{fightingStyles[c.fighting].label}</dt><dd>{fightingSummary(c.fighting)}</dd></div>
        </dl>
      </More>
    </section>
    <Segments label="角色內容" value={page} onPick={setPage} options={[['skills', '能力', c.unspent + points],
      ['moves', '招式（' + c.techniques.filter(selfMade).length + '／6）', offers]]}/>
    {page === 'skills' ? <>
      <Card title="屬性" meta={c.unspent > 0 && <Pill tone="gold">可分配 {c.unspent} 點</Pill>}>
        <ul className="stats">{attributes.map(k => {
          const total = stat(c, k)
          const bonus = total - c.stats[k]
          return <li key={k}>
            <span>{attributeLabels[k]}</span>
            <strong>{total}{bonus !== 0 && <small title="種族與防具的影響">{bonus > 0 ? '+' + bonus : '−' + -bonus}</small>}</strong>
            {c.unspent > 0 && <button type="button" className="plus" aria-label={attributeLabels[k] + ' ' + c.stats[k] + ' ＋1'} disabled={locked}
              onClick={() => post({ kind: 'allocate', attr: k })}>＋</button>}
          </li>
        })}</ul>
      </Card>
      {c.haki?.trained && <Card title="霸氣" meta={c.haki.conqueror && <Pill tone="gold">霸王色</Pill>}>
        <ul className="skills">{hakiSkills.map(skill => <li key={skill}>
          <span className="rank">{c.skillRanks[skill] ?? 0}</span>
          <span className="skill-text"><strong>{skill}</strong><small>{hakiUses[skill]}</small></span>
          {points > 0 && <button type="button" className="plus" aria-label={skill + ' ' + (c.skillRanks[skill] ?? 0) + ' ＋1'} disabled={locked || (c.skillRanks[skill] ?? 0) >= cap}
            onClick={() => post({ kind: 'train', skill })}>＋</button>}
        </li>)}</ul>
        {c.haki.conqueror && <p className="hint">霸王色：戰鬥中一場一次（{conquerorSta} STA），雜兵當場昏倒，軍官級以下沒有霸氣的對手這回合無法出手。</p>}
      </Card>}
      <Card title="技能" meta={<>{points > 0 && <Pill tone="gold">可分配 {points} 點</Pill>}上限 {cap}</>}>
        {known.length > 0 && <ul className="skills">{known.map(skillRow)}</ul>}
        {unknown.length > 0 && <More key={points > 0 ? 'open' : 'closed'} label={'還沒學的 ' + unknown.length + ' 項'} open={points > 0}>
          <ul className="skills">{unknown.map(skillRow)}</ul>
        </More>}
      </Card>
    </> : <>
      <FruitPanel world={world} player={player} suggest={suggest}/>
      <Techniques character={c} post={post} disabled={paused}/>
    </>}
  </>
}

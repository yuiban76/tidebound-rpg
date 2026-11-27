import assert from 'node:assert/strict'
import { test } from 'node:test'
import { npcs } from '../packages/shared/protocol.ts'
import type { NpcId } from '../packages/shared/protocol.ts'
import { advanceTimeline } from '../packages/world/timeline.ts'
import { newWorld, npcRole, npcsAt } from '../packages/world/village.ts'
import { groupPeople } from '../apps/web/people.ts'

const at = (day: number, hour: number) => (day - 1) * 1440 + hour * 60
function crowd(place: Parameters<typeof npcsAt>[1], minute: number, mates: NpcId[] = []) {
  const world = newWorld('PEOPLE0001', 'host')
  world.started = true
  world.minute = minute
  advanceTimeline(world)
  return groupPeople(npcsAt(world, place).map(npc => ({ npc, name: npcs[npc], role: npcRole(world, npc), mate: mates.includes(npc) })))
}

test('頂上戰爭的海灣：白鬍子海賊團自成一組，其他人依陣營分組，行商排最後', () => {
  const groups = crowd('marinefordBay', at(72, 14))
  const labels = groups.map(group => group.label)
  assert.equal(labels[0], '白鬍子海賊團')
  assert.ok(groups[0].people.length >= 10)
  assert.ok(labels.includes('海軍'))
  assert.ok(labels.includes('七武海・霸主'))
  assert.equal(labels.at(-1), '行商')
  // Nobody is lost or listed twice.
  const all = groups.flatMap(group => group.people.map(p => p.npc))
  assert.equal(new Set(all).size, all.length)
})

test('同行夥伴永遠排第一組；只有一人在場的海賊團併入陣營', () => {
  const groups = crowd('marinefordBay', at(72, 14), ['koby'])
  assert.equal(groups[0].label, '同行夥伴')
  assert.deepEqual(groups[0].people.map(p => p.npc), ['koby'])
  assert.ok(!groups.some(group => group.label === '九蛇海賊團'))
})

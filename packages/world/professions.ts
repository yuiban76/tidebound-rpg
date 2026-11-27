// What each character does aboard: the job on the character card. It replaces the old free choice of starting skills.
// The attack method still brings its own weapon skill (rank 2); the job adds three more ranks, some gear, and one thing
// the whole crew feels. The perks are rules, applied where those rules live (rest, voyages, the ship, quests, combat).
import type { Profession, Skill, Weapon } from '../shared/protocol.ts'

export type ProfessionInfo = {
  label: string
  /** Who in the original story does this job, to give the choice a face. */
  like: string
  skills: Partial<Record<Skill, number>>
  kit?: Record<string, number>
  /** One line for the character card: what the crew gets from you. */
  perk: string
}

export const professions: Record<Profession, ProfessionInfo> = {
  fighter: { label: '戰鬥員', like: '索隆', skills: { 閃避: 2, 觀察: 1 }, perk: '專門打架的人：戰鬥中防禦 +1。' },
  navigator: { label: '航海士', like: '娜美', skills: { 航海: 2, 觀察: 1 }, perk: '看得懂天候和海流：隊伍裡有航海士，航行遇上麻煩的機會降低（像多一級瞭望台）。' },
  doctor: { label: '船醫', like: '喬巴', skills: { 醫術: 2, 觀察: 1 }, kit: { 繃帶: 2, 醫療工具: 1 }, perk: '在同一個地方睡覺的全隊多回復 HP；開局多帶繃帶和醫療工具。' },
  cook: { label: '廚師', like: '香吉士', skills: { 烹飪: 2, 閃避: 1 }, kit: { 帶骨肉: 2 }, perk: '休息、睡覺時替全隊做飯，同地的人多回復 STA 與 HP；開局帶兩塊帶骨肉。' },
  shipwright: { label: '船匠', like: '佛朗基', skills: { 工藝: 2, 採集: 1 }, perk: '和船匠夥伴一樣：改裝船隻便宜兩成，修船多修 15。' },
  sniper: { label: '狙擊手', like: '騙人布', skills: { 射擊: 1, 觀察: 2 }, kit: { 火槍彈藥: 5 }, perk: '眼睛好、手很穩：射擊和觀察開局就有底子，多帶 5 發火槍彈藥。' },
  archaeologist: { label: '考古學家', like: '妮可・羅賓', skills: { 觀察: 2, 說服: 1 }, perk: '找得到別人看漏的線索：島上委託的搜索判定 +2。' },
  musician: { label: '音樂家', like: '布魯克', skills: { 說服: 2, 閃避: 1 }, perk: '休息、睡覺時為全隊演奏，同地的人多回復 STA。' },
}

/** The skill the attack method trains from the start. */
export const weaponSkill: Record<Weapon, Skill> = { fist: '格鬥', kick: '格鬥', sword: '劍術', spear: '長兵器', staff: '長兵器', heavy: '格鬥', musket: '射擊', sling: '射擊', bow: '射擊' }

/** Starting skill ranks: the attack method's skill at 2, plus the job's. */
export function startingSkills(fighting: Weapon, profession: Profession) {
  const ranks: Record<string, number> = { [weaponSkill[fighting]]: 2 }
  for (const [skill, rank] of Object.entries(professions[profession].skills)) ranks[skill] = (ranks[skill] ?? 0) + rank!
  return ranks
}

/** Characters made before jobs existed: the job that best matches the skill they put first. */
export function professionFrom(major: string | undefined): Profession {
  return ({ 醫術: 'doctor', 航海: 'navigator', 烹飪: 'cook', 工藝: 'shipwright', 射擊: 'sniper', 觀察: 'archaeologist', 說服: 'musician' } as Record<string, Profession>)[major ?? ''] ?? 'fighter'
}

/** Someone in the party with this job, standing on the spot when `place` is given. */
export function withJob<C extends { profession?: Profession, place: string, hp: number, name: string }>(
  members: { character?: C | null, pendingJoin?: boolean }[], job: Profession, place?: string,
) {
  return members.map(m => m.character).find(c => c && c.profession === job && c.hp > 0 && (!place || c.place === place)) ?? undefined
}

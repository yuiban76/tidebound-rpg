// The dice animation reads its numbers out of the rules' own result text.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { diceIn } from '../packages/shared/dice.ts'

const one = (text: string) => {
  const rolls = diceIn(text)
  assert.equal(rolls.length, 1, text)
  const { label, natural, total, target, success } = rolls[0]
  return [label, natural, total, target, success]
}

test('判定、自由行動、目標、採集、招募都讀得出骰子和成敗', () => {
  assert.deepEqual(one('觀察 D20 14，合計 17／10，成功。'), ['觀察', 14, 17, 10, true])
  assert.deepEqual(one('潛行 D20 3，合計 5／12，未成功。'), ['潛行', 3, 5, 12, false])
  assert.deepEqual(one('自由行動判定（敏捷・閃避）D20 20，合計 21／25，成功。'), ['敏捷・閃避', 20, 21, 25, true])
  assert.deepEqual(one('說服正門的巨人：D20 16，合計 19／16。你說出了名字。'), ['說服正門的巨人', 16, 19, 16, true])
  assert.deepEqual(one('疏散後街的居民：D20 7，合計 11／14（札姆巴在旁 +1）。居民不肯走。還有時間就再試一次。'), ['疏散後街的居民', 7, 11, 14, false])
  assert.deepEqual(one('替梅利號做最後的整修：D20 15，合計 16／16。大家說修理成功，可惜前一次失敗了。'), ['替梅利號做最後的整修', 15, 16, 16, true])
  assert.deepEqual(one('採集 D20 1，合計 13／12，沒找到能用的東西。'), ['採集', 1, 13, 12, false])
  assert.deepEqual(one('說服 D20 12，合計 18／15（對方信任你們 +4）。\n騙人布說：「成功！」'), ['說服', 12, 18, 15, true])
  assert.deepEqual(one('判定 D20 9，合計 12／11。你找到了帳冊。回惡龍樂園交付。'), ['判定', 9, 12, 11, true])
})

test('航行的骰子沒有成敗；甩開對手和大浪有', () => {
  assert.deepEqual(one('「黎明號」從黎明島出航，以穩健航行 15 海里。航海 D20 10＋3＝13，越過平穩海面，耗時 2 小時。'), ['航海', 10, 13, undefined, undefined])
  assert.deepEqual(one('全速甩開對手：航海 D20 12＋4＝16／13，成功脫離！'), ['航海', 12, 16, 13, true])
  assert.deepEqual(one('亞誇・拉格娜的巨浪迎面壓下：航海 D20 2，合計 5／14，車廂被砸得變形，每個人都受了傷。'), ['航海', 2, 5, 14, false])
})

test('戰鬥一回合的每顆骰子都標出誰打誰', () => {
  const round = [
    '第 1 回合',
    '阿浪對幼年海王類使出強力攻擊，D20 13，合計 23／15，傷害 210（武器骰 6，數值×10）。幼年海王類 HP 140／350。',
    '小川對幼年海王類開砲，D20 4，合計 9／15，砲彈落在海裡。',
    '索隆使出三刀流攻擊幼年海王類，D20 18，合計 27／15，傷害 90。幼年海王類 HP 50／350。',
    '幼年海王類反擊阿浪，D20 1，合計 6／19，未命中。',
    '阿浪勸海軍士兵住手：說服 D20 15，合計 18／13，海軍士兵收手了。',
  ].join('\n')
  assert.deepEqual(diceIn(round).map(roll => roll.blow), ['ours', 'ours', 'ours', 'foe', undefined])
  assert.deepEqual(diceIn(round).map(roll => [roll.label, roll.natural, roll.success]), [
    ['阿浪 → 幼年海王類', 13, true], ['小川 → 幼年海王類', 4, false], ['索隆 → 幼年海王類', 18, true],
    ['幼年海王類 → 阿浪', 1, false], ['阿浪 → 海軍士兵', 15, true],
  ])
})

test('沒有骰子的結果不會有動畫', () => {
  assert.deepEqual(diceIn('你抵達風車村港口。'), [])
  assert.deepEqual(diceIn('價格 D20 99 貝里'), [])
})

test('規則裡每一種 D20 的寫法都是「D20 數字」，動畫才讀得到', () => {
  for (const dir of ['packages/rules', 'packages/world']) for (const file of readdirSync(dir).filter(name => name.endsWith('.ts') && name !== 'strikes.ts'))
    for (const line of readFileSync(dir + '/' + file, 'utf8').split('\n')) {
      if (!line.includes("D20") || /^\s*(?:\/\/|\*|\/\*)/.test(line)) continue
      assert.match(line, /D20 ' \+ |\/\*\*|\/\//, file + '：' + line.trim().slice(0, 100))
    }
})

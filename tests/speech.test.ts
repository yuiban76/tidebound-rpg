// The storyteller: what is read aloud, sentence by sentence, and in whose voice.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { npcs } from '../packages/shared/protocol.ts'
import { linesOf, sentences, soundOf, speakable, speakerNames, spokenIn } from '../packages/shared/speech.ts'

const names = speakerNames(['阿浪'])
const read = (text: string, writing = false) => linesOf(text, names, writing).map(line => line.who ? [line.who, line.text] : line.text)

test('斷句：一句一句，太長的在逗號切開，問號驚嘆號連在一起不拆', () => {
  assert.deepEqual(sentences('海風很大。你看見一艘船！真的嗎？！走吧'), { done: ['海風很大。', '你看見一艘船！', '真的嗎？！'], open: '走吧' })
  const long = sentences('浪花拍打著船身，'.repeat(30) + '終於停了。')
  assert.ok(long.done.length > 2 && long.done.every(line => line.length <= 100))
  assert.deepEqual(sentences('。。。！\n——'), { done: [], open: '——' })
})

test('符號變成停頓：公告標籤、千分位、括號、間隔號、Markdown', () => {
  assert.equal(speakable('【報紙】謝爾茲鎮・上校倒下：懸賞 1,000,000 貝里。'), '報紙。謝爾茲鎮 上校倒下：懸賞 1000000 貝里。')
  assert.equal(speakable('**快走**（小聲）。'), '快走 ，小聲。')
  assert.doesNotMatch(speakable('A／B → C'), /[／→]/)
})

test('旁白和台詞分開，台詞知道是誰說的', () => {
  assert.deepEqual(read('海風吹過港口。瑪琪諾說：「今天魯夫出海了。你們呢？」她擦了擦杯子。'),
    ['海風吹過港口。', '瑪琪諾說。', ['瑪琪諾', '今天魯夫出海了。'], ['瑪琪諾', '你們呢？'], '她擦了擦杯子。'])
  assert.deepEqual(read('「別擋路！」索隆低聲說。'), [['索隆', '別擋路！'], '索隆低聲說。'])
  // A short name stands for the full one, and the same speaker goes on after a short beat.
  assert.deepEqual(read('羅賓笑了笑，說：「歷史不會說謊。」她頓了頓，「但人會。」'),
    ['羅賓笑了笑，說。', ['妮可・羅賓', '歷史不會說謊。'], '她頓了頓，', ['妮可・羅賓', '但人會。']])
  // Nobody is named: the words are still speech, in the narrator's voice.
  assert.deepEqual(linesOf('人群裡有人大喊：「海賊來了！」', names).map(line => [line.who, line.text]), [[undefined, '人群裡有人大喊。'], [undefined, '海賊來了！']])
  // A longer name is never mistaken for a shorter one inside it.
  assert.deepEqual(read('桑達索尼亞說：「你們是誰？」')[1], ['桑達索尼亞', '你們是誰？'])
})

test('招式名、船名這種引號不是台詞', () => {
  assert.deepEqual(read('索隆使出「三刀流」，斬開了浪頭。'), ['索隆使出三刀流，斬開了浪頭。'])
  assert.deepEqual(read('「黎明號」從黎明島出航。'), ['黎明號從黎明島出航。'])
})

test('邊寫邊唸：只唸已經寫完、不會再變的句子', () => {
  assert.deepEqual(read('海風很大。你看見一', true), ['海風很大。'])
  assert.deepEqual(read('海風很大。你看見一', false), ['海風很大。', '你看見一'])
  // A quotation without a name waits: the next words may say who spoke.
  assert.deepEqual(read('他抬起頭。「別擋路！」', true), ['他抬起頭。'])
  assert.deepEqual(read('瑪琪諾說：「今天魯夫出海了。你們', true), ['瑪琪諾說。', ['瑪琪諾', '今天魯夫出海了。']])
  // Streamed NPC replies always carry their closing mark.
  assert.deepEqual(read('瑪琪諾說：「今天魯夫出海了。你們」', true), ['瑪琪諾說。', ['瑪琪諾', '今天魯夫出海了。']])
})

test('逐字收到的旁白，唸出來的句子從頭到尾和完成稿一致', () => {
  for (const text of ['海風吹過港口。瑪琪諾說：「今天魯夫出海了。你們呢？」她擦了擦杯子，又看了一眼「黎明號」的帆。',
    '「別擋路！」索隆低聲說。你退開一步。「走吧。」他說。', '羅賓笑了笑，說：「歷史不會說謊。」她頓了頓，「但人會。」海面安靜下來……真的嗎？！', '瑪琪諾說：「是魯夫喔。」']) {
    const whole = linesOf(text, names)
    for (let i = 1; i <= text.length; i++) {
      const part = linesOf(text.slice(0, i), names, true)
      assert.deepEqual(part, whole.slice(0, part.length), text.slice(0, i))
    }
  }
})

test('正式結果只唸台詞，擲骰和數字留在畫面上', () => {
  assert.deepEqual(spokenIn('觀察 D20 14，合計 17／10，成功。\n你抵達風車村港口。', names), [])
  assert.deepEqual(spokenIn('騙人布說：「包在我身上！」\n（騙人布加入了船團。）', names), [{ text: '騙人布說。' }, { who: '騙人布', text: '包在我身上！' }])
  assert.deepEqual(spokenIn('阿浪對海王類使出「風車斬」，D20 13，合計 23／15，傷害 210。', names), [])
})

test('每個人的聲音固定，音高語速都在能聽的範圍；男女老少不同', () => {
  for (const name of [...Object.values(npcs), '阿浪']) {
    const sound = soundOf(name)
    assert.deepEqual(sound, soundOf(name))
    assert.ok(sound.pitch >= .5 && sound.pitch <= 1.7 && sound.rate >= .8 && sound.rate <= 1.2, name)
  }
  assert.deepEqual([soundOf('娜美').gender, soundOf('索隆').gender, soundOf('阿浪').gender, soundOf('修修').gender], ['female', 'male', undefined, undefined])
  assert.ok(soundOf('喬巴').pitch > soundOf('甚平').pitch)
  assert.ok(soundOf('古蕾娃').rate < soundOf('魯夫').rate)
})

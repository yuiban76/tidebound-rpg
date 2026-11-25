import { expect, test } from '@playwright/test'
import type { Page, BrowserContext } from '@playwright/test'
import type { AddressInfo } from 'node:net'
import { PeerServer } from 'peer'
import { makeHost } from '../apps/host/http.ts'
import { compatibilityFixture } from './fixtures.ts'

let root: string
let fixture: Awaited<ReturnType<typeof compatibilityFixture>>
let shutdown: () => Promise<void>
let hostRef: ReturnType<typeof makeHost>

test.beforeEach(async () => {
  fixture = await compatibilityFixture()
  const host = hostRef = makeHost(':memory:', 'dist', 'test-results')
  await new Promise<void>(ok => host.server.listen(0, '127.0.0.1', ok))
  const signal = await new Promise<Parameters<NonNullable<Parameters<typeof PeerServer>[1]>>[0]>(ok => {
    PeerServer({ host: '127.0.0.1', port: 0, path: '/signal' }, ok)
  })
  root = 'http://127.0.0.1:' + (host.server.address() as AddressInfo).port + '/?signal=' +
    encodeURIComponent('http://127.0.0.1:' + (signal.address() as AddressInfo).port + '/signal')
  shutdown = async () => {
    host.game.stop()
    host.store.db.close()
    signal.closeAllConnections()
    signal.close()
    host.server.closeAllConnections()
    host.server.close()
    await fixture.close()
  }
})
test.afterEach(async () => { await shutdown?.() })

/** The host home page shows the AI form first; rooms stay locked until a real generation passes. */
async function connectApi(page: Page, failFirst = false) {
  await page.getByLabel('API Base URL').fill(fixture.baseUrl)
  await page.getByLabel('Model ID').fill('browser-fixture')
  if (failFirst) {
    fixture.fault('auth', 'probe')
    await page.getByRole('button', { name: '測試連線並生成回覆' }).click()
    await expect(page.getByRole('alert')).toContainText('API 拒絕認證')
    await expect(page.getByRole('button', { name: '建立房間' })).toBeDisabled()
    fixture.fault(undefined)
  }
  await page.getByLabel('API Key（選填）').fill('browser-fixture-key')
  await page.getByRole('button', { name: '測試連線並生成回覆' }).click()
  await expect(page.getByText('AI 已連線 · browser-fixture')).toBeVisible()
}

async function create(page: Page, failFirst = false) {
  await page.goto(root)
  await expect(page.getByRole('heading', { name: '房主控制台' })).toBeVisible()
  await expect(page.getByRole('button', { name: '建立房間' })).toBeDisabled()
  await connectApi(page, failFirst)
  await page.getByRole('button', { name: '建立房間' }).click()
  await expect(page.getByRole('heading', { name: '遊戲大廳' })).toBeVisible()
  return (await page.locator('.room-code').innerText()).split(' ')[1]
}

async function fillCharacter(page: Page, name: string) {
  await page.getByLabel('角色姓名').fill(name)
  await page.getByRole('button', { name: '儲存角色' }).click()
  await expect(page.getByText('角色已存檔。', { exact: false })).toBeVisible()
  await page.getByLabel('我確認這段共同背景').check()
  await page.getByRole('button', { name: '我已準備' }).click()
}
async function ready(page: Page, name: string) {
  await fillCharacter(page, name)
  await expect(page.getByRole('button', { name: '取消準備' })).toBeVisible()
}
/** Opens a tab of the info panel: the side tabs on desktop, the screen tabs on a phone. */
async function openTab(page: Page, name: string) {
  await page.locator('[role=tab]:visible', { hasText: name }).first().click()
}
/** A picture of this colour, as noisy as a photo, so its size is a fair test. */
async function photo(page: Page, hue: number) {
  const data = await page.evaluate(hue => {
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 600
    const c = canvas.getContext('2d')!
    for (let x = 0; x < 900; x += 6) for (let y = 0; y < 600; y += 6) {
      c.fillStyle = `hsl(${hue + Math.random() * 40} 70% ${30 + Math.random() * 40}%)`
      c.fillRect(x, y, 6, 6)
    }
    return canvas.toDataURL('image/png').split(',')[1]
  }, hue)
  return { name: 'me.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') }
}
/** Picks a portrait in the dialog behind the round button. */
async function setPortrait(page: Page, hue: number) {
  await page.getByRole('button', { name: '換頭貼' }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('input[type=file]').setInputFiles({ name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('not a picture') })
  await expect(dialog.getByRole('alert')).toContainText('打不開')
  await dialog.locator('input[type=file]').setInputFiles(await photo(page, hue))
  await dialog.getByLabel('縮放').fill('1.5')
  await dialog.getByRole('button', { name: '使用這張' }).click()
  await expect(dialog).toBeHidden()
}
async function action(page: Page, actionText: string, result: string) {
  await page.getByLabel('輸入行動或聊天').fill(actionText)
  await page.getByRole('button', { name: '送出行動' }).click()
  await expect(page.locator('.entry-result').filter({ hasText: result }).last()).toBeVisible()
}

test('地圖在資訊分頁、輸入框不用捲動就看得到，手機也能從地圖帶入指令', async ({ page }, info) => {
  await page.setViewportSize({ width: 1200, height: 920 })
  await create(page)
  await ready(page, '風向')
  await page.getByRole('button', { name: '開始遊戲' }).click()
  const map = page.getByRole('region', { name: '島上地圖' })
  await expect(map).toBeVisible()
  // The world bulletin sits on top of the story and needs no switching.
  const bulletin = (await page.getByRole('region', { name: '世界公告' }).boundingBox())!
  const story = (await page.locator('.windows').boundingBox())!
  expect(bulletin.y).toBeLessThan(story.y)
  // The redesign keeps the action box inside the first screen on desktop.
  const input = (await page.getByLabel('輸入行動或聊天').boundingBox())!
  expect(input.y + input.height).toBeLessThanOrEqual(920)
  await expect(map.locator('[aria-current="location"] strong')).toHaveAttribute('title', '風車村廣場')
  await expect(map.getByRole('button', { name: '風車村港口，可直達' })).toBeVisible()
  await expect(map.getByRole('button', { name: '科爾波山山道，經小路' })).toBeVisible()
  await expect(map.getByRole('button', { name: '哥亞王國城下町，經小路' })).toBeVisible()
  await map.screenshot({ path: info.outputPath('world-map-desktop.png') })

  await page.setViewportSize({ width: 390, height: 844 })
  await openTab(page, '地圖')
  await expect(map).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await map.screenshot({ path: info.outputPath('world-map-mobile.png') })
  await map.getByRole('button', { name: '風車村港口，可直達' }).click()
  await expect(page.getByLabel('輸入行動或聊天')).toHaveValue('前往風車村港口')
  await expect(page.locator('.voyage-bar')).toContainText('風車村廣場')
  await page.getByRole('button', { name: '送出行動' }).click()
  await expect(page.locator('.entry-result').filter({ hasText: '你抵達風車村港口' })).toBeVisible()
  await openTab(page, '地圖')
  await expect(map.locator('[aria-current="location"] strong')).toHaveAttribute('title', '風車村港口')
  await expect(map.getByRole('button', { name: '派對酒吧，經廣場' })).toBeVisible()
})

test('單人須先實際生成回覆才能開房，開局後可執行 D20、問瑪琪諾並重開原存檔', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await create(page, true)
  expect(fixture.seen.map(call => call.kind)).toEqual(['probe', 'probe'])
  await expect(page.getByRole('button', { name: '開始遊戲' })).toBeDisabled()
  await ready(page, '風向')
  await page.getByRole('button', { name: '開始遊戲' }).click()
  await expect(page.getByRole('heading', { name: '世界公告' })).toBeVisible()
  expect(fixture.seen.map(call => call.kind)).toEqual(['probe', 'probe', 'probe'])
  await expect(page.locator('.entry-world').first()).toContainText('魯夫')
  await expect(page.locator('.personal')).toHaveCount(1)
  await expect(page.locator('.action-suggestions')).toContainText('你在風車村廣場。')
  await expect(page.getByRole('button', { name: '前往風車村港口' })).toHaveCount(0)
  await page.getByLabel('輸入行動或聊天').fill('我在哪裡？')
  await page.getByRole('button', { name: '送出行動' }).click()
  await expect(page.locator('.entry-location')).toContainText('你在風車村廣場。')
  await expect(page.locator('.entry-guide')).toHaveCount(0)
  await page.getByRole('button', { name: '問附近能做什麼' }).click()
  await expect(page.getByLabel('輸入行動或聊天')).toHaveValue('我能去哪裡？')
  await page.getByRole('button', { name: '送出行動' }).click()
  await expect(page.locator('.entry-guide')).toContainText('風車村港口')
  await expect(page.locator('.entry-guide')).toContainText('派對酒吧')
  await page.getByLabel('輸入行動或聊天').fill('這裡能做甚麼')
  await page.getByRole('button', { name: '送出行動' }).click()
  await expect(page.locator('.entry-guide')).toHaveCount(2)
  await expect(page.locator('.entry-guide').last()).toContainText('補給鋪與船塢在這裡')
  expect(fixture.seen.map(call => call.kind)).toEqual(['probe', 'probe', 'probe'])
  await page.getByRole('button', { name: '前往風車村港口' }).click()
  await expect(page.getByLabel('輸入行動或聊天')).toHaveValue('前往風車村港口')
  await page.getByRole('button', { name: '送出行動' }).click()
  await expect(page.locator('.entry-result').filter({ hasText: '你抵達風車村港口' })).toBeVisible()
  await expect(page.locator('.action-suggestions')).toContainText('你在風車村港口。')
  // The dice roll on screen before the result is written; Escape skips, and they can be switched off.
  await page.getByLabel('輸入行動或聊天').fill('檢查地上的鞋印')
  await page.getByRole('button', { name: '送出行動' }).click()
  await expect(page.locator('.dice-tray canvas')).toHaveCount(1)
  await expect(page.locator('.entry-result').filter({ hasText: '觀察 D20' })).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('.dice-tray')).toHaveCount(0)
  await expect(page.locator('.entry-result').filter({ hasText: '觀察 D20' })).toHaveCount(1)
  await page.getByText('動畫與語音').click()
  await page.getByLabel('骰子動畫').uncheck()
  await page.getByLabel('攻擊動畫').uncheck()
  await action(page, '檢查地上的鞋印', '觀察 D20')
  await expect(page.locator('.entry-narrative').last()).toBeVisible()
  // The storyteller is off until asked, reads only what comes after that, and falls silent on request.
  await page.evaluate(() => {
    const seen = window as unknown as { heard: string[] }
    seen.heard = []
    speechSynthesis.speak = line => { seen.heard.push(line.text); setTimeout(() => line.onstart?.(new Event('start') as SpeechSynthesisEvent), 5); setTimeout(() => line.onend?.(new Event('end') as SpeechSynthesisEvent), 400) }
    speechSynthesis.cancel = () => {}
  })
  const heard = () => page.evaluate(() => (window as unknown as { heard: string[] }).heard)
  await page.getByLabel('語音說故事').check()
  await expect(page.getByRole('group', { name: '語音設定' })).toBeVisible()
  expect(await heard()).toEqual([])
  await page.getByRole('button', { name: '試聽' }).click()
  await expect(page.getByRole('group', { name: '語音播放' })).toContainText('旁白')
  await expect.poll(heard).toContain('我要成為海賊王！')
  await page.getByRole('button', { name: '停止', exact: true }).click()
  await expect(page.getByRole('group', { name: '語音播放' })).toHaveCount(0)
  await page.getByText('動畫與語音').click()
  await action(page, '去派對酒吧，找瑪琪諾聊天', '瑪琪諾與你交談')
  await expect(page.locator('.voyage-bar')).toContainText('派對酒吧')
  await expect(page.locator('.action-suggestions')).toContainText('你正和瑪琪諾交談。')
  await action(page, '小艇上是誰', '是魯夫喔')
  await action(page, '說明小艇上的人員狀況是如何', '是魯夫喔')
  await expect(page.locator('.entry-result').filter({ hasText: '瑪琪諾說：「是魯夫喔。' })).toHaveCount(2)
  await expect.poll(heard).toContain('是魯夫喔。')
  expect((await heard()).some(line => /D20|XP/.test(line))).toBe(false)
  await action(page, '瑪琪諾\n我要買船要去哪買', '風車村港口的船塢販售可載八人的小帆船')
  await expect(page.locator('.entry-result').last()).toContainText('瑪琪諾說：「')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await page.reload()
  await page.getByRole('button', { name: '開啟', exact: true }).click()
  await expect(page.getByRole('heading', { name: '世界公告' })).toBeVisible()
  await expect(page.getByText('你抵達風車村港口。', { exact: true })).toBeVisible()
})

test('去哥亞王國買刀，背包顯示目前武器並可帶入換武器指令', async ({ page }) => {
  await create(page)
  await ready(page, '刀客')
  await page.getByRole('button', { name: '開始遊戲' }).click()
  await action(page, '前往哥亞王國', '抵達哥亞王國城下町')
  await openTab(page, '背包')
  await expect(page.getByText('目前武器：普通武士刀')).toBeVisible()
  await page.getByRole('button', { name: '改為徒手' }).click()
  await expect(page.getByLabel('輸入行動或聊天')).toHaveValue('收起武器')
  await page.getByRole('button', { name: '送出行動' }).click()
  await expect(page.getByText('目前武器：徒手')).toBeVisible()
  await page.getByRole('button', { name: '改用普通武士刀' }).click()
  await page.getByRole('button', { name: '送出行動' }).click()
  await expect(page.getByText('目前武器：普通武士刀')).toBeVisible()
  await action(page, '買普通武士刀', '購入普通武士刀')
  await expect(page.getByText('普通武士刀 × 2')).toBeVisible()
})

test('從船塢購船，出海後地圖更新並顯示登島委託，返航後回原港', async ({ page }) => {
  const code = await create(page)
  // Random sea encounters are tested elsewhere; this voyage should land directly.
  const calm = hostRef.game.room(code)
  calm.calmSeas = true
  hostRef.store.save(calm)
  await ready(page, '燈火')
  await page.getByRole('button', { name: '開始遊戲' }).click()
  const map = page.getByRole('region', { name: '島上地圖' })
  const voyage = page.getByRole('region', { name: '航海', exact: true })
  await action(page, '前往風車村港口', '你抵達風車村港口')
  // The shop folds down to its title; the sea has its own page on the map tab.
  const shop = page.getByRole('region', { name: '港口補給鋪' })
  await expect(shop.getByRole('button', { name: /^買繃帶/ })).toBeHidden()
  await shop.getByText('港口補給鋪').click()
  await shop.getByRole('button', { name: /^買繃帶/ }).click()
  await expect(page.getByLabel('輸入行動或聊天')).toHaveValue('買繃帶')
  await openTab(page, '出海')
  await expect(map).toBeHidden()
  await expect(voyage.getByRole('list', { name: '海圖' })).toContainText('謝爾茲鎮')
  await voyage.getByRole('button', { name: '買船' }).click()
  await expect(page.getByLabel('輸入行動或聊天')).toHaveValue('買船')
  await page.getByRole('button', { name: '送出行動' }).click()
  await expect(voyage).toContainText('小帆船停在風車村港口')
  // The crew names her, and every panel uses the name.
  await openTab(page, '船團')
  await page.getByLabel('船名').fill('黎明號')
  await page.getByRole('button', { name: '取名', exact: true }).click()
  await expect(page.getByLabel('輸入行動或聊天')).toHaveValue('替船取名「黎明號」')
  await page.getByRole('button', { name: '送出行動' }).click()
  await expect(page.getByRole('region', { name: '「黎明號」' })).toContainText('小帆船')
  await openTab(page, '夥伴')
  await expect(page.getByRole('region', { name: '「黎明號」' })).toBeHidden()
  await expect(page.getByRole('region', { name: '夥伴', exact: true })).toContainText('成立船團後')
  await openTab(page, '決議')
  await expect(page.getByRole('region', { name: '團隊決議' })).toContainText('主船「黎明號」')
  await openTab(page, '地圖')
  await expect(voyage).toContainText('「黎明號」停在風車村港口')
  // The whole world map: pick an island, read its card, choose a course from it.
  await page.getByRole('button', { name: '展開世界地圖' }).click()
  const world = page.getByRole('dialog', { name: '世界地圖全圖' })
  await expect(world.getByRole('button', { name: '黎明島，你在這裡' })).toBeVisible()
  await world.getByRole('button', { name: '全圖' }).click()
  await world.getByRole('button', { name: '阿拉巴斯坦，還沒去過' }).click()
  await expect(world.getByRole('region', { name: '島嶼資訊' })).toContainText('要經過：黎明島 → 謝爾茲鎮')
  await world.getByRole('button', { name: '謝爾茲鎮，可直航' }).click()
  await expect(world.getByRole('region', { name: '島嶼資訊' })).toContainText('15 海里')
  await world.getByRole('button', { name: '選快航航線' }).click()
  await expect(world).toBeHidden()
  await expect(page.getByLabel('輸入行動或聊天')).toHaveValue('選擇航線 謝爾茲鎮 快航')
  await voyage.getByRole('button', { name: '出海', exact: true }).click()
  await page.getByRole('button', { name: '送出行動' }).click()
  // Ashore on another island the map tab turns back to the land by itself.
  await expect(map.locator('[aria-current="location"] strong')).toHaveAttribute('title', '謝爾茲鎮港口')
  await expect(page.getByRole('region', { name: '基地廣場上的劍士' })).toContainText('找莉卡接委託')
  await expect(map.getByRole('button', { name: '謝爾茲鎮大街，可直達' })).toBeVisible()
  await action(page, '返航', '全隊抵達黎明島的風車村港口')
  await expect(map.locator('[aria-current="location"] strong')).toHaveAttribute('title', '風車村港口')
})

for (const count of [2, 3, 4]) test(count + ' 個瀏覽器用 WebRTC 開局與跨窗操作', async ({ browser, page }) => {
  const code = await create(page)
  await page.getByText('遠端邀請與房間設定').click()
  await expect(page.getByText('遠端邀請就緒')).toBeVisible()
  const gameUrl = root + '#join=' + code
  const contexts: BrowserContext[] = []
  const guests: Page[] = []
  let httpCalls = 0
  const guestPage = async () => {
    const context = await browser.newContext()
    contexts.push(context)
    await context.route('**/local/**', route => { httpCalls++; return route.abort() })
    const guest = await context.newPage()
    await guest.goto(gameUrl)
    // A browser without a seat is asked first, so nobody takes a second seat by accident.
    await guest.getByRole('button', { name: '以新玩家加入' }).click()
    return guest
  }
  try {
    for (let i = 0; i < (count === 4 ? 4 : count - 1); i++) {
      const guest = await guestPage()
      guests.push(guest)
      if (i < count - 1) await expect(guest.getByRole('heading', { name: '遊戲大廳' })).toBeVisible({ timeout: 15_000 })
    }
    if (count === 4) await expect(guests[3].getByText('房間已滿，最多四位真人。')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(count + '／4 人')).toBeVisible()
    await Promise.all([ready(page, '港口'), ...guests.slice(0, count - 1).map((guest, i) => ready(guest, '水手' + i))])
    if (count === 2) {
      // Portraits reach the other browsers over WebRTC, before the story starts and after a change.
      await setPortrait(guests[0], 200)
      await expect(guests[0].locator('.roster .avatar img')).toHaveCount(1)
      await expect(page.locator('.lobby-grid .roster .avatar img')).toHaveCount(1, { timeout: 15_000 })
      await setPortrait(page, 20)
      await expect(guests[0].locator('.roster .avatar img')).toHaveCount(2, { timeout: 15_000 })
    }
    await page.getByRole('button', { name: '開始遊戲' }).click()
    for (const client of [page, ...guests.slice(0, count - 1)])
      await expect(client.locator('.personal')).toHaveCount(count)
    await action(guests[0], '去碼頭', '你抵達風車村港口')
    // Each player's window stays separate (spec §5.1); the host opens the teammate's tab to read it.
    await page.getByRole('tab', { name: /^水手0/ }).click()
    await expect(page.getByText('你抵達風車村港口。', { exact: true })).toBeVisible()
    const hostMap = page.getByRole('region', { name: '島上地圖' })
    await expect(hostMap.locator('.map-party li').filter({ hasText: '水手0' })).toContainText('風車村港口')
    await expect(guests[0].getByRole('region', { name: '島上地圖' }).locator('[aria-current="location"] strong')).toHaveAttribute('title', '風車村港口')
    if (count === 2) {
      const face = hostMap.locator('.map-party li').filter({ hasText: '水手0' }).locator('img')
      const first = await face.getAttribute('src')
      expect(first).toMatch(/^data:image\/jpeg;base64,/)
      await expect(page.locator('.hud .avatar img')).toBeVisible()
      // In the game: the round button in the status bar, whatever tab is open.
      await expect(guests[0].locator('.hud').getByRole('button', { name: '換頭貼' })).toBeVisible()
      await setPortrait(guests[0], 120)
      await expect.poll(() => face.getAttribute('src'), { timeout: 15_000 }).not.toBe(first)
      await openTab(guests[0], '角色')
      await guests[0].getByRole('region', { name: '角色資料' }).getByRole('button', { name: '換頭貼' }).click()
      await guests[0].getByRole('button', { name: '移除頭貼' }).click()
      await expect(face).toHaveCount(0, { timeout: 15_000 })
    }
    if (count === 2) {
      // Spec §1.3: a newcomer can join a running story and meets the party at the port.
      const late = await guestPage()
      await expect(late.getByRole('heading', { name: '加入進行中的冒險' })).toBeVisible({ timeout: 15_000 })
      await fillCharacter(late, '新人')
      await expect(late.locator('.personal')).toHaveCount(3, { timeout: 15_000 })
      await expect(page.locator('.personal')).toHaveCount(3)
      await expect(page.locator('.entry-world').filter({ hasText: '新夥伴新人在風車村港口與大家會合。' })).toBeVisible()
    }
    if (count === 2) {
      // Moving to another device: the code brings the same character back there and signs the old device out.
      await guests[0].getByText('換設備', { exact: true }).click()
      await guests[0].getByRole('button', { name: '產生換設備碼' }).click()
      const ticket = await guests[0].locator('.transfer-ticket strong').textContent({ timeout: 15_000 })
      const context = await browser.newContext()
      contexts.push(context)
      const phone = await context.newPage()
      await phone.goto(gameUrl)
      await phone.getByLabel(/換設備碼/).fill('ZZZZ-ZZZZ')
      await phone.getByRole('button', { name: '接回我的角色' }).click()
      await expect(phone.getByText('換設備碼不正確或已過期。')).toBeVisible({ timeout: 15_000 })
      await phone.getByLabel(/換設備碼/).fill(ticket!)
      await phone.getByRole('button', { name: '接回我的角色' }).click()
      await expect(phone.locator('.personal')).toHaveCount(3, { timeout: 15_000 })
      await expect(phone.locator('.voyage-bar')).toContainText('風車村港口')
      await expect(guests[0].getByText('這台設備的重連憑證已失效', { exact: false })).toBeVisible({ timeout: 20_000 })
      await expect(guests[0].getByRole('button', { name: '以新玩家加入' })).toBeVisible()
      // The new device remembers its seat; the host can issue a code for a player who lost theirs.
      await phone.reload()
      await expect(phone.locator('.personal')).toHaveCount(3, { timeout: 15_000 })
      const seats = page.getByRole('region', { name: '遠端玩家' })
      await seats.getByRole('listitem').filter({ hasText: '水手0' }).getByRole('button', { name: '換設備碼' }).click()
      await expect(seats.locator('.transfer-ticket')).toContainText('水手0的換設備碼')
      await expect(seats.getByRole('button', { name: '移除' })).toHaveCount(0)
      await expect(page.locator('.personal')).toHaveCount(3)
    }
    if (count === 4) {
      await guests[0].close()
      await expect(page.getByRole('tab', { name: /水手0・離線/ })).toBeVisible({ timeout: 14_000 })
      await action(page, '往村道', '你抵達村外小路')
      const returned = await contexts[0].newPage()
      await returned.goto(gameUrl)
      await expect(returned.getByText('你離線期間有', { exact: false })).toBeVisible({ timeout: 15_000 })
      await expect(returned.getByText('你抵達風車村港口。', { exact: true })).toBeVisible()
      await expect(returned.locator('.personal')).toHaveCount(count)
    }
    expect(httpCalls).toBe(0)
  } finally {
    await Promise.all(contexts.map(context => context.close()))
  }
})

test('對村長出手會開打並結算，狀態欄顯示懸賞金與招式欄', async ({ page }) => {
  await create(page)
  await ready(page, '莽夫')
  await page.getByRole('button', { name: '開始遊戲' }).click()
  await openTab(page, '角色')
  await expect(page.getByText('懸賞金', { exact: true })).toBeVisible()
  await expect(page.getByText('招式（0／6）')).toBeVisible()
  // A blow that lands flies from name to name over the dice, and the tray closes by itself.
  await page.evaluate(() => {
    const seen = window as unknown as { stages: number }
    seen.stages = 0
    new MutationObserver(list => { for (const { addedNodes } of list) for (const node of addedNodes) if ((node as Element).classList?.contains('fight-fx')) seen.stages++ }).observe(document.body, { childList: true, subtree: true })
  })
  await action(page, '攻擊村長', '莽夫向村長（平民）出手了')
  const stages = () => page.evaluate(() => (window as unknown as { stages: number }).stages)
  for (let i = 0; i < 12 && !await stages() && await page.locator('.combat-panel').isVisible(); i++) {
    await page.getByLabel('輸入行動或聊天').fill('攻擊村長')
    await page.getByRole('button', { name: '送出行動' }).click()
    await page.waitForTimeout(3500)
  }
  expect(await stages()).toBeGreaterThan(0)
  await expect(page.locator('.fight-tray')).toHaveCount(0)
})

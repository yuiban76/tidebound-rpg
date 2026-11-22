import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { CharacterInput } from '../packages/shared/protocol.ts'

export const character = (name: string): CharacterInput => ({
  name, age: 23, race: '人類', 
  background: '曾在港口工作',
  stats: { STR: 4, AGI: 3, CON: 3, PER: 3, INT: 2, WIL: 3 },
  major: '劍術', basics: ['觀察', '閃避'], life: '工藝',
})

export async function compatibilityFixture() {
  const seen: {
    kind: string; authorization?: string; content: string; maxTokens?: number
    format?: string; thinking?: boolean
  }[] = []
  let fault: 'auth' | 'model' | 'blank' | 'malformed' | 'unavailable' | 'output-limit' | 'hang' | undefined
  let only: string | undefined
  let modelRoute = true
  let nextIntent: unknown
  let narration = '港口傳來風聲。'
  let rawIntentReplies: string[] = []
  let structuredMode = true
  const cancelled: string[] = []
  const onText = new Map<string, object>([
    ['去碼頭', { kind: 'move', to: 'dock' }],
    ['我想去王國看看', { kind: 'move', to: 'goa' }],
    ['沿著海岸走到碼頭', { kind: 'move', to: 'dock' }],
    ['回廣場', { kind: 'move', to: 'square' }],
    ['往村道', { kind: 'move', to: 'road' }],
    ['去山徑', { kind: 'move', to: 'hill' }],
    ['找提奧聊聊', { kind: 'talk', npc: 'clerk' }],
    ['檢查地上的鞋印', { kind: 'check', method: 'observe' }],
    ['買一把普通長槍', { kind: 'buy', item: 'spear' }],
    ['攻擊岬恩', { kind: 'attack', target: '岬恩' }],
    ['防守', { kind: 'guard' }],
    ['撤退', { kind: 'flee' }],
    ['我要離開這座島', { kind: 'unsupported' }],
    ['接受委託', { kind: 'quest', step: 'accept' }],
    ['交還潮汐簿', { kind: 'quest', step: 'deliver' }],
    ['和岬恩談工錢', { kind: 'negotiate', target: '岬恩' }],
  ])
  const server = createServer(async (request, response) => {
    const accepted = (kind: string, content: string, model?: string, maxTokens?: number) => {
      seen.push({ kind, authorization: request.headers.authorization, content, maxTokens })
      const problem = !only || only === kind ? fault : undefined
      if (problem === 'hang') {
        response.once('close', () => { cancelled.push(kind) })
        return { rejected: true, problem }
      }
      if (problem === 'auth' || problem === 'model' || problem === 'unavailable' || model === 'wrong') {
        response.writeHead(problem === 'auth' ? 401 : problem === 'unavailable' ? 503 : 404).end()
        return { rejected: true, problem }
      }
      return { rejected: false, problem }
    }
    if (request.method === 'GET' && request.url === '/v1/models') {
      if (accepted('models', '').rejected) return
      if (modelRoute) response.writeHead(200, { 'Content-Type': 'application/json' }).end('{"data":[]}')
      else response.writeHead(404).end()
      return
    }
    if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
      response.writeHead(404).end()
      return
    }
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    const body = Buffer.concat(chunks).toString()
    if (!body) {
      if (!accepted('probe-empty', body).rejected) response.writeHead(422).end()
      return
    }
    const { model, messages, max_tokens, response_format, chat_template_kwargs } = JSON.parse(body)
    const [system, user] = messages.map((message: { content: string }) => message.content)
    const kind = system.includes('連線測試') ? 'probe' : system.includes('意圖分類器') ? 'intent' : system.includes('NPC 台詞') ? 'dialogue'
      : system.includes('旁白') ? 'narrative' : 'unexpected-generation'
    const { rejected, problem } = accepted(kind, user, model, max_tokens)
    if (rejected) return
    Object.assign(seen.at(-1)!, { format: response_format?.type, thinking: chat_template_kwargs?.enable_thinking })
    if (response_format && !structuredMode) {
      response.writeHead(400).end()
      return
    }
    let content = '海港早安，願你一路順風。'
    if (kind === 'intent') {
      content = rawIntentReplies.shift() ?? JSON.stringify(nextIntent ?? onText.get(JSON.parse(user).action) ?? { kind: 'social' })
      nextIntent = undefined
    }
    if (kind === 'probe') content = 'OK'
    if (kind === 'narrative') content = narration
    if (kind === 'dialogue') content = '提奧正在找潮汐簿。'
    response.setHeader('Content-Type', 'application/json')
    if (problem === 'output-limit') {
      response.end(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: null, reasoning_content: '思考中' } }] }))
      return
    }
    response.end(JSON.stringify(problem === 'malformed'
      ? { unexpected: true } : { choices: [{ message: { content: problem === 'blank' ? '   ' : content } }] }))
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const baseUrl = 'http://127.0.0.1:' + (server.address() as AddressInfo).port + '/v1'
  return {
    server, baseUrl, seen, cancelled,
    models: (enabled: boolean) => { modelRoute = enabled },
    fault: (value: typeof fault, phase?: string) => { fault = value; only = phase },
    next: (value: unknown) => { nextIntent = value },
    rawIntents: (...values: string[]) => { rawIntentReplies = values },
    structured: (enabled: boolean) => { structuredMode = enabled },
    narrateWith: (value: string) => { narration = value },
    close: () => new Promise<void>((resolve, reject) => { server.close(e => e ? reject(e) : resolve()); server.closeAllConnections() }),
  }
}

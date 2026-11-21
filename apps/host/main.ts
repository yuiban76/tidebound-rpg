import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { makeHost } from './http.ts'

const port = Number(process.env.TIDE_PORT ?? 4173)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('TIDE_PORT 必須是有效的連接埠。')
const file = resolve(process.env.TIDE_DB ?? 'data/worlds.sqlite')
mkdirSync(dirname(file), { recursive: true })
const { server } = makeHost(file, resolve('dist'), resolve(dirname(file), 'backups'))
server.listen(port, '127.0.0.1', () => console.log('海賊王 AI RPG 房主服務 http://127.0.0.1:' + port))

import { createHash, createHmac, randomBytes } from 'node:crypto'
import { DatabaseSync, backup } from 'node:sqlite'
import { newWorld, normalizeWorld } from '../../packages/world/village.ts'
import type { World } from '../../packages/world/village.ts'

export type Entry = {
  seq: number, actor: string | null, type: string, text: string, version: number, minute: number, action?: string
}
export type Pending = {
  id: string, actor: string, text: string, version: number,
  phase: 'queued' | 'interpret' | 'narrate' | 'done' | 'cancelled',
  result: string | null, announce: number, context: string | null,
}
const hash = (value: string) => createHash('sha256').update(value).digest('hex')

export class Store {
  db: DatabaseSync
  constructor(filename: string) {
    this.db = new DatabaseSync(filename)
    this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000')
    const schema = this.db.prepare('PRAGMA user_version').get()!.user_version
    if (schema === 0) this.db.exec(`
      BEGIN;
      CREATE TABLE worlds (code TEXT PRIMARY KEY, body TEXT NOT NULL, seed TEXT NOT NULL);
      CREATE TABLE sessions (code TEXT REFERENCES worlds, player TEXT, digest TEXT, PRIMARY KEY(code, player), UNIQUE(code,digest));
      CREATE TABLE events (
        seq INTEGER PRIMARY KEY, code TEXT REFERENCES worlds, actor TEXT, type TEXT NOT NULL, text TEXT NOT NULL,
        version INTEGER NOT NULL, minute INTEGER NOT NULL, action TEXT, UNIQUE(code, action, type)
      );
      CREATE INDEX event_history ON events(code, seq);
      CREATE TABLE pending (
        ordinal INTEGER PRIMARY KEY, code TEXT REFERENCES worlds, id TEXT NOT NULL, actor TEXT NOT NULL,
        text TEXT NOT NULL, version INTEGER NOT NULL, phase TEXT NOT NULL, result TEXT, announce INTEGER NOT NULL DEFAULT 0, context TEXT,
        UNIQUE(code,id)
      );
      CREATE UNIQUE INDEX one_pending ON pending(code, actor) WHERE phase IN ('queued','interpret','narrate');
      CREATE TABLE snapshots (code TEXT REFERENCES worlds, version INTEGER, body TEXT, PRIMARY KEY(code,version));
      PRAGMA user_version=1;
      COMMIT;
    `)
    if (schema !== 0 && schema !== 1) throw new Error('存檔版本不相容。')
    // Kept out of the world, which every view and snapshot copies. An older host simply ignores the table.
    this.db.exec('CREATE TABLE IF NOT EXISTS portraits (code TEXT REFERENCES worlds, player TEXT, revision TEXT NOT NULL, image TEXT NOT NULL, PRIMARY KEY(code, player))')
  }

  transaction<T>(run: () => T): T {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const value = run()
      this.db.exec('COMMIT')
      return value
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  create(code: string, host: string) {
    const world = newWorld(code, host)
    this.db.prepare('INSERT INTO worlds VALUES (?,?,?)').run(code, JSON.stringify(world), randomBytes(32).toString('hex'))
    return world
  }
  get(code: string): World | undefined {
    const row = this.db.prepare('SELECT body FROM worlds WHERE code=?').get(code)
    return row ? normalizeWorld(JSON.parse(String(row.body)) as World) : undefined
  }
  list() {
    const rows = this.db.prepare('SELECT body FROM worlds ORDER BY rowid DESC').all()
    return rows.map(row => {
      const { code, started, minute, members } = JSON.parse(String(row.body)) as World
      return { code, started, minute, count: members.length }
    })
  }
  save(world: World) {
    const body = JSON.stringify(world)
    this.db.prepare('UPDATE worlds SET body=? WHERE code=?').run(body, world.code)
    if (world.version % 10 === 0 || world.version === 1)
      this.db.prepare('INSERT OR REPLACE INTO snapshots VALUES (?,?,?)').run(world.code, world.version, body)
  }
  token(code: string, actor: string) {
    const token = randomBytes(32).toString('hex')
    this.db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(code, actor, hash(token))
    return token
  }
  /** A fresh credential for a seat; the one it had before stops working. */
  renew(code: string, actor: string) {
    this.revoke(code, actor)
    return this.token(code, actor)
  }
  revoke(code: string, actor: string) {
    this.db.prepare('DELETE FROM sessions WHERE code=? AND player=?').run(code, actor)
  }
  identity(code: string, token: string) {
    const row = this.db.prepare('SELECT player FROM sessions WHERE code=? AND digest=?').get(code, hash(token))
    return row?.player as string | undefined
  }
  entry(world: World, actor: string | null, type: string, text: string, action?: string) {
    this.db.prepare('INSERT INTO events(code, actor, type, text, version, minute, action) VALUES (?,?,?,?,?,?,?)')
      .run(world.code, actor, type, text, world.version, world.minute, action ?? null)
  }
  entries(code: string, before = Number.MAX_SAFE_INTEGER) {
    return (this.db.prepare('SELECT seq,actor,type,text,version,minute,action FROM events WHERE code=? AND seq<? ORDER BY seq DESC LIMIT 60')
      .all(code, before) as unknown as Entry[]).reverse()
  }
  unseen(code: string, after: number) {
    return Number(this.db.prepare('SELECT count(*) AS count FROM events WHERE code=? AND seq>?').get(code, after)!.count)
  }
  chatSeen(code: string, id: string, actor: string) {
    return !!this.db.prepare("SELECT 1 FROM events WHERE code=? AND action=? AND actor=? AND type='chat'").get(code, id, actor)
  }
  pending(code: string, id?: string) {
    if (id) return this.db.prepare('SELECT * FROM pending WHERE code=? AND id=?').get(code, id) as Pending | undefined
    return this.db.prepare("SELECT * FROM pending WHERE code=? AND phase IN ('queued','interpret','narrate') ORDER BY ordinal LIMIT 1")
      .get(code) as Pending | undefined
  }
  lastConversation(code: string, actor: string, place: string) {
    const row = this.db.prepare(`
      SELECT context FROM pending WHERE code=? AND actor=?
      AND json_extract(context, '$.place')=?
      AND instr(result, '與你交談。')>0
      ORDER BY ordinal DESC LIMIT 1
    `).get(code, actor, place)
    if (typeof row?.context !== 'string') return undefined
    const local = JSON.parse(row.context).local as { id: string, facts?: string }[] | undefined
    return local?.find(person => person.facts)?.id
  }
  active(code: string) {
    return this.db.prepare("SELECT id, actor, phase FROM pending WHERE code=? AND phase IN ('queued','interpret','narrate')")
      .all(code) as Pick<Pending, 'id' | 'actor' | 'phase'>[]
  }
  enqueue(code: string, id: string, actor: string, text: string, version: number, phase: 'queued' | 'done' = 'queued') {
    this.db.prepare('INSERT INTO pending(code,id,actor,text,version,phase) VALUES (?,?,?,?,?,?)').run(code, id, actor, text, version, phase)
  }
  phase(code: string, id: string, phase: Pending['phase']) {
    this.db.prepare('UPDATE pending SET phase=? WHERE code=? AND id=?').run(phase, code, id)
  }
  outcome(code: string, id: string, text: string, announce: boolean, context: unknown, narrate: boolean) {
    this.db.prepare('UPDATE pending SET phase=?,result=?,announce=?,context=? WHERE code=? AND id=?')
      .run(narrate ? 'narrate' : 'done', text, Number(announce), JSON.stringify(context), code, id)
  }
  roller(code: string, id: string) {
    const seed = String(this.db.prepare('SELECT seed FROM worlds WHERE code=?').get(code)!.seed)
    let counter = 0
    return (die: number) => {
      const maximum = 0x1_0000_0000
      const limit = maximum - maximum % die
      let value: number
      do {
        value = createHmac('sha256', seed).update(id + ':' + counter++).digest().readUInt32BE()
      } while (value >= limit)
      return value % die + 1
    }
  }
  setPortrait(code: string, player: string, revision: string, image: string) {
    this.db.prepare('INSERT OR REPLACE INTO portraits VALUES (?,?,?,?)').run(code, player, revision, image)
  }
  dropPortrait(code: string, player: string) {
    this.db.prepare('DELETE FROM portraits WHERE code=? AND player=?').run(code, player)
  }
  /** Which picture each player has. */
  portraits(code: string) {
    return Object.fromEntries(this.db.prepare('SELECT player, revision FROM portraits WHERE code=?').all(code)
      .map(row => [String(row.player), String(row.revision)])) as Record<string, string | undefined>
  }
  picture(code: string, revision: string) {
    return this.db.prepare('SELECT image FROM portraits WHERE code=? AND revision=?').get(code, revision)?.image as string | undefined
  }
  export(filename: string) {
    return backup(this.db, filename)
  }
}

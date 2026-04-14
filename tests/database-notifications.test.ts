import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import type { QueryBuilder } from '@atlex/orm'
import { ConnectionRegistry, Model } from '@atlex/orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { DatabaseChannel } from '../src/channels/DatabaseChannel.js'
import { DatabaseNotification } from '../src/DatabaseNotification.js'
import { Notification } from '../src/Notification.js'

interface DbNotifyCtor {
  create(data: Record<string, unknown>): Promise<DatabaseNotification>
}

const DbNotify = DatabaseNotification as unknown as DbNotifyCtor

class User extends Model {
  public static override table = 'users'
}

class DbNote extends Notification {
  public override via(): string[] {
    return ['database']
  }

  public override toDatabase(): Record<string, unknown> {
    return { hello: 'world' }
  }
}

interface QueryStatic<T extends Model> {
  query(): QueryBuilder<T>
}

const UserQuery = User as unknown as QueryStatic<User>
const DatabaseNotificationQuery =
  DatabaseNotification as unknown as QueryStatic<DatabaseNotification>

describe('database notifications (SQLite)', () => {
  let dir: string

  beforeAll(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'atlex-notify-'))
    const dbPath = path.join(dir, 'test.sqlite')
    ConnectionRegistry.resetForTests()
    ConnectionRegistry.instance().register('default', {
      driver: 'better-sqlite3',
      database: dbPath,
      filename: dbPath,
    })
    const knex = ConnectionRegistry.instance().default()._knex()
    await knex.schema.createTable('users', (t) => {
      t.increments('id').primary()
      t.string('email', 255)
    })
    await knex.schema.createTable('notifications', (t) => {
      t.string('id', 36).primary()
      t.string('type', 255).notNullable()
      t.string('notifiable_type', 255).notNullable()
      t.string('notifiable_id', 255).notNullable()
      t.text('data').notNullable()
      t.timestamp('read_at').nullable()
      t.timestamps(true, true)
    })
    await knex('users').insert({ email: 'u@x.com' })
    expect(await knex.schema.hasTable('notifications')).toBe(true)
  })

  beforeEach(async () => {
    const knex = ConnectionRegistry.instance().default()._knex()
    await knex('notifications').delete()
  })

  afterAll(async () => {
    await ConnectionRegistry.instance().default().close()
    ConnectionRegistry.resetForTests()
    rmSync(dir, { recursive: true, force: true })
  })

  it('DatabaseNotification parses data accessor', async () => {
    const row = await DbNotify.create({
      id: 'n1',
      type: 'T',
      notifiable_type: 'U',
      notifiable_id: '1',
      data: JSON.stringify({ a: 1 }),
      read_at: null,
    })
    expect(row.data).toEqual({ a: 1 })
  })

  it('DatabaseNotification markAsRead sets read_at', async () => {
    const row = await DbNotify.create({
      id: 'n2',
      type: 'T',
      notifiable_type: 'U',
      notifiable_id: '1',
      data: '{}',
      read_at: null,
    })
    await row.markAsRead()
    expect(row.getAttribute('read_at')).not.toBeNull()
    expect(row.isRead).toBe(true)
  })

  it('DatabaseChannel inserts row into notifications table', async () => {
    const user = await UserQuery.query().where('id', 1).first()
    expect(user).not.toBeNull()
    const n = new DbNote()
    const ch = new DatabaseChannel()
    await ch.send(user!, n)
    const rows = await DatabaseNotificationQuery.query().get()
    expect(rows).toHaveLength(1)
  })

  it('DatabaseChannel uses notification.id as primary key', async () => {
    const user = await UserQuery.query().where('id', 1).firstOrFail()
    const n = new DbNote()
    const ch = new DatabaseChannel()
    await ch.send(user, n)
    const row = await DatabaseNotificationQuery.query().where('id', n.id).first()
    expect(row).not.toBeNull()
  })

  it('DatabaseChannel stores data as JSON string', async () => {
    const user = await UserQuery.query().where('id', 1).firstOrFail()
    const n = new DbNote()
    const ch = new DatabaseChannel()
    await ch.send(user, n)
    const row = await DatabaseNotificationQuery.query().where('id', n.id).firstOrFail()
    const raw = row.getAttribute('data')
    expect(typeof raw).toBe('string')
    expect(JSON.parse(raw as string)).toEqual({ hello: 'world' })
  })

  it('DatabaseChannel sets read_at to null', async () => {
    const user = await UserQuery.query().where('id', 1).firstOrFail()
    const n = new DbNote()
    const ch = new DatabaseChannel()
    await ch.send(user, n)
    const row = await DatabaseNotificationQuery.query().where('id', n.id).firstOrFail()
    expect(row.getAttribute('read_at')).toBeNull()
  })
})

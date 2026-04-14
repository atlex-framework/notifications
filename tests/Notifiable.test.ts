import { ConnectionRegistry, Model } from '@atlex/orm'
import type { QueryBuilder, RelationBuilder } from '@atlex/orm'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { type DatabaseNotification } from '../src/DatabaseNotification.js'
import { Notifiable } from '../src/Notifiable.js'
import { Notification } from '../src/Notification.js'
import { _setNotificationManagerForTests } from '../src/notificationContext.js'
import { NotificationFake } from '../src/testing/NotificationFake.js'

class Demo extends Notification {
  public override via(): string[] {
    return ['mail']
  }
}

class User extends Notifiable(Model) {
  public static override table = 'users'
}

/** Mixin return type is erased to `TBase`; narrow for tests. */
type NotifiableUser = User & {
  notify(notification: Notification): Promise<void>
  notifications(): RelationBuilder<DatabaseNotification>
  unreadNotifications(): RelationBuilder<DatabaseNotification>
}

interface QueryStatic<T extends Model> {
  query(): QueryBuilder<T>
}
const UserQuery = User as unknown as QueryStatic<User>

describe('Notifiable mixin', () => {
  beforeAll(async () => {
    ConnectionRegistry.resetForTests()
    ConnectionRegistry.instance().register('default', {
      driver: 'better-sqlite3',
      database: ':memory:',
      filename: ':memory:',
    })
    const knex = ConnectionRegistry.instance().default()._knex()
    await knex.schema.createTable('users', (t) => {
      t.increments('id').primary()
    })
    await knex('users').insert({})
  })

  afterAll(async () => {
    await ConnectionRegistry.instance().default().close()
    ConnectionRegistry.resetForTests()
  })

  afterEach(() => {
    _setNotificationManagerForTests(null)
  })

  it('user.notify() sends notification', async () => {
    const fake = NotificationFake.fake()
    const u = (await UserQuery.query().where('id', 1).firstOrFail()) as NotifiableUser
    await u.notify(new Demo())
    fake.assertSentTo(u, Demo)
  })

  it('user.notifications returns relation builder', async () => {
    const u = (await UserQuery.query().where('id', 1).firstOrFail()) as NotifiableUser
    const rel = u.notifications()
    expect(rel.getQuery).toBeDefined()
  })

  it('user.unreadNotifications filters by read_at IS NULL', async () => {
    const u = (await UserQuery.query().where('id', 1).firstOrFail()) as NotifiableUser
    const rel = u.unreadNotifications()
    expect(rel.getQuery).toBeDefined()
  })
})

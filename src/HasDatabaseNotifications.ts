import { type Model, type ModelConstructor, type RelationBuilder } from '@atlex/orm'

import { DatabaseNotification } from './DatabaseNotification.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyConstructor<T> = abstract new (...args: any[]) => T

const DatabaseNotificationModel =
  DatabaseNotification as unknown as ModelConstructor<DatabaseNotification>

/**
 * Adds `notifications`, `unreadNotifications`, and `readNotifications` relations
 * for the standard polymorphic `notifications` table.
 *
 * @param Base - Model constructor to extend.
 * @returns Extended class with database notification relations.
 */
export function HasDatabaseNotifications<TBase extends AnyConstructor<Model>>(Base: TBase): TBase {
  abstract class WithDatabaseNotifications extends Base {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public constructor(...args: any[]) {
      super(...args)
    }

    /**
     * All database notifications for this model.
     */
    public notifications(): RelationBuilder<DatabaseNotification> {
      const parentCtor = this.constructor as typeof Model
      return this.hasMany(DatabaseNotificationModel, 'notifiable_id').where(
        'notifiable_type',
        parentCtor.name,
      )
    }

    /**
     * Unread database notifications (`read_at` IS NULL).
     */
    public unreadNotifications(): RelationBuilder<DatabaseNotification> {
      const rb = this.notifications()
      rb.getQuery().whereNull('read_at')
      return rb
    }

    /**
     * Read database notifications.
     */
    public readNotifications(): RelationBuilder<DatabaseNotification> {
      const rb = this.notifications()
      rb.getQuery().whereNotNull('read_at')
      return rb
    }
  }

  return WithDatabaseNotifications as unknown as TBase
}

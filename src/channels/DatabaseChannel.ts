import { AnonymousNotifiable } from '../AnonymousNotifiable.js'
import { DatabaseNotification } from '../DatabaseNotification.js'
import { NotificationRoutingException } from '../exceptions/NotificationRoutingException.js'
import { notifiableIdFor, notifiableTypeFor } from '../notifiableHelpers.js'
import type { Notification } from '../Notification.js'

import type { NotificationChannel } from './NotificationChannel.js'

/**
 * Persists notifications in the `notifications` table.
 */
export class DatabaseChannel implements NotificationChannel {
  /** @inheritdoc */
  public async send(notifiable: unknown, notification: Notification): Promise<void> {
    if (notifiable instanceof AnonymousNotifiable) {
      throw new NotificationRoutingException(
        'Cannot use the database channel with AnonymousNotifiable (no persisted notifiable id).',
      )
    }
    const toDb = notification.toDatabase ?? notification.toArray
    if (typeof toDb !== 'function') {
      throw new Error(
        `Notification "${notification.constructor.name}" must implement toDatabase() or toArray() for the database channel.`,
      )
    }
    const dataObj = toDb.call(notification, notifiable)
    const type = notification.constructor.name
    const nid = notifiableIdFor(notifiable)
    if (nid === '') {
      throw new NotificationRoutingException(
        'Cannot store database notification: notifiable has no primary key.',
      )
    }
    await (
      DatabaseNotification as unknown as {
        create(data: Record<string, unknown>): Promise<DatabaseNotification>
      }
    ).create({
      id: notification.id,
      type,
      notifiable_type: notifiableTypeFor(notifiable),
      notifiable_id: nid,
      data: JSON.stringify(dataObj),
      read_at: null,
    })
  }
}

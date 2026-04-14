import { type Model } from '@atlex/orm'

import { HasDatabaseNotifications } from './HasDatabaseNotifications.js'
import type { Notification } from './Notification.js'
import { getNotificationManager } from './notificationContext.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyConstructor<T> = abstract new (...args: any[]) => T

/**
 * Mixin: `notify`, `notifyNow`, routing defaults, and database notification relations.
 *
 * @param Base - Model constructor to extend.
 * @returns Extended model class.
 *
 * @example
 * ```ts
 * class User extends Notifiable(Model) {
 *   static override table = "users";
 * }
 * ```
 */
export function Notifiable<TBase extends AnyConstructor<Model>>(Base: TBase): TBase {
  const BaseWithDb = HasDatabaseNotifications(Base) as unknown as AnyConstructor<Model>

  abstract class NotifiableModel extends BaseWithDb {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public constructor(...args: any[]) {
      super(...args)
    }

    /**
     * Send a notification (queued when the instance implements {@link import("@atlex/queue").ShouldQueue}).
     *
     * @param notification - Notification instance.
     */
    public async notify(notification: Notification): Promise<void> {
      await getNotificationManager().send(this, notification)
    }

    /**
     * Send immediately, optionally limiting channels.
     *
     * @param notification - Notification instance.
     * @param channels - Optional channel whitelist.
     */
    public async notifyNow(notification: Notification, channels?: string[]): Promise<void> {
      await getNotificationManager().sendNow(this, notification, channels)
    }

    /**
     * Per-channel routing; override in the model for Slack, custom mail, etc.
     *
     * @param channel - Channel name.
     * @returns Route string when defined.
     */
    public routeNotificationFor(channel: string): string | undefined {
      if (channel === 'mail') {
        const email = this.getAttribute('email')
        return typeof email === 'string' ? email : undefined
      }
      return undefined
    }
  }

  return NotifiableModel as unknown as TBase
}

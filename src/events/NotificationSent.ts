import { Event } from '@atlex/core'

import type { Notification } from '../Notification.js'

/**
 * Fired after a notification was successfully sent on a channel.
 */
export class NotificationSent extends Event {
  public constructor(
    public readonly notifiable: unknown,
    public readonly notification: Notification,
    public readonly channel: string,
    public readonly response: unknown,
  ) {
    super()
  }
}

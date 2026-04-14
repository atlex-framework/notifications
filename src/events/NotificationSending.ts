import { Event } from '@atlex/core'

import type { Notification } from '../Notification.js'

/**
 * Fired before a notification is sent on a channel; listeners may return `false` to cancel (via {@link EventDispatcher.until}).
 */
export class NotificationSending extends Event {
  public constructor(
    public readonly notifiable: unknown,
    public readonly notification: Notification,
    public readonly channel: string,
  ) {
    super()
  }
}

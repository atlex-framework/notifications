import { Event } from '@atlex/core'

import type { Notification } from '../Notification.js'

/**
 * Fired when a channel fails; sending continues for other channels.
 */
export class NotificationFailed extends Event {
  public constructor(
    public readonly notifiable: unknown,
    public readonly notification: Notification,
    public readonly channel: string,
    public readonly error: Error,
  ) {
    super()
  }
}

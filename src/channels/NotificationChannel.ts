import type { Notification } from '../Notification.js'

/**
 * Sends a single notification on one transport.
 */
export interface NotificationChannel {
  /**
   * Deliver the notification to the resolved route.
   *
   * @param notifiable - Recipient entity or {@link import("../AnonymousNotifiable.js").AnonymousNotifiable}.
   * @param notification - Notification instance.
   */
  send(notifiable: unknown, notification: Notification): Promise<void>
}

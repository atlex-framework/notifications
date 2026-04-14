import type { Notification } from './Notification.js'
import { getNotificationManager } from './notificationContext.js'

/**
 * Send notifications to ad-hoc routes without a persisted model.
 */
export class AnonymousNotifiable {
  private readonly routes = new Map<string, string>()

  /**
   * Set the destination for a channel.
   *
   * @param channel - Channel name (`mail`, `slack`, …).
   * @param route - Address, webhook, or handle.
   * @returns this
   */
  public route(channel: string, route: string): this {
    this.routes.set(channel, route)
    return this
  }

  /**
   * @param channel - Channel being resolved.
   * @returns Configured route or `undefined`.
   */
  public routeNotificationFor(channel: string): string | undefined {
    return this.routes.get(channel)
  }

  /**
   * Serialize routes for queued delivery.
   *
   * @returns Channel → route map copy.
   */
  public routesRecord(): Record<string, string> {
    return Object.fromEntries(this.routes)
  }

  /**
   * Queue or send the notification through the framework manager.
   *
   * @param notification - Notification instance.
   */
  public async notify(notification: Notification): Promise<void> {
    await getNotificationManager().send(this, notification)
  }
}

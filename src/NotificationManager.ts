import type { Application } from '@atlex/core'

import type { NotificationChannel } from './channels/NotificationChannel.js'
import type { Notification } from './Notification.js'
import { getNotificationManager } from './notificationContext.js'
import { NotificationSender } from './NotificationSender.js'
import { NotificationFake } from './testing/NotificationFake.js'

/**
 * Registers channels and exposes send / sendNow entrypoints.
 */
export class NotificationManager {
  private readonly channels = new Map<string, NotificationChannel>()
  private readonly sender: NotificationSender

  /**
   * @param app - Owning application (events, queue, mail, config).
   */
  public constructor(app: Application) {
    this.sender = new NotificationSender(app, (name) => this.channels.get(name))
  }

  /**
   * Register a channel implementation.
   *
   * @param name - Channel key (`mail`, `database`, `slack`, custom).
   * @param channel - Channel instance.
   * @returns this
   */
  public channel(name: string, channel: NotificationChannel): this {
    this.channels.set(name, channel)
    return this
  }

  /**
   * Register a custom channel via factory (lazy instantiation).
   *
   * @param name - Channel key.
   * @param factory - Produces a channel.
   * @returns this
   */
  public extend(name: string, factory: () => NotificationChannel): this {
    this.channels.set(name, factory())
    return this
  }

  /**
   * Send using queue rules from {@link import("./QueuedNotification.js").isQueuedNotification}.
   *
   * @param notifiable - Recipient.
   * @param notification - Notification instance.
   */
  public async send(notifiable: unknown, notification: Notification): Promise<void> {
    await this.sender.send(notifiable, notification, {})
  }

  /**
   * Force synchronous delivery (optionally limited channels).
   *
   * @param notifiable - Recipient.
   * @param notification - Notification instance.
   * @param onlyChannels - When set, only these channels run.
   */
  public async sendNow(
    notifiable: unknown,
    notification: Notification,
    onlyChannels?: string[],
  ): Promise<void> {
    await this.sender.send(notifiable, notification, { now: true, onlyChannels: onlyChannels })
  }

  /**
   * Broadcast the same notification to many notifiables.
   *
   * @param notifiables - One or many recipients.
   * @param notification - Notification instance.
   */
  public static async send(
    notifiables: unknown | unknown[],
    notification: Notification,
  ): Promise<void> {
    const list = Array.isArray(notifiables) ? notifiables : [notifiables]
    const manager = getNotificationManager()
    for (const n of list) {
      await manager.send(n, notification)
    }
  }

  /**
   * Replace the manager with a fake and return it (testing).
   *
   * @param app - Optional application to bind `notifications` on.
   * @returns Fake instance recording sends.
   */
  public static fake(app?: Application): NotificationFake {
    return NotificationFake.fake(app)
  }
}

import { randomUUID } from 'node:crypto'

import { AnonymousNotifiable } from './AnonymousNotifiable.js'
import type { MailMessage } from './messages/MailMessage.js'
import type { SlackMessage } from './messages/SlackMessage.js'

/**
 * Base class for all notifications (mail, database, Slack, custom channels).
 */
export abstract class Notification {
  /** Unique id (database primary key for `database` channel). */
  public id: string = randomUUID()

  /** Optional locale for localized content. */
  public locale?: string

  /** When true, defer send until after the current DB transaction commits (best-effort). */
  public afterCommit = false

  /**
   * @param notifiable - Entity receiving the notification.
   * @returns Channel names to use.
   */
  public via(_notifiable: unknown): string[] {
    return ['mail']
  }

  public toMail?(_notifiable: unknown): MailMessage

  public toDatabase?(_notifiable: unknown): Record<string, unknown>

  public toSlack?(_notifiable: unknown): SlackMessage

  public toArray?(_notifiable: unknown): Record<string, unknown>

  public toBroadcast?(_notifiable: unknown): Record<string, unknown>

  public broadcastOn?(): string | string[]

  public broadcastAs?(): string

  public shouldSend?(_notifiable: unknown, _channel: string): boolean | Promise<boolean>

  /**
   * Optional per-channel send delay (milliseconds) for synchronous sends.
   * Queued notifications use {@link import("@atlex/queue").ShouldQueue.delay} instead.
   */
  public deliveryDelay?(_channel: string): number | undefined

  /**
   * Begin routing an anonymous notification.
   *
   * @param channel - Channel name.
   * @param route - Route value (email, Slack channel, etc.).
   */
  public static route(channel: string, route: string): AnonymousNotifiable {
    return new AnonymousNotifiable().route(channel, route)
  }
}

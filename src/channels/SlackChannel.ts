import type { ConfigRepository } from '@atlex/config'

import { NotificationFailedException } from '../exceptions/NotificationFailedException.js'
import { NotificationRoutingException } from '../exceptions/NotificationRoutingException.js'
import { SlackMessage } from '../messages/SlackMessage.js'
import { routeNotificationFor } from '../notifiableHelpers.js'
import type { Notification } from '../Notification.js'

import type { NotificationChannel } from './NotificationChannel.js'

/**
 * Sends {@link Notification.toSlack} payloads to a Slack incoming webhook.
 */
export class SlackChannel implements NotificationChannel {
  /**
   * @param config - Config repository for `services.slack.webhook_url`.
   */
  public constructor(private readonly config: ConfigRepository) {}

  /** @inheritdoc */
  public async send(notifiable: unknown, notification: Notification): Promise<void> {
    const toSlack = notification.toSlack
    if (typeof toSlack !== 'function') {
      throw new Error(
        `Notification "${notification.constructor.name}" must implement toSlack() for the slack channel.`,
      )
    }
    const msgUnknown = toSlack.call(notification, notifiable)
    if (!(msgUnknown instanceof SlackMessage)) {
      throw new Error('toSlack() must return SlackMessage from @atlex/notifications.')
    }
    const routed = routeNotificationFor(notifiable, 'slack')
    const fromConfig = this.config.get('services.slack.webhook_url') as string | undefined
    const webhook = routed ?? fromConfig
    if (webhook === undefined || webhook.length === 0) {
      throw new NotificationRoutingException(
        "Slack webhook URL missing: set notifiable.routeNotificationFor('slack') or config services.slack.webhook_url.",
      )
    }
    const payload = msgUnknown.toPayload()
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new NotificationFailedException(
        `Slack webhook failed with HTTP ${res.status}: ${text}`,
        'slack',
        new Error(text),
      )
    }
  }
}

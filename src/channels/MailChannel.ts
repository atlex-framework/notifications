import type { MailManager } from '@atlex/mail'

import { NotificationRoutingException } from '../exceptions/NotificationRoutingException.js'
import { MailMessage } from '../messages/MailMessage.js'
import { routeNotificationFor } from '../notifiableHelpers.js'
import type { Notification } from '../Notification.js'

import type { NotificationChannel } from './NotificationChannel.js'

/**
 * Sends {@link Notification.toMail} payloads through {@link MailManager}.
 */
export class MailChannel implements NotificationChannel {
  /**
   * @param mailManager - Bound mail manager.
   */
  public constructor(private readonly mailManager: MailManager) {}

  /** @inheritdoc */
  public async send(notifiable: unknown, notification: Notification): Promise<void> {
    const builder = notification.toMail
    if (typeof builder !== 'function') {
      throw new Error(
        `Notification "${notification.constructor.name}" must implement toMail() for the mail channel.`,
      )
    }
    const msgUnknown = builder.call(notification, notifiable)
    if (!(msgUnknown instanceof MailMessage)) {
      throw new Error('toMail() must return an instance of MailMessage from @atlex/notifications.')
    }
    const recipient = routeNotificationFor(notifiable, 'mail')
    if (recipient === undefined || recipient.length === 0) {
      throw new NotificationRoutingException(
        `Cannot send mail notification: no email route on notifiable for "${notification.constructor.name}".`,
      )
    }
    const mailable = await msgUnknown.toMailable(notifiable)
    const mailerName = msgUnknown.getMailerName()
    const scoped = mailerName !== undefined ? this.mailManager.mailer(mailerName) : this.mailManager
    await scoped.to(recipient).sendNow(mailable)
  }
}

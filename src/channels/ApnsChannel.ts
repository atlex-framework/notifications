import { NotificationRoutingException } from '../exceptions/NotificationRoutingException.js'
import { routeNotificationFor } from '../notifiableHelpers.js'
import type { Notification } from '../Notification.js'

import { ApnsCriticalAlert, type ApnsPayload } from './ApnsCriticalAlert.js'
import type { NotificationChannel } from './NotificationChannel.js'

/**
 * Transport interface for dispatching an APNs payload to a device.
 *
 * Implement this in your application and inject it into {@link ApnsChannel}:
 *
 * @example
 * import apn from 'apn'
 * class MyApnsSender implements ApnsSender {
 *   async send(deviceToken: string, payload: ApnsPayload): Promise<void> {
 *     const note = new apn.Notification()
 *     note.rawPayload = payload
 *     await apnProvider.send(note, deviceToken)
 *   }
 * }
 */
export interface ApnsSender {
  /**
   * Deliver the APNs payload to the device.
   *
   * @param deviceToken - 64-character hex device token string.
   * @param payload     - Full APNs payload object (pass to your HTTP/2 client).
   * @throws Any error from the APNs transport is propagated to the caller.
   */
  send(deviceToken: string, payload: ApnsPayload): Promise<void>
}

/**
 * Notification channel for Apple Push Notification service (APNs).
 *
 * Calls `notification.toApns(notifiable)` to obtain the {@link ApnsCriticalAlert}
 * payload builder, then routes the built payload to the device token via the
 * injected {@link ApnsSender}.
 *
 * **Routing:** The notifiable must expose a route for `'apns'` via
 * `routeNotificationFor(notifiable, 'apns')`, which should return the
 * APNs device token string (64-character hex).
 *
 * @example
 * // Register the channel on the NotificationManager:
 * notificationManager.channel('apns', new ApnsChannel(myApnsSender))
 */
export class ApnsChannel implements NotificationChannel {
  /**
   * @param sender - APNs transport implementation (inject your HTTP/2 client here).
   */
  public constructor(private readonly sender: ApnsSender) {}

  /**
   * Deliver the notification via APNs.
   *
   * @param notifiable   - Recipient entity; must route `'apns'` to a device token string.
   * @param notification - Notification instance; must implement `toApns(notifiable)`.
   * @throws {NotificationRoutingException} When no device token route is found.
   * @throws {Error} When `toApns()` is absent or returns a non-ApnsCriticalAlert value.
   */
  public async send(notifiable: unknown, notification: Notification): Promise<void> {
    const builder = (notification as unknown as Record<string, unknown>)['toApns']
    if (typeof builder !== 'function') {
      throw new Error(
        `Notification "${notification.constructor.name}" must implement toApns() for the apns channel.`,
      )
    }

    const alert: unknown = builder.call(notification, notifiable)
    if (!(alert instanceof ApnsCriticalAlert)) {
      throw new Error(
        'toApns() must return an instance of ApnsCriticalAlert from @atlex/notifications.',
      )
    }

    const deviceToken = routeNotificationFor(notifiable, 'apns')
    if (deviceToken === undefined || String(deviceToken).length === 0) {
      throw new NotificationRoutingException(
        `Cannot send APNs notification: no device token route on notifiable for "${notification.constructor.name}".`,
      )
    }

    const payload = alert.toPayload()
    await this.sender.send(String(deviceToken), payload)
  }
}

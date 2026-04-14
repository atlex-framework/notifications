import type { Application, EventDispatcher } from '@atlex/core'
import type { Model } from '@atlex/orm'
import type { ShouldQueue } from '@atlex/queue'
import { dispatch } from '@atlex/queue'

import { AnonymousNotifiable } from './AnonymousNotifiable.js'
import type { NotificationChannel } from './channels/NotificationChannel.js'
import { NotificationFailed } from './events/NotificationFailed.js'
import { NotificationSending } from './events/NotificationSending.js'
import { NotificationSent } from './events/NotificationSent.js'
import {
  SendQueuedNotification,
  type QueuedNotifiablePayload,
} from './jobs/SendQueuedNotification.js'
import { registerNotifiableModel, resolveNotifiableModel } from './notifiableRegistry.js'
import type { Notification } from './Notification.js'
import {
  registerNotificationClass,
  serializeNotificationState,
} from './notificationSerialization.js'
import { isQueuedNotification } from './QueuedNotification.js'

function isModel(value: unknown): value is Model {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Model).getAttribute === 'function'
  )
}

/**
 * Resolves channels, fires events, handles queue vs sync delivery.
 */
export class NotificationSender {
  /**
   * @param app - Application for events and queue.
   * @param resolveChannel - Lookup registered channel implementation.
   */
  public constructor(
    private readonly app: Application,
    private readonly resolveChannel: (name: string) => NotificationChannel | undefined,
  ) {}

  /**
   * Send a notification to all channels from `via()` (or a subset).
   *
   * @param notifiable - Recipient.
   * @param notification - Notification instance.
   * @param options.now - When true, never queue.
   * @param options.onlyChannels - Optional channel whitelist.
   */
  public async send(
    notifiable: unknown,
    notification: Notification,
    options: { now?: boolean; onlyChannels?: string[] } = {},
  ): Promise<void> {
    registerNotificationClass(notification.constructor as new () => Notification)
    if (isModel(notifiable)) {
      registerNotifiableModel(notifiable.constructor as typeof Model)
    }

    const run = (): Promise<void> => this.sendInner(notifiable, notification, options)

    if (notification.afterCommit) {
      await new Promise<void>((resolve, reject) => {
        setImmediate(() => {
          void run().then(resolve, reject)
        })
      })
      return
    }

    await run()
  }

  private async sendInner(
    notifiable: unknown,
    notification: Notification,
    options: { now?: boolean; onlyChannels?: string[] },
  ): Promise<void> {
    const channels = options.onlyChannels ?? notification.via(notifiable)
    for (const channelName of channels) {
      const allow = await this.shouldSendNotification(notifiable, notification, channelName)
      if (!allow) {
        continue
      }

      const dispatcher = this.tryEvents()
      if (dispatcher !== null) {
        const proceed = await dispatcher.until(
          new NotificationSending(notifiable, notification, channelName),
        )
        if (!proceed) {
          continue
        }
      }

      if (!options.now && isQueuedNotification(notification)) {
        await this.dispatchQueued(notifiable, notification, channelName)
        continue
      }

      await this.sendSynchronously(notifiable, notification, channelName, dispatcher)
    }
  }

  private tryEvents(): EventDispatcher | null {
    try {
      return this.app.make<EventDispatcher>('events')
    } catch {
      return null
    }
  }

  private async shouldSendNotification(
    notifiable: unknown,
    notification: Notification,
    channel: string,
  ): Promise<boolean> {
    const fn = notification.shouldSend
    if (typeof fn !== 'function') {
      return true
    }
    const r = await fn.call(notification, notifiable, channel)
    return r
  }

  private async dispatchQueued(
    notifiable: unknown,
    notification: Notification,
    channel: string,
  ): Promise<void> {
    const q = notification as Notification & ShouldQueue
    let payload: QueuedNotifiablePayload
    if (notifiable instanceof AnonymousNotifiable) {
      payload = { kind: 'anonymous', routes: notifiable.routesRecord() }
    } else if (isModel(notifiable)) {
      const M = notifiable.constructor as typeof Model
      const pk = M.primaryKey
      const rawId = notifiable.getAttribute(pk)
      payload = {
        kind: 'model',
        className: M.name,
        id: rawId as string | number,
      }
      if (resolveNotifiableModel(M.name) === null) {
        registerNotifiableModel(M)
      }
    } else {
      throw new Error('Queued notifications require a Model instance or AnonymousNotifiable.')
    }

    const job = new SendQueuedNotification({
      channel,
      notifiable: payload,
      notification: serializeNotificationState(notification),
    })
    const delayMs = typeof q.delay === 'number' ? q.delay : 0
    await dispatch(job)
      .onConnection(q.connection ?? 'default')
      .onQueue(q.queue ?? 'default')
      .delay(delayMs)
      .dispatch()
  }

  private async sendSynchronously(
    notifiable: unknown,
    notification: Notification,
    channelName: string,
    dispatcher: EventDispatcher | null,
  ): Promise<void> {
    const channel = this.resolveChannel(channelName)
    if (channel === undefined) {
      const err = new Error(`Notification channel "${channelName}" is not registered.`)
      if (dispatcher !== null) {
        await dispatcher.dispatch(
          new NotificationFailed(notifiable, notification, channelName, err),
        )
      }
      return
    }

    try {
      await channel.send(notifiable, notification)
      if (dispatcher !== null) {
        await dispatcher.dispatch(
          new NotificationSent(notifiable, notification, channelName, undefined),
        )
      }
    } catch (cause) {
      const err = cause instanceof Error ? cause : new Error(String(cause))
      if (dispatcher !== null) {
        await dispatcher.dispatch(
          new NotificationFailed(notifiable, notification, channelName, err),
        )
      }
    }
  }
}

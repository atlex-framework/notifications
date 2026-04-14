import type { Application } from '@atlex/core'
import type { Model } from '@atlex/orm'
import { Job, RegisterJob } from '@atlex/queue'

import { resolveNotifiableModel } from '../notifiableRegistry.js'
import type { NotificationManagerContract } from '../notificationContext.js'
import {
  deserializeNotification,
  type serializeNotificationState,
} from '../notificationSerialization.js'

export type QueuedNotifiablePayload =
  | { kind: 'model'; className: string; id: string | number }
  | { kind: 'anonymous'; routes: Record<string, string> }

export interface QueuedNotificationPayload {
  channel: string
  notifiable: QueuedNotifiablePayload
  notification: ReturnType<typeof serializeNotificationState>
}

/**
 * Queue worker job: sends one notification on one channel after rehydrating payload.
 */
@RegisterJob()
export class SendQueuedNotification extends Job {
  public static override queue = 'notifications'
  public static override tries = 3

  /**
   * @param payload - Serializable delivery descriptor.
   */
  public constructor(private readonly payload: QueuedNotificationPayload) {
    super(payload)
  }

  /** @inheritdoc */
  public async handle(): Promise<void> {
    const app = this._app()
    if (app === null) {
      throw new Error('SendQueuedNotification requires job runtime Application.')
    }
    const notifiable = await restoreNotifiable(app, this.payload.notifiable)
    const notification = deserializeNotification(this.payload.notification)
    const manager = app.make<NotificationManagerContract>('notifications')
    await manager.sendNow(notifiable, notification, [this.payload.channel])
  }
}

async function restoreNotifiable(
  _app: Application,
  payload: QueuedNotifiablePayload,
): Promise<unknown> {
  if (payload.kind === 'anonymous') {
    const { AnonymousNotifiable } = await import('../AnonymousNotifiable.js')
    const a = new AnonymousNotifiable()
    for (const [k, v] of Object.entries(payload.routes)) {
      a.route(k, v)
    }
    return a
  }
  const ModelCtor = resolveNotifiableModel(payload.className)
  if (ModelCtor === null) {
    throw new Error(
      `Unknown notifiable model "${payload.className}". Call registerNotifiableModel().`,
    )
  }
  const row = await (
    ModelCtor as unknown as { find(id: string | number): Promise<Model | null> }
  ).find(payload.id)
  if (row === null) {
    throw new Error(`Notifiable model "${payload.className}" id=${String(payload.id)} not found.`)
  }
  return row
}

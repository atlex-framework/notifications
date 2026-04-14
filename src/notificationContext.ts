import { getApplicationContext } from '@atlex/core'

import type { NotificationChannel } from './channels/NotificationChannel.js'
import type { Notification } from './Notification.js'

/**
 * Minimal contract implemented by {@link import("./NotificationManager.js").NotificationManager}
 * and {@link import("./testing/NotificationFake.js").NotificationFake}.
 */
export interface NotificationManagerContract {
  send(notifiable: unknown, notification: Notification): Promise<void>
  sendNow(notifiable: unknown, notification: Notification, onlyChannels?: string[]): Promise<void>
  channel(name: string, channel: NotificationChannel): this
  extend(name: string, factory: () => NotificationChannel): this
}

let managerOverride: NotificationManagerContract | null = null

/**
 * @internal Test hook to bypass the application container.
 */
export function _setNotificationManagerForTests(manager: NotificationManagerContract | null): void {
  managerOverride = manager
}

/**
 * Resolve the bound notification manager from the active application.
 *
 * @returns Notification manager singleton.
 */
export function getNotificationManager(): NotificationManagerContract {
  if (managerOverride !== null) {
    return managerOverride
  }
  return getApplicationContext().make<NotificationManagerContract>('notifications')
}

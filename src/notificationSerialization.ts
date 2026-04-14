import type { Notification } from './Notification.js'

const notificationCtors = new Map<string, new () => Notification>()

/**
 * Register a notification class for queued deserialization (call once per class at module load or from the provider).
 *
 * @param ctor - Notification constructor.
 */
export function registerNotificationClass(ctor: new () => Notification): void {
  notificationCtors.set(ctor.name, ctor)
}

/**
 * Snapshot notification enumerable state for the queue payload.
 *
 * @param notification - Live notification instance.
 * @returns Serializable descriptor.
 */
export function serializeNotificationState(notification: Notification): {
  className: string
  state: Record<string, unknown>
} {
  const className = notification.constructor.name
  const state: Record<string, unknown> = {}
  for (const key of Object.keys(notification)) {
    const v = (notification as unknown as Record<string, unknown>)[key]
    const t = typeof v
    if (t === 'string' || t === 'number' || t === 'boolean' || v === null) {
      state[key] = v
    }
  }
  return { className, state }
}

/**
 * Rehydrate a notification from a queued payload.
 *
 * @param payload - Serialized class name + state.
 * @returns New notification instance.
 */
export function deserializeNotification(payload: {
  className: string
  state: Record<string, unknown>
}): Notification {
  const Ctor = notificationCtors.get(payload.className)
  if (Ctor === undefined) {
    throw new Error(
      `Unknown notification class "${payload.className}". Import the class or call registerNotificationClass().`,
    )
  }
  const instance = new Ctor()
  Object.assign(instance, payload.state)
  return instance
}

import type { ShouldQueue } from '@atlex/queue'

import { Notification } from './Notification.js'

/**
 * Base class for notifications that should be pushed onto the queue by default.
 */
export abstract class QueuedNotification extends Notification implements ShouldQueue {
  public connection = 'default'
  public queue = 'default'
  public delay?: number
  public tries?: number
}

/**
 * @returns True when the instance should be queued (structural check for {@link ShouldQueue} fields).
 */
export function isQueuedNotification(
  notification: Notification,
): notification is Notification & ShouldQueue {
  if (notification instanceof QueuedNotification) {
    return true
  }
  const q = notification as Notification & Partial<ShouldQueue>
  return typeof q.queue === 'string' && q.queue.length > 0
}

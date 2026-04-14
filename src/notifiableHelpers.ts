import type { Model } from '@atlex/orm'

import { AnonymousNotifiable } from './AnonymousNotifiable.js'

function isModel(value: unknown): value is Model {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Model).getAttribute === 'function'
  )
}

function isAnonymous(value: unknown): value is AnonymousNotifiable {
  return value instanceof AnonymousNotifiable
}

/**
 * Resolve `notifiable_type` string for database storage.
 *
 * @param notifiable - Model or anonymous wrapper.
 */
export function notifiableTypeFor(notifiable: unknown): string {
  if (isAnonymous(notifiable)) {
    return 'anonymous'
  }
  if (isModel(notifiable)) {
    return (notifiable.constructor as typeof Model).name
  }
  return 'unknown'
}

/**
 * Resolve primary id for polymorphic `notifiable_id`.
 *
 * @param notifiable - Model or anonymous target.
 */
export function notifiableIdFor(notifiable: unknown): string {
  if (isAnonymous(notifiable)) {
    return '0'
  }
  if (isModel(notifiable)) {
    const pk = (notifiable.constructor as typeof Model).primaryKey
    const v = notifiable.getAttribute(pk)
    return v === undefined || v === null ? '' : String(v)
  }
  return ''
}

/**
 * Read per-channel route from a notifiable.
 *
 * @param notifiable - Target entity.
 * @param channel - Channel name.
 */
export function routeNotificationFor(notifiable: unknown, channel: string): string | undefined {
  if (isAnonymous(notifiable)) {
    return notifiable.routeNotificationFor(channel)
  }
  if (isModel(notifiable)) {
    const fn = (
      notifiable as unknown as { routeNotificationFor?: (c: string) => string | undefined }
    ).routeNotificationFor
    if (typeof fn === 'function') {
      return fn.call(notifiable, channel)
    }
    if (channel === 'mail') {
      const email = notifiable.getAttribute('email')
      return typeof email === 'string' ? email : undefined
    }
  }
  return undefined
}

import { AssertionError } from 'node:assert'

import type { Application } from '@atlex/core'

import type { NotificationChannel } from '../channels/NotificationChannel.js'
import type { Notification } from '../Notification.js'
import { _setNotificationManagerForTests } from '../notificationContext.js'

interface SentRecord {
  notifiable: unknown
  notification: Notification
  channel: string
}

function ctorName(ctor: new (...args: never[]) => Notification): string {
  return ctor.name || 'Notification'
}

interface ModelLike {
  getAttribute(key: string): unknown
  constructor: { name: string; primaryKey?: string }
}

function isModelLike(v: unknown): v is ModelLike {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as { getAttribute?: unknown }).getAttribute === 'function' &&
    typeof (v as { constructor?: unknown }).constructor === 'function'
  )
}

function ctorLabel(instance: ModelLike): string {
  return instance.constructor.name.replace(/^bound /, '')
}

function primaryKeyFor(instance: ModelLike): string {
  let cur: object | Function | null = instance.constructor
  while (cur !== null && typeof cur === 'function') {
    const pk = (cur as { primaryKey?: string }).primaryKey
    if (typeof pk === 'string' && pk.length > 0) {
      return pk
    }
    cur = Object.getPrototypeOf(cur)
  }
  return 'id'
}

function isNotificationKind(
  n: Notification,
  Ctor: new (...args: never[]) => Notification,
): boolean {
  if (n instanceof Ctor) {
    return true
  }
  const ctor = Object.getPrototypeOf(n as object) as { constructor?: { name: string } } | null
  const name = ctor?.constructor?.name ?? ''
  return name.replace(/^bound /, '') === Ctor.name
}

function isSameNotifiable(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true
  }
  if (!isModelLike(a) || !isModelLike(b)) {
    return false
  }
  if (ctorLabel(a) !== ctorLabel(b)) {
    return false
  }
  const pk = primaryKeyFor(a)
  return String(a.getAttribute(pk)) === String(b.getAttribute(pk))
}

/**
 * Test double that records notification sends without hitting channels.
 */
export class NotificationFake {
  private readonly sent: SentRecord[] = []

  /**
   * Install this fake as the active notification manager.
   *
   * @param app - When passed, binds `notifications` on the container.
   * @returns The fake instance.
   */
  public static fake(app?: Application): NotificationFake {
    const f = new NotificationFake()
    _setNotificationManagerForTests(f)
    if (app !== undefined) {
      app.container.instance(
        'notifications',
        f as unknown as import('../NotificationManager.js').NotificationManager,
      )
    }
    return f
  }

  /**
   * @internal Used when installed as manager.
   */
  public async send(notifiable: unknown, notification: Notification): Promise<void> {
    for (const channel of notification.via(notifiable)) {
      this.sent.push({ notifiable, notification, channel })
    }
  }

  /**
   * @internal
   */
  public async sendNow(
    notifiable: unknown,
    notification: Notification,
    onlyChannels?: string[],
  ): Promise<void> {
    const list = onlyChannels ?? notification.via(notifiable)
    for (const channel of list) {
      this.sent.push({ notifiable, notification, channel })
    }
  }

  /**
   * @internal No-op for API compatibility with {@link import("../NotificationManager.js").NotificationManager}.
   */
  public channel(_name: string, _channel: NotificationChannel): this {
    return this
  }

  /**
   * @internal
   */
  public extend(_name: string, _factory: () => NotificationChannel): this {
    return this
  }

  /**
   * Assert a notification was sent to a notifiable.
   *
   * @param notifiable - Expected recipient (reference equality).
   * @param notificationClass - Expected notification class.
   * @param callback - Optional matcher on notification + aggregated channel list.
   */
  public assertSentTo<T extends Notification>(
    notifiable: unknown,
    notificationClass: new (...args: never[]) => T,
    callback?: (notification: T, channels: string[]) => boolean,
  ): void {
    const matches = this.sent.filter(
      (r) =>
        isSameNotifiable(r.notifiable, notifiable) &&
        isNotificationKind(r.notification, notificationClass),
    )
    if (matches.length === 0) {
      throw new AssertionError({
        message: `Expected [${ctorName(notificationClass)}] to be sent to notifiable, but it was not.`,
      })
    }
    const channels = [...new Set(matches.map((m) => m.channel))]
    const first = matches[0]!.notification as T
    if (callback !== undefined && !callback(first, channels)) {
      throw new AssertionError({
        message: 'NotificationFake assertSentTo callback returned false.',
      })
    }
  }

  /**
   * Assert a notification was not sent to a notifiable.
   */
  public assertNotSentTo<T extends Notification>(
    notifiable: unknown,
    notificationClass: new (...args: never[]) => T,
  ): void {
    const bad = this.sent.some(
      (r) =>
        isSameNotifiable(r.notifiable, notifiable) &&
        isNotificationKind(r.notification, notificationClass),
    )
    if (bad) {
      throw new AssertionError({
        message: `Expected [${ctorName(notificationClass)}] not to be sent, but it was.`,
      })
    }
  }

  public assertNothingSent(): void {
    if (this.sent.length > 0) {
      throw new AssertionError({
        message: `Expected no notifications, but ${this.sent.length} were recorded.`,
      })
    }
  }

  public assertCount(count: number): void {
    if (this.sent.length !== count) {
      throw new AssertionError({
        message: `Expected ${count} notifications, got ${this.sent.length}.`,
      })
    }
  }

  public assertSentTimes<T extends Notification>(
    notificationClass: new (...args: never[]) => T,
    times: number,
  ): void {
    const n = this.sent.filter((r) => isNotificationKind(r.notification, notificationClass)).length
    if (n !== times) {
      throw new AssertionError({
        message: `Expected [${ctorName(notificationClass)}] ${times} times, got ${n}.`,
      })
    }
  }

  public assertSentOnChannel<T extends Notification>(
    notifiable: unknown,
    notificationClass: new (...args: never[]) => T,
    channel: string,
  ): void {
    const ok = this.sent.some(
      (r) =>
        isSameNotifiable(r.notifiable, notifiable) &&
        isNotificationKind(r.notification, notificationClass) &&
        r.channel === channel,
    )
    if (!ok) {
      throw new AssertionError({
        message: `Expected [${ctorName(notificationClass)}] on channel "${channel}".`,
      })
    }
  }

  /**
   * All matching notifications for a notifiable (deduped by instance).
   */
  public sentTo<T extends Notification>(
    notifiable: unknown,
    notificationClass?: new (...args: never[]) => T,
  ): Notification[] {
    const seen = new Set<Notification>()
    const out: Notification[] = []
    for (const r of this.sent) {
      if (!isSameNotifiable(r.notifiable, notifiable)) continue
      if (notificationClass !== undefined && !isNotificationKind(r.notification, notificationClass))
        continue
      if (!seen.has(r.notification)) {
        seen.add(r.notification)
        out.push(r.notification)
      }
    }
    return out
  }
}

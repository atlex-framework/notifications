import { describe, expect, it, afterEach } from 'vitest'

import { Notification } from '../src/Notification.js'
import { _setNotificationManagerForTests } from '../src/notificationContext.js'
import { NotificationFake } from '../src/testing/NotificationFake.js'

class DemoNotification extends Notification {
  public override via(): string[] {
    return ['mail', 'database']
  }
}

describe('NotificationFake', () => {
  afterEach(() => {
    _setNotificationManagerForTests(null)
  })

  it('assertSentTo passes when notification was sent', () => {
    const fake = NotificationFake.fake()
    const user = { id: 1 }
    const n = new DemoNotification()
    void fake.send(user, n)
    fake.assertSentTo(user, DemoNotification)
  })

  it('assertSentTo fails when not sent', () => {
    const fake = NotificationFake.fake()
    const user = { id: 1 }
    expect(() => {
      fake.assertSentTo(user, DemoNotification)
    }).toThrow()
  })

  it('assertNothingSent passes when nothing sent', () => {
    const fake = NotificationFake.fake()
    fake.assertNothingSent()
  })

  it('assertCount checks total count', () => {
    const fake = NotificationFake.fake()
    const u = {}
    void fake.send(u, new DemoNotification())
    fake.assertCount(2)
  })

  it('callback-based assertion filters correctly', () => {
    const fake = NotificationFake.fake()
    const u = {}
    void fake.send(u, new DemoNotification())
    fake.assertSentTo(
      u,
      DemoNotification,
      (_n, channels) => channels.includes('mail') && channels.includes('database'),
    )
  })
})

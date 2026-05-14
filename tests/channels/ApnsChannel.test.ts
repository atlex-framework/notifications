import { describe, it, expect, vi } from 'vitest'
import { AnonymousNotifiable } from '../../src/AnonymousNotifiable.js'
import { ApnsChannel } from '../../src/channels/ApnsChannel.js'
import { ApnsCriticalAlert } from '../../src/channels/ApnsCriticalAlert.js'
import { Notification } from '../../src/Notification.js'
import { NotificationRoutingException } from '../../src/exceptions/NotificationRoutingException.js'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSender() {
  return { send: vi.fn().mockResolvedValue(undefined) }
}

class TestNotification extends Notification {
  public override via() {
    return ['apns'] as const
  }

  public toApns(_notifiable: unknown): ApnsCriticalAlert {
    return new ApnsCriticalAlert()
      .title('Test Alert')
      .body('Test body')
      .sound({ critical: 1, name: 'default', volume: 1.0 })
      .contentAvailable()
      .deepLink('kidup://test/123')
  }
}

class MissingToApnsNotification extends Notification {
  public override via() {
    return ['apns'] as const
  }
}

class BadReturnNotification extends Notification {
  public override via() {
    return ['apns'] as const
  }
  public toApns() {
    return 'not-a-builder'
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ApnsChannel', () => {
  it('calls sender.send with device token and correct payload', async () => {
    const sender = makeSender()
    const channel = new ApnsChannel(sender)
    const notifiable = new AnonymousNotifiable().route(
      'apns',
      'aabbcc1122334455aabbcc1122334455aabbcc1122334455aabbcc1122334455',
    )
    const notification = new TestNotification()

    await channel.send(notifiable, notification)

    expect(sender.send).toHaveBeenCalledOnce()
    const [token, payload] = sender.send.mock.calls[0] as [string, unknown]
    expect(token).toBe('aabbcc1122334455aabbcc1122334455aabbcc1122334455aabbcc1122334455')
    expect((payload as { aps: { sound: { critical: number } } }).aps.sound.critical).toBe(1)
    expect((payload as { aps: { 'content-available': number } }).aps['content-available']).toBe(1)
    expect((payload as { deepLink: string }).deepLink).toBe('kidup://test/123')
  })

  it('throws when notification does not implement toApns()', async () => {
    const channel = new ApnsChannel(makeSender())
    const notifiable = new AnonymousNotifiable().route('apns', 'token123')
    const notification = new MissingToApnsNotification()

    await expect(channel.send(notifiable, notification)).rejects.toThrow('must implement toApns()')
  })

  it('throws when toApns() does not return ApnsCriticalAlert', async () => {
    const channel = new ApnsChannel(makeSender())
    const notifiable = new AnonymousNotifiable().route('apns', 'token123')
    const notification = new BadReturnNotification()

    await expect(channel.send(notifiable, notification)).rejects.toThrow(
      'must return an instance of ApnsCriticalAlert',
    )
  })

  it('throws NotificationRoutingException when device token is not set', async () => {
    const channel = new ApnsChannel(makeSender())
    // AnonymousNotifiable with no 'apns' route → routeNotificationFor returns undefined
    const notifiable = new AnonymousNotifiable()
    const notification = new TestNotification()

    await expect(channel.send(notifiable, notification)).rejects.toThrow(
      NotificationRoutingException,
    )
  })

  it('throws NotificationRoutingException when device token is empty string', async () => {
    const channel = new ApnsChannel(makeSender())
    const notifiable = new AnonymousNotifiable().route('apns', '')
    const notification = new TestNotification()

    await expect(channel.send(notifiable, notification)).rejects.toThrow(
      NotificationRoutingException,
    )
  })

  it('propagates errors thrown by sender.send', async () => {
    const sender = { send: vi.fn().mockRejectedValue(new Error('APNs HTTP/2 error')) }
    const channel = new ApnsChannel(sender)
    const notifiable = new AnonymousNotifiable().route('apns', 'validtoken')
    const notification = new TestNotification()

    await expect(channel.send(notifiable, notification)).rejects.toThrow('APNs HTTP/2 error')
  })
})

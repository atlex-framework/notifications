import { Application, type Constructor, EventDispatcher, EventServiceProvider } from '@atlex/core'
import { NullDriver, QueueManager, _setQueueManager } from '@atlex/queue'
import type { QueueConfig } from '@atlex/queue'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'

import { AnonymousNotifiable } from '../src/AnonymousNotifiable.js'
import type { NotificationChannel } from '../src/channels/NotificationChannel.js'
import { NotificationFailed } from '../src/events/NotificationFailed.js'
import { NotificationSending } from '../src/events/NotificationSending.js'
import { NotificationSent } from '../src/events/NotificationSent.js'
import { Notification } from '../src/Notification.js'
import { _setNotificationManagerForTests } from '../src/notificationContext.js'
import { NotificationManager } from '../src/NotificationManager.js'
import { QueuedNotification } from '../src/QueuedNotification.js'
import '../src/jobs/SendQueuedNotification.js'

class RecordingChannel implements NotificationChannel {
  public readonly log: string[] = []
  public constructor(private readonly id: string) {}
  public async send(_notifiable: unknown, _notification: Notification): Promise<void> {
    this.log.push(this.id)
  }
}

class ThrowingChannel implements NotificationChannel {
  public async send(): Promise<void> {
    throw new Error('channel failed')
  }
}

class OkChannel implements NotificationChannel {
  public readonly hits: string[] = []
  public async send(_notifiable: unknown, notification: Notification): Promise<void> {
    this.hits.push(notification.constructor.name)
  }
}

class MultiViaNotification extends Notification {
  public override via(): string[] {
    return ['a', 'b']
  }
}

class SkippableNotification extends MultiViaNotification {
  public override shouldSend(_notifiable: unknown, channel: string): boolean {
    return channel !== 'a'
  }
}

class QueuedDemo extends QueuedNotification {
  public override via(): string[] {
    return ['sync']
  }
}

describe('NotificationManager', () => {
  let app: Application
  let nullQueueDriver: NullDriver

  beforeEach(() => {
    app = new Application()
    new EventServiceProvider().register(app)
    const cfg: QueueConfig = {
      default: 'null',
      connections: {
        null: { driver: 'null' },
        default: { driver: 'null' },
      },
      failed: { driver: 'database', database: 'default', table: 'failed_jobs' },
      batching: { database: 'default', table: 'job_batches' },
    }
    nullQueueDriver = new NullDriver()
    const manager = new QueueManager(cfg)
    manager.extend('null', () => nullQueueDriver)
    manager.extend('default', () => nullQueueDriver)
    _setQueueManager(manager)
  })

  afterEach(() => {
    _setNotificationManagerForTests(null)
  })

  it('sends to all channels returned by via()', async () => {
    const a = new RecordingChannel('a')
    const b = new RecordingChannel('b')
    const mgr = new NotificationManager(app)
    mgr.channel('a', a)
    mgr.channel('b', b)
    await mgr.send({}, new MultiViaNotification())
    expect(a.log).toEqual(['a'])
    expect(b.log).toEqual(['b'])
  })

  it('skips channels where shouldSend() returns false', async () => {
    const a = new RecordingChannel('a')
    const b = new RecordingChannel('b')
    const mgr = new NotificationManager(app)
    mgr.channel('a', a)
    mgr.channel('b', b)
    await mgr.send({}, new SkippableNotification())
    expect(a.log).toHaveLength(0)
    expect(b.log).toEqual(['b'])
  })

  it('queues when notification implements ShouldQueue', async () => {
    const sync = new RecordingChannel('sync')
    const mgr = new NotificationManager(app)
    mgr.channel('sync', sync)
    _setNotificationManagerForTests(mgr)
    const recipient = new AnonymousNotifiable().route('mail', 'x@y.com')
    await mgr.send(recipient, new QueuedDemo())
    expect(sync.log).toHaveLength(0)
    nullQueueDriver.assertPushed('SendQueuedNotification', 1)
  })

  it('sends immediately with sendNow()', async () => {
    const sync = new RecordingChannel('sync')
    const mgr = new NotificationManager(app)
    mgr.channel('sync', sync)
    const recipient = new AnonymousNotifiable().route('mail', 'x@y.com')
    await mgr.sendNow(recipient, new QueuedDemo())
    expect(sync.log).toEqual(['sync'])
  })

  it('dispatches NotificationSending before send', async () => {
    const events = app.make<EventDispatcher>(EventDispatcher.name)
    const seen: string[] = []
    events.listen(
      NotificationSending as unknown as Constructor<NotificationSending>,
      (e: NotificationSending) => {
        seen.push(e.channel)
      },
    )
    const mgr = new NotificationManager(app)
    mgr.channel('a', new RecordingChannel('a'))
    mgr.channel('b', new RecordingChannel('b'))
    await mgr.send({}, new MultiViaNotification())
    expect(seen).toEqual(['a', 'b'])
  })

  it('dispatches NotificationSent after success', async () => {
    const events = app.make<EventDispatcher>(EventDispatcher.name)
    const channels: string[] = []
    events.listen(
      NotificationSent as unknown as Constructor<NotificationSent>,
      (e: NotificationSent) => {
        channels.push(e.channel)
      },
    )
    const mgr = new NotificationManager(app)
    mgr.channel('only', new OkChannel())
    class One extends Notification {
      public override via(): string[] {
        return ['only']
      }
    }
    await mgr.send({}, new One())
    expect(channels).toEqual(['only'])
  })

  it('dispatches NotificationFailed on channel error', async () => {
    const events = app.make<EventDispatcher>(EventDispatcher.name)
    const failed: string[] = []
    events.listen(
      NotificationFailed as unknown as Constructor<NotificationFailed>,
      (e: NotificationFailed) => {
        failed.push(e.channel)
      },
    )
    const mgr = new NotificationManager(app)
    mgr.channel('bad', new ThrowingChannel())
    class One extends Notification {
      public override via(): string[] {
        return ['bad']
      }
    }
    await mgr.send({}, new One())
    expect(failed).toEqual(['bad'])
  })

  it('continues to next channel when one fails', async () => {
    const ok = new OkChannel()
    const mgr = new NotificationManager(app)
    mgr.channel('bad', new ThrowingChannel())
    mgr.channel('ok', ok)
    class Two extends Notification {
      public override via(): string[] {
        return ['bad', 'ok']
      }
    }
    await mgr.send({}, new Two())
    expect(ok.hits).toEqual(['Two'])
  })
})

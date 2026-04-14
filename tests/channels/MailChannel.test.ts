import type { MailManager, Mailable } from '@atlex/mail'
import { Model } from '@atlex/orm'
import { describe, expect, it } from 'vitest'

import { AnonymousNotifiable } from '../../src/AnonymousNotifiable.js'
import { MailChannel } from '../../src/channels/MailChannel.js'
import { MailMessage } from '../../src/messages/MailMessage.js'
import { Notification } from '../../src/Notification.js'

class MailNote extends Notification {
  public override via(): string[] {
    return ['mail']
  }

  public override toMail(): MailMessage {
    return new MailMessage().subject('Hi').mailer('ses')
  }
}

class MailNoteDefaultMailer extends Notification {
  public override via(): string[] {
    return ['mail']
  }

  public override toMail(): MailMessage {
    return new MailMessage().subject('Hi')
  }
}

class User extends Model {
  public static override table = 'users'
}

describe('MailChannel', () => {
  it('converts MailMessage to Mailable and sends', async () => {
    const sent: Mailable[] = []
    const mail = {
      to() {
        return {
          sendNow: async (m: Mailable) => {
            sent.push(m)
          },
        }
      },
    } as unknown as MailManager
    const ch = new MailChannel(mail)
    await ch.send(new AnonymousNotifiable().route('mail', 'a@b.com'), new MailNoteDefaultMailer())
    expect(sent).toHaveLength(1)
  })

  it('uses notifiable.routeNotificationFor("mail") as recipient', async () => {
    let recipient = ''
    const mail = {
      to(addr: string) {
        recipient = addr
        return { sendNow: async (_m: Mailable) => {} }
      },
    } as unknown as MailManager
    const u = new User()
    u.setAttribute('email', 'ignored@x.com')
    ;(u as unknown as { routeNotificationFor(c: string): string }).routeNotificationFor = (
      c: string,
    ) => (c === 'mail' ? 'routed@x.com' : '')
    const ch = new MailChannel(mail)
    await ch.send(u, new MailNoteDefaultMailer())
    expect(recipient).toBe('routed@x.com')
  })

  it('falls back to notifiable.email', async () => {
    let recipient = ''
    const mail = {
      to(addr: string) {
        recipient = addr
        return { sendNow: async (_m: Mailable) => {} }
      },
    } as unknown as MailManager
    const u = new User()
    u.setAttribute('email', 'user@example.com')
    const ch = new MailChannel(mail)
    await ch.send(u, new MailNoteDefaultMailer())
    expect(recipient).toBe('user@example.com')
  })

  it('respects MailMessage.mailer() for driver selection', async () => {
    const mailers: string[] = []
    const mail = {
      mailer(name: string) {
        mailers.push(name)
        return {
          to(_addr: string) {
            return { sendNow: async (_m: Mailable) => {} }
          },
        }
      },
      to(_addr: string) {
        return { sendNow: async (_m: Mailable) => {} }
      },
    } as unknown as MailManager
    const ch = new MailChannel(mail)
    await ch.send(new AnonymousNotifiable().route('mail', 'a@b.com'), new MailNote())
    expect(mailers).toEqual(['ses'])
  })
})

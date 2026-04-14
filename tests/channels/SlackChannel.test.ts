import { ConfigRepository } from '@atlex/config'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AnonymousNotifiable } from '../../src/AnonymousNotifiable.js'
import { SlackChannel } from '../../src/channels/SlackChannel.js'
import { SlackMessage } from '../../src/messages/SlackMessage.js'
import { Notification } from '../../src/Notification.js'

class SlackNote extends Notification {
  public override via(): string[] {
    return ['slack']
  }

  public override toSlack(): SlackMessage {
    return new SlackMessage().text('ping')
  }
}

describe('SlackChannel', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('POSTs payload to webhook from config', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const cfg = new ConfigRepository({
      services: { slack: { webhook_url: 'https://hooks.slack.com/services/xxx' } },
    })
    const ch = new SlackChannel(cfg)
    await ch.send(
      new AnonymousNotifiable().route('slack', 'https://hooks.slack.com/routed'),
      new SlackNote(),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toBe('https://hooks.slack.com/routed')
    expect(init?.method).toBe('POST')
    expect(
      String(init?.headers && (init.headers as Record<string, string>)['content-type']),
    ).toContain('json')
  })
})

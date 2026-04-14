import { describe, expect, it } from 'vitest'

import { SlackMessage } from '../../src/messages/SlackMessage.js'

describe('SlackMessage', () => {
  it('toPayload includes text', () => {
    const p = new SlackMessage().text('hello').toPayload()
    expect(p).toMatchObject({ text: 'hello' })
  })
})

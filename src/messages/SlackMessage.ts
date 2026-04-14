import { SlackAttachment } from './SlackAttachment.js'

export type SlackBlockElement = Record<string, unknown>

/**
 * Fluent Slack incoming-webhook message.
 */
export class SlackMessage {
  private _channel?: string
  private _text?: string
  private _username?: string
  private _emoji?: string
  private _image?: string
  private _attachments: SlackAttachment[] = []
  private _blocks: Record<string, unknown>[] = []
  private _unfurlLinks = true
  private _unfurlMedia = true

  public to(channel: string): this {
    this._channel = channel
    return this
  }

  public text(content: string): this {
    this._text = content
    return this
  }

  public from(username: string): this {
    this._username = username
    return this
  }

  public image(url: string): this {
    this._image = url
    return this
  }

  public emoji(emoji: string): this {
    this._emoji = emoji
    return this
  }

  public attachment(callback: (attachment: SlackAttachment) => void): this {
    const a = new SlackAttachment()
    callback(a)
    this._attachments.push(a)
    return this
  }

  public headerBlock(text: string): this {
    this._blocks.push({
      type: 'header',
      text: { type: 'plain_text', text, emoji: true },
    })
    return this
  }

  public dividerBlock(): this {
    this._blocks.push({ type: 'divider' })
    return this
  }

  public sectionBlock(text: string, accessory?: SlackBlockElement): this {
    const block: Record<string, unknown> = {
      type: 'section',
      text: { type: 'mrkdwn', text },
    }
    if (accessory !== undefined) {
      block.accessory = accessory
    }
    this._blocks.push(block)
    return this
  }

  public actionsBlock(elements: SlackBlockElement[]): this {
    this._blocks.push({ type: 'actions', elements })
    return this
  }

  public contextBlock(elements: { type: 'mrkdwn' | 'plain_text'; text: string }[]): this {
    this._blocks.push({
      type: 'context',
      elements: elements.map((e) =>
        e.type === 'mrkdwn'
          ? { type: 'mrkdwn', text: e.text }
          : { type: 'plain_text', text: e.text, emoji: true },
      ),
    })
    return this
  }

  public unfurlLinks(enabled: boolean): this {
    this._unfurlLinks = enabled
    return this
  }

  public unfurlMedia(enabled: boolean): this {
    this._unfurlMedia = enabled
    return this
  }

  /** Webhook JSON body. */
  public toPayload(): Record<string, unknown> {
    const out: Record<string, unknown> = {
      unfurl_links: this._unfurlLinks,
      unfurl_media: this._unfurlMedia,
    }
    if (this._channel !== undefined) out.channel = this._channel
    if (this._text !== undefined) out.text = this._text
    if (this._username !== undefined) out.username = this._username
    if (this._emoji !== undefined) out.icon_emoji = this._emoji
    if (this._image !== undefined) out.icon_url = this._image
    if (this._attachments.length > 0) {
      out.attachments = this._attachments.map((a) => a.toPayload())
    }
    if (this._blocks.length > 0) {
      out.blocks = this._blocks
    }
    return out
  }
}

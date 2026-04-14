interface SlackField {
  title: string
  value: string
  short?: boolean
}

/**
 * Slack incoming-webhook attachment builder.
 */
export class SlackAttachment {
  private _title?: string
  private _titleLink?: string
  private _text?: string
  private _pretext?: string
  private _color?: string
  private _fallback?: string
  private _fields: SlackField[] = []
  private _footer?: string
  private _footerIcon?: string
  private _timestamp?: number

  public title(title: string, url?: string): this {
    this._title = title
    this._titleLink = url
    return this
  }

  public content(text: string): this {
    this._text = text
    return this
  }

  public pretext(text: string): this {
    this._pretext = text
    return this
  }

  public color(color: string): this {
    this._color = color
    return this
  }

  public fallback(text: string): this {
    this._fallback = text
    return this
  }

  public field(title: string, value: string, short?: boolean): this {
    this._fields.push({ title, value, short })
    return this
  }

  public fields(fields: SlackField[]): this {
    this._fields.push(...fields)
    return this
  }

  public footer(text: string, icon?: string): this {
    this._footer = text
    this._footerIcon = icon
    return this
  }

  public timestamp(ts: Date | number): this {
    this._timestamp = typeof ts === 'number' ? ts : Math.floor(ts.getTime() / 1000)
    return this
  }

  /** Serialize for Slack JSON. */
  public toPayload(): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    if (this._title !== undefined) out.title = this._title
    if (this._titleLink !== undefined) out.title_link = this._titleLink
    if (this._text !== undefined) out.text = this._text
    if (this._pretext !== undefined) out.pretext = this._pretext
    if (this._color !== undefined) out.color = this._color
    if (this._fallback !== undefined) out.fallback = this._fallback
    if (this._fields.length > 0) out.fields = this._fields
    if (this._footer !== undefined) out.footer = this._footer
    if (this._footerIcon !== undefined) out.footer_icon = this._footerIcon
    if (this._timestamp !== undefined) out.ts = this._timestamp
    return out
  }
}

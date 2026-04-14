import { Mailable } from '@atlex/mail'

type LineEntry =
  | { kind: 'line'; text: string }
  | { kind: 'action'; text: string; url: string; color?: string }

interface PendingStorageAttach {
  disk: string
  path: string
  as?: string
  mime?: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Fluent mail body builder for notifications; converts to {@link Mailable}.
 */
export class MailMessage {
  private _subject?: string
  private _greeting?: string
  private _salutation?: string
  private _lines: LineEntry[] = []
  private _from?: { address: string; name?: string }
  private _replyTo?: { address: string; name?: string }
  private _cc: string[] = []
  private _bcc: string[] = []
  private _attachments: { path?: string; data?: Buffer; name: string; mime?: string }[] = []
  private _pendingStorage: PendingStorageAttach[] = []
  private _tags: string[] = []
  private _metadata: Record<string, string> = {}
  private _priority: 'high' | 'normal' | 'low' = 'normal'
  private _level: 'info' | 'success' | 'error' = 'info'
  private _mailerName?: string
  private _viewData: Record<string, unknown> = {}
  private _markdown?: string

  public subject(text: string): this {
    this._subject = text
    return this
  }

  public greeting(text: string): this {
    this._greeting = text
    return this
  }

  public salutation(text: string): this {
    this._salutation = text
    return this
  }

  public line(text: string): this {
    this._lines.push({ kind: 'line', text })
    return this
  }

  public lines(texts: string[]): this {
    for (const t of texts) this.line(t)
    return this
  }

  public action(text: string, url: string, color?: 'primary' | 'success' | 'error'): this {
    this._lines.push({ kind: 'action', text, url, color })
    return this
  }

  public from(address: string, name?: string): this {
    this._from = { address, name }
    return this
  }

  public replyTo(address: string, name?: string): this {
    this._replyTo = { address, name }
    return this
  }

  public cc(address: string | string[]): this {
    const list = Array.isArray(address) ? address : [address]
    this._cc.push(...list)
    return this
  }

  public bcc(address: string | string[]): this {
    const list = Array.isArray(address) ? address : [address]
    this._bcc.push(...list)
    return this
  }

  public attach(filePath: string, options?: { as?: string; mime?: string }): this {
    this._attachments.push({
      path: filePath,
      name: options?.as ?? filePath.split('/').pop() ?? 'attachment',
      mime: options?.mime,
    })
    return this
  }

  public attachFromStorage(
    disk: string,
    path: string,
    options?: { as?: string; mime?: string },
  ): this {
    this._pendingStorage.push({ disk, path, as: options?.as, mime: options?.mime })
    return this
  }

  public attachData(data: Buffer, name: string, options?: { mime?: string }): this {
    this._attachments.push({ data, name, mime: options?.mime })
    return this
  }

  public tag(tag: string): this {
    this._tags.push(tag)
    return this
  }

  public metadata(key: string, value: string): this {
    this._metadata[key] = value
    return this
  }

  public priority(level: 'high' | 'normal' | 'low'): this {
    this._priority = level
    return this
  }

  public level(level: 'info' | 'success' | 'error'): this {
    this._level = level
    return this
  }

  public success(): this {
    return this.level('success')
  }

  public error(): this {
    return this.level('error')
  }

  public mailer(name: string): this {
    this._mailerName = name
    return this
  }

  /**
   * @returns Mailer key when {@link MailMessage.mailer} was set.
   */
  public getMailerName(): string | undefined {
    return this._mailerName
  }

  public markdown(view: string): this {
    this._markdown = view
    return this
  }

  public with(key: string, value: unknown): this
  public with(data: Record<string, unknown>): this
  public with(keyOrData: string | Record<string, unknown>, value?: unknown): this {
    if (typeof keyOrData === 'string') {
      this._viewData[keyOrData] = value
    } else {
      Object.assign(this._viewData, keyOrData)
    }
    return this
  }

  /**
   * Build HTML body (best-effort) from lines / greeting / salutation.
   */
  private renderHtml(): string {
    const parts: string[] = []
    if (this._greeting !== undefined) {
      parts.push(`<p>${escapeHtml(this._greeting)}</p>`)
    }
    for (const line of this._lines) {
      if (line.kind === 'line') {
        parts.push(`<p>${escapeHtml(line.text)}</p>`)
      } else {
        const href = escapeHtml(line.url)
        parts.push(
          `<p><a href="${href}" style="display:inline-block;padding:8px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:4px;">${escapeHtml(line.text)}</a></p>`,
        )
      }
    }
    if (this._salutation !== undefined) {
      parts.push(`<p>${escapeHtml(this._salutation)}</p>`)
    }
    if (parts.length === 0 && this._markdown !== undefined) {
      return `<p>View: ${escapeHtml(this._markdown)}</p>`
    }
    const body = parts.join('\n')
    if (body === '') {
      return body
    }
    return `<div data-atlex-level="${escapeHtml(this._level)}">${body}</div>`
  }

  /**
   * Resolve storage-backed attachments then produce a {@link Mailable}.
   *
   * @param _notifiable - Recipient entity (reserved for future use).
   */
  public async toMailable(_notifiable: unknown): Promise<Mailable> {
    for (const p of this._pendingStorage) {
      try {
        interface StorageModule {
          storage: () => { disk: (name: string) => { get: (path: string) => Promise<Buffer> } }
        }
        const mod = (await import('@atlex/storage')) as StorageModule
        const manager = mod.storage()
        const buf = await manager.disk(p.disk).get(p.path)
        this._attachments.push({
          data: buf,
          name: p.as ?? p.path.split('/').pop() ?? 'file',
          mime: p.mime,
        })
      } catch {
        throw new Error(
          `attachFromStorage failed for "${p.disk}:${p.path}". Ensure @atlex/storage is installed and the disk/path exists.`,
        )
      }
    }
    this._pendingStorage = []

    const subject = this._subject ?? 'Notification'
    const html = this.renderHtml()
    const mailerOpt = this._mailerName !== undefined ? { mailer: this._mailerName } : undefined
    const fromAddr = this._from
    const reply = this._replyTo
    const ccList = [...this._cc]
    const bccList = [...this._bcc]
    const attachList = [...this._attachments]
    const viewData = { ...this._viewData }
    const pri = this._priority

    class NotificationMailable extends Mailable {
      public constructor() {
        super(mailerOpt)
      }

      public build(): this {
        this.subject(subject)
        this.html(html)
        if (fromAddr !== undefined) {
          this.from(fromAddr.address, fromAddr.name)
        }
        if (reply !== undefined) {
          this.replyTo(reply.address, reply.name)
        }
        for (const c of ccList) {
          this.cc(c)
        }
        for (const b of bccList) {
          this.bcc(b)
        }
        for (const a of attachList) {
          if (a.path !== undefined) {
            this.attach(a.path, { as: a.name, mime: a.mime })
          } else if (a.data !== undefined) {
            this.attachData(a.data, a.name, { mime: a.mime })
          }
        }
        this.with(viewData)
        if (pri === 'high') {
          this.priority(1)
        } else if (pri === 'low') {
          this.priority(5)
        } else {
          this.priority(3)
        }
        return this
      }
    }

    return new NotificationMailable()
  }
}

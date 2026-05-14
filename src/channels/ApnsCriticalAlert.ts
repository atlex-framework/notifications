/**
 * Shape of the APNs `aps.sound` object required for critical alerts.
 */
export interface ApnsCriticalAlertSound {
  /** Must be `1` to activate a critical alert. */
  critical: 1
  /** Sound file name; use `'default'` for the system sound. */
  name: string
  /** Playback volume between 0.0 and 1.0. */
  volume: number
}

/**
 * Full APNs payload shape produced by {@link ApnsCriticalAlert.toPayload}.
 *
 * Top-level keys beyond `aps` (e.g. `deepLink`) are custom data fields
 * delivered to the app alongside the notification.
 */
export interface ApnsPayload {
  aps: {
    alert: { title: string; body: string }
    sound: ApnsCriticalAlertSound
    'content-available'?: 1
  }
  [key: string]: unknown
}

/**
 * Fluent builder for APNs critical alert payloads.
 *
 * **Apple Entitlement Required:**
 * Critical alerts require the entitlement
 * `com.apple.developer.usernotifications.critical-alerts`, which must be
 * requested from Apple at
 * https://developer.apple.com/contact/request/notifications-critical-alerts-entitlement/
 * and declared in your app's `Entitlements.plist`:
 * ```xml
 * <key>com.apple.developer.usernotifications.critical-alerts</key>
 * <true/>
 * ```
 * Without this entitlement the device silently delivers the notification as
 * a standard push — it will NOT bypass Do Not Disturb.
 *
 * @example
 * new ApnsCriticalAlert()
 *   .title('Emergency Alert')
 *   .body('Child triggered SOS')
 *   .sound({ critical: 1, name: 'default', volume: 1.0 })
 *   .contentAvailable()
 *   .deepLink('kidup://super-signal/abc123')
 */
export class ApnsCriticalAlert {
  private _title = ''
  private _body = ''
  private _sound: ApnsCriticalAlertSound = { critical: 1, name: 'default', volume: 1.0 }
  private _contentAvailable = false
  private _customData: Record<string, unknown> = {}

  /**
   * Set the notification title displayed in the alert banner.
   *
   * @param value - Title text.
   * @returns this
   */
  public title(value: string): this {
    this._title = value
    return this
  }

  /**
   * Set the notification body displayed below the title.
   *
   * @param value - Body text.
   * @returns this
   */
  public body(value: string): this {
    this._body = value
    return this
  }

  /**
   * Set the APNs `aps.sound` object. `critical: 1` is required by Apple for
   * a critical alert. Defaults to `{ critical: 1, name: 'default', volume: 1.0 }`.
   *
   * @param value - Sound configuration.
   * @returns this
   */
  public sound(value: ApnsCriticalAlertSound): this {
    this._sound = value
    return this
  }

  /**
   * Set `content-available: 1` in the `aps` payload.
   * Required for background processing on a locked device.
   *
   * @returns this
   */
  public contentAvailable(): this {
    this._contentAvailable = true
    return this
  }

  /**
   * Add a deep link URI as the top-level `deepLink` payload key.
   * The app receives this alongside the `aps` object.
   *
   * @param url - Deep link URI, e.g. `kidup://super-signal/abc123`.
   * @returns this
   */
  public deepLink(url: string): this {
    this._customData['deepLink'] = url
    return this
  }

  /**
   * Add an arbitrary top-level custom payload key.
   * Values must be JSON-serialisable.
   *
   * @param key   - Top-level key name (must not be `'aps'`).
   * @param value - JSON-serialisable value.
   * @returns this
   */
  public data(key: string, value: unknown): this {
    this._customData[key] = value
    return this
  }

  /**
   * Build and return the complete APNs payload object.
   * Pass this to your APNs HTTP/2 client's send method.
   *
   * @returns Full APNs payload ready for JSON serialisation.
   */
  public toPayload(): ApnsPayload {
    const aps: ApnsPayload['aps'] = {
      alert: { title: this._title, body: this._body },
      sound: this._sound,
    }
    if (this._contentAvailable) {
      aps['content-available'] = 1
    }
    return { aps, ...this._customData }
  }
}

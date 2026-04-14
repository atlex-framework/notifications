import { AtlexError } from '@atlex/core'

/**
 * Thrown when a channel delivery fails (e.g. Slack webhook non-2xx).
 */
export class NotificationFailedException extends AtlexError {
  public constructor(
    message: string,
    public readonly channel: string,
    public override readonly cause?: Error,
  ) {
    super(message, 'E_NOTIFICATION_CHANNEL_FAILED')
  }
}

import { AtlexError } from '@atlex/core'

/**
 * Thrown when a notifiable has no route for a required channel (e.g. missing email for mail).
 */
export class NotificationRoutingException extends AtlexError {
  public constructor(message: string) {
    super(message, 'E_NOTIFICATION_NO_ROUTE')
  }
}

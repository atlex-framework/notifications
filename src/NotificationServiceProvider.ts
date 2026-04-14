import type { ConfigRepository } from '@atlex/config'
import type { Application } from '@atlex/core'
import { ServiceProvider } from '@atlex/core'

import { DatabaseChannel } from './channels/DatabaseChannel.js'
import { MailChannel } from './channels/MailChannel.js'
import { SlackChannel } from './channels/SlackChannel.js'
import { NotificationManager } from './NotificationManager.js'

/**
 * Registers the notification manager and default channels (`mail`, `database`, `slack`).
 */
export class NotificationServiceProvider extends ServiceProvider {
  /** @inheritdoc */
  public register(app: Application): void {
    app.singleton('notifications', () => {
      const manager = new NotificationManager(app)
      manager.channel('mail', new MailChannel(app.make('mail')))
      manager.channel('database', new DatabaseChannel())
      manager.channel('slack', new SlackChannel(app.make<ConfigRepository>('config')))
      return manager
    })
  }

  /** @inheritdoc */
  public boot(_app: Application): void {
    // Reserved for channel macros / CLI registration.
  }
}

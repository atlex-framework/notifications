# @atlex/notifications

> Multi-channel notifications: mail, Slack, and database.

[![npm](https://img.shields.io/npm/v/@atlex/notifications.svg?style=flat-square&color=7c3aed)](https://www.npmjs.com/package/@atlex/notifications)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-7c3aed.svg?style=flat-square)](https://www.typescriptlang.org/)

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support-yellow?style=flat-square&logo=buy-me-a-coffee)](https://buymeacoffee.com/khamazaspyan)

## Installation

```bash
npm install @atlex/notifications
# or
yarn add @atlex/notifications
```

## Quick Start

```typescript
import { Notification, MailChannel, MailMessage } from '@atlex/notifications'

class OrderShippedNotification extends Notification {
  constructor(private order: any) {
    super()
  }

  via() {
    return ['mail']
  }

  toMail() {
    return new MailMessage()
      .subject(`Order ${this.order.id} has shipped`)
      .greeting('Hello!')
      .line('Your order is on the way.')
      .action('Track Order', `https://example.com/orders/${this.order.id}`)
      .line('Thank you for your purchase!')
  }
}

// Send notification
const user = { email: 'user@example.com' }
await user.notify(new OrderShippedNotification(order))
```

## Features

- **Multi-Channel Delivery**: Send via mail, Slack, database, or custom channels
- **Fluent API**: Build notifications with a clean, expressive interface
- **Delayed Delivery**: Schedule notifications to be sent later
- **Conditional Routing**: Decide delivery channels based on notification content
- **Broadcast Notifications**: Send to multiple channels simultaneously
- **Notifiable Models**: Add notification support to any model
- **Event Hooks**: Listen to notification lifecycle events
- **Queue Integration**: Async notification delivery with job queues

## Creating Notifications

### Basic Notification Class

```typescript
import { Notification, MailMessage, DatabaseMessage } from '@atlex/notifications'

class WelcomeNotification extends Notification {
  constructor(private userName: string) {
    super()
  }

  // Define which channels to use
  via() {
    return ['mail', 'database']
  }

  // Build mail notification
  toMail() {
    return new MailMessage()
      .subject('Welcome to Our Platform')
      .greeting(`Hello ${this.userName}!`)
      .line('Thanks for joining us.')
      .action('Get Started', 'https://example.com/setup')
      .line('We are excited to have you on board!')
  }

  // Build database notification
  toDatabase() {
    return new DatabaseMessage()
      .title('Welcome to Our Platform')
      .message(`Hello ${this.userName}, thanks for joining us!`)
  }
}
```

## Notification Channels

### Mail Channel

```typescript
import { MailMessage } from '@atlex/notifications'

class PaymentConfirmedNotification extends Notification {
  constructor(private amount: number) {
    super()
  }

  via() {
    return ['mail']
  }

  toMail() {
    return new MailMessage()
      .subject(`Payment of $${this.amount} confirmed`)
      .greeting('Hello!')
      .line(`We have received your payment of $${this.amount}.`)
      .line(`Transaction ID: TXN-${Date.now()}`)
      .line('Thank you!')
      .salutation('Best regards,\nThe Team')
  }
}
```

### Database Channel

```typescript
import { DatabaseMessage } from '@atlex/notifications'

class CommentReplyNotification extends Notification {
  constructor(
    private comment: any,
    private author: string,
  ) {
    super()
  }

  via() {
    return ['database']
  }

  toDatabase() {
    return new DatabaseMessage()
      .title('New reply to your comment')
      .message(`${this.author} replied: "${this.comment.text}"`)
      .action('View Comment', `/comments/${this.comment.id}`)
  }
}
```

### Slack Channel

```typescript
import { SlackMessage, SlackAttachment } from '@atlex/notifications'

class DeploymentFailedNotification extends Notification {
  constructor(
    private deployment: any,
    private error: string,
  ) {
    super()
  }

  via() {
    return ['slack']
  }

  toSlack() {
    return new SlackMessage().text('Deployment failed!').attachment(
      new SlackAttachment()
        .title('Deployment Status')
        .fields({
          Environment: this.deployment.environment,
          Branch: this.deployment.branch,
          Error: this.error,
        })
        .markdown(),
    )
  }
}
```

## Notifiable Models

### Adding Notification Support

```typescript
import { Notifiable } from '@atlex/notifications'

class User extends Notifiable {
  id: number
  email: string
  name: string

  // Implement routing for notifications
  routeNotificationFor(channel: string) {
    if (channel === 'mail') {
      return this.email
    }
    if (channel === 'slack') {
      return this.slackUserId // Custom property
    }
    return null
  }

  // Define preferred notification channels
  preferredChannels() {
    return ['mail', 'database']
  }
}
```

### Sending Notifications

```typescript
const user = await User.find(1)

// Send single notification
await user.notify(new WelcomeNotification(user.name))

// Send and wait for queue
await user.notifyNow(new PaymentConfirmedNotification(100))

// Send to multiple recipients
const users = await User.all()
for (const user of users) {
  await user.notify(new NewsletterNotification())
}
```

## Conditional Routing

```typescript
import { Notification } from '@atlex/notifications'

class SecurityAlertNotification extends Notification {
  constructor(private severity: 'low' | 'medium' | 'high') {
    super()
  }

  via(notifiable: any) {
    // Route based on severity
    if (this.severity === 'high') {
      return ['mail', 'slack']
    }
    return ['database']
  }

  shouldSend(notifiable: any) {
    // Check if user wants to receive this type
    return notifiable.notificationPreferences?.securityAlerts ?? true
  }
}
```

## Delayed Notifications

```typescript
import { Notification } from '@atlex/notifications'

class ReminderNotification extends Notification {
  via() {
    return ['mail']
  }

  deliveryDelay() {
    // Delay 24 hours
    return 24 * 60 * 60 * 1000
  }

  toMail() {
    return new MailMessage()
      .subject('Your appointment is tomorrow')
      .line('This is a friendly reminder...')
  }
}

// Schedule notification with delay
await user.notify(new ReminderNotification())
```

## Broadcast Notifications

```typescript
import { AnonymousNotifiable } from '@atlex/notifications'

// Send to multiple recipients without model binding
const notifiable = new AnonymousNotifiable()
  .route('mail', 'user1@example.com')
  .route('mail', 'user2@example.com')
  .route('slack', 'slack-channel-id')

await notifiable.notify(new SystemAnnouncementNotification())
```

## Notification Events

```typescript
import { NotificationSending, NotificationSent, NotificationFailed } from '@atlex/notifications'
import { EventEmitter } from '@atlex/events'

const emitter = new EventEmitter()

// Listen to sending event
emitter.on('notification.sending', (event: NotificationSending) => {
  console.log(`Sending ${event.notification.constructor.name}`)
})

// Listen to sent event
emitter.on('notification.sent', (event: NotificationSent) => {
  console.log(`Notification sent successfully`)
})

// Listen to failed event
emitter.on('notification.failed', (event: NotificationFailed) => {
  console.error(`Notification failed: ${event.error}`)
})
```

## Database Notifications

### DatabaseNotification Model

```typescript
import { DatabaseNotification } from '@atlex/notifications'

// Retrieve notifications for a user
const notifications = await DatabaseNotification.where('notifiable_id', userId)
  .where('notifiable_type', 'User')
  .get()

// Mark as read
await notification.markAsRead()

// Mark all as read
await DatabaseNotification.where('notifiable_id', userId).update({ readAt: new Date() })
```

### Notification Data Structure

```typescript
const notification = {
  id: 'uuid',
  notifiable_id: 1,
  notifiable_type: 'User',
  type: 'OrderShipped',
  data: {
    orderId: 123,
    trackingNumber: 'TRACK123',
  },
  readAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}
```

## NotificationManager Configuration

```typescript
import { NotificationManager } from '@atlex/notifications'
import { MailChannel, DatabaseChannel, SlackChannel } from '@atlex/notifications'

const manager = new NotificationManager()

// Register mail channel
manager.channel(
  'mail',
  new MailChannel({
    from: 'noreply@example.com',
    transport: 'smtp',
  }),
)

// Register database channel
manager.channel('database', new DatabaseChannel())

// Register Slack channel
manager.channel(
  'slack',
  new SlackChannel({
    webhook: process.env.SLACK_WEBHOOK_URL,
  }),
)

// Extend with custom channel
manager.extend(
  'sms',
  new SMSChannel({
    apiKey: process.env.SMS_API_KEY,
  }),
)
```

## Complete Example

```typescript
import {
  Notification,
  MailMessage,
  DatabaseMessage,
  SlackMessage,
  SlackAttachment,
  Notifiable,
} from '@atlex/notifications'

class Order extends Notifiable {
  id: number
  status: string
  userId: number
  total: number

  routeNotificationFor(channel: string) {
    if (channel === 'mail') {
      return this.user.email
    }
    if (channel === 'slack') {
      return this.user.slackId
    }
    return null
  }
}

class OrderStatusChangedNotification extends Notification {
  constructor(
    private order: Order,
    private oldStatus: string,
    private newStatus: string,
  ) {
    super()
  }

  via() {
    return ['mail', 'database', 'slack']
  }

  toMail() {
    return new MailMessage()
      .subject(`Order #${this.order.id} status updated`)
      .greeting(`Hello ${this.order.user.name}!`)
      .line(`Your order status has changed from ${this.oldStatus} to ${this.newStatus}.`)
      .action('View Order', `https://example.com/orders/${this.order.id}`)
      .line('Thank you!')
  }

  toDatabase() {
    return new DatabaseMessage()
      .title(`Order #${this.order.id} ${this.newStatus}`)
      .message(`Your order status changed to ${this.newStatus}.`)
      .action('View Order', `/orders/${this.order.id}`)
  }

  toSlack() {
    return new SlackMessage().text(`Order ${this.order.id} status changed`).attachment(
      new SlackAttachment()
        .title('Order Update')
        .fields({
          'Order ID': `#${this.order.id}`,
          'Previous Status': this.oldStatus,
          'New Status': this.newStatus,
          Total: `$${this.order.total}`,
        })
        .color('#2E7D32'),
    )
  }
}

// Usage
const order = await Order.find(123)
await order.notify(new OrderStatusChangedNotification(order, 'pending', 'shipped'))
```

## API Overview

### Notification

| Method                       | Description               |
| ---------------------------- | ------------------------- |
| `via(notifiable?)`           | Define delivery channels  |
| `toMail()`                   | Build mail message        |
| `toDatabase()`               | Build database message    |
| `toSlack()`                  | Build Slack message       |
| `toArray()`                  | Convert to array format   |
| `toBroadcast()`              | Send to multiple channels |
| `shouldSend(notifiable?)`    | Check if should send      |
| `deliveryDelay(notifiable?)` | Get delivery delay        |

### Notifiable

| Method                          | Description                    |
| ------------------------------- | ------------------------------ |
| `notify(notification)`          | Send notification              |
| `notifyNow(notification)`       | Send immediately without queue |
| `routeNotificationFor(channel)` | Get notification route         |

### Channels

| Channel           | Description         |
| ----------------- | ------------------- |
| `MailChannel`     | Email notifications |
| `DatabaseChannel` | Store in database   |
| `SlackChannel`    | Send to Slack       |

## Documentation

For complete documentation, visit [https://atlex.dev/guide/notifications](https://atlex.dev/guide/notifications)

## License

MIT

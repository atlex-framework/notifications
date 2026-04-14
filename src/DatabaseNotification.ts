import { Model, type QueryBuilder } from '@atlex/orm'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * ORM model for the `notifications` table (database channel).
 */
export class DatabaseNotification extends Model {
  public static override table = 'notifications'
  public static override primaryKey = 'id'
  public static override incrementing = false
  public static override fillable = [
    'id',
    'type',
    'notifiable_type',
    'notifiable_id',
    'data',
    'read_at',
  ]

  /**
   * Unread notifications (`read_at` IS NULL).
   */
  public static scopeUnread(
    qb: QueryBuilder<DatabaseNotification>,
  ): QueryBuilder<DatabaseNotification> {
    return qb.whereNull('read_at')
  }

  /**
   * Read notifications (`read_at` IS NOT NULL).
   */
  public static scopeRead(
    qb: QueryBuilder<DatabaseNotification>,
  ): QueryBuilder<DatabaseNotification> {
    return qb.whereNotNull('read_at')
  }

  /** Parsed JSON from `data` column (alias of {@link getDataObject}). */
  public get data(): Record<string, unknown> {
    return this.getDataObject()
  }

  /** Parsed JSON from `data` column. */
  public getDataObject(): Record<string, unknown> {
    const raw = this.getAttribute('data')
    if (typeof raw === 'string') {
      try {
        const parsed: unknown = JSON.parse(raw)
        return isRecord(parsed) ? parsed : {}
      } catch {
        return {}
      }
    }
    if (isRecord(raw)) {
      return raw
    }
    return {}
  }

  /** Whether `read_at` is set. */
  public get isRead(): boolean {
    return this.getAttribute('read_at') !== null && this.getAttribute('read_at') !== undefined
  }

  /** Whether still unread. */
  public get isUnread(): boolean {
    return !this.isRead
  }

  /**
   * Mark notification as read.
   */
  public async markAsRead(): Promise<void> {
    this.setAttribute('read_at', new Date())
    await this.save()
  }

  /**
   * Mark notification as unread.
   */
  public async markAsUnread(): Promise<void> {
    this.setAttribute('read_at', null)
    await this.save()
  }
}

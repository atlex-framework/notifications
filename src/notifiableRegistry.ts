import type { Model } from '@atlex/orm'

const modelCtors = new Map<string, typeof Model>()

/**
 * Register a {@link Model} subclass so queued notifications can reload it by `constructor.name`.
 *
 * @param ctor - Notifiable model class.
 */
export function registerNotifiableModel(ctor: typeof Model): void {
  modelCtors.set(ctor.name, ctor)
}

/**
 * @internal
 */
export function resolveNotifiableModel(className: string): typeof Model | null {
  return modelCtors.get(className) ?? null
}

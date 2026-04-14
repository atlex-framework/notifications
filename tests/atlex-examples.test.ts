import { describe, expect, it } from 'vitest'

import { AnonymousNotifiable } from '../src/AnonymousNotifiable.js'

describe('@atlex/notifications examples', () => {
  it('AnonymousNotifiable route mail', () => {
    const n = new AnonymousNotifiable().route('mail', 'a@b.co')
    expect(n.routeNotificationFor('mail')).toBe('a@b.co')
  })

  it('routesRecord snapshot', () => {
    const n = new AnonymousNotifiable().route('mail', 'x@y.z').route('slack', 'https://h')
    expect(n.routesRecord().mail).toBe('x@y.z')
  })

  it('chained route returns this', () => {
    const n = new AnonymousNotifiable()
    expect(n.route('mail', 'a@b.co')).toBe(n)
  })

  it('route slack', () => {
    const n = new AnonymousNotifiable().route('slack', 'u')
    expect(n.routeNotificationFor('slack')).toBe('u')
  })

  it('empty routesRecord', () => {
    expect(new AnonymousNotifiable().routesRecord()).toEqual({})
  })
})

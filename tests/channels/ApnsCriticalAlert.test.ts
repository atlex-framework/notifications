import { describe, it, expect } from 'vitest'
import { ApnsCriticalAlert } from '../../src/channels/ApnsCriticalAlert.js'

describe('ApnsCriticalAlert', () => {
  it('toPayload includes alert title and body', () => {
    const payload = new ApnsCriticalAlert().title('Emergency').body('SOS triggered').toPayload()
    expect(payload.aps.alert.title).toBe('Emergency')
    expect(payload.aps.alert.body).toBe('SOS triggered')
  })

  it('toPayload sets sound.critical = 1 by default', () => {
    const payload = new ApnsCriticalAlert().toPayload()
    expect(payload.aps.sound.critical).toBe(1)
  })

  it('toPayload uses custom sound values', () => {
    const payload = new ApnsCriticalAlert()
      .sound({ critical: 1, name: 'alarm.caf', volume: 0.8 })
      .toPayload()
    expect(payload.aps.sound.name).toBe('alarm.caf')
    expect(payload.aps.sound.volume).toBe(0.8)
  })

  it('toPayload does NOT include content-available by default', () => {
    const payload = new ApnsCriticalAlert().toPayload()
    expect(payload.aps['content-available']).toBeUndefined()
  })

  it('contentAvailable() sets content-available: 1', () => {
    const payload = new ApnsCriticalAlert().contentAvailable().toPayload()
    expect(payload.aps['content-available']).toBe(1)
  })

  it('deepLink() adds deepLink as top-level payload key', () => {
    const payload = new ApnsCriticalAlert().deepLink('kidup://super-signal/abc123').toPayload()
    expect(payload['deepLink']).toBe('kidup://super-signal/abc123')
  })

  it('data() adds arbitrary top-level payload keys', () => {
    const payload = new ApnsCriticalAlert()
      .data('eventId', 'ev-001')
      .data('childId', 42)
      .toPayload()
    expect(payload['eventId']).toBe('ev-001')
    expect(payload['childId']).toBe(42)
  })

  it('builder methods return this (fluent chaining)', () => {
    const alert = new ApnsCriticalAlert()
    expect(alert.title('T')).toBe(alert)
    expect(alert.body('B')).toBe(alert)
    expect(alert.sound({ critical: 1, name: 'default', volume: 1.0 })).toBe(alert)
    expect(alert.contentAvailable()).toBe(alert)
    expect(alert.deepLink('kidup://x')).toBe(alert)
    expect(alert.data('k', 'v')).toBe(alert)
  })

  it('full critical alert payload matches expected shape', () => {
    const payload = new ApnsCriticalAlert()
      .title('Emergency Alert')
      .body('Child triggered SOS')
      .sound({ critical: 1, name: 'default', volume: 1.0 })
      .contentAvailable()
      .deepLink('kidup://super-signal/evt-99')
      .toPayload()

    expect(payload).toEqual({
      aps: {
        alert: { title: 'Emergency Alert', body: 'Child triggered SOS' },
        sound: { critical: 1, name: 'default', volume: 1.0 },
        'content-available': 1,
      },
      deepLink: 'kidup://super-signal/evt-99',
    })
  })
})

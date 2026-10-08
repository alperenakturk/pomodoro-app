import { describe, it, expect, vi, afterEach } from 'vitest'
import { notify } from './alert'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('notify', () => {
  it('does nothing when the Notification API is missing', () => {
    expect(() => notify('t', 'b')).not.toThrow()
  })

  it('does not notify without permission', () => {
    const ctor = vi.fn()
    ctor.permission = 'default'
    vi.stubGlobal('Notification', ctor)
    notify('t', 'b')
    expect(ctor).not.toHaveBeenCalled()
  })

  it('shows a notification when permitted', () => {
    const ctor = vi.fn()
    ctor.permission = 'granted'
    vi.stubGlobal('Notification', ctor)
    notify('t', 'b')
    expect(ctor).toHaveBeenCalledWith('t', { body: 'b' })
  })

  it("doesn't throw when the constructor throws (mobile browsers), and falls back to the service worker", async () => {
    const ctor = vi.fn(() => {
      throw new TypeError('Illegal constructor')
    })
    ctor.permission = 'granted'
    vi.stubGlobal('Notification', ctor)
    const showNotification = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve({ showNotification }) } })

    expect(() => notify('t', 'b')).not.toThrow()
    await Promise.resolve()
    await Promise.resolve()
    expect(showNotification).toHaveBeenCalledWith('t', { body: 'b' })
  })

  it("doesn't throw when the constructor throws and no service worker exists", () => {
    const ctor = vi.fn(() => {
      throw new TypeError('Illegal constructor')
    })
    ctor.permission = 'granted'
    vi.stubGlobal('Notification', ctor)
    expect(() => notify('t', 'b')).not.toThrow()
  })
})

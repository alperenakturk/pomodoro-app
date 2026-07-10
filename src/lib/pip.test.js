import { describe, it, expect, afterEach } from 'vitest'
import { isPipSupported, copyStylesToWindow, fillPipDocument } from './pip'

describe('isPipSupported', () => {
  afterEach(() => {
    delete window.documentPictureInPicture
  })

  it('is true when window.documentPictureInPicture exists', () => {
    window.documentPictureInPicture = {}
    expect(isPipSupported()).toBe(true)
  })

  it('is false when window.documentPictureInPicture is absent (e.g. Safari)', () => {
    expect(isPipSupported()).toBe(false)
  })
})

describe('copyStylesToWindow', () => {
  it('copies each of document.styleSheets as an inline <style> into the pip window', () => {
    const styleEl = document.createElement('style')
    styleEl.textContent = '.test-pip-rule { color: red; }'
    document.head.appendChild(styleEl)

    const appended = []
    const pipWindow = {
      document: {
        head: { appendChild: (el) => appended.push(el) },
      },
    }

    copyStylesToWindow(pipWindow)

    expect(appended.length).toBeGreaterThan(0)
    expect(appended.some((el) => el.tagName === 'STYLE' && el.textContent.includes('test-pip-rule'))).toBe(
      true
    )

    document.head.removeChild(styleEl)
  })
})

describe('fillPipDocument', () => {
  it('sets html and body to 100% height and zeroes body margin', () => {
    const pipWindow = {
      document: {
        documentElement: { style: {} },
        body: { style: {} },
      },
    }

    fillPipDocument(pipWindow)

    expect(pipWindow.document.documentElement.style.height).toBe('100%')
    expect(pipWindow.document.body.style.height).toBe('100%')
    expect(pipWindow.document.body.style.margin).toBe('0')
  })
})

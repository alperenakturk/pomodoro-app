import { describe, it, expect } from 'vitest'
import { parseRichText } from './richText'

describe('parseRichText', () => {
  it('returns an empty array for empty/missing text', () => {
    expect(parseRichText('')).toEqual([])
    expect(parseRichText(undefined)).toEqual([])
  })

  it('treats a single block with no markers as one paragraph', () => {
    expect(parseRichText('Just a plain sentence.')).toEqual([
      { type: 'paragraph', text: 'Just a plain sentence.' },
    ])
  })

  it('splits blank-line-separated blocks into separate paragraphs', () => {
    expect(parseRichText('First paragraph.\n\nSecond paragraph.')).toEqual([
      { type: 'paragraph', text: 'First paragraph.' },
      { type: 'paragraph', text: 'Second paragraph.' },
    ])
  })

  it('recognizes a "## " block as a heading, stripping the marker', () => {
    expect(parseRichText('## A heading')).toEqual([{ type: 'heading', text: 'A heading' }])
  })

  it('recognizes a block of "- " lines as a bullet list', () => {
    expect(parseRichText('- First point.\n- Second point.')).toEqual([
      { type: 'list', items: ['First point.', 'Second point.'] },
    ])
  })

  it('does not treat a block as a list unless every line starts with "- "', () => {
    expect(parseRichText('- First point.\nNot a bullet.')).toEqual([
      { type: 'paragraph', text: '- First point.\nNot a bullet.' },
    ])
  })

  it('parses a realistic mix of headings, paragraphs, and lists in order', () => {
    const text = [
      'Intro paragraph.',
      '## Section heading',
      '- Point one.\n- Point two.',
      'Closing paragraph.',
    ].join('\n\n')
    expect(parseRichText(text)).toEqual([
      { type: 'paragraph', text: 'Intro paragraph.' },
      { type: 'heading', text: 'Section heading' },
      { type: 'list', items: ['Point one.', 'Point two.'] },
      { type: 'paragraph', text: 'Closing paragraph.' },
    ])
  })
})

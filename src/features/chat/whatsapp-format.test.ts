import { describe, expect, it } from 'vitest'
import { parseInline, parseWhatsAppText } from './whatsapp-format'

const text = (value: string) => ({ type: 'text', text: value })

describe('parseInline', () => {
  it('parses bold, italic, strikethrough and inline code', () => {
    expect(parseInline('*bold* _italic_ ~strike~ `code`')).toEqual([
      { type: 'bold', children: [text('bold')] },
      text(' '),
      { type: 'italic', children: [text('italic')] },
      text(' '),
      { type: 'strike', children: [text('strike')] },
      text(' '),
      { type: 'code', text: 'code' },
    ])
  })

  it('nests formatting', () => {
    expect(parseInline('*bold _and italic_*')).toEqual([
      {
        type: 'bold',
        children: [text('bold '), { type: 'italic', children: [text('and italic')] }],
      },
    ])
  })

  it('requires markers to wrap non-space content', () => {
    expect(parseInline('* not bold *')).toEqual([text('* not bold *')])
    expect(parseInline('a ** b')).toEqual([text('a ** b')])
    expect(parseInline('*a * b*')).toEqual([{ type: 'bold', children: [text('a * b')] }])
  })

  it('does not format inside words', () => {
    expect(parseInline('snake_case_name')).toEqual([text('snake_case_name')])
    expect(parseInline('2*3*4')).toEqual([text('2*3*4')])
    expect(parseInline('*bold*suffix')).toEqual([text('*bold*suffix')])
  })

  it('allows punctuation around markers', () => {
    expect(parseInline('(*bold*), done')).toEqual([
      text('('),
      { type: 'bold', children: [text('bold')] },
      text('), done'),
    ])
  })

  it('does not format inside inline code', () => {
    expect(parseInline('`*not bold*`')).toEqual([{ type: 'code', text: '*not bold*' }])
  })

  it('leaves unmatched markers as text', () => {
    expect(parseInline('price *10')).toEqual([text('price *10')])
  })

  it('keeps many unmatched openers as text and still parses other markers', () => {
    const unmatched = '*a '.repeat(5000)
    expect(parseInline(unmatched)).toEqual([text(unmatched)])
    expect(parseInline(`${unmatched}_done_`)).toEqual([
      text(unmatched),
      { type: 'italic', children: [text('done')] },
    ])
  })
})

describe('parseWhatsAppText', () => {
  it('keeps plain lines, including blank ones, in one paragraph', () => {
    expect(parseWhatsAppText('hello\n\nworld')).toEqual([
      { type: 'paragraph', lines: [[text('hello')], [], [text('world')]] },
    ])
  })

  it('parses a monospace block without inner formatting and keeps its line breaks', () => {
    expect(parseWhatsAppText('see ```*a*\n_b_``` ok')).toEqual([
      {
        type: 'paragraph',
        lines: [[text('see '), { type: 'mono', text: '*a*\n_b_' }, text(' ok')]],
      },
    ])
  })

  it('ignores empty monospace fences', () => {
    expect(parseWhatsAppText('``` ```')).toEqual([
      { type: 'paragraph', lines: [[text('``` ```')]] },
    ])
  })

  it('parses quotes', () => {
    expect(parseWhatsAppText('> first\n> *second*\nafter')).toEqual([
      {
        type: 'quote',
        lines: [[text('first')], [{ type: 'bold', children: [text('second')] }]],
      },
      { type: 'paragraph', lines: [[text('after')]] },
    ])
  })

  it('parses bullet and numbered lists', () => {
    expect(parseWhatsAppText('- one\n* two\n1. first\n2. _second_')).toEqual([
      {
        type: 'list',
        ordered: false,
        items: [{ content: [text('one')] }, { content: [text('two')] }],
      },
      {
        type: 'list',
        ordered: true,
        items: [
          { number: 1, content: [text('first')] },
          { number: 2, content: [{ type: 'italic', children: [text('second')] }] },
        ],
      },
    ])
  })

  it('does not treat bold at line start as a bullet', () => {
    expect(parseWhatsAppText('*bold* line')).toEqual([
      { type: 'paragraph', lines: [[{ type: 'bold', children: [text('bold')] }, text(' line')]] },
    ])
  })

  it('requires a space after list and quote markers', () => {
    expect(parseWhatsAppText('-1 degrees\n>no quote\n3.14')).toEqual([
      { type: 'paragraph', lines: [[text('-1 degrees')], [text('>no quote')], [text('3.14')]] },
    ])
  })
})

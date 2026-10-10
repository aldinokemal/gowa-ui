import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FormattedText } from '@/features/chat/formatted-text'

describe('FormattedText', () => {
  it('renders WhatsApp formatting as elements', () => {
    const html = renderToStaticMarkup(<FormattedText text={'*bold* _it_ ~st~ `c`'} />)
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>it</em>')
    expect(html).toContain('<s>st</s>')
    expect(html).toMatch(/<code[^>]*>c<\/code>/)
  })

  it('escapes message text instead of injecting HTML', () => {
    const html = renderToStaticMarkup(<FormattedText text={'*<img src=x onerror=alert(1)>*'} />)
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('keeps line breaks and renders lists', () => {
    const html = renderToStaticMarkup(<FormattedText text={'a\nb\n- item\n3. third'} />)
    expect(html).toContain('a\nb')
    expect(html).toContain('<ul class="list-disc pl-5"><li>item</li></ul>')
    expect(html).toContain('<li value="3">third</li>')
  })
})

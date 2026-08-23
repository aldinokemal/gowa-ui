import { describe, expect, it } from 'vitest'
import { chatDisplayName, senderDisplayName } from './display-name'

describe('chatDisplayName', () => {
  it('prefers the resolved name returned by the backend', () => {
    expect(chatDisplayName({ jid: '628123456789@s.whatsapp.net', name: 'Saved Alice' })).toBe(
      'Saved Alice',
    )
  })

  it('falls back to the jid when the backend name is blank', () => {
    expect(chatDisplayName({ jid: '628123456789@s.whatsapp.net', name: '   ' })).toBe(
      '628123456789@s.whatsapp.net',
    )
  })
})

describe('senderDisplayName', () => {
  it('prefers sender_display_name from the chat API', () => {
    expect(
      senderDisplayName({
        sender_jid: '628123456789@s.whatsapp.net',
        sender_display_name: 'Saved Alice',
      }),
    ).toBe('Saved Alice')
  })

  it('keeps compatibility with backends that do not return sender_display_name', () => {
    expect(senderDisplayName({ sender_jid: '628123456789@s.whatsapp.net' })).toBe(
      '628123456789@s.whatsapp.net',
    )
  })
})

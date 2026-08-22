import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import {
  chatListQueryKey,
  chatMessagesQueryKey,
  messageMediaQueryKey,
  selectedChatForDevice,
} from '@/features/chat/device-scope'
import type { ChatInfo } from '@/api/chat'

async function fetchForTwoDevices(
  firstKey: readonly unknown[],
  secondKey: readonly unknown[],
): Promise<string> {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })

  await client.fetchQuery({ queryKey: firstKey, queryFn: async () => 'device-a' })
  return client.fetchQuery({ queryKey: secondKey, queryFn: async () => 'device-b' })
}

describe('device-scoped chat query caching', () => {
  it('keeps both pages on the newly selected device after another device cached page 1', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    })
    const page = (deviceId: string, offset: number, name: string) =>
      client.fetchQuery({
        queryKey: chatListQueryKey(deviceId, { search: '', hasMedia: false, offset }),
        queryFn: async () => [{ name }],
      })

    await page('device-a', 0, 'Device A contact')
    const deviceBPage1 = await page('device-b', 0, 'Device B recent contact')
    const deviceBPage2 = await page('device-b', 25, 'Device B older contact')

    expect([deviceBPage1, deviceBPage2]).toEqual([
      [{ name: 'Device B recent contact' }],
      [{ name: 'Device B older contact' }],
    ])
  })

  it('does not reuse chat messages from another device', async () => {
    const filters = { search: '', mediaOnly: false, offset: 0 }

    const result = await fetchForTwoDevices(
      chatMessagesQueryKey('device-a', '628123@s.whatsapp.net', filters),
      chatMessagesQueryKey('device-b', '628123@s.whatsapp.net', filters),
    )

    expect(result).toBe('device-b')
  })

  it('does not reuse downloaded media from another device', async () => {
    const result = await fetchForTwoDevices(
      messageMediaQueryKey('device-a', 'message-1', '628123@s.whatsapp.net'),
      messageMediaQueryKey('device-b', 'message-1', '628123@s.whatsapp.net'),
    )

    expect(result).toBe('device-b')
  })
})

describe('device-scoped chat selection', () => {
  it('hides the previous device selection immediately after switching devices', () => {
    const chat = { jid: '628123@s.whatsapp.net', name: 'Alice' } as ChatInfo

    expect(selectedChatForDevice({ deviceId: 'device-a', chat }, 'device-b')).toBeNull()
    expect(selectedChatForDevice({ deviceId: 'device-a', chat }, 'device-a')).toBe(chat)
  })
})

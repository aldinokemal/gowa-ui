import type { AxiosAdapter, AxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  getChatMessages as currentGetChatMessages,
  listChats as currentListChats,
  type ChatMessagesParams,
  type ListChatsParams,
} from '@/api/chat'
import { downloadMedia as currentDownloadMedia } from '@/api/message'
import { http } from '@/lib/http'

type DeviceScopedListChats = (params: ListChatsParams, deviceId: string) => Promise<unknown>
type DeviceScopedGetChatMessages = (
  chatJid: string,
  params: ChatMessagesParams,
  deviceId: string,
) => Promise<unknown>
type DeviceScopedDownloadMedia = (
  messageId: string,
  phone: string,
  deviceId: string,
) => Promise<unknown>

const listChats = currentListChats as DeviceScopedListChats
const getChatMessages = currentGetChatMessages as DeviceScopedGetChatMessages
const downloadMedia = currentDownloadMedia as DeviceScopedDownloadMedia

describe('device-scoped chat API requests', () => {
  let originalAdapter: AxiosRequestConfig['adapter']
  let capturedConfig: AxiosRequestConfig | undefined

  beforeEach(() => {
    originalAdapter = http.defaults.adapter
    capturedConfig = undefined

    const adapter: AxiosAdapter = async (config) => {
      capturedConfig = config
      return {
        data: { code: 'SUCCESS', message: 'ok', results: {} },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }
    }
    http.defaults.adapter = adapter
  })

  afterEach(() => {
    http.defaults.adapter = originalAdapter
  })

  it.each([
    ['chat list', () => listChats({ limit: 25, offset: 0 }, 'device-a/slot')],
    [
      'chat messages',
      () => getChatMessages('628123@s.whatsapp.net', { limit: 30, offset: 0 }, 'device-a/slot'),
    ],
    ['media download', () => downloadMedia('message-1', '628123@s.whatsapp.net', 'device-a/slot')],
  ])('binds the %s request to its query device', async (_name, request) => {
    await request()

    expect(capturedConfig?.headers?.['X-Device-Id']).toBe('device-a%2Fslot')
  })
})

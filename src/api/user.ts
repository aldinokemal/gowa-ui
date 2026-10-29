import type { NewsletterMetadata } from '@/api/newsletter'
import { exec, type ApiRequest } from '@/api/request'
import { http, results } from '@/lib/http'

export interface UserInfoDevice {
  User: string
  Agent: number
  Device: string
  Server: string
  AD: string
}

export interface UserInfoData {
  name: string
  verified_name: string
  status: string
  picture_id: string
  devices: UserInfoDevice[]
}

export interface UserInfoResponse {
  data: UserInfoData[]
  resolved_phone?: string
  resolved_lid?: string
}

export interface AvatarParams {
  phone: string
  is_preview?: boolean
  is_community?: boolean
}

export interface AvatarResponse {
  url: string
  id: string
  type: string
}

export interface PrivacyResponse {
  group_add: string
  last_seen: string
  status: string
  profile: string
  read_receipts: string
}

export interface Contact {
  jid: string
  name: string
}

export interface ContactsResponse {
  data: Contact[]
}

export interface NewslettersResponse {
  data: NewsletterMetadata[]
}

export interface CheckResponse {
  is_on_whatsapp: boolean
}

export interface SubscribePresenceResponse {
  subscribed: boolean
  jid: string
}

export interface BusinessProfileCategory {
  id: string
  name: string
}

export interface BusinessProfileHours {
  day_of_week: string
  mode: string
  open_time: string
  close_time: string
}

export interface BusinessProfileResponse {
  jid: string
  email: string
  address: string
  categories: BusinessProfileCategory[] | null
  profile_options: Record<string, string> | null
  business_hours_timezone: string
  business_hours: BusinessProfileHours[] | null
}

export function getUserInfo(phone: string): Promise<UserInfoResponse> {
  return results<UserInfoResponse>(http.get('/user/info', { params: { phone } }))
}

export function getUserAvatar(params: AvatarParams, deviceId?: string): Promise<AvatarResponse> {
  return results<AvatarResponse>(
    http.get('/user/avatar', {
      params,
      headers: deviceId ? { 'X-Device-Id': encodeURIComponent(deviceId) } : undefined,
    }),
  )
}

export async function changeAvatar(file: File): Promise<void> {
  const data = new FormData()
  data.append('avatar', file)
  await http.post('/user/avatar', data)
}

export async function changePushName(push_name: string): Promise<void> {
  await http.post('/user/pushname', { push_name })
}

export function getPrivacy(): Promise<PrivacyResponse> {
  return results<PrivacyResponse>(http.get('/user/my/privacy'))
}

export function listNewsletters(): Promise<NewslettersResponse> {
  return results<NewslettersResponse>(http.get('/user/my/newsletters'))
}

export function listContacts(): Promise<ContactsResponse> {
  return results<ContactsResponse>(http.get('/user/my/contacts'))
}

export function checkUser(phone: string): Promise<CheckResponse> {
  return results<CheckResponse>(http.get('/user/check', { params: { phone } }))
}

export function subscribePresenceRequest(phone: string): ApiRequest {
  return { method: 'POST', path: '/user/presence/subscribe', json: { phone } }
}

export function subscribePresence(phone: string): Promise<SubscribePresenceResponse> {
  return exec(subscribePresenceRequest(phone))
}

export function getBusinessProfile(phone: string): Promise<BusinessProfileResponse> {
  return results<BusinessProfileResponse>(http.get('/user/business-profile', { params: { phone } }))
}

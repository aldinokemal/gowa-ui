import { http, results } from '@/lib/http'

export interface NewsletterText {
  text: string
  id: string
}

export interface NewsletterThreadMetadata {
  creation_time: string
  invite: string
  name: NewsletterText
  description: NewsletterText
  /** whatsmeow encodes the count as a string */
  subscribers_count: string
  verification: string
}

export interface NewsletterViewerMetadata {
  role: string
  mute: string
}

export interface NewsletterMetadata {
  id: string
  state: { type: string }
  thread_metadata: NewsletterThreadMetadata
  viewer_metadata: NewsletterViewerMetadata | null
}

export interface NewsletterMessage {
  server_id: number
  message_id?: string
  type?: string
  timestamp?: string
  views_count: number
  forwards_count: number
  reaction_counts?: Record<string, number>
  text?: string
}

export interface NewsletterMessagesResponse {
  data: NewsletterMessage[]
}

export interface NewsletterMessagesParams {
  newsletter_id: string
  count?: number
  before?: number
}

export interface NewsletterMessageUpdatesParams {
  newsletter_id: string
  after: number
  count?: number
  since?: number
}

export interface NewsletterInfoParams {
  newsletter_id?: string
  invite?: string
}

export type DirectoryView = 'RECOMMENDED' | 'TRENDING' | 'POPULAR' | 'NEW' | 'FEATURED'

export interface DirectoryParams {
  view?: DirectoryView
  search_text?: string
  /** comma-separated ISO 3166-1 alpha-2 codes */
  country_codes?: string
  categories?: string
  limit?: number
  cursor?: string
}

export interface DirectoryResponse {
  data: NewsletterMetadata[]
  next_cursor?: string
  has_more: boolean
}

export interface LiveUpdatesSubscription {
  newsletter_id: string
  duration_seconds: number
  expires_at: string
  renewed_at: string
  last_error?: string
}

export interface NewsletterMedia {
  server_id: number
  media_type: string
  mime_type: string
  filename: string
  file_path: string
  file_url?: string
  file_size: number
}

export async function followNewsletter(newsletter_id: string): Promise<void> {
  await http.post('/newsletter/follow', { newsletter_id })
}

export async function unfollowNewsletter(newsletter_id: string): Promise<void> {
  await http.post('/newsletter/unfollow', { newsletter_id })
}

export function getNewsletterInfo(params: NewsletterInfoParams): Promise<NewsletterMetadata> {
  return results<NewsletterMetadata>(http.get('/newsletter/info', { params }))
}

export function searchNewsletterDirectory(params: DirectoryParams): Promise<DirectoryResponse> {
  return results<DirectoryResponse>(http.get('/newsletter/directory', { params }))
}

export function getNewsletterMessages(
  params: NewsletterMessagesParams,
): Promise<NewsletterMessagesResponse> {
  return results<NewsletterMessagesResponse>(http.get('/newsletter/messages', { params }))
}

export function getNewsletterMessageUpdates(
  params: NewsletterMessageUpdatesParams,
): Promise<NewsletterMessagesResponse> {
  return results<NewsletterMessagesResponse>(http.get('/newsletter/message-updates', { params }))
}

export function downloadNewsletterMedia(
  newsletter_id: string,
  serverId: number,
): Promise<NewsletterMedia> {
  return results<NewsletterMedia>(
    http.get(`/newsletter/messages/${serverId}/download`, { params: { newsletter_id } }),
  )
}

export async function listLiveUpdates(): Promise<LiveUpdatesSubscription[]> {
  const response = await results<{ data: LiveUpdatesSubscription[] }>(
    http.get('/newsletter/live-updates'),
  )
  return response?.data ?? []
}

export function subscribeLiveUpdates(newsletter_id: string): Promise<LiveUpdatesSubscription> {
  return results<LiveUpdatesSubscription>(http.post('/newsletter/live-updates', { newsletter_id }))
}

export async function unsubscribeLiveUpdates(newsletter_id: string): Promise<void> {
  await http.delete('/newsletter/live-updates', { params: { newsletter_id } })
}

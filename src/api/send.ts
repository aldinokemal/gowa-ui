import { clean, exec, type ApiRequest } from '@/api/request'

export interface SendResult {
  message_id?: string
  status: string
  schedule_id?: string
  scheduled_at?: string
  next_run_at?: string
}

export interface ScheduleFields {
  scheduled_at?: string
  timezone?: string
  recurrence?: 'once' | 'daily' | 'weekly' | 'monthly'
  weekdays?: number[]
  day_of_month?: number
  end_at?: string
  occurrence_limit?: number
}

function scheduleFields(payload: ScheduleFields) {
  if (!payload.scheduled_at) return {}
  return {
    scheduled_at: payload.scheduled_at,
    timezone: payload.timezone,
    recurrence: payload.recurrence,
    weekdays: payload.weekdays,
    day_of_month: payload.day_of_month,
    end_at: payload.end_at,
    occurrence_limit: payload.occurrence_limit,
  }
}

export interface TextPayload extends ScheduleFields {
  phone: string
  message: string
  reply_message_id?: string
  is_forwarded?: boolean
  duration?: number
}

export function textRequest(payload: TextPayload): ApiRequest {
  return { method: 'POST', path: '/send/message', json: clean({ ...payload, ...scheduleFields(payload) }) }
}

export function sendText(payload: TextPayload): Promise<SendResult> {
  return exec(textRequest(payload))
}

export interface MediaPayload extends ScheduleFields {
  phone: string
  caption?: string
  file?: File
  fileUrl?: string
  reply_message_id?: string
  is_forwarded?: boolean
  duration?: number
}

export type MediaQuality = 'standard' | 'hd' | 'original'

function mediaQualityFields(quality?: MediaQuality, compress?: boolean) {
  return quality
    ? { compress: quality !== 'original', hd: quality === 'hd' }
    : { compress, hd: undefined }
}

export type ImagePayload = MediaPayload & {
  view_once?: boolean
  compress?: boolean
  quality?: MediaQuality
}

export function imageRequest(p: ImagePayload): ApiRequest {
  return {
    method: 'POST',
    path: '/send/image',
    form: {
      phone: p.phone,
      caption: p.caption,
      image: p.file,
      image_url: p.fileUrl,
      view_once: p.view_once,
      ...mediaQualityFields(p.quality, p.compress),
      is_forwarded: p.is_forwarded,
      reply_message_id: p.reply_message_id,
      duration: p.duration,
      ...scheduleFields(p),
    },
  }
}

export function sendImage(p: ImagePayload): Promise<SendResult> {
  return exec(imageRequest(p))
}

export function fileRequest(p: MediaPayload): ApiRequest {
  return {
    method: 'POST',
    path: '/send/file',
    form: {
      phone: p.phone,
      caption: p.caption,
      file: p.file,
      file_url: p.fileUrl,
      reply_message_id: p.reply_message_id,
      is_forwarded: p.is_forwarded,
      duration: p.duration,
      ...scheduleFields(p),
    },
  }
}

export function sendFile(p: MediaPayload): Promise<SendResult> {
  return exec(fileRequest(p))
}

export type VideoPayload = MediaPayload & {
  view_once?: boolean
  compress?: boolean
  quality?: MediaQuality
  gif_playback?: boolean
}

export function videoRequest(p: VideoPayload): ApiRequest {
  return {
    method: 'POST',
    path: '/send/video',
    form: {
      phone: p.phone,
      caption: p.caption,
      video: p.file,
      video_url: p.fileUrl,
      view_once: p.view_once,
      ...mediaQualityFields(p.quality, p.compress),
      gif_playback: p.gif_playback,
      is_forwarded: p.is_forwarded,
      reply_message_id: p.reply_message_id,
      duration: p.duration,
      ...scheduleFields(p),
    },
  }
}

export function sendVideo(p: VideoPayload): Promise<SendResult> {
  return exec(videoRequest(p))
}

export function stickerRequest(p: MediaPayload): ApiRequest {
  return {
    method: 'POST',
    path: '/send/sticker',
    form: {
      phone: p.phone,
      sticker: p.file,
      sticker_url: p.fileUrl,
      is_forwarded: p.is_forwarded,
      ...scheduleFields(p),
    },
  }
}

export function sendSticker(p: MediaPayload): Promise<SendResult> {
  return exec(stickerRequest(p))
}

export type AudioPayload = MediaPayload & { ptt?: boolean }

export function audioRequest(p: AudioPayload): ApiRequest {
  return {
    method: 'POST',
    path: '/send/audio',
    form: {
      phone: p.phone,
      audio: p.file,
      audio_url: p.fileUrl,
      ptt: p.ptt,
      reply_message_id: p.reply_message_id,
      is_forwarded: p.is_forwarded,
      ...scheduleFields(p),
    },
  }
}

export function sendAudio(p: AudioPayload): Promise<SendResult> {
  return exec(audioRequest(p))
}

export interface ContactPayload extends ScheduleFields {
  phone: string
  contact_name: string
  contact_phone: string
}

export function contactRequest(payload: ContactPayload): ApiRequest {
  return { method: 'POST', path: '/send/contact', json: clean({ ...payload, ...scheduleFields(payload) }) }
}

export function sendContact(payload: ContactPayload): Promise<SendResult> {
  return exec(contactRequest(payload))
}

export interface LinkPayload extends ScheduleFields {
  phone: string
  link: string
  caption?: string
}

export function linkRequest(payload: LinkPayload): ApiRequest {
  return { method: 'POST', path: '/send/link', json: clean({ ...payload, ...scheduleFields(payload) }) }
}

export function sendLink(payload: LinkPayload): Promise<SendResult> {
  return exec(linkRequest(payload))
}

export interface LocationPayload extends ScheduleFields {
  phone: string
  latitude: string
  longitude: string
}

export function locationRequest(payload: LocationPayload): ApiRequest {
  return { method: 'POST', path: '/send/location', json: clean({ ...payload, ...scheduleFields(payload) }) }
}

export function sendLocation(payload: LocationPayload): Promise<SendResult> {
  return exec(locationRequest(payload))
}

export interface PollPayload extends ScheduleFields {
  phone: string
  question: string
  options: string[]
  max_answer: number
}

export function pollRequest(payload: PollPayload): ApiRequest {
  return { method: 'POST', path: '/send/poll', json: clean({ ...payload, ...scheduleFields(payload) }) }
}

export function sendPoll(payload: PollPayload): Promise<SendResult> {
  return exec(pollRequest(payload))
}

export interface PresencePayload {
  type: string
}

export function presenceRequest(payload: PresencePayload): ApiRequest {
  return { method: 'POST', path: '/send/presence', json: clean(payload) }
}

export function sendPresence(payload: PresencePayload): Promise<SendResult> {
  return exec(presenceRequest(payload))
}

export interface ChatPresencePayload {
  phone: string
  action: string
}

export function chatPresenceRequest(payload: ChatPresencePayload): ApiRequest {
  return { method: 'POST', path: '/send/chat-presence', json: clean(payload) }
}

export function sendChatPresence(payload: ChatPresencePayload): Promise<SendResult> {
  return exec(chatPresenceRequest(payload))
}

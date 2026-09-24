import { describe, expect, it } from 'vitest'
import { forwardRequest } from '@/api/message'
import { formFields, type ApiRequest } from '@/api/request'
import { imageRequest, textRequest, videoRequest, type MediaQuality } from '@/api/send'

type QualityInput = {
  quality?: MediaQuality
  compress?: boolean
}

const builders: [string, (input: QualityInput) => ApiRequest][] = [
  ['image', (input) => imageRequest({ phone: '628123@s.whatsapp.net', ...input })],
  ['video', (input) => videoRequest({ phone: '628123@s.whatsapp.net', ...input })],
]

const qualityCases: { quality: MediaQuality; expected: Record<string, boolean> }[] = [
  { quality: 'standard', expected: { compress: true, hd: false } },
  { quality: 'hd', expected: { compress: true, hd: true } },
  { quality: 'original', expected: { compress: false, hd: false } },
]

function mediaFields(request: ApiRequest) {
  return Object.fromEntries(
    formFields(request.form ?? {}).filter(([key]) => key === 'compress' || key === 'hd'),
  )
}

describe.each(builders)('%sRequest', (_name, buildRequest) => {
  it.each(qualityCases)(
    'maps $quality quality to exact backend fields',
    ({ quality, expected }) => {
      expect(mediaFields(buildRequest({ quality }))).toEqual(expected)
    },
  )

  it.each([true, false])('preserves legacy compress=$compress callers', (compress) => {
    expect(mediaFields(buildRequest({ compress }))).toEqual({ compress })
  })
})

describe('schedule fields', () => {
  const schedule = {
    scheduled_at: '2026-09-22T03:00:00.000Z',
    timezone: 'Asia/Jakarta',
    recurrence: 'weekly' as const,
    weekdays: [1, 3],
    end_at: '2026-10-01T03:00:00.000Z',
    occurrence_limit: 4,
  }
  // What an untouched draft carries: a timezone and recurrence, but no send time.
  const unscheduled = { timezone: 'Asia/Jakarta', recurrence: 'once' as const }
  const scheduleKeys = [...Object.keys(schedule), 'day_of_month']

  it('includes scheduling metadata in JSON requests', () => {
    expect(textRequest({ phone: '628', message: 'hello', ...schedule }).json).toMatchObject(
      schedule,
    )
  })

  it('includes scheduling metadata in multipart requests', () => {
    const fields = Object.fromEntries(
      formFields(imageRequest({ phone: '628', ...schedule }).form ?? {}),
    )
    expect(fields).toMatchObject(schedule)
  })

  it('includes scheduling metadata in forward requests', () => {
    expect(forwardRequest('msg', { phone: '628', ...schedule }).json).toMatchObject(schedule)
  })

  it('leaves scheduling metadata out of unscheduled requests', () => {
    const requests = [
      textRequest({ phone: '628', message: 'hello', ...unscheduled }).json,
      Object.fromEntries(formFields(imageRequest({ phone: '628', ...unscheduled }).form ?? {})),
      forwardRequest('msg', { phone: '628', ...unscheduled }).json,
    ]
    for (const body of requests) {
      expect(Object.keys(body ?? {}).filter((key) => scheduleKeys.includes(key))).toEqual([])
    }
  })
})

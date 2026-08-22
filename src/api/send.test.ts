import { describe, expect, it } from 'vitest'
import { formFields, type ApiRequest } from '@/api/request'
import { imageRequest, videoRequest, type MediaQuality } from '@/api/send'

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

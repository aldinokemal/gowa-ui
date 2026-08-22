import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { SendImageForm } from '@/features/send/image-form'
import { SendVideoForm } from '@/features/send/video-form'

beforeAll(() => {
  vi.stubGlobal('window', {
    location: { origin: 'http://localhost', pathname: '/' },
  })
})

function renderForm(form: React.ReactNode) {
  const client = new QueryClient()
  return renderToStaticMarkup(<QueryClientProvider client={client}>{form}</QueryClientProvider>)
}

describe('media quality controls', () => {
  it('labels and describes image quality for assistive technology', () => {
    const html = renderForm(<SendImageForm />)
    const labelTarget = html.match(/for="([^"]+)"[^>]*>Media quality<\/label>/)?.[1]
    const descriptionTarget = html.match(/aria-describedby="([^"]+)"/)?.[1]

    expect(labelTarget).toBeTruthy()
    expect(html).toContain(`id="${labelTarget}"`)
    expect(descriptionTarget).toBeTruthy()
    expect(html).toContain(`id="${descriptionTarget}"`)
  })

  it('offers media quality when sending a video', () => {
    expect(renderForm(<SendVideoForm />)).toContain('Media quality')
  })
})

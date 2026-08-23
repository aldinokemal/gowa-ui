import { useEffect, useState } from 'react'
import { load as yamlLoad } from 'js-yaml'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OpenAPIReference } from '@/features/api-docs/openapi-reference'
import { useConnection } from '@/stores/connection'

const OPENAPI_URL =
  'https://raw.githubusercontent.com/aldinokemal/go-whatsapp-web-multidevice/main/docs/openapi.yaml'

type LoadState = 'loading' | 'success' | 'error'

export default function APIDocsPage() {
  const baseUrl = useConnection((state) => state.baseUrl)

  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [spec, setSpec] = useState<object | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    setLoadState('loading')

    fetch(OPENAPI_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
        return res.text()
      })
      .then((yamlText) => {
        const parsed = yamlLoad(yamlText)
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Spec parsed to a non-object value')
        }

        // Override servers with the currently connected URL
        const patched = {
          ...(parsed as Record<string, unknown>),
          servers: baseUrl ? [{ url: baseUrl, description: 'Connected server' }] : [],
        }

        setSpec(patched)
        setLoadState('success')
      })
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : String(err))
        setLoadState('error')
      })
  }, [baseUrl])

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="API Documentation"
        description="Interactive OpenAPI reference for go-whatsapp-web-multidevice."
      />

      {loadState === 'loading' && (
        <div className="flex items-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Fetching OpenAPI spec…</span>
        </div>
      )}

      {loadState === 'error' && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Could not load API spec: {errorMsg}
        </div>
      )}

      {loadState === 'success' && spec && (
        <Tabs defaultValue="reference">
          <TabsList>
            <TabsTrigger value="reference">Reference</TabsTrigger>
            <TabsTrigger value="swagger">Swagger UI</TabsTrigger>
          </TabsList>

          <TabsContent value="reference" className="mt-4">
            <OpenAPIReference spec={spec as Parameters<typeof OpenAPIReference>[0]['spec']} baseUrl={baseUrl} />
          </TabsContent>

          <TabsContent value="swagger" className="mt-4">
            <div className="overflow-x-auto rounded-lg border bg-white dark:bg-white">
              <SwaggerUI spec={spec} docExpansion="list" defaultModelsExpandDepth={-1} />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

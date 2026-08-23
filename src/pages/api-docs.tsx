import { useMemo } from 'react'
import { load as yamlLoad } from 'js-yaml'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import { PageHeader } from '@/components/shared/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { OpenAPIReference } from '@/features/api-docs/openapi-reference'
import { useConnection } from '@/stores/connection'

// Bundled at build time — commit 7ee1ead9. No runtime network request to GitHub.
// Vite inlines this as a plain string via the ?raw suffix; js-yaml parses it once.
import rawSpec from '@/assets/openapi.yaml?raw'

const BASE_SPEC = yamlLoad(rawSpec) as Record<string, unknown>

/**
 * Patch the OpenAPI `servers` array so code samples and Swagger UI hit the
 * currently-connected backend.
 *
 * The backend registers `/health` at the *root* — it is intentionally NOT
 * prefixed by APP_BASE_PATH.  Everything else is served under the base path.
 *
 * We therefore emit two server entries when a non-empty base path is detected:
 *   1. { url: baseUrl }           — used for all prefixed routes
 *   2. { url: origin }            — used for /health (root-only route)
 *
 * When baseUrl equals the origin (no extra path prefix), a single entry is
 * sufficient because every path — including /health — is already at root.
 */
function patchServers(
  spec: Record<string, unknown>,
  baseUrl: string | null,
): Record<string, unknown> {
  if (!baseUrl) {
    // No connection yet — keep the spec's own server entry unchanged so
    // Swagger UI can still show something useful.
    return spec
  }

  // Normalise: strip trailing slash
  const base = baseUrl.replace(/\/$/, '')

  let servers: Array<{ url: string; description: string }>

  try {
    const u = new URL(base)
    const origin = u.origin // e.g. http://localhost:3000

    if (base === origin) {
      // No extra path prefix — /health is already at root.
      servers = [{ url: base, description: 'Connected server' }]
    } else {
      // APP_BASE_PATH is in play.  Prefixed routes use `base`; /health uses
      // the bare origin so it is not inadvertently prefixed.
      servers = [
        { url: base, description: 'Connected server (prefixed routes)' },
        { url: origin, description: 'Connected server (root-only routes e.g. /health)' },
      ]
    }
  } catch {
    // Relative or opaque URL — safe fallback, single entry.
    servers = [{ url: base, description: 'Connected server' }]
  }

  return { ...spec, servers }
}

export default function APIDocsPage() {
  const baseUrl = useConnection((state) => state.baseUrl)

  const spec = useMemo(() => patchServers(BASE_SPEC, baseUrl), [baseUrl])

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="API Documentation"
        description="Interactive OpenAPI reference for go-whatsapp-web-multidevice."
      />

      <Tabs defaultValue="reference">
        <TabsList>
          <TabsTrigger value="reference">Reference</TabsTrigger>
          <TabsTrigger value="swagger">Swagger UI</TabsTrigger>
        </TabsList>

        <TabsContent value="reference" className="mt-4">
          <OpenAPIReference
            spec={spec as Parameters<typeof OpenAPIReference>[0]['spec']}
            baseUrl={baseUrl}
          />
        </TabsContent>

        <TabsContent value="swagger" className="mt-4">
          <div className="overflow-x-auto rounded-lg border bg-white dark:bg-white">
            <SwaggerUI spec={spec} docExpansion="list" defaultModelsExpandDepth={-1} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

import { useMemo, useState } from 'react'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import { Info, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OpenAPIReference } from '@/features/api-docs/openapi-reference'
import { LATEST_SPEC_TAG, SPEC_TAGS, getSpec, resolveSpec, selectSpecTag } from '@/features/api-docs/spec-registry'
import { useAppInfo } from '@/hooks/use-app-info'
import { useConnection } from '@/stores/connection'

// ── Server patching ────────────────────────────────────────────────────────

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
  if (!baseUrl) return spec

  const base = baseUrl.replace(/\/$/, '')

  let servers: Array<{ url: string; description: string }>

  try {
    const u = new URL(base)
    const origin = u.origin

    if (base === origin) {
      servers = [{ url: base, description: 'Connected server' }]
    } else {
      servers = [
        { url: base, description: 'Connected server (prefixed routes)' },
        { url: origin, description: 'Connected server (root-only routes e.g. /health)' },
      ]
    }
  } catch {
    servers = [{ url: base, description: 'Connected server' }]
  }

  return { ...spec, servers }
}

// ── Match kind badge ───────────────────────────────────────────────────────

type MatchKind = 'exact' | 'closest' | 'latest-fallback' | 'manual'

function VersionBadge({
  selectedTag,
  backendVersion,
  matchKind,
}: {
  selectedTag: string
  backendVersion: string | undefined
  matchKind: MatchKind
}) {
  if (matchKind === 'manual') {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Info className="size-3.5 shrink-0" />
        Showing spec for <code className="font-mono">{selectedTag}</code> (manual)
      </span>
    )
  }

  if (matchKind === 'exact') {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <Info className="size-3.5 shrink-0" />
        Exact match for backend <code className="font-mono">{backendVersion}</code>
      </span>
    )
  }

  if (matchKind === 'closest') {
    return (
      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
        <TriangleAlert className="size-3.5 shrink-0" />
        No exact spec for <code className="font-mono">{backendVersion}</code> — showing closest:{' '}
        <code className="font-mono">{selectedTag}</code>
      </span>
    )
  }

  // latest-fallback
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Info className="size-3.5 shrink-0" />
      {backendVersion
        ? <>No spec bundled for major of <code className="font-mono">{backendVersion}</code> — showing latest: <code className="font-mono">{selectedTag}</code></>
        : <>Not connected — showing latest bundled spec: <code className="font-mono">{selectedTag}</code></>
      }
    </span>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function APIDocsPage() {
  const baseUrl = useConnection((state) => state.baseUrl)
  const { data: appInfo } = useAppInfo()

  // Auto-selected tag based on backend version from /app/info
  const autoTag = useMemo(
    () => selectSpecTag(appInfo?.version),
    [appInfo?.version],
  )

  // null = follow auto-selection; string = user override
  const [manualTag, setManualTag] = useState<string | null>(null)

  const selectedTag = manualTag ?? autoTag

  // Determine display match kind
  const matchKind: MatchKind = manualTag
    ? 'manual'
    : resolveSpec(appInfo?.version).matchKind

  // Parse + patch spec — memoized per (tag, baseUrl)
  const spec = useMemo(() => {
    const parsed = getSpec(selectedTag)
    return patchServers(parsed, baseUrl)
  }, [selectedTag, baseUrl])

  function handleVersionChange(tag: string) {
    if (tag === autoTag) {
      setManualTag(null) // revert to auto
    } else {
      setManualTag(tag)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="API Documentation"
        description="Interactive OpenAPI reference for go-whatsapp-web-multidevice."
      />

      {/* Version selector row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="spec-version-select" className="text-sm font-medium whitespace-nowrap">
            Spec version
          </label>
          <Select value={selectedTag} onValueChange={handleVersionChange}>
            <SelectTrigger id="spec-version-select" className="h-8 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPEC_TAGS.map((tag) => (
                <SelectItem key={tag} value={tag} className="text-xs font-mono">
                  {tag}
                  {tag === autoTag && tag !== LATEST_SPEC_TAG && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground">(auto)</span>
                  )}
                  {tag === LATEST_SPEC_TAG && tag === autoTag && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground">(latest · auto)</span>
                  )}
                  {tag === LATEST_SPEC_TAG && tag !== autoTag && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground">(latest)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <VersionBadge
          selectedTag={selectedTag}
          backendVersion={appInfo?.version}
          matchKind={matchKind}
        />
      </div>

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

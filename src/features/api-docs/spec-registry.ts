/**
 * spec-registry.ts
 *
 * Runtime utilities for selecting the right bundled OpenAPI spec to show
 * based on the connected backend's reported version.
 *
 * All specs are bundled into the single-file artifact at build time via the
 * auto-generated spec-versions.gen.ts — no network requests happen here.
 */

import { load as yamlLoad } from 'js-yaml'
import { LATEST_SPEC_TAG, SPEC_TAGS, SPEC_VERSIONS } from './spec-versions.gen'

export { LATEST_SPEC_TAG, SPEC_TAGS }

// ── Types ──────────────────────────────────────────────────────────────────

export interface ParsedSpec {
  /** The upstream release tag this spec was built from, e.g. "v9.2.2" */
  tag: string
  /** Whether this was an exact match or the closest available version */
  matchKind: 'exact' | 'closest' | 'latest-fallback'
  /** The parsed OpenAPI object ready to pass to SwaggerUI / OpenAPIReference */
  spec: Record<string, unknown>
}

// ── Semver helpers ─────────────────────────────────────────────────────────

interface SemVer {
  major: number
  minor: number
  patch: number
  raw: string
}

/**
 * Parse a version string like "v9.2.2", "9.2.2", or "9.2" into numeric parts.
 * Returns null for strings that don't look like a semver.
 */
function parseSemver(version: string): SemVer | null {
  const cleaned = version.replace(/^v/, '')
  const match = cleaned.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/)
  if (!match) return null
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2] ?? '0', 10),
    patch: parseInt(match[3] ?? '0', 10),
    raw: version,
  }
}

/**
 * Compare two semver tuples. Returns:
 *  < 0 if a < b
 *    0 if a === b
 *  > 0 if a > b
 */
function compareSemver(a: SemVer, b: SemVer): number {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch
}

// ── Core selection logic ───────────────────────────────────────────────────

/**
 * Select the best bundled spec tag for a given backend version string.
 *
 * Strategy:
 *   1. Exact match — backend reports "v9.2.2" and we have "v9.2.2"
 *   2. Closest older version — pick the highest bundled tag that is ≤ the
 *      backend version (same major). Avoids showing docs for endpoints that
 *      don't exist on the running server yet.
 *   3. Oldest available in the same major — if the backend is older than any
 *      bundled tag in that major.
 *   4. Latest bundled — ultimate fallback when no major match exists.
 *
 * Returns the selected tag string.
 */
export function selectSpecTag(backendVersion: string | null | undefined): string {
  if (!backendVersion) return LATEST_SPEC_TAG

  const target = parseSemver(backendVersion)
  if (!target) return LATEST_SPEC_TAG

  // Build parsed list of all bundled tags (SPEC_TAGS is already desc-sorted)
  const available: SemVer[] = SPEC_TAGS.map((t) => parseSemver(t)).filter(
    (v): v is SemVer => v !== null,
  )

  // 1. Exact match
  const exact = available.find(
    (v) => v.major === target.major && v.minor === target.minor && v.patch === target.patch,
  )
  if (exact) return exact.raw

  // 2. Closest older (≤ target, same major) — highest wins
  const sameMajorOlder = available
    .filter((v) => v.major === target.major && compareSemver(v, target) <= 0)
    .sort((a, b) => compareSemver(b, a)) // desc
  if (sameMajorOlder.length > 0) return sameMajorOlder[0].raw

  // 3. Oldest in same major (backend is older than any bundled tag)
  const sameMajorAll = available
    .filter((v) => v.major === target.major)
    .sort((a, b) => compareSemver(a, b)) // asc
  if (sameMajorAll.length > 0) return sameMajorAll[0].raw

  // 4. Latest fallback
  return LATEST_SPEC_TAG
}

/**
 * Determine the match kind for display purposes (shown in the UI badge).
 */
export function specMatchKind(
  backendVersion: string | null | undefined,
  selectedTag: string,
): ParsedSpec['matchKind'] {
  if (!backendVersion) return 'latest-fallback'
  const normalised = backendVersion.startsWith('v') ? backendVersion : `v${backendVersion}`
  if (normalised === selectedTag) return 'exact'
  const target = parseSemver(backendVersion)
  const selected = parseSemver(selectedTag)
  if (target && selected && target.major === selected.major) return 'closest'
  return 'latest-fallback'
}

// ── YAML parse cache ───────────────────────────────────────────────────────

// Avoid re-parsing the same YAML string on every render. The cache is keyed
// by tag and lives for the lifetime of the page.
const parseCache = new Map<string, Record<string, unknown>>()

function parseSpec(tag: string): Record<string, unknown> {
  const cached = parseCache.get(tag)
  if (cached) return cached

  const raw = SPEC_VERSIONS[tag]
  if (!raw) throw new Error(`No bundled spec for tag "${tag}"`)

  const parsed = yamlLoad(raw) as Record<string, unknown>
  parseCache.set(tag, parsed)
  return parsed
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Get the parsed spec object for a specific tag.
 * Throws if the tag is not in the bundled registry.
 */
export function getSpec(tag: string): Record<string, unknown> {
  return parseSpec(tag)
}

/**
 * High-level helper: given a backend version string, return the best-match
 * ParsedSpec (parsed object + metadata).
 */
export function resolveSpec(backendVersion: string | null | undefined): ParsedSpec {
  const tag = selectSpecTag(backendVersion)
  const matchKind = specMatchKind(backendVersion, tag)
  return { tag, matchKind, spec: parseSpec(tag) }
}

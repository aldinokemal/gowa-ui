#!/usr/bin/env node
/**
 * sync-openapi.mjs
 *
 * Downloads the OpenAPI spec for every GitHub release of the upstream backend
 * and writes them to src/assets/openapi/<tag>.yaml so they can be bundled
 * into the single-file artifact at build time.
 *
 * Usage:
 *   node scripts/sync-openapi.mjs               # sync all releases (default: last 20)
 *   node scripts/sync-openapi.mjs --latest-only  # sync only the latest release
 *   node scripts/sync-openapi.mjs --limit 10     # sync last N releases
 *
 * Requirements: Node 18+ (uses native fetch). No extra dependencies.
 *
 * The script is intentionally idempotent — re-running it will skip versions
 * whose YAML file already exists on disk (pass --force to overwrite).
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'src', 'assets', 'openapi')

const REPO = 'aldinokemal/go-whatsapp-web-multidevice'
const GITHUB_API = 'https://api.github.com'
const RAW_BASE = 'https://raw.githubusercontent.com'
const SPEC_PATH = 'docs/openapi.yaml'

// ── CLI args ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const latestOnly = args.includes('--latest-only')
const force = args.includes('--force')
const limitIdx = args.indexOf('--limit')
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 20

// ── Helpers ────────────────────────────────────────────────────────────────

async function githubFetch(url) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'gowa-ui-sync-openapi',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  // Honour GITHUB_TOKEN if set to avoid rate limiting in CI
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
  }
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${url}`)
  return res.json()
}

async function downloadText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'gowa-ui-sync-openapi' } })
  if (!res.ok) return null          // spec may not exist for very old tags
  return res.text()
}

function sanitizeTag(tag) {
  // Make the tag safe for use as a filename: keep alphanumeric, dots, dashes
  return tag.replace(/[^a-zA-Z0-9.\-_]/g, '_')
}

// ── Main ───────────────────────────────────────────────────────────────────

fs.mkdirSync(OUT_DIR, { recursive: true })

console.log(`\n📦  Syncing OpenAPI specs → ${path.relative(ROOT, OUT_DIR)}\n`)

// 1. Fetch release list
const releasesUrl = `${GITHUB_API}/repos/${REPO}/releases?per_page=${latestOnly ? 1 : limit}`
const releases = await githubFetch(releasesUrl)

if (!Array.isArray(releases) || releases.length === 0) {
  console.error('No releases found.')
  process.exit(1)
}

console.log(`Found ${releases.length} release(s).\n`)

// 2. Download each spec
let downloaded = 0
let skipped = 0
let missing = 0

const manifest = {} // tag → filename, populated for registry generation

// Seed manifest from YAML files already on disk so that partial runs
// (--latest-only, --limit N) don't erase existing versions from the registry.
for (const entry of fs.readdirSync(OUT_DIR)) {
  if (!entry.endsWith('.yaml')) continue
  // Reverse-map filename → tag: strip the .yaml suffix and un-sanitize
  // underscores back to the original tag characters where unambiguous.
  // We store the raw filename; the tag is derived by reading the header comment.
  const filePath = path.join(OUT_DIR, entry)
  const firstLine = fs.readFileSync(filePath, 'utf8').split('\n')[0]
  // Header format: "# Bundled at build time — tag <tag>"
  const match = firstLine.match(/^# Bundled at build time — tag (.+)$/)
  if (match) {
    const existingTag = match[1].trim()
    if (!manifest[existingTag]) {
      manifest[existingTag] = entry
    }
  }
}

for (const release of releases) {
  const tag = release.tag_name
  const filename = `${sanitizeTag(tag)}.yaml`
  const outPath = path.join(OUT_DIR, filename)

  if (!force && fs.existsSync(outPath)) {
    console.log(`  ⏭  ${tag} — already exists, skipping (use --force to overwrite)`)
    manifest[tag] = filename
    skipped++
    continue
  }

  const specUrl = `${RAW_BASE}/${REPO}/${tag}/${SPEC_PATH}`
  process.stdout.write(`  ⬇  ${tag} … `)

  const yaml = await downloadText(specUrl)
  if (!yaml) {
    console.log(`not found (skipping)`)
    missing++
    continue
  }

  const header =
    `# Bundled at build time — tag ${tag}\n` +
    `# Source: https://github.com/${REPO}/blob/${tag}/${SPEC_PATH}\n`

  fs.writeFileSync(outPath, header + yaml, 'utf8')
  manifest[tag] = filename
  console.log(`OK (${(yaml.length / 1024).toFixed(0)} KB)`)
  downloaded++
}

console.log(`\n✅  Done — ${downloaded} downloaded, ${skipped} skipped, ${missing} missing\n`)

// 3. Emit src/features/api-docs/spec-versions.gen.ts
//    This file is auto-generated — do not edit by hand.
const genPath = path.join(ROOT, 'src', 'features', 'api-docs', 'spec-versions.gen.ts')

const sortedTags = Object.keys(manifest).sort((a, b) => {
  // Descending semver-ish sort: compare numeric segments
  const seg = (v) => v.replace(/^v/, '').split('.').map(Number)
  const [aMaj, aMin, aPat] = seg(a)
  const [bMaj, bMin, bPat] = seg(b)
  return bMaj - aMaj || bMin - aMin || bPat - aPat
})

const latestTag = sortedTags[0]

const imports = sortedTags
  .map((tag) => {
    const varName = `spec_${sanitizeTag(tag).replace(/\./g, '_').replace(/-/g, '_')}`
    return `import ${varName} from '@/assets/openapi/${manifest[tag]}?raw'`
  })
  .join('\n')

const entries = sortedTags
  .map((tag) => {
    const varName = `spec_${sanitizeTag(tag).replace(/\./g, '_').replace(/-/g, '_')}`
    return `  '${tag}': ${varName},`
  })
  .join('\n')

const genContent = `// AUTO-GENERATED by scripts/sync-openapi.mjs — do not edit by hand.
// Re-run \`npm run sync:openapi\` to update.

${imports}

/**
 * Map of upstream release tag → raw OpenAPI YAML string.
 * All entries are bundled at build time via Vite ?raw imports.
 */
export const SPEC_VERSIONS: Record<string, string> = {
${entries}
}

/** Newest available bundled version. */
export const LATEST_SPEC_TAG = '${latestTag}'

/** All available version tags in descending order. */
export const SPEC_TAGS = ${JSON.stringify(sortedTags, null, 2)} as const
`

fs.writeFileSync(genPath, genContent, 'utf8')
console.log(`📝  Generated ${path.relative(ROOT, genPath)}\n`)

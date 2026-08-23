/**
 * Clean custom OpenAPI 3.x reference renderer.
 *
 * Features:
 * - Grouped by tag with collapsible sections
 * - Each endpoint: method badge, path, summary, description
 * - Parameters table (path / query / header / cookie) with example column
 * - Request body table with type, required, description, example
 * - Response codes with expandable example JSON
 * - Copy-as-cURL (uses example values to build a real-looking snippet)
 */

import { useState } from 'react'
import { Highlight, Prism, themes } from 'prism-react-renderer'
import { useTheme } from 'next-themes'
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// prism-react-renderer bundles only a subset of languages.
// Attach PHP and Ruby grammars to its Prism instance directly so they are
// available synchronously when the component first renders.
// The cast through unknown avoids TypeScript complaints about the manual
// grammar assignment while keeping the rest of the file fully typed.
;(() => {
  type PrismWithLangs = typeof Prism & { languages: Record<string, unknown> }
  const p = Prism as unknown as PrismWithLangs

  // PHP — minimal keyword/string/comment grammar
  if (!p.languages['php']) {
    p.languages['php'] = {
      comment: [{ pattern: /\/\/.*|#(?!\[).*/, greedy: true }, { pattern: /\/\*[\s\S]*?\*\//, greedy: true }],
      string: [{ pattern: /"(?:[^"\\]|\\.)*"/, greedy: true }, { pattern: /'(?:[^'\\]|\\.)*'/, greedy: true }],
      keyword: /\b(?:echo|print|class|function|return|if|else|elseif|while|for|foreach|do|switch|case|break|continue|new|null|true|false|array|string|int|bool|void|public|private|protected|static|const|use|namespace|require|include|require_once|include_once|die|exit)\b/,
      variable: /\$[a-z_]\w*/i,
      number: /\b0x[\da-f]+\b|(?:\b\d+\.?\d*|\B\.\d+)(?:e[+-]?\d+)?/i,
      operator: /[=!<>]=?|&&|\|\||[+\-*\/%&|^~]|\.|\?|:/,
      punctuation: /[{}[\];(),]/,
    }
  }

  // Ruby — minimal keyword/string/comment grammar
  if (!p.languages['ruby']) {
    p.languages['ruby'] = {
      comment: { pattern: /#.*/, greedy: true },
      string: [{ pattern: /"(?:[^"\\#]|\\[\s\S]|#(?!\{))*"/, greedy: true }, { pattern: /'(?:[^'\\]|\\.)*'/, greedy: true }],
      keyword: /\b(?:alias|and|begin|break|case|class|def|defined\?|do|else|elsif|end|ensure|false|for|if|in|module|next|nil|not|or|redo|require|rescue|retry|return|self|super|then|true|undef|unless|until|when|while|yield)\b/,
      number: /\b(?:0x[\da-f]+|0b[01]+|0o[0-7]+|\d+(?:\.\d+)?(?:e[+-]?\d+)?)\b/i,
      symbol: /:[a-z_]\w*/i,
      operator: /[=!<>]=?|&&|\|\||[+\-*\/%&|^~]|\.\.\.?|::/,
      punctuation: /[{}[\];(),]/,
    }
  }
})()

// ── OpenAPI 3 types ────────────────────────────────────────────────────────

interface OASchema {
  type?: string
  format?: string
  description?: string
  example?: unknown
  properties?: Record<string, OASchema>
  items?: OASchema
  $ref?: string
  enum?: unknown[]
  required?: string[]
  nullable?: boolean
  default?: unknown
  additionalProperties?: boolean | OASchema
}

interface OAParameter {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  required?: boolean
  description?: string
  schema?: OASchema
  example?: unknown
  $ref?: string
}

interface OAMediaObject {
  schema?: OASchema
  example?: unknown
  examples?: Record<string, { value?: unknown }>
}

interface OARequestBody {
  required?: boolean
  content?: Record<string, OAMediaObject>
}

interface OAResponse {
  description?: string
  content?: Record<string, OAMediaObject>
}

interface OAOperation {
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
  parameters?: OAParameter[]
  requestBody?: OARequestBody
  responses?: Record<string, OAResponse>
  security?: Record<string, string[]>[]
  deprecated?: boolean
}

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options' | 'trace'

interface OAPathItem {
  get?: OAOperation
  post?: OAOperation
  put?: OAOperation
  patch?: OAOperation
  delete?: OAOperation
  head?: OAOperation
  options?: OAOperation
  trace?: OAOperation
}

interface OATag {
  name: string
  description?: string
}

interface OASpec {
  info?: { title?: string; version?: string; description?: string }
  tags?: OATag[]
  paths?: Record<string, OAPathItem>
  components?: {
    schemas?: Record<string, OASchema>
    parameters?: Record<string, OAParameter>
  }
}

// ── Constants ──────────────────────────────────────────────────────────────

const HTTP_METHODS: HttpMethod[] = [
  'get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace',
]

const METHOD_COLORS: Record<HttpMethod, string> = {
  get:     'bg-blue-100   text-blue-700   dark:bg-blue-900/40   dark:text-blue-300   border-blue-200   dark:border-blue-800',
  post:    'bg-green-100  text-green-700  dark:bg-green-900/40  dark:text-green-300  border-green-200  dark:border-green-800',
  put:     'bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-300  border-amber-200  dark:border-amber-800',
  patch:   'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  delete:  'bg-red-100    text-red-700    dark:bg-red-900/40    dark:text-red-300    border-red-200    dark:border-red-800',
  head:    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  options: 'bg-muted      text-muted-foreground border-border',
  trace:   'bg-muted      text-muted-foreground border-border',
}

const STATUS_COLORS: Record<string, string> = {
  '2': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800',
  '3': 'bg-blue-100  text-blue-700  dark:bg-blue-900/40  dark:text-blue-300  border-blue-200  dark:border-blue-800',
  '4': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  '5': 'bg-red-100   text-red-700   dark:bg-red-900/40   dark:text-red-300   border-red-200   dark:border-red-800',
}

const IN_COLORS: Record<string, string> = {
  path:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  query:  'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-300',
  header: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  cookie: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function statusColor(code: string) {
  return STATUS_COLORS[code[0]] ?? 'bg-muted text-muted-foreground border-border'
}

function schemaTypeSummary(schema?: OASchema): string {
  if (!schema) return '—'
  if (schema.$ref) return schema.$ref.split('/').pop() ?? schema.$ref
  const base = schema.type ?? 'any'
  if (base === 'array' && schema.items) return `${schemaTypeSummary(schema.items)}[]`
  if (schema.enum) return schema.enum.map((v) => JSON.stringify(v)).join(' | ')
  if (schema.format) return `${base} (${schema.format})`
  return base
}

function resolveSchema(
  schema: OASchema | undefined,
  components?: OASpec['components'],
): OASchema | undefined {
  if (!schema) return undefined
  if (schema.$ref) {
    const name = schema.$ref.replace('#/components/schemas/', '')
    return components?.schemas?.[name]
  }
  return schema
}

/** Resolve a parameter $ref to its concrete definition */
function resolveParameter(
  param: OAParameter,
  components?: OASpec['components'],
): OAParameter {
  if (!param.$ref) return param
  const name = param.$ref.replace('#/components/parameters/', '')
  return components?.parameters?.[name] ?? param
}

/** Resolve all parameters in an operation, expanding any $ref entries */
function resolveParameters(
  params: OAParameter[] | undefined,
  components?: OASpec['components'],
): OAParameter[] {
  return (params ?? []).map((p) => resolveParameter(p, components))
}

function getProperties(
  schema: OASchema | undefined,
  components?: OASpec['components'],
): Array<{ name: string; schema: OASchema; required: boolean }> {
  if (!schema) return []
  const resolved = resolveSchema(schema, components)
  if (!resolved?.properties) return []
  const required = resolved.required ?? []
  return Object.entries(resolved.properties).map(([name, s]) => ({
    name,
    schema: s,
    required: required.includes(name),
  }))
}

/** Render an example value as a short string */
function formatExample(value: unknown): string {
  if (value === undefined || value === null) return '—'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

/**
 * Build a best-effort example JSON object from a schema's properties,
 * using `example` fields where available.
 */
function buildExampleFromSchema(
  schema: OASchema | undefined,
  components?: OASpec['components'],
  depth = 0,
): unknown {
  if (depth > 3) return '...'
  if (!schema) return null
  const resolved = resolveSchema(schema, components) ?? schema

  if (resolved.example !== undefined) return resolved.example

  if (resolved.type === 'object' || resolved.properties) {
    const out: Record<string, unknown> = {}
    for (const [key, s] of Object.entries(resolved.properties ?? {})) {
      out[key] = buildExampleFromSchema(s, components, depth + 1)
    }
    return out
  }
  if (resolved.type === 'array') {
    return [buildExampleFromSchema(resolved.items, components, depth + 1)]
  }
  if (resolved.type === 'boolean') return false
  if (resolved.type === 'integer' || resolved.type === 'number') return 0
  if (resolved.enum) return resolved.enum[0]
  if (resolved.default !== undefined) return resolved.default
  return null
}

// ── Snippet builders ───────────────────────────────────────────────────────

/** A single field extracted from a multipart/form-data or urlencoded schema */
interface FormField {
  name: string
  isBinary: boolean   // format: binary → file upload
  example: string     // best-effort example value as a string
}

interface SnippetContext {
  baseUrl: string
  filledPath: string
  url: string          // full URL with query string
  method: HttpMethod
  headerParams: OAParameter[]
  hasSecurity: boolean
  contentType: string | null
  isFormData: boolean
  bodyExample: unknown
  /** Populated when isFormData is true; used by snippet generators */
  formFields: FormField[]
}

function buildSnippetContext(
  baseUrl: string | null,
  path: string,
  op: OAOperation,
  components?: OASpec['components'],
): SnippetContext {
  const resolvedBase = baseUrl ?? 'http://localhost:3000'
  const params = resolveParameters(op.parameters, components)

  let filledPath = path
  for (const p of params) {
    if (p.in === 'path') {
      const val = p.example ?? p.schema?.example ?? `{${p.name}}`
      filledPath = filledPath.replace(`{${p.name}}`, String(val))
    }
  }

  const queryParams = params.filter((p) => p.in === 'query')
  const queryString = queryParams
    .map((p) => {
      const val = p.example ?? p.schema?.example
      return val !== undefined ? `${p.name}=${encodeURIComponent(String(val))}` : `${p.name}=`
    })
    .join('&')

  const url = `${resolvedBase}${filledPath}${queryString ? `?${queryString}` : ''}`
  const headerParams = params.filter((p) => p.in === 'header')
  const hasSecurity = op.security !== undefined ? op.security.length > 0 : true

  let contentType: string | null = null
  let isFormData = false
  let bodyExample: unknown = null
  let formFields: FormField[] = []

  if (op.requestBody?.content) {
    const ct = Object.keys(op.requestBody.content)[0]
    if (ct) {
      contentType = ct
      isFormData = ct.includes('form')
      const media = op.requestBody.content[ct]
      bodyExample = media?.example ?? buildExampleFromSchema(media?.schema, components)

      if (isFormData && media?.schema) {
        const resolved = resolveSchema(media.schema, components) ?? media.schema
        for (const [fname, fschema] of Object.entries(resolved.properties ?? {})) {
          const isBinary = fschema.format === 'binary'
          // Use schema example, fall back to a sensible placeholder
          let example: string
          if (fschema.example !== undefined) {
            example = String(fschema.example)
          } else if (isBinary) {
            example = `/path/to/${fname}`
          } else if (fschema.type === 'boolean') {
            example = 'false'
          } else if (fschema.type === 'integer' || fschema.type === 'number') {
            example = '0'
          } else {
            example = `<${fname}>`
          }
          // Surface required fields first, then optional
          formFields.push({ name: fname, isBinary, example })
        }
        // Required fields first
        const req = new Set(resolved.required ?? [])
        formFields.sort((a, b) => {
          const ar = req.has(a.name) ? 0 : 1
          const br = req.has(b.name) ? 0 : 1
          return ar - br
        })
      }
    }
  }

  return { baseUrl: resolvedBase, filledPath, url, method: (op as { method?: HttpMethod }).method ?? 'get', headerParams, hasSecurity, contentType, isFormData, bodyExample, formFields }
}

function snippetCurl(ctx: SnippetContext, method: HttpMethod): string {
  const parts: string[] = [`curl -X ${method.toUpperCase()}`]
  parts.push(`  '${ctx.url}'`)
  parts.push(`  -H 'Accept: application/json'`)
  for (const p of ctx.headerParams) {
    const val = p.example ?? p.schema?.example ?? `<${p.name}>`
    parts.push(`  -H '${p.name}: ${String(val)}'`)
  }
  if (ctx.hasSecurity) {
    parts.push(`  -H 'Authorization: Basic <base64(user:pass)>'`)
  }
  if (ctx.contentType) {
    if (ctx.isFormData) {
      // Let curl set the multipart boundary automatically — do NOT emit Content-Type manually.
      // Each field: text values use -F key=value, binary (file upload) uses -F key=@/path/to/file
      for (const f of ctx.formFields) {
        const flag = f.isBinary ? `-F '${f.name}=@${f.example}'` : `-F '${f.name}=${f.example}'`
        parts.push(`  ${flag}`)
      }
    } else {
      parts.push(`  -H 'Content-Type: ${ctx.contentType}'`)
      parts.push(`  -d '${JSON.stringify(ctx.bodyExample, null, 2)}'`)
    }
  }
  return parts.join(' \\\n')
}

function snippetFetch(ctx: SnippetContext, method: HttpMethod): string {
  const headers: Record<string, string> = { Accept: 'application/json' }
  for (const p of ctx.headerParams) {
    const val = p.example ?? p.schema?.example ?? `<${p.name}>`
    headers[p.name] = String(val)
  }
  if (ctx.hasSecurity) headers['Authorization'] = 'Basic <base64(user:pass)>'
  // Do NOT set Content-Type for multipart — the browser sets it with boundary
  if (ctx.contentType && !ctx.isFormData) headers['Content-Type'] = ctx.contentType

  const headersStr = Object.entries(headers)
    .map(([k, v]) => `    '${k}': '${v}'`)
    .join(',\n')

  let bodySection = ''
  if (ctx.contentType) {
    if (ctx.isFormData) {
      const appendLines = ctx.formFields.map((f) => {
        if (f.isBinary) {
          // File input from a browser <input type="file"> element
          return `form.append('${f.name}', fileInput.files[0]) // File: ${f.example}`
        }
        return `form.append('${f.name}', '${f.example}')`
      })
      bodySection = `
const form = new FormData()
${appendLines.join('\n')}
`
    } else {
      bodySection = `\n  body: JSON.stringify(${JSON.stringify(ctx.bodyExample, null, 2).replace(/\n/g, '\n  ')}),`
    }
  }

  if (ctx.isFormData) {
    return `${bodySection}
const response = await fetch('${ctx.url}', {
  method: '${method.toUpperCase()}',
  headers: {
${headersStr}
  },
  body: form,
})

const data = await response.json()
console.log(data)`
  }

  return `const response = await fetch('${ctx.url}', {
  method: '${method.toUpperCase()}',
  headers: {
${headersStr}
  },${bodySection}
})

const data = await response.json()
console.log(data)`
}

function snippetAxios(ctx: SnippetContext, method: HttpMethod): string {
  const headers: Record<string, string> = {}
  for (const p of ctx.headerParams) {
    const val = p.example ?? p.schema?.example ?? `<${p.name}>`
    headers[p.name] = String(val)
  }
  if (ctx.hasSecurity) headers['Authorization'] = 'Basic <base64(user:pass)>'
  // Axios sets Content-Type with boundary automatically for FormData
  if (ctx.contentType && !ctx.isFormData) headers['Content-Type'] = ctx.contentType

  const headersStr = Object.entries(headers)
    .map(([k, v]) => `    '${k}': '${v}'`)
    .join(',\n')

  if (ctx.isFormData) {
    const appendLines = ctx.formFields.map((f) => {
      if (f.isBinary) {
        return `form.append('${f.name}', fs.createReadStream('${f.example}'))`
      }
      return `form.append('${f.name}', '${f.example}')`
    })

    return `import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'

const form = new FormData()
${appendLines.join('\n')}

const { data } = await axios({
  method: '${method}',
  url: '${ctx.url}',
  headers: {
${headersStr ? headersStr + ',\n' : ''}    ...form.getHeaders(),
  },
  data: form,
})

console.log(data)`
  }

  const dataLine =
    ctx.contentType
      ? `\n  data: ${JSON.stringify(ctx.bodyExample, null, 2).replace(/\n/g, '\n  ')},`
      : ''

  return `import axios from 'axios'

const { data } = await axios({
  method: '${method}',
  url: '${ctx.url}',
  headers: {
${headersStr}
  },${dataLine}
})

console.log(data)`
}

function snippetGo(ctx: SnippetContext, method: HttpMethod): string {
  const headerLines: string[] = []
  for (const p of ctx.headerParams) {
    const val = p.example ?? p.schema?.example ?? `<${p.name}>`
    headerLines.push(`\treq.Header.Set("${p.name}", "${String(val)}")`)
  }
  if (ctx.hasSecurity) headerLines.push('\treq.Header.Set("Authorization", "Basic <base64(user:pass)>")')

  if (ctx.isFormData) {
    const textFields = ctx.formFields.filter((f) => !f.isBinary)
    const fileFields = ctx.formFields.filter((f) => f.isBinary)

    const textWrites = textFields.map(
      (f) => `\t_ = w.WriteField("${f.name}", "${f.example}")`,
    )
    const fileWrites = fileFields.map(
      (f) =>
        `\tfw, _ := w.CreateFormFile("${f.name}", filepath.Base("${f.example}"))\n` +
        `\tf, _ := os.Open("${f.example}")\n` +
        `\t_, _ = io.Copy(fw, f)\n` +
        `\tf.Close()`,
    )
    const bodySetup = [...textWrites, ...fileWrites].join('\n')

    return `package main

import (
\t"bytes"
\t"fmt"
\t"io"
\t"mime/multipart"
\t"net/http"${fileFields.length > 0 ? '\n\t"os"\n\t"path/filepath"' : ''}
)

func main() {
\tvar buf bytes.Buffer
\tw := multipart.NewWriter(&buf)
${bodySetup}
\tw.Close()

\treq, _ := http.NewRequest("${method.toUpperCase()}", "${ctx.url}", &buf)
\treq.Header.Set("Content-Type", w.FormDataContentType())
${headerLines.join('\n')}
\tclient := &http.Client{}
\tresp, _ := client.Do(req)
\tdefer resp.Body.Close()
\tb, _ := io.ReadAll(resp.Body)
\tfmt.Println(string(b))
}`
  }

  const bodyVar = ctx.contentType
    ? `\tbody := strings.NewReader(\`${JSON.stringify(ctx.bodyExample, null, 2)}\`)`
    : '\tbody := http.NoBody'
  const bodyImport = ctx.contentType ? '\t"strings"' : ''

  if (ctx.contentType && !ctx.isFormData) {
    headerLines.push(`\treq.Header.Set("Content-Type", "${ctx.contentType}")`)
  }

  return `package main

import (
\t"fmt"
\t"io"
\t"net/http"${bodyImport ? `\n${bodyImport}` : ''}
)

func main() {
${bodyVar}
\treq, _ := http.NewRequest("${method.toUpperCase()}", "${ctx.url}", body)
${headerLines.join('\n')}
\tclient := &http.Client{}
\tresp, _ := client.Do(req)
\tdefer resp.Body.Close()
\tb, _ := io.ReadAll(resp.Body)
\tfmt.Println(string(b))
}`
}

function snippetPython(ctx: SnippetContext, method: HttpMethod): string {
  const headers: Record<string, string> = { Accept: 'application/json' }
  for (const p of ctx.headerParams) {
    const val = p.example ?? p.schema?.example ?? `<${p.name}>`
    headers[p.name] = String(val)
  }
  if (ctx.hasSecurity) headers['Authorization'] = 'Basic <base64(user:pass)>'
  // requests sets Content-Type with boundary automatically for multipart
  if (ctx.contentType && !ctx.isFormData) headers['Content-Type'] = ctx.contentType

  const headersStr = JSON.stringify(headers, null, 4)

  if (ctx.isFormData) {
    const textFields = ctx.formFields.filter((f) => !f.isBinary)
    const fileFields = ctx.formFields.filter((f) => f.isBinary)

    const dataEntries = textFields.map((f) => `    '${f.name}': '${f.example}'`).join(',\n')
    const filesEntries = fileFields.map((f) => `    '${f.name}': open('${f.example}', 'rb')`).join(',\n')

    const dataArg = dataEntries ? `\ndata = {\n${dataEntries}\n}\n` : ''
    const filesArg = filesEntries ? `\nfiles = {\n${filesEntries}\n}\n` : ''
    const callArgs = [
      dataEntries ? 'data=data' : '',
      filesEntries ? 'files=files' : '',
    ].filter(Boolean).join(', ')

    return `import requests

headers = ${headersStr}
${dataArg}${filesArg}
response = requests.${method}(
    "${ctx.url}",
    headers=headers,
    ${callArgs}
)

print(response.json())`
  }

  const jsonLine =
    ctx.contentType
      ? `\njson_data = ${JSON.stringify(ctx.bodyExample, null, 4)}\n`
      : ''
  const bodyArg = ctx.contentType ? ', json=json_data' : ''

  return `import requests

headers = ${headersStr}
${jsonLine}
response = requests.${method}(
    "${ctx.url}",
    headers=headers${bodyArg}
)

print(response.json())`
}

function snippetPhp(ctx: SnippetContext, method: HttpMethod): string {
  const headerLines: string[] = [`    'Accept: application/json'`]
  for (const p of ctx.headerParams) {
    const val = p.example ?? p.schema?.example ?? `<${p.name}>`
    headerLines.push(`    '${p.name}: ${String(val)}'`)
  }
  if (ctx.hasSecurity) headerLines.push(`    'Authorization: Basic <base64(user:pass)>'`)
  // Do NOT set Content-Type manually for multipart — curl handles the boundary
  if (ctx.contentType && !ctx.isFormData) headerLines.push(`    'Content-Type: ${ctx.contentType}'`)

  if (ctx.isFormData) {
    const fieldEntries = ctx.formFields.map((f) => {
      if (f.isBinary) {
        return `    '${f.name}' => new CURLFile('${f.example}'),`
      }
      return `    '${f.name}' => '${f.example}',`
    })

    return `<?php

$ch = curl_init();

curl_setopt_array($ch, [
    CURLOPT_URL => '${ctx.url}',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => '${method.toUpperCase()}',
    CURLOPT_HTTPHEADER => [
${headerLines.join(',\n')}
    ],
    CURLOPT_POSTFIELDS => [
${fieldEntries.join('\n')}
    ],
]);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
var_dump($data);`
  }

  const bodyOption = ctx.contentType
    ? `\nCURLOPT_POSTFIELDS => json_encode(${JSON.stringify(ctx.bodyExample, null, 4)}),`
    : ''

  return `<?php

$ch = curl_init();

curl_setopt_array($ch, [
    CURLOPT_URL => '${ctx.url}',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => '${method.toUpperCase()}',
    CURLOPT_HTTPHEADER => [
${headerLines.join(',\n')}
    ],${bodyOption}
]);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
var_dump($data);`
}

function snippetRuby(ctx: SnippetContext, method: HttpMethod): string {
  const headerLines: string[] = [`  'Accept' => 'application/json'`]
  for (const p of ctx.headerParams) {
    const val = p.example ?? p.schema?.example ?? `<${p.name}>`
    headerLines.push(`  '${p.name}' => '${String(val)}'`)
  }
  if (ctx.hasSecurity) headerLines.push(`  'Authorization' => 'Basic <base64(user:pass)>'`)
  if (ctx.contentType && !ctx.isFormData) headerLines.push(`  'Content-Type' => '${ctx.contentType}'`)

  if (ctx.isFormData) {
    const textFields = ctx.formFields.filter((f) => !f.isBinary)
    const fileFields = ctx.formFields.filter((f) => f.isBinary)

    const textEntries = textFields.map((f) => `  '${f.name}' => '${f.example}'`).join(",\n")
    const fileEntries = fileFields.map(
      (f) =>
        `  '${f.name}' => UploadIO.new('${f.example}', 'application/octet-stream')`,
    ).join(",\n")
    const allEntries = [textEntries, fileEntries].filter(Boolean).join(",\n")

    return `require 'net/http'
require 'net/http/post/multipart'
require 'uri'

uri = URI('${ctx.url}')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = uri.scheme == 'https'

request = Net::HTTP::${method.charAt(0).toUpperCase() + method.slice(1)}.new(uri.request_uri)
request.set_form(
  [
${allEntries}
  ],
  'multipart/form-data'
)

headers = {
${headerLines.join(",\n")}
}
headers.each { |k, v| request[k] = v }

response = http.request(request)
puts JSON.parse(response.body)`
  }

  const bodyLine =
    ctx.contentType
      ? `\nbody = ${JSON.stringify(ctx.bodyExample, null, 2).replace(/\n/g, '\n')}.to_json\n`
      : ''

  return `require 'net/http'
require 'json'
require 'uri'

uri = URI('${ctx.url}')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = uri.scheme == 'https'
${bodyLine}
headers = {
${headerLines.join(",\n")}
}

request = Net::HTTP::${method.charAt(0).toUpperCase() + method.slice(1)}.new(uri.request_uri, headers)
${ctx.contentType && !ctx.isFormData ? "request.body = body\n" : ''}
response = http.request(request)
puts JSON.parse(response.body)`
}

function snippetRust(ctx: SnippetContext, method: HttpMethod): string {
  const insertLines: string[] = []
  for (const p of ctx.headerParams) {
    const val = p.example ?? p.schema?.example ?? `<${p.name}>`
    insertLines.push(`        .header("${p.name}", "${String(val)}")`)
  }
  if (ctx.hasSecurity) {
    insertLines.push(`        .header("Authorization", "Basic <base64(user:pass)>")`)
  }

  if (ctx.isFormData) {
    const formParts = ctx.formFields.map((f) => {
      if (f.isBinary) {
        return (
          `    let file_bytes = std::fs::read("${f.example}")?;\n` +
          `    let part_${f.name} = reqwest::blocking::multipart::Part::bytes(file_bytes)\n` +
          `        .file_name("${f.example.split('/').pop() ?? f.name}")\n` +
          `        .mime_str("application/octet-stream")?;\n` +
          `    let form = form.part("${f.name}", part_${f.name});`
        )
      }
      return `    let form = form.text("${f.name}", "${f.example}");`
    })

    return `use reqwest::blocking::Client;
use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    let client = Client::new();

    let form = reqwest::blocking::multipart::Form::new();
${formParts.join('\n')}

    let response = client
        .${method}("${ctx.url}")
        .header("Accept", "application/json")
${insertLines.join('\n')}
        .multipart(form)
        .send()?;

    let body = response.text()?;
    println!("{}", body);
    Ok(())
}`
  }

  const bodyLine =
    ctx.contentType
      ? `        .header("Content-Type", "${ctx.contentType}")\n        .body(r#"${JSON.stringify(ctx.bodyExample, null, 2)}"#)?`
      : `        .body(reqwest::Body::default())?`

  return `use reqwest::blocking::Client;
use std::error::Error;

fn main() -> Result<(), Box<dyn Error>> {
    let client = Client::new();

    let response = client
        .${method}("${ctx.url}")
        .header("Accept", "application/json")
${insertLines.join('\n')}
${bodyLine}
        .send()?;

    let body = response.text()?;
    println!("{}", body);
    Ok(())
}`
}

const SNIPPET_LANGS = ['cURL', 'Fetch', 'Axios', 'Python', 'Go', 'PHP', 'Ruby', 'Rust'] as const
type SnippetLang = (typeof SNIPPET_LANGS)[number]

function buildAllSnippets(
  baseUrl: string | null,
  path: string,
  method: HttpMethod,
  op: OAOperation,
  components?: OASpec['components'],
): Record<SnippetLang, string> {
  const ctx = buildSnippetContext(baseUrl, path, op, components)
  return {
    cURL: snippetCurl(ctx, method),
    Fetch: snippetFetch(ctx, method),
    Axios: snippetAxios(ctx, method),
    Python: snippetPython(ctx, method),
    Go: snippetGo(ctx, method),
    PHP: snippetPhp(ctx, method),
    Ruby: snippetRuby(ctx, method),
    Rust: snippetRust(ctx, method),
  }
}

// ── UI helpers ─────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </h4>
  )
}

function JsonBlock({ value }: { value: unknown }) {
  const [copied, setCopied] = useState(false)
  const text = JSON.stringify(value, null, 2)

  function handleCopy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleCopy}
        title="Copy JSON"
        className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
      >
        {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
      </button>
      <pre className="overflow-x-auto rounded-md bg-muted px-4 py-3 pr-10 text-xs font-mono leading-relaxed">
        {text}
      </pre>
    </div>
  )
}

function CodeSnippets({
  snippets,
}: {
  snippets: Record<SnippetLang, string>
}) {
  const [active, setActive] = useState<SnippetLang>('cURL')
  const [copied, setCopied] = useState(false)
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const code = snippets[active]

  // Map tab label → Prism language id
  const LANG_MAP: Record<SnippetLang, string> = {
    cURL:   'bash',
    Fetch:  'javascript',
    Axios:  'javascript',
    Python: 'python',
    Go:     'go',
    PHP:    'php',
    Ruby:   'ruby',
    Rust:   'rust',
  }

  const prismLang = LANG_MAP[active]
  const prismTheme = isDark ? themes.oneDark : themes.oneLight

  function handleCopy() {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="flex flex-col gap-0 overflow-hidden rounded-md border">
      {/* Tab bar — scrollable, no copy button here */}
      <div className="flex items-center gap-0 overflow-x-auto border-b bg-muted/40">
        {SNIPPET_LANGS.map((lang) => (
          <button
            key={lang}
            type="button"
            onClick={() => setActive(lang)}
            className={cn(
              'shrink-0 px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
              active === lang
                ? 'border-b-2 border-foreground bg-background text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {lang}
          </button>
        ))}
      </div>

      {/* Code block — copy button is sticky in the top-right corner */}
      <div className="relative">
        <button
          type="button"
          onClick={handleCopy}
          title="Copy code"
          className="absolute right-2 top-2 z-10 rounded p-1.5 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
        </button>

        <Highlight prism={Prism} theme={prismTheme} code={code} language={prismLang}>
          {({ style, tokens, getLineProps, getTokenProps }) => (
            <pre
              style={{ ...style, margin: 0, borderRadius: 0 }}
              className="overflow-x-auto px-4 py-3 pr-10 text-xs font-mono leading-relaxed"
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, j) => (
                    <span key={j} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  )
}

// ── Components ─────────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span
      className={cn(
        'inline-flex w-[58px] shrink-0 items-center justify-center rounded border px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-widest',
        METHOD_COLORS[method],
      )}
    >
      {method}
    </span>
  )
}

function InBadge({ location }: { location: string }) {
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-[10px] font-medium',
        IN_COLORS[location] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {location}
    </span>
  )
}

/** Parameters table — shows all `in` types, with a coloured badge per location */
function ParamsTable({ params }: { params: OAParameter[] }) {
  if (params.length === 0) return null

  // Group order: path → header → query → cookie
  const order = { path: 0, header: 1, query: 2, cookie: 3 }
  const sorted = [...params].sort(
    (a, b) => (order[a.in] ?? 9) - (order[b.in] ?? 9),
  )

  return (
    <div className="rounded-md border text-xs">
      {/* Mobile: card list */}
      <div className="flex flex-col divide-y sm:hidden">
        {sorted.map((p) => {
          const exampleVal = p.example ?? p.schema?.example
          return (
            <div key={`${p.in}-${p.name}`} className="flex flex-col gap-1.5 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">{p.name}</span>
                <InBadge location={p.in} />
                {p.required && <span className="text-red-500 font-bold text-[10px]">required</span>}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                <span className="font-mono">{schemaTypeSummary(p.schema)}</span>
                {exampleVal !== undefined && (
                  <span className="rounded bg-muted px-1 py-0.5 font-mono">{formatExample(exampleVal)}</span>
                )}
              </div>
              {p.description && <p className="text-muted-foreground">{p.description}</p>}
            </div>
          )
        })}
      </div>

      {/* Desktop: full table */}
      <table className="hidden w-full border-collapse sm:table">
        <thead>
          <tr className="bg-muted/50 text-muted-foreground">
            <th className="px-3 py-2 text-left font-semibold">Name</th>
            <th className="px-3 py-2 text-left font-semibold">In</th>
            <th className="px-3 py-2 text-left font-semibold">Type</th>
            <th className="px-3 py-2 text-left font-semibold">Req</th>
            <th className="px-3 py-2 text-left font-semibold">Example</th>
            <th className="px-3 py-2 text-left font-semibold">Description</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const exampleVal = p.example ?? p.schema?.example
            return (
              <tr key={`${p.in}-${p.name}`} className="border-t align-top">
                <td className="px-3 py-2 font-mono font-semibold">{p.name}</td>
                <td className="px-3 py-2">
                  <InBadge location={p.in} />
                </td>
                <td className="px-3 py-2 font-mono text-muted-foreground">
                  {schemaTypeSummary(p.schema)}
                </td>
                <td className="px-3 py-2 text-center">
                  {p.required ? (
                    <span className="text-red-500 font-bold">✓</span>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-muted-foreground">
                  {exampleVal !== undefined ? (
                    <span className="rounded bg-muted px-1 py-0.5">{formatExample(exampleVal)}</span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{p.description ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Request body field table */
function BodyTable({
  requestBody,
  components,
}: {
  requestBody: OARequestBody
  components?: OASpec['components']
}) {
  const content = requestBody.content ?? {}
  const contentType = Object.keys(content)[0]
  if (!contentType) return null

  const media = content[contentType]
  const schema = media?.schema
  const props = getProperties(schema, components)

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Content-Type:{' '}
        <code className="rounded bg-muted px-1 py-0.5 font-mono">{contentType}</code>
        {requestBody.required && (
          <span className="ml-2 text-red-500 font-semibold">required</span>
        )}
      </p>

      {props.length > 0 && (
        <div className="rounded-md border text-xs">
          {/* Mobile: card list */}
          <div className="flex flex-col divide-y sm:hidden">
            {props.map(({ name, schema: s, required }) => {
              const ex = s.example
              return (
                <div key={name} className="flex flex-col gap-1.5 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{name}</span>
                    <span className="font-mono text-muted-foreground">{schemaTypeSummary(s)}</span>
                    {required && <span className="text-red-500 font-bold text-[10px]">required</span>}
                  </div>
                  {ex !== undefined && (
                    <span className="w-fit rounded bg-muted px-1 py-0.5 font-mono text-muted-foreground">
                      {formatExample(ex)}
                    </span>
                  )}
                  {s.description && <p className="text-muted-foreground">{s.description}</p>}
                </div>
              )
            })}
          </div>

          {/* Desktop: full table */}
          <table className="hidden w-full border-collapse sm:table">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                <th className="px-3 py-2 text-left font-semibold">Field</th>
                <th className="px-3 py-2 text-left font-semibold">Type</th>
                <th className="px-3 py-2 text-left font-semibold">Req</th>
                <th className="px-3 py-2 text-left font-semibold">Example</th>
                <th className="px-3 py-2 text-left font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              {props.map(({ name, schema: s, required }) => {
                const ex = s.example
                return (
                  <tr key={name} className="border-t align-top">
                    <td className="px-3 py-2 font-mono font-semibold">{name}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">
                      {schemaTypeSummary(s)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {required ? (
                        <span className="text-red-500 font-bold">✓</span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">
                      {ex !== undefined ? (
                        <span className="rounded bg-muted px-1 py-0.5">{formatExample(ex)}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{s.description ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Example body JSON */}
      {schema && (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-medium text-muted-foreground">Example payload</p>
          <JsonBlock value={buildExampleFromSchema(schema, components)} />
        </div>
      )}
    </div>
  )
}

/** Expandable response entry */
function ResponseEntry({
  code,
  response,
  components,
}: {
  code: string
  response: OAResponse
  components?: OASpec['components']
}) {
  const [open, setOpen] = useState(false)

  const contentTypes = Object.keys(response.content ?? {})
  const firstMedia = contentTypes.length > 0 ? response.content![contentTypes[0]] : null
  const exampleValue =
    firstMedia?.example ??
    (firstMedia?.examples ? Object.values(firstMedia.examples)[0]?.value : undefined) ??
    (firstMedia?.schema ? buildExampleFromSchema(firstMedia.schema, components) : undefined)

  const hasExample = exampleValue !== undefined && exampleValue !== null
  const colorCls = statusColor(code)

  return (
    <div className={cn('rounded-md border text-xs overflow-hidden', colorCls)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        disabled={!hasExample}
      >
        <span className="font-mono font-bold">{code}</span>
        {response.description && (
          <span className="opacity-80">{response.description}</span>
        )}
        {hasExample && (
          <span className="ml-auto opacity-60">
            {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </span>
        )}
      </button>

      {open && hasExample && (
        <div className="border-t border-current/20 bg-background/80 px-3 py-3 text-foreground">
          {contentTypes[0] && (
            <p className="mb-2 text-[10px] text-muted-foreground">
              Content-Type:{' '}
              <code className="font-mono">{contentTypes[0]}</code>
            </p>
          )}
          <JsonBlock value={exampleValue} />
        </div>
      )}
    </div>
  )
}

function ResponsesSection({
  responses,
  components,
}: {
  responses: Record<string, OAResponse>
  components?: OASpec['components']
}) {
  const entries = Object.entries(responses)
  if (entries.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {entries.map(([code, resp]) => (
        <ResponseEntry key={code} code={code} response={resp} components={components} />
      ))}
    </div>
  )
}

interface EndpointCardProps {
  path: string
  method: HttpMethod
  operation: OAOperation
  components?: OASpec['components']
  baseUrl: string | null
}

function EndpointCard({ path, method, operation, components, baseUrl }: EndpointCardProps) {
  const [open, setOpen] = useState(false)

  const params = resolveParameters(operation.parameters, components)
  const hasBody = !!operation.requestBody
  const hasResponses = Object.keys(operation.responses ?? {}).length > 0
  const snippets = open
    ? buildAllSnippets(baseUrl, path, method, operation, components)
    : null

  return (
    <div className={cn('rounded-lg border transition-colors', open ? 'border-border' : 'border-border/60')}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted/30"
      >
        <MethodBadge method={method} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <code className="break-all text-sm font-mono font-semibold">{path}</code>
            {operation.deprecated && (
              <Badge variant="outline" className="border-amber-400 text-[10px] text-amber-600">
                deprecated
              </Badge>
            )}
          </div>
          {operation.summary && (
            <p className="mt-0.5 text-sm text-muted-foreground">{operation.summary}</p>
          )}
        </div>
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </span>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="flex flex-col gap-5 border-t px-4 py-5">
          {/* Description */}
          {operation.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {operation.description}
            </p>
          )}

          {/* Parameters */}
          {params.length > 0 && (
            <div className="flex flex-col gap-2">
              <SectionHeading>Parameters</SectionHeading>
              <ParamsTable params={params} />
            </div>
          )}

          {/* Request body */}
          {hasBody && operation.requestBody && (
            <div className="flex flex-col gap-2">
              <SectionHeading>Request Body</SectionHeading>
              <BodyTable requestBody={operation.requestBody} components={components} />
            </div>
          )}

          {/* Responses */}
          {hasResponses && (
            <div className="flex flex-col gap-2">
              <SectionHeading>Responses</SectionHeading>
              <ResponsesSection
                responses={operation.responses ?? {}}
                components={components}
              />
            </div>
          )}

          {/* Code snippets */}
          {snippets && (
            <div className="flex flex-col gap-2">
              <SectionHeading>Code Samples</SectionHeading>
              <CodeSnippets snippets={snippets} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tag group ──────────────────────────────────────────────────────────────

interface TagGroupProps {
  tag: string
  description?: string
  endpoints: Array<{ path: string; method: HttpMethod; operation: OAOperation }>
  components?: OASpec['components']
  baseUrl: string | null
}

function TagGroup({ tag, description, endpoints, components, baseUrl }: TagGroupProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-1 py-1 text-left transition-colors hover:bg-muted/30"
      >
        {open ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className="text-base font-semibold capitalize">{tag}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {endpoints.length}
        </span>
      </button>

      {description && (
        <p className="pl-6 -mt-1 text-sm text-muted-foreground">{description}</p>
      )}

      {open && (
        <div className="flex flex-col gap-2 pl-2">
          {endpoints.map(({ path, method, operation }) => (
            <EndpointCard
              key={`${method}:${path}`}
              path={path}
              method={method}
              operation={operation}
              components={components}
              baseUrl={baseUrl}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────

interface OpenAPIReferenceProps {
  spec: OASpec
  baseUrl: string | null
}

export function OpenAPIReference({ spec, baseUrl }: OpenAPIReferenceProps) {
  // Build tag → endpoints map
  const tagMap = new Map<string, Array<{ path: string; method: HttpMethod; operation: OAOperation }>>()
  const untagged: Array<{ path: string; method: HttpMethod; operation: OAOperation }> = []

  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const op = pathItem[method]
      if (!op) continue
      const tags = op.tags?.length ? op.tags : null
      if (tags) {
        for (const tag of tags) {
          if (!tagMap.has(tag)) tagMap.set(tag, [])
          tagMap.get(tag)!.push({ path, method, operation: op })
        }
      } else {
        untagged.push({ path, method, operation: op })
      }
    }
  }

  // Follow spec.tags order, then append any extra tags
  const orderedTags: OATag[] = []
  for (const t of spec.tags ?? []) {
    if (tagMap.has(t.name)) orderedTags.push(t)
  }
  for (const name of tagMap.keys()) {
    if (!orderedTags.find((t) => t.name === name)) orderedTags.push({ name })
  }

  const info = spec.info

  return (
    <div className="flex flex-col gap-6">
      {/* Info */}
      {info && (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold">{info.title}</h2>
            {info.version && (
              <Badge variant="outline" className="font-mono text-xs">
                v{info.version}
              </Badge>
            )}
          </div>
          {info.description && (
            <p className="max-w-3xl text-sm text-muted-foreground whitespace-pre-wrap">
              {info.description.split('\n').slice(0, 4).join('\n')}
            </p>
          )}
          {baseUrl && (
            <p className="text-xs text-muted-foreground">
              Server:{' '}
              <code className="rounded bg-muted px-1 py-0.5 font-mono">{baseUrl}</code>
            </p>
          )}
        </div>
      )}

      {/* Tag groups */}
      {orderedTags.map((tag) => (
        <TagGroup
          key={tag.name}
          tag={tag.name}
          description={tag.description}
          endpoints={tagMap.get(tag.name) ?? []}
          components={spec.components}
          baseUrl={baseUrl}
        />
      ))}

      {untagged.length > 0 && (
        <TagGroup
          tag="Other"
          endpoints={untagged}
          components={spec.components}
          baseUrl={baseUrl}
        />
      )}
    </div>
  )
}

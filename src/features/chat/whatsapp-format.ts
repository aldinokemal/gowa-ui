/**
 * Parser for WhatsApp text formatting. It is pure and returns a small tree, so
 * the renderer can build React elements from it and message text is never
 * injected as HTML.
 *
 * Inline: *bold*, _italic_, ~strike~, `code` and ```monospace```.
 * Line starts: "> " quote, "- " / "* " bullet list, "1. " numbered list.
 */

export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'bold' | 'italic' | 'strike'; children: InlineNode[] }
  | { type: 'code'; text: string }
  | { type: 'mono'; text: string }

export type FormattedLine = InlineNode[]

export interface ListItem {
  number?: number
  content: FormattedLine
}

export type FormattedBlock =
  | { type: 'paragraph'; lines: FormattedLine[] }
  | { type: 'quote'; lines: FormattedLine[] }
  | { type: 'list'; ordered: boolean; items: ListItem[] }

type Piece = { kind: 'text'; value: string } | { kind: 'mono'; value: string }

const INLINE_MARKERS: Record<string, 'bold' | 'italic' | 'strike' | 'code'> = {
  '*': 'bold',
  _: 'italic',
  '~': 'strike',
  '`': 'code',
}

const FENCE = '```'
const WORD_CHAR = /[\p{L}\p{N}]/u
const SPACE = /\s/
const QUOTE_PREFIX = /^> /
const BULLET_PREFIX = /^[-*] /
const ORDERED_PREFIX = /^(\d+)\. /

/** Splits text into plain text and ```monospace``` pieces. */
function splitFences(text: string): Piece[] {
  const pieces: Piece[] = []
  let rest = text
  let plain = ''
  while (rest.length > 0) {
    const start = rest.indexOf(FENCE)
    if (start === -1) break
    const end = rest.indexOf(FENCE, start + FENCE.length)
    if (end === -1) break
    const inner = rest.slice(start + FENCE.length, end)
    if (!/\S/.test(inner)) {
      // Not a monospace span; keep the opening fence as text and continue after it.
      plain += rest.slice(0, start + FENCE.length)
      rest = rest.slice(start + FENCE.length)
      continue
    }
    plain += rest.slice(0, start)
    if (plain) pieces.push({ kind: 'text', value: plain })
    plain = ''
    pieces.push({ kind: 'mono', value: inner })
    rest = rest.slice(end + FENCE.length)
  }
  plain += rest
  if (plain) pieces.push({ kind: 'text', value: plain })
  return pieces
}

/** Groups pieces into lines. A monospace piece keeps its own line breaks. */
function splitLines(pieces: Piece[]): Piece[][] {
  const lines: Piece[][] = [[]]
  for (const piece of pieces) {
    if (piece.kind === 'mono') {
      lines[lines.length - 1].push(piece)
      continue
    }
    piece.value.split('\n').forEach((part, index) => {
      if (index > 0) lines.push([])
      if (part) lines[lines.length - 1].push({ kind: 'text', value: part })
    })
  }
  return lines
}

// An opening marker is followed by non-space content and is not preceded by a
// letter or digit, so snake_case and 2*3*4 stay plain. A closing marker mirrors
// that. A repeated marker (e.g. "``") never opens or closes on the inner side.
function canOpen(text: string, index: number): boolean {
  const next = text[index + 1]
  if (next === undefined || next === text[index] || SPACE.test(next)) return false
  const prev = text[index - 1]
  return prev === undefined || !WORD_CHAR.test(prev)
}

function canClose(text: string, index: number): boolean {
  const prev = text[index - 1]
  if (prev === undefined || prev === text[index] || SPACE.test(prev)) return false
  const next = text[index + 1]
  return next === undefined || !WORD_CHAR.test(next)
}

function findClose(text: string, marker: string, openIndex: number): number {
  for (let index = openIndex + 2; index < text.length; index++) {
    if (text[index] === marker && canClose(text, index)) return index
  }
  return -1
}

/** Parses inline markers in a single line of plain text. */
export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = []
  // A failed closer scan for a marker also fails for every later opener of that
  // marker, so skip repeat scans to keep unmatched markers linear.
  const unclosed = new Set<string>()
  let buffer = ''
  let index = 0
  while (index < text.length) {
    const char = text[index]
    const type = INLINE_MARKERS[char]
    if (type && !unclosed.has(char) && canOpen(text, index)) {
      const close = findClose(text, char, index)
      if (close === -1) unclosed.add(char)
      if (close !== -1) {
        if (buffer) nodes.push({ type: 'text', text: buffer })
        buffer = ''
        const inner = text.slice(index + 1, close)
        nodes.push(
          type === 'code' ? { type: 'code', text: inner } : { type, children: parseInline(inner) },
        )
        index = close + 1
        continue
      }
    }
    buffer += char
    index++
  }
  if (buffer) nodes.push({ type: 'text', text: buffer })
  return nodes
}

function parseLine(pieces: Piece[]): FormattedLine {
  return pieces.flatMap((piece): InlineNode[] =>
    piece.kind === 'mono' ? [{ type: 'mono', text: piece.value }] : parseInline(piece.value),
  )
}

/** Removes a matched line prefix from the first text piece of a line. */
function stripPrefix(pieces: Piece[], length: number): Piece[] {
  const [first, ...rest] = pieces
  if (first.kind !== 'text') return pieces
  const value = first.value.slice(length)
  return value ? [{ kind: 'text', value }, ...rest] : rest
}

type LineKind =
  | { kind: 'plain' }
  | { kind: 'quote'; length: number }
  | { kind: 'bullet'; length: number }
  | { kind: 'ordered'; length: number; number: number }

function classifyLine(pieces: Piece[]): LineKind {
  const first = pieces[0]
  if (!first || first.kind !== 'text') return { kind: 'plain' }
  const quote = QUOTE_PREFIX.exec(first.value)
  if (quote) return { kind: 'quote', length: quote[0].length }
  const bullet = BULLET_PREFIX.exec(first.value)
  if (bullet) return { kind: 'bullet', length: bullet[0].length }
  const ordered = ORDERED_PREFIX.exec(first.value)
  if (ordered) return { kind: 'ordered', length: ordered[0].length, number: Number(ordered[1]) }
  return { kind: 'plain' }
}

/** Parses a message into blocks of formatted lines. */
export function parseWhatsAppText(text: string): FormattedBlock[] {
  const blocks: FormattedBlock[] = []
  for (const pieces of splitLines(splitFences(text))) {
    const line = classifyLine(pieces)
    const last = blocks[blocks.length - 1]

    if (line.kind === 'plain') {
      const content = parseLine(pieces)
      if (last?.type === 'paragraph') last.lines.push(content)
      else blocks.push({ type: 'paragraph', lines: [content] })
      continue
    }

    const content = parseLine(stripPrefix(pieces, line.length))
    if (line.kind === 'quote') {
      if (last?.type === 'quote') last.lines.push(content)
      else blocks.push({ type: 'quote', lines: [content] })
      continue
    }

    const ordered = line.kind === 'ordered'
    const item: ListItem = line.kind === 'ordered' ? { number: line.number, content } : { content }
    if (last?.type === 'list' && last.ordered === ordered) last.items.push(item)
    else blocks.push({ type: 'list', ordered, items: [item] })
  }
  return blocks
}

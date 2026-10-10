import { Fragment, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  parseWhatsAppText,
  type FormattedBlock,
  type FormattedLine,
  type InlineNode,
} from '@/features/chat/whatsapp-format'

function renderInline(nodes: InlineNode[]): ReactNode[] {
  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return <Fragment key={index}>{node.text}</Fragment>
      case 'bold':
        return <strong key={index}>{renderInline(node.children)}</strong>
      case 'italic':
        return <em key={index}>{renderInline(node.children)}</em>
      case 'strike':
        return <s key={index}>{renderInline(node.children)}</s>
      case 'code':
        return (
          <code key={index} className="bg-muted rounded px-1 font-mono text-[0.9em]">
            {node.text}
          </code>
        )
      case 'mono':
        return (
          <code key={index} className="font-mono text-[0.9em]">
            {node.text}
          </code>
        )
    }
  })
}

/** Renders lines separated by line breaks; the container keeps whitespace-pre-wrap. */
function renderLines(lines: FormattedLine[]): ReactNode[] {
  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 && '\n'}
      {renderInline(line)}
    </Fragment>
  ))
}

function renderBlock(block: FormattedBlock, index: number): ReactNode {
  switch (block.type) {
    case 'paragraph':
      return <div key={index}>{renderLines(block.lines)}</div>
    case 'quote':
      return (
        <blockquote key={index} className="border-l-2 border-current/30 pl-2 opacity-80">
          {renderLines(block.lines)}
        </blockquote>
      )
    case 'list':
      if (block.ordered) {
        return (
          <ol key={index} className="list-decimal pl-5">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} value={item.number}>
                {renderInline(item.content)}
              </li>
            ))}
          </ol>
        )
      }
      return (
        <ul key={index} className="list-disc pl-5">
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item.content)}</li>
          ))}
        </ul>
      )
  }
}

/** Message text with WhatsApp formatting, rendered as React elements (never as HTML). */
export function FormattedText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('break-words whitespace-pre-wrap', className)}>
      {parseWhatsAppText(text).map(renderBlock)}
    </div>
  )
}

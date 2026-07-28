import { useMemo } from 'react'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

/**
 * The thread's markdown (July 28 ruling — the Claude-chat pattern): Deb's
 * lines and Chris's render a SUBSET — bold, italic, lists, line breaks,
 * inline code. No headers, no tables, no images, no links in V1: her
 * register doesn't need them and the thread must not look like a wiki.
 * The composer stays a plain textarea; typed markdown renders on send.
 *
 * Law: rendered markdown is the same threat surface as ingested content —
 * it must never execute anything. marked renders, then DOMPurify strips
 * to the allowlist below (no attributes at all); everything outside it
 * survives only as its text.
 */
const ALLOWED_TAGS = ['p', 'em', 'strong', 'ul', 'ol', 'li', 'code', 'br']

marked.use({ breaks: true, gfm: true })

export function renderMarkdown(text: string): string {
  const html = marked.parse(text, { async: false })
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR: [] })
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const html = useMemo(() => renderMarkdown(text), [text])
  return (
    <div
      className={`md ${className ?? ''}`}
      // Sanitized above — the allowlist is the whole contract.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

import { describe, expect, it } from 'vitest'
import { attachmentText, bodyToText, htmlToText, readEmail } from './email.js'

/**
 * The chute's payload pipeline (July 29 ledger diagnosis). Three cases
 * Chris ruled must hold:
 *   1. an HTML-only body still becomes text — never couldn't-read while
 *      words exist
 *   2. body + stroke PDF: the words file; the drawn ink honestly yields
 *      nothing (reMarkable's default export has no text layer)
 *   3. body + text attachment: both reach the page
 */

/** A minimal, structurally valid PDF whose only content is drawn ink —
 *  a stroke path, no text operators, no text layer. Built with correct
 *  xref offsets so the parser reads it cleanly and finds no words. */
function strokePdf(): string {
  const stream = '1 w\n100 100 m\n200 200 l\n300 150 l\nS\n'
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objs.forEach((o, i) => {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  const xrefPos = pdf.length
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1').toString('base64')
}

describe('the chute reads what actually ships', () => {
  it('derives text from an HTML-only body — no text/plain part', () => {
    const email = readEmail({
      type: 'email.received',
      data: {
        email_id: 'em_123',
        from: 'Chris Putsch <chris@example.com>',
        to: ['chute@example.com'],
        subject: 'morning pages',
        html: '<div><p>Call Larry &amp; settle Tyler&#8217;s invoice tomorrow.</p><p>Second thought &mdash; check the lease.</p></div>',
      },
    })
    expect(email).not.toBeNull()
    expect(email!.text).toBeNull()
    expect(email!.emailId).toBe('em_123') // the key to the follow-up fetch
    const body = bodyToText(email!.text, email!.html)
    expect(body).toContain('Call Larry & settle Tyler’s invoice tomorrow.')
    expect(body).toContain('Second thought — check the lease.')
    expect(body).not.toContain('<') // no tags survive
  })

  it('body + stroke PDF: the words file, the ink honestly yields nothing', async () => {
    const body = bodyToText('Rode out to the site this morning.', null)
    expect(body).toBe('Rode out to the site this morning.')
    const ink = await attachmentText({
      filename: 'notes.pdf',
      contentType: 'application/pdf',
      content: strokePdf(),
    })
    expect(ink).toBeNull() // no text layer → the honest couldn't-read for this part
  })

  it('body + text attachment: both reach the page', async () => {
    const body = bodyToText(null, '<p>See the attached list.</p>')
    expect(body).toBe('See the attached list.')
    const attached = await attachmentText({
      filename: 'list.txt',
      contentType: 'text/plain',
      content: Buffer.from('1. invoice Larry\n2. call the county', 'utf8').toString('base64'),
    })
    expect(attached).toBe('1. invoice Larry\n2. call the county')
  })

  it('decodes numeric and named entities on the way to text', () => {
    expect(htmlToText('A&nbsp;&amp;&nbsp;B &#8212; C&#x2019;s')).toBe('A & B — C’s')
  })
})

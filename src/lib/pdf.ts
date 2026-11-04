'use client'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { tokenize } from './bm25'
import { chunkPages } from './chunk'
import type { Chunk, DocMeta } from './types'

export const MAX_PDF_MB = 25

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | undefined
export function getPdfjs() {
  pdfjsPromise ??= import('pdfjs-dist').then((m) => {
    m.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
    return m
  })
  return pdfjsPromise
}

export async function openPdf(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfjs()
  // pdfjs transfers the buffer to its worker, so always hand it a copy.
  return pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) }).promise
}

export class PdfError extends Error {}

export interface IngestResult {
  meta: DocMeta
  chunks: Chunk[]
}

export async function ingestPdf(
  file: File,
  onProgress?: (page: number, total: number) => void
): Promise<IngestResult> {
  if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'))
    throw new PdfError(`"${file.name}" is not a PDF`)
  if (file.size > MAX_PDF_MB * 1024 * 1024) throw new PdfError(`"${file.name}" exceeds ${MAX_PDF_MB} MB`)

  let pdf: PDFDocumentProxy
  try {
    pdf = await openPdf(await file.arrayBuffer())
  } catch (e) {
    const name = (e as { name?: string }).name
    if (name === 'PasswordException') throw new PdfError(`"${file.name}" is password protected`)
    throw new PdfError(`"${file.name}" could not be read. It may be corrupted.`)
  }

  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    let text = ''
    for (const item of content.items) {
      if ('str' in item) text += item.str + (item.hasEOL ? '\n' : ' ')
    }
    pages.push(text)
    onProgress?.(i, pdf.numPages)
  }

  const id = crypto.randomUUID()
  const chunks = chunkPages({ id, name: file.name }, pages)
  if (!chunks.length)
    throw new PdfError(`"${file.name}" has no extractable text (it looks like a scanned image; OCR isn't supported yet)`)
  const meta: DocMeta = {
    id,
    name: file.name,
    size: file.size,
    pages: pdf.numPages,
    chunks: chunks.length,
    addedAt: Date.now()
  }
  void pdf.destroy()
  return { meta, chunks }
}

/** Does this text-layer item belong to the cited passage? Cheap word-overlap test. */
export function itemInPassage(itemText: string, passageTokens: Set<string>): boolean {
  const toks = tokenize(itemText)
  if (!toks.length) return false
  const hit = toks.filter((t) => passageTokens.has(t)).length
  return hit / toks.length >= 0.6
}

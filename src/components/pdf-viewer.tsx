'use client'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { tokenize } from '@/lib/bm25'
import { itemInPassage, openPdf } from '@/lib/pdf'
import { loadBlob } from '@/lib/storage'

export interface ViewerTarget {
  docId: string
  docName: string
  page: number
  passage: string
}

export function PdfViewer({ target, onClose }: { target: ViewerTarget; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(target.page)
  const [total, setTotal] = useState(0)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [rects, setRects] = useState<{ x: number; y: number; w: number; h: number }[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })
  const pdfRef = useRef<Awaited<ReturnType<typeof openPdf>> | null>(null)

  useEffect(() => setPage(target.page), [target])

  useEffect(() => {
    let cancelled = false
    setState('loading')
    void (async () => {
      try {
        if (!pdfRef.current || (pdfRef.current as unknown as { __id?: string }).__id !== target.docId) {
          const blob = await loadBlob(target.docId)
          if (!blob) throw new Error('missing')
          const pdf = await openPdf(await blob.arrayBuffer())
          ;(pdf as unknown as { __id: string }).__id = target.docId
          pdfRef.current = pdf
        }
        const pdf = pdfRef.current
        if (cancelled) return
        setTotal(pdf.numPages)
        const p = await pdf.getPage(Math.min(Math.max(page, 1), pdf.numPages))
        const width = Math.min(wrapRef.current?.clientWidth ?? 520, 760) - 2
        const base = p.getViewport({ scale: 1 })
        const viewport = p.getViewport({ scale: width / base.width })
        const dpr = window.devicePixelRatio || 1
        const canvas = canvasRef.current!
        canvas.width = viewport.width * dpr
        canvas.height = viewport.height * dpr
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`
        const ctx = canvas.getContext('2d')!
        await p.render({ canvasContext: ctx, viewport, transform: [dpr, 0, 0, dpr, 0, 0] }).promise
        if (cancelled) return

        const passage = new Set(tokenize(target.passage))
        const content = await p.getTextContent()
        const found: typeof rects = []
        if (page === target.page) {
          for (const it of content.items) {
            if (!('str' in it) || !it.str.trim() || !itemInPassage(it.str, passage)) continue
            const [a, b, , , e, f] = it.transform as number[]
            const h = Math.hypot(a!, b!)
            const [x, y] = viewport.convertToViewportPoint(e!, f!)
            found.push({ x: x!, y: y! - h * viewport.scale, w: it.width * viewport.scale, h: h * viewport.scale * 1.2 })
          }
        }
        setSize({ w: viewport.width, h: viewport.height })
        setRects(found)
        setState('ready')
      } catch {
        if (!cancelled) setState('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [target, page])

  useEffect(() => () => void pdfRef.current?.destroy(), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <aside className="viewer" aria-label="Source viewer">
      <header>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{target.docName}</p>
          <p className="text-xs text-muted">Cited passage highlighted on page {target.page}</p>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Close viewer">
          <X size={18} />
        </button>
      </header>
      <div ref={wrapRef} className="viewer-body">
        {state === 'loading' && <div className="skeleton" style={{ height: 480 }} />}
        {state === 'error' && <p className="p-6 text-sm text-muted">Couldn&apos;t render this page. The stored PDF may have been removed.</p>}
        <div className="page-wrap" style={{ display: state === 'ready' ? 'block' : 'none', width: size.w || undefined }}>
          <canvas ref={canvasRef} />
          {rects.map((r, i) => (
            <span key={i} className="hl" style={{ left: r.x, top: r.y, width: r.w, height: r.h }} />
          ))}
        </div>
      </div>
      <footer>
        <button className="icon-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm tabular-nums">
          Page {page}
          {total ? ` / ${total}` : ''}
        </span>
        <button className="icon-btn" disabled={!total || page >= total} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
          <ChevronRight size={18} />
        </button>
      </footer>
    </aside>
  )
}

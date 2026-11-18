'use client'
import {
  ArrowUp, Check, FileText, Loader2, Menu, Moon, Plus, Quote, Sparkles, Square, Sun, Trash2, Upload, X, Download, ShieldCheck, Zap
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { citedNumbers } from '@/lib/prompt'
import { useWorkspace, type Workspace } from '@/lib/use-workspace'
import type { ChatMessage, Source } from '@/lib/types'
import { MessageText } from './message-text'
import { PdfViewer, type ViewerTarget } from './pdf-viewer'

const SUGGESTIONS = ['Summarize this document', 'What are the key numbers or statistics?', 'List the main takeaways as bullets']

export function App() {
  const ws = useWorkspace()
  const [viewer, setViewer] = useState<ViewerTarget | null>(null)
  const [nav, setNav] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    try {
      const t = localStorage.getItem('folio-theme')
      if (t === 'light' || t === 'dark') setTheme(t)
    } catch {}
  }, [])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('folio-theme', theme)
    } catch {}
  }, [theme])

  const open = useCallback((s: Source) => setViewer({ docId: s.docId, docName: s.docName, page: s.page, passage: s.text }), [])

  if (!ws.ready)
    return (
      <div className="grid h-dvh place-items-center">
        <Loader2 className="animate-spin text-brand" />
      </div>
    )

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar ws={ws} open={nav} onClose={() => setNav(false)} theme={theme} setTheme={setTheme} />
      <main className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 px-4 py-3 md:hidden">
          <button className="icon-btn" onClick={() => setNav(true)} aria-label="Open menu"><Menu size={20} /></button>
          <Brand />
        </header>
        {ws.docs.length === 0 && ws.ingest.length === 0 ? (
          <Landing ws={ws} />
        ) : (
          <Chat ws={ws} onOpen={open} />
        )}
      </main>
      {viewer && <PdfViewer target={viewer} onClose={() => setViewer(null)} />}
      <Toasts ws={ws} />
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
      <span className="grid h-7 w-7 place-items-center rounded-lg text-white" style={{ backgroundImage: 'linear-gradient(135deg, rgb(var(--brand)), rgb(var(--hot)))' }}>
        <Quote size={14} fill="currentColor" />
      </span>
      Folio
    </div>
  )
}

function Sidebar({ ws, open, onClose, theme, setTheme }: { ws: Workspace; open: boolean; onClose: () => void; theme: string; setTheme: (t: 'dark' | 'light') => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col gap-4 border-r bg-surface p-4 transition-transform md:static md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ borderColor: 'rgb(var(--line))' }}
      >
        <div className="flex items-center justify-between">
          <Brand />
          <div className="flex">
            <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button className="icon-btn md:hidden" onClick={onClose} aria-label="Close menu"><X size={18} /></button>
          </div>
        </div>

        <button className="btn-primary" onClick={() => { ws.newChat(); onClose() }}><Plus size={16} /> New chat</button>

        <section aria-label="Documents">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Library</h2>
            <button className="text-xs text-brand hover:underline" onClick={() => fileRef.current?.click()}>+ Add PDF</button>
            <input ref={fileRef} type="file" accept="application/pdf" multiple hidden onChange={(e) => { void ws.addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
          </div>
          <ul className="space-y-1">
            {ws.docs.map((d) => {
              const on = ws.selected.includes(d.id)
              return (
                <li key={d.id} className="group flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-raised">
                  <button onClick={() => ws.toggleDoc(d.id)} aria-pressed={on} aria-label={`${on ? 'Exclude' : 'Include'} ${d.name}`}
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on ? 'border-transparent text-white' : 'text-transparent'}`}
                    style={on ? { backgroundImage: 'linear-gradient(135deg, rgb(var(--brand)), rgb(var(--hot)))' } : { borderColor: 'rgb(var(--muted) / 0.5)' }}>
                    <Check size={13} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{d.name}</p>
                    <p className="text-[11px] text-muted">{d.pages} pages · {d.chunks} passages</p>
                  </div>
                  <button className="icon-btn !h-7 !w-7 opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => ws.removeDoc(d.id)} aria-label={`Remove ${d.name}`}><Trash2 size={14} /></button>
                </li>
              )
            })}
            {ws.ingest.map((i) => (
              <li key={i.name} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-muted">
                <Loader2 size={16} className="animate-spin text-brand" />
                <span className="truncate">{i.name}</span>
                <span className="ml-auto text-[11px] tabular-nums">{i.total ? `${i.page}/${i.total}` : '…'}</span>
              </li>
            ))}
            {!ws.docs.length && !ws.ingest.length && <li className="px-2 py-1 text-sm text-muted">No documents yet.</li>}
          </ul>
        </section>

        <section aria-label="Chats" className="min-h-0 flex-1 overflow-y-auto">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">History</h2>
          <ul className="space-y-0.5">
            {ws.chats.map((c) => (
              <li key={c.id} className={`group flex items-center rounded-xl ${c.id === ws.activeId ? 'bg-raised' : 'hover:bg-raised/60'}`}>
                <button className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm" onClick={() => { ws.setActiveId(c.id); onClose() }}>{c.title}</button>
                <button className="icon-btn !h-7 !w-7 opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => ws.deleteChat(c.id)} aria-label={`Delete chat ${c.title}`}><Trash2 size={13} /></button>
              </li>
            ))}
            {!ws.chats.length && <li className="px-3 py-1 text-sm text-muted">Your conversations appear here.</li>}
          </ul>
        </section>

        <ProviderBadge ws={ws} />
      </aside>
    </>
  )
}

function ProviderBadge({ ws }: { ws: Workspace }) {
  const p = ws.provider
  return (
    <div className="card flex items-center gap-2 px-3 py-2 text-xs" title={p?.mock ? 'Set GEMINI_API_KEY or GROQ_API_KEY for real LLM answers' : undefined}>
      <span className={`h-2 w-2 rounded-full ${p ? (p.mock ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-muted'}`} />
      <span className="text-muted">{p ? (p.mock ? 'Demo mode · extractive answers' : `${p.provider} · ${p.model}`) : 'Connecting…'}</span>
    </div>
  )
}

function Dropzone({ ws, children }: { ws: Workspace; children: React.ReactNode }) {
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); void ws.addFiles(Array.from(e.dataTransfer.files).filter((f) => /pdf$/i.test(f.name) || f.type === 'application/pdf')) }}
      className={`relative flex min-h-0 flex-1 flex-col ${over ? 'ring-2 ring-inset ring-brand' : ''}`}
    >
      {over && <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-bg/80 font-display text-2xl font-bold">Drop PDFs to add them</div>}
      {children}
    </div>
  )
}

function Landing({ ws }: { ws: Workspace }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const features = [
    { icon: ShieldCheck, title: 'Private by design', body: 'PDFs are parsed and indexed in your browser. Only the few passages relevant to a question are sent to the model.' },
    { icon: Quote, title: 'Answers you can verify', body: 'Every claim carries a numbered citation. Click one to open the page with the passage highlighted.' },
    { icon: Zap, title: 'Works without a key', body: 'No API key? Demo mode returns extractive answers so you can try everything offline.' }
  ]
  return (
    <Dropzone ws={ws}>
      <div className="flex-1 overflow-y-auto px-5 pb-10 pt-6 md:px-10 md:pt-16">
        <div className="mx-auto max-w-3xl text-center rise">
          <span className="chip mb-6"><Sparkles size={13} className="text-hot" /> Local-first · Cited · Free to run</span>
          <h1 className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight md:text-7xl">
            Talk to your PDFs.<br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(110deg, rgb(var(--brand)), rgb(var(--hot)) 60%, #ffb347)' }}>See the proof.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted">Drop in a paper, contract or report. Ask anything. Get answers grounded in the page, with the exact passage highlighted.</p>

          <button
            onClick={() => fileRef.current?.click()}
            className="card group mx-auto mt-10 flex w-full max-w-xl flex-col items-center gap-3 border-dashed px-6 py-10 transition hover:bg-raised/70"
            style={{ borderStyle: 'dashed', borderColor: 'rgb(var(--brand) / 0.5)' }}
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl text-white transition group-hover:scale-110" style={{ backgroundImage: 'linear-gradient(135deg, rgb(var(--brand)), rgb(var(--hot)))' }}><Upload size={22} /></span>
            <span className="font-display text-lg font-semibold">Drop PDFs here or click to browse</span>
            <span className="text-sm text-muted">Up to 25 MB each · stays on your device</span>
          </button>
          <input ref={fileRef} type="file" accept="application/pdf" multiple hidden onChange={(e) => { void ws.addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
          <p className="mt-4 text-sm text-muted">
            No PDF handy?{' '}
            <button className="font-medium text-brand underline-offset-4 hover:underline" onClick={() => void ws.addSample()}>Try the sample document</button>
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-4 md:grid-cols-3">
          {features.map((f, i) => (
            <div key={f.title} className="card rise p-5" style={{ animationDelay: `${120 + i * 80}ms` }}>
              <f.icon size={20} className="mb-3 text-hot" />
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </Dropzone>
  )
}

function Chat({ ws, onOpen }: { ws: Workspace; onOpen: (s: Source) => void }) {
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const msgs = ws.active?.messages ?? []
  const lastContent = msgs[msgs.length - 1]?.content

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs.length, lastContent])

  const send = (q: string) => { if (q.trim() && !ws.streaming) { void ws.ask(q); setText('') } }
  const exportMd = () => {
    if (!ws.active) return
    const md = `# ${ws.active.title}\n\n` + ws.active.messages.map((m) => `**${m.role === 'user' ? 'You' : 'Folio'}:** ${m.content}${m.sources?.length && m.role === 'assistant' ? '\n\n' + m.sources.map((s) => `> [${s.n}] ${s.docName}, p.${s.page}`).join('\n') : ''}`).join('\n\n')
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([md], { type: 'text/markdown' })), download: `${ws.active.title.replace(/\W+/g, '-')}.md` })
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <Dropzone ws={ws}>
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-10">
        <div className="mx-auto max-w-3xl space-y-8">
          {!msgs.length && (
            <div className="rise pt-10 text-center md:pt-24">
              <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">What do you want to know?</h2>
              <p className="mt-3 text-muted">Searching {ws.selected.length} of {ws.docs.length} document{ws.docs.length === 1 ? '' : 's'}.</p>
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => <button key={s} className="chip" onClick={() => send(s)}><Sparkles size={12} className="text-hot" />{s}</button>)}
              </div>
            </div>
          )}
          {ws.active && msgs.length > 0 && (
            <div className="flex justify-end"><button className="chip" onClick={exportMd}><Download size={12} /> Export as Markdown</button></div>
          )}
          {msgs.map((m, i) => <Message key={m.id} m={m} live={ws.streaming && i === msgs.length - 1} onOpen={onOpen} />)}
          <div ref={endRef} />
        </div>
      </div>

      <form className="mx-auto w-full max-w-3xl px-4 pb-5 md:px-10" onSubmit={(e) => { e.preventDefault(); send(text) }}>
        <div className="card flex items-end gap-2 p-2 shadow-xl shadow-black/20 focus-within:ring-2 focus-within:ring-brand/60">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(text) } }}
            rows={1}
            maxLength={2000}
            placeholder={ws.selected.length ? 'Ask about your documents…' : 'Select a document in the library first'}
            aria-label="Your question"
            className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-muted"
          />
          {ws.streaming ? (
            <button type="button" className="btn-ghost !h-10 !w-10 !p-0" onClick={ws.stop} aria-label="Stop generating"><Square size={14} fill="currentColor" /></button>
          ) : (
            <button type="submit" className="btn-primary !h-10 !w-10 !p-0" disabled={!text.trim() || !ws.selected.length} aria-label="Send"><ArrowUp size={18} /></button>
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-muted">Answers are generated from your PDFs only. Check the citations.</p>
      </form>
    </Dropzone>
  )
}

function Message({ m, live, onOpen }: { m: ChatMessage; live: boolean; onOpen: (s: Source) => void }) {
  if (m.role === 'user')
    return (
      <div className="rise flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg px-4 py-2.5 text-[15px] text-white" style={{ backgroundImage: 'linear-gradient(120deg, rgb(var(--brand)), rgb(var(--hot)))' }}>{m.content}</p>
      </div>
    )
  const cited = new Set(citedNumbers(m.content))
  const sources = m.sources ?? []
  const byN = (n: number) => sources.find((s) => s.n === n)
  const waiting = live && !m.content && !m.error
  return (
    <div className="rise flex gap-3">
      <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white" style={{ backgroundImage: 'linear-gradient(135deg, rgb(var(--brand)), rgb(var(--hot)))' }}><Quote size={14} fill="currentColor" /></span>
      <div className="min-w-0 flex-1">
        {waiting && (
          <div className="space-y-2 pt-2" aria-label="Thinking">
            <div className="skeleton h-3 w-3/4" /><div className="skeleton h-3 w-1/2" />
          </div>
        )}
        {m.content && (
          <div className={live ? 'caret' : ''}>
            <MessageText text={m.content} onCite={(n) => { const s = byN(n); if (s) onOpen(s) }} />
          </div>
        )}
        {m.error && (
          <div role="alert" className="card mt-2 border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <strong>Couldn&apos;t get an answer.</strong> {m.error}
          </div>
        )}
        {sources.length > 0 && !waiting && (
          <details className="mt-4 group" open={false}>
            <summary className="chip w-fit cursor-pointer list-none select-none"><FileText size={12} /> {sources.length} source{sources.length > 1 ? 's' : ''} {cited.size ? `· ${cited.size} cited` : ''}</summary>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {sources.map((s) => (
                <li key={s.n}>
                  <button onClick={() => onOpen(s)} className={`card w-full p-3 text-left transition hover:bg-raised ${cited.has(s.n) ? 'ring-1 ring-brand/60' : 'opacity-80'}`}>
                    <p className="flex items-center gap-2 text-xs font-medium"><span className="cite !m-0">{s.n}</span><span className="truncate">{s.docName}</span><span className="ml-auto shrink-0 text-muted">p. {s.page}</span></p>
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted">{s.text}</p>
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
        {m.provider && !live && <p className="mt-3 text-[11px] text-muted">{m.provider}</p>}
      </div>
    </div>
  )
}

function Toasts({ ws }: { ws: Workspace }) {
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2" role="status" aria-live="polite">
      {ws.toasts.map((t) => (
        <div key={t.id} className={`card rise pointer-events-auto max-w-sm px-4 py-3 text-sm shadow-xl ${t.kind === 'error' ? 'border-red-500/40 text-red-300' : ''}`}>{t.text}</div>
      ))}
    </div>
  )
}

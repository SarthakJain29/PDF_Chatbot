'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BM25Index } from './bm25'
import { ingestPdf, PdfError } from './pdf'
import { retrieve } from './retrieve'
import { readEvents } from './sse'
import * as store from './storage'
import type { Chat, ChatMessage, DocMeta, ProviderInfo } from './types'

const uid = () => crypto.randomUUID()
const titleFrom = (q: string) => q.trim().split(/\s+/).slice(0, 6).join(' ').replace(/[?.!]+$/, '') || 'New chat'

export interface Toast {
  id: string
  kind: 'error' | 'info'
  text: string
}

export function useWorkspace() {
  const [ready, setReady] = useState(false)
  const [docs, setDocs] = useState<DocMeta[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [streaming, setStreaming] = useState(false)
  const [ingest, setIngest] = useState<{ name: string; page: number; total: number }[]>([])
  const [provider, setProvider] = useState<ProviderInfo | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const indexCache = useRef(new Map<string, { chunks: Awaited<ReturnType<typeof store.loadChunks>>; index: BM25Index }>())
  const hydrated = useRef(false)

  const toast = useCallback((text: string, kind: Toast['kind'] = 'error') => {
    const id = uid()
    setToasts((t) => [...t, { id, kind, text }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000)
  }, [])

  // Hydrate from IndexedDB + provider status.
  useEffect(() => {
    void (async () => {
      try {
        const [d, c] = await Promise.all([store.listDocs(), store.loadChats()])
        setDocs(d)
        setSelected(d.map((x) => x.id))
        setChats(c.sort((a, b) => b.updatedAt - a.updatedAt))
        setActiveId(c[0]?.id ?? null)
      } catch {
        toast('Local storage is unavailable, so your library will not be saved in this session.')
      } finally {
        hydrated.current = true
        setReady(true)
      }
    })()
    fetch('/api/status')
      .then((r) => r.json())
      .then(setProvider)
      .catch(() => setProvider({ provider: 'mock', model: 'extractive-demo', mock: true }))
  }, [toast])

  useEffect(() => {
    if (hydrated.current) void store.saveChats(chats).catch(() => undefined)
  }, [chats])

  const addFiles = useCallback(
    async (files: File[]) => {
      for (const file of files) {
        const key = uid()
        setIngest((p) => [...p, { name: file.name, page: 0, total: 0 }])
        try {
          const { meta, chunks } = await ingestPdf(file, (page, total) =>
            setIngest((p) => p.map((x) => (x.name === file.name ? { ...x, page, total } : x)))
          )
          await store.saveDoc({ meta, chunks, blob: file }).catch(() => toast(`Couldn't persist "${file.name}"; it will be lost on reload.`))
          setDocs((d) => [meta, ...d])
          setSelected((s) => [...s, meta.id])
        } catch (e) {
          toast(e instanceof PdfError ? e.message : `Failed to process "${file.name}"`)
        } finally {
          setIngest((p) => p.filter((x) => x.name !== file.name))
          void key
        }
      }
    },
    [toast]
  )

  const addSample = useCallback(async () => {
    try {
      const res = await fetch('/renewable-energy-briefing.pdf')
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      await addFiles([new File([blob], 'renewable-energy-briefing.pdf', { type: 'application/pdf' })])
    } catch {
      toast('Could not load the sample document.')
    }
  }, [addFiles, toast])

  const removeDoc = useCallback(async (id: string) => {
    await store.removeDoc(id).catch(() => undefined)
    setDocs((d) => d.filter((x) => x.id !== id))
    setSelected((s) => s.filter((x) => x !== id))
    indexCache.current.clear()
  }, [])

  const toggleDoc = useCallback(
    (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])),
    []
  )

  const active = useMemo(() => chats.find((c) => c.id === activeId) ?? null, [chats, activeId])

  const newChat = useCallback(() => setActiveId(null), [])
  const deleteChat = useCallback(
    (id: string) => {
      setChats((c) => c.filter((x) => x.id !== id))
      setActiveId((a) => (a === id ? null : a))
    },
    []
  )

  const stop = useCallback(() => abortRef.current?.abort(), [])

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim()
      if (!q || streaming) return
      if (!selected.length) return toast('Select at least one document first.', 'info')

      let chatId = activeId
      const userMsg: ChatMessage = { id: uid(), role: 'user', content: q, createdAt: Date.now() }
      const botId = uid()
      const botMsg: ChatMessage = { id: botId, role: 'assistant', content: '', createdAt: Date.now() }
      const prior = chats.find((c) => c.id === chatId)?.messages ?? []

      if (!chatId) {
        chatId = uid()
        const chat: Chat = { id: chatId, title: titleFrom(q), messages: [userMsg, botMsg], updatedAt: Date.now() }
        setChats((c) => [chat, ...c])
        setActiveId(chatId)
      } else {
        setChats((c) =>
          c.map((x) => (x.id === chatId ? { ...x, messages: [...x.messages, userMsg, botMsg], updatedAt: Date.now() } : x))
        )
      }
      const patch = (fn: (m: ChatMessage) => ChatMessage) =>
        setChats((c) =>
          c.map((x) => (x.id === chatId ? { ...x, messages: x.messages.map((m) => (m.id === botId ? fn(m) : m)) } : x))
        )

      setStreaming(true)
      const ctrl = new AbortController()
      abortRef.current = ctrl
      try {
        const key = [...selected].sort().join(',')
        let entry = indexCache.current.get(key)
        if (!entry) {
          const chunks = await store.loadChunks(selected)
          entry = { chunks, index: new BM25Index(chunks) }
          indexCache.current.set(key, entry)
        }
        const prevUser = [...prior].reverse().find((m) => m.role === 'user')?.content
        const sources = retrieve(entry.chunks, entry.index, q, prevUser)
        patch((m) => ({ ...m, sources }))

        const res = await fetch('/api/chat', {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            question: q,
            sources,
            history: prior.filter((m) => m.content && !m.error).map((m) => ({ role: m.role, content: m.content }))
          })
        })
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `Request failed (${res.status})`)

        for await (const ev of readEvents(res)) {
          if (ev.type === 'meta') {
            patch((m) => ({ ...m, provider: ev.mock ? 'demo' : `${ev.provider} · ${ev.model}` }))
            if (ev.note) toast(ev.note, 'info')
          } else if (ev.type === 'delta') patch((m) => ({ ...m, content: m.content + ev.text }))
          else if (ev.type === 'error') throw new Error(ev.message)
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') patch((m) => ({ ...m, content: m.content || '_Stopped._' }))
        else patch((m) => ({ ...m, error: e instanceof Error ? e.message : 'Something went wrong' }))
      } finally {
        setStreaming(false)
        abortRef.current = null
      }
    },
    [activeId, chats, selected, streaming, toast]
  )

  return {
    ready, docs, selected, chats, active, activeId, streaming, ingest, provider, toasts,
    addFiles, addSample, removeDoc, toggleDoc, setActiveId, newChat, deleteChat, ask, stop
  }
}

export type Workspace = ReturnType<typeof useWorkspace>

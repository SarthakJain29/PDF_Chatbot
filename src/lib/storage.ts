import { createStore, del, get, set } from 'idb-keyval'
import type { Chat, Chunk, DocMeta } from './types'

/** Everything lives in the browser: PDFs never leave the device. */
let store: ReturnType<typeof createStore> | undefined
const s = () => (store ??= createStore('folio', 'kv'))

interface StoredDoc {
  meta: DocMeta
  chunks: Chunk[]
  blob: Blob
}

export async function listDocs(): Promise<DocMeta[]> {
  return ((await get<DocMeta[]>('docs', s())) ?? []).sort((a, b) => b.addedAt - a.addedAt)
}

export async function saveDoc(doc: StoredDoc): Promise<void> {
  await set(`doc:${doc.meta.id}`, doc, s())
  const docs = (await get<DocMeta[]>('docs', s())) ?? []
  await set('docs', [...docs.filter((d) => d.id !== doc.meta.id), doc.meta], s())
}

export async function removeDoc(id: string): Promise<void> {
  await del(`doc:${id}`, s())
  const docs = (await get<DocMeta[]>('docs', s())) ?? []
  await set('docs', docs.filter((d) => d.id !== id), s())
}

export async function loadChunks(ids: string[]): Promise<Chunk[]> {
  const docs = await Promise.all(ids.map((id) => get<StoredDoc>(`doc:${id}`, s())))
  return docs.flatMap((d) => d?.chunks ?? [])
}

export async function loadBlob(id: string): Promise<Blob | undefined> {
  return (await get<StoredDoc>(`doc:${id}`, s()))?.blob
}

export async function loadChats(): Promise<Chat[]> {
  return (await get<Chat[]>('chats', s())) ?? []
}

export async function saveChats(chats: Chat[]): Promise<void> {
  await set('chats', chats, s())
}

export interface Chunk {
  id: string
  docId: string
  docName: string
  page: number
  index: number
  text: string
}

export interface DocMeta {
  id: string
  name: string
  size: number
  pages: number
  chunks: number
  addedAt: number
}

export interface Source {
  n: number
  docId: string
  docName: string
  page: number
  text: string
  score: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  error?: string
  provider?: string
  createdAt: number
}

export interface Chat {
  id: string
  title: string
  messages: ChatMessage[]
  updatedAt: number
}

export interface ProviderInfo {
  provider: 'gemini' | 'groq' | 'mock'
  model: string
  mock: boolean
}

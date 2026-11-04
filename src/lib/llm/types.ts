import type { HistoryTurn } from '../prompt'
import type { Source } from '../types'

export interface LlmRequest {
  system: string
  history: HistoryTurn[]
  question: string
  /** Retrieved excerpts, already numbered. Providers may use them (mock) or ignore (real LLMs get them in `prompt`). */
  sources: Source[]
  /** Fully assembled user prompt (question + excerpts). */
  prompt: string
  signal?: AbortSignal
}

export interface LlmProvider {
  name: 'gemini' | 'groq' | 'mock'
  model: string
  stream(req: LlmRequest): AsyncGenerator<string>
}

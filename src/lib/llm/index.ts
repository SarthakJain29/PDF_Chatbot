import { createGemini } from './gemini'
import { createGroq } from './groq'
import { mockProvider } from './mock'
import type { LlmProvider } from './types'

export type { LlmProvider, LlmRequest } from './types'

/**
 * Chooses a provider from env. LLM_PROVIDER = gemini | groq | mock | auto (default).
 * "auto" prefers Gemini, then Groq, then mock. A missing key always yields mock.
 */
export function getProvider(env: Record<string, string | undefined> = process.env): LlmProvider {
  const want = (env.LLM_PROVIDER || 'auto').toLowerCase()
  const gemini = env.GEMINI_API_KEY
  const groq = env.GROQ_API_KEY
  if (want === 'mock') return mockProvider
  if ((want === 'gemini' || want === 'auto') && gemini) return createGemini(gemini, env.GEMINI_MODEL || undefined)
  if ((want === 'groq' || want === 'auto') && groq) return createGroq(groq, env.GROQ_MODEL || undefined)
  return mockProvider
}

export { mockProvider }

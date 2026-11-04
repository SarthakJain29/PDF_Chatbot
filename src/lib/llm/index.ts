import { createGemini } from './gemini'
import { createGroq } from './groq'
import { mockProvider } from './mock'
import type { LlmProvider } from './types'

export type { LlmProvider, LlmRequest } from './types'
export { mockProvider }

/**
 * Ordered fallback chain built from env. LLM_PROVIDER = gemini | groq | mock | auto (default).
 * "auto" = Gemini -> Groq -> mock. A provider without a key is skipped; mock is always last,
 * so the app never hard-fails for lack of credentials.
 */
export function getProviderChain(env: Record<string, string | undefined> = process.env): LlmProvider[] {
  const want = (env.LLM_PROVIDER || 'auto').toLowerCase()
  const chain: LlmProvider[] = []
  if (want !== 'mock') {
    if ((want === 'gemini' || want === 'auto') && env.GEMINI_API_KEY)
      chain.push(createGemini(env.GEMINI_API_KEY, env.GEMINI_MODEL || undefined))
    if ((want === 'groq' || want === 'auto') && env.GROQ_API_KEY)
      chain.push(createGroq(env.GROQ_API_KEY, env.GROQ_MODEL || undefined))
  }
  chain.push(mockProvider)
  return chain
}

/** The preferred (first) provider: what the UI shows as "active". */
export const getProvider = (env?: Record<string, string | undefined>): LlmProvider => getProviderChain(env)[0]!

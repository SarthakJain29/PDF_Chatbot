import { getProvider } from '@/lib/llm'

export const dynamic = 'force-dynamic'

export function GET() {
  const p = getProvider()
  return Response.json({ provider: p.name, model: p.model, mock: p.name === 'mock' })
}

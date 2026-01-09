import { embed, embedMany } from 'ai'
import { openai } from '@ai-sdk/openai'

import { EMBEDDING_DIMENSIONS, OPENAI_EMBEDDING_MODEL } from '@/constants/ai'

// Use Vercel AI SDK to generate OpenAI embeddings.
const embedding_model = openai.embedding(OPENAI_EMBEDDING_MODEL, {dimensions: EMBEDDING_DIMENSIONS});

export const generate_embedding = async (value: string): Promise<number[]> => {
  const { embedding } = await embed({
    model: embedding_model,
    value
  })

  return embedding
}

export const generate_embeddings = async (values: string[]): Promise<number[][]> => {
  const { embeddings } = await embedMany({
    model: embedding_model,
    values
  })

  return embeddings
}

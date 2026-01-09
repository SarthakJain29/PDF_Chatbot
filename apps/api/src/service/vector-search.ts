import type { Types } from 'mongoose'

import { mg } from '@my-scope/db'

import { VECTOR_CANDIDATES, VECTOR_LIMIT } from '@/constants/ai'

export type TRagChunk = {
  _id: Types.ObjectId
  file_id: Types.ObjectId
  file_name: string
  page_number: number
  chunk_index: number
  text: string
  score: number
}

type TFindChunksParams = {
  user: string
  embedding: number[]
  limit?: number
}

export const find_similar_chunks = async (
  params: TFindChunksParams
): Promise<TRagChunk[]> => {
  const { user, embedding, limit = VECTOR_LIMIT } = params

  const results = await mg.file_page.aggregate<TRagChunk>([
    {
      $vectorSearch: {
        index: 'file_pages_embedding',
        path: 'embedding',
        queryVector: embedding,
        numCandidates: VECTOR_CANDIDATES,
        limit,
        filter: {
          user
        }
      }
    },
    {
      $lookup: {
        from: 'files',
        localField: 'file',
        foreignField: '_id',
        as: 'file_doc'
      }
    },
    {
      $unwind: '$file_doc'
    },
    {
      $project: {
        _id: 1,
        file_id: '$file_doc._id',
        file_name: '$file_doc.file_name',
        page_number: 1,
        chunk_index: 1,
        text: 1,
        score: { $meta: 'vectorSearchScore' }
      }
    }
  ])

  return results
}

import { mg } from '@my-scope/db'

import { VECTOR_CANDIDATES, VECTOR_LIMIT } from '@/constants/ai'
import type { TFindChunksParams, TRagChunk } from '@/types/vector-search'

export const find_similar_chunks = async (
  params: TFindChunksParams
): Promise<TRagChunk[]> => {
  const { user, embedding, query, limit = VECTOR_LIMIT } = params

  const vector_stage: any = {
    $vectorSearch: {
      index: 'embedding_index',
      path: 'embedding',
      queryVector: embedding,
      numCandidates: VECTOR_CANDIDATES,
      limit
    }
  }

  if (user) {
    vector_stage.$vectorSearch.filter = { user }
  }

  const results = await mg.file_page.aggregate<TRagChunk>([
    vector_stage,
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

  if (results.length || !query) {
    console.info('[vector-search] vector results', {
      count: results.length
    })
    return results
  }

  // Fall back to keyword search when vector results are empty.
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.replace(/[^a-z0-9]/g, ''))
    .filter((term) => term.length >= 3)
    .slice(0, 6)

  if (!keywords.length) {
    console.info('[vector-search] vector results', {
      count: results.length
    })
    return results
  }

  const fallback_filter: Record<string, unknown> = {
    text: { $regex: new RegExp(keywords.join('|'), 'i') }
  }

  if (user) {
    fallback_filter.user = user
  }

  const fallback_results = await mg.file_page.aggregate<TRagChunk>([
    { $match: fallback_filter },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
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
        score: { $literal: 0 }
      }
    }
  ])

  console.info('[vector-search] vector fallback results', {
    vector_count: results.length,
    fallback_count: fallback_results.length,
    keywords
  })

  return fallback_results
}

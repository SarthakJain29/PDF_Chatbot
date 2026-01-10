import type { RequestHandler } from 'express'
import type { UploadedFile } from 'express-fileupload'

import { mg } from '@my-scope/db'

import { CHUNK_OVERLAP, CHUNK_SIZE, EMBEDDING_BATCH_SIZE } from '@/constants/ai'
import { chunk_text } from '@/service/chunking'
import { generate_embeddings } from '@/service/embeddings'
import { extract_pdf_pages } from '@/service/pdf'
import { throw_error } from '@/utils/throw-error'
import z from 'zod'

type TUploadResult = {
  file_id?: string
  file_name: string
  status: 'ready' | 'failed'
  error?: string
}

const z_file = z.object({
  name: z.string().min(1),
  size: z.number().max(100 * 1024 * 1024, 'PDF must be <100MB'),
  data: z.any(),
  mimetype: z.string().refine((m) => m === 'application/pdf', {
    message: 'File must be a PDF'
  })
})

const z_files = z.union([z_file, z.array(z_file)])

const normalize_files = (input: unknown): UploadedFile[] => {
  const parsed = z_files.parse(input)
  // Cast to UploadedFile[] since req.files already contains UploadedFile objects
  // We're just validating the shape, not creating new objects
  return (Array.isArray(parsed) ? parsed : [parsed]) as UploadedFile[]
}

export const upload_files: RequestHandler = async (req, res) => {
  if (!req.files) {
    console.error('[upload_files] Missing multipart files payload')
    throw_error('No files uploaded', 400)
  }

  // TypeScript guard: req.files is guaranteed to be defined after the check above
  // Using non-null assertion since we've already checked it's not null/undefined
  const files_obj = req.files!
  const files_payload =
    'files' in files_obj
      ? files_obj.files
      : 'file' in files_obj
        ? files_obj.file
        : undefined

  if (!files_payload) {
    console.error('[upload_files] No file field found in request', {
      fields: Object.keys(files_obj)
    })
    throw_error('No files uploaded', 400)
  }

  // Accept single or multiple PDFs (FormData field "files" on the client).
  const files = normalize_files(files_payload)
  const results: TUploadResult[] = []

  console.info('[upload_files] Upload request received', {
    user_id: req.user._id,
    file_count: files.length
  })

  for (const file of files) {
    let created_file_id: string | undefined

    try {
      console.info('[upload_files] Processing file', {
        user_id: req.user._id,
        file_name: file.name,
        size_bytes: file.size
      })

      // Create metadata entry first so UI can track status.
      const file_doc = await mg.file.create({
        user: req.user._id,
        file_name: file.name,
        status: 'uploaded'
      })

      created_file_id = file_doc._id.toString()

      // Mark as processing while we extract + embed text.
      await mg.file.updateOne(
        { _id: file_doc._id },
        {
          $set: {
            status: 'processing'
          }
        }
      )

      // Extract text page-by-page (raw PDF is not stored).
      const pages = await extract_pdf_pages(file.data)

      console.info('[upload_files] Extracted PDF pages', {
        file_name: file.name,
        page_count: pages.length
      })

      // Chunk each page with deterministic chunk_index (token-based).
      const chunks = pages.flatMap((page_text, page_index) => {
        const page_chunks = chunk_text(page_text, {
          chunk_size: CHUNK_SIZE,
          overlap: CHUNK_OVERLAP
        })

        return page_chunks.map((chunk, chunk_index) => ({
          page_number: page_index + 1,
          chunk_index,
          text: chunk
        }))
      })

      console.info('[upload_files] Prepared chunks', {
        file_name: file.name,
        chunk_count: chunks.length
      })

      // Embed and store chunks in batches for vector search.
      for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
        const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE)
        const embeddings = await generate_embeddings(batch.map((chunk) => chunk.text))

        if (!embeddings.length) {
          console.error('[upload_files] Empty embeddings batch', {
            file_name: file.name,
            batch_size: batch.length
          })
          continue
        }

        if (embeddings.length !== batch.length) {
          console.warn('[upload_files] Embedding count mismatch', {
            file_name: file.name,
            batch_size: batch.length,
            embedding_count: embeddings.length
          })
        }

        await mg.file_page.insertMany(
          batch
            .map((chunk, index) => {
              const embedding = embeddings[index]
              if (!embedding) {
                return null
              }

              return {
                user: req.user._id,
                file: file_doc._id,
                page_number: chunk.page_number,
                chunk_index: chunk.chunk_index,
                text: chunk.text,
                embedding
              }
            })
            .filter(Boolean)
        )
      }

      // Finalize file status once ingestion completes.
      await mg.file.updateOne(
        { _id: file_doc._id },
        {
          $set: {
            status: 'ready'
          }
        }
      )

      results.push({
        file_id: file_doc._id.toString(),
        file_name: file.name,
        status: 'ready'
      })
    } catch (error) {
      const error_message =
        error instanceof Error ? error.message : 'Failed to process file'

      console.error('[upload_files] Failed to ingest file', {
        user_id: req.user._id,
        file_name: file.name,
        error: error_message
      })

      if (created_file_id) {
        await mg.file.updateOne(
          { _id: created_file_id },
          { $set: { status: 'failed' } }
        )
      }

      results.push({
        file_name: file.name,
        status: 'failed',
        error: error_message
      })
    }
  }

  res.status(201).json({
    message: 'Files processed',
    data: results
  })
}

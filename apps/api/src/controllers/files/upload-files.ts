import type { RequestHandler } from 'express'
import type { UploadedFile } from 'express-fileupload'

import { mg } from '@my-scope/db'
import { MAX_PDF_SIZE_BYTES } from '@my-scope/shared/constants'

import { CHUNK_OVERLAP, CHUNK_SIZE, EMBEDDING_BATCH_SIZE } from '@/constants/ai'
import { chunk_text } from '@/service/chunking'
import { upload_pdf_to_cloudinary } from '@/service/cloudinary'
import { generate_embeddings } from '@/service/embeddings'
import { broadcast_file_update } from '@/service/file-stream'
import {
  close_pdf_document,
  extract_pdf_page_text,
  open_pdf_from_url
} from '@/service/pdf'
import { throw_error } from '@/utils/throw-error'
import z from 'zod'

type TUploadResult = {
  file_id?: string
  file_name: string
  status: 'uploaded' | 'failed'
  error?: string
}

const z_file = z.object({
  name: z.string().min(1),
  size: z
    .number()
    .max(MAX_PDF_SIZE_BYTES, `PDF must be <${Math.floor(MAX_PDF_SIZE_BYTES / 1024 / 1024)}MB`),
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

const ingest_file_in_background = async (payload: {
  file_id: string
  user_id: string
  file_name: string
  file_url: string
  size_bytes: number
}): Promise<void> => {
  const { file_id, user_id, file_name, file_url, size_bytes } = payload

  try {
    console.info('[upload_files] Starting ingestion', {
      user_id,
      file_id,
      file_name
    })

    // Move file to processing while we extract + embed.
    await mg.file.updateOne(
      { _id: file_id },
      {
        $set: {
          status: 'processing'
        }
      }
    )
    broadcast_file_update(user_id, {
      _id: file_id,
      file_name,
      status: 'processing'
    })

    // Enforce size limit even if Cloudinary upload succeeds.
    if (size_bytes > MAX_PDF_SIZE_BYTES) {
      throw new Error('File exceeds size limit after upload')
    }

    // Stream the PDF via range requests (no full-buffer download).
    const { pdf, loadingTask } = await open_pdf_from_url(file_url)
    const total_pages = pdf.numPages
    let total_chunks = 0
    const pending_chunks: Array<{
      page_number: number
      chunk_index: number
      text: string
    }> = []

    try {
      console.info('[upload_files] Extracted PDF pages', {
        file_name,
        page_count: total_pages
      })

      for (let page_number = 1; page_number <= total_pages; page_number++) {
        // Extract text for a single page, then chunk immediately.
        const page_text = await extract_pdf_page_text(pdf, page_number)
        if (!page_text) {
          continue
        }

        const page_chunks = chunk_text(page_text, {
          chunk_size: CHUNK_SIZE,
          overlap: CHUNK_OVERLAP
        })

        if (!page_chunks.length) {
          continue
        }

        total_chunks += page_chunks.length
        pending_chunks.push(
          ...page_chunks.map((chunk, chunk_index) => ({
            page_number,
            chunk_index,
            text: chunk
          }))
        )

        // Flush batches as soon as we hit the embedding batch size.
        while (pending_chunks.length >= EMBEDDING_BATCH_SIZE) {
          const batch = pending_chunks.splice(0, EMBEDDING_BATCH_SIZE)
          const embeddings = await generate_embeddings(
            batch.map((chunk) => chunk.text)
          )

          if (!embeddings.length) {
            console.error('[upload_files] Empty embeddings batch', {
              file_name,
              batch_size: batch.length
            })
            continue
          }

          if (embeddings.length !== batch.length) {
            console.warn('[upload_files] Embedding count mismatch', {
              file_name,
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
                  user: user_id,
                  file: file_id,
                  page_number: chunk.page_number,
                  chunk_index: chunk.chunk_index,
                  text: chunk.text,
                  embedding
                }
              })
              .filter(Boolean)
          )
        }
      }

      if (pending_chunks.length) {
        const embeddings = await generate_embeddings(
          pending_chunks.map((chunk) => chunk.text)
        )

        await mg.file_page.insertMany(
          pending_chunks
            .map((chunk, index) => {
              const embedding = embeddings[index]
              if (!embedding) {
                return null
              }

              return {
                user: user_id,
                file: file_id,
                page_number: chunk.page_number,
                chunk_index: chunk.chunk_index,
                text: chunk.text,
                embedding
              }
            })
            .filter(Boolean)
        )
      }
    } finally {
      await close_pdf_document({ pdf, loadingTask })
    }

    if (!total_chunks) {
      throw new Error('No extractable text found in PDF')
    }

    // Mark file as ready once all chunks are stored.
    await mg.file.updateOne(
      { _id: file_id },
      {
        $set: {
          status: 'ready',
          page_count: total_pages
        }
      }
    )
    broadcast_file_update(user_id, {
      _id: file_id,
      file_name,
      status: 'ready'
    })

    console.info('[upload_files] Ingestion completed', {
      file_name,
      file_id,
      chunk_count: total_chunks
    })
  } catch (error) {
    const error_message =
      error instanceof Error ? error.message : 'Failed to process file'

    console.error('[upload_files] Ingestion failed', {
      user_id,
      file_id,
      file_name,
      error: error_message
    })

    // Ensure failed uploads are visible in UI.
    await mg.file.updateOne(
      { _id: file_id },
      {
        $set: {
          status: 'failed'
        }
      }
    )
    broadcast_file_update(user_id, {
      _id: file_id,
      file_name,
      status: 'failed'
    })
  }
}

export const upload_files: RequestHandler = async (req, res) => {
  if (!req.files) {
    console.error('[upload_files] Missing multipart files payload')
    throw_error('No files uploaded', 400)
  }

  // Resolve file payload from multipart fields.
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

  // Accept single or multiple PDFs (FormData field "files").
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

      // Upload raw PDF to Cloudinary for temporary storage.
      const upload_result = await upload_pdf_to_cloudinary(file, req.user._id)
      console.info('[upload_files] Uploaded to Cloudinary', {
        file_name: file.name,
        public_id: upload_result.public_id,
        size_bytes: upload_result.bytes
      })

      // Create metadata entry so UI can render status immediately.
      const file_doc = await mg.file.create({
        user: req.user._id,
        file_name: file.name,
        status: 'uploaded',
        file_url: upload_result.secure_url,
        storage_id: upload_result.public_id,
        size_bytes: upload_result.bytes,
        mime_type: file.mimetype,
        page_count: 0
      })

      created_file_id = file_doc._id.toString()
      broadcast_file_update(req.user._id, {
        _id: created_file_id,
        file_name: file.name,
        status: 'uploaded'
      })

      // Kick off ingestion without blocking the response.
      setImmediate(() => {
        void ingest_file_in_background({
          file_id: created_file_id!,
          user_id: req.user._id,
          file_name: file.name,
          file_url: upload_result.secure_url,
          size_bytes: upload_result.bytes
        })
      })

      results.push({
        file_id: file_doc._id.toString(),
        file_name: file.name,
        status: 'uploaded'
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
        broadcast_file_update(req.user._id, {
          _id: created_file_id,
          file_name: file.name,
          status: 'failed'
        })
      }

      results.push({
        file_name: file.name,
        status: 'failed',
        error: error_message
      })
    }
  }

  res.status(201).json({
    message: 'Files uploaded',
    data: results
  })
}

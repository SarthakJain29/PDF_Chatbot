import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'

import type { UploadedFile } from 'express-fileupload'

import { env } from '@/constants/env'
import type { TCloudinaryUploadResult } from '@/types/cloudinary'

const ensure_cloudinary_config = () => {
  if (
    env.cloudinary_cloud_name === 'NA' ||
    env.cloudinary_api_key === 'NA' ||
    env.cloudinary_api_secret === 'NA'
  ) {
    throw new Error('Cloudinary credentials are missing')
  }

  // Initialize Cloudinary client once per process.
  cloudinary.config({
    cloud_name: env.cloudinary_cloud_name,
    api_key: env.cloudinary_api_key,
    api_secret: env.cloudinary_api_secret
  })
}

export const upload_pdf_to_cloudinary = async (
  file: UploadedFile,
  user_id: string
): Promise<TCloudinaryUploadResult> => {
  ensure_cloudinary_config()

  // Stream PDF buffer into Cloudinary (raw asset).
  return new Promise((resolve, reject) => {
    const upload_stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: `rag-chatbot/${user_id}`,
        use_filename: true,
        unique_filename: true
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Cloudinary upload failed'))
          return
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          bytes: result.bytes
        })
      }
    )

    Readable.from(file.data).pipe(upload_stream)
  })
}

export const download_pdf_from_url = async (file_url: string): Promise<Buffer> => {
  // Fetch the stored PDF from Cloudinary for ingestion.
  const response = await fetch(file_url)

  if (!response.ok) {
    throw new Error(`Failed to fetch uploaded PDF (${response.status})`)
  }

  if (!response.body) {
    const array_buffer = await response.arrayBuffer()
    return Buffer.from(array_buffer)
  }

  const reader = response.body.getReader()
  const chunks: Buffer[] = []

  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }

    if (value) {
      chunks.push(Buffer.from(value))
    }
  }

  return Buffer.concat(chunks)
}

import { Request, Response } from 'express'
import { z } from 'zod'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

import { mg } from '@my-scope/db'
import type { TMessageContent, TMessageSource } from '@my-scope/shared/types'

import { OPENAI_CHAT_MODEL } from '@/constants/ai'
import { generate_embedding } from '@/service/embeddings'
import { find_similar_chunks } from '@/service/vector-search'
import { z_object_id } from '@/utils/schema'
import { init_sse, send_sse_event } from '@/utils/sse'
import { throw_error } from '@/utils/throw-error'

const chat_model = openai(OPENAI_CHAT_MODEL)

export const stream_chat_message = async (req: Request, res: Response) => {
  const { _id } = z_chat_params.parse(req.params)
  const { content } = z_message_body.parse(req.body)

  const chat = await mg.chat.findOne({ _id, user: req.user._id })

  if (!chat) {
    throw_error('Chat not found', 404)
  }

  await mg.message.create({
    chat: _id,
    user: req.user._id,
    role: 'user',
    content,
    status: 'complete',
    model: OPENAI_CHAT_MODEL,
    retry_attempts: 0
  })

  init_sse(res)

  const abort_controller = new AbortController()
  req.on('close', () => abort_controller.abort())

  try {
    const query_embedding = await generate_embedding(content)
    const chunks = await find_similar_chunks({
      user: req.user._id,
      embedding: query_embedding
    })

    const sources: TMessageSource<string>[] = chunks.map((chunk) => ({
      file_id: chunk.file_id.toString(),
      file_name: chunk.file_name,
      page_number: chunk.page_number,
      chunk_index: chunk.chunk_index
    }))

    const context = chunks
      .map(
        (chunk, index) =>
          `[${index + 1}] ${chunk.file_name} (page ${chunk.page_number})\n${chunk.text}`
      )
      .join('\n\n')

    const system_prompt =
      'You are a helpful assistant that answers questions using the provided PDF context. ' +
      'If the answer is not in the context, say you do not know. ' +
      'Cite sources in brackets like [file:page].'

    const user_prompt = `Context:\n${context || 'No relevant context found.'}\n\nQuestion:\n${content}`

    const result = await streamText({
      model: chat_model,
      system: system_prompt,
      prompt: user_prompt,
      abortSignal: abort_controller.signal
    })

    let assistant_text = ''

    for await (const chunk of result.textStream) {
      assistant_text += chunk
      send_sse_event(res, {
        event: 'delta',
        data: { text: chunk }
      })
    }

    const assistant_content: TMessageContent<string> = {
      text: assistant_text,
      sources
    }

    await mg.message.create({
      chat: _id,
      user: req.user._id,
      role: 'assistant',
      content: assistant_content,
      status: 'complete',
      model: OPENAI_CHAT_MODEL,
      retry_attempts: 0
    })

    await mg.chat.updateOne(
      { _id },
      {
        $inc: { message_count: 2 },
        $set: { last_message_at: new Date() }
      }
    )

    send_sse_event(res, {
      event: 'sources',
      data: { sources }
    })

    send_sse_event(res, {
      event: 'done',
      data: { text: assistant_text }
    })

    res.end()
  } catch (error) {
    const error_message =
      error instanceof Error ? error.message : 'Failed to stream response'

    await mg.message.create({
      chat: _id,
      user: req.user._id,
      role: 'assistant',
      content: error_message,
      status: 'error',
      model: OPENAI_CHAT_MODEL,
      retry_attempts: 0,
      error: error_message
    })

    send_sse_event(res, {
      event: 'error',
      data: { message: error_message }
    })

    res.end()
  }
}

const z_chat_params = z.object({
  _id: z_object_id
})

const z_message_body = z.object({
  content: z.string().trim().min(1)
})

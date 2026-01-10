import { Request, Response } from 'express'
import { z } from 'zod'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

import { mg } from '@my-scope/db'
import type { TMessageContent } from '@my-scope/shared/types'

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

  const recent_messages = await mg.message
    .find({ chat: _id, user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean()

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
      embedding: query_embedding,
      query: content
    })

    const context = chunks
      .map(
        (chunk, index) =>
          `[${index + 1}] ${chunk.file_name} (page ${chunk.page_number})\n${chunk.text}`
      )
      .join('\n\n')

    const system_prompt =
      `You are a PDF chatbot.
Answer questions only using the provided document context and conversation history.
Do not use outside knowledge or make assumptions beyond the document content.
If the user asks to see the retrieved chunks or raw context, return the exact chunk text with citations.

Be clear, concise, and factual.`

    const history = recent_messages
      .slice()
      .reverse()
      .map((message) => {
        const role_label =
          message.role === 'assistant'
            ? 'Assistant'
            : message.role === 'user'
              ? 'User'
              : 'System'
        const text =
          typeof message.content === 'string'
            ? message.content
            : message.content?.text || ''

        if (!text) {
          return ''
        }

        return `${role_label}: ${text}`
      })
      .filter(Boolean)
      .join('\n')

    const user_prompt = [
      `Context:\n${context || 'No relevant context found.'}`,
      history ? `Conversation so far:\n${history}` : null,
      `Question:\n${content}`
    ]
      .filter(Boolean)
      .join('\n\n')

    const result = await streamText({
      model: chat_model as any,
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

    const assistant_content: TMessageContent<string> = assistant_text

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

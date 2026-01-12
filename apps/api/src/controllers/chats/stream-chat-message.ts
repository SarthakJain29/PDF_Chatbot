import { Request, Response } from 'express'
import { z } from 'zod'
import { generateText, streamText } from 'ai'
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
const SUMMARY_UPDATE_INTERVAL = 10

const get_message_text = (message: { content: unknown; role: string }) => {
  if (typeof message.content === 'string') {
    return message.content
  }

  if (
    message.content &&
    typeof message.content === 'object' &&
    'text' in message.content
  ) {
    return String((message.content as { text?: string }).text || '')
  }

  return ''
}

const format_history = (messages: Array<{ role: string; content: unknown }>) =>
  messages
    .map((message) => {
      const role_label =
        message.role === 'assistant'
          ? 'Assistant'
          : message.role === 'user'
            ? 'User'
            : 'System'
      const text = get_message_text(message)

      return text ? `${role_label}: ${text}` : ''
    })
    .filter(Boolean)
    .join('\n')

const update_chat_summary_if_needed = async (params: {
  chat_id: string
  user_id: string
  message_count: number
  current_summary?: string
  summary_updated_at?: Date
}) => {
  const { chat_id, user_id, message_count, current_summary, summary_updated_at } = params

  if (message_count % SUMMARY_UPDATE_INTERVAL !== 0) {
    return
  }

  // Pull recent messages since the last summary update.
  const summary_query: Record<string, unknown> = {
    chat: chat_id,
    user: user_id
  }

  if (summary_updated_at) {
    summary_query.createdAt = { $gt: summary_updated_at }
  }

  const summary_messages = await mg.message
    .find(summary_query)
    .sort({ createdAt: -1 })
    .limit(SUMMARY_UPDATE_INTERVAL)
    .lean()

  if (!summary_messages.length) {
    return
  }

  const new_messages_text = format_history(summary_messages.slice().reverse())

  const summary_prompt = [
    current_summary ? `Current summary:\n${current_summary}` : 'Current summary:\n(none)',
    `New messages:\n${new_messages_text}`,
    'Updated summary (keep concise, <=150 words):'
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const { text } = await generateText({
      model: chat_model as any,
      system:
        'You are a concise summarization assistant. Update the summary using the new messages. Do not include citations or raw chunks.',
      prompt: summary_prompt
    })

    await mg.chat.updateOne(
      { _id: chat_id },
      {
        $set: {
          summary: text.trim(),
          summary_updated_at: new Date()
        }
      }
    )
  } catch (error) {
    console.error('[chat-summary] Failed to update summary', {
      chat_id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

const generate_chat_title_if_needed = async (params: {
  chat_id: string
  current_title?: string
  first_message: string
}): Promise<string | null> => {
  const { chat_id, current_title, first_message } = params

  const default_title_patterns = [
    /^new chat$/i,
    /^chat:/i,
    /^chat \(/i
  ]
  const is_default_title =
    !current_title ||
    default_title_patterns.some((pattern) => pattern.test(current_title.trim()))

  if (!is_default_title) {
    return null
  }

  const trimmed = first_message.trim()
  if (!trimmed) {
    return null
  }

  try {
    const { text } = await generateText({
      model: chat_model as any,
      system:
        'Create a short, clear chat title in 3-5 words. Return only the title.',
      prompt: `Message:\n${trimmed.slice(0, 800)}`
    })

    const cleaned = text.replace(/["']/g, '').replace(/\s+/g, ' ').trim()
    if (!cleaned) {
      return null
    }

    const words = cleaned.split(' ').filter(Boolean)
    const title = words.length >= 3 && words.length <= 5
      ? cleaned
      : trimmed.split(' ').filter(Boolean).slice(0, 5).join(' ')

    if (!title) {
      return null
    }

    await mg.chat.updateOne({ _id: chat_id }, { $set: { title } })
    return title
  } catch (error) {
    console.warn('[chat-title] Failed to generate title', {
      chat_id,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    const fallback = trimmed.split(' ').filter(Boolean).slice(0, 5).join(' ')
    if (!fallback) {
      return null
    }

    await mg.chat.updateOne({ _id: chat_id }, { $set: { title: fallback } })
    return fallback
  }
}

export const stream_chat_message = async (req: Request, res: Response) => {
  const { _id } = z_chat_params.parse(req.params)
  const { content } = z_message_body.parse(req.body)

  const chat = await mg.chat.findOne({ _id, user: req.user._id })

  if (!chat) {
    throw_error('Chat not found', 404)
    return;
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

  const title_promise = generate_chat_title_if_needed({
    chat_id: _id,
    current_title: chat.title,
    first_message: content
  })

  init_sse(res)

  const abort_controller = new AbortController()
  req.on('close', () => abort_controller.abort())

  try {
    const is_chunk_request = /(?:show|return|provide|give|list|display).*(?:chunk|context|source|citation|retrieved)/i.test(
      content
    )
    const last_user_message = recent_messages.find(
      (message) => message.role === 'user'
    )
    const retrieval_query =
      is_chunk_request && last_user_message
        ? typeof last_user_message.content === 'string'
          ? last_user_message.content
          : last_user_message.content?.text || content
        : content

    const query_embedding = await generate_embedding(retrieval_query)
    const chunks = await find_similar_chunks({
      embedding: query_embedding,
      query: retrieval_query,
      user: req.user._id
    })

    if (is_chunk_request) {
      const chunk_response = chunks.length
        ? chunks
            .map(
              (chunk, index) =>
                `[${index + 1}] ${chunk.file_name} (page ${chunk.page_number})\n${chunk.text}`
            )
            .join('\n\n')
        : 'No retrieved chunks found for the previous question.'

      send_sse_event(res, {
        event: 'delta',
        data: { text: chunk_response }
      })

      await mg.message.create({
        chat: _id,
        user: req.user._id,
        role: 'assistant',
        content: chunk_response,
        status: 'complete',
        model: OPENAI_CHAT_MODEL,
        retry_attempts: 0
      })

      await mg.chat.updateOne(
        { _id },
        { $inc: { message_count: 2 }, $set: { last_message_at: new Date() } }
      )

      const updated_chat = await mg.chat.findOne({ _id }).lean()
      if (updated_chat) {
        await update_chat_summary_if_needed({
          chat_id: _id,
          user_id: req.user._id,
          message_count: updated_chat.message_count || 0,
          current_summary: updated_chat.summary,
          summary_updated_at: updated_chat.summary_updated_at
        })
      }

      const generated_title = await title_promise
      if (generated_title) {
        send_sse_event(res, {
          event: 'chat_title',
          data: { chat_id: _id, title: generated_title }
        })
      }

      send_sse_event(res, {
        event: 'done',
        data: { text: chunk_response }
      })

      res.end()
      return
    }

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

    const history = format_history(recent_messages.slice().reverse())

    const user_prompt = [
      chat?.summary ? `Conversation summary:\n${chat?.summary}` : null,
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
      { $inc: { message_count: 2 }, $set: { last_message_at: new Date() } }
    )

    const updated_chat = await mg.chat.findOne({ _id }).lean()
    if (updated_chat) {
      await update_chat_summary_if_needed({
        chat_id: _id,
        user_id: req.user._id,
        message_count: updated_chat.message_count || 0,
        current_summary: updated_chat.summary,
        summary_updated_at: updated_chat.summary_updated_at
      })
    }

    const generated_title = await title_promise
    if (generated_title) {
      send_sse_event(res, {
        event: 'chat_title',
        data: { chat_id: _id, title: generated_title }
      })
    }

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

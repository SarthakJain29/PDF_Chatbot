import { Request, Response } from 'express'
import { z } from 'zod'
import { generateText, streamText, tool } from 'ai'
import { openai } from '@ai-sdk/openai'

import { mg } from '@my-scope/db'
import type { TMessageContent } from '@my-scope/shared/types'

import { nowIST, OPENAI_CHAT_MODEL } from '@/constants/ai'
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
    const system_prompt = [
      `You are a PDF chatbot. You must never answer using general knowledge.
      'Use the retrieve_context tool for any question that requires document knowledge.
      'If the user asks to show retrieved chunks or raw context, call retrieve_context and respond ONLY with the returned context text.
      'If retrieve_context returns no chunks or empty context, say you do not have enough information from the uploaded PDFs.
      'If the user is greeting or making small talk, you may respond briefly without calling tools.
      chat?.summary ? Conversation summary:\n${chat?.summary} : null
      current date and time: ${nowIST}
      TimeZone: Asia/Kolkata (UTC+5:30)`

    ]
      .filter(Boolean)
      .join('\n\n')

    const history_messages = recent_messages
      .slice()
      .reverse()
      .map((message) => ({
        role: message.role,
        content: get_message_text(message)
      }))
      .filter((message) => message.content)

    const retrieve_context_tool = tool({
      description: 'Retrieve relevant chunks from the user uploaded PDFs.',
      parameters: z.object({
        query: z.string().min(1)
      }),
      execute: async ({ query }) => {
        const query_embedding = await generate_embedding(query)
        const chunks = await find_similar_chunks({
          embedding: query_embedding,
          query,
          user: req.user._id
        })

        const context = chunks
          .map(
            (chunk, index) =>
              `[${index + 1}] ${chunk.file_name} (page ${chunk.page_number})\n${chunk.text}`
          )
          .join('\n\n')

        return {
          has_results: chunks.length > 0,
          context,
          chunks: chunks.map((chunk) => ({
            file_name: chunk.file_name,
            page_number: chunk.page_number,
            text: chunk.text,
            score: chunk.score
          }))
        }
      }
    })

    const result = await streamText({
      model: chat_model as any,
      system: system_prompt,
      messages: [...history_messages, { role: 'user', content }],
      tools: {
        retrieve_context: retrieve_context_tool
      },
      toolChoice: 'auto',
      maxToolRoundtrips: 1,
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

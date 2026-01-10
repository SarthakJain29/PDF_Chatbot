'use client'

import * as React from 'react'
import { ArrowLeft, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { get_chat_messages, stream_chat_message } from '@/lib/api'

const bubble_styles = {
  user: 'bg-slate-900 text-white',
  assistant: 'bg-white border border-slate-200 text-slate-900'
}

type TChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

type TMessageDoc = {
  _id: string
  role: 'user' | 'assistant'
  content: string | { text: string }
}

type TChatPageProps = {
  params: { chatId: string }
}

export default function ChatPage({ params }: TChatPageProps) {
  const router = useRouter()
  const [messages, setMessages] = React.useState<TChatMessage[]>([])
  const [input, setInput] = React.useState('')
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const messages_end_ref = React.useRef<HTMLDivElement>(null)

  const load_messages = React.useCallback(async () => {
    try {
      const response = await get_chat_messages(params.chatId)
      const normalized = response.data.map((message: TMessageDoc) => {
        if (typeof message.content === 'string') {
          return {
            id: message._id,
            role: message.role,
            content: message.content
          }
        }

        return {
          id: message._id,
          role: message.role,
          content: message.content.text
        }
      })

      setMessages(normalized)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    }
  }, [params.chatId])

  React.useEffect(() => {
    load_messages()
  }, [load_messages])

  React.useEffect(() => {
    messages_end_ref.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handle_send = async () => {
    if (!input.trim() || isStreaming) {
      return
    }

    setError(null)
    setIsStreaming(true)

    const user_message: TChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim()
    }

    const assistant_message_id = `assistant-${Date.now()}`
    const assistant_message: TChatMessage = {
      id: assistant_message_id,
      role: 'assistant',
      content: '',
      streaming: true
    }

    setMessages((prev) => [...prev, user_message, assistant_message])
    setInput('')

    await stream_chat_message(params.chatId, user_message.content, {
      on_delta: (text) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistant_message_id
              ? { ...message, content: message.content + text }
              : message
          )
        )
      },
      on_sources: () => {},
      on_done: () => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistant_message_id
              ? { ...message, streaming: false }
              : message
          )
        )
        setIsStreaming(false)
      },
      on_error: (message) => {
        setError(message)
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistant_message_id
              ? { ...msg, content: message, streaming: false }
              : msg
          )
        )
        setIsStreaming(false)
      }
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-base font-semibold text-slate-900">Chat</h1>
          <div className="w-12" />
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-6 py-6">
          {messages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
              Start by asking a question about your uploaded PDFs.
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-[80%] ${
                  message.role === 'user' ? 'self-end' : 'self-start'
                } rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  bubble_styles[message.role]
                }`}
              >
                <p>{message.content || (message.streaming ? '...' : '')}</p>
              </div>
            ))
          )}
          <div ref={messages_end_ref} />
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
          <Input
            placeholder="Ask a question about your PDFs..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handle_send()
              }
            }}
            disabled={isStreaming}
          />
          <Button onClick={handle_send} disabled={isStreaming || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {error ? (
          <div className="mx-auto mt-3 w-full max-w-4xl text-xs text-rose-600">
            {error}
          </div>
        ) : null}
      </footer>
    </div>
  )
}

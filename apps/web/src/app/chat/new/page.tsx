'use client'

import * as React from 'react'
import { ArrowLeft, PanelLeftOpen, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChatSidebar } from '@/components/layout/chat-sidebar'
import { FilePanel } from '@/components/layout/file-panel'
import {
  create_chat,
  get_chats,
  get_files,
  stream_chat_message,
  subscribe_file_updates,
  upload_files
} from '@/lib/api'

type TChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

type TChat = {
  _id: string
  title: string
  message_count: number
}

type TFileDoc = {
  _id: string
  file_name: string
  status: string
}

type TUploadResult = {
  file_id?: string
  file_name: string
  status: string
  error?: string
}

const bubble_styles = {
  user: 'bg-indigo-600 text-white',
  assistant: 'bg-white border border-slate-200 text-slate-900'
}

export default function NewChatPage() {
  const router = useRouter()
  const file_input_ref = React.useRef<HTMLInputElement | null>(null)
  const [is_sidebar_open, setIsSidebarOpen] = React.useState(true)
  const [messages, setMessages] = React.useState<TChatMessage[]>([])
  const [chats, setChats] = React.useState<TChat[]>([])
  const [files, setFiles] = React.useState<TFileDoc[]>([])
  const [input, setInput] = React.useState('')
  const [active_title, setActiveTitle] = React.useState<string | null>(null)
  const [created_chat_id, setCreatedChatId] = React.useState<string | null>(null)
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const messages_end_ref = React.useRef<HTMLDivElement>(null)

  const load_sidebar = React.useCallback(async () => {
    try {
      const [chats_res, files_res] = await Promise.all([get_chats(), get_files()])
      setChats(chats_res.data)
      setFiles(files_res.data)
    } catch {
      // Sidebar failures should not block chat.
    }
  }, [])

  React.useEffect(() => {
    load_sidebar()
  }, [load_sidebar])

  const upsert_file = React.useCallback((file: TFileDoc) => {
    setFiles((prev) => {
      const index = prev.findIndex((item) => item._id === file._id)
      if (index === -1) {
        return [file, ...prev]
      }

      const next = [...prev]
      next[index] = { ...next[index], ...file }
      return next
    })
  }, [])

  React.useEffect(() => {
    const unsubscribe = subscribe_file_updates<TFileDoc>({
      on_snapshot: (snapshot) => setFiles(snapshot),
      on_update: (file) => upsert_file(file)
    })

    return () => unsubscribe()
  }, [upsert_file])

  React.useEffect(() => {
    messages_end_ref.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handle_upload_click = () => {
    file_input_ref.current?.click()
  }

  const handle_upload_change = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selected_files = Array.from(event.target.files || [])

    if (!selected_files.length) {
      return
    }

    try {
      setError(null)
      setIsUploading(true)

      const upload_res = await upload_files(selected_files)
      const uploaded_files = Array.isArray(upload_res.data)
        ? (upload_res.data as TUploadResult[])
        : []

      if (uploaded_files.length) {
        setFiles((prev) => [
          ...uploaded_files.map((file, index) => ({
            _id: file.file_id || `${file.file_name}-${Date.now()}-${index}`,
            file_name: file.file_name,
            status: file.status
          })),
          ...prev
        ])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      if (file_input_ref.current) {
        file_input_ref.current.value = ''
      }
    }
  }

  const handle_new_chat = () => {
    router.push('/chat/new')
  }

  const handle_send = async () => {
    if (!input.trim() || isStreaming) {
      return
    }

    setError(null)
    setIsStreaming(true)

    const prompt = input.trim()
    const user_message: TChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt
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

    let chat_id = created_chat_id

    if (!chat_id) {
      try {
        const chat_res = await create_chat('New Chat')
        chat_id = chat_res.data.chat_id
        setCreatedChatId(chat_id)
        window.history.replaceState({}, '', `/chat/${chat_id}`)
        void load_sidebar()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create chat')
        setIsStreaming(false)
        return
      }
    }

    const resolved_chat_id = chat_id

    await stream_chat_message(resolved_chat_id, prompt, {
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
      on_title: (payload) => {
        setActiveTitle(payload.title)
        setChats((prev) =>
          prev.map((chat) =>
            chat._id === payload.chat_id ? { ...chat, title: payload.title } : chat
          )
        )
      },
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

  const grid_columns = is_sidebar_open
    ? 'lg:grid-cols-[260px_minmax(0,1fr)_320px]'
    : 'lg:grid-cols-[minmax(0,1fr)_320px]'

  const chat_title = active_title || 'New Chat'

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="h-screen p-6">
        <div
          className={`mx-auto grid h-full w-full max-w-[1400px] gap-6 ${grid_columns} grid-rows-[minmax(0,1fr)] min-h-0 overflow-hidden`}
        >
          <ChatSidebar
            chats={chats}
            active_chat_id={created_chat_id || undefined}
            on_new_chat={handle_new_chat}
            on_select_chat={(chat_id) => router.push(`/chat/${chat_id}`)}
            is_open={is_sidebar_open}
            on_toggle={() => setIsSidebarOpen(false)}
          />

          <main className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-100/80">
            <input
              ref={file_input_ref}
              type="file"
              multiple
              accept="application/pdf"
              className="hidden"
              onChange={handle_upload_change}
            />
            <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-6 py-4">
              <div className="flex items-center gap-2">
                {!is_sidebar_open ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-600"
                    onClick={() => setIsSidebarOpen(true)}
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-slate-600"
                  onClick={() => router.push('/')}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-900">{chat_title}</p>
                <p className="text-xs text-slate-500">New chat</p>
              </div>
              <div className="w-14" />
            </div>

            <div className="flex-1 min-h-0 space-y-4 overflow-y-auto px-6 py-6">
              {messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
                  Start by asking a question about your uploaded PDFs.
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      message.role === 'user' ? 'ml-auto' : 'mr-auto'
                    } ${bubble_styles[message.role]}`}
                  >
                    <p>{message.content || (message.streaming ? '...' : '')}</p>
                  </div>
                ))
              )}
              <div ref={messages_end_ref} />
            </div>

            <div className="border-t border-slate-200 bg-white/90 px-6 py-4">
              <div className="flex items-center gap-3">
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
              {error ? <div className="mt-3 text-xs text-rose-600">{error}</div> : null}
            </div>
          </main>

          <FilePanel
            files={files}
            on_upload_click={handle_upload_click}
            is_uploading={isUploading}
          />
        </div>
      </div>
    </div>
  )
}

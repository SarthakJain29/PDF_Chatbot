'use client'

import * as React from 'react'
import { FileText, MessageSquare, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { upload_files, get_chats, create_chat } from '@/lib/api'

const status_colors: Record<string, string> = {
  uploaded: 'bg-slate-100 text-slate-700',
  processing: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700'
}

type TChat = {  //remove types from here
  _id: string
  title: string
  message_count: number
  updatedAt?: string
}

type TFileDoc = {
  _id: string
  file_name: string
  status: string
  createdAt?: string
}

type TUploadResult = {
  file_id?: string
  file_name: string
  status: string
  error?: string
}

export default function Home() {
  const router = useRouter()
  const file_input_ref = React.useRef<HTMLInputElement | null>(null)
  const [chats, setChats] = React.useState<TChat[]>([])
  const [files, setFiles] = React.useState<TFileDoc[]>([])
  const [is_loading, setIsLoading] = React.useState(true)
  const [is_uploading, setIsUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load_data = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const chats_res = await get_chats()
      setChats(chats_res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load_data()
  }, [load_data])

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

      const chat_title =
        selected_files.length === 1
          ? `Chat: ${selected_files[0].name}`
          : `Chat (${selected_files.length} files)`

      const chat_res = await create_chat(chat_title)
      router.push(`/chat/${chat_res.data.chat_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      if (file_input_ref.current) {
        file_input_ref.current.value = ''
      }
    }
  }

  const handle_new_chat = async () => {
    try {
      const chat_res = await create_chat('New Chat')
      router.push(`/chat/${chat_res.data.chat_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chat')
    }
  }

  if (is_loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">RAG PDF Chatbot</h1>
            <p className="mt-1 text-sm text-slate-600">
              Upload PDFs, ingest them, and chat with your content.
            </p>
          </div>
          <Button onClick={handle_new_chat} className="gap-2">
            <MessageSquare className="h-4 w-4" />
            New Chat
          </Button>
        </header>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Chats</h2>
              <Badge variant="secondary">{chats.length}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {chats.length === 0 ? (
                <p className="text-sm text-slate-500">No chats yet. Start one.</p>
              ) : (
                chats.map((chat) => (
                  <button
                    key={chat._id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-white"
                    onClick={() => router.push(`/chat/${chat._id}`)}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {chat.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {chat.message_count} messages
                      </p>
                    </div>
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                  </button>
                ))
              )}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold">Upload PDFs</h2>
              <p className="mt-1 text-sm text-slate-500">
                PDFs are stored locally and embedded page by page.
              </p>
              <input
                ref={file_input_ref}
                type="file"
                multiple
                accept="application/pdf"
                className="hidden"
                onChange={handle_upload_change}
              />
              <Button
                onClick={handle_upload_click}
                className="mt-4 gap-2"
                disabled={is_uploading}
              >
                <Upload className="h-4 w-4" />
                {is_uploading ? 'Uploading...' : 'Select PDFs'}
              </Button>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Ingested Files</h2>
                <Badge variant="secondary">{files.length}</Badge>
              </div>
              <div className="mt-4 space-y-3">
                {files.length === 0 ? (
                  <p className="text-sm text-slate-500">No files uploaded yet.</p>
                ) : (
                  files.map((file) => (
                    <div
                      key={file._id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {file.file_name}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          status_colors[file.status] || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {file.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

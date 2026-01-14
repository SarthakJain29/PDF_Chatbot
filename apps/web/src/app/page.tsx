'use client'

import * as React from 'react'
import { PanelLeftOpen, Sparkles, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChatSidebar } from '@/components/layout/chat-sidebar'
import { FilePanel } from '@/components/layout/file-panel'
import { MAX_PDF_SIZE_MB } from '@my-scope/shared/constants'
import { useChats, useCreateChat, useFileStream, useFiles, useUploadFiles } from '@/lib/queries'

export default function Home() {
  const router = useRouter()
  const file_input_ref = React.useRef<HTMLInputElement | null>(null)
  const [is_sidebar_open, setIsSidebarOpen] = React.useState(true)
  const [is_uploading, setIsUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const { data: chats = [], isLoading: isChatsLoading, error: chatsError } = useChats()
  const { data: files = [], isLoading: isFilesLoading, error: filesError } = useFiles()
  const create_chat_mutation = useCreateChat()
  const upload_files_mutation = useUploadFiles()

  useFileStream()

  const is_loading = isChatsLoading || isFilesLoading
  const combined_error =
    (chatsError instanceof Error && chatsError.message) ||
    (filesError instanceof Error && filesError.message)

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

      await upload_files_mutation.mutateAsync(selected_files)

      const chat_title =
        selected_files.length === 1
          ? `Chat: ${selected_files[0].name}`
          : `Chat (${selected_files.length} files)`

      const chat_res = await create_chat_mutation.mutateAsync(chat_title)
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
    router.push('/chat/new')
  }

  const grid_columns = is_sidebar_open
    ? 'lg:grid-cols-[260px_minmax(0,1fr)_320px]'
    : 'lg:grid-cols-[minmax(0,1fr)_320px]'

  if (is_loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div
        className={`mx-auto grid w-full max-w-[1400px] gap-6 px-6 py-8 ${grid_columns}`}
      >
        <ChatSidebar
          chats={chats}
          on_new_chat={handle_new_chat}
          on_select_chat={(chat_id) => router.push(`/chat/${chat_id}`)}
          is_open={is_sidebar_open}
          on_toggle={() => setIsSidebarOpen(false)}
        />

        <main className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-slate-100/80 p-6 shadow-sm">
          {!is_sidebar_open ? (
            <div className="flex">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-slate-600"
                onClick={() => setIsSidebarOpen(true)}
              >
                <PanelLeftOpen className="h-4 w-4" />
                Open sidebar
              </Button>
            </div>
          ) : null}

          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-indigo-50 p-6 shadow-sm">
            <h1 className="font-display text-2xl font-semibold text-slate-900">
              Chat with your PDFs
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Upload documents or start a new conversation.
            </p>
          </div>

          {error || combined_error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error || combined_error}
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-3xl border-dashed border-indigo-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Upload PDFs</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Supports up to {MAX_PDF_SIZE_MB}MB per file.
                  </p>
                </div>
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
                  className="w-full justify-between bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-500 text-white shadow-sm hover:from-indigo-500 hover:via-sky-400 hover:to-cyan-400"
                  disabled={is_uploading || upload_files_mutation.isPending}
                >
                  {is_uploading || upload_files_mutation.isPending
                    ? 'Uploading...'
                    : 'Select PDFs'}
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            <Card className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Start a chat</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Create a new workspace to ask questions.
                  </p>
                </div>
                <Button
                  onClick={handle_new_chat}
                  className="w-full justify-between bg-gradient-to-r from-slate-900 via-slate-700 to-slate-600 text-white shadow-sm hover:from-slate-800 hover:via-slate-600 hover:to-slate-500"
                >
                  Start new chat
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </div>
        </main>

        <FilePanel
          files={files}
          on_upload_click={handle_upload_click}
          is_uploading={is_uploading || upload_files_mutation.isPending}
        />
      </div>
    </div>
  )
}

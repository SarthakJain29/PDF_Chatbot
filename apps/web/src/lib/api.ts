import { read_sse_stream } from '@/lib/sse'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

const get_user_id = (): string => {
  if (typeof window === 'undefined') {
    return 'demo-user'
  }

  return localStorage.getItem('rag_user_id') || 'demo-user'  //check this
}

type TApiResponse<T> = {
  message: string
  data: T
}

export const upload_files = async (files: File[]): Promise<TApiResponse<any>> => {
  // Backend expects multipart field name "files" and a user header for scoping.
  const form_data = new FormData()
  files.forEach((file) => form_data.append('files', file))

  const response = await fetch(`${API_BASE_URL}/api/v1/files/upload`, {
    method: 'POST',
    headers: {
      'x-user-id': get_user_id()
    },
    body: form_data
  })

  if (!response.ok) {
    const error_payload = await response.json().catch(() => null)
    const message = error_payload?.message || 'Failed to upload files'
    console.error('[upload_files] API error', error_payload || message)
    throw new Error(message)
  }

  return response.json()
}

export const get_chats = async (): Promise<TApiResponse<any[]>> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/chats`, {
    headers: {
      'x-user-id': get_user_id()
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch chats')
  }

  return response.json()
}

export const get_files = async (): Promise<TApiResponse<any[]>> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/files`, {
    headers: {
      'x-user-id': get_user_id()
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch files')
  }

  return response.json()
}

type TFileStreamHandlers<TFile = any> = {
  on_snapshot: (_files: TFile[]) => void
  on_update: (_file: TFile) => void
  on_error?: (_message: string) => void
}

export const subscribe_file_updates = <TFile = any>(
  handlers: TFileStreamHandlers<TFile>
): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const user_id = get_user_id()
  const stream_url = new URL(`${API_BASE_URL}/api/v1/files/stream`)
  stream_url.searchParams.set('user_id', user_id)

  const source = new EventSource(stream_url.toString())

  source.addEventListener('snapshot', (event) => {
    try {
      const payload = JSON.parse((event as MessageEvent).data) as TFile[]
      handlers.on_snapshot(payload)
    } catch {
      handlers.on_error?.('Failed to parse file snapshot')
    }
  })

  source.addEventListener('update', (event) => {
    try {
      const payload = JSON.parse((event as MessageEvent).data) as TFile
      handlers.on_update(payload)
    } catch {
      handlers.on_error?.('Failed to parse file update')
    }
  })

  source.addEventListener('error', () => {
    handlers.on_error?.('File updates disconnected')
  })

  return () => {
    source.close()
  }
}

export const create_chat = async (title?: string): Promise<TApiResponse<any>> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/chats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': get_user_id()
    },
    body: JSON.stringify({ title })
  })

  if (!response.ok) {
    throw new Error('Failed to create chat')
  }

  return response.json()
}

export const get_chat_messages = async (
  chat_id: string
): Promise<TApiResponse<any[]>> => {
  const response = await fetch(`${API_BASE_URL}/api/v1/chats/${chat_id}/messages`, {
    headers: {
      'x-user-id': get_user_id()
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch messages')
  }

  return response.json()
}

type TStreamHandlers = {
  on_delta: (_text: string) => void
  on_sources: (_sources: any[]) => void
  on_done: (_text: string) => void
  on_error: (_message: string) => void
  on_title?: (_payload: { chat_id: string; title: string }) => void
}

export const stream_chat_message = async (
  chat_id: string,
  content: string,
  handlers: TStreamHandlers
): Promise<void> => {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/chats/${chat_id}/messages/stream`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': get_user_id()
      },
      body: JSON.stringify({ content })
    }
  )

  if (!response.ok) {
    handlers.on_error('Failed to start stream')
    return
  }

  await read_sse_stream(response, {
    delta: (data) => handlers.on_delta(data.text),
    sources: (data) => handlers.on_sources(data.sources),
    chat_title: (data) => handlers.on_title?.(data),
    done: (data) => handlers.on_done(data.text),
    error: (data) => handlers.on_error(data.message)
  })
}

import { read_sse_stream } from '@/lib/sse'
import { API_BASE_URL, DEFAULT_USER_ID, RAG_USER_ID_STORAGE_KEY } from '@/constants/api'
import type {
  TApiResponse,
  TChatDoc,
  TFileDoc,
  TMessageDoc,
  TUploadResult
} from '@my-scope/shared/types'
import type { TChatStreamHandlers, TFileStreamHandlers } from '@/types/api'

// Use a stable fallback for SSR or unauthenticated sessions.
const get_user_id = (): string => {
  if (typeof window === 'undefined') {
    return DEFAULT_USER_ID
  }

  return localStorage.getItem(RAG_USER_ID_STORAGE_KEY) || DEFAULT_USER_ID
}

export const upload_files = async (
  files: File[]
): Promise<TApiResponse<TUploadResult[]>> => {
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
    throw new Error(message)
  }

  return response.json()
}

export const get_chats = async (): Promise<TApiResponse<TChatDoc<string>[]>> => {
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

export const get_files = async (): Promise<TApiResponse<TFileDoc<string>[]>> => {
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

export const subscribe_file_updates = <TFile = unknown>(
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
      const event_data = (event as MessageEvent).data

      if (!event_data || typeof event_data !== 'string') {
        handlers.on_error?.('Invalid file snapshot payload')
        return
      }

      const trimmed = event_data.trim()
      if (!trimmed) {
        handlers.on_error?.('Empty file snapshot payload')
        return
      }

      const payload = JSON.parse(trimmed) as TFile[]
      handlers.on_snapshot(payload)
    } catch (error) {
      handlers.on_error?.('Failed to parse file snapshot')
    }
  })

  source.addEventListener('update', (event) => {
    try {
      const event_data = (event as MessageEvent).data

      if (!event_data || typeof event_data !== 'string') {
        handlers.on_error?.('Invalid file update payload')
        return
      }

      const trimmed = event_data.trim()
      if (!trimmed) {
        handlers.on_error?.('Empty file update payload')
        return
      }

      const payload = JSON.parse(trimmed) as TFile
      handlers.on_update(payload)
    } catch (error) {
      handlers.on_error?.('Failed to parse file update')
    }
  })

  source.addEventListener('error', () => {
    if (source.readyState === EventSource.CLOSED) {
      handlers.on_error?.('File updates disconnected')
    }
  })

  return () => {
    source.close()
  }
}

export const create_chat = async (
  title?: string
): Promise<TApiResponse<{ chat_id: string }>> => {
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
): Promise<TApiResponse<TMessageDoc<string, string, string>[]>> => {
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

export const stream_chat_message = async (
  chat_id: string,
  content: string,
  handlers: TChatStreamHandlers
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

'use client'

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  create_chat,
  get_chat_messages,
  get_chats,
  get_files,
  subscribe_file_updates,
  upload_files
} from '@/lib/api'
import type { TUploadResult } from '@my-scope/shared/types'
import type { TChatListItem, TChatMessageDoc } from '@/types/chat'
import type { TFileListItem } from '@/types/file'

const merge_files = (
  prev: TFileListItem[] | undefined | null,
  incoming: TFileListItem[]
) => {
  // Ensure prev is always an array
  const prev_array = Array.isArray(prev) ? prev : []
  const next = [...prev_array]

  for (const file of incoming) {
    const index = next.findIndex((item) => item._id === file._id)
    if (index === -1) {
      next.unshift(file)
    } else {
      next[index] = { ...next[index], ...file }
    }
  }

  return next
}

export const useChats = () =>
  useQuery({
    queryKey: ['chats'],
    queryFn: get_chats,
    select: (response) => response.data as TChatListItem[]
  })

export const useFiles = () =>
  useQuery({
    queryKey: ['files'],
    queryFn: get_files,
    select: (response) => response.data as TFileListItem[]
  })

export const useChatMessages = (chat_id: string | undefined) =>
  useQuery({
    queryKey: ['chat-messages', chat_id],
    queryFn: () => get_chat_messages(chat_id || ''),
    enabled: Boolean(chat_id),
    select: (response) => response.data as TChatMessageDoc[]
  })

export const useCreateChat = () => {
  const query_client = useQueryClient()

  return useMutation({
    mutationFn: (title?: string) => create_chat(title),
    onSuccess: (response, title) => {
      const new_chat: TChatListItem = {
        _id: response.data.chat_id,
        title: title || 'New Chat',
        message_count: 0
      }

      query_client.setQueryData<TChatListItem[]>(['chats'], (prev = []) => [
        new_chat,
        ...prev
      ])
    }
  })
}

export const useUploadFiles = () => {
  const query_client = useQueryClient()

  return useMutation({
    mutationFn: (files: File[]) => upload_files(files),
    onSuccess: (response) => {
      const uploaded_files = Array.isArray(response.data)
        ? (response.data as TUploadResult[])
        : []

      if (!uploaded_files.length) {
        return
      }

      const mapped = uploaded_files.map((file, index) => ({
        _id: file.file_id || `${file.file_name}-${Date.now()}-${index}`,
        file_name: file.file_name,
        status: file.status
      }))

      query_client.setQueryData<TFileListItem[]>(['files'], (prev) =>
        merge_files(prev, mapped)
      )
    }
  })
}

export const useFileStream = () => {
  const query_client = useQueryClient()

  React.useEffect(() => {
    const unsubscribe = subscribe_file_updates<TFileListItem>({
      on_snapshot: (snapshot) =>
        query_client.setQueryData(['files'], snapshot as TFileListItem[]),
      on_update: (file) =>
        query_client.setQueryData<TFileListItem[]>(['files'], (prev) =>
          merge_files(prev, [file])
        ),
      on_error: () => {}
    })

    return () => unsubscribe()
  }, [query_client])
}

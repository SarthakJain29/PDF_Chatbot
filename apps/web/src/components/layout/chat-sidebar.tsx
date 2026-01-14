'use client'

import { Bot, LogOut, MessageSquare, PanelLeftClose, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-gate'
import type { TChatSidebarProps } from '@/types/chat'

export const ChatSidebar = ({
  chats,
  active_chat_id,
  on_new_chat,
  on_select_chat,
  is_open,
  on_toggle
}: TChatSidebarProps) => {
  const { sign_out } = useAuth()

  if (!is_open) {
    return null
  }

  return (
    <aside className="flex h-full min-h-0 flex-col">
      <div className="flex h-full min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-sky-500 to-cyan-400 text-white shadow-md">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-display text-sm font-semibold text-slate-900">RAG Chat</p>
            <p className="text-xs text-slate-500">PDF workspace</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500 hover:text-slate-900"
            onClick={on_toggle}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        <Button
          onClick={on_new_chat}
          className="mt-6 justify-between bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-500 text-white shadow-sm hover:from-indigo-500 hover:via-sky-400 hover:to-cyan-400"
        >
          New Chat
          <Plus className="h-4 w-4" />
        </Button>

        <div className="mt-6 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-slate-400">
          <span>Recent Chats</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
            {chats.length}
          </span>
        </div>

        <div className="mt-3 flex flex-1 flex-col gap-2 overflow-y-auto pr-2">
          {chats.length === 0 ? (
            <p className="text-sm text-slate-500">No chats yet.</p>
          ) : (
            chats.map((chat) => {
              const is_active = chat._id === active_chat_id

              return (
                <button
                  key={chat._id}
                  type="button"
                  onClick={() => on_select_chat(chat._id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    is_active
                      ? 'border-indigo-200 bg-indigo-50 text-slate-900 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`mt-1 h-2 w-2 rounded-full ${
                      is_active ? 'bg-indigo-600' : 'border border-slate-300 bg-white'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{chat.title}</p>
                    <p className="text-xs text-slate-500">
                      {chat.message_count || 0} messages
                    </p>
                  </div>
                  <MessageSquare className="h-4 w-4 text-slate-400" />
                </button>
              )
            })
          )}
        </div>

        <div className="mt-auto border-t border-slate-200 pt-4">
          <Button
            variant="ghost"
            className="w-full justify-between text-xs text-slate-500 hover:text-slate-900"
            onClick={sign_out}
          >
            Sign out
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}

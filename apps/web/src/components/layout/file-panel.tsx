'use client'

import * as React from 'react'
import { CheckCircle2, FileText, Loader2, Upload, XCircle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type TFileItem = {
  _id: string
  file_name: string
  status: string
}

type TFilePanelProps = {
  files: TFileItem[]
  on_upload_click?: () => void
  is_uploading?: boolean
}

const status_styles: Record<string, string> = {
  uploaded: 'bg-amber-100 text-amber-700',
  processing: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-rose-100 text-rose-700'
}

const status_icon = (status: string) => {
  if (status === 'ready') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
  }

  if (status === 'failed') {
    return <XCircle className="h-4 w-4 text-rose-500" />
  }

  if (status === 'uploaded' || status === 'processing') {
    return <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
  }

  return null
}

export const FilePanel = ({
  files,
  on_upload_click,
  is_uploading
}: TFilePanelProps) => {
  return (
    <aside className="hidden h-full min-h-0 lg:flex lg:flex-col">
      <Card className="flex h-full min-h-0 flex-col rounded-3xl border-slate-200 bg-white p-5 shadow-sm">
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-sm font-semibold text-slate-900">
                Uploaded Files
              </p>
              <p className="text-xs text-slate-500">Ready for retrieval</p>
            </div>
            <Badge variant="secondary">{files.length}</Badge>
          </div>
        </div>

        <div className="mt-4 flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {files.length === 0 ? (
            <p className="text-sm text-slate-500">No files yet.</p>
          ) : (
            files.map((file) => (
              <div
                key={file._id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {file.file_name}
                    </p>
                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        status_styles[file.status] || 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {file.status}
                    </span>
                  </div>
                </div>
                {status_icon(file.status)}
              </div>
            ))
          )}
        </div>

        {on_upload_click ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <Button
              onClick={on_upload_click}
              className="w-full justify-between bg-gradient-to-r from-indigo-600 via-sky-500 to-cyan-500 text-white shadow-sm hover:from-indigo-500 hover:via-sky-400 hover:to-cyan-400"
              disabled={is_uploading}
            >
              {is_uploading ? 'Uploading...' : 'Upload PDF'}
              <Upload className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </Card>
    </aside>
  )
}

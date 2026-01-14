'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { QUERY_CLIENT_DEFAULTS } from '@/constants/query'
import type { TProvidersProps } from '@/types/app'

export const Providers = ({ children }: TProvidersProps) => {
  const [query_client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: QUERY_CLIENT_DEFAULTS
      })
  )

  return <QueryClientProvider client={query_client}>{children}</QueryClientProvider>
}

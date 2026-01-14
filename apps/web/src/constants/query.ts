export const QUERY_CLIENT_DEFAULTS = {
  queries: {
    refetchOnWindowFocus: false,
    retry: 1,
    staleTime: 30_000,
  },
} as const;

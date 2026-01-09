type TChunkOptions = {
  chunk_size: number
  overlap: number
}

export const chunk_text = (text: string, options: TChunkOptions): string[] => {
  // Tokenize by whitespace so chunk sizes are token-based (page-wise chunking happens upstream).
  const cleaned = text.replace(/\s+/g, ' ').trim()

  if (!cleaned) {
    return []
  }

  const tokens = cleaned.split(' ')
  const { chunk_size, overlap } = options
  const safe_overlap = Math.max(0, Math.min(overlap, chunk_size - 1))
  const chunks: string[] = []
  let start = 0

  while (start < tokens.length) {
    const end = Math.min(start + chunk_size, tokens.length)
    chunks.push(tokens.slice(start, end).join(' '))

    if (end >= tokens.length) {
      break
    }

    start = Math.max(0, end - safe_overlap)
  }

  return chunks
}

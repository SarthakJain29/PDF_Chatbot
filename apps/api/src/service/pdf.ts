// Initialize pdfjs-dist worker configuration at module level
let pdfjsLib: any = null

const getPdfjsLib = async () => {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
    // Disable worker completely for Node.js environment
    // pdfjsLib.GlobalWorkerOptions.workerSrc = false
  }
  return pdfjsLib
}

const normalize_pdf_text = (items: Array<{ str?: string }>) =>
  items
    .map((item) => item.str || '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

export const extract_pdf_page_text = async (
  pdf: any,
  page_number: number
): Promise<string> => {
  const page = await pdf.getPage(page_number)
  const content = await page.getTextContent()
  const items = content.items as Array<{ str?: string }>
  const text = normalize_pdf_text(items)

  if (page.cleanup) {
    page.cleanup()
  }

  return text
}

export const open_pdf_from_url = async (file_url: string) => {
  const lib = await getPdfjsLib()

  // Use range requests to avoid buffering entire PDFs in memory.
  const loadingTask = lib.getDocument({
    url: file_url,
    disableWorker: true,
    useWorkerFetch: false,
    disableStream: false,
    disableRange: false,
    rangeChunkSize: 1 << 16
  })

  const pdf = await loadingTask.promise

  return { pdf, loadingTask }
}

export const close_pdf_document = async (params: {
  pdf: any
  loadingTask?: any
}) => {
  const { pdf, loadingTask } = params

  try {
    if (pdf?.cleanup) {
      pdf.cleanup()
    }
    if (loadingTask?.destroy) {
      await loadingTask.destroy()
    }
  } catch (error) {
    console.warn('[pdf] Cleanup failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

export const extract_pdf_pages = async (data: Buffer): Promise<string[]> => {
  try {
    const lib = await getPdfjsLib()

    // Convert Buffer to Uint8Array for pdfjs-dist (no disk persistence).
    const uint8Array = new Uint8Array(data)
    // Disable worker for Node.js ingestion.
    const loadingTask = lib.getDocument({
      data: uint8Array,
      disableWorker: true,
      useWorkerFetch: false
    })
    const pdf = await loadingTask.promise

    const pages: string[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      // Extract text per page to preserve page-wise chunking.
      const text = await extract_pdf_page_text(pdf, i)
      pages.push(text)
    }

    await close_pdf_document({ pdf, loadingTask })

    return pages
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to extract PDF pages'
    console.error('[pdf] Extraction failed', { error: message })
    throw error
  }
}

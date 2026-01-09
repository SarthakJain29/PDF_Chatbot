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

export const extract_pdf_pages = async (data: Buffer): Promise<string[]> => {
  try {
    const lib = await getPdfjsLib()

    // Convert Buffer to Uint8Array for pdfjs-dist (we do not persist the PDF).
    const uint8Array = new Uint8Array(data)
    const loadingTask = lib.getDocument({ data: uint8Array, disableWorker: true, useWorkerFetch: false })
    const pdf = await loadingTask.promise

    const pages: string[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const items = content.items as Array<{ str?: string }>

      const text = items
        .map((item) => item.str || '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()

      pages.push(text)
    }

    return pages
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to extract PDF pages'
    console.error('[pdf] Extraction failed', { error: message })
    throw error
  }
}

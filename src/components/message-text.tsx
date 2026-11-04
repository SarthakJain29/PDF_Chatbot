import { Fragment } from 'react'

/** Tiny, safe markdown subset: paragraphs, bullets, **bold**, `code` and [n] citation chips. */
function inline(text: string, onCite: (n: number) => void, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[\d{1,2}\])/g)
  return parts.map((p, i) => {
    const key = `${keyPrefix}-${i}`
    const cite = p.match(/^\[(\d{1,2})\]$/)
    if (cite) {
      const n = Number(cite[1])
      return (
        <button key={key} className="cite" onClick={() => onCite(n)} aria-label={`Open source ${n}`}>
          {n}
        </button>
      )
    }
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={key}>{p.slice(2, -2)}</strong>
    if (p.startsWith('`') && p.endsWith('`') && p.length > 2) return <code key={key}>{p.slice(1, -1)}</code>
    return <Fragment key={key}>{p}</Fragment>
  })
}

export function MessageText({ text, onCite }: { text: string; onCite: (n: number) => void }) {
  const lines = text.split('\n')
  const blocks: { type: 'p' | 'ul'; items: string[] }[] = []
  for (const line of lines) {
    const li = line.match(/^\s*[-*•]\s+(.*)$/)
    if (li) {
      const last = blocks[blocks.length - 1]
      if (last?.type === 'ul') last.items.push(li[1]!)
      else blocks.push({ type: 'ul', items: [li[1]!] })
    } else if (line.trim()) blocks.push({ type: 'p', items: [line] })
  }
  return (
    <div className="prose-msg">
      {blocks.map((b, i) =>
        b.type === 'ul' ? (
          <ul key={i}>
            {b.items.map((it, j) => (
              <li key={j}>{inline(it, onCite, `${i}-${j}`)}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{inline(b.items[0]!, onCite, `${i}`)}</p>
        )
      )}
    </div>
  )
}

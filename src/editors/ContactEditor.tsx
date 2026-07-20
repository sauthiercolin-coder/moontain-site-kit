'use client'

import type { ContactContent } from '../types'

export function ContactEditor({ content, onChange }: { content: ContactContent; onChange: (content: ContactContent) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Titre</span>
        <input type="text" value={content.title ?? ''} onChange={e => onChange({ ...content, title: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Sous-titre</span>
        <input type="text" value={content.subtitle ?? ''} onChange={e => onChange({ ...content, subtitle: e.target.value })} />
      </label>
    </div>
  )
}

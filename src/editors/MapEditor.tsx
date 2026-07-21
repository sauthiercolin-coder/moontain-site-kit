'use client'

import type { MapContent } from '../types'

export function MapEditor({ content, onChange }: { content: MapContent; onChange: (content: MapContent) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Titre</span>
        <input type="text" value={content.title ?? ''} onChange={e => onChange({ ...content, title: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Adresse</span>
        <input type="text" value={content.address ?? ''} onChange={e => onChange({ ...content, address: e.target.value })} />
      </label>
    </div>
  )
}

'use client'

import type { FeaturedContent } from '../types'
import type { ImagePickerComponent } from './types'

export function FeaturedEditor({
  content, onChange, ImagePicker,
}: {
  content: FeaturedContent
  onChange: (content: FeaturedContent) => void
  ImagePicker?: ImagePickerComponent
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Nom du projet</span>
        <input type="text" value={content.name ?? ''} onChange={e => onChange({ ...content, name: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Lieu</span>
        <input type="text" value={content.location ?? ''} onChange={e => onChange({ ...content, location: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Image</span>
        {ImagePicker
          ? <ImagePicker value={content.image} onChange={v => onChange({ ...content, image: v })} />
          : <input type="text" value={content.image ?? ''} onChange={e => onChange({ ...content, image: e.target.value })} placeholder="URL de l'image" />}
      </label>
    </div>
  )
}

'use client'

import type { CtaContent } from '../types'
import type { ImagePickerComponent } from './types'

export function CtaEditor({
  content, onChange, ImagePicker,
}: {
  content: CtaContent
  onChange: (content: CtaContent) => void
  ImagePicker?: ImagePickerComponent
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Titre</span>
        <input type="text" value={content.title ?? ''} onChange={e => onChange({ ...content, title: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Texte</span>
        <textarea value={content.text ?? ''} onChange={e => onChange({ ...content, text: e.target.value })} rows={2} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Libellé du bouton</span>
        <input type="text" value={content.button ?? ''} onChange={e => onChange({ ...content, button: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Image (optionnelle)</span>
        {ImagePicker
          ? <ImagePicker value={content.image} onChange={v => onChange({ ...content, image: v })} />
          : <input type="text" value={content.image ?? ''} onChange={e => onChange({ ...content, image: e.target.value })} placeholder="URL de l'image" />}
      </label>
    </div>
  )
}

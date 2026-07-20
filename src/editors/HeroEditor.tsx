'use client'

import type { HeroContent } from '../types'
import type { ImagePickerComponent } from './types'

export function HeroEditor({
  content, onChange, ImagePicker,
}: {
  content: HeroContent
  onChange: (content: HeroContent) => void
  ImagePicker?: ImagePickerComponent
}) {
  const images = content.images ?? []
  const setImage = (i: number, url: string) => {
    const next = images.slice()
    next[i] = url
    onChange({ ...content, images: next })
  }
  const addImage = () => onChange({ ...content, images: [...images, ''] })
  const removeImage = (i: number) => onChange({ ...content, images: images.filter((_, idx) => idx !== i) })

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Titre</span>
        <input type="text" value={content.headline ?? ''} onChange={e => onChange({ ...content, headline: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Sous-titre</span>
        <textarea value={content.subtext ?? ''} onChange={e => onChange({ ...content, subtext: e.target.value })} rows={3} />
      </label>
      <div className="flex flex-col gap-2">
        <span className="text-xs opacity-70">Images</span>
        {images.map((url, i) => (
          <div key={i} className="flex gap-2 items-center">
            {ImagePicker
              ? <ImagePicker value={url} onChange={v => setImage(i, v)} />
              : <input type="text" value={url} onChange={e => setImage(i, e.target.value)} placeholder="URL de l'image" />}
            <button type="button" onClick={() => removeImage(i)} className="text-xs">Supprimer</button>
          </div>
        ))}
        <button type="button" onClick={addImage} className="self-start text-sm">+ Ajouter une image</button>
      </div>
    </div>
  )
}

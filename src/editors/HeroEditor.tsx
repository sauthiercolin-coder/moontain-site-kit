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
        <span className="text-xs opacity-70">Accroche (au-dessus du titre)</span>
        <input type="text" value={content.kicker ?? ''} onChange={e => onChange({ ...content, kicker: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Titre</span>
        <input type="text" value={content.headline ?? ''} onChange={e => onChange({ ...content, headline: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Sous-titre</span>
        <textarea value={content.subtext ?? ''} onChange={e => onChange({ ...content, subtext: e.target.value })} rows={3} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Bouton principal</span>
        <input type="text" value={content.cta ?? ''} onChange={e => onChange({ ...content, cta: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Bouton secondaire</span>
        <input type="text" value={content.cta2 ?? ''} onChange={e => onChange({ ...content, cta2: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Image principale</span>
        {ImagePicker
          ? <ImagePicker value={content.image} onChange={v => onChange({ ...content, image: v })} />
          : <input type="text" value={content.image ?? ''} onChange={e => onChange({ ...content, image: e.target.value })} placeholder="URL de l'image" />}
      </label>
      <div className="flex flex-col gap-2">
        <span className="text-xs opacity-70">Autres images</span>
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

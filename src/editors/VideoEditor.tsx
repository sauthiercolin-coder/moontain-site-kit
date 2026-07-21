'use client'

import type { VideoContent } from '../types'
import type { ImagePickerComponent } from './types'

export function VideoEditor({
  content, onChange, ImagePicker,
}: {
  content: VideoContent
  onChange: (content: VideoContent) => void
  ImagePicker?: ImagePickerComponent
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Titre</span>
        <input type="text" value={content.title ?? ''} onChange={e => onChange({ ...content, title: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">URL de la vidéo (YouTube, Vimeo…)</span>
        <input type="text" value={content.videoUrl ?? ''} onChange={e => onChange({ ...content, videoUrl: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs opacity-70">Image d'aperçu</span>
        {ImagePicker
          ? <ImagePicker value={content.poster} onChange={v => onChange({ ...content, poster: v })} />
          : <input type="text" value={content.poster ?? ''} onChange={e => onChange({ ...content, poster: e.target.value })} placeholder="URL de l'image" />}
      </label>
    </div>
  )
}

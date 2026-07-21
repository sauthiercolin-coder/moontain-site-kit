'use client'

import type { RepeatableFieldConfig } from '../section-types'
import type { ImagePickerComponent } from './types'

type Item = Record<string, string | boolean>

export function RepeatableListEditor({
  items, fields, onChange, ImagePicker,
}: {
  items: Item[]
  fields: RepeatableFieldConfig[]
  onChange: (items: Item[]) => void
  ImagePicker?: ImagePickerComponent
}) {
  const update = (i: number, key: string, value: string | boolean) => {
    const next = items.slice()
    next[i] = { ...next[i], [key]: value }
    onChange(next)
  }
  const add = () => onChange([...items, {}])
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = items.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={i} className="border rounded-md p-3 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs uppercase tracking-wide opacity-60">Élément {i + 1}</span>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-30">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="disabled:opacity-30">↓</button>
              <button type="button" onClick={() => remove(i)}>Supprimer</button>
            </div>
          </div>
          {fields.map(f => (
            <label key={f.key} className="flex flex-col gap-1 text-sm">
              {f.kind === 'boolean' ? (
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={Boolean(item[f.key])} onChange={e => update(i, f.key, e.target.checked)} />
                  <span className="text-xs opacity-70">{f.label}</span>
                </span>
              ) : (
                <>
                  <span className="text-xs opacity-70">{f.label}</span>
                  {f.kind === 'textarea' ? (
                    <textarea value={(item[f.key] as string) ?? ''} onChange={e => update(i, f.key, e.target.value)} rows={3} />
                  ) : f.kind === 'image' ? (
                    ImagePicker
                      ? <ImagePicker value={item[f.key] as string} onChange={url => update(i, f.key, url)} />
                      : <input type="text" value={(item[f.key] as string) ?? ''} onChange={e => update(i, f.key, e.target.value)} placeholder="URL de l'image" />
                  ) : (
                    <input type={f.kind === 'date' ? 'date' : 'text'} value={(item[f.key] as string) ?? ''} onChange={e => update(i, f.key, e.target.value)} />
                  )}
                </>
              )}
            </label>
          ))}
        </div>
      ))}
      <button type="button" onClick={add} className="self-start text-sm">+ Ajouter un élément</button>
    </div>
  )
}

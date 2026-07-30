'use client'

import { SECTION_TYPES } from '../section-types'
import type { SectionType } from '../types'
import type { ImagePickerComponent } from './types'

// Inspecteur de sections structuré (blocs pliables, libellés clairs, aide
// contextuelle). Partagé par le CMS Moontain et l'espace client — même
// expérience d'édition des deux côtés. Purement présentationnel : reçoit
// type/content/onChange/ImagePicker. Les styles (classes `.insp*`) sont
// fournis par l'app hôte (voir globals.css / site-editor.css).

type Obj = Record<string, any>
type Kind = 'text' | 'textarea' | 'image' | 'date' | 'boolean' | 'imagelist'
interface FieldSpec { key: string; label: string; help?: string; kind: Kind; placeholder?: string }
interface GroupSpec { title: string; fields: FieldSpec[] }

export const SECTION_HELP: Partial<Record<SectionType, string>> = {
  hero: 'La grande bannière en haut de la page.',
  featured: 'Une réalisation mise en avant.',
  cta: "Un bloc d'appel à l'action en bas de page.",
  contact: "L'invitation à vous contacter.",
  video: 'Une vidéo intégrée à la page.',
  map: 'La localisation.',
  story: 'Un bloc image + texte pour raconter une histoire.',
  values: 'Les valeurs, une par élément.',
  features: 'Les raisons de vous choisir.',
  process: 'Les étapes du travail.',
  services: 'Les prestations.',
  testimonials: 'Les avis clients.',
  projects: 'Les réalisations.',
  beforeAfter: 'Des comparaisons avant / après.',
  posts: 'Les articles du blog.',
  stats: 'Les chiffres clés.',
  faq: 'Les questions fréquentes.',
  team: "Les membres de l'équipe.",
  logos: 'Les logos partenaires.',
  pricing: 'Les offres et tarifs.',
  gallery: "Une galerie d'images.",
  moduleBooking: 'Le formulaire de réservation, intégré dans la page.',
  moduleTickets: 'La billetterie (achat de billets), intégrée dans la page.',
  moduleGiftcard: "L'achat de bon cadeau, intégré dans la page.",
  moduleMembership: "L'adhésion (abonnement), intégrée dans la page.",
  form: 'Un formulaire (choisi parmi ceux du CMS) intégré dans la page.',
}

// En-tête commun aux blocs « module » (titre + texte d'intro au-dessus du widget).
const MODULE_HEADER_SPEC: GroupSpec[] = [
  { title: 'En-tête du bloc', fields: [
    { key: 'title', label: 'Titre', help: 'Affiché au-dessus du module.', kind: 'text' },
    { key: 'intro', label: "Texte d'introduction", help: 'Optionnel.', kind: 'textarea' },
  ] },
]

const SINGLETON_SPECS: Partial<Record<SectionType, GroupSpec[]>> = {
  hero: [
    { title: 'Textes', fields: [
      { key: 'kicker', label: 'Petit texte au-dessus du titre', help: 'Optionnel — une mini-accroche.', kind: 'text' },
      { key: 'headline', label: 'Titre principal', help: 'La première chose que lisent les visiteurs.', kind: 'text' },
      { key: 'subtext', label: 'Sous-titre', kind: 'textarea' },
    ] },
    { title: 'Boutons', fields: [
      { key: 'cta', label: 'Bouton principal', kind: 'text' },
      { key: 'cta2', label: 'Bouton secondaire', kind: 'text' },
    ] },
    { title: 'Image de fond', fields: [
      { key: 'image', label: 'Image principale', help: 'Format paysage recommandé.', kind: 'image' },
      { key: 'images', label: 'Autres images', help: 'Images supplémentaires (diaporama selon le modèle).', kind: 'imagelist' },
    ] },
  ],
  featured: [
    { title: 'Réalisation', fields: [
      { key: 'name', label: 'Nom du projet', kind: 'text' },
      { key: 'location', label: 'Lieu', kind: 'text' },
      { key: 'image', label: 'Photo', kind: 'image' },
    ] },
  ],
  cta: [
    { title: "Appel à l'action", fields: [
      { key: 'title', label: 'Titre', kind: 'text' },
      { key: 'text', label: 'Texte', kind: 'textarea' },
      { key: 'button', label: 'Libellé du bouton', kind: 'text' },
    ] },
  ],
  contact: [
    { title: 'Contact', fields: [
      { key: 'title', label: 'Titre', kind: 'text' },
      { key: 'subtitle', label: 'Sous-titre', kind: 'textarea' },
    ] },
  ],
  video: [
    { title: 'Vidéo', fields: [
      { key: 'title', label: 'Titre', kind: 'text' },
      { key: 'videoUrl', label: 'Lien de la vidéo', help: 'URL YouTube ou Vimeo.', kind: 'text' },
      { key: 'poster', label: "Image d'aperçu", kind: 'image' },
    ] },
  ],
  map: [
    { title: 'Localisation', fields: [
      { key: 'title', label: 'Titre', kind: 'text' },
      { key: 'address', label: 'Adresse', kind: 'textarea' },
    ] },
  ],
  story: [
    { title: 'Textes', fields: [
      { key: 'eyebrow', label: 'Petit texte au-dessus du titre', kind: 'text' },
      { key: 'title', label: 'Titre', kind: 'text' },
      { key: 'text', label: 'Texte', kind: 'textarea' },
    ] },
    { title: 'Image', fields: [
      { key: 'image', label: 'Image', kind: 'image' },
    ] },
  ],
  // Blocs « module » : simple en-tête (titre + intro) au-dessus du widget.
  moduleBooking: MODULE_HEADER_SPEC,
  moduleTickets: MODULE_HEADER_SPEC,
  moduleGiftcard: MODULE_HEADER_SPEC,
  moduleMembership: MODULE_HEADER_SPEC,
  // Le choix du formulaire (formId) est géré par un sélecteur dédié côté CMS ;
  // ici on ne montre que l'en-tête optionnel en repli.
  form: MODULE_HEADER_SPEC,
}

// Formats d'image proposés (recadrage uniforme d'une section, non destructif).
const IMAGE_RATIOS: { value: string; label: string }[] = [
  { value: 'auto', label: "Automatique (format d'origine)" },
  { value: '1:1', label: 'Carré · 1:1' },
  { value: '4:3', label: 'Paysage · 4:3' },
  { value: '3:2', label: 'Paysage · 3:2' },
  { value: '16:9', label: 'Large · 16:9' },
  { value: '2:3', label: 'Portrait · 2:3' },
  { value: '3:4', label: 'Portrait · 3:4' },
]

const REPEAT_NOUN: Partial<Record<SectionType, string>> = {
  values: 'une valeur', features: 'un atout', process: 'une étape', services: 'un service',
  testimonials: 'un avis', projects: 'une réalisation', beforeAfter: 'une comparaison',
  posts: 'un article', stats: 'un chiffre', faq: 'une question', team: 'un membre',
  logos: 'un logo', pricing: 'une offre', gallery: 'une image',
}

const Caret = () => (
  <svg className="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
)

function FieldInput({ kind, value, placeholder, onChange, ImagePicker }: {
  kind: Kind; value: any; placeholder?: string; onChange: (v: any) => void; ImagePicker?: ImagePickerComponent
}) {
  if (kind === 'textarea') return <textarea rows={3} value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
  if (kind === 'boolean') return (
    <label className="insp-check"><input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} /> Oui</label>
  )
  if (kind === 'image') return ImagePicker
    ? <ImagePicker value={value} onChange={onChange} />
    : <input value={value ?? ''} placeholder="URL de l'image" onChange={e => onChange(e.target.value)} />
  if (kind === 'imagelist') return <ImageList value={value} onChange={onChange} ImagePicker={ImagePicker} />
  return <input type="text" value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
}

function Field({ spec, value, onChange, ImagePicker }: {
  spec: FieldSpec; value: any; onChange: (v: any) => void; ImagePicker?: ImagePickerComponent
}) {
  return (
    <div className="insp-field">
      <label>{spec.label}</label>
      {spec.help && <p className="insp-help">{spec.help}</p>}
      <FieldInput kind={spec.kind} value={value} placeholder={spec.placeholder} onChange={onChange} ImagePicker={ImagePicker} />
    </div>
  )
}

function ImageList({ value, onChange, ImagePicker }: { value: any; onChange: (v: string[]) => void; ImagePicker?: ImagePickerComponent }) {
  const arr: string[] = Array.isArray(value) ? value : []
  return (
    <div className="stack" style={{ gap: 8 }}>
      {arr.map((url, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {ImagePicker
              ? <ImagePicker value={url} onChange={v => onChange(arr.map((x, j) => j === i ? v : x))} />
              : <input value={url} placeholder="URL" onChange={e => onChange(arr.map((x, j) => j === i ? e.target.value : x))} />}
          </div>
          <button type="button" className="insp-iconbtn" title="Retirer" onClick={() => onChange(arr.filter((_, j) => j !== i))}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
      <button type="button" className="insp-add" onClick={() => onChange([...arr, ''])}>+ Ajouter une image</button>
    </div>
  )
}

function SingletonInspector({ type, content, onChange, ImagePicker }: {
  type: SectionType; content: Obj; onChange: (c: Obj) => void; ImagePicker?: ImagePickerComponent
}) {
  const groups = SINGLETON_SPECS[type] ?? [{ title: 'Contenu', fields: Object.keys(content ?? {}).map(k => ({ key: k, label: k, kind: 'text' as Kind })) }]
  const set = (key: string, v: any) => onChange({ ...content, [key]: v })
  const hasImages = groups.some(g => g.fields.some(f => f.kind === 'image' || f.kind === 'imagelist'))
  const ratio = (content.ratio as string | undefined) ?? 'auto'
  return (
    <div className="stack" style={{ gap: 0 }}>
      {groups.map(g => (
        <details key={g.title} className="insp-group" open>
          <summary><span className="insp-summary-title">{g.title}</span><Caret /></summary>
          <div className="insp-fields">
            {g.fields.map(f => <Field key={f.key} spec={f} value={content?.[f.key]} onChange={v => set(f.key, v)} ImagePicker={ImagePicker} />)}
          </div>
        </details>
      ))}
      {hasImages && (
        <div className="insp-field" style={{ marginTop: 4 }}>
          <label>Format des images</label>
          <p className="insp-help">Recadrage uniforme des images de cette section (l’original n’est pas modifié).</p>
          <select value={ratio} onChange={e => onChange({ ...content, ratio: e.target.value })}>
            {IMAGE_RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}

function RepeatableInspector({ type, content, onChange, ImagePicker }: {
  type: SectionType; content: Obj; onChange: (c: Obj) => void; ImagePicker?: ImagePickerComponent
}) {
  const def = SECTION_TYPES[type]
  if (def.kind !== 'repeatable') return null
  const fields = def.fields
  const items: Obj[] = Array.isArray(content?.items) ? content.items : []
  const commit = (next: Obj[]) => onChange({ ...content, items: next })
  const hasImages = fields.some(f => f.kind === 'image')
  const ratio = (content.ratio as string | undefined) ?? 'auto'
  const setRatio = (r: string) => onChange({ ...content, items, ratio: r })

  const noun = REPEAT_NOUN[type] ?? 'un élément'
  const nounCap = noun.replace(/^(un|une)\s+/, '').replace(/^./, c => c.toUpperCase())
  const summary = (item: Obj, i: number) => {
    const first = fields.find(f => (f.kind === 'text' || f.kind === 'textarea') && item[f.key])
    return (first ? String(item[first.key]) : '') || `${nounCap} ${i + 1}`
  }
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const next = items.slice(); [next[i], next[j]] = [next[j], next[i]]; commit(next)
  }

  return (
    <div className="stack" style={{ gap: 0 }}>
      {items.length === 0 && <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Aucun élément pour l’instant.</p>}
      {items.map((item, i) => (
        <details key={i} className="insp-item" open={items.length <= 3}>
          <summary>
            <span className="insp-summary-title">{summary(item, i)}</span>
            <span className="insp-itembar">
              <button type="button" className="insp-iconbtn" title="Monter" disabled={i === 0} onClick={e => { e.preventDefault(); move(i, -1) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
              </button>
              <button type="button" className="insp-iconbtn" title="Descendre" disabled={i === items.length - 1} onClick={e => { e.preventDefault(); move(i, 1) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              <button type="button" className="insp-iconbtn" title="Supprimer" onClick={e => { e.preventDefault(); commit(items.filter((_, j) => j !== i)) }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-9 0v14a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" /></svg>
              </button>
            </span>
            <Caret />
          </summary>
          <div className="insp-fields">
            {fields.map(f => (
              <Field key={f.key} spec={{ key: f.key, label: f.label, kind: f.kind as Kind }}
                value={item[f.key]} ImagePicker={ImagePicker}
                onChange={v => commit(items.map((x, j) => j === i ? { ...x, [f.key]: v } : x))} />
            ))}
          </div>
        </details>
      ))}
      <button type="button" className="insp-add" style={{ marginTop: 4 }} onClick={() => commit([...items, {}])}>+ Ajouter {noun}</button>
      {hasImages && (
        <div className="insp-field" style={{ marginTop: 16 }}>
          <label>Format des images</label>
          <p className="insp-help">Toutes les images de cette section adoptent ce format (l’original n’est pas modifié).</p>
          <select value={ratio} onChange={e => setRatio(e.target.value)}>
            {IMAGE_RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}

/** Inspecteur d'une section — remplace le formulaire brut (SectionEditorForm)
 * par une présentation regroupée, relibellée et pliable. Mêmes props. */
export function SectionInspector({ type, content, onChange, ImagePicker }: {
  type: SectionType; content: unknown; onChange: (content: unknown) => void; ImagePicker?: ImagePickerComponent
}) {
  const c = (content as Obj) ?? {}
  return (
    <div className="insp">
      {SECTION_TYPES[type].kind === 'repeatable'
        ? <RepeatableInspector type={type} content={c} onChange={onChange} ImagePicker={ImagePicker} />
        : <SingletonInspector type={type} content={c} onChange={onChange} ImagePicker={ImagePicker} />}
    </div>
  )
}

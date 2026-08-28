'use client'

import { SECTION_TYPES } from '../section-types'
import { ICONES_LIBRE } from '../types'
import type { SectionType } from '../types'
import type { ImagePickerComponent } from './types'

// Inspecteur de sections structuré (blocs pliables, libellés clairs, aide
// contextuelle). Partagé par le CMS Moontain et l'espace client — même
// expérience d'édition des deux côtés. Purement présentationnel : reçoit
// type/content/onChange/ImagePicker. Les styles (classes `.insp*`) sont
// fournis par l'app hôte (voir globals.css / site-editor.css).

type Obj = Record<string, any>
type Kind = 'text' | 'textarea' | 'image' | 'date' | 'boolean' | 'imagelist'
interface FieldSpec {
  key: string; label: string; help?: string; kind: Kind; placeholder?: string
  /**
   * Cases à cocher uniquement : état affiché tant que le contenu ne dit rien.
   * Sert aux options « affiché par défaut » — sans lui, une section créée avant
   * l'ajout de l'option apparaîtrait décochée alors que le site l'affiche.
   */
  defaultOn?: boolean
}
interface GroupSpec { title: string; fields: FieldSpec[] }

export const SECTION_HELP: Partial<Record<SectionType, string>> = {
  hero: 'La grande bannière en haut de la page.',
  libre: 'Des éléments à composer vous-même : titre, texte, image, bouton.',
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
  moduleReviews: 'Le mur d\'avis en direct (avis approuvés), intégré dans la page.',
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
  // Le bloc Réservation expose en plus ce que le widget affiche ou demande.
  // Tout est optionnel et coché par défaut : ne rien toucher laisse le widget
  // exactement comme avant l'ajout de ces réglages.
  moduleBooking: [
    ...MODULE_HEADER_SPEC,
    { title: 'Ce que le widget affiche', fields: [
      { key: 'showPrice', label: 'Les tarifs', help: 'Décochez si vos prix sont sur devis.', kind: 'boolean', defaultOn: true },
      { key: 'showDuration', label: 'La durée de la prestation', kind: 'boolean', defaultOn: true },
      { key: 'showDeposit', label: "Le montant de l'acompte", kind: 'boolean', defaultOn: true },
      { key: 'showLive', label: '« Disponibilités en direct »', help: 'Le petit voyant au-dessus du calendrier.', kind: 'boolean', defaultOn: true },
      { key: 'showPolicy', label: 'Les conditions de modification', help: '« Déplaçable une fois, jusqu\'à 48 h avant. »', kind: 'boolean', defaultOn: true },
    ] },
    { title: 'Ce que le widget demande', fields: [
      { key: 'askPhone', label: 'Le téléphone du visiteur', help: 'Champ facultatif pour lui.', kind: 'boolean', defaultOn: true },
      { key: 'askNote', label: 'Un message libre', kind: 'boolean', defaultOn: true },
    ] },
  ],
  moduleTickets: MODULE_HEADER_SPEC,
  moduleGiftcard: MODULE_HEADER_SPEC,
  moduleMembership: MODULE_HEADER_SPEC,
  moduleReviews: MODULE_HEADER_SPEC,
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

function FieldInput({ kind, value, placeholder, defaultOn, onChange, ImagePicker }: {
  kind: Kind; value: any; placeholder?: string; defaultOn?: boolean
  onChange: (v: any) => void; ImagePicker?: ImagePickerComponent
}) {
  if (kind === 'textarea') return <textarea rows={3} value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
  if (kind === 'boolean') return (
    <label className="insp-check"><input type="checkbox" checked={value ?? defaultOn ?? false} onChange={e => onChange(e.target.checked)} /> Oui</label>
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
      <FieldInput kind={spec.kind} value={value} placeholder={spec.placeholder} defaultOn={spec.defaultOn} onChange={onChange} ImagePicker={ImagePicker} />
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

// ── Bloc libre ───────────────────────────────────────────────────────────────
// Ni « singleton » ni « répétable » du point de vue de l'édition : une suite
// d'éléments qui n'ont PAS les mêmes champs. RepeatableInspector affiche les
// mêmes champs pour tous — sur un trait horizontal, ça donnerait six champs
// vides — et SingletonInspector, faute de grille de champs pour ce type, ne
// rendait tout simplement rien : le bloc s'ajoutait mais restait inéditable.

const NATURES: { type: string; label: string; studio?: boolean }[] = [
  { type: 'titre', label: 'Titre' },
  { type: 'texte', label: 'Paragraphe' },
  { type: 'image', label: 'Image' },
  { type: 'bouton', label: 'Bouton' },
  { type: 'trait', label: 'Trait' },
  { type: 'espace', label: 'Espace' },
  { type: 'icone', label: 'Icône + texte' },
  { type: 'video', label: 'Vidéo' },
  { type: 'galerie', label: 'Galerie' },
  { type: 'compte', label: 'Compte à rebours' },
  { type: 'carte', label: 'Carte' },
  { type: 'reseaux', label: 'Réseaux' },
  // Réservé au studio : un client pourrait y coller un traceur, ce qui
  // ruinerait l'argument « aucun cookie, aucun bandeau ».
  { type: 'html', label: 'HTML', studio: true },
]
const NATURE_LABEL: Record<string, string> =
  Object.fromEntries(NATURES.map(n => [n.type, n.label]))

// Contenu d'amorce : un élément posé doit se voir tout de suite dans l'aperçu.
// Sans texte de départ, on ajoute un titre, rien ne bouge, et on croit que le
// bouton n'a pas marché.
const AMORCE: Record<string, Obj> = {
  titre:  { type: 'titre', texte: 'Un titre', niveau: 'h2' },
  texte:  { type: 'texte', texte: 'Votre texte ici.' },
  bouton: { type: 'bouton', texte: 'En savoir plus', href: '/contact', apparence: 'plein' },
  espace: { type: 'espace', taille: 'moyen' },
  icone:  { type: 'icone', icone: 'check', texte: 'Un argument en une ligne.' },
  compte: { type: 'compte', texte: 'Plus que', apres: 'C’est parti !' },
  galerie: { type: 'galerie', images: [{}, {}, {}] },
  reseaux: { type: 'reseaux', reseaux: [{ nom: 'Instagram', href: '' }] },
}

function Choix({ label, value, options, onChange }: {
  label: string; value: string; options: [string, string][]; onChange: (v: string) => void
}) {
  return (
    <div className="insp-field">
      <label>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )
}

function LibreInspector({ content, onChange, ImagePicker, studio, business }: {
  content: Obj; onChange: (c: Obj) => void; ImagePicker?: ImagePickerComponent
  /** Le studio voit des natures que le client ne voit pas (HTML brut). */
  studio?: boolean
  /** Coordonnées de l'organisation, pour recopier ses réseaux d'un clic. */
  business?: Obj
}) {
  const items: Obj[] = Array.isArray(content?.items) ? content.items : []
  const commit = (next: Obj[]) => onChange({ ...content, items: next })
  const set = (i: number, cle: string, v: any) => commit(items.map((x, j) => j === i ? { ...x, [cle]: v } : x))
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const next = items.slice(); [next[i], next[j]] = [next[j], next[i]]; commit(next)
  }

  // Une liste DANS un élément : la galerie a plusieurs images, les réseaux
  // plusieurs comptes. Volontairement sans volets pliables — on est déjà dans
  // le volet d'un élément, et emboîter deux niveaux de pliage rendrait le
  // panneau illisible.
  const sousListe = (i: number, cle: string, liste: Obj[], rendu: (l: Obj, j: number, maj: (c: string, v: any) => void) => any, libelleAjout: string) => (
    <div className="stack" style={{ gap: 8 }}>
      {liste.map((l, j) => (
        <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {rendu(l, j, (c, v) => set(i, cle, liste.map((x, k) => k === j ? { ...x, [c]: v } : x)))}
          </div>
          <button type="button" className="insp-iconbtn" title="Retirer"
            onClick={e => { e.preventDefault(); set(i, cle, liste.filter((_, k) => k !== j)) }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
      <button type="button" className="insp-add" style={{ marginTop: 0 }}
        onClick={() => set(i, cle, [...liste, {}])}>+ {libelleAjout}</button>
    </div>
  )

  const resume = (el: Obj, i: number) => {
    const t = (el.texte ?? '').toString().trim()
    return t || `${NATURE_LABEL[el.type] ?? el.type} ${i + 1}`
  }

  const champs = (el: Obj, i: number) => {
    switch (el.type) {
      case 'titre': return (
        <>
          <Field spec={{ key: 'texte', label: 'Titre', kind: 'text' }} value={el.texte} onChange={v => set(i, 'texte', v)} />
          {/* Pas de h1 : il appartient à la bannière de la page, et deux h1 se
              disputent le sujet aux yeux des moteurs. */}
          <Choix label="Niveau" value={el.niveau ?? 'h2'} onChange={v => set(i, 'niveau', v)}
            options={[['h2', 'Titre principal'], ['h3', 'Sous-titre']]} />
        </>
      )
      case 'texte': return (
        <Field spec={{ key: 'texte', label: 'Texte', kind: 'textarea' }} value={el.texte} onChange={v => set(i, 'texte', v)} />
      )
      case 'image': return (
        <>
          <Field spec={{ key: 'image', label: 'Image', kind: 'image' }} value={el.image} onChange={v => set(i, 'image', v)} ImagePicker={ImagePicker} />
          <Field spec={{ key: 'alt', label: 'Texte alternatif', kind: 'text',
            help: 'Ce que montre l’image. Sert aux moteurs et aux lecteurs d’écran.' }}
            value={el.alt} onChange={v => set(i, 'alt', v)} />
        </>
      )
      case 'bouton': return (
        <>
          <Field spec={{ key: 'texte', label: 'Libellé', kind: 'text' }} value={el.texte} onChange={v => set(i, 'texte', v)} />
          <Field spec={{ key: 'href', label: 'Destination', kind: 'text', placeholder: '/contact, #tarifs ou https://…' }}
            value={el.href} onChange={v => set(i, 'href', v)} />
          <Choix label="Apparence" value={el.apparence ?? 'plein'} onChange={v => set(i, 'apparence', v)}
            options={[['plein', 'Plein'], ['contour', 'Contour']]} />
        </>
      )
      case 'espace': return (
        <Choix label="Hauteur" value={el.taille ?? 'moyen'} onChange={v => set(i, 'taille', v)}
          options={[['petit', 'Petite'], ['moyen', 'Moyenne'], ['grand', 'Grande']]} />
      )
      case 'icone': return (
        <>
          <div className="insp-field">
            <label>Icône</label>
            {/* Les douze en grille plutôt qu'en liste déroulante : on choisit
                une icône en la voyant, pas en lisant son nom. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
              {ICONES_LIBRE.map(ic => (
                <button key={ic.cle} type="button" title={ic.label}
                  className="insp-iconbtn"
                  style={{ aspectRatio: '1', width: '100%', height: 'auto',
                    background: (el.icone ?? 'check') === ic.cle ? 'var(--accent, #4756A0)' : undefined,
                    color: (el.icone ?? 'check') === ic.cle ? '#fff' : undefined }}
                  onClick={e => { e.preventDefault(); set(i, 'icone', ic.cle) }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={ic.d} /></svg>
                </button>
              ))}
            </div>
          </div>
          <Field spec={{ key: 'texte', label: 'Texte', kind: 'textarea' }} value={el.texte} onChange={v => set(i, 'texte', v)} />
        </>
      )
      case 'video': return (
        <>
          <Field spec={{ key: 'videoUrl', label: 'Adresse de la vidéo', kind: 'text',
            placeholder: 'YouTube, Vimeo, ou un fichier .mp4',
            help: 'Une adresse YouTube ou Vimeo est intégrée ; un fichier est lu directement.' }}
            value={el.videoUrl} onChange={v => set(i, 'videoUrl', v)} />
          <Field spec={{ key: 'poster', label: 'Image d’attente', kind: 'image',
            help: 'Affichée avant la lecture. Sans elle, le lecteur démarre sur du noir.' }}
            value={el.poster} onChange={v => set(i, 'poster', v)} ImagePicker={ImagePicker} />
        </>
      )
      case 'galerie': {
        const imgs: Obj[] = Array.isArray(el.images) ? el.images : []
        return (
          <div className="insp-field">
            <label>Images</label>
            <p className="insp-help">Une galerie simple. Pour une vraie mosaïque légendée, le bloc « Galerie » fait mieux.</p>
            {sousListe(i, 'images', imgs, (l, j, maj) => (
              <>
                <Field spec={{ key: `im${j}`, label: `Image ${j + 1}`, kind: 'image' }} value={l.image} onChange={v => maj('image', v)} ImagePicker={ImagePicker} />
                <Field spec={{ key: `al${j}`, label: 'Texte alternatif', kind: 'text' }} value={l.alt} onChange={v => maj('alt', v)} />
              </>
            ), 'Ajouter une image')}
          </div>
        )
      }
      case 'compte': return (
        <>
          <Field spec={{ key: 'date', label: 'Échéance', kind: 'date' }} value={el.date} onChange={v => set(i, 'date', v)} />
          <Field spec={{ key: 'texte', label: 'Avant le décompte', kind: 'text', placeholder: 'Plus que' }} value={el.texte} onChange={v => set(i, 'texte', v)} />
          <Field spec={{ key: 'apres', label: 'Une fois la date passée', kind: 'text', placeholder: 'C’est parti !',
            help: 'Ce qui s’affiche à la place du décompte. Sans ça, un compte à rebours périmé reste à zéro pour toujours.' }}
            value={el.apres} onChange={v => set(i, 'apres', v)} />
        </>
      )
      case 'carte': return (
        <Field spec={{ key: 'adresse', label: 'Adresse', kind: 'text', placeholder: 'Rue Exemple 1, 1950 Sion',
          help: 'Affichée sur une carte. Le bloc « Carte / localisation » ajoute un titre et un texte.' }}
          value={el.adresse} onChange={v => set(i, 'adresse', v)} />
      )
      case 'reseaux': {
        const rs: Obj[] = Array.isArray(el.reseaux) ? el.reseaux : []
        const duSite = Object.entries((business?.social as Obj) ?? {})
          .filter(([, v]) => typeof v === 'string' && (v as string).trim())
          .map(([nom, href]) => ({ nom: nom.charAt(0).toUpperCase() + nom.slice(1), href: href as string }))
        return (
          <div className="insp-field">
            <label>Comptes</label>
            {duSite.length > 0 && (
              <>
                <p className="insp-help">Les comptes de l’entreprise sont déjà saisis dans les coordonnées.</p>
                <button type="button" className="insp-add" style={{ marginTop: 0, marginBottom: 8 }}
                  onClick={() => set(i, 'reseaux', duSite)}>
                  Reprendre ceux de l’entreprise ({duSite.length})
                </button>
              </>
            )}
            {sousListe(i, 'reseaux', rs, (l, j, maj) => (
              <>
                <Field spec={{ key: `rn${j}`, label: 'Nom', kind: 'text', placeholder: 'Instagram' }} value={l.nom} onChange={v => maj('nom', v)} />
                <Field spec={{ key: `rh${j}`, label: 'Adresse', kind: 'text', placeholder: 'https://…' }} value={l.href} onChange={v => maj('href', v)} />
              </>
            ), 'Ajouter un compte')}
          </div>
        )
      }
      case 'html': return (
        <div className="insp-field">
          <label>HTML</label>
          <p className="insp-help">
            Collé tel quel dans la page. Réservé au studio : un script posé ici peut casser la mise
            en page, ou déposer un cookie — et faire tomber l’argument « aucun bandeau ».
          </p>
          <textarea rows={6} spellCheck={false} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}
            value={el.html ?? ''} onChange={e => set(i, 'html', e.target.value)} />
        </div>
      )
      // Le dire vaut mieux qu'un volet vide, qui laisserait croire que quelque
      // chose n'a pas fini de charger.
      case 'trait': return <p className="insp-help">Une ligne de séparation. Rien à régler.</p>
      default: return null
    }
  }

  return (
    <div className="stack" style={{ gap: 0 }}>
      {items.length === 0 && (
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Aucun élément pour l’instant. Ajoutez-en un ci-dessous.
        </p>
      )}
      {items.map((el, i) => (
        <details key={i} className="insp-item" open={items.length <= 3}>
          <summary>
            <span className="insp-summary-title">{resume(el, i)}</span>
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
          <div className="insp-fields">{champs(el, i)}</div>
        </details>
      ))}

      {/* Les six natures en clair plutôt qu'une liste déroulante : on ajoute
          d'un seul geste, et la palette visible dit ce que le bloc sait faire. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {NATURES.filter(n => !n.studio || studio).map(n => (
          <button key={n.type} type="button" className="insp-add" style={{ flex: '0 0 auto', marginTop: 0 }}
            onClick={() => commit([...items, AMORCE[n.type] ?? { type: n.type }])}>
            + {n.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Inspecteur d'une section — remplace le formulaire brut (SectionEditorForm)
 * par une présentation regroupée, relibellée et pliable. Mêmes props. */
export function SectionInspector({ type, content, onChange, ImagePicker, studio, business }: {
  type: SectionType; content: unknown; onChange: (content: unknown) => void; ImagePicker?: ImagePickerComponent
  /** Vrai dans le CMS du studio, absent dans l'éditeur client. Ouvre les
   *  natures d'élément qu'un client ne doit pas pouvoir poser. */
  studio?: boolean
  /** Coordonnées de l'organisation (draft.business), pour proposer de recopier
   *  ses réseaux au lieu de les redemander. */
  business?: Record<string, unknown>
}) {
  const c = (content as Obj) ?? {}
  return (
    <div className="insp">
      {type === 'libre'
        ? <LibreInspector content={c} onChange={onChange} ImagePicker={ImagePicker} studio={studio} business={business as Obj | undefined} />
        : SECTION_TYPES[type].kind === 'repeatable'
          ? <RepeatableInspector type={type} content={c} onChange={onChange} ImagePicker={ImagePicker} />
          : <SingletonInspector type={type} content={c} onChange={onChange} ImagePicker={ImagePicker} />}
    </div>
  )
}

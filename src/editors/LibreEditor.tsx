'use client'

import type { ElementLibre, ElementLibreType } from '../types'
import type { ImagePickerComponent } from './types'

// Éditeur du bloc libre : une suite ordonnée d'éléments, chacun avec ses
// propres champs.
//
// RepeatableListEditor ne convenait pas : il affiche les mêmes champs pour tous
// les éléments d'une liste. Ici une image n'a pas de niveau de titre, un espace
// n'a pas de texte, et un trait n'a rien du tout — montrer six champs vides sur
// un trait horizontal rendrait le panneau illisible.

const ELEMENTS: { type: ElementLibreType; label: string }[] = [
  { type: 'titre', label: 'Titre' },
  { type: 'texte', label: 'Paragraphe' },
  { type: 'image', label: 'Image' },
  { type: 'bouton', label: 'Bouton' },
  { type: 'trait', label: 'Trait' },
  { type: 'espace', label: 'Espace' },
]

const LABEL: Record<ElementLibreType, string> =
  Object.fromEntries(ELEMENTS.map(e => [e.type, e.label])) as Record<ElementLibreType, string>

// Contenu de départ par nature. Un élément posé doit se voir tout de suite dans
// l'aperçu : sans texte d'amorce, on ajoute un titre et il ne se passe
// visiblement rien, ce qui donne l'impression que le bouton n'a pas marché.
const AMORCE: Partial<Record<ElementLibreType, ElementLibre>> = {
  titre:  { type: 'titre', texte: 'Un titre', niveau: 'h2' },
  texte:  { type: 'texte', texte: 'Votre texte ici.' },
  bouton: { type: 'bouton', texte: 'En savoir plus', href: '/contact', apparence: 'plein' },
  espace: { type: 'espace', taille: 'moyen' },
}

export function LibreEditor({
  content, onChange, ImagePicker,
}: {
  content: { items?: ElementLibre[] } | undefined
  onChange: (content: { items: ElementLibre[] }) => void
  ImagePicker?: ImagePickerComponent
}) {
  const items = content?.items ?? []
  const write = (next: ElementLibre[]) => onChange({ ...(content ?? {}), items: next })

  const set = (i: number, champ: keyof ElementLibre, valeur: string) => {
    const next = items.slice()
    next[i] = { ...next[i], [champ]: valeur }
    write(next)
  }
  const ajouter = (type: ElementLibreType) => write([...items, AMORCE[type] ?? { type }])
  const retirer = (i: number) => write(items.filter((_, k) => k !== i))
  const deplacer = (i: number, sens: -1 | 1) => {
    const j = i + sens
    if (j < 0 || j >= items.length) return
    const next = items.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    write(next)
  }

  const champs = (el: ElementLibre, i: number) => {
    switch (el.type) {
      case 'titre':
        return (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs opacity-70">Titre</span>
              <input type="text" value={el.texte ?? ''} onChange={e => set(i, 'texte', e.target.value)} />
            </label>
            {/* Pas de h1 : il appartient à la bannière de la page, et deux h1
                se disputent le sujet de la page aux yeux des moteurs. */}
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs opacity-70">Niveau</span>
              <select value={el.niveau ?? 'h2'} onChange={e => set(i, 'niveau', e.target.value)}>
                <option value="h2">Titre principal</option>
                <option value="h3">Sous-titre</option>
              </select>
            </label>
          </>
        )
      case 'texte':
        return (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs opacity-70">Texte</span>
            <textarea rows={4} value={el.texte ?? ''} onChange={e => set(i, 'texte', e.target.value)} />
          </label>
        )
      case 'image':
        return (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs opacity-70">Image</span>
              {ImagePicker
                ? <ImagePicker value={el.image} onChange={url => set(i, 'image', url)} />
                : <input type="text" value={el.image ?? ''} onChange={e => set(i, 'image', e.target.value)} placeholder="URL de l’image" />}
            </label>
            {/* Le texte alternatif sert aux moteurs ET aux lecteurs d'écran :
                c'est le même champ, et il n'existe nulle part ailleurs. */}
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs opacity-70">Texte alternatif</span>
              <input type="text" value={el.alt ?? ''} onChange={e => set(i, 'alt', e.target.value)}
                placeholder="Ce que montre l’image" />
            </label>
          </>
        )
      case 'bouton':
        return (
          <>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs opacity-70">Libellé</span>
              <input type="text" value={el.texte ?? ''} onChange={e => set(i, 'texte', e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs opacity-70">Destination</span>
              <input type="text" value={el.href ?? ''} onChange={e => set(i, 'href', e.target.value)}
                placeholder="/contact, #tarifs ou https://…" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs opacity-70">Apparence</span>
              <select value={el.apparence ?? 'plein'} onChange={e => set(i, 'apparence', e.target.value)}>
                <option value="plein">Plein</option>
                <option value="contour">Contour</option>
              </select>
            </label>
          </>
        )
      case 'espace':
        return (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs opacity-70">Hauteur</span>
            <select value={el.taille ?? 'moyen'} onChange={e => set(i, 'taille', e.target.value)}>
              <option value="petit">Petite</option>
              <option value="moyen">Moyenne</option>
              <option value="grand">Grande</option>
            </select>
          </label>
        )
      // Un trait n'a aucun réglage : le dire vaut mieux qu'une carte vide, qui
      // donnerait à croire que quelque chose n'a pas fini de charger.
      case 'trait':
        return <p className="text-xs opacity-60">Une ligne de séparation. Rien à régler.</p>
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((el, i) => (
        <div key={i} className="border rounded-md p-3 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="text-xs uppercase tracking-wide opacity-60">{LABEL[el.type] ?? el.type}</span>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => deplacer(i, -1)} disabled={i === 0} className="disabled:opacity-30">↑</button>
              <button type="button" onClick={() => deplacer(i, 1)} disabled={i === items.length - 1} className="disabled:opacity-30">↓</button>
              <button type="button" onClick={() => retirer(i)}>Supprimer</button>
            </div>
          </div>
          {champs(el, i)}
        </div>
      ))}

      {/* Les six natures en clair plutôt qu'une liste déroulante : on choisit
          ce qu'on ajoute d'un seul geste, et la palette entière reste visible —
          c'est elle qui dit ce que le bloc sait faire. */}
      <div className="flex flex-wrap gap-2">
        {ELEMENTS.map(e => (
          <button key={e.type} type="button" className="text-sm" onClick={() => ajouter(e.type)}>
            + {e.label}
          </button>
        ))}
      </div>
    </div>
  )
}

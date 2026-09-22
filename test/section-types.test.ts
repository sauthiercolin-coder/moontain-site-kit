import { describe, expect, it } from 'vitest'
import { SECTION_TYPES, sectionContentSchema } from '../src/section-types'
import type { AgendaContent, MapContent } from '../src/types'

// Bloc Carte réel du siège de Fiduciaire Roh (relevé en base le 21.09.2026).
const siegeRoh: MapContent = {
  title: 'Sion',
  address: 'Route de la Drague 18, CH-1950 Sion',
  phone: '+41 27 322 62 72',
  lat: 46.221381,
  lng: 7.356139,
}

describe('schéma du bloc Carte (map)', () => {
  it('garde lat, lng et phone à l’enregistrement', () => {
    const r = sectionContentSchema('map').safeParse(siegeRoh)
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data.lat).toBe(46.221381)
    expect(r.data.lng).toBe(7.356139)
    expect(r.data.phone).toBe('+41 27 322 62 72')
    expect(r.data).toEqual(siegeRoh)
  })

  it('accepte des coordonnées saisies en texte', () => {
    const r = sectionContentSchema('map').safeParse({ ...siegeRoh, lat: '46.221381', lng: '7.356139' })
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data.lat).toBe('46.221381')
    expect(r.data.lng).toBe('7.356139')
  })

  it('garde eyebrow, text et _style avec le reste', () => {
    const contenu = {
      ...siegeRoh,
      eyebrow: 'Nos bureaux',
      text: 'Parking devant l’entrée.',
      _style: { pad: 'compact' },
    }
    const r = sectionContentSchema('map').safeParse(contenu)
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data).toEqual(contenu)
  })

  it('refuse des coordonnées d’un autre type', () => {
    expect(sectionContentSchema('map').safeParse({ ...siegeRoh, lat: true }).success).toBe(false)
  })
})

describe('bloc « Prochains événements » (moduleAgenda)', () => {
  it('existe, avec un contenu de départ que son propre schéma accepte', () => {
    const def = SECTION_TYPES.moduleAgenda
    expect(def.kind).toBe('singleton')
    expect(def.defaultContent).toEqual({ title: 'Prochains événements', intro: '' })
    expect(sectionContentSchema('moduleAgenda').safeParse(def.defaultContent).success).toBe(true)
  })

  // Le piège du bloc Carte : un champ non déclaré disparaît sans erreur au
  // premier enregistrement.
  it('garde la catégorie, le nombre et le style à l’enregistrement', () => {
    const contenu: AgendaContent & { _style: { pad: string } } = {
      title: 'Au domaine', intro: 'Dégustations et concerts.', categorie: 'Concert', nombre: 6, _style: { pad: 'compact' },
    }
    const r = sectionContentSchema('moduleAgenda').safeParse(contenu)
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data).toEqual(contenu)
  })

  it('refuse un nombre hors de 1 à 12, ou qui n’est pas entier', () => {
    for (const nombre of [0, 13, 2.5, '3']) {
      expect(sectionContentSchema('moduleAgenda').safeParse({ nombre }).success).toBe(false)
    }
    expect(sectionContentSchema('moduleAgenda').safeParse({ nombre: 1 }).success).toBe(true)
    expect(sectionContentSchema('moduleAgenda').safeParse({ nombre: 12 }).success).toBe(true)
  })
})

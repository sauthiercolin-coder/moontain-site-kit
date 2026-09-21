import { describe, expect, it } from 'vitest'
import { sectionContentSchema } from '../src/section-types'
import type { MapContent } from '../src/types'

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

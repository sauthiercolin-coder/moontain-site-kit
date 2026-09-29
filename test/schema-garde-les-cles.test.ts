import { describe, it, expect } from 'vitest'
import { sectionContentSchema } from '../src/section-types'

// Le 29.09.2026, modifier un texte dans le constructeur effaçait le surtitre,
// le titre et l'intro du bloc : le schéma d'un bloc répétable ne déclarait que
// `items` et `ratio`, et zod retire en silence ce qu'il ne connaît pas.

describe('sectionContentSchema — ne retire rien en silence', () => {
  it('garde l’en-tête d’un bloc répétable', () => {
    const contenu = {
      eyebrow: 'Nos prestations', title: 'Ce que fait l’atelier', text: 'Du plan à la pose.',
      items: [{ title: 'Soudure', description: 'MIG, TIG' }],
    }
    const res = sectionContentSchema('services').safeParse(contenu)
    expect(res.success).toBe(true)
    expect(res.success && res.data).toEqual(contenu)
  })

  it('garde les boutons d’un bloc à champs fixes', () => {
    const contenu = { title: 'Un projet métallurgique en tête ?', button: 'Nous écrire', buttonHref: '/contact' }
    const res = sectionContentSchema('cta').safeParse(contenu)
    expect(res.success).toBe(true)
    expect(res.success && res.data).toMatchObject(contenu)
  })

  it('valide toujours les clés déclarées', () => {
    expect(sectionContentSchema('services').safeParse({ items: 'pas une liste' }).success).toBe(false)
  })
})

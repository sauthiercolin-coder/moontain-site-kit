import { describe, it, expect } from 'vitest'
import { enRupture, etiquettesEnRupture, revenuEnStock, stockDe } from '../src/stock'

// Le piège de ce fichier tient en une ligne : `null` n'est pas zéro. Un
// commerce qui ne compte pas ses stocks laisse le champ vide ; confondre les
// deux afficherait « épuisé » sur tout son catalogue.

describe('stockDe', () => {
  it('rend le stock d’une fiche simple', () => {
    expect(stockDe({ stock: 4 })).toBe(4)
    expect(stockDe({ stock: 0 })).toBe(0)
  })
  it('garde null : non suivi n’est pas zéro', () => {
    expect(stockDe({ stock: null })).toBeNull()
  })
  it('lit la variante demandée', () => {
    const f = { stock: null, variants: [{ label: 'S', stock: 0 }, { label: 'M', stock: 2 }] }
    expect(stockDe(f, 'M')).toBe(2)
    expect(stockDe(f, 'S')).toBe(0)
  })
  // Mieux vaut annoncer épuisé à tort que vendre ce qu'on n'a pas.
  it('rend zéro pour une variante inconnue', () => {
    expect(stockDe({ stock: 9, variants: [{ label: 'S', stock: 3 }] }, 'XXL')).toBe(0)
  })
  it('sans variante demandée, retient la meilleure', () => {
    expect(stockDe({ stock: 0, variants: [{ label: 'S', stock: 0 }, { label: 'M', stock: 2 }] })).toBe(2)
    expect(stockDe({ stock: 0, variants: [{ label: 'S', stock: 0 }, { label: 'M', stock: 0 }] })).toBe(0)
  })
  it('une variante non suivie rend la fiche non suivie', () => {
    expect(stockDe({ stock: 0, variants: [{ label: 'S', stock: 0 }, { label: 'M', stock: null }] })).toBeNull()
  })
  it('une étiquette entourée d’espaces vaut l’étiquette', () => {
    expect(stockDe({ stock: 0, variants: [{ label: 'M', stock: 5 }] }, '  M  ')).toBe(5)
  })
})

describe('enRupture', () => {
  it('zéro l’est, null jamais', () => {
    expect(enRupture({ stock: 0 })).toBe(true)
    expect(enRupture({ stock: null })).toBe(false)
    expect(enRupture({ stock: 1 })).toBe(false)
  })
  it('se juge variante par variante', () => {
    const f = { stock: null, variants: [{ label: 'S', stock: 0 }, { label: 'M', stock: 2 }] }
    expect(enRupture(f, 'S')).toBe(true)
    expect(enRupture(f, 'M')).toBe(false)
    // La fiche entière ne l'est pas : il reste des M.
    expect(enRupture(f)).toBe(false)
  })
})

describe('revenuEnStock', () => {
  // La vraie question du passage qui prévient. Sans la comparaison, chaque
  // enregistrement du catalogue renverrait le même message aux mêmes gens.
  it('vrai seulement au passage de zéro à quelque chose', () => {
    expect(revenuEnStock({ stock: 0 }, { stock: 3 })).toBe(true)
    expect(revenuEnStock({ stock: 3 }, { stock: 5 })).toBe(false)
    expect(revenuEnStock({ stock: 0 }, { stock: 0 })).toBe(false)
    expect(revenuEnStock({ stock: 5 }, { stock: 0 })).toBe(false)
  })
  it('vrai aussi quand le commerce cesse de compter', () => {
    expect(revenuEnStock({ stock: 0 }, { stock: null })).toBe(true)
  })
  it('se juge sur la variante attendue, pas sur le reste', () => {
    const avant = { stock: null, variants: [{ label: 'S', stock: 0 }, { label: 'M', stock: 0 }] }
    const apres = { stock: null, variants: [{ label: 'S', stock: 0 }, { label: 'M', stock: 4 }] }
    expect(revenuEnStock(avant, apres, 'M')).toBe(true)
    expect(revenuEnStock(avant, apres, 'S')).toBe(false)
  })
  it('sans état d’avant, on ne réveille personne', () => {
    expect(revenuEnStock(null, { stock: 5 })).toBe(false)
    expect(revenuEnStock(undefined, { stock: 5 })).toBe(false)
  })
})

describe('etiquettesEnRupture', () => {
  it('ne liste que celles à zéro', () => {
    expect(etiquettesEnRupture({
      stock: null,
      variants: [{ label: 'S', stock: 0 }, { label: 'M', stock: 2 }, { label: 'L', stock: 0 }, { label: 'XL', stock: null }],
    })).toEqual(['S', 'L'])
  })
  it('rend une liste vide sans variantes', () => {
    expect(etiquettesEnRupture({ stock: 0 })).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import { enTetesSemaine, grilleDuMois, lireMois, moisLisible, moisVoisin } from '../src/calendrier'

// Les cas de grilleDuMois et moisVoisin sont ceux du CMS
// (lib/__tests__/calendrier.test.ts), repris tels quels : la fonction a
// déménagé, son comportement ne doit pas bouger.

describe('grilleDuMois', () => {
  it('commence les semaines le lundi', () => {
    // Le 1er août 2026 tombe un samedi : cinq cases vides avant lui.
    const g = grilleDuMois(2026, 8)
    expect(g[0].slice(0, 5)).toEqual([null, null, null, null, null])
    expect(g[0][5]).toBe('2026-08-01')
  })

  it('couvre tous les jours du mois', () => {
    const jours = grilleDuMois(2026, 8).flat().filter(Boolean)
    expect(jours).toHaveLength(31)
    expect(jours[30]).toBe('2026-08-31')
  })

  it('gère février bissextile', () => {
    expect(grilleDuMois(2028, 2).flat().filter(Boolean)).toHaveLength(29)
    expect(grilleDuMois(2026, 2).flat().filter(Boolean)).toHaveLength(28)
  })

  it('rend des semaines complètes', () => {
    for (const s of grilleDuMois(2026, 8)) expect(s).toHaveLength(7)
  })

  // Le mois du changement d'heure : un calcul en heure locale y perdrait ou
  // doublerait un jour selon le fuseau de la machine.
  it('ne perd aucun jour au changement d’heure', () => {
    const mars = grilleDuMois(2026, 3).flat().filter(Boolean)
    const octobre = grilleDuMois(2026, 10).flat().filter(Boolean)
    expect(mars).toHaveLength(31)
    expect(new Set(mars).size).toBe(31)
    expect(octobre).toHaveLength(31)
    expect(octobre).toContain('2026-10-25')
  })
})

describe('moisVoisin', () => {
  it('passe d’une année à l’autre', () => {
    expect(moisVoisin(2026, 1, -1)).toEqual({ annee: 2025, mois: 12 })
    expect(moisVoisin(2026, 12, 1)).toEqual({ annee: 2027, mois: 1 })
  })

  it('reste dans l’année sinon', () => {
    expect(moisVoisin(2026, 8, 1)).toEqual({ annee: 2026, mois: 9 })
  })
})

describe('lireMois', () => {
  it('lit le paramètre de la vue mois', () => {
    expect(lireMois('2026-10')).toEqual({ annee: 2026, mois: 10 })
  })

  it('refuse ce qu’un visiteur peut taper', () => {
    for (const v of ['2026-13', '2026-00', '26-10', '99999-01', '2026-1', '', null, 202610]) {
      expect(lireMois(v)).toBeNull()
    }
  })
})

describe('libellés', () => {
  it('met le lundi en tête, comme la grille', () => {
    expect(enTetesSemaine('fr')[0]).toEqual({ court: 'lun.', long: 'lundi' })
    expect(enTetesSemaine('en')[6]).toEqual({ court: 'Sun', long: 'Sunday' })
  })

  it('nomme le mois', () => {
    expect(moisLisible(2026, 10)).toBe('octobre 2026')
    expect(moisLisible(2026, 8, 'en')).toBe('August 2026')
  })
})

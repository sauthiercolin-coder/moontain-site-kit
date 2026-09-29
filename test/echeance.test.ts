import { describe, it, expect } from 'vitest'
import {
  ajouterMois, bornesDeSaisie, dateDuRappel, dateEcheance,
  departAcceptable, dateLisible, jourValide, periodeLisible, prochainEnvoi,
  promesseLisible,
} from '../src/echeance'

describe('jourValide', () => {
  it('accepte un vrai jour', () => {
    expect(jourValide('2026-09-29')).toBe(true)
    expect(jourValide('2028-02-29')).toBe(true) // bissextile
  })
  it('refuse un jour qui n’existe pas, même bien formé', () => {
    expect(jourValide('2027-02-31')).toBe(false)
    expect(jourValide('2027-02-29')).toBe(false) // 2027 n'est pas bissextile
    expect(jourValide('2027-13-01')).toBe(false)
  })
  it('refuse ce qui n’est pas un jour', () => {
    expect(jourValide('')).toBe(false)
    expect(jourValide(null)).toBe(false)
    expect(jourValide('29.09.2026')).toBe(false)
    expect(jourValide('2026-9-29')).toBe(false)
  })
})

describe('ajouterMois', () => {
  it('avance d’un nombre de mois', () => {
    expect(ajouterMois('2026-09-29', 6)).toBe('2027-03-29')
    expect(ajouterMois('2026-09-29', 12)).toBe('2027-09-29')
  })
  it('recule quand le nombre est négatif', () => {
    expect(ajouterMois('2026-09-29', -12)).toBe('2025-09-29')
  })
  // Le piège classique : 31 août + 6 mois. Sans garde-fou, la date déborde
  // sur mars et le rappel part trois jours trop tard.
  it('s’arrête au dernier jour du mois visé', () => {
    expect(ajouterMois('2026-08-31', 6)).toBe('2027-02-28')
    expect(ajouterMois('2027-08-31', 6)).toBe('2028-02-29')
    expect(ajouterMois('2026-05-31', 1)).toBe('2026-06-30')
  })
})

describe('dateEcheance et dateDuRappel', () => {
  const controle = { mode: 'duree' as const, dureeMois: 6, preavisJours: 14 }
  const forfait = { mode: 'date' as const, dureeMois: 12, preavisJours: 30 }

  it('en mode durée, part du dernier passage', () => {
    expect(dateEcheance('2026-09-29', controle)).toBe('2027-03-29')
    expect(dateDuRappel('2026-09-29', controle)).toBe('2027-03-15')
  })
  it('en mode date, l’échéance est celle qu’on a donnée', () => {
    expect(dateEcheance('2027-04-30', forfait)).toBe('2027-04-30')
    expect(dateDuRappel('2027-04-30', forfait)).toBe('2027-03-31')
  })
  it('sans préavis, le message part le jour même', () => {
    expect(dateDuRappel('2026-09-29', { mode: 'duree', dureeMois: 6, preavisJours: 0 }))
      .toBe(dateEcheance('2026-09-29', { mode: 'duree', dureeMois: 6 }))
  })
  it('ignore un préavis négatif au lieu d’écrire après l’échéance', () => {
    expect(dateDuRappel('2026-09-29', { mode: 'duree', dureeMois: 6, preavisJours: -20 }))
      .toBe('2027-03-29')
  })
})

describe('prochainEnvoi', () => {
  it('garde la date quand elle est à venir', () => {
    expect(prochainEnvoi('2027-03-15', '2026-09-29')).toBe('2027-03-15')
  })
  // Quelqu'un dont le dernier contrôle remonte à huit mois : on n'écrit pas
  // dans le passé, on écrit aujourd'hui.
  it('ramène à aujourd’hui une échéance déjà passée', () => {
    expect(prochainEnvoi('2026-05-15', '2026-09-29')).toBe('2026-09-29')
  })
  it('le jour même compte comme à venir', () => {
    expect(prochainEnvoi('2026-09-29', '2026-09-29')).toBe('2026-09-29')
  })
})

describe('dateLisible', () => {
  it('écrit le mois en toutes lettres', () => {
    expect(dateLisible('2027-03-15')).toBe('15 mars 2027')
    expect(dateLisible('2027-08-04')).toBe('4 août 2027')
  })
  it('écrit « 1er » et pas « 1 »', () => {
    expect(dateLisible('2027-03-01')).toBe('1er mars 2027')
  })
  it('sait l’anglais', () => {
    expect(dateLisible('2027-03-15', 'en')).toBe('March 15, 2027')
    expect(dateLisible('2027-03-01', 'en')).toBe('March 1, 2027')
  })
})

describe('periodeLisible', () => {
  it('dit la périodicité en français courant', () => {
    expect(periodeLisible(6)).toBe('tous les six mois')
    expect(periodeLisible(12)).toBe('chaque année')
    expect(periodeLisible(24)).toBe('tous les deux ans')
    expect(periodeLisible(36)).toBe('tous les 3 ans')
    expect(periodeLisible(1)).toBe('chaque mois')
  })
  it('sait l’anglais', () => {
    expect(periodeLisible(6, 'en')).toBe('every 6 months')
    expect(periodeLisible(12, 'en')).toBe('every year')
  })
})

describe('promesseLisible', () => {
  // La phrase qui décide : une date exacte, pas « le moment venu ».
  it('annonce la date exacte', () => {
    expect(promesseLisible('2027-03-15', '2026-09-29'))
      .toBe('Nous vous écrirons le 15 mars 2027.')
  })
  it('dit franchement qu’une échéance passée part tout de suite', () => {
    expect(promesseLisible('2026-05-15', '2026-09-29'))
      .toBe('Cette date est déjà passée : nous vous écrirons dans la journée.')
  })
  it('ne crie pas au retard quand le rappel tombe aujourd’hui', () => {
    expect(promesseLisible('2026-09-29', '2026-09-29'))
      .toBe('Nous vous écrirons le 29 septembre 2026.')
  })
})

describe('bornesDeSaisie et departAcceptable', () => {
  const aujourdHui = '2026-09-29'

  it('en mode durée, le départ est dans le passé', () => {
    const { min, max } = bornesDeSaisie('duree', aujourdHui)
    expect(max).toBe(aujourdHui)
    expect(min).toBe('2016-09-29')
  })
  it('en mode date, l’échéance est dans le futur', () => {
    const { min, max } = bornesDeSaisie('date', aujourdHui)
    expect(min).toBe(aujourdHui)
    expect(max).toBe('2036-09-29')
  })
  it('refuse un contrôle qu’on n’a pas encore fait', () => {
    expect(departAcceptable('2027-01-01', 'duree', aujourdHui)).toBe(false)
    expect(departAcceptable('2026-03-01', 'duree', aujourdHui)).toBe(true)
  })
  it('refuse un abonnement expiré l’an dernier', () => {
    expect(departAcceptable('2025-06-01', 'date', aujourdHui)).toBe(false)
    expect(departAcceptable('2027-06-01', 'date', aujourdHui)).toBe(true)
  })
  it('refuse un jour inexistant', () => {
    expect(departAcceptable('2027-02-31', 'date', aujourdHui)).toBe(false)
  })
})

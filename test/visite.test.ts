import { describe, it, expect } from 'vitest'
import { creneauVisiteChoisi, creneauxDeVisite } from '../src/visite'
import { creneauxDeRappel } from '../src/rappel'
import type { Horaires } from '../src/horaires'

// Une visite se cale, elle ne se prend pas dans le quart d'heure. Il faut
// prévenir l'occupant, retrouver les clés, bloquer une heure — d'où le jour de
// délai, et l'absence de « dès que possible ».

const SEMAINE: Horaires = {
  canton: 'VS',
  feries: {},
  fermetures: [],
  exceptions: [],
  semaine: [
    { jour: 1, plages: [{ debut: '08:00', fin: '12:00' }, { debut: '13:30', fin: '18:00' }] },
    { jour: 2, plages: [{ debut: '08:00', fin: '12:00' }, { debut: '13:30', fin: '18:00' }] },
    { jour: 3, plages: [{ debut: '08:00', fin: '12:00' }, { debut: '13:30', fin: '18:00' }] },
    { jour: 4, plages: [{ debut: '08:00', fin: '12:00' }, { debut: '13:30', fin: '18:00' }] },
    { jour: 5, plages: [{ debut: '08:00', fin: '12:00' }, { debut: '13:30', fin: '18:00' }] },
    { jour: 6, plages: [{ debut: '09:00', fin: '12:00' }] },
    { jour: 0, plages: [] },
  ],
}

// Jeudi 24 septembre 2026, 10 h à Zurich.
const JEUDI_MATIN = new Date('2026-09-24T08:00:00Z')

describe('les créneaux de visite', () => {
  it('ne proposent jamais « dès que possible »', () => {
    const c = creneauxDeVisite(SEMAINE, JEUDI_MATIN)
    expect(c.map(x => x.cle)).not.toContain('des_que_possible')
    // Le rappel, lui, le propose toujours : les deux widgets ne promettent
    // pas la même chose.
    expect(creneauxDeRappel(SEMAINE, JEUDI_MATIN)[0].cle).toBe('des_que_possible')
  })

  it('laissent passer un jour entier avant la première visite', () => {
    const c = creneauxDeVisite(SEMAINE, JEUDI_MATIN)
    expect(c[0].texte).not.toMatch(/aujourd/i)
    // Jeudi 10 h + 24 h = vendredi 10 h : le vendredi matin est déjà entamé,
    // donc trop court. Le premier vrai créneau est vendredi après-midi.
    expect(c[0].texte).toMatch(/Demain après-midi/)
    expect(c[0].debut).toBeGreaterThan(JEUDI_MATIN.getTime() + 24 * 3600 * 1000 - 1)
  })

  it('enchaînent sur les jours ouverts suivants', () => {
    const t = creneauxDeVisite(SEMAINE, JEUDI_MATIN).map(x => x.texte)
    expect(t[1]).toMatch(/Samedi matin/)
    // Dimanche fermé : on passe au lundi.
    expect(t[2]).toMatch(/Lundi matin/)
  })

  it('n’en proposent que ce qu’on demande', () => {
    expect(creneauxDeVisite(SEMAINE, JEUDI_MATIN, { nombre: 2 })).toHaveLength(2)
  })

  // Sans horaires, le widget proposera d'être rappelé plutôt que d'inventer
  // des moments où personne n'ouvrira.
  it('ne rendent rien quand l’agence n’a pas déclaré ses horaires', () => {
    expect(creneauxDeVisite(null, JEUDI_MATIN)).toEqual([])
    expect(creneauxDeVisite({ ...SEMAINE, semaine: [] }, JEUDI_MATIN)).toEqual([])
  })

  it('tiennent compte des fériés déclarés', () => {
    const avecFerie: Horaires = { ...SEMAINE, fermetures: [{ du: '2026-09-25', au: '2026-09-26' }] }
    const t = creneauxDeVisite(avecFerie, JEUDI_MATIN).map(x => x.texte)
    expect(t.join(' ')).not.toMatch(/Demain|Samedi/)
    expect(t[0]).toMatch(/Lundi/)
  })
})

describe('le créneau renvoyé par le visiteur', () => {
  it('est accepté s’il fait partie de ceux qu’on propose', () => {
    const c = creneauxDeVisite(SEMAINE, JEUDI_MATIN)
    expect(creneauVisiteChoisi(c[0].cle, SEMAINE, JEUDI_MATIN)?.texte).toBe(c[0].texte)
  })

  // Le serveur ne garde que ce qu'il a lui-même calculé.
  it('est refusé s’il est inventé, vide, ou déjà trop proche', () => {
    expect(creneauVisiteChoisi('2030-01-01:minuit', SEMAINE, JEUDI_MATIN)).toBeNull()
    expect(creneauVisiteChoisi('', SEMAINE, JEUDI_MATIN)).toBeNull()
    expect(creneauVisiteChoisi('des_que_possible', SEMAINE, JEUDI_MATIN)).toBeNull()
    // Le créneau d'aujourd'hui n'est jamais proposé : le renvoyer ne le rend
    // pas valable.
    expect(creneauVisiteChoisi('2026-09-24:apres_midi', SEMAINE, JEUDI_MATIN)).toBeNull()
  })
})

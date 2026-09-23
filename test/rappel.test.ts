import { describe, it, expect } from 'vitest'
import { creneauChoisi, creneauxDeRappel } from '../src/rappel'
import type { Horaires } from '../src/horaires'

// On ne propose que des moments où quelqu'un décroche vraiment. C'est toute la
// règle, et ce sont les cas tordus qui la mettent à l'épreuve : le soir, le
// dimanche, un jour férié, les vacances.

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

/** Un instant à l'heure de Zurich. */
const le = (iso: string) => new Date(iso)
const textes = (l: { texte: string }[]) => l.map(c => c.texte)

describe('les créneaux proposés', () => {
  it('commencent toujours par « dès que possible »', () => {
    const c = creneauxDeRappel(SEMAINE, le('2026-09-22T09:00:00+02:00'))
    expect(c[0]).toMatchObject({ cle: 'des_que_possible' })
    expect(c[0].debut).toBeUndefined()
  })

  it('un mardi matin : le reste de la matinée, puis l’après-midi', () => {
    const c = creneauxDeRappel(SEMAINE, le('2026-09-22T09:00:00+02:00'))
    expect(textes(c)[1]).toContain('Aujourd’hui matin')
    expect(textes(c)[1]).toContain('8h–12h')
    expect(textes(c)[2]).toContain('Aujourd’hui après-midi')
    expect(textes(c)[2]).toContain('13h30–18h')
  })

  it('un mardi à 15 h : la matinée est passée, elle n’est plus proposée', () => {
    const c = creneauxDeRappel(SEMAINE, le('2026-09-22T15:00:00+02:00'))
    expect(textes(c).some(t => t.includes('Aujourd’hui matin'))).toBe(false)
    expect(textes(c)[1]).toContain('Aujourd’hui après-midi')
  })

  it('un mardi à 17 h 50 : il ne reste pas assez de temps, on passe à demain', () => {
    const c = creneauxDeRappel(SEMAINE, le('2026-09-22T17:50:00+02:00'))
    expect(textes(c).some(t => t.includes('Aujourd’hui'))).toBe(false)
    expect(textes(c)[1]).toContain('Demain matin')
  })

  it('un dimanche soir : rien le jour même, le lundi d’abord', () => {
    const c = creneauxDeRappel(SEMAINE, le('2026-09-20T20:00:00+02:00'))
    expect(textes(c).some(t => t.includes('Aujourd’hui'))).toBe(false)
    expect(textes(c)[1]).toContain('Demain matin')
    expect(textes(c)[1]).toContain('8h–12h')
  })

  it('un samedi : la seule matinée du jour, puis on saute le dimanche fermé', () => {
    const c = creneauxDeRappel(SEMAINE, le('2026-09-19T08:00:00+02:00'))
    expect(textes(c)[1]).toContain('Aujourd’hui matin')
    expect(textes(c).some(t => t.toLowerCase().includes('dimanche'))).toBe(false)
    expect(textes(c)[2]).toContain('Lundi matin')
  })

  it('n’en propose jamais plus qu’on ne lui en demande', () => {
    expect(creneauxDeRappel(SEMAINE, le('2026-09-22T09:00:00+02:00'), { nombre: 2 })).toHaveLength(3)
  })
})

describe('les jours particuliers', () => {
  it('saute un jour férié fermé', () => {
    // 1er août 2026 est un samedi ; on prend Noël, un vendredi.
    const h: Horaires = { ...SEMAINE, feries: { noel: true } }
    const c = creneauxDeRappel(h, le('2026-12-24T14:00:00+01:00'))
    expect(textes(c).some(t => t.includes('Demain'))).toBe(false)
  })

  it('saute les vacances annoncées', () => {
    const h: Horaires = { ...SEMAINE, fermetures: [{ du: '2026-09-23', au: '2026-09-30', motif: 'Vacances' }] }
    const c = creneauxDeRappel(h, le('2026-09-22T17:50:00+02:00'))
    expect(textes(c).some(t => t.includes('Demain'))).toBe(false)
    // Vacances du 23 au 30 : le prochain créneau est le jeudi 1er octobre.
    expect(textes(c)[1]).toContain('Jeudi matin')
  })

  it('suit une ouverture exceptionnelle', () => {
    const h: Horaires = { ...SEMAINE, exceptions: [{ date: '2026-09-20', plages: [{ debut: '10:00', fin: '16:00' }], motif: 'Marché' }] }
    const c = creneauxDeRappel(h, le('2026-09-20T08:00:00+02:00'))
    expect(textes(c)[1]).toContain('Aujourd’hui matin')
    expect(textes(c)[1]).toContain('10h–12h')
  })
})

describe('sans horaires déclarés', () => {
  it('ne propose que « dès que possible » plutôt que d’inventer', () => {
    expect(creneauxDeRappel(null, le('2026-09-22T09:00:00+02:00'))).toHaveLength(1)
    expect(creneauxDeRappel({ ...SEMAINE, semaine: [] }, le('2026-09-22T09:00:00+02:00'))).toHaveLength(1)
  })
})

describe('le créneau renvoyé par le visiteur', () => {
  it('est accepté s’il fait partie de ceux qu’on propose', () => {
    const instant = le('2026-09-22T09:00:00+02:00')
    const propose = creneauxDeRappel(SEMAINE, instant)[2]
    const relu = creneauChoisi(propose.cle, SEMAINE, instant)
    expect(relu?.texte).toBe(propose.texte)
    expect(relu?.debut).toBe(propose.debut)
  })

  it('est refusé quand il est inventé', () => {
    const instant = le('2026-09-22T09:00:00+02:00')
    expect(creneauChoisi('2026-09-20:matin', SEMAINE, instant)).toBeNull() // un dimanche fermé
    expect(creneauChoisi('demain-soir-vers-22h', SEMAINE, instant)).toBeNull()
    expect(creneauChoisi('', SEMAINE, instant)).toBeNull()
  })

  it('et « dès que possible » passe toujours', () => {
    expect(creneauChoisi('des_que_possible', SEMAINE, le('2026-09-20T23:00:00+02:00'))?.cle).toBe('des_que_possible')
  })
})

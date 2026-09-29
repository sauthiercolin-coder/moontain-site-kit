import { describe, it, expect } from 'vitest'
import {
  bilanListe, bilanLisible, resteAOffrir, titreParDefaut, toutPris,
} from '../src/liste-envies'

const AUJ = '2026-09-29'
const res = (quantite: number, jusquA: string) => ({ quantite, jusquA })

describe('resteAOffrir', () => {
  it('compte ce qui n’est pas pris', () => {
    expect(resteAOffrir({ souhaitee: 6, reservations: [res(2, '2026-10-20')] }, AUJ)).toBe(4)
  })

  it('rend zéro quand tout est pris', () => {
    expect(resteAOffrir({ souhaitee: 1, reservations: [res(1, '2026-10-20')] }, AUJ)).toBe(0)
  })

  // Le défaut classique d'une liste de mariage : quelqu'un clique, n'achète
  // jamais, et l'article reste bloqué jusqu'à la fin des temps.
  it('ignore une réservation périmée', () => {
    expect(resteAOffrir({ souhaitee: 2, reservations: [res(2, '2026-09-01')] }, AUJ)).toBe(2)
  })

  it('garde une réservation qui expire aujourd’hui', () => {
    expect(resteAOffrir({ souhaitee: 2, reservations: [res(1, AUJ)] }, AUJ)).toBe(1)
  })

  it('ne descend jamais sous zéro', () => {
    expect(resteAOffrir({ souhaitee: 1, reservations: [res(5, '2026-10-20')] }, AUJ)).toBe(0)
  })

  it('supporte une liste de réservations vide', () => {
    expect(resteAOffrir({ souhaitee: 3, reservations: [] }, AUJ)).toBe(3)
  })
})

describe('toutPris', () => {
  it('dit vrai seulement quand il ne reste rien', () => {
    expect(toutPris({ souhaitee: 1, reservations: [res(1, '2026-10-20')] }, AUJ)).toBe(true)
    expect(toutPris({ souhaitee: 2, reservations: [res(1, '2026-10-20')] }, AUJ)).toBe(false)
  })
})

describe('bilanListe', () => {
  it('additionne la liste entière', () => {
    const articles = [
      { souhaitee: 6, reservations: [res(2, '2026-10-20')] },
      { souhaitee: 1, reservations: [res(1, '2026-10-20')] },
      { souhaitee: 4, reservations: [] },
    ]
    expect(bilanListe(articles, AUJ)).toEqual({ souhaites: 11, offerts: 3, restants: 8 })
  })

  it('ne compte pas les réservations périmées comme offertes', () => {
    const articles = [{ souhaitee: 2, reservations: [res(2, '2026-01-01')] }]
    expect(bilanListe(articles, AUJ)).toEqual({ souhaites: 2, offerts: 0, restants: 2 })
  })

  it('rend zéro partout sur une liste vide', () => {
    expect(bilanListe([], AUJ)).toEqual({ souhaites: 0, offerts: 0, restants: 0 })
  })
})

describe('bilanLisible', () => {
  it('dit qu’une liste vide est vide', () => {
    expect(bilanLisible({ souhaites: 0, offerts: 0, restants: 0 })).toBe('Cette liste est encore vide.')
  })
  it('ne parle pas d’offerts quand rien ne l’est', () => {
    expect(bilanLisible({ souhaites: 4, offerts: 0, restants: 4 })).toBe('4 articles à offrir.')
  })
  it('donne les deux chiffres dès qu’il y en a', () => {
    expect(bilanLisible({ souhaites: 11, offerts: 3, restants: 8 }))
      .toBe('3 sur 11 déjà offerts — il en reste 8.')
  })
  it('accorde le singulier', () => {
    expect(bilanLisible({ souhaites: 3, offerts: 1, restants: 2 }))
      .toBe('1 sur 3 déjà offert — il en reste 2.')
  })
  it('le dit quand tout est pris', () => {
    expect(bilanLisible({ souhaites: 5, offerts: 5, restants: 0 })).toBe('Tout a été offert.')
  })
  it('sait l’anglais', () => {
    expect(bilanLisible({ souhaites: 11, offerts: 3, restants: 8 }, 'en'))
      .toBe('3 of 11 taken — 8 still available.')
  })
})

describe('titreParDefaut', () => {
  // « Liste de Marie » se lit mieux que « Liste #4821 », et c'est ce que les
  // invités verront en ouvrant le lien.
  it('nomme la liste par la personne et l’occasion', () => {
    expect(titreParDefaut('Marie', 'mariage')).toBe('Liste de mariage de Marie')
    expect(titreParDefaut('Léa', 'naissance')).toBe('Liste de naissance de Léa')
    expect(titreParDefaut('Tom', 'anniversaire')).toBe('Liste d’anniversaire de Tom')
    expect(titreParDefaut('Tom', 'autre')).toBe('Liste de Tom')
  })
  it('retombe sur quelque chose de lisible sans prénom', () => {
    expect(titreParDefaut('', 'mariage')).toBe('Liste de mariage de ma')
  })
  it('sait l’anglais', () => {
    expect(titreParDefaut('Marie', 'mariage', 'en')).toBe('Marie’s wedding list')
  })
})

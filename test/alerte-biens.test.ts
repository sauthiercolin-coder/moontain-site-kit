import { describe, it, expect } from 'vitest'
import { alerteLarge, critereLisible, critereNormalise } from '../src/alerte-biens'
import { filtrerBiens, type Bien } from '../src/biens'

// La phrase qui décrit une alerte n'est pas décorative : quelqu'un s'apprête à
// confier son adresse, et c'est la seule chose qu'il relit avant de le faire.
// Si elle ment, il reçoit pendant des mois des biens qu'il n'a pas demandés.

describe('la phrase des critères', () => {
  it('dit le type, la transaction, les pièces, le lieu et le budget', () => {
    expect(critereLisible({ transaction: 'location', type: 'appartement', lieu: 'Sion', piecesMin: 4.5, prixMax: 2500 }))
      .toBe('Appartement à louer, 4.5 pièces et plus, à Sion, jusqu’à CHF 2 500.–/mois')
  })

  // Sur une vente, « /mois » ferait lire un budget mensuel là où on parle d'un
  // prix d'achat.
  it('ne met « /mois » que pour une location', () => {
    expect(critereLisible({ transaction: 'vente', prixMax: 900000 })).toContain('jusqu’à CHF 900 000.–')
    expect(critereLisible({ transaction: 'vente', prixMax: 900000 })).not.toContain('/mois')
  })

  // Un choix légitime, qui doit se lire comme un choix et non comme un oubli.
  it('dit « tous les biens » quand rien n’est demandé', () => {
    expect(critereLisible({})).toBe('Tous les biens')
    expect(alerteLarge({})).toBe(true)
  })

  it('garde la demi-pièce', () => {
    expect(critereLisible({ piecesMin: 3.5 })).toContain('3.5 pièces et plus')
  })

  it('ignore les critères vides ou nuls', () => {
    expect(critereLisible({ lieu: '   ', piecesMin: 0, prixMax: 0, surfaceMin: 0 })).toBe('Tous les biens')
  })

  it('sait le dire en anglais', () => {
    expect(critereLisible({ transaction: 'vente', type: 'maison', lieu: 'Sierre' }, 'en'))
      .toBe('Maison / villa for sale, in Sierre')
  })
})

describe('la normalisation des critères', () => {
  it('ramène tout à des valeurs propres', () => {
    expect(critereNormalise({ transaction: 'location', type: 'maison', lieu: '  Sion  ', piecesMin: 4.5, prixMax: 2500, surfaceMin: 90 }))
      .toEqual({ transaction: 'location', type: 'maison', lieu: 'Sion', piecesMin: 4.5, prixMax: 2500, surfaceMin: 90 })
  })

  // Ce qui arrive d'un navigateur n'est jamais cru : une transaction inventée
  // vaut « peu importe », pas une erreur.
  it('écarte ce qui n’existe pas', () => {
    const c = critereNormalise({ transaction: 'donation' as never, type: 'chateau' as never, lieu: '' })
    expect(c).toEqual({ transaction: null, type: null, lieu: null, piecesMin: null, prixMax: null, surfaceMin: null })
  })

  it('accepte les nombres écrits à la main', () => {
    const c = critereNormalise({ piecesMin: '4,5' as never, prixMax: '850000' as never, surfaceMin: '95.7' as never })
    expect(c.piecesMin).toBe(4.5)
    expect(c.prixMax).toBe(850000)
    expect(c.surfaceMin).toBe(96)
  })

  it('refuse les nombres négatifs ou absurdes', () => {
    const c = critereNormalise({ piecesMin: -3, prixMax: 0, surfaceMin: Number.NaN })
    expect(c).toMatchObject({ piecesMin: null, prixMax: null, surfaceMin: null })
  })
})

// Le point qui fait tout tenir : l'alerte et la recherche partagent la MÊME
// règle. Ce qu'on annonce est ce que la recherche aurait montré.
describe('l’alerte et la recherche voient la même chose', () => {
  const bien = (o: Partial<Bien> & { slug: string }): Bien => ({
    id: o.slug, titre: 'Bien', transaction: 'vente', type: 'appartement', statut: 'disponible', ...o,
  })
  const catalogue = [
    bien({ slug: 'a', transaction: 'location', type: 'appartement', localite: 'Sion', pieces: 4.5, prix: 2400 }),
    bien({ slug: 'b', transaction: 'location', type: 'appartement', localite: 'Sion', pieces: 2.5, prix: 1500 }),
    bien({ slug: 'c', transaction: 'location', type: 'maison', localite: 'Sion', pieces: 5.5, prix: 3200 }),
    bien({ slug: 'd', transaction: 'vente', type: 'appartement', localite: 'Sion', pieces: 4.5, prix: 800000 }),
  ]
  const criteres = { transaction: 'location' as const, type: 'appartement' as const, lieu: 'Sion', piecesMin: 4.5, prixMax: 2500 }

  it('rend exactement les mêmes biens', () => {
    expect(filtrerBiens(catalogue, critereNormalise(criteres)).map(b => b.slug)).toEqual(['a'])
  })

  it('et la phrase décrit ce filtrage-là', () => {
    expect(critereLisible(criteres)).toBe('Appartement à louer, 4.5 pièces et plus, à Sion, jusqu’à CHF 2 500.–/mois')
  })
})

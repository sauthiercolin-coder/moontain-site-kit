import { describe, it, expect } from 'vitest'
import {
  estParti, filtrerBiens, lieuLisible, lieuxDisponibles, libelleType,
  piecesLisible, prixLisible, trierBiens, type Bien,
} from '../src/biens'

// Ce qu'un visiteur voit quand il cherche. Les cas qui comptent sont ceux où
// une information manque : un prix « sur demande », une surface non saisie.

const bien = (o: Partial<Bien> & { slug: string }): Bien => ({
  id: o.slug, titre: 'Bien', transaction: 'vente', type: 'appartement', statut: 'disponible', ...o,
})

const CATALOGUE: Bien[] = [
  bien({ slug: 'a', titre: 'Appartement 4.5 à Sion', pieces: 4.5, prix: 750000, surfaceHabitable: 110, localite: 'Sion', npa: '1950' }),
  bien({ slug: 'b', titre: 'Maison à Conthey', type: 'maison', pieces: 6.5, prix: 1250000, surfaceHabitable: 180, localite: 'Conthey', npa: '1964' }),
  bien({ slug: 'c', titre: 'Studio en location', transaction: 'location', pieces: 1.5, prix: 950, surfaceHabitable: 35, localite: 'Sion', npa: '1950' }),
  bien({ slug: 'd', titre: 'Chalet d’exception', type: 'maison', pieces: 8, prixSurDemande: true, surfaceHabitable: 260, localite: 'Nendaz' }),
  bien({ slug: 'e', titre: 'Terrain à bâtir', type: 'terrain', surfaceTerrain: 900, prix: 420000, localite: 'Savièse' }),
]
const slugs = (l: Bien[]) => l.map(b => b.slug)

describe('les filtres', () => {
  it('séparent l’achat de la location', () => {
    expect(slugs(filtrerBiens(CATALOGUE, { transaction: 'vente' }))).toEqual(['a', 'b', 'd', 'e'])
    expect(slugs(filtrerBiens(CATALOGUE, { transaction: 'location' }))).toEqual(['c'])
  })

  it('filtrent par type', () => {
    expect(slugs(filtrerBiens(CATALOGUE, { type: 'maison' }))).toEqual(['b', 'd'])
  })

  it('cherchent un lieu par commune, par NPA, sans se soucier des accents', () => {
    expect(slugs(filtrerBiens(CATALOGUE, { lieu: 'sion' }))).toEqual(['a', 'c'])
    expect(slugs(filtrerBiens(CATALOGUE, { lieu: '1964' }))).toEqual(['b'])
    expect(slugs(filtrerBiens(CATALOGUE, { lieu: 'SAVIESE' }))).toEqual(['e'])
  })

  it('comptent les pièces en demi-pièces', () => {
    expect(slugs(filtrerBiens(CATALOGUE, { piecesMin: 4.5 }))).toEqual(['a', 'b', 'd'])
    expect(slugs(filtrerBiens(CATALOGUE, { piecesMin: 5 }))).toEqual(['b', 'd'])
  })

  it('gardent un bien « prix sur demande » malgré un budget', () => {
    // Le chalet n'a pas de prix affiché : l'écarter reviendrait à cacher les
    // biens les plus chers à qui se donne un budget, alors que leur prix est
    // précisément à discuter.
    const r = filtrerBiens(CATALOGUE, { prixMax: 800000 })
    expect(slugs(r)).toContain('d')
    expect(slugs(r)).not.toContain('b')
  })

  it('gardent un bien dont la surface n’a pas été saisie', () => {
    const sansSurface = bien({ slug: 'f', titre: 'Sans surface', pieces: 3 })
    const r = filtrerBiens([...CATALOGUE, sansSurface], { surfaceMin: 100 })
    expect(slugs(r)).toContain('f')
    expect(slugs(r)).not.toContain('c')
  })

  it('se combinent', () => {
    expect(slugs(filtrerBiens(CATALOGUE, { transaction: 'vente', type: 'maison', piecesMin: 7 }))).toEqual(['d'])
  })

  it('sans filtre, rendent tout, dans l’ordre reçu', () => {
    expect(slugs(filtrerBiens(CATALOGUE, {}))).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})

describe('le tri', () => {
  it('par prix croissant, « sur demande » à la fin', () => {
    expect(slugs(trierBiens(CATALOGUE, 'prix-croissant'))).toEqual(['c', 'e', 'a', 'b', 'd'])
  })
  it('par prix décroissant, « sur demande » encore à la fin', () => {
    expect(slugs(trierBiens(CATALOGUE, 'prix-decroissant'))).toEqual(['b', 'a', 'e', 'c', 'd'])
  })
  it('par surface, terrain compris', () => {
    expect(slugs(trierBiens(CATALOGUE, 'surface'))[0]).toBe('e')
  })
  it('ne touche pas à la liste reçue', () => {
    const avant = slugs(CATALOGUE)
    trierBiens(CATALOGUE, 'prix-croissant')
    expect(slugs(CATALOGUE)).toEqual(avant)
  })
})

describe('ce qu’on écrit au visiteur', () => {
  it('le prix, avec des espaces insécables', () => {
    expect(prixLisible({ prix: 750000, transaction: 'vente' })).toBe('CHF 750 000.–')
    expect(prixLisible({ prix: 1850, transaction: 'location' })).toBe('CHF 1 850.–/mois')
  })
  it('« sur demande » quand il n’y a pas de prix', () => {
    expect(prixLisible({ prixSurDemande: true, transaction: 'vente' })).toBe('Prix sur demande')
    expect(prixLisible({ prix: null, transaction: 'vente' })).toBe('Prix sur demande')
    expect(prixLisible({ prix: 0, transaction: 'vente' })).toBe('Prix sur demande')
  })
  it('les pièces, singulier compris', () => {
    expect(piecesLisible(4.5)).toBe('4.5 pièces')
    expect(piecesLisible(1)).toBe('1 pièce')
    expect(piecesLisible(null)).toBeNull()
  })
  it('le lieu, NPA devant', () => {
    expect(lieuLisible({ npa: '1950', localite: 'Sion' })).toBe('1950 Sion')
    expect(lieuLisible({ npa: null, localite: 'Sion' })).toBe('Sion')
    expect(lieuLisible({ npa: null, localite: null })).toBeNull()
  })
  it('le type, en français', () => {
    expect(libelleType('maison')).toBe('Maison / villa')
    expect(libelleType('chateau')).toBe('Bien')
  })
})

describe('un bien parti', () => {
  it('se reconnaît, vendu ou loué', () => {
    expect(estParti({ statut: 'vendu' })).toBe(true)
    expect(estParti({ statut: 'loue' })).toBe(true)
    expect(estParti({ statut: 'reserve' })).toBe(false)
  })
})

describe('les lieux proposés', () => {
  it('ne sont que ceux où il y a vraiment quelque chose', () => {
    expect(lieuxDisponibles(CATALOGUE)).toEqual(['Conthey', 'Nendaz', 'Savièse', 'Sion'])
  })
  it('sans doublon, même écrits différemment', () => {
    expect(lieuxDisponibles([bien({ slug: 'x', localite: 'Sion' }), bien({ slug: 'y', localite: 'SION' })])).toHaveLength(1)
  })
})

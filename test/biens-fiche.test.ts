import { describe, it, expect } from 'vitest'
import {
  REGLE_SUISSE, biensSimilaires, caracteristiques, carteStatique, financement,
  loyerTotal, prixAuM2, rangCecb, senseCecb, versLv95,
} from '../src/biens-fiche'
import type { Bien } from '../src/biens'

// Ce qui se calcule sur la fiche. Un chiffre faux ici n'est pas une coquille :
// c'est quelqu'un qui croit pouvoir acheter, ou un bien qui paraît gratuit.

const bien = (o: Partial<Bien> & { slug: string }): Bien => ({
  id: o.slug, titre: 'Bien', transaction: 'vente', type: 'appartement', statut: 'disponible', ...o,
})

describe('financement', () => {
  // 800 000, 20 % de fonds propres → 640 000 de dette. Les deux tiers de
  // 800 000 valent 533 333 : il reste 106 667 à amortir sur quinze ans.
  const f = financement(bien({ slug: 'a', prix: 800000 }), { taux: 0.02 })!

  it('applique les 20 % de fonds propres', () => {
    expect(f.fondsPropres).toBe(160000)
    expect(f.hypotheque).toBe(640000)
  })

  it('amortit jusqu’aux deux tiers, pas au-delà', () => {
    // (640 000 − 533 333) / 15 / 12 ≈ 593
    expect(f.amortissementMensuel).toBe(593)
  })

  it('ne demande aucun amortissement quand la dette est déjà sous les deux tiers', () => {
    const g = financement(bien({ slug: 'b', prix: 800000 }), { partFondsPropres: 0.4 })!
    expect(g.amortissementMensuel).toBe(0)
  })

  // La fiche montre le détail à côté du total : le total doit tomber sur
  // l'addition qu'on a sous les yeux, au franc près.
  it('affiche un total qui est exactement la somme des lignes affichées', () => {
    // 640 000 × 2 % / 12 = 1067 ; entretien 8000 / 12 = 667
    expect(f.interetsMensuels).toBe(1067)
    expect(f.entretienMensuel).toBe(667)
    expect(f.mensualite).toBe(f.interetsMensuels + f.amortissementMensuel + f.entretienMensuel)
    expect(f.mensualite).toBe(2327)
  })

  it('tient cette addition pour n’importe quel prix', () => {
    for (const prix of [350000, 612345, 1234567, 4200000]) {
      for (const taux of [0.005, 0.0175, 0.032]) {
        const g = financement(bien({ slug: 'x', prix }), { taux })!
        expect(g.mensualite).toBe(g.interetsMensuels + g.amortissementMensuel + g.entretienMensuel)
      }
    }
  })

  it('éprouve la tenue des charges au taux théorique, pas au taux payé', () => {
    // 640 000 × 5 % = 32 000, plus 7111 d'amortissement, plus 8000 d'entretien
    expect(f.chargesTheoriquesAnnuelles).toBe(47111)
    expect(f.revenuConseille).toBe(Math.round(47111 * 3))
    expect(REGLE_SUISSE.tauxTheorique).toBe(0.05)
  })

  it('dit ce qu’il faut avoir de côté, frais d’acte compris', () => {
    expect(f.fraisAcquisition).toBe(24000)
    expect(f.aPrevoir).toBe(184000)
  })

  it('refuse de descendre sous les 20 % même si on le lui demande', () => {
    const g = financement(bien({ slug: 'c', prix: 500000 }), { partFondsPropres: 0.05 })!
    expect(g.fondsPropres).toBe(100000)
  })

  // Un plan de financement bâti sur un prix qu'on n'a pas serait une invention.
  it('ne calcule rien sans prix, ni pour un prix sur demande, ni pour une location', () => {
    expect(financement(bien({ slug: 'd', prix: null }))).toBeNull()
    expect(financement(bien({ slug: 'e', prix: 900000, prixSurDemande: true }))).toBeNull()
    expect(financement(bien({ slug: 'f', prix: 2400, transaction: 'location' }))).toBeNull()
  })
})

describe('loyer', () => {
  it('additionne le loyer et les charges', () => {
    const l = loyerTotal({ transaction: 'location', prix: 2450, charges: 280 })!
    expect(l).toEqual({ loyer: 2450, charges: 280, total: 2730 })
  })
  it('accepte une location sans charges annoncées', () => {
    expect(loyerTotal({ transaction: 'location', prix: 2450 })!.total).toBe(2450)
  })
  it('ne dit rien d’une vente', () => {
    expect(loyerTotal({ transaction: 'vente', prix: 800000 })).toBeNull()
  })
})

describe('prix au m²', () => {
  it('rapporte le prix à la surface habitable', () => {
    expect(prixAuM2(bien({ slug: 'a', prix: 800000, surfaceHabitable: 160 }))).toBe(5000)
  })
  it('rapporte un terrain à sa surface de terrain', () => {
    expect(prixAuM2(bien({ slug: 'b', type: 'terrain', prix: 480000, surfaceTerrain: 1200 }))).toBe(400)
  })
  // Un loyer au m² ne se compare à rien dans l'esprit de qui cherche.
  it('ne dit rien d’une location ni d’un prix sur demande', () => {
    expect(prixAuM2(bien({ slug: 'c', transaction: 'location', prix: 2400, surfaceHabitable: 100 }))).toBeNull()
    expect(prixAuM2(bien({ slug: 'd', prix: 800000, prixSurDemande: true, surfaceHabitable: 160 }))).toBeNull()
  })
  it('ne divise pas par une surface absente', () => {
    expect(prixAuM2(bien({ slug: 'e', prix: 800000 }))).toBeNull()
    expect(prixAuM2(bien({ slug: 'f', prix: 800000, surfaceHabitable: 0 }))).toBeNull()
  })
})

describe('biens similaires', () => {
  const catalogue = [
    bien({ slug: 'lui-meme', prix: 800000, localite: 'Sion', pieces: 4.5 }),
    bien({ slug: 'meme-commune', prix: 820000, localite: 'Sion', pieces: 4.5 }),
    bien({ slug: 'autre-commune', prix: 810000, localite: 'Sierre', pieces: 4.5 }),
    bien({ slug: 'autre-budget', prix: 2400000, localite: 'Sion', pieces: 4.5 }),
    bien({ slug: 'a-louer', prix: 2400, transaction: 'location', localite: 'Sion', pieces: 4.5 }),
    bien({ slug: 'maison', type: 'maison', prix: 830000, localite: 'Sion', pieces: 5.5 }),
  ]
  const reference = catalogue[0]

  it('ne se propose pas lui-même', () => {
    expect(biensSimilaires(catalogue, reference).map(b => b.slug)).not.toContain('lui-meme')
  })

  // Proposer une location à qui regarde un achat n'aide personne.
  it('ne mélange jamais l’achat et la location', () => {
    expect(biensSimilaires(catalogue, reference, 5).map(b => b.slug)).not.toContain('a-louer')
  })

  it('met devant la même commune, le même type et le même budget', () => {
    expect(biensSimilaires(catalogue, reference)[0].slug).toBe('meme-commune')
  })

  it('préfère un budget proche à un budget éloigné', () => {
    const rangs = biensSimilaires(catalogue, reference, 5).map(b => b.slug)
    expect(rangs.indexOf('autre-commune')).toBeLessThan(rangs.indexOf('autre-budget'))
  })

  it('en rend au plus ce qu’on lui demande', () => {
    expect(biensSimilaires(catalogue, reference, 2)).toHaveLength(2)
    expect(biensSimilaires(catalogue, reference, 0)).toHaveLength(0)
  })

  it('reste calme sur un catalogue d’un seul bien', () => {
    expect(biensSimilaires([reference], reference)).toEqual([])
  })
})

describe('certificat énergétique', () => {
  it('place les notes de A à G', () => {
    expect(rangCecb('A')).toBe(0)
    expect(rangCecb('g')).toBe(6)
  })
  // Un D par défaut serait un chiffre faux sur un document qui engage.
  it('n’invente pas de note', () => {
    expect(rangCecb(null)).toBeNull()
    expect(rangCecb('H')).toBeNull()
    expect(senseCecb(undefined)).toBeNull()
  })
  it('traduit la note en une phrase', () => {
    expect(senseCecb('A')).toBe('Très performant')
    expect(senseCecb('G')).toBe('Peu performant')
  })
})

describe('caractéristiques', () => {
  it('n’affiche que ce qui est renseigné', () => {
    const c = caracteristiques({ anneeConstruction: 2008, chauffage: '  ', etage: null })
    expect(c.map(x => x.cle)).toEqual(['Construction'])
  })
  it('réunit les places de parc en une ligne', () => {
    const c = caracteristiques({ placesParc: 2, placesExterieures: 1 })
    expect(c[0]).toEqual({ cle: 'Places de parc', valeur: '2 en garage, 1 à l’extérieur' })
  })
  it('garde l’étage zéro, qui est un rez', () => {
    expect(caracteristiques({ etage: 0 }).map(x => x.valeur)).toEqual(['0'])
  })
})

describe('carte', () => {
  const c = carteStatique(46.2169, 7.3428, { zoom: 13, largeur: 768, hauteur: 320 })!

  it('couvre tout le cadre avec ses tuiles', () => {
    expect(c.tuiles.length).toBeGreaterThanOrEqual(8)
    const droite = Math.max(...c.tuiles.map(t => t.x + 256))
    const bas = Math.max(...c.tuiles.map(t => t.y + 256))
    expect(droite).toBeGreaterThanOrEqual(768)
    expect(bas).toBeGreaterThanOrEqual(320)
    expect(Math.min(...c.tuiles.map(t => t.x))).toBeLessThanOrEqual(0)
    expect(Math.min(...c.tuiles.map(t => t.y))).toBeLessThanOrEqual(0)
  })

  it('pose le repère au centre', () => {
    expect(c.pointX).toBe(384)
    expect(c.pointY).toBe(160)
  })

  it('demande des tuiles swisstopo', () => {
    expect(c.tuiles[0].url).toMatch(/^https:\/\/wmts\.geo\.admin\.ch\/1\.0\.0\/ch\.swisstopo\.pixelkarte-farbe\/default\/current\/3857\/13\/\d+\/\d+\.jpeg$/)
  })

  it('ne rend rien d’un point absent ou aberrant', () => {
    expect(carteStatique(NaN, 7.3)).toBeNull()
    expect(carteStatique(46.2, 200)).toBeNull()
  })

  // Sion vaut 2 593 800 / 1 120 200 en LV95 (valeurs swisstopo, à quelques
  // dizaines de mètres près selon le point retenu pour la commune).
  it('convertit en coordonnées suisses pour le lien fédéral', () => {
    const { e, n } = versLv95(46.2169, 7.3428)
    expect(Math.abs(e - 593800 - 2000000)).toBeLessThan(2000)
    expect(Math.abs(n - 120200 - 1000000)).toBeLessThan(2000)
    expect(c.lien).toContain('map.geo.admin.ch')
  })
})

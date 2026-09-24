// La recherche de biens immobiliers : filtrer, trier, dire les choses.
//
// Pur : aucune base, aucun React. Le site s'en sert pour filtrer la liste
// qu'il a reçue, le CMS pour afficher les mêmes libellés, et les tests pour
// vérifier les cas qui comptent — un bien « prix sur demande » qui ne doit pas
// disparaître d'un filtre par prix, une demi-pièce qui doit rester une
// demi-pièce.

export type TransactionBien = 'vente' | 'location'
export type TypeBien = 'appartement' | 'maison' | 'terrain' | 'commercial' | 'parking' | 'immeuble' | 'autre'
export type StatutBien = 'brouillon' | 'disponible' | 'reserve' | 'vendu' | 'loue'

export interface Bien {
  id: string
  slug: string
  reference?: string | null
  titre: string
  transaction: TransactionBien
  type: TypeBien
  statut: StatutBien
  prix?: number | null
  prixSurDemande?: boolean
  pieces?: number | null
  chambres?: number | null
  surfaceHabitable?: number | null
  surfaceTerrain?: number | null
  npa?: string | null
  localite?: string | null
  canton?: string | null
  photos?: string[]
}

export const TYPES_BIEN: { valeur: TypeBien; label: string }[] = [
  { valeur: 'appartement', label: 'Appartement' },
  { valeur: 'maison', label: 'Maison / villa' },
  { valeur: 'terrain', label: 'Terrain' },
  { valeur: 'commercial', label: 'Local commercial' },
  { valeur: 'immeuble', label: 'Immeuble' },
  { valeur: 'parking', label: 'Place de parc' },
  { valeur: 'autre', label: 'Autre' },
]

export const STATUTS_BIEN: { valeur: StatutBien; label: string }[] = [
  { valeur: 'brouillon', label: 'Brouillon' },
  { valeur: 'disponible', label: 'Disponible' },
  { valeur: 'reserve', label: 'Réservé' },
  { valeur: 'vendu', label: 'Vendu' },
  { valeur: 'loue', label: 'Loué' },
]

export const libelleType = (t: string | null | undefined): string =>
  TYPES_BIEN.find(x => x.valeur === t)?.label ?? 'Bien'

export const libelleStatut = (s: string | null | undefined): string | null =>
  STATUTS_BIEN.find(x => x.valeur === s)?.label ?? null

/** Ce qui ne se visite plus : la fiche le dit en toutes lettres. */
export const estParti = (b: Pick<Bien, 'statut'>): boolean => b.statut === 'vendu' || b.statut === 'loue'

export interface FiltresBiens {
  transaction?: TransactionBien | null
  type?: TypeBien | null
  /** Une commune, un NPA, ou un bout de l'un des deux. */
  lieu?: string | null
  piecesMin?: number | null
  prixMax?: number | null
  surfaceMin?: number | null
}

const sansAccent = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Le prix affiché : « CHF 750 000.– », « 1 850.–/mois », ou « Sur demande ».
 *  Les espaces sont insécables : un prix coupé en fin de ligne se lit mal. */
export function prixLisible(b: Pick<Bien, 'prix' | 'prixSurDemande' | 'transaction'>, lang: 'fr' | 'en' = 'fr'): string {
  if (b.prixSurDemande || b.prix == null || !(b.prix > 0)) {
    return lang === 'fr' ? 'Prix sur demande' : 'Price on request'
  }
  const n = Math.round(b.prix)
  const groupe = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const mois = b.transaction === 'location' ? (lang === 'fr' ? '/mois' : '/month') : ''
  return `CHF ${groupe}.–${mois}`
}

/** « 4.5 pièces », « 1 pièce ». La demi-pièce se garde telle quelle : arrondir
 *  un 4.5 en 4 ou 5 change le bien qu'on décrit. */
export function piecesLisible(p: number | null | undefined, lang: 'fr' | 'en' = 'fr'): string | null {
  if (p == null || !(p > 0)) return null
  const n = Number.isInteger(p) ? String(p) : String(p).replace(/\.0$/, '')
  if (lang === 'en') return `${n} ${p > 1 ? 'rooms' : 'room'}`
  return `${n} ${p > 1 ? 'pièces' : 'pièce'}`
}

/** La ligne de situation : « 1950 Sion », « Sion », ou rien. */
export function lieuLisible(b: Pick<Bien, 'npa' | 'localite'>): string | null {
  const l = [b.npa?.trim(), b.localite?.trim()].filter(Boolean).join(' ')
  return l || null
}

/** Les biens qui passent les filtres, dans l'ordre reçu.
 *
 *  Deux règles qui ne vont pas de soi :
 *  - un bien « prix sur demande » reste visible même quand on filtre par prix.
 *    L'écarter reviendrait à cacher les biens les plus chers à qui se donne un
 *    budget, alors que son prix est précisément à discuter ;
 *  - un bien sans surface renseignée n'est pas écarté par un filtre de surface.
 *    L'information manque à l'agence, pas au bien. */
export function filtrerBiens(biens: Bien[], f: FiltresBiens): Bien[] {
  const lieu = f.lieu ? sansAccent(f.lieu) : null
  return biens.filter(b => {
    if (f.transaction && b.transaction !== f.transaction) return false
    if (f.type && b.type !== f.type) return false
    if (lieu) {
      const cible = sansAccent([b.localite ?? '', b.npa ?? '', b.canton ?? ''].join(' '))
      if (!cible.includes(lieu)) return false
    }
    if (f.piecesMin != null && f.piecesMin > 0) {
      if (b.pieces == null || b.pieces < f.piecesMin) return false
    }
    if (f.prixMax != null && f.prixMax > 0) {
      const aUnPrix = !b.prixSurDemande && b.prix != null && b.prix > 0
      if (aUnPrix && (b.prix as number) > f.prixMax) return false
    }
    if (f.surfaceMin != null && f.surfaceMin > 0) {
      const s = b.surfaceHabitable ?? b.surfaceTerrain ?? null
      if (s != null && s < f.surfaceMin) return false
    }
    return true
  })
}

export type TriBiens = 'recent' | 'prix-croissant' | 'prix-decroissant' | 'surface'

/** Trie une copie : la liste reçue ne bouge pas. Un bien sans prix va toujours
 *  à la fin, quel que soit le sens — « sur demande » n'est ni cher ni bon
 *  marché. */
export function trierBiens(biens: Bien[], tri: TriBiens): Bien[] {
  const copie = [...biens]
  const prix = (b: Bien) => (b.prixSurDemande || b.prix == null || !(b.prix > 0) ? null : b.prix)
  switch (tri) {
    case 'prix-croissant':
      return copie.sort((a, b) => {
        const pa = prix(a), pb = prix(b)
        if (pa == null && pb == null) return 0
        if (pa == null) return 1
        if (pb == null) return -1
        return pa - pb
      })
    case 'prix-decroissant':
      return copie.sort((a, b) => {
        const pa = prix(a), pb = prix(b)
        if (pa == null && pb == null) return 0
        if (pa == null) return 1
        if (pb == null) return -1
        return pb - pa
      })
    case 'surface':
      return copie.sort((a, b) => (b.surfaceHabitable ?? b.surfaceTerrain ?? 0) - (a.surfaceHabitable ?? a.surfaceTerrain ?? 0))
    default:
      return copie
  }
}

/** Les communes présentes dans une liste, pour ne proposer que des lieux où il
 *  y a vraiment quelque chose à voir. */
export function lieuxDisponibles(biens: Bien[]): string[] {
  const vus = new Map<string, string>()
  for (const b of biens) {
    const l = b.localite?.trim()
    if (l) vus.set(sansAccent(l), l)
  }
  return [...vus.values()].sort((a, b) => a.localeCompare(b, 'fr'))
}

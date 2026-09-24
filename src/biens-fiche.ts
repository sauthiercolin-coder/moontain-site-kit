import type { Bien } from './biens'

// Ce qui se calcule sur la fiche d'un bien : le financement, les biens
// voisins, le prix au mètre carré, l'échelle du certificat énergétique.
//
// Pur : aucune base, aucun React. C'est ici que vivent les règles suisses —
// elles sont les mêmes pour toutes les agences, et elles doivent pouvoir être
// lues et contestées à un seul endroit.

// ── Les règles du financement suisse ────────────────────────────────────────
// Ce ne sont pas des choix de Moontain : ce sont les usages des banques
// suisses, et ils sont rassemblés ici pour qu'on puisse les corriger le jour
// où ils bougent, sans les chercher dans un composant.
export const REGLE_SUISSE = {
  /** Fonds propres minimaux exigés à l'achat d'un logement. */
  fondsPropresMin: 0.2,
  /** La dette doit redescendre aux deux tiers de la valeur… */
  cibleAmortissement: 2 / 3,
  /** …en quinze ans, ou avant la retraite. */
  anneesAmortissement: 15,
  /** Le taux THÉORIQUE avec lequel les banques éprouvent la tenue des charges.
   *  Il n'a rien à voir avec le taux qu'on paie : il sert à vérifier qu'on
   *  tiendrait si les taux remontaient. */
  tauxTheorique: 0.05,
  /** Entretien et frais accessoires, par an, en part de la valeur. */
  entretien: 0.01,
  /** Les charges théoriques ne doivent pas dépasser le tiers du revenu brut. */
  partDuRevenu: 1 / 3,
  /** Notaire, registre foncier et droits de mutation. Ordre de grandeur : le
   *  taux varie d'un canton à l'autre, et l'acte se partage parfois. */
  fraisAcquisition: 0.03,
} as const

export interface OptionsFinancement {
  /** Part de fonds propres, de 0.2 à 1. En dessous de 0.2, aucune banque ne suit. */
  partFondsPropres?: number
  /** Le taux hypothécaire qu'on paie vraiment, pour la mensualité affichée. */
  taux?: number
}

export interface Financement {
  prix: number
  fondsPropres: number
  hypotheque: number
  fraisAcquisition: number
  /** Ce qu'il faut avoir de côté le jour de l'acte. */
  aPrevoir: number
  interetsMensuels: number
  amortissementMensuel: number
  entretienMensuel: number
  /** Ce qui part chaque mois, au taux choisi. */
  mensualite: number
  /** Ce que la banque compte, au taux théorique de 5 %. */
  chargesTheoriquesAnnuelles: number
  /** Le revenu brut annuel à partir duquel la banque suit. */
  revenuConseille: number
}

/** Le plan de financement d'un bien à vendre. null pour une location, un prix
 *  sur demande ou un prix absent : mieux vaut ne rien afficher qu'un calcul
 *  bâti sur un chiffre qu'on n'a pas.
 *
 *  Tout est arrondi au franc : afficher des centimes sur une estimation
 *  laisserait croire à une offre. */
export function financement(
  b: Pick<Bien, 'prix' | 'prixSurDemande' | 'transaction'>,
  o: OptionsFinancement = {},
): Financement | null {
  if (b.transaction === 'location') return null
  if (b.prixSurDemande || b.prix == null || !(b.prix > 0)) return null

  const prix = b.prix
  const part = Math.min(1, Math.max(REGLE_SUISSE.fondsPropresMin, o.partFondsPropres ?? REGLE_SUISSE.fondsPropresMin))
  const taux = Math.min(0.1, Math.max(0, o.taux ?? 0.02))

  const fondsPropres = prix * part
  const hypotheque = prix - fondsPropres
  // L'amortissement ne court que sur la part au-dessus des deux tiers : une
  // fois la dette descendue là, plus rien n'est exigé.
  const aAmortir = Math.max(0, hypotheque - prix * REGLE_SUISSE.cibleAmortissement)
  const amortissementAnnuel = aAmortir / REGLE_SUISSE.anneesAmortissement
  const entretienAnnuel = prix * REGLE_SUISSE.entretien

  const chargesTheoriques = hypotheque * REGLE_SUISSE.tauxTheorique + amortissementAnnuel + entretienAnnuel
  const r = Math.round

  // La mensualité est la somme des trois lignes ARRONDIES, pas l'arrondi de la
  // somme exacte : la fiche affiche le détail à côté du total, et un total qui
  // ne tombe pas sur l'addition qu'on a sous les yeux décrédibilise tout le
  // calcul — pour un franc.
  const interets = r((hypotheque * taux) / 12)
  const amortissement = r(amortissementAnnuel / 12)
  const entretien = r(entretienAnnuel / 12)

  return {
    prix: r(prix),
    fondsPropres: r(fondsPropres),
    hypotheque: r(hypotheque),
    fraisAcquisition: r(prix * REGLE_SUISSE.fraisAcquisition),
    aPrevoir: r(fondsPropres + prix * REGLE_SUISSE.fraisAcquisition),
    interetsMensuels: interets,
    amortissementMensuel: amortissement,
    entretienMensuel: entretien,
    mensualite: interets + amortissement + entretien,
    chargesTheoriquesAnnuelles: r(chargesTheoriques),
    revenuConseille: r(chargesTheoriques / REGLE_SUISSE.partDuRevenu),
  }
}

/** Le total mensuel d'une location : loyer plus charges. null si le loyer
 *  n'est pas public. */
export function loyerTotal(
  b: Pick<Bien, 'prix' | 'prixSurDemande' | 'transaction'> & { charges?: number | null },
): { loyer: number; charges: number; total: number } | null {
  if (b.transaction !== 'location') return null
  if (b.prixSurDemande || b.prix == null || !(b.prix > 0)) return null
  const charges = b.charges != null && b.charges > 0 ? Math.round(b.charges) : 0
  return { loyer: Math.round(b.prix), charges, total: Math.round(b.prix) + charges }
}

// ── Le prix au mètre carré ──────────────────────────────────────────────────

/** Le prix au m², pour une vente seulement : un loyer au m² ne se compare à
 *  rien dans l'esprit de qui cherche. Un terrain se rapporte à sa surface de
 *  terrain, tout le reste à sa surface habitable. */
export function prixAuM2(
  b: Pick<Bien, 'prix' | 'prixSurDemande' | 'transaction' | 'type' | 'surfaceHabitable' | 'surfaceTerrain'>,
): number | null {
  if (b.transaction !== 'vente') return null
  if (b.prixSurDemande || b.prix == null || !(b.prix > 0)) return null
  const surface = b.type === 'terrain' ? b.surfaceTerrain : b.surfaceHabitable
  if (surface == null || !(surface > 0)) return null
  return Math.round(b.prix / surface)
}

// ── Les biens voisins ───────────────────────────────────────────────────────

/** Trois biens proches, pour continuer la visite. C'est le seul endroit utile
 *  d'une fiche vendue : quelqu'un arrive par un lien partagé, le bien est
 *  parti, et il faut lui montrer ce qui existe encore.
 *
 *  Le tri n'invente rien : même transaction d'abord (on ne propose pas une
 *  location à qui regarde un achat), puis ce qui rapproche vraiment deux biens
 *  — la commune, le type, le budget. */
export function biensSimilaires(
  catalogue: Bien[],
  bien: Pick<Bien, 'id' | 'slug' | 'transaction' | 'type' | 'localite' | 'canton' | 'prix' | 'pieces'>,
  nombre = 3,
): Bien[] {
  const prix = bien.prix != null && bien.prix > 0 ? bien.prix : null
  const commune = bien.localite?.trim().toLowerCase() ?? null

  const notes = catalogue
    .filter(b => b.slug !== bien.slug && b.id !== bien.id)
    .filter(b => b.transaction === bien.transaction)
    .map(b => {
      let note = 0
      if (b.type === bien.type) note += 3
      if (commune && b.localite?.trim().toLowerCase() === commune) note += 2
      else if (bien.canton && b.canton === bien.canton) note += 1
      const p = b.prixSurDemande || b.prix == null || !(b.prix > 0) ? null : b.prix
      // « À moins d'un quart » : au-delà, ce n'est plus le même budget.
      const ecart = prix != null && p != null ? Math.abs(p - prix) / prix : null
      if (ecart != null && ecart <= 0.25) note += 2
      if (bien.pieces != null && b.pieces != null && Math.abs(b.pieces - bien.pieces) <= 1) note += 1
      return { b, note, ecart: ecart ?? 9 }
    })
    .sort((x, y) => (y.note - x.note) || (x.ecart - y.ecart))

  return notes.slice(0, Math.max(0, nombre)).map(x => x.b)
}

// ── Le certificat énergétique ───────────────────────────────────────────────

export const NOTES_CECB = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const
export type NoteCecb = (typeof NOTES_CECB)[number]

/** La position d'une note sur l'échelle, de 0 (A) à 6 (G). null si la note
 *  n'existe pas : on n'invente pas un D par défaut, ce serait un chiffre faux
 *  sur un document qui engage. */
export function rangCecb(note: string | null | undefined): number | null {
  const i = NOTES_CECB.indexOf((note ?? '').trim().toUpperCase() as NoteCecb)
  return i < 0 ? null : i
}

/** Ce que dit une note, en une phrase, pour qui n'a jamais vu de CECB. */
export function senseCecb(note: string | null | undefined, lang: 'fr' | 'en' = 'fr'): string | null {
  const r = rangCecb(note)
  if (r == null) return null
  const fr = ['Très performant', 'Performant', 'Bon', 'Moyen', 'Moyen', 'Peu performant', 'Peu performant']
  const en = ['Very efficient', 'Efficient', 'Good', 'Average', 'Average', 'Inefficient', 'Inefficient']
  return (lang === 'fr' ? fr : en)[r] ?? null
}

// ── Les caractéristiques, telles qu'elles s'affichent ───────────────────────

export interface CaracteristiqueBien {
  cle: string
  valeur: string
}

export interface DonneesCaracteristiques {
  anneeConstruction?: number | null
  anneeRenovation?: number | null
  chauffage?: string | null
  placesParc?: number | null
  placesExterieures?: number | null
  etage?: number | null
  charges?: number | null
  disponibilite?: string | null
}

/** Les caractéristiques renseignées, dans l'ordre où on les lit. Une ligne
 *  absente ne s'affiche pas : « Chauffage : — » n'apprend rien et allonge. */
export function caracteristiques(d: DonneesCaracteristiques, lang: 'fr' | 'en' = 'fr'): CaracteristiqueBien[] {
  const fr = lang === 'fr'
  const out: CaracteristiqueBien[] = []
  const pousse = (cle: string, valeur: string | null) => { if (valeur) out.push({ cle, valeur }) }

  pousse(fr ? 'Construction' : 'Built', d.anneeConstruction ? String(d.anneeConstruction) : null)
  pousse(fr ? 'Rénovation' : 'Renovated', d.anneeRenovation ? String(d.anneeRenovation) : null)
  pousse(fr ? 'Chauffage' : 'Heating', d.chauffage?.trim() || null)
  pousse(fr ? 'Étage' : 'Floor', d.etage != null ? String(d.etage) : null)
  const parc = [
    d.placesParc ? `${d.placesParc} ${fr ? 'en garage' : 'in garage'}` : null,
    d.placesExterieures ? `${d.placesExterieures} ${fr ? 'à l’extérieur' : 'outdoor'}` : null,
  ].filter(Boolean).join(fr ? ', ' : ', ')
  pousse(fr ? 'Places de parc' : 'Parking', parc || null)
  pousse(fr ? 'Charges' : 'Service charges', d.charges != null && d.charges > 0 ? `CHF ${Math.round(d.charges)}.–${fr ? '/mois' : '/month'}` : null)
  pousse(fr ? 'Disponible' : 'Available', d.disponibilite?.trim() || null)
  return out
}

// ── La carte, sans dépendance ───────────────────────────────────────────────
// Un fond swisstopo, servi en tuiles, posé en CSS. Pas de bibliothèque de
// cartographie : la fiche n'a pas besoin qu'on zoome, elle a besoin de dire
// « c'est ce coin-là ». Et une carte qui se charge en deux images ne ralentit
// pas la page.
//
// Le point est celui de la COMMUNE, jamais de l'adresse (décision de Colin,
// 24.09.2026) : avant une visite, une agence ne publie pas la porte.

export interface TuileCarte {
  url: string
  /** Décalage en pixels de la tuile dans le cadre. */
  x: number
  y: number
}

export interface CarteStatique {
  tuiles: TuileCarte[]
  largeur: number
  hauteur: number
  /** Où planter le repère dans le cadre. */
  pointX: number
  pointY: number
  /** Le lien vers la carte fédérale, pour qui veut vraiment explorer. */
  lien: string
}

const TAILLE_TUILE = 256
const FOND = 'https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg'

/** Les tuiles à afficher autour d'un point, et la place du repère.
 *
 *  Projection Web Mercator, la même que tous les fonds de plan : la formule
 *  est standard, elle n'a rien de swisstopo. */
export function carteStatique(
  lat: number,
  lon: number,
  { zoom = 13, largeur = 768, hauteur = 320 }: { zoom?: number; largeur?: number; hauteur?: number } = {},
): CarteStatique | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat < -85 || lat > 85 || lon < -180 || lon > 180) return null

  const n = 2 ** zoom
  const xMonde = ((lon + 180) / 360) * n * TAILLE_TUILE
  const latRad = (lat * Math.PI) / 180
  const yMonde = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * TAILLE_TUILE

  // Le coin haut-gauche du cadre, en pixels du monde, pour que le point soit
  // au centre.
  const gauche = xMonde - largeur / 2
  const haut = yMonde - hauteur / 2
  const tuileX0 = Math.floor(gauche / TAILLE_TUILE)
  const tuileY0 = Math.floor(haut / TAILLE_TUILE)

  const tuiles: TuileCarte[] = []
  for (let ty = tuileY0; ty * TAILLE_TUILE < haut + hauteur; ty++) {
    for (let tx = tuileX0; tx * TAILLE_TUILE < gauche + largeur; tx++) {
      if (ty < 0 || ty >= n || tx < 0 || tx >= n) continue
      tuiles.push({
        url: FOND.replace('{z}', String(zoom)).replace('{x}', String(tx)).replace('{y}', String(ty)),
        x: Math.round(tx * TAILLE_TUILE - gauche),
        y: Math.round(ty * TAILLE_TUILE - haut),
      })
    }
  }

  const { e, n: nord } = versLv95(lat, lon)
  return {
    tuiles,
    largeur,
    hauteur,
    pointX: Math.round(largeur / 2),
    pointY: Math.round(hauteur / 2),
    lien: `https://map.geo.admin.ch/#/map?center=${e},${nord}&z=8`,
  }
}

/** WGS84 vers les coordonnées suisses LV95, par les formules approchées de
 *  swisstopo (précision de l'ordre du mètre — largement assez pour centrer une
 *  carte sur une commune). Sert au lien vers la carte fédérale, qui ne parle
 *  qu'en LV95. */
export function versLv95(lat: number, lon: number): { e: number; n: number } {
  const p = (lat * 3600 - 169028.66) / 10000
  const l = (lon * 3600 - 26782.5) / 10000
  const e = 2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l ** 3
  const n = 1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p ** 3
  return { e: Math.round(e), n: Math.round(n) }
}

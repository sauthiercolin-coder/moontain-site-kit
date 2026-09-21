// Jours fériés suisses, par canton.
//
// Relevé le 21.09.2026 sur les textes cantonaux (ordonnances et lois sur le
// travail ou les jours de repos), la liste du SECO « jours fériés assimilés
// au dimanche » (état 12.12.2024) et la liste de l'Office fédéral de la
// justice, contrôlés l'un par l'autre. Là où ils divergent, la loi cantonale
// l'emporte : la liste de l'OFJ sert au calcul des délais judiciaires, pas au
// droit du travail, et plusieurs cantons s'en écartent.
//
// Deux choses ne sont PAS ici, volontairement :
//  - les jours seulement « chômés » par usage (le lundi de Pâques en Valais,
//    le 2 janvier à Zurich) : fermer ou non ces jours-là est un choix de
//    l'établissement, qu'il coche lui-même ;
//  - les fêtes communales (patronales, Sechseläuten…) : trop locales pour une
//    liste, elles se saisissent comme fermetures exceptionnelles.
//
// `cantons` : férié sur tout le territoire du canton. `partiel` : dans une
// partie des communes seulement — proposé, jamais présumé.

export interface FerieDef {
  cle: string
  libelle: string
  regle:
    | { type: 'fixe'; mois: number; jour: number }
    | { type: 'paques'; decalage: number }
    | { type: 'special'; calcul: (annee: number) => string | null }
  cantons: readonly string[]
  partiel?: readonly string[]
  /** Férié dans les vingt-six cantons : vaut même sans canton choisi. */
  partout?: boolean
  /** Ce qu'il faut savoir avant de cocher, affiché dans l'éditeur. */
  note?: string
}

// ── Dates ───────────────────────────────────────────────────────────────────

const deux = (n: number) => String(n).padStart(2, '0')

/** Décale une date « YYYY-MM-DD » de n jours calendaires. Calcul en UTC à
 *  midi : aucun changement d'heure ne peut faire sauter ou doubler un jour. */
export function ajouterJours(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n, 12)).toISOString().slice(0, 10)
}

/** 0 = dimanche, comme `Date.getDay()` et `extract(dow)` en SQL. */
export const jourDeSemaine = (ymd: string) => new Date(`${ymd}T12:00:00Z`).getUTCDay()

/** Dimanche de Pâques (calendrier grégorien, algorithme de Meeus/Jones/Butcher). */
export function paques(annee: number): string {
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1
  return `${annee}-${deux(mois)}-${deux(jour)}`
}

/** Le n-ième jour de semaine `jour` d'un mois (n = 1 pour le premier). */
function nieme(annee: number, mois: number, jour: number, n: number): string {
  const premier = `${annee}-${deux(mois)}-01`
  const ecart = (jour - jourDeSemaine(premier) + 7) % 7
  return ajouterJours(premier, ecart + (n - 1) * 7)
}

// ── Les jours ───────────────────────────────────────────────────────────────

const TOUS = ['AG', 'AI', 'AR', 'BE', 'BL', 'BS', 'FR', 'GE', 'GL', 'GR', 'JU', 'LU', 'NE',
  'NW', 'OW', 'SG', 'SH', 'SO', 'SZ', 'TG', 'TI', 'UR', 'VD', 'VS', 'ZG', 'ZH'] as const

export const FERIES_SUISSES: readonly FerieDef[] = [
  { cle: 'nouvel-an', libelle: 'Nouvel An', regle: { type: 'fixe', mois: 1, jour: 1 }, cantons: TOUS, partout: true },
  {
    cle: 'saint-berchtold', libelle: 'Saint-Berchtold', regle: { type: 'fixe', mois: 1, jour: 2 },
    cantons: ['BE', 'JU', 'TG', 'VD'], partiel: ['AG', 'FR'],
    note: 'Chômé par usage dans d’autres cantons (Zurich, Lucerne…), sans y être férié.',
  },
  {
    cle: 'ne-2-janvier', libelle: 'Lendemain du Nouvel An',
    regle: { type: 'special', calcul: a => jourDeSemaine(`${a}-01-01`) === 0 ? `${a}-01-02` : null },
    cantons: ['NE'], note: 'Férié à Neuchâtel seulement quand le 1er janvier tombe un dimanche.',
  },
  { cle: 'epiphanie', libelle: 'Épiphanie', regle: { type: 'fixe', mois: 1, jour: 6 }, cantons: ['TI', 'UR', 'SZ'], partiel: ['GR'] },
  { cle: 'instauration-republique', libelle: 'Instauration de la République', regle: { type: 'fixe', mois: 3, jour: 1 }, cantons: ['NE'] },
  { cle: 'saint-joseph', libelle: 'Saint-Joseph', regle: { type: 'fixe', mois: 3, jour: 19 }, cantons: ['VS', 'SZ', 'UR', 'NW', 'TI'], partiel: ['LU', 'ZG', 'GR', 'SO'] },
  {
    cle: 'naefelser-fahrt', libelle: 'Näfelser Fahrt',
    regle: {
      type: 'special', calcul: a => {
        // Premier jeudi d'avril ; reporté d'une semaine s'il tombe le Jeudi saint.
        const jeudi = nieme(a, 4, 4, 1)
        return jeudi === ajouterJours(paques(a), -3) ? ajouterJours(jeudi, 7) : jeudi
      },
    },
    cantons: ['GL'],
  },
  {
    cle: 'vendredi-saint', libelle: 'Vendredi saint', regle: { type: 'paques', decalage: -2 },
    cantons: TOUS.filter(c => c !== 'TI' && c !== 'VS'),
    note: 'Pas férié en Valais ni au Tessin, même si beaucoup d’entreprises valaisannes ferment.',
  },
  {
    cle: 'lundi-de-paques', libelle: 'Lundi de Pâques', regle: { type: 'paques', decalage: 1 },
    cantons: ['AI', 'AR', 'BE', 'BL', 'BS', 'GE', 'GL', 'GR', 'JU', 'SG', 'SH', 'SZ', 'TG', 'TI', 'UR', 'VD', 'ZH'],
    partiel: ['AG', 'FR', 'SO'],
    note: 'Pas férié en Valais, à Lucerne, Obwald, Nidwald, Zoug ni Neuchâtel, où il est souvent chômé.',
  },
  {
    cle: 'fete-du-travail', libelle: 'Fête du travail', regle: { type: 'fixe', mois: 5, jour: 1 },
    cantons: ['ZH', 'BS', 'BL', 'SH', 'TG', 'JU', 'NE', 'TI', 'SO'],
    note: 'À Soleure, férié à partir de midi seulement.',
  },
  { cle: 'ascension', libelle: 'Ascension', regle: { type: 'paques', decalage: 39 }, cantons: TOUS, partout: true },
  {
    cle: 'lundi-de-pentecote', libelle: 'Lundi de Pentecôte', regle: { type: 'paques', decalage: 50 },
    cantons: ['AI', 'AR', 'BE', 'BL', 'BS', 'GE', 'GL', 'GR', 'JU', 'SG', 'SH', 'SZ', 'TG', 'TI', 'UR', 'VD', 'ZH'],
    partiel: ['AG', 'FR', 'SO'],
    note: 'Pas férié en Valais, où il est souvent chômé.',
  },
  {
    cle: 'fete-dieu', libelle: 'Fête-Dieu', regle: { type: 'paques', decalage: 60 },
    cantons: ['AI', 'JU', 'LU', 'NW', 'OW', 'SZ', 'TI', 'UR', 'VS', 'ZG'], partiel: ['AG', 'BL', 'FR', 'GR', 'NE', 'SO'],
  },
  { cle: 'plebiscite-jurassien', libelle: 'Commémoration du plébiscite jurassien', regle: { type: 'fixe', mois: 6, jour: 23 }, cantons: ['JU'] },
  { cle: 'saints-pierre-et-paul', libelle: 'Saints Pierre et Paul', regle: { type: 'fixe', mois: 6, jour: 29 }, cantons: ['TI'], partiel: ['LU', 'GR', 'SO'] },
  { cle: 'fete-nationale', libelle: 'Fête nationale', regle: { type: 'fixe', mois: 8, jour: 1 }, cantons: TOUS, partout: true },
  { cle: 'assomption', libelle: 'Assomption', regle: { type: 'fixe', mois: 8, jour: 15 }, cantons: ['AI', 'JU', 'LU', 'NW', 'OW', 'SZ', 'TI', 'UR', 'VS', 'ZG'], partiel: ['AG', 'BL', 'FR', 'GR', 'SO'] },
  {
    cle: 'jeune-genevois', libelle: 'Jeûne genevois',
    regle: { type: 'special', calcul: a => ajouterJours(nieme(a, 9, 0, 1), 4) },
    cantons: ['GE'],
  },
  {
    cle: 'lundi-du-jeune', libelle: 'Lundi du Jeûne fédéral',
    regle: { type: 'special', calcul: a => ajouterJours(nieme(a, 9, 0, 3), 1) },
    cantons: ['VD'], note: 'Férié dans le canton de Vaud seulement ; à Neuchâtel, les magasins ferment sans que le jour soit férié.',
  },
  { cle: 'saint-maurice', libelle: 'Saint-Maurice', regle: { type: 'fixe', mois: 9, jour: 22 }, cantons: [], partiel: ['AI'] },
  { cle: 'saint-nicolas-de-flue', libelle: 'Saint-Nicolas-de-Flüe', regle: { type: 'fixe', mois: 9, jour: 25 }, cantons: ['OW'] },
  { cle: 'toussaint', libelle: 'Toussaint', regle: { type: 'fixe', mois: 11, jour: 1 }, cantons: ['AI', 'GL', 'JU', 'LU', 'NW', 'OW', 'SG', 'SZ', 'TI', 'UR', 'VS', 'ZG'], partiel: ['AG', 'FR', 'GR', 'SO'] },
  { cle: 'immaculee-conception', libelle: 'Immaculée Conception', regle: { type: 'fixe', mois: 12, jour: 8 }, cantons: ['AI', 'LU', 'NW', 'OW', 'SZ', 'TI', 'UR', 'VS', 'ZG'], partiel: ['AG', 'FR', 'GR', 'SO'] },
  { cle: 'noel', libelle: 'Noël', regle: { type: 'fixe', mois: 12, jour: 25 }, cantons: TOUS, partout: true },
  {
    cle: 'saint-etienne', libelle: 'Saint-Étienne', regle: { type: 'fixe', mois: 12, jour: 26 },
    cantons: ['AI', 'AR', 'BE', 'BL', 'BS', 'GL', 'GR', 'LU', 'SG', 'SH', 'SZ', 'TG', 'TI', 'UR', 'ZH'], partiel: ['AG', 'FR', 'SO'],
    note: 'Pas férié en Valais, à Genève, Vaud, Neuchâtel ni dans le Jura. En Appenzell, des exceptions selon le jour de Noël.',
  },
  {
    cle: 'ne-26-decembre', libelle: 'Lendemain de Noël',
    regle: { type: 'special', calcul: a => jourDeSemaine(`${a}-12-25`) === 0 ? `${a}-12-26` : null },
    cantons: ['NE'], note: 'Férié à Neuchâtel seulement quand Noël tombe un dimanche.',
  },
  { cle: 'restauration-republique', libelle: 'Restauration de la République', regle: { type: 'fixe', mois: 12, jour: 31 }, cantons: ['GE'] },
]

// Grille d'un mois et libellés du calendrier.
//
// Remontée du CMS (lib/calendrier.ts, calendrier éditorial) : la vue mois de
// l'agenda public a besoin exactement de la même grille, et deux copies d'un
// calcul de dates finissent toujours par diverger d'un jour. Le CMS la
// réimporte d'ici.
//
// Pur, sans objet Date local : tout se calcule en UTC à partir de l'année et
// du mois, si bien que le résultat est le même sur un serveur en UTC, dans un
// navigateur à Montréal et en développement.
//
// Les libellés sont écrits en dur plutôt que demandés à Intl : le site rend la
// page sur le serveur puis la réhydrate dans le navigateur, et deux moteurs
// Intl n'abrègent pas toujours pareil (« sept. » ou « sep. ») — un écart
// d'hydratation pour un point.

export type LangueCalendrier = 'fr' | 'en'

const deux = (n: number) => String(n).padStart(2, '0')

/** Grille du mois, en semaines commençant le lundi.
 *
 *  Les cases avant le 1er et après le dernier jour valent null : elles sont
 *  affichées vides plutôt que de déborder sur les mois voisins, qu'on ne
 *  charge pas. */
export function grilleDuMois(annee: number, mois: number): (string | null)[][] {
  const premier = new Date(Date.UTC(annee, mois - 1, 1))
  const nbJours = new Date(Date.UTC(annee, mois, 0)).getUTCDate()
  // getUTCDay : 0 = dimanche. On veut lundi en tête.
  const decalage = (premier.getUTCDay() + 6) % 7

  const cases: (string | null)[] = Array(decalage).fill(null)
  for (let j = 1; j <= nbJours; j++) cases.push(`${annee}-${deux(mois)}-${deux(j)}`)
  while (cases.length % 7 !== 0) cases.push(null)

  const semaines: (string | null)[][] = []
  for (let i = 0; i < cases.length; i += 7) semaines.push(cases.slice(i, i + 7))
  return semaines
}

/** Mois précédent et suivant, sans passer par Date. */
export function moisVoisin(annee: number, mois: number, pas: -1 | 1): { annee: number; mois: number } {
  const m = mois + pas
  if (m < 1) return { annee: annee - 1, mois: 12 }
  if (m > 12) return { annee: annee + 1, mois: 1 }
  return { annee, mois: m }
}

/** « 2026-10 » (le paramètre `?mois=` de la vue mois) → { annee, mois }, ou
 *  null si la valeur ne désigne pas un mois plausible. L'adresse vient du
 *  visiteur : un « 2026-13 » ou un « 99999-01 » ne doit rien casser. */
export function lireMois(v: unknown): { annee: number; mois: number } | null {
  const m = typeof v === 'string' ? v.trim().match(/^(\d{4})-(\d{2})$/) : null
  if (!m) return null
  const annee = Number(m[1]), mois = Number(m[2])
  if (annee < 2000 || annee > 2100 || mois < 1 || mois > 12) return null
  return { annee, mois }
}

// ── Libellés ────────────────────────────────────────────────────────────────

export const MOIS_LONGS: Record<LangueCalendrier, readonly string[]> = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}

/** Abréviations d'usage : en français, les mois courts ne s'abrègent pas. */
export const MOIS_COURTS: Record<LangueCalendrier, readonly string[]> = {
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
}

/** Jours de la semaine, du lundi au dimanche : l'ordre des colonnes de la
 *  grille (et non celui de `Date.getDay()`, qui commence le dimanche). */
const SEMAINE: Record<LangueCalendrier, readonly { court: string; long: string }[]> = {
  fr: [
    { court: 'lun.', long: 'lundi' }, { court: 'mar.', long: 'mardi' }, { court: 'mer.', long: 'mercredi' },
    { court: 'jeu.', long: 'jeudi' }, { court: 'ven.', long: 'vendredi' }, { court: 'sam.', long: 'samedi' },
    { court: 'dim.', long: 'dimanche' },
  ],
  en: [
    { court: 'Mon', long: 'Monday' }, { court: 'Tue', long: 'Tuesday' }, { court: 'Wed', long: 'Wednesday' },
    { court: 'Thu', long: 'Thursday' }, { court: 'Fri', long: 'Friday' }, { court: 'Sat', long: 'Saturday' },
    { court: 'Sun', long: 'Sunday' },
  ],
}

/** En-têtes des colonnes de la grille, lundi en tête. Le nom long sert au
 *  lecteur d'écran (`<abbr title>`), le court à l'affichage. */
export const enTetesSemaine = (langue: LangueCalendrier = 'fr') => SEMAINE[langue]

/** « octobre 2026 », « October 2026 » : la légende de la grille. */
export const moisLisible = (annee: number, mois: number, langue: LangueCalendrier = 'fr') =>
  `${MOIS_LONGS[langue][mois - 1]} ${annee}`

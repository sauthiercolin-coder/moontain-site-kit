// Le rappel d'échéance : « prévenez-moi quand ce sera l'heure ».
//
// Un contrôle dans six mois, un service à faire, un forfait qui expire, des
// lunettes à renouveler. Le commerce perd ce client-là non pas parce qu'il est
// mécontent, mais parce que personne ne lui a rien dit au bon moment.
//
// Pur : aucune base, aucun React, aucune horloge. Toutes les fonctions
// prennent la date du jour en argument quand elles en ont besoin — c'est ce
// qui les rend testables et ce qui évite qu'un rappel change de jour selon le
// fuseau du serveur qui l'a calculé.

import { ajouterJours } from './feries-suisses'

/** Comment le commerce demande le point de départ.
 *
 *  `duree` : « votre dernier contrôle ? » puis on ajoute la durée. C'est le
 *  dentiste, le garage, le ramoneur.
 *  `date` : « quand expire votre abonnement ? » — la personne donne
 *  directement l'échéance. C'est le forfait de ski, l'assurance, le bail. */
export type ModeEcheance = 'duree' | 'date'

export interface TypeEcheance {
  id: string
  libelle: string
  mode: ModeEcheance
  /** En mois. En mode `date`, ne sert qu'aux rappels qui se répètent. */
  dureeMois: number
  /** Combien de jours AVANT l'échéance le message part. Zéro = le jour même. */
  preavisJours: number
  /** Une phrase que le commerce ajoute au courriel. */
  message?: string | null
}

const MOIS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]
const MOIS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const JOUR = /^(\d{4})-(\d{2})-(\d{2})$/

/** Vrai si la chaîne est bien un jour au format AAAA-MM-JJ ET un jour qui
 *  existe. `2027-02-31` passe la forme et pas l'existence. */
export function jourValide(iso: string | null | undefined): boolean {
  const m = JOUR.exec((iso ?? '').trim())
  if (!m) return false
  const [, a, mo, j] = m
  const d = new Date(Date.UTC(Number(a), Number(mo) - 1, Number(j)))
  return d.getUTCFullYear() === Number(a)
    && d.getUTCMonth() === Number(mo) - 1
    && d.getUTCDate() === Number(j)
}

/** Ajouter des mois à un jour.
 *
 *  Le 31 août plus six mois n'est pas le 3 mars : on s'arrête au dernier jour
 *  du mois visé. Sans ce garde-fou, un rappel « tous les six mois » posé un 31
 *  part le 3 du mois suivant et la personne croit à une erreur — elle a
 *  raison. */
export function ajouterMois(iso: string, mois: number): string {
  const m = JOUR.exec(iso)
  if (!m) return iso
  const [, a, mo, j] = m
  const annee = Number(a)
  const index = Number(mo) - 1 + mois
  const dernier = new Date(Date.UTC(annee, index + 1, 0)).getUTCDate()
  const d = new Date(Date.UTC(annee, index, Math.min(Number(j), dernier)))
  return d.toISOString().slice(0, 10)
}

/** L'échéance elle-même : le jour où la chose est due.
 *
 *  En mode `date`, c'est ce que la personne a écrit. En mode `duree`, c'est
 *  son point de départ plus la durée du type. */
export function dateEcheance(depart: string, type: Pick<TypeEcheance, 'mode' | 'dureeMois'>): string {
  return type.mode === 'date' ? depart : ajouterMois(depart, type.dureeMois)
}

/** Le jour où le message doit partir : l'échéance moins le préavis.
 *
 *  Séparé de l'échéance parce que les deux dates comptent et qu'on les montre
 *  toutes les deux : « votre contrôle est dû le 12 mars, nous vous écrirons le
 *  26 février ». Une seule des deux laisserait croire à un retard. */
export function dateDuRappel(depart: string, type: Pick<TypeEcheance, 'mode' | 'dureeMois' | 'preavisJours'>): string {
  return ajouterJours(dateEcheance(depart, type), -Math.max(0, type.preavisJours || 0))
}

/** Le jour où le message partira VRAIMENT.
 *
 *  Quelqu'un qui écrit « mon dernier contrôle remonte à huit mois » a une
 *  échéance déjà passée. On ne fait pas semblant de l'avoir manquée et on ne
 *  l'écrit pas dans le passé : le message part au prochain passage. C'est même
 *  le cas qui vaut le plus cher pour le commerce — un client en retard qui ne
 *  le savait pas. */
export function prochainEnvoi(duLe: string, aujourdHui: string): string {
  return duLe < aujourdHui ? aujourdHui : duLe
}

/** « 12 mars 2027 ». Distinct de `jourLisible` (annonces), qui omet l'année
 *  en cours et ne parle que français : un rappel posé pour dans dix-huit mois
 *  doit porter son année, et le site peut être en anglais.
 *
 *  Écrit à la main plutôt que par `Intl` : les formats
 *  localisés changent d'une version de Node à l'autre, et on a déjà été mordu
 *  par un `Intl` suisse romand qui rend « 19 h » là où l'on attendait « 19:00 ». */
export function dateLisible(iso: string, lang: 'fr' | 'en' = 'fr'): string {
  const m = JOUR.exec(iso)
  if (!m) return iso
  const [, a, mo, j] = m
  const mois = (lang === 'fr' ? MOIS_FR : MOIS_EN)[Number(mo) - 1]
  const jour = Number(j)
  if (lang === 'en') return `${mois} ${jour}, ${a}`
  // « 1er mars », pas « 1 mars ».
  return `${jour === 1 ? '1er' : jour} ${mois} ${a}`
}

/** La périodicité, en clair : « tous les six mois », « chaque année ». */
export function periodeLisible(dureeMois: number, lang: 'fr' | 'en' = 'fr'): string {
  const n = Math.max(1, Math.round(dureeMois))
  if (lang === 'en') {
    if (n === 12) return 'every year'
    if (n === 24) return 'every two years'
    return n % 12 === 0 ? `every ${n / 12} years` : `every ${n} months`
  }
  if (n === 1) return 'chaque mois'
  if (n === 12) return 'chaque année'
  if (n === 24) return 'tous les deux ans'
  if (n % 12 === 0) return `tous les ${n / 12} ans`
  const lettres = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze']
  return `tous les ${lettres[n] ?? n} mois`
}

/** Ce que le visiteur lit avant de donner son adresse : la date exacte à
 *  laquelle il sera écrit.
 *
 *  C'est la phrase qui décide. « Nous vous préviendrons le moment venu » ne
 *  vaut rien ; « nous vous écrirons le 26 février 2027 » est une promesse
 *  qu'on peut tenir et qu'on peut vérifier. */
export function promesseLisible(
  duLe: string,
  aujourdHui: string,
  lang: 'fr' | 'en' = 'fr',
): string {
  const quand = prochainEnvoi(duLe, aujourdHui)
  if (quand === aujourdHui && duLe < aujourdHui) {
    return lang === 'en'
      ? 'That date has already passed — we will write to you within the day.'
      : 'Cette date est déjà passée : nous vous écrirons dans la journée.'
  }
  return lang === 'en'
    ? `We will write to you on ${dateLisible(quand, 'en')}.`
    : `Nous vous écrirons le ${dateLisible(quand, 'fr')}.`
}

/** Bornes de saisie.
 *
 *  Un point de départ dans le futur n'a pas de sens en mode `duree` — on ne
 *  revient pas d'un contrôle qu'on n'a pas encore fait. Une échéance dans le
 *  passé n'en a pas non plus en mode `date` : personne ne demande à être
 *  prévenu d'un abonnement expiré l'an dernier. Et au-delà de dix ans, ce
 *  n'est plus un rappel, c'est un pari. */
export const ANNEES_MAX = 10

export function bornesDeSaisie(
  mode: ModeEcheance,
  aujourdHui: string,
): { min: string; max: string } {
  return mode === 'date'
    ? { min: aujourdHui, max: ajouterMois(aujourdHui, ANNEES_MAX * 12) }
    : { min: ajouterMois(aujourdHui, -ANNEES_MAX * 12), max: aujourdHui }
}

/** Le contrôle que la route refait côté serveur : le navigateur ne décide pas
 *  de ce qu'on accepte d'écrire. */
export function departAcceptable(depart: string, mode: ModeEcheance, aujourdHui: string): boolean {
  if (!jourValide(depart)) return false
  const { min, max } = bornesDeSaisie(mode, aujourdHui)
  return depart >= min && depart <= max
}

import { creneauxDates, type CreneauRappel } from './rappel'
import type { Horaires, LangueHoraires } from './horaires'

// Les créneaux proposés à qui demande à visiter un bien.
//
// Même matière que le rappel — les demi-journées réellement ouvertes de
// l'agence — mais deux différences qui comptent :
//
//   1. pas de « dès que possible ». Une visite se cale, elle ne se prend pas
//      dans le quart d'heure : proposer l'immédiat serait une promesse que
//      personne ne tient ;
//   2. un jour de délai au moins. Il faut prévenir le locataire ou le
//      propriétaire, retrouver les clés, et bloquer une heure.
//
// Pur : aucune base, aucun React. Le serveur revérifie au dépôt le créneau
// qu'on lui renvoie — il ne croit que ce qu'il a lui-même calculé.

export type CreneauVisite = CreneauRappel

/** Un jour plein. En dessous, une agence ne peut pas s'organiser. */
export const DELAI_VISITE = 24 * 60

export interface OptionsVisite {
  langue?: LangueHoraires
  /** Combien de créneaux proposer. Six couvre une bonne semaine sans noyer. */
  nombre?: number
  /** Jusqu'où chercher, en jours. */
  horizon?: number
}

/** Les visites possibles, dans l'ordre. Liste vide si l'agence n'a pas déclaré
 *  ses horaires : le widget propose alors d'être rappelé plutôt que d'inventer
 *  des moments. */
export function creneauxDeVisite(
  h: Horaires | null | undefined,
  instant: Date = new Date(),
  o: OptionsVisite = {},
): CreneauVisite[] {
  return creneauxDates(h, instant, {
    langue: o.langue ?? 'fr',
    nombre: Math.max(1, Math.min(12, o.nombre ?? 6)),
    horizon: Math.max(2, Math.min(30, o.horizon ?? 14)),
    delaiMinimal: DELAI_VISITE,
    // Une visite occupe le créneau qu'elle annonce : « demain matin (8h–12h) »
    // ne se propose que si 8 h est déjà au-delà du délai.
    entier: true,
  })
}

/** Le créneau que le visiteur dit avoir choisi, retrouvé parmi ceux qu'on
 *  propose vraiment. null s'il n'en fait pas partie. */
export function creneauVisiteChoisi(
  cle: string | null | undefined,
  h: Horaires | null | undefined,
  instant: Date = new Date(),
  o: OptionsVisite = {},
): CreneauVisite | null {
  const c = (cle ?? '').trim()
  if (!c) return null
  // On cherche large : le visiteur a pu remplir le formulaire lentement.
  return creneauxDeVisite(h, instant, { ...o, nombre: 12 }).find(x => x.cle === c) ?? null
}

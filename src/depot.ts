// Le dépôt de documents : ce qu'on accepte de recevoir, et ce qu'on refuse.
//
// Une fiduciaire, un avocat, un courtier, un architecte reçoivent des pièces
// toute l'année. Aujourd'hui, ça passe par la pièce jointe ou par WeTransfer —
// une pratique que ces métiers savent mauvaise et gardent faute d'outil.
//
// Pur : aucune base, aucun React. Les bornes vivent ici plutôt que dans la
// route, parce que le navigateur doit les dire AVANT l'envoi — quelqu'un qui
// monte quarante mégaoctets sur une ligne de montagne et se fait refuser à
// l'arrivée ne recommence pas.

import { poidsLisible, verifierFichier, type VerdictFichier } from './telechargement'

/** Combien de pièces dans une seule enveloppe. Au-delà, ce n'est plus un
 *  dépôt, c'est une sauvegarde — et l'écran qui les relit devient illisible. */
export const PIECES_MAX = 10

/** Le poids de l'enveloppe entière. Chaque pièce est déjà bornée à 20 Mo par
 *  `verifierFichier` ; cette limite-ci empêche dix pièces de 20 Mo. */
export const ENVELOPPE_MAX = 60 * 1000 * 1000

export interface PieceCandidate {
  nom?: string | null
  type?: string | null
  octets?: number | null
}

export interface VerdictDepot {
  ok: boolean
  erreur?: string
  /** L'index de la pièce fautive, quand une seule est en cause. La dire par
   *  son rang évite d'afficher un nom de fichier dans un message d'erreur —
   *  et surtout, la personne sait laquelle retirer. */
  piece?: number
}

/** L'enveloppe est-elle acceptable ?
 *
 *  L'ordre des contrôles n'est pas indifférent : on refuse d'abord ce qui se
 *  voit sans lire les fichiers (le nombre, le poids total), puis pièce par
 *  pièce. Une personne qui a joint douze documents doit l'apprendre avant
 *  qu'on lui parle du format du troisième. */
export function verifierDepot(pieces: PieceCandidate[], lang: 'fr' | 'en' = 'fr'): VerdictDepot {
  const fr = lang === 'fr'
  if (!pieces.length) {
    return { ok: false, erreur: fr ? 'Joignez au moins un document.' : 'Attach at least one document.' }
  }
  if (pieces.length > PIECES_MAX) {
    return {
      ok: false,
      erreur: fr
        ? `${PIECES_MAX} documents au plus par envoi. Faites-en deux.`
        : `${PIECES_MAX} documents per upload at most. Please split it in two.`,
    }
  }

  const total = pieces.reduce((n, p) => n + (p.octets ?? 0), 0)
  if (total > ENVELOPPE_MAX) {
    return {
      ok: false,
      erreur: fr
        ? `L’envoi dépasse ${poidsLisible(ENVELOPPE_MAX)} en tout (${poidsLisible(total)}).`
        : `The upload exceeds ${poidsLisible(ENVELOPPE_MAX, 'en')} in total (${poidsLisible(total, 'en')}).`,
    }
  }

  for (let i = 0; i < pieces.length; i++) {
    const v: VerdictFichier = verifierFichier(pieces[i], lang)
    if (!v.ok) return { ok: false, erreur: v.erreur, piece: i }
  }
  return { ok: true }
}

/** « 3 documents · 4,2 Mo » — ce que le formulaire affiche sous la liste, et
 *  ce que le reçu répète. La personne doit pouvoir vérifier d'un coup d'œil
 *  qu'elle a joint ce qu'elle croyait. */
export function resumeDepot(pieces: PieceCandidate[], lang: 'fr' | 'en' = 'fr'): string {
  const n = pieces.length
  const total = pieces.reduce((s, p) => s + (p.octets ?? 0), 0)
  const poids = poidsLisible(total, lang)
  if (lang === 'en') return `${n} document${n > 1 ? 's' : ''}${poids ? ` · ${poids}` : ''}`
  return `${n} document${n > 1 ? 's' : ''}${poids ? ` · ${poids}` : ''}`
}

/** Le nom d'un fichier, ramené à ce qu'on accepte d'écrire.
 *
 *  Un nom de fichier vient d'un inconnu : il peut porter des barres obliques,
 *  des points de remontée, des caractères de contrôle. On garde de quoi le
 *  reconnaître, et rien qui puisse désigner un autre dossier. */
export function nomDePiece(nom: string | null | undefined, secours = 'document'): string {
  const brut = (nom ?? '').split(/[\\/]/).pop() ?? ''
  const propre = brut
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 120)
  return propre || secours
}

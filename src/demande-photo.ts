// La demande avec photo : « montrez-nous, on vous rappelle ».
//
// Un garage, un carrossier, un couvreur, un peintre, un cuisiniste répondent
// dix fois par jour à « combien ça coûte ? » sans rien voir. Le client, lui,
// décrit mal ce qu'il ne sait pas nommer. Une photo prise au téléphone règle
// les deux d'un coup — et la demande arrive avec de quoi répondre.
//
// Ce module borne l'envoi, comme celui du dépôt, mais pas aux mêmes valeurs :
// on attend des photos, pas des dossiers. Six pièces, des images (et un PDF
// pour le plan que le client a reçu de son architecte), et un poids par pièce
// adapté à ce que sort un téléphone.

import { poidsLisible, verifierFichier } from './telechargement'
// Le même type qu'un dépôt : un fichier qu'on n'a pas encore accepté. Le
// redéclarer ici ferait deux vérités pour une seule chose.
import type { PieceCandidate } from './depot'

/** Six photos suffisent à comprendre un chantier : la vue d'ensemble, deux
 *  détails, l'accès. Au-delà, on ne regarde plus. */
export const PHOTOS_MAX = 6

/** Une photo de téléphone moderne pèse 3 à 5 Mo. Douze laisse la marge d'un
 *  appareil qui ne compresse pas, sans ouvrir la porte à une vidéo déguisée. */
export const PHOTO_MAX = 12 * 1000 * 1000

export const ENVOI_MAX = 40 * 1000 * 1000

/** Ce qu'on accepte de recevoir ici : des images, et le PDF d'un plan. Un
 *  tableur ou une présentation n'ont rien à faire dans une demande de devis —
 *  les refuser évite qu'on s'en serve comme d'un dépôt de documents. */
const TYPES_PHOTO = new Set(['image/jpeg', 'image/png', 'application/pdf'])

export interface VerdictPhotos {
  ok: boolean
  erreur?: string
  /** Le rang de la pièce fautive : la personne sait laquelle retirer, et on
   *  n'affiche pas un nom de fichier dans un message d'erreur. */
  piece?: number
}

/** L'envoi est-il acceptable ?
 *
 *  Même ordre que pour le dépôt : ce qui se voit sans lire les fichiers
 *  d'abord (le nombre, le poids total), puis pièce par pièce. */
export function verifierPhotos(pieces: PieceCandidate[], lang: 'fr' | 'en' = 'fr'): VerdictPhotos {
  const fr = lang === 'fr'
  if (!pieces.length) {
    return { ok: false, erreur: fr ? 'Ajoutez au moins une photo.' : 'Add at least one photo.' }
  }
  if (pieces.length > PHOTOS_MAX) {
    return {
      ok: false,
      erreur: fr
        ? `${PHOTOS_MAX} photos suffisent. Gardez les plus parlantes.`
        : `${PHOTOS_MAX} photos are enough. Keep the clearest ones.`,
    }
  }

  const total = pieces.reduce((n, p) => n + (p.octets ?? 0), 0)
  if (total > ENVOI_MAX) {
    return {
      ok: false,
      erreur: fr
        ? `L’envoi dépasse ${poidsLisible(ENVOI_MAX)} en tout (${poidsLisible(total)}).`
        : `The upload exceeds ${poidsLisible(ENVOI_MAX, 'en')} in total (${poidsLisible(total, 'en')}).`,
    }
  }

  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i]
    const type = (p.type ?? '').trim().toLowerCase()
    if (!TYPES_PHOTO.has(type)) {
      return {
        ok: false,
        piece: i,
        erreur: fr ? 'Des photos (JPEG, PNG) ou un PDF, rien d’autre.' : 'Photos (JPEG, PNG) or a PDF only.',
      }
    }
    if ((p.octets ?? 0) > PHOTO_MAX) {
      return {
        ok: false,
        piece: i,
        erreur: fr
          ? `Une photo de ${poidsLisible(PHOTO_MAX)} au plus.`
          : `One photo of ${poidsLisible(PHOTO_MAX, 'en')} at most.`,
      }
    }
    // Le type déclaré ET l'extension doivent concorder : `verifierFichier`
    // borne aussi la taille, plus haut que nous ; nos limites priment et sont
    // déjà passées.
    const v = verifierFichier(p, lang)
    if (!v.ok) return { ok: false, erreur: v.erreur, piece: i }
  }
  return { ok: true }
}

/** « 3 photos · 6,2 Mo » — sous la liste, et dans l'accusé de réception. */
export function resumePhotos(pieces: PieceCandidate[], lang: 'fr' | 'en' = 'fr'): string {
  const n = pieces.length
  const poids = poidsLisible(pieces.reduce((s, p) => s + (p.octets ?? 0), 0), lang)
  if (lang === 'en') return `${n} photo${n > 1 ? 's' : ''}${poids ? ` · ${poids}` : ''}`
  return `${n} photo${n > 1 ? 's' : ''}${poids ? ` · ${poids}` : ''}`
}

/** Un numéro de téléphone suisse, ramené à une forme comparable.
 *
 *  C'est le champ qui compte ici : le commerce RAPPELLE. Un numéro mal saisi
 *  transforme une demande en perte sèche — on vérifie donc qu'il ressemble à
 *  un numéro, sans être plus exigeant qu'il ne faut : les gens écrivent
 *  « 079 123 45 67 », « +41 79 123 45 67 », « 0041791234567 ». */
export function telephoneLisible(brut: string | null | undefined): string | null {
  const chiffres = (brut ?? '').replace(/[^\d+]/g, '')
  if (!chiffres) return null
  const normalise = chiffres
    .replace(/^\+41/, '0')
    .replace(/^0041/, '0')
    .replace(/^41(?=\d{9}$)/, '0')
  if (!/^0\d{9}$/.test(normalise)) return null
  // 079 123 45 67 — le découpage qu'on lit en Suisse.
  return `${normalise.slice(0, 3)} ${normalise.slice(3, 6)} ${normalise.slice(6, 8)} ${normalise.slice(8, 10)}`
}

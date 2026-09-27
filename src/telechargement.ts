// Le téléchargement contre courriel : dire honnêtement ce qu'on offre.
//
// Pur : aucune base, aucun React. Trois choses seulement, mais qui décident de
// ce qu'un visiteur comprend avant de donner son adresse.

export interface DocumentOffert {
  id: string
  slug: string
  titre: string
  description?: string | null
  /** « PDF, 12 pages » — écrit à la main par le commerce. */
  detail?: string | null
  imageUrl?: string | null
  proposeNewsletter?: boolean
}

/** Le poids d'un fichier, tel qu'on l'annonce. Une brochure de 8 Mo sur un
 *  forfait mobile n'est pas la même promesse qu'une de 200 Ko, et la personne
 *  a le droit de le savoir avant de cliquer.
 *
 *  Base 1000 et non 1024 : c'est ce qu'affiche le système d'exploitation de
 *  qui recevra le fichier, et deux chiffres différents pour le même fichier
 *  font douter du reste. */
export function poidsLisible(octets: number | null | undefined, lang: 'fr' | 'en' = 'fr'): string | null {
  if (octets == null || !(octets > 0)) return null
  if (octets < 1000) return `${octets} o`
  const unites = lang === 'fr' ? ['Ko', 'Mo', 'Go'] : ['KB', 'MB', 'GB']
  let n = octets / 1000
  let i = 0
  while (n >= 1000 && i < unites.length - 1) { n /= 1000; i++ }
  // Une décimale sous 10, aucune au-dessus : « 8,4 Mo » se lit, « 8,42 Mo »
  // donne une précision que personne ne demande.
  const arrondi = n < 10 ? Math.round(n * 10) / 10 : Math.round(n)
  return `${String(arrondi).replace('.', lang === 'fr' ? ',' : '.')} ${unites[i]}`
}

/** Ce qu'on affiche sous le titre : ce que le commerce a écrit, et le poids
 *  du fichier. Le poids n'est jamais inventé — un document dont on ignore la
 *  taille n'en annonce pas. */
export function detailLisible(
  detail: string | null | undefined,
  octets: number | null | undefined,
  lang: 'fr' | 'en' = 'fr',
): string | null {
  const morceaux = [detail?.trim() || null, poidsLisible(octets, lang)].filter(Boolean)
  return morceaux.length ? morceaux.join(' · ') : null
}

/** Les types de fichier qu'on accepte à l'envoi.
 *
 *  Une liste fermée, et courte. Ce fichier sera ouvert par des inconnus sur
 *  leur propre machine : on n'offre pas un canal pour distribuer n'importe
 *  quoi depuis un domaine de confiance. Les formats bureautiques y sont parce
 *  qu'une grille tarifaire circule encore en Excel ; les archives et les
 *  exécutables n'y sont pas, et n'y seront pas. */
export const TYPES_TELECHARGEABLES: { type: string; extension: string; label: string }[] = [
  { type: 'application/pdf', extension: 'pdf', label: 'PDF' },
  { type: 'image/jpeg', extension: 'jpg', label: 'Image JPEG' },
  { type: 'image/png', extension: 'png', label: 'Image PNG' },
  { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: 'docx', label: 'Word' },
  { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx', label: 'Excel' },
  { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', extension: 'pptx', label: 'PowerPoint' },
]

/** Vingt mégaoctets. Au-delà, un courriel se fait refuser par la moitié des
 *  messageries — et de toute façon on n'envoie qu'un lien, c'est le
 *  téléchargement qui souffrirait. */
export const POIDS_MAX = 20 * 1000 * 1000

export interface VerdictFichier { ok: boolean; erreur?: string; extension?: string }

/** Le fichier est-il acceptable ? Le type déclaré ET l'extension doivent
 *  concorder : un exécutable renommé en .pdf annonce « application/pdf » si on
 *  le laisse faire. */
export function verifierFichier(
  o: { type?: string | null; nom?: string | null; octets?: number | null },
  lang: 'fr' | 'en' = 'fr',
): VerdictFichier {
  const fr = lang === 'fr'
  const octets = o.octets ?? 0
  if (!(octets > 0)) return { ok: false, erreur: fr ? 'Fichier vide.' : 'Empty file.' }
  if (octets > POIDS_MAX) {
    return { ok: false, erreur: fr ? `Fichier trop lourd (${poidsLisible(POIDS_MAX)} au plus).` : `File too large (${poidsLisible(POIDS_MAX, 'en')} max).` }
  }
  const type = (o.type ?? '').trim().toLowerCase()
  const connu = TYPES_TELECHARGEABLES.find(t => t.type === type)
  if (!connu) return { ok: false, erreur: fr ? 'Format non accepté.' : 'Format not accepted.' }
  const extension = (o.nom ?? '').split('.').pop()?.toLowerCase() ?? ''
  // Le JPEG s'écrit de deux façons depuis toujours ; le reste est exact.
  const attendues = connu.extension === 'jpg' ? ['jpg', 'jpeg'] : [connu.extension]
  if (!attendues.includes(extension)) {
    return { ok: false, erreur: fr ? 'Le nom du fichier ne correspond pas à son format.' : 'File name does not match its format.' }
  }
  return { ok: true, extension: connu.extension }
}

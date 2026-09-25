import { TYPES_BIEN, type FiltresBiens } from './biens'

// L'alerte « nouveaux biens » : dire en une phrase ce à quoi on s'abonne.
//
// Ce fichier ne filtre rien — c'est `filtrerBiens` qui décide, la même
// fonction que la recherche. Il ne fait que mettre les critères en mots, et
// ce travail-là est loin d'être décoratif : quelqu'un s'apprête à confier son
// adresse, il doit relire exactement ce qu'il demande. « Vous serez prévenu »
// ne dit rien ; « appartement à louer, 4,5 pièces et plus, à Sion, jusqu'à
// CHF 2 500.–/mois » se vérifie d'un coup d'œil.
//
// La même phrase sert trois fois : sous le formulaire, dans le courriel de
// confirmation, et dans l'écran de l'agence. Une seule source, donc aucun
// risque qu'elles se contredisent.

const nombre = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

const demiPiece = (p: number): string => (Number.isInteger(p) ? String(p) : String(p).replace(/\.0$/, ''))

/** Les critères en une phrase lisible. « Tous les biens » quand il n'y en a
 *  aucun : c'est un choix légitime, et il faut qu'il se lise comme tel plutôt
 *  que comme un oubli. */
export function critereLisible(f: FiltresBiens, lang: 'fr' | 'en' = 'fr'): string {
  const fr = lang === 'fr'
  const morceaux: string[] = []

  const type = f.type ? TYPES_BIEN.find(t => t.valeur === f.type)?.label : null
  const quoi = type ?? (fr ? 'Tous les biens' : 'All properties')
  const achatLoc = f.transaction === 'location' ? (fr ? 'à louer' : 'to rent')
    : f.transaction === 'vente' ? (fr ? 'à vendre' : 'for sale') : null
  morceaux.push([quoi, achatLoc].filter(Boolean).join(' '))

  if (f.piecesMin != null && f.piecesMin > 0) {
    morceaux.push(fr ? `${demiPiece(f.piecesMin)} pièces et plus` : `${demiPiece(f.piecesMin)} rooms or more`)
  }
  if (f.surfaceMin != null && f.surfaceMin > 0) {
    morceaux.push(fr ? `dès ${f.surfaceMin} m²` : `from ${f.surfaceMin} m²`)
  }
  if (f.lieu?.trim()) morceaux.push(fr ? `à ${f.lieu.trim()}` : `in ${f.lieu.trim()}`)
  if (f.prixMax != null && f.prixMax > 0) {
    // Le « /mois » n'apparaît que pour une location : sur une vente il ferait
    // lire un budget mensuel là où on parle d'un prix d'achat.
    const suffixe = f.transaction === 'location' ? (fr ? '/mois' : '/month') : ''
    morceaux.push(fr
      ? `jusqu’à CHF ${nombre(f.prixMax)}.–${suffixe}`
      : `up to CHF ${nombre(f.prixMax)}.–${suffixe}`)
  }

  return morceaux.join(', ')
}

/** Les critères tels qu'ils voyagent : rien que des valeurs propres, et `null`
 *  partout où le visiteur n'a rien demandé. Le serveur s'en sert pour écrire
 *  l'alerte, et le navigateur pour la relire. */
export function critereNormalise(f: FiltresBiens): Required<FiltresBiens> {
  const n = (v: unknown): number | null => {
    const x = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'))
    return Number.isFinite(x) && x > 0 ? x : null
  }
  const t = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
  return {
    transaction: f.transaction === 'vente' || f.transaction === 'location' ? f.transaction : null,
    type: TYPES_BIEN.some(x => x.valeur === f.type) ? (f.type ?? null) : null,
    lieu: t(f.lieu),
    piecesMin: n(f.piecesMin),
    prixMax: n(f.prixMax),
    surfaceMin: n(f.surfaceMin) != null ? Math.round(n(f.surfaceMin) as number) : null,
  }
}

/** Une alerte sans aucun critère suit tout le catalogue. C'est permis, mais
 *  l'écran de l'agence et le courriel le disent autrement : « tout ce qui
 *  paraît » plutôt qu'une liste vide de conditions. */
export function alerteLarge(f: FiltresBiens): boolean {
  const c = critereNormalise(f)
  return !c.transaction && !c.type && !c.lieu && !c.piecesMin && !c.prixMax && !c.surfaceMin
}

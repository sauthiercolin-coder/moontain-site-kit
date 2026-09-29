// La liste d'envies partageable : ce qui reste à offrir, et ce qui est pris.
//
// C'est le seul des dix widgets qui fasse ENTRER des gens : le client compose
// sa liste — mariage, naissance, anniversaire — et l'envoie à dix proches, dont
// neuf n'avaient jamais vu la boutique. Tous les autres servent quelqu'un qui
// est déjà sur le site.
//
// Pur : aucune base, aucun React, aucune horloge. La date du jour est passée
// en argument quand elle sert.

/** Une réservation : quelqu'un a dit « je m'en occupe ». */
export interface Reservation {
  quantite: number
  /** Jusqu'à quand elle tient, en AAAA-MM-JJ. Une réservation sans achat
   *  bloquerait l'article pour toujours ; elle se relâche d'elle-même. */
  jusquA: string
}

export interface ArticleEnvie {
  /** Combien la personne en souhaite. Six verres, un seul vase. */
  souhaitee: number
  reservations: Reservation[]
}

/** Combien il en reste à offrir, aujourd'hui.
 *
 *  Les réservations périmées ne comptent plus : sans cela, un invité qui
 *  clique et n'achète jamais bloque l'article jusqu'à la fin des temps, et la
 *  liste ment à tous les suivants. */
export function resteAOffrir(article: ArticleEnvie, aujourdHui: string): number {
  const prises = (article.reservations ?? [])
    .filter(r => r.jusquA >= aujourdHui)
    .reduce((n, r) => n + Math.max(0, r.quantite || 0), 0)
  return Math.max(0, (article.souhaitee || 0) - prises)
}

/** Vrai quand plus rien n'est à prendre. */
export const toutPris = (article: ArticleEnvie, aujourdHui: string): boolean =>
  resteAOffrir(article, aujourdHui) <= 0

/** Ce que la page d'une liste annonce en tête : « 4 offerts sur 11 ».
 *
 *  Le propriétaire voit le même chiffre que ses invités. Ce qu'il ne voit
 *  jamais, c'est QUI a pris quoi — c'est ce qui garde la surprise, et ça ne se
 *  calcule pas ici : rien dans ce module ne porte de nom. */
export function bilanListe(articles: ArticleEnvie[], aujourdHui: string): {
  souhaites: number
  offerts: number
  restants: number
} {
  const souhaites = articles.reduce((n, a) => n + Math.max(0, a.souhaitee || 0), 0)
  const restants = articles.reduce((n, a) => n + resteAOffrir(a, aujourdHui), 0)
  return { souhaites, offerts: souhaites - restants, restants }
}

/** La phrase du bilan, en français courant. */
export function bilanLisible(
  b: { souhaites: number; offerts: number; restants: number },
  lang: 'fr' | 'en' = 'fr',
): string {
  if (!b.souhaites) {
    return lang === 'en' ? 'This list is still empty.' : 'Cette liste est encore vide.'
  }
  if (!b.restants) {
    return lang === 'en' ? 'Everything has been taken.' : 'Tout a été offert.'
  }
  if (lang === 'en') {
    return `${b.offerts} of ${b.souhaites} taken — ${b.restants} still available.`
  }
  return b.offerts === 0
    ? `${b.souhaites} article${b.souhaites > 1 ? 's' : ''} à offrir.`
    : `${b.offerts} sur ${b.souhaites} déjà offert${b.offerts > 1 ? 's' : ''} — il en reste ${b.restants}.`
}

/** Combien de jours une réservation tient.
 *
 *  Trente : assez pour commander, recevoir et offrir ; trop peu pour qu'un
 *  clic distrait gèle un article pendant six mois. */
export const RESERVATION_JOURS = 30

/** Une occasion, pour le titre par défaut de la liste. */
export type OccasionEnvie = 'mariage' | 'naissance' | 'anniversaire' | 'autre'

export const OCCASIONS: { cle: OccasionEnvie; fr: string; en: string }[] = [
  { cle: 'mariage', fr: 'Mariage', en: 'Wedding' },
  { cle: 'naissance', fr: 'Naissance', en: 'Birth' },
  { cle: 'anniversaire', fr: 'Anniversaire', en: 'Birthday' },
  { cle: 'autre', fr: 'Autre occasion', en: 'Other' },
]

/** Le titre qu'on propose quand la personne n'en donne pas.
 *
 *  « Liste de Marie » se lit mieux que « Liste #4821 », et c'est ce que ses
 *  invités verront en ouvrant le lien. */
export function titreParDefaut(prenom: string, occasion: OccasionEnvie, lang: 'fr' | 'en' = 'fr'): string {
  const nom = (prenom ?? '').trim() || (lang === 'en' ? 'my' : 'ma')
  if (lang === 'en') {
    switch (occasion) {
      case 'mariage': return `${nom}’s wedding list`
      case 'naissance': return `${nom}’s baby list`
      case 'anniversaire': return `${nom}’s birthday list`
      default: return `${nom}’s wish list`
    }
  }
  switch (occasion) {
    case 'mariage': return `Liste de mariage de ${nom}`
    case 'naissance': return `Liste de naissance de ${nom}`
    case 'anniversaire': return `Liste d’anniversaire de ${nom}`
    default: return `Liste de ${nom}`
  }
}

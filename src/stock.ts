// L'état de stock d'une fiche de boutique, dit d'une seule façon.
//
// Trois endroits en avaient besoin et le calculaient chacun à leur manière :
// la grille du site, la fiche produit, et maintenant le passage qui prévient
// « c'est revenu ». Deux lectures qui divergent d'un signe, et l'on écrit à
// quelqu'un pour un article toujours épuisé — ou, pire, on ne lui écrit pas.
//
// La règle tient en une ligne et mérite d'être écrite une fois :
//
//   `stock === null` veut dire « non suivi », donc TOUJOURS disponible.
//
// Ce n'est pas la même chose que zéro. Un commerce qui ne compte pas ses
// stocks laisse le champ vide ; le confondre avec une rupture masquerait tout
// son catalogue.

export interface VarianteStock {
  label: string
  stock: number | null
}

export interface FicheStock {
  stock: number | null
  variants?: VarianteStock[] | null
}

/** Le stock d'une fiche, ou d'une de ses variantes.
 *
 *  `null` = non suivi. Une variante inconnue rend `0` plutôt que le stock du
 *  produit : mieux vaut annoncer épuisé à tort que vendre ce qu'on n'a pas. */
export function stockDe(fiche: FicheStock, variante?: string | null): number | null {
  const v = (variante ?? '').trim()
  if (v) {
    const trouvee = (fiche.variants ?? []).find(x => x.label === v)
    return trouvee ? trouvee.stock : 0
  }
  // Sans variante demandée, une fiche qui en a se juge sur la meilleure : tant
  // qu'une taille reste, l'article n'est pas épuisé.
  const variantes = fiche.variants ?? []
  if (variantes.length) {
    if (variantes.some(x => x.stock === null)) return null
    return variantes.reduce((m, x) => Math.max(m, x.stock ?? 0), 0)
  }
  return fiche.stock
}

/** Épuisé ? `null` ne l'est jamais. */
export function enRupture(fiche: FicheStock, variante?: string | null): boolean {
  const s = stockDe(fiche, variante)
  return s !== null && s <= 0
}

/** Est-ce revenu entre ces deux états ?
 *
 *  C'est la question du passage qui prévient, et elle n'est pas « y a-t-il du
 *  stock ? ». Une fiche disponible qui le reste ne doit réveiller personne :
 *  sans cette comparaison, chaque enregistrement du catalogue renverrait le
 *  même message aux mêmes personnes. */
export function revenuEnStock(
  avant: FicheStock | null | undefined,
  apres: FicheStock,
  variante?: string | null,
): boolean {
  if (!avant) return false
  return enRupture(avant, variante) && !enRupture(apres, variante)
}

/** Les variantes d'une fiche, étiquette par étiquette, avec ce qui reste.
 *  Sert à l'écran du commerce : savoir QUELLE taille on attend vaut mieux que
 *  savoir que trois personnes attendent l'article. */
export function etiquettesEnRupture(fiche: FicheStock): string[] {
  return (fiche.variants ?? []).filter(v => v.stock !== null && v.stock <= 0).map(v => v.label)
}

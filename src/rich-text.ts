import { z } from 'zod'

// Texte riche : titres et paragraphes, gras/italique/lien.
//
// Le contenu riche n'est JAMAIS stocké en HTML. Un champ « texte » riche vit
// dans une paire de clés :
//
//   text      — la version texte brut, toujours présente (dérivée du riche)
//   textRich  — les blocs structurés, présents seulement si l'utilisateur a
//               réellement mis en forme le champ
//
// Deux raisons à ce doublon plutôt qu'un seul champ qui changerait de type :
//
//  · un gabarit qui ne sait pas encore afficher le riche lit `text` et rend du
//    texte brut — appauvri, jamais cassé. Changer un client de gabarit ne peut
//    donc pas casser sa page, et les 35 types × 11 gabarits n'ont pas à migrer
//    d'un bloc ;
//  · tout ce qui lit déjà ces champs pour autre chose que l'affichage (résumés
//    SEO, extraits, recherche) continue de fonctionner sans rien savoir du
//    riche.
//
// Stocker du HTML aurait demandé de l'assainir à chaque affichage ; ici le
// rendu est construit balise par balise depuis une structure validée, il n'y a
// pas de HTML à analyser, donc pas de surface d'injection.

/** Couleurs applicables à un fragment.
 *
 *  Volontairement symboliques, jamais des codes couleur : c'est le gabarit qui
 *  décide à quoi ressemble « l'accent ». Un client qui change la couleur de
 *  son site voit son texte suivre, et un texte écrit sur un gabarit puis
 *  déplacé sur un autre reste cohérent — ce qu'un `#DF674C` en base ne
 *  permettrait pas. C'est aussi ce qui évite de stocker du style arbitraire. */
export type RichCouleur = 'accent' | 'fort' | 'sourdine'

// Libellés courts : ils vivent dans des boutons côte à côte, sous un intitulé
// qui dit déjà « Couleur » ou « Surlignage ».
export const RICH_COULEURS: { valeur: RichCouleur; label: string }[] = [
  { valeur: 'accent', label: 'Site' },
  { valeur: 'fort', label: 'Renforcé' },
  { valeur: 'sourdine', label: 'Atténué' },
]

/** Taille du texte d'un bloc, relative à celle du gabarit — jamais une valeur
 *  en pixels : « grand » n'a pas la même mesure sur un gabarit de restaurant
 *  et sur un gabarit industriel, et c'est très bien ainsi. */
export type RichTaille = 'petit' | 'normal' | 'grand'

export const RICH_TAILLES: { valeur: RichTaille; label: string }[] = [
  { valeur: 'petit', label: 'Petit' },
  { valeur: 'normal', label: 'Normal' },
  { valeur: 'grand', label: 'Grand' },
]

export type RichAlign = 'left' | 'center' | 'right' | 'justify'

export const RICH_ALIGNEMENTS: { valeur: RichAlign; label: string }[] = [
  { valeur: 'left', label: 'Gauche' },
  { valeur: 'center', label: 'Centré' },
  { valeur: 'right', label: 'Droite' },
  { valeur: 'justify', label: 'Justifié' },
]

/** Fragment de texte homogène : même mise en forme du début à la fin. */
export interface RichRun {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  /** Lien ; restreint aux schémas sûrs (voir HREF_AUTORISE). */
  href?: string
  couleur?: RichCouleur
  /** Surlignage, dans la même palette symbolique que la couleur. */
  surlignage?: RichCouleur
}

/** Bloc de premier niveau : paragraphe, titre de niveau 1 à 4, ou citation. */
export interface RichBlock {
  type: 'paragraph' | 'heading' | 'quote'
  level?: 1 | 2 | 3 | 4
  align?: RichAlign
  taille?: RichTaille
  runs: RichRun[]
}

/** Liens acceptés : chemin interne, adresse complète http(s), courriel,
 *  téléphone, ancre. Tout le reste — `javascript:`, `data:`, `vbscript:` — est
 *  refusé. Le `(?!\/)` écarte `//exemple.test` (protocole implicite). */
const HREF_AUTORISE = /^(?:\/(?!\/)|https?:\/\/|mailto:|tel:|#)/i

/** Vrai si ce lien peut être rendu tel quel. Exporté pour que l'éditeur
 *  applique la même règle côté navigateur, avant même l'enregistrement. */
export function lienAutorise(href: string): boolean {
  return HREF_AUTORISE.test(href.trim())
}

// Bornes de taille : un contenu de site, pas un traitement de texte. Elles
// évitent qu'un copier-coller malheureux (ou malveillant) fasse gonfler une
// ligne de base et le message envoyé à l'aperçu.
const MAX_CARACTERES_FRAGMENT = 2000
const MAX_FRAGMENTS_BLOC = 200
const MAX_BLOCS = 100

const couleurSchema = z.enum(['accent', 'fort', 'sourdine'])

const richRunSchema = z.object({
  text: z.string().max(MAX_CARACTERES_FRAGMENT),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  strike: z.boolean().optional(),
  href: z.string().max(500).refine(lienAutorise, 'Lien non autorisé.').optional(),
  couleur: couleurSchema.optional(),
  surlignage: couleurSchema.optional(),
})

const richBlockSchema = z.object({
  type: z.enum(['paragraph', 'heading', 'quote']),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  align: z.enum(['left', 'center', 'right', 'justify']).optional(),
  taille: z.enum(['petit', 'normal', 'grand']).optional(),
  runs: z.array(richRunSchema).max(MAX_FRAGMENTS_BLOC),
})

export const richTextSchema = z.array(richBlockSchema).max(MAX_BLOCS)

/** Champs longs qui peuvent recevoir une version riche. Chacun gagne une clé
 *  `<champ>Rich` dans le schéma (voir sectionContentSchema). La liste est
 *  volontairement courte : un titre ou un libellé de bouton n'a pas à porter
 *  des paragraphes. */
export const CHAMPS_RICHES = [
  'text', 'body', 'description', 'intro', 'subtext', 'statement', 'excerpt', 'notes', 'bio',
] as const

/** Nom de la clé riche associée à un champ (`text` → `textRich`). */
export const cleRiche = (champ: string) => `${champ}Rich`

/** Texte brut d'un contenu riche — ce qu'on écrit dans le champ jumeau pour
 *  que les gabarits qui ignorent le riche, et tout ce qui lit ces champs pour
 *  du résumé ou du SEO, continuent d'afficher quelque chose de juste. */
export function richVersTexte(blocs: RichBlock[]): string {
  return blocs
    .map(b => b.runs.map(r => r.text).join(''))
    .filter(ligne => ligne.trim())
    .join('\n')
}

/** Blocs correspondant à un texte brut — un paragraphe par ligne non vide.
 *  Sert de point de départ quand on passe un champ simple en mode riche. */
export function texteVersRich(texte: string): RichBlock[] {
  return texte
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => ({ type: 'paragraph' as const, runs: [{ text: l }] }))
}

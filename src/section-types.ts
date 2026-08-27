import { z } from 'zod'
import type { SectionType } from './types'
import { CHAMPS_RICHES, cleRiche, richTextSchema } from './rich-text'

export interface RepeatableFieldConfig {
  key: string
  label: string
  kind: 'text' | 'textarea' | 'image' | 'date' | 'boolean'
}

export interface SectionVariant {
  key: string
  label: string
}

interface SectionTypeDefBase {
  key: SectionType
  label: string
  /** Mises en page disponibles pour ce type — même contenu, présentation
   * différente (voir SectionInstance.variant). Toujours au moins une entrée. */
  variants: SectionVariant[]
  /** Choix automatique de la variante d'après le contenu (ex. peu d'éléments
   * → liste, beaucoup → grille), utilisé quand aucune variante n'a été
   * choisie explicitement (SectionInstance.variant absent/null). Optionnel :
   * sans ça, resolveVariant() retombe sur la 1re variante déclarée. */
  autoVariant?: (content: unknown) => string
}

interface RepeatableSectionTypeDef extends SectionTypeDefBase {
  kind: 'repeatable'
  fields: RepeatableFieldConfig[]
  defaultContent: { items: Record<string, string | boolean>[] }
}

interface SingletonSectionTypeDef extends SectionTypeDefBase {
  kind: 'singleton'
  defaultContent: Record<string, unknown>
}

export type SectionTypeDef = RepeatableSectionTypeDef | SingletonSectionTypeDef

const DEFAULT_VARIANT: SectionVariant[] = [{ key: 'default', label: 'Standard' }]

// L'ordre ici sert de position par défaut lors de la bascule des données
// existantes (voir migration 115_migrate_site_content.sql côté moontain-gallerie).
export const SECTION_TYPES: Record<SectionType, SectionTypeDef> = {
  hero: {
    key: 'hero', label: 'Bannière', kind: 'singleton',
    variants: [{ key: 'default', label: 'Standard' }, { key: 'grid', label: 'Avec grille de projets' }, { key: 'cinematic', label: 'Plein écran (cinématique)' }, { key: 'header', label: 'En-tête de page' }],
    defaultContent: { headline: '', subtext: '', images: [] },
  },
  featured: {
    key: 'featured', label: 'Réalisation mise en avant', kind: 'singleton', variants: DEFAULT_VARIANT,
    defaultContent: { name: '', location: '', image: '' },
  },
  stats: {
    key: 'stats', label: 'Chiffres clés', kind: 'repeatable', variants: DEFAULT_VARIANT,
    fields: [
      { key: 'value', label: 'Valeur', kind: 'text' },
      { key: 'label', label: 'Libellé', kind: 'text' },
    ],
    defaultContent: { items: [] },
  },
  values: {
    key: 'values', label: 'Valeurs', kind: 'repeatable', variants: DEFAULT_VARIANT,
    fields: [
      { key: 'label', label: 'Libellé (forme courte)', kind: 'text' },
      { key: 'num', label: 'Numéro affiché', kind: 'text' },
      { key: 'title', label: 'Titre (forme longue)', kind: 'text' },
      { key: 'text', label: 'Texte', kind: 'textarea' },
      { key: 'image', label: 'Image', kind: 'image' },
    ],
    defaultContent: { items: [] },
  },
  features: {
    key: 'features', label: 'Pourquoi nous', kind: 'repeatable',
    variants: [{ key: 'default', label: 'Cartes' }, { key: 'split', label: 'Image + liste numérotée' }, { key: 'columns', label: 'Grille 2 colonnes à filets' }, { key: 'editorial', label: 'Navigation à images (survol)' }],
    fields: [
      { key: 'title', label: 'Titre', kind: 'text' },
      { key: 'description', label: 'Description / sous-titre', kind: 'textarea' },
      { key: 'image', label: 'Image (fond au survol en variante Navigation)', kind: 'image' },
      { key: 'caption', label: 'Texte alternatif de l’image (accessibilité)', kind: 'text' },
      { key: 'eyebrow', label: 'Numéro (ex. 01)', kind: 'text' },
      { key: 'href', label: 'Lien (ex. /galerie/collections)', kind: 'text' },
    ],
    defaultContent: { items: [] },
  },
  process: {
    key: 'process', label: 'Étapes', kind: 'repeatable', variants: DEFAULT_VARIANT,
    fields: [
      { key: 'title', label: 'Titre', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'textarea' },
    ],
    defaultContent: { items: [] },
  },
  services: {
    key: 'services', label: 'Services', kind: 'repeatable',
    // Preuve de concept du mécanisme de variantes (étape 6) : mêmes champs,
    // deux mises en page. Voir vertdaltitude-site/app/templates/aurora/sections/Services.tsx.
    variants: [
      { key: 'grid', label: 'Grille de cartes' },
      { key: 'list', label: 'Liste horizontale' },
    ],
    // Peu d'éléments → liste (chaque élément a plus de place), beaucoup →
    // grille (reste compact). Ignoré dès qu'une variante est choisie
    // explicitement dans le CMS.
    autoVariant: content => {
      const n = (content as { items?: unknown[] } | undefined)?.items?.length ?? 0
      return n > 0 && n <= 3 ? 'list' : 'grid'
    },
    fields: [
      { key: 'title', label: 'Titre', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'image', label: 'Image', kind: 'image' },
    ],
    defaultContent: { items: [] },
  },
  testimonials: {
    key: 'testimonials', label: 'Avis', kind: 'repeatable', variants: DEFAULT_VARIANT,
    fields: [
      { key: 'author', label: 'Auteur', kind: 'text' },
      { key: 'location', label: 'Lieu', kind: 'text' },
      { key: 'text', label: 'Texte', kind: 'textarea' },
    ],
    defaultContent: { items: [] },
  },
  projects: {
    key: 'projects', label: 'Réalisations', kind: 'repeatable', variants: [{ key: 'default', label: 'Grille' }, { key: 'filter', label: 'Grille filtrable (onglets)' }, { key: 'showcase', label: 'Liste grand format alternée' }, { key: 'collage', label: 'Cartes collage (3 images)' }],
    fields: [
      { key: 'name', label: 'Nom', kind: 'text' },
      { key: 'location', label: 'Lieu', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'image', label: 'Image', kind: 'image' },
      { key: 'slug', label: 'Lien vers la fiche projet (slug, optionnel)', kind: 'text' },
    ],
    defaultContent: { items: [] },
  },
  beforeAfter: {
    key: 'beforeAfter', label: 'Avant/Après', kind: 'repeatable', variants: DEFAULT_VARIANT,
    fields: [
      { key: 'title', label: 'Titre', kind: 'text' },
      { key: 'before', label: 'Avant', kind: 'image' },
      { key: 'after', label: 'Après', kind: 'image' },
    ],
    defaultContent: { items: [] },
  },
  posts: {
    key: 'posts', label: 'Blog', kind: 'repeatable', variants: DEFAULT_VARIANT,
    fields: [
      { key: 'title', label: 'Titre', kind: 'text' },
      { key: 'excerpt', label: 'Résumé', kind: 'textarea' },
      { key: 'body', label: 'Contenu', kind: 'textarea' },
      { key: 'image', label: 'Image', kind: 'image' },
      { key: 'caption', label: 'Texte alternatif de l’image (accessibilité)', kind: 'text' },
      { key: 'date', label: 'Date', kind: 'date' },
    ],
    defaultContent: { items: [] },
  },
  cta: {
    key: 'cta', label: 'Bloc final', kind: 'singleton',
    variants: [{ key: 'default', label: 'Bannière image' }, { key: 'split', label: 'Deux colonnes (texte + boutons)' }, { key: 'centered', label: 'Centré (page interne)' }],
    defaultContent: { title: '', text: '', button: '' },
  },
  availability: {
    key: 'availability', label: 'Disponibilité (bandeau)', kind: 'singleton', variants: DEFAULT_VARIANT,
    defaultContent: { text: '', highlight: '', linkLabel: '', linkHref: '' },
  },
  contact: {
    key: 'contact', label: 'Contact', kind: 'singleton', variants: DEFAULT_VARIANT,
    defaultContent: { title: '', subtitle: '' },
  },
  faq: {
    key: 'faq', label: 'Questions fréquentes', kind: 'repeatable', variants: DEFAULT_VARIANT,
    fields: [
      { key: 'question', label: 'Question', kind: 'text' },
      { key: 'answer', label: 'Réponse', kind: 'textarea' },
    ],
    defaultContent: { items: [] },
  },
  team: {
    key: 'team', label: 'Équipe', kind: 'repeatable', variants: DEFAULT_VARIANT,
    fields: [
      { key: 'name', label: 'Nom', kind: 'text' },
      { key: 'role', label: 'Rôle', kind: 'text' },
      { key: 'image', label: 'Photo', kind: 'image' },
      { key: 'bio', label: 'Bio', kind: 'textarea' },
    ],
    defaultContent: { items: [] },
  },
  logos: {
    key: 'logos', label: 'Logos partenaires', kind: 'repeatable', variants: DEFAULT_VARIANT,
    fields: [
      { key: 'name', label: 'Nom', kind: 'text' },
      { key: 'image', label: 'Logo', kind: 'image' },
      { key: 'url', label: 'Lien (optionnel)', kind: 'text' },
    ],
    defaultContent: { items: [] },
  },
  pricing: {
    key: 'pricing', label: 'Tarifs', kind: 'repeatable', variants: DEFAULT_VARIANT,
    fields: [
      { key: 'name', label: 'Nom de l’offre', kind: 'text' },
      { key: 'price', label: 'Prix', kind: 'text' },
      { key: 'period', label: 'Période (ex. /mois)', kind: 'text' },
      { key: 'features', label: 'Avantages (une ligne = un avantage)', kind: 'textarea' },
      { key: 'highlighted', label: 'Mise en avant', kind: 'boolean' },
      { key: 'image', label: 'Image (certains gabarits l’affichent)', kind: 'image' },
      { key: 'caption', label: 'Texte alternatif de l’image (accessibilité)', kind: 'text' },
    ],
    defaultContent: { items: [] },
  },
  gallery: {
    key: 'gallery', label: 'Galerie', kind: 'repeatable',
    variants: [{ key: 'default', label: 'Mosaïque' }, { key: 'strip', label: 'Bande pleine largeur' }],
    fields: [
      { key: 'image', label: 'Image', kind: 'image' },
      { key: 'caption', label: 'Légende (optionnel)', kind: 'text' },
    ],
    defaultContent: { items: [] },
  },
  video: {
    key: 'video', label: 'Vidéo', kind: 'singleton', variants: DEFAULT_VARIANT,
    defaultContent: { title: '', videoUrl: '', poster: '' },
  },
  map: {
    key: 'map', label: 'Carte / localisation', kind: 'singleton', variants: DEFAULT_VARIANT,
    defaultContent: { title: '', address: '' },
  },
  story: {
    key: 'story', label: 'Histoire (image + texte)', kind: 'singleton', variants: DEFAULT_VARIANT,
    defaultContent: { eyebrow: '', title: '', text: '', image: '' },
  },
  manifesto: {
    key: 'manifesto', label: 'Manifeste', kind: 'singleton',
    variants: [{ key: 'default', label: 'Deux colonnes' }, { key: 'centered', label: 'Centré (bande sombre)' }, { key: 'lead', label: 'Intro (chapô + paragraphe)' }],
    defaultContent: { eyebrow: '', statement: '', emphasis: '', signature: '', body: '', linkLabel: '', linkHref: '' },
  },
  marquee: {
    key: 'marquee', label: 'Bandeau défilant', kind: 'repeatable', variants: DEFAULT_VARIANT,
    fields: [{ key: 'label', label: 'Texte', kind: 'text' }],
    defaultContent: { items: [] },
  },
  rooms: {
    key: 'rooms', label: 'Chambres', kind: 'repeatable',
    // Deux mises en page : grille compacte (accueil) ou grandes lignes
    // détaillées (page « Nos chambres »). Voir hoteru/sections/Rooms.tsx.
    variants: [
      { key: 'rows', label: 'Grandes lignes détaillées' },
      { key: 'grid', label: 'Grille compacte' },
    ],
    fields: [
      { key: 'name', label: 'Nom de la chambre', kind: 'text' },
      { key: 'image', label: 'Image', kind: 'image' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'price', label: 'Prix', kind: 'text' },
      { key: 'period', label: 'Période (ex. /nuit)', kind: 'text' },
      { key: 'beds', label: 'Lits (ex. 2 lits)', kind: 'text' },
      { key: 'baths', label: 'Salles de bain (ex. 2)', kind: 'text' },
      { key: 'persons', label: 'Personnes (ex. 4)', kind: 'text' },
      { key: 'size', label: 'Surface (ex. 60 m²)', kind: 'text' },
      { key: 'features', label: 'Équipements (une ligne = un équipement)', kind: 'textarea' },
    ],
    defaultContent: { items: [] },
  },
  deals: {
    key: 'deals', label: 'Offres / forfaits', kind: 'repeatable', variants: DEFAULT_VARIANT,
    fields: [
      { key: 'name', label: 'Nom de l’offre', kind: 'text' },
      { key: 'image', label: 'Image', kind: 'image' },
      { key: 'price', label: 'Prix', kind: 'text' },
      { key: 'rating', label: 'Note (ex. 4.9)', kind: 'text' },
      { key: 'reviews', label: 'Avis (ex. 8 avis)', kind: 'text' },
      { key: 'expiry', label: 'Expiration (ex. Expire le 30/12)', kind: 'text' },
      { key: 'discount', label: 'Remise (ex. -20 %)', kind: 'text' },
    ],
    defaultContent: { items: [] },
  },
  booking: {
    key: 'booking', label: 'Réservation (formulaire)', kind: 'singleton', variants: DEFAULT_VARIANT,
    defaultContent: { title: '', image: '' },
  },
  properties: {
    key: 'properties', label: 'Biens immobiliers', kind: 'repeatable',
    // Trois mises en page : grille de cartes (listing), grandes lignes, ou
    // page détail complète (un seul bien, style « single project »).
    variants: [
      { key: 'grid', label: 'Grille de cartes' },
      { key: 'rows', label: 'Grandes lignes détaillées' },
      { key: 'detail', label: 'Page détail (un bien)' },
    ],
    fields: [
      { key: 'title', label: 'Titre du bien', kind: 'text' },
      { key: 'image', label: 'Image', kind: 'image' },
      { key: 'location', label: 'Localisation', kind: 'text' },
      { key: 'price', label: 'Prix', kind: 'text' },
      { key: 'status', label: 'Statut (À vendre, Vendu…)', kind: 'text' },
      { key: 'beds', label: 'Chambres (ex. 4 chambres)', kind: 'text' },
      { key: 'baths', label: 'Salles de bain (ex. 3)', kind: 'text' },
      { key: 'surface', label: 'Surface (ex. 240 m²)', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'slug', label: 'Page détail (URL, ex. villa-contemporaine)', kind: 'text' },
    ],
    defaultContent: { items: [] },
  },
  wines: {
    key: 'wines', label: 'Vins / crus', kind: 'repeatable',
    variants: [
      { key: 'grid', label: 'Grille de bouteilles' },
      { key: 'rows', label: 'Grandes lignes' },
      { key: 'detail', label: 'Page détail (un vin)' },
    ],
    fields: [
      { key: 'name', label: 'Nom du vin', kind: 'text' },
      { key: 'image', label: 'Image (bouteille)', kind: 'image' },
      { key: 'vintage', label: 'Millésime (ex. 2019)', kind: 'text' },
      { key: 'region', label: 'Appellation / région', kind: 'text' },
      { key: 'grape', label: 'Cépage', kind: 'text' },
      { key: 'price', label: 'Prix', kind: 'text' },
      { key: 'notes', label: 'Notes de dégustation', kind: 'textarea' },
      { key: 'slug', label: 'Page détail (URL)', kind: 'text' },
    ],
    defaultContent: { items: [] },
  },

  // ── Blocs « module » : intègrent un widget interactif (réservation,
  // billetterie…) dans la page. Contenu = simple en-tête (titre + intro) affiché
  // au-dessus du widget ; le widget lui-même est rendu par moontain-sites.
  moduleBooking: {
    key: 'moduleBooking', label: 'Module — Réservation', kind: 'singleton', variants: DEFAULT_VARIANT,
    // Les options d'affichage restent absentes du contenu par défaut : côté
    // rendu, « non renseigné » vaut « affiché ». Un bloc créé aujourd'hui et un
    // bloc créé avant l'ajout de ces réglages se comportent donc pareil.
    defaultContent: { title: 'Réserver', intro: '' },
  },
  moduleTickets: {
    key: 'moduleTickets', label: 'Module — Billetterie', kind: 'singleton', variants: DEFAULT_VARIANT,
    defaultContent: { title: 'Billetterie', intro: '' },
  },
  moduleGiftcard: {
    key: 'moduleGiftcard', label: 'Module — Bon cadeau', kind: 'singleton', variants: DEFAULT_VARIANT,
    defaultContent: { title: 'Offrir un bon cadeau', intro: '' },
  },
  moduleMembership: {
    key: 'moduleMembership', label: 'Module — Adhésion', kind: 'singleton', variants: DEFAULT_VARIANT,
    defaultContent: { title: 'Devenir membre', intro: '' },
  },
  moduleReviews: {
    key: 'moduleReviews', label: 'Module — Avis', kind: 'singleton', variants: DEFAULT_VARIANT,
    defaultContent: { title: 'Ils nous ont fait confiance', intro: '' },
  },
  // Bloc « Formulaire » : référence un formulaire (défini dans le CMS) par son id.
  // L'en-tête (titre/intro) est optionnel ; les champs viennent du formulaire.
  form: {
    key: 'form', label: 'Formulaire', kind: 'singleton', variants: DEFAULT_VARIANT,
    defaultContent: { formId: '', title: '', intro: '' },
  },
}

const repeatableItemSchema = (fields: RepeatableFieldConfig[]) =>
  z.object(Object.fromEntries(fields.map(f => [
    f.key, f.kind === 'boolean' ? z.boolean().optional() : z.string().optional(),
  ]))).passthrough()

const repeatableContentSchema = (fields: RepeatableFieldConfig[]) =>
  // `ratio` : format d'image commun à la section (recadrage object-fit côté
  // rendu, voir mapSections dans moontain-sites). '' / 'auto' = format d'origine.
  z.object({ items: z.array(repeatableItemSchema(fields)).default([]), ratio: z.string().optional() })

const singletonSchemas: Partial<Record<SectionType, z.ZodTypeAny>> = {
  hero: z.object({
    headline: z.string().optional(),
    subtext: z.string().optional(),
    images: z.array(z.string()).optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    kicker: z.string().optional(),
    cta: z.string().optional(),
    cta2: z.string().optional(),
    subline: z.string().optional(),
    ctaHref: z.string().optional(),
    grid: z.array(z.object({ image: z.string().optional(), title: z.string().optional(), category: z.string().optional(), href: z.string().optional() })).optional(),
    footerLeft: z.string().optional(),
    footerRight: z.string().optional(),
    ratio: z.string().optional(),
  }),
  featured: z.object({
    name: z.string().optional(),
    location: z.string().optional(),
    image: z.string().optional(),
    ratio: z.string().optional(),
  }),
  cta: z.object({
    title: z.string().optional(),
    text: z.string().optional(),
    button: z.string().optional(),
    image: z.string().optional(),
    eyebrow: z.string().optional(),
    emphasis: z.string().optional(),
    buttonHref: z.string().optional(),
    button2: z.string().optional(),
    button2Href: z.string().optional(),
  }),
  availability: z.object({
    text: z.string().optional(),
    highlight: z.string().optional(),
    linkLabel: z.string().optional(),
    linkHref: z.string().optional(),
  }),
  contact: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
  }),
  manifesto: z.object({
    eyebrow: z.string().optional(),
    statement: z.string().optional(),
    emphasis: z.string().optional(),
    signature: z.string().optional(),
    body: z.string().optional(),
    linkLabel: z.string().optional(),
    linkHref: z.string().optional(),
  }),
  video: z.object({
    title: z.string().optional(),
    videoUrl: z.string().optional(),
    poster: z.string().optional(),
    ratio: z.string().optional(),
  }),
  map: z.object({
    title: z.string().optional(),
    address: z.string().optional(),
  }),
  story: z.object({
    eyebrow: z.string().optional(),
    title: z.string().optional(),
    text: z.string().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    ratio: z.string().optional(),
  }),
  booking: z.object({
    title: z.string().optional(),
    image: z.string().optional(),
    ratio: z.string().optional(),
  }),
  moduleBooking: z.object({
    title: z.string().optional(),
    intro: z.string().optional(),
    // Réglages d'affichage du widget. Absent = affiché / demandé.
    showPrice: z.boolean().optional(),
    showDuration: z.boolean().optional(),
    showDeposit: z.boolean().optional(),
    showLive: z.boolean().optional(),
    showPolicy: z.boolean().optional(),
    askPhone: z.boolean().optional(),
    askNote: z.boolean().optional(),
  }),
  moduleTickets: z.object({ title: z.string().optional(), intro: z.string().optional() }),
  moduleGiftcard: z.object({ title: z.string().optional(), intro: z.string().optional() }),
  moduleMembership: z.object({ title: z.string().optional(), intro: z.string().optional() }),
  moduleReviews: z.object({ title: z.string().optional(), intro: z.string().optional() }),
  form: z.object({ formId: z.string().optional(), title: z.string().optional(), intro: z.string().optional() }),
}

// Style de bloc (panneau CMS « Fond/Espacement/Alignement/Coins arrondis »,
// voir mapSections dans moontain-sites) : transversal à tous les types de
// section, donc ajouté une seule fois ici plutôt que dans chaque schéma.
const blockStyleSchema = z.object({
  bg: z.string().optional(),
  pad: z.string().optional(),
  radius: z.boolean().optional(),
  align: z.string().optional(),
}).optional()

/** Schéma de validation du contenu d'une section, pour vérifier côté serveur
 * ce qui est écrit en base avant de l'accepter (voir server actions
 * updateSiteSectionContent dans moontain-gallerie/espace-clients).
 *
 * Un objet zod sans .passthrough() retire silencieusement (sans erreur) les
 * champs qu'il ne déclare pas : _style disparaissait donc à chaque
 * enregistrement, alors que le panneau de style l'écrivait bien. */
export function sectionContentSchema(type: SectionType): z.ZodTypeAny {
  const def = SECTION_TYPES[type]
  const base = def.kind === 'repeatable' ? repeatableContentSchema(def.fields) : (singletonSchemas[type] ?? z.record(z.unknown()))
  // Mêmes raisons pour les clés riches (`textRich`…) que pour _style : sans
  // déclaration ici, elles seraient retirées à l'enregistrement. Les éléments
  // répétables (items[]) sont déjà en .passthrough(), ils n'en ont pas besoin.
  return base instanceof z.ZodObject
    ? base.extend({ _style: blockStyleSchema, ...CLES_RICHES_SCHEMA })
    : base
}

const CLES_RICHES_SCHEMA = Object.fromEntries(
  CHAMPS_RICHES.map(champ => [cleRiche(champ), richTextSchema.optional()]),
)

/** Variante effective d'une instance de section — retombe sur la 1re
 * variante déclarée si absente ou inconnue. */
export function resolveVariant(type: SectionType, variant?: string | null, content?: unknown): string {
  const def = SECTION_TYPES[type]
  if (variant && def.variants.some(v => v.key === variant)) return variant
  if (def.autoVariant) return def.autoVariant(content)
  return def.variants[0].key
}

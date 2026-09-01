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
    key: 'deals', label: 'Offres / forfaits', kind: 'repeatable',
    variants: [
      { key: 'default', label: 'Grille de cartes' },
      // Listes courtes côte à côte — « meilleures ventes / en promotion / mieux
      // notés » sur une boutique. Les entrées se répartissent par la colonne
      // qu'elles nomment ; celles qui n'en nomment aucune vont dans la première.
      { key: 'columns', label: 'Colonnes de petites fiches' },
    ],
    fields: [
      { key: 'name', label: 'Nom de l’offre', kind: 'text' },
      { key: 'image', label: 'Image', kind: 'image' },
      { key: 'price', label: 'Prix', kind: 'text' },
      { key: 'oldPrice', label: 'Prix barré (optionnel)', kind: 'text' },
      { key: 'rating', label: 'Note (ex. 4.9)', kind: 'text' },
      { key: 'reviews', label: 'Avis (ex. 8 avis)', kind: 'text' },
      { key: 'expiry', label: 'Expiration (ex. Expire le 30/12)', kind: 'text' },
      { key: 'discount', label: 'Remise (ex. -20 %)', kind: 'text' },
      { key: 'group', label: 'Colonne (variante « Colonnes »)', kind: 'text' },
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

  // Bloc « libre » : une suite ordonnée d'éléments (titre, paragraphe, image,
  // bouton, trait, espace) au lieu de champs nommés.
  //
  // C'est la réponse au « je veux juste poser un bouton ici », que trente-cinq
  // blocs typés ne couvrent pas — et la seule qu'on puisse donner sans passer
  // au placement absolu. Un élément posé en absolu n'a ni comportement mobile,
  // ni clé de traduction, ni place dans un gabarit ; en flux, il garde les
  // trois. Le prix à payer est qu'on ne place rien au pixel, ce qui est
  // exactement le prix qu'on veut payer.
  //
  // `singleton` et non `repeatable` : les éléments n'ont pas tous les mêmes
  // champs (une image n'a pas de niveau de titre, un espace n'a pas de texte),
  // et RepeatableListEditor affiche les mêmes champs pour tous. D'où un
  // éditeur dédié, comme pour la bannière ou le bloc histoire.
  //
  // Le nombre de colonnes est une VARIANTE et non un champ : c'est une mise en
  // page, pas un contenu, et les variantes se choisissent déjà à un endroit
  // connu de l'inspecteur.
  // Bloc « liste » : affiche une liste de données du site (biens, véhicules,
  // références) définie dans l'outil Listes du CMS.
  //
  // Il RÉFÉRENCE la liste par sa clé, il n'en copie pas les entrées. Modifier
  // une entrée doit se faire à un seul endroit — copier les données ici
  // ramènerait le défaut qu'on a déjà corrigé deux fois, sur l'adresse de
  // l'entreprise et sur le texte alternatif des images.
  //
  // Le bloc choisit AUSSI quels champs afficher. Une liste de biens peut avoir
  // douze colonnes ; en montrer douze sur une carte donne un tableau, pas une
  // page. On désigne donc un titre, un sous-titre, une image et un texte parmi
  // les champs disponibles.
  liste: {
    key: 'liste', label: 'Liste de données', kind: 'singleton',
    variants: [
      { key: 'grille', label: 'Grille de cartes' },
      { key: 'liste', label: 'Liste verticale' },
      { key: 'bande', label: 'Bande défilante' },
    ],
    defaultContent: { listeCle: '', titre: '', champTitre: '', champSousTitre: '', champImage: '', champTexte: '', tri: '', ordre: 'croissant', limite: 0 },
  },

  // La page de liens est un bloc, pas un gabarit à part : elle hérite ainsi de
  // l'éditeur, des versions, du contrôle avant publication et de l'aperçu, là
  // où une page spéciale aurait tout redemandé. Ce qui la distingue tient à la
  // page qui la porte (servie nue, sans en-tête ni pied), pas au bloc.
  liens: {
    key: 'liens', label: 'Page de liens', kind: 'singleton',
    variants: [
      { key: 'boutons', label: 'Boutons pleine largeur' },
      { key: 'cartes', label: 'Deux colonnes' },
    ],
    defaultContent: { avatar: '', nom: '', baseline: '', items: [], reseaux: [], fond: '', encre: 'auto', bouton: 'plein', forme: 'pilule', pied: '' },
  },

  libre: {
    key: 'libre', label: 'Bloc libre', kind: 'singleton',
    variants: [
      { key: 'flux', label: 'Une colonne' },
      { key: 'deux', label: 'Deux colonnes' },
      { key: 'trois', label: 'Trois colonnes' },
    ],
    defaultContent: { items: [] },
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

/** Un élément d'un bloc libre. `passthrough()` pour la même raison que les
 *  items répétables : un champ ajouté plus tard côté éditeur ne doit pas être
 *  retiré silencieusement à l'enregistrement — c'est le piège qui avait fait
 *  disparaître `_style`. */
const elementLibreSchema = z.object({
  type: z.enum([
    'titre', 'texte', 'image', 'bouton', 'trait', 'espace',
    'icone', 'video', 'galerie', 'compte', 'carte', 'reseaux', 'html',
  ]),
  texte: z.string().optional(),
  niveau: z.string().optional(),
  image: z.string().optional(),
  alt: z.string().optional(),
  href: z.string().optional(),
  apparence: z.string().optional(),
  taille: z.string().optional(),
  // ── Version 2 ─────────────────────────────────────────────────────────────
  icone: z.string().optional(),
  videoUrl: z.string().optional(),
  poster: z.string().optional(),
  images: z.array(z.object({ image: z.string().optional(), alt: z.string().optional() }).passthrough()).optional(),
  date: z.string().optional(),
  apres: z.string().optional(),
  adresse: z.string().optional(),
  reseaux: z.array(z.object({ nom: z.string().optional(), href: z.string().optional() }).passthrough()).optional(),
  html: z.string().optional(),
}).passthrough()

const singletonSchemas: Partial<Record<SectionType, z.ZodTypeAny>> = {
  liste: z.object({
    // Clé de la liste dans le CMS, pas ses données : le bloc référence.
    listeCle: z.string().optional(),
    titre: z.string().optional(),
    // Quels champs de la liste occupent quels rôles dans la carte.
    champTitre: z.string().optional(),
    champSousTitre: z.string().optional(),
    champImage: z.string().optional(),
    champTexte: z.string().optional(),
    // Le tri vit sur le BLOC et non sur la liste : la même liste peut être
    // montrée par prix ici et par date là. C'est ce que les champs typés
    // rendent possible.
    tri: z.string().optional(),
    ordre: z.string().optional(),
    limite: z.number().optional(),
  }),
  libre: z.object({
    items: z.array(elementLibreSchema).optional(),
  }),
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
/** Ce qu'un bloc peut décliner par appareil. Volontairement restreint à ce qui
 *  répare vraiment une mise en page étroite : masquer, resserrer, recentrer.
 *  Le fond et les coins n'y sont pas — les décliner ferait deux identités
 *  visuelles pour un même site, ce que toute la plateforme cherche à éviter. */
const declinaisonSchema = z.object({
  masque: z.boolean().optional(),
  pad: z.string().optional(),
  align: z.string().optional(),
}).optional()

const blockStyleSchema = z.object({
  bg: z.string().optional(),
  pad: z.string().optional(),
  radius: z.boolean().optional(),
  align: z.string().optional(),
  /** Entrée du bloc au défilement. Une INTENTION, pas une animation : le
   *  renderer la met en scène, et un bloc sans réglage garde exactement ce que
   *  le gabarit fait déjà — c'est ce qui permet d'ajouter ce champ sans faire
   *  bouger un seul site existant. Voir animation.ts côté moontain-sites. */
  anim: z.string().optional(),
  /** Déclinaisons descendantes : ce qui est réglé pour la tablette vaut aussi
   *  pour le mobile, sauf si le mobile le redit. C'est l'ordre dans lequel on
   *  regarde un site dans l'éditeur, donc celui qui surprend le moins. */
  tablette: declinaisonSchema,
  mobile: declinaisonSchema,
}).optional()

/** Point focal des images du bloc : chemin de l'image dans le contenu →
 *  position, en pourcentages (« 30% 20% »).
 *
 *  Le « format » d'une image est un recadrage CSS (`object-fit: cover`) : le
 *  fichier n'est jamais modifié, et le cadrage tombe au centre. Un portrait
 *  dans un emplacement large est donc coupé au front et au menton. Le point
 *  focal dit quelle partie de l'image doit rester visible.
 *
 *  Une seule clé pour tout le bloc, comme `_style`, plutôt qu'un champ jumeau
 *  par image : les images portent des noms différents selon les blocs
 *  (`image`, `poster`, `logo`, `items.0.image`…) et il aurait fallu les
 *  déclarer une par une — c'est exactement l'oubli qui faisait disparaître
 *  `titleRich` à l'enregistrement. */
const focalSchema = z.record(z.string(), z.string()).optional()

/** Réglages de style d'un bloc, tels que l'éditeur les écrit dans `_style`. */
export interface BlockStyleDeclinaison { masque?: boolean; pad?: string; align?: string }
export interface BlockStyleConfig {
  bg?: string
  pad?: string
  radius?: boolean
  align?: string
  anim?: string
  tablette?: BlockStyleDeclinaison
  mobile?: BlockStyleDeclinaison
}

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
    ? base.extend({ _style: blockStyleSchema, _focal: focalSchema, ...CLES_RICHES_SCHEMA })
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

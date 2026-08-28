// Contrat de données partagé entre les éditeurs (espace-clients,
// moontain-gallerie) et les templates de rendu (vertdaltitude-site).
// Les champs de chaque section couvrent l'union de ce qu'utilisent les
// templates LeafLife et Aurora (un template ignore simplement les champs
// qu'il ne rend pas) — vérifié contre le contenu réel en base (Borges
// Paysagisme), pas seulement contre le code des templates.

export type SectionType =
  | 'hero'
  | 'featured'
  | 'stats'
  | 'values'
  | 'features'
  | 'process'
  | 'services'
  | 'testimonials'
  | 'projects'
  | 'beforeAfter'
  | 'cta'
  | 'contact'
  | 'posts'
  | 'faq'
  | 'team'
  | 'logos'
  | 'pricing'
  | 'gallery'
  | 'video'
  | 'map'
  | 'story'
  | 'manifesto'
  | 'marquee'
  | 'availability'
  | 'rooms'
  | 'deals'
  | 'booking'
  | 'properties'
  | 'wines'
  | 'moduleBooking'
  | 'moduleTickets'
  | 'moduleGiftcard'
  | 'moduleMembership'
  | 'moduleReviews'
  | 'form'
  | 'libre'

/** Nature d'un élément d'un bloc libre. Volontairement peu de valeurs : une
 *  palette qui enfle redevient une page blanche, et c'est justement ce qu'un
 *  bloc typé évite. Ces six-là couvrent le « je veux juste poser un bouton
 *  ici » qui manquait, sans rouvrir la porte au placement absolu. */
export type ElementLibreType = 'titre' | 'texte' | 'image' | 'bouton' | 'trait' | 'espace'

/** Un élément d'un bloc libre. Tous les champs sont optionnels sauf `type` :
 *  un élément à peine posé doit pouvoir exister avant d'être rempli, comme un
 *  item de liste répétable. */
export interface ElementLibre {
  type: ElementLibreType
  /** Titre, paragraphe, ou libellé du bouton selon `type`. */
  texte?: string
  /** Titre seulement : 'h2' (défaut) ou 'h3'. Pas de h1 — il appartient à la
   *  bannière de la page, et deux h1 sur une page se disputent le sujet. */
  niveau?: string
  /** Image seulement. `alt` sert aux moteurs et aux lecteurs d'écran. */
  image?: string
  alt?: string
  /** Bouton seulement : destination, et apparence pleine ou en contour. */
  href?: string
  apparence?: string
  /** Espace seulement : 'petit' | 'moyen' | 'grand'. */
  taille?: string
}

export interface SectionInstance<T = unknown> {
  id: string
  organizationId: string
  type: SectionType
  position: number
  enabled: boolean
  editableByClient: boolean
  /** Mise en page choisie parmi SECTION_TYPES[type].variants — même contenu,
   * présentation différente. `undefined`/inconnue = 1re variante du type. */
  variant?: string
  content: T
}

export interface HeroGridItem {
  image?: string
  title?: string
  category?: string
  href?: string
}

export interface HeroContent {
  headline?: string
  subtext?: string
  images?: string[]   // LeafLife : plusieurs visuels (carrousel/collage)
  image?: string       // Aurora : un seul visuel principal
  imageAlt?: string    // texte alternatif de la 1re image (accessibilité) — l'image n'est pas décorative
  kicker?: string      // Aurora : accroche courte au-dessus du titre
  cta?: string         // Aurora : libellé du bouton principal
  cta2?: string        // Aurora : libellé du bouton secondaire
  subline?: string     // ligne courte sous le titre (variante éditoriale)
  ctaHref?: string
  grid?: HeroGridItem[]   // variante « grid » : mosaïque de projets sous le titre
  footerLeft?: string     // rangée bordée basse (gauche)
  footerRight?: string    // rangée bordée basse (droite)
}

export interface FeaturedContent {
  name?: string
  location?: string
  image?: string
}

export interface StatItem {
  value?: string
  label?: string
}

export interface ValueItem {
  label?: string       // LeafLife : simple libellé
  num?: string          // Aurora : numéro affiché ("01", "02"...)
  title?: string        // Aurora
  text?: string         // Aurora
  image?: string        // Aurora
}

export interface FeatureItem {
  title?: string
  description?: string
  image?: string   // Aurora ; variante « editorial » : image de fond au survol
  eyebrow?: string // numéro affiché (ex. « 01 »)
  sub?: string     // sous-titre court (repli sur description)
  href?: string    // lien de la carte / rangée de navigation
}

export interface ProcessItem {
  title?: string
  description?: string
}

export interface ServiceItem {
  title?: string
  description?: string
  image?: string
}

export interface ProjectItem {
  name?: string
  location?: string
  description?: string
  image?: string
  images?: string[]
  /** Slug de la fiche projet réelle, si cette réalisation en a une — sans lui,
   * la carte ne peut pointer que vers la liste générale des projets. */
  slug?: string
}

export interface TestimonialItem {
  author?: string
  location?: string
  text?: string
}

export interface BeforeAfterItem {
  title?: string
  before?: string
  after?: string
}

export interface PostItem {
  title?: string
  excerpt?: string
  body?: string
  image?: string
  date?: string
}

export interface CtaContent {
  title?: string
  text?: string
  button?: string
  image?: string
  eyebrow?: string        // variante split : accroche au-dessus (avec filet)
  emphasis?: string       // fin de titre mise en avant (cuivre)
  buttonHref?: string
  button2?: string        // variante split : second bouton
  button2Href?: string
}

/** Bandeau de disponibilité : pastille + phrase (avec fragment mis en avant) + lien. */
export interface AvailabilityContent {
  text?: string
  highlight?: string
  linkLabel?: string
  linkHref?: string
}

export interface ContactContent {
  title?: string
  subtitle?: string
}

export interface FaqItem {
  question?: string
  answer?: string
}

export interface TeamMemberItem {
  name?: string
  role?: string
  image?: string
  bio?: string
}

export interface LogoItem {
  name?: string
  image?: string
  url?: string
}

export interface PricingPlanItem {
  name?: string
  price?: string
  period?: string
  /** Une ligne = un avantage, découpée à l'affichage. */
  features?: string
  highlighted?: boolean
}

export interface GalleryImageItem {
  image?: string
  caption?: string
}

export interface VideoContent {
  title?: string
  videoUrl?: string
  poster?: string
}

export interface MapContent {
  title?: string
  /** Autonome : ne dépend pas de business.address pour rester déplaçable/
   * désactivable indépendamment de la section Contact. */
  address?: string
}

export interface StoryContent {
  eyebrow?: string
  title?: string
  text?: string
  image?: string
  imageAlt?: string    // texte alternatif de l'image (accessibilité) — l'image n'est pas décorative
}

/** Manifeste : bloc éditorial deux colonnes séparées d'un filet — accroche +
 * grande déclaration (avec un mot d'emphase optionnel) + signature à gauche,
 * paragraphes + lien à droite. */
export interface ManifestoContent {
  eyebrow?: string
  statement?: string
  emphasis?: string       // mot/fin de phrase mis en avant (cuivre, italique)
  signature?: string
  body?: string           // paragraphes (une ligne vide = nouveau paragraphe)
  linkLabel?: string
  linkHref?: string
}

/** Bandeau défilant : suite de libellés répétés en continu. */
export interface MarqueeItem {
  label?: string
}

/** Chambre / hébergement (template hôtelier Hoteru) : carte riche avec
 * équipements chiffrés et prix. */
export interface RoomItem {
  name?: string
  image?: string
  description?: string
  price?: string
  period?: string       // ex. « /nuit »
  beds?: string         // ex. « 2 lits »
  baths?: string        // ex. « 2 salles de bain »
  persons?: string      // ex. « 4 personnes »
  size?: string         // ex. « 60 m² »
  /** Une ligne = un équipement (Wifi, TV, chauffage…), découpée à l'affichage. */
  features?: string
}

/** Offre / forfait promotionnel (section « Meilleures offres »). */
export interface DealItem {
  name?: string
  image?: string
  price?: string
  rating?: string       // ex. « 4.9 »
  reviews?: string      // ex. « 8 avis »
  expiry?: string       // ex. « Expire le 30/12 »
  discount?: string     // ex. « -20 % »
}

/** Bloc « Vérifier les disponibilités » — formulaire de réservation. */
export interface BookingContent {
  title?: string
  image?: string
}

/** Bien immobilier (template agence immobilière) : carte avec statut, prix,
 * localisation et caractéristiques chiffrées. */
export interface PropertyItem {
  title?: string
  image?: string
  location?: string
  price?: string
  status?: string       // ex. « À vendre », « Vendu », « Sous offre »
  beds?: string         // ex. « 4 chambres »
  baths?: string        // ex. « 3 salles de bain »
  surface?: string      // ex. « 240 m² »
  description?: string
  slug?: string         // page détail du bien (ex. 'villa-contemporaine')
}

/** Vin / cru (template cave viticole) : carte de bouteille avec millésime,
 * cépage, région et notes de dégustation. */
export interface WineItem {
  name?: string
  image?: string
  vintage?: string      // millésime, ex. « 2019 »
  region?: string       // appellation / région, ex. « Valais AOC »
  grape?: string        // cépage, ex. « Cornalin »
  price?: string
  notes?: string        // notes de dégustation
  slug?: string         // page détail du vin
}

export interface RepeatableContent<T> {
  items: T[]
}

export type SectionContent =
  | HeroContent
  | FeaturedContent
  | RepeatableContent<StatItem>
  | RepeatableContent<ValueItem>
  | RepeatableContent<FeatureItem>
  | RepeatableContent<ProcessItem>
  | RepeatableContent<ServiceItem>
  | RepeatableContent<TestimonialItem>
  | RepeatableContent<ProjectItem>
  | RepeatableContent<BeforeAfterItem>
  | RepeatableContent<PostItem>
  | RepeatableContent<FaqItem>
  | RepeatableContent<TeamMemberItem>
  | RepeatableContent<LogoItem>
  | RepeatableContent<PricingPlanItem>
  | RepeatableContent<GalleryImageItem>
  | RepeatableContent<RoomItem>
  | RepeatableContent<DealItem>
  | RepeatableContent<PropertyItem>
  | RepeatableContent<WineItem>
  | CtaContent
  | ContactContent
  | VideoContent
  | MapContent
  | StoryContent
  | BookingContent

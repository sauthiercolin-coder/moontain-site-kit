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

export interface HeroContent {
  headline?: string
  subtext?: string
  images?: string[]   // LeafLife : plusieurs visuels (carrousel/collage)
  image?: string       // Aurora : un seul visuel principal
  kicker?: string      // Aurora : accroche courte au-dessus du titre
  cta?: string         // Aurora : libellé du bouton principal
  cta2?: string        // Aurora : libellé du bouton secondaire
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
  image?: string   // Aurora
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
  | CtaContent
  | ContactContent
  | VideoContent
  | MapContent

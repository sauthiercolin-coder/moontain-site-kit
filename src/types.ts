// Contrat de données partagé entre les éditeurs (espace-clients,
// moontain-gallerie) et les templates de rendu (vertdaltitude-site).
// Reprend exactement la forme des champs de l'ancien type `Site` monolithique
// pour que la bascule des données existantes (Vert d'Altitude) soit directe.

export type SectionType =
  | 'hero'
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

export interface SectionInstance<T = unknown> {
  id: string
  organizationId: string
  type: SectionType
  position: number
  enabled: boolean
  editableByClient: boolean
  content: T
}

export interface HeroContent {
  headline?: string
  subtext?: string
  images?: string[]
}

export interface ValueItem {
  label?: string
}

export interface FeatureItem {
  title?: string
  description?: string
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
  buttonLabel?: string
}

export interface ContactContent {
  title?: string
  subtitle?: string
}

export interface RepeatableContent<T> {
  items: T[]
}

export type SectionContent =
  | HeroContent
  | RepeatableContent<ValueItem>
  | RepeatableContent<FeatureItem>
  | RepeatableContent<ProcessItem>
  | RepeatableContent<ServiceItem>
  | RepeatableContent<TestimonialItem>
  | RepeatableContent<ProjectItem>
  | RepeatableContent<BeforeAfterItem>
  | RepeatableContent<PostItem>
  | CtaContent
  | ContactContent

import { z } from 'zod'
import type { SectionType } from './types'

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
    key: 'hero', label: 'Accueil', kind: 'singleton', variants: DEFAULT_VARIANT,
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
    key: 'features', label: 'Pourquoi nous', kind: 'repeatable', variants: DEFAULT_VARIANT,
    fields: [
      { key: 'title', label: 'Titre', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'image', label: 'Image', kind: 'image' },
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
    key: 'projects', label: 'Réalisations', kind: 'repeatable', variants: DEFAULT_VARIANT,
    fields: [
      { key: 'name', label: 'Nom', kind: 'text' },
      { key: 'location', label: 'Lieu', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'image', label: 'Image', kind: 'image' },
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
      { key: 'date', label: 'Date', kind: 'date' },
    ],
    defaultContent: { items: [] },
  },
  cta: {
    key: 'cta', label: 'Bloc final', kind: 'singleton', variants: DEFAULT_VARIANT,
    defaultContent: { title: '', text: '', button: '' },
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
    ],
    defaultContent: { items: [] },
  },
  gallery: {
    key: 'gallery', label: 'Galerie', kind: 'repeatable', variants: DEFAULT_VARIANT,
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
}

const repeatableItemSchema = (fields: RepeatableFieldConfig[]) =>
  z.object(Object.fromEntries(fields.map(f => [
    f.key, f.kind === 'boolean' ? z.boolean().optional() : z.string().optional(),
  ]))).passthrough()

const repeatableContentSchema = (fields: RepeatableFieldConfig[]) =>
  z.object({ items: z.array(repeatableItemSchema(fields)).default([]) })

const singletonSchemas: Partial<Record<SectionType, z.ZodTypeAny>> = {
  hero: z.object({
    headline: z.string().optional(),
    subtext: z.string().optional(),
    images: z.array(z.string()).optional(),
    image: z.string().optional(),
    kicker: z.string().optional(),
    cta: z.string().optional(),
    cta2: z.string().optional(),
  }),
  featured: z.object({
    name: z.string().optional(),
    location: z.string().optional(),
    image: z.string().optional(),
  }),
  cta: z.object({
    title: z.string().optional(),
    text: z.string().optional(),
    button: z.string().optional(),
  }),
  contact: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
  }),
  video: z.object({
    title: z.string().optional(),
    videoUrl: z.string().optional(),
    poster: z.string().optional(),
  }),
  map: z.object({
    title: z.string().optional(),
    address: z.string().optional(),
  }),
}

/** Schéma de validation du contenu d'une section, pour vérifier côté serveur
 * ce qui est écrit en base avant de l'accepter (voir server actions
 * updateSiteSectionContent dans moontain-gallerie/espace-clients). */
export function sectionContentSchema(type: SectionType): z.ZodTypeAny {
  const def = SECTION_TYPES[type]
  if (def.kind === 'repeatable') return repeatableContentSchema(def.fields)
  return singletonSchemas[type] ?? z.record(z.unknown())
}

/** Variante effective d'une instance de section — retombe sur la 1re
 * variante déclarée si absente ou inconnue. */
export function resolveVariant(type: SectionType, variant?: string | null): string {
  const def = SECTION_TYPES[type]
  if (variant && def.variants.some(v => v.key === variant)) return variant
  return def.variants[0].key
}

import { z } from 'zod'
import type { SectionType } from './types'

export interface RepeatableFieldConfig {
  key: string
  label: string
  kind: 'text' | 'textarea' | 'image' | 'date'
}

interface SectionTypeDefBase {
  key: SectionType
  label: string
}

interface RepeatableSectionTypeDef extends SectionTypeDefBase {
  kind: 'repeatable'
  fields: RepeatableFieldConfig[]
  defaultContent: { items: Record<string, string>[] }
}

interface SingletonSectionTypeDef extends SectionTypeDefBase {
  kind: 'singleton'
  defaultContent: Record<string, unknown>
}

export type SectionTypeDef = RepeatableSectionTypeDef | SingletonSectionTypeDef

// L'ordre ici sert de position par défaut lors de la bascule des données
// existantes (voir migration 115_migrate_site_content.sql côté moontain-gallerie).
export const SECTION_TYPES: Record<SectionType, SectionTypeDef> = {
  hero: {
    key: 'hero', label: 'Accueil', kind: 'singleton',
    defaultContent: { headline: '', subtext: '', images: [] },
  },
  featured: {
    key: 'featured', label: 'Réalisation mise en avant', kind: 'singleton',
    defaultContent: { name: '', location: '', image: '' },
  },
  stats: {
    key: 'stats', label: 'Chiffres clés', kind: 'repeatable',
    fields: [
      { key: 'value', label: 'Valeur', kind: 'text' },
      { key: 'label', label: 'Libellé', kind: 'text' },
    ],
    defaultContent: { items: [] },
  },
  values: {
    key: 'values', label: 'Valeurs', kind: 'repeatable',
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
    fields: [
      { key: 'title', label: 'Titre', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'image', label: 'Image', kind: 'image' },
    ],
    defaultContent: { items: [] },
  },
  process: {
    key: 'process', label: 'Étapes', kind: 'repeatable',
    fields: [
      { key: 'title', label: 'Titre', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'textarea' },
    ],
    defaultContent: { items: [] },
  },
  services: {
    key: 'services', label: 'Services', kind: 'repeatable',
    fields: [
      { key: 'title', label: 'Titre', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'image', label: 'Image', kind: 'image' },
    ],
    defaultContent: { items: [] },
  },
  testimonials: {
    key: 'testimonials', label: 'Avis', kind: 'repeatable',
    fields: [
      { key: 'author', label: 'Auteur', kind: 'text' },
      { key: 'location', label: 'Lieu', kind: 'text' },
      { key: 'text', label: 'Texte', kind: 'textarea' },
    ],
    defaultContent: { items: [] },
  },
  projects: {
    key: 'projects', label: 'Réalisations', kind: 'repeatable',
    fields: [
      { key: 'name', label: 'Nom', kind: 'text' },
      { key: 'location', label: 'Lieu', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'image', label: 'Image', kind: 'image' },
    ],
    defaultContent: { items: [] },
  },
  beforeAfter: {
    key: 'beforeAfter', label: 'Avant/Après', kind: 'repeatable',
    fields: [
      { key: 'title', label: 'Titre', kind: 'text' },
      { key: 'before', label: 'Avant', kind: 'image' },
      { key: 'after', label: 'Après', kind: 'image' },
    ],
    defaultContent: { items: [] },
  },
  posts: {
    key: 'posts', label: 'Blog', kind: 'repeatable',
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
    key: 'cta', label: 'Bloc final', kind: 'singleton',
    defaultContent: { title: '', text: '', button: '' },
  },
  contact: {
    key: 'contact', label: 'Contact', kind: 'singleton',
    defaultContent: { title: '', subtitle: '' },
  },
}

const repeatableItemSchema = (fields: RepeatableFieldConfig[]) =>
  z.object(Object.fromEntries(fields.map(f => [f.key, z.string().optional()]))).passthrough()

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
}

/** Schéma de validation du contenu d'une section, pour vérifier côté serveur
 * ce qui est écrit en base avant de l'accepter (voir server actions
 * updateSiteSectionContent dans moontain-gallerie/espace-clients). */
export function sectionContentSchema(type: SectionType): z.ZodTypeAny {
  const def = SECTION_TYPES[type]
  if (def.kind === 'repeatable') return repeatableContentSchema(def.fields)
  return singletonSchemas[type] ?? z.record(z.unknown())
}

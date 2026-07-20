import type { ComponentType } from 'react'

export interface ImagePickerProps {
  value?: string
  onChange: (url: string) => void
}

/** Chaque app hôte injecte son propre mécanisme d'upload/bibliothèque
 * d'images (SDK client direct côté espace-clients, server action service_role
 * côté moontain-gallerie) — ce paquet reste agnostique de ce détail. */
export type ImagePickerComponent = ComponentType<ImagePickerProps>

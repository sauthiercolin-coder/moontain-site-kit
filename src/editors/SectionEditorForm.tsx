'use client'

import type { SectionType } from '../types'
import { SECTION_TYPES } from '../section-types'
import { RepeatableListEditor } from './RepeatableListEditor'
import { HeroEditor } from './HeroEditor'
import { FeaturedEditor } from './FeaturedEditor'
import { CtaEditor } from './CtaEditor'
import { ContactEditor } from './ContactEditor'
import { VideoEditor } from './VideoEditor'
import { MapEditor } from './MapEditor'
import { StoryEditor } from './StoryEditor'
import { BookingEditor } from './BookingEditor'
import type { ImagePickerComponent } from './types'

/** Point d'entrée unique des formulaires d'édition — c'est ce composant que
 * SiteEditor.tsx (espace-clients) et SiteFeaturesClient.tsx (moontain-gallerie)
 * consomment tous les deux, au lieu de réimplémenter chaque champ. */
export function SectionEditorForm({
  type, content, onChange, ImagePicker,
}: {
  type: SectionType
  content: unknown
  onChange: (content: unknown) => void
  ImagePicker?: ImagePickerComponent
}) {
  const def = SECTION_TYPES[type]

  if (def.kind === 'repeatable') {
    const items = (content as { items?: Record<string, string | boolean>[] } | undefined)?.items ?? []
    return (
      <RepeatableListEditor
        items={items}
        fields={def.fields}
        onChange={next => onChange({ items: next })}
        ImagePicker={ImagePicker}
      />
    )
  }

  switch (type) {
    case 'hero':
      return <HeroEditor content={(content as never) ?? {}} onChange={onChange as never} ImagePicker={ImagePicker} />
    case 'featured':
      return <FeaturedEditor content={(content as never) ?? {}} onChange={onChange as never} ImagePicker={ImagePicker} />
    case 'cta':
      return <CtaEditor content={(content as never) ?? {}} onChange={onChange as never} ImagePicker={ImagePicker} />
    case 'contact':
      return <ContactEditor content={(content as never) ?? {}} onChange={onChange as never} />
    case 'video':
      return <VideoEditor content={(content as never) ?? {}} onChange={onChange as never} ImagePicker={ImagePicker} />
    case 'map':
      return <MapEditor content={(content as never) ?? {}} onChange={onChange as never} />
    case 'story':
      return <StoryEditor content={(content as never) ?? {}} onChange={onChange as never} ImagePicker={ImagePicker} />
    case 'booking':
      return <BookingEditor content={(content as never) ?? {}} onChange={onChange as never} ImagePicker={ImagePicker} />
    default:
      return null
  }
}

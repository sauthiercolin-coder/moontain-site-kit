import { describe, it, expect } from 'vitest'
import {
  ENVOI_MAX, PHOTOS_MAX, PHOTO_MAX, resumePhotos, telephoneLisible, verifierPhotos,
} from '../src/demande-photo'

const jpg = (octets: number, nom = 'photo.jpg') => ({ nom, type: 'image/jpeg', octets })

describe('verifierPhotos', () => {
  it('accepte un envoi ordinaire', () => {
    expect(verifierPhotos([jpg(2_400_000), jpg(3_100_000, 'detail.jpg')])).toEqual({ ok: true })
  })

  it('refuse un envoi vide', () => {
    expect(verifierPhotos([]).erreur).toMatch(/au moins une photo/i)
  })

  it('refuse au-delà de six photos', () => {
    const sept = Array.from({ length: PHOTOS_MAX + 1 }, (_, i) => jpg(1000, `p${i}.jpg`))
    expect(verifierPhotos(sept).erreur).toMatch(/6 photos/)
  })

  it('refuse une photo trop lourde, même seule', () => {
    const v = verifierPhotos([jpg(PHOTO_MAX + 1)])
    expect(v.ok).toBe(false)
    expect(v.piece).toBe(0)
  })

  it('refuse un envoi trop lourd, même avec des photos acceptables', () => {
    const v = verifierPhotos(Array.from({ length: 5 }, (_, i) => jpg(11 * 1000 * 1000, `p${i}.jpg`)))
    expect(v.ok).toBe(false)
    expect(v.erreur).toMatch(/dépasse/)
  })

  // Ce n'est pas un dépôt de documents : un tableur n'a rien à faire ici.
  it('n’accepte que des images et le PDF d’un plan', () => {
    expect(verifierPhotos([{ nom: 'plan.pdf', type: 'application/pdf', octets: 500_000 }]).ok).toBe(true)
    expect(verifierPhotos([{ nom: 'p.png', type: 'image/png', octets: 500_000 }]).ok).toBe(true)
    const v = verifierPhotos([{ nom: 'comptes.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', octets: 5000 }])
    expect(v.ok).toBe(false)
    expect(v.erreur).toMatch(/JPEG, PNG/)
  })

  it('refuse un fichier dont le nom ne correspond pas au type', () => {
    const v = verifierPhotos([{ nom: 'photo.png', type: 'image/jpeg', octets: 5000 }])
    expect(v.ok).toBe(false)
    expect(v.piece).toBe(0)
  })

  it('parle du nombre avant de parler des formats', () => {
    const trop = Array.from({ length: PHOTOS_MAX + 1 }, () => ({ nom: 'x.exe', type: 'application/x-msdownload', octets: 10 }))
    expect(verifierPhotos(trop).erreur).toMatch(/6 photos/)
  })

  it('accepte pile sous la limite de l’envoi', () => {
    expect(verifierPhotos([jpg(ENVOI_MAX / 4), jpg(ENVOI_MAX / 4)]).ok).toBe(true)
  })
})

describe('resumePhotos', () => {
  it('compte et pèse', () => {
    expect(resumePhotos([jpg(2_400_000), jpg(3_800_000)])).toBe('2 photos · 6,2 Mo')
  })
  it('accorde le singulier', () => {
    expect(resumePhotos([jpg(900_000)])).toBe('1 photo · 900 Ko')
  })
  it('sait l’anglais', () => {
    expect(resumePhotos([jpg(2_400_000)], 'en')).toBe('1 photo · 2.4 MB')
  })
})

describe('telephoneLisible', () => {
  // C'est LE champ de ce widget : le commerce rappelle. Un numéro mal saisi
  // transforme la demande en perte sèche.
  it('accepte les formes qu’on écrit vraiment', () => {
    for (const brut of ['0791234567', '079 123 45 67', '+41 79 123 45 67', '0041791234567', '079.123.45.67']) {
      expect(telephoneLisible(brut), brut).toBe('079 123 45 67')
    }
  })
  it('refuse ce qui n’est pas un numéro suisse', () => {
    expect(telephoneLisible('12345')).toBeNull()
    expect(telephoneLisible('07912345678')).toBeNull()
    expect(telephoneLisible('+33 6 12 34 56 78')).toBeNull()
    expect(telephoneLisible('')).toBeNull()
    expect(telephoneLisible(null)).toBeNull()
    expect(telephoneLisible('pas un numéro')).toBeNull()
  })
  it('accepte un fixe comme un mobile', () => {
    expect(telephoneLisible('027 123 45 67')).toBe('027 123 45 67')
  })
})

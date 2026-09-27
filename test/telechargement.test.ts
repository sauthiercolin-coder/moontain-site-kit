import { describe, it, expect } from 'vitest'
import { POIDS_MAX, detailLisible, poidsLisible, verifierFichier } from '../src/telechargement'

// Ce fichier sera ouvert par des inconnus sur leur propre machine, depuis un
// domaine qui porte le nom d'un commerce. Ce que ce module laisse passer
// engage ce commerce.

describe('le poids annoncé', () => {
  // Base 1000 : c'est ce qu'affiche le système de qui recevra le fichier, et
  // deux chiffres différents pour le même fichier font douter du reste.
  it('compte comme le système d’exploitation, pas comme un informaticien', () => {
    expect(poidsLisible(1000)).toBe('1 Ko')
    expect(poidsLisible(2_400_000)).toBe('2,4 Mo')
    expect(poidsLisible(999)).toBe('999 o')
  })

  it('arrondit sans donner une précision que personne ne demande', () => {
    expect(poidsLisible(8_420_000)).toBe('8,4 Mo')
    expect(poidsLisible(14_700_000)).toBe('15 Mo')
  })

  it('n’invente rien quand la taille est inconnue', () => {
    expect(poidsLisible(null)).toBeNull()
    expect(poidsLisible(0)).toBeNull()
  })

  it('utilise le point en anglais', () => {
    expect(poidsLisible(2_400_000, 'en')).toBe('2.4 MB')
  })
})

describe('la ligne de détail', () => {
  it('joint ce que le commerce a écrit et le poids', () => {
    expect(detailLisible('PDF, 12 pages', 2_400_000)).toBe('PDF, 12 pages · 2,4 Mo')
  })
  it('se passe de ce qui manque', () => {
    expect(detailLisible('PDF, 12 pages', null)).toBe('PDF, 12 pages')
    expect(detailLisible('  ', 2_400_000)).toBe('2,4 Mo')
    expect(detailLisible(null, null)).toBeNull()
  })
})

describe('le fichier accepté', () => {
  const pdf = { type: 'application/pdf', nom: 'brochure.pdf', octets: 2_400_000 }

  it('laisse passer un PDF ordinaire', () => {
    expect(verifierFichier(pdf)).toEqual({ ok: true, extension: 'pdf' })
  })

  it('accepte les deux orthographes du JPEG', () => {
    expect(verifierFichier({ type: 'image/jpeg', nom: 'plan.jpeg', octets: 100_000 }).ok).toBe(true)
    expect(verifierFichier({ type: 'image/jpeg', nom: 'plan.jpg', octets: 100_000 }).ok).toBe(true)
  })

  // Le cas qui justifie ce module : un exécutable renommé annonce ce qu'on
  // veut bien le laisser annoncer.
  it('refuse un fichier dont le nom et le format ne concordent pas', () => {
    const v = verifierFichier({ type: 'application/pdf', nom: 'piege.exe', octets: 50_000 })
    expect(v.ok).toBe(false)
    expect(v.erreur).toMatch(/ne correspond pas/)
  })

  it('refuse les formats hors de la liste', () => {
    for (const nom of ['archive.zip', 'script.sh', 'page.html', 'macro.docm']) {
      expect(verifierFichier({ type: 'application/octet-stream', nom, octets: 1000 }).ok).toBe(false)
    }
  })

  it('refuse le vide et le trop lourd', () => {
    expect(verifierFichier({ ...pdf, octets: 0 }).ok).toBe(false)
    expect(verifierFichier({ ...pdf, octets: POIDS_MAX + 1 }).ok).toBe(false)
    expect(verifierFichier({ ...pdf, octets: POIDS_MAX }).ok).toBe(true)
  })

  it('refuse ce qui n’a ni type ni nom', () => {
    expect(verifierFichier({ octets: 1000 }).ok).toBe(false)
    expect(verifierFichier({ type: 'application/pdf', octets: 1000 }).ok).toBe(false)
  })

  it('dit le poids maximal dans son refus, pour qu’on sache quoi faire', () => {
    expect(verifierFichier({ ...pdf, octets: POIDS_MAX + 1 }).erreur).toContain('20 Mo')
  })
})

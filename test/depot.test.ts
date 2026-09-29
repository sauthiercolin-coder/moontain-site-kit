import { describe, it, expect } from 'vitest'
import { ENVELOPPE_MAX, PIECES_MAX, nomDePiece, resumeDepot, verifierDepot } from '../src/depot'

const pdf = (octets: number, nom = 'bilan.pdf') => ({ nom, type: 'application/pdf', octets })

describe('verifierDepot', () => {
  it('accepte une enveloppe ordinaire', () => {
    expect(verifierDepot([pdf(120_000), pdf(80_000, 'annexe.pdf')])).toEqual({ ok: true })
  })

  it('refuse une enveloppe vide', () => {
    expect(verifierDepot([]).ok).toBe(false)
    expect(verifierDepot([]).erreur).toMatch(/au moins un/i)
  })

  it('refuse au-delà de dix pièces', () => {
    const onze = Array.from({ length: PIECES_MAX + 1 }, (_, i) => pdf(1000, `p${i}.pdf`))
    const v = verifierDepot(onze)
    expect(v.ok).toBe(false)
    expect(v.erreur).toMatch(/10 documents/)
  })

  it('refuse une enveloppe trop lourde, même avec des pièces acceptables', () => {
    // Quatre pièces de 18 Mo : chacune passe, l'ensemble non.
    const v = verifierDepot(Array.from({ length: 4 }, (_, i) => pdf(18 * 1000 * 1000, `p${i}.pdf`)))
    expect(v.ok).toBe(false)
    expect(v.erreur).toMatch(/dépasse/)
  })

  it('accepte pile à la limite de l’enveloppe', () => {
    expect(verifierDepot([pdf(ENVELOPPE_MAX)]).ok).toBe(false) // une pièce seule reste bornée à 20 Mo
    expect(verifierDepot([pdf(19 * 1000 * 1000), pdf(19 * 1000 * 1000), pdf(19 * 1000 * 1000)]).ok).toBe(true)
  })

  // L'ordre compte : on ne parle pas du format du troisième fichier à
  // quelqu'un qui en a joint douze.
  it('parle du nombre avant de parler des formats', () => {
    const trop = Array.from({ length: PIECES_MAX + 1 }, () => ({ nom: 'x.exe', type: 'application/x-msdownload', octets: 10 }))
    expect(verifierDepot(trop).erreur).toMatch(/10 documents/)
  })

  it('désigne la pièce fautive par son rang', () => {
    const v = verifierDepot([pdf(1000), { nom: 'virus.exe', type: 'application/x-msdownload', octets: 1000 }])
    expect(v.ok).toBe(false)
    expect(v.piece).toBe(1)
  })

  it('refuse un fichier dont le nom ne correspond pas au type', () => {
    const v = verifierDepot([{ nom: 'bilan.png', type: 'application/pdf', octets: 1000 }])
    expect(v.ok).toBe(false)
    expect(v.piece).toBe(0)
  })
})

describe('resumeDepot', () => {
  it('compte et pèse', () => {
    expect(resumeDepot([pdf(2_400_000), pdf(1_800_000)])).toBe('2 documents · 4,2 Mo')
  })
  it('accorde le singulier', () => {
    expect(resumeDepot([pdf(900)])).toBe('1 document · 900 o')
  })
  it('sait l’anglais', () => {
    expect(resumeDepot([pdf(2_400_000)], 'en')).toBe('1 document · 2.4 MB')
  })
})

describe('nomDePiece', () => {
  // Un nom de fichier vient d'un inconnu.
  it('retire tout ce qui désigne un dossier', () => {
    expect(nomDePiece('../../etc/passwd')).toBe('passwd')
    expect(nomDePiece('C:\\Users\\moi\\bilan.pdf')).toBe('bilan.pdf')
  })
  it('retire les points de tête', () => {
    expect(nomDePiece('.env')).toBe('env')
    expect(nomDePiece('..')).toBe('document')
  })
  it('retire les caractères de contrôle', () => {
    expect(nomDePiece('bi\u0000lan.pdf')).toBe('bilan.pdf')
  })
  it('borne la longueur', () => {
    expect(nomDePiece('a'.repeat(300)).length).toBe(120)
  })
  it('retombe sur un nom de secours', () => {
    expect(nomDePiece('')).toBe('document')
    expect(nomDePiece(null)).toBe('document')
    expect(nomDePiece('   ')).toBe('document')
  })
})

import { describe, expect, it } from 'vitest'
import {
  bornesOccurrence, categoriesDe, cleCategorie, datesSchemaOrg, derniereDate, echapperTexteIcs,
  estPasse, etatOccurrence, evenementsAVenir, evenementsPasses, finDeVente, genererIcs, isoZurich, jourCourt,
  libelleOccurrence, lieuDeLEvenement, MAX_OCCURRENCES, nombreAgenda, normaliserEvenement,
  normaliserOccurrences, occurrencesDuMois, prochaineOccurrence, recentOuAVenir, replierLigneIcs, venteOuverte,
  type Evenement, type Occurrence, type OptionsIcs,
} from '../src/evenements'

// En 2026, l'heure d'été commence le dimanche 29 mars (2 h → 3 h) et finit
// le dimanche 25 octobre (3 h → 2 h) : les derniers dimanches de mars et
// d'octobre. Ce sont les deux nuits où une heure de Zurich « naïve » tombe à
// côté.

const occ = (p: Partial<Occurrence> & { du: string }): Occurrence => ({ id: 'a', ...p })
const evt = (p: Partial<Evenement> = {}): Evenement => ({
  id: 'e1', slug: 'concert', titre: 'Concert', dates: [], billetterie: 'aucune', ...p,
})
const iso = (d: Date) => d.toISOString()
/** Les libellés portent des espaces insécables ; on les compare lisibles. */
const lisible = (s: string) => s.replace(/\u00a0/g, ' ')
const octets = (s: string) => new TextEncoder().encode(s).length

describe('normaliserOccurrences', () => {
  it('écarte une date sans premier jour valide, et le 30 février', () => {
    expect(normaliserOccurrences([{ id: 'x' }, { du: '2026-02-30' }, { du: 'demain' }, null, 3])).toEqual([])
  })

  it('ne lève jamais', () => {
    expect(normaliserOccurrences(undefined)).toEqual([])
    expect(normaliserOccurrences('pas du json')).toEqual([])
    expect(normaliserOccurrences({ du: '2026-10-03' })).toEqual([])
  })

  it('lit une colonne jsonb arrivée en texte', () => {
    expect(normaliserOccurrences('[{"id":"a","du":"2026-10-03"}]')).toEqual([{ id: 'a', du: '2026-10-03' }])
  })

  it('retire un jour de fin qui n’est pas après le premier, sans perdre la date', () => {
    expect(normaliserOccurrences([{ id: 'a', du: '2026-10-05', au: '2026-10-03' }])).toEqual([{ id: 'a', du: '2026-10-05' }])
    expect(normaliserOccurrences([{ id: 'a', du: '2026-10-05', au: '2026-10-05' }])).toEqual([{ id: 'a', du: '2026-10-05' }])
  })

  it('lit les heures comme on les tape, et retire l’illisible', () => {
    const [o] = normaliserOccurrences([{ id: 'a', du: '2026-10-03', deHeure: '19h30', aHeure: '22.00' }])
    expect(o).toEqual({ id: 'a', du: '2026-10-03', deHeure: '19:30', aHeure: '22:00' })
    const [p] = normaliserOccurrences([{ id: 'a', du: '2026-10-03', deHeure: 'le soir', aHeure: '22:00' }])
    expect(p).toEqual({ id: 'a', du: '2026-10-03' })
  })

  it('retire une fin égale au début sur un même jour', () => {
    const [o] = normaliserOccurrences([{ id: 'a', du: '2026-10-03', deHeure: '20:00', aHeure: '20:00' }])
    expect(o).toEqual({ id: 'a', du: '2026-10-03', deHeure: '20:00' })
  })

  it('garde statut et séance connus, écarte le reste', () => {
    const [o, p] = normaliserOccurrences([
      { id: 'a', du: '2026-10-03', statut: 'annule', seance: ' s-1 ' },
      { id: 'b', du: '2026-10-04', statut: 'supprime', inconnu: 1 },
    ])
    expect(o).toEqual({ id: 'a', du: '2026-10-03', statut: 'annule', seance: 's-1' })
    expect(p).toEqual({ id: 'b', du: '2026-10-04' })
  })

  it('trie par jour puis par heure, la journée entière d’abord', () => {
    const r = normaliserOccurrences([
      { id: 'c', du: '2026-10-10' },
      { id: 'b', du: '2026-10-03', deHeure: '20:00' },
      { id: 'a', du: '2026-10-03' },
    ])
    expect(r.map(o => o.id)).toEqual(['a', 'b', 'c'])
  })

  it('tire du contenu un identifiant court et stable, et dédouble les répétés', () => {
    const brut = [{ du: '2026-10-03', deHeure: '20:00' }, { du: '2026-10-03', deHeure: '20:00' }, { id: 'x', du: '2026-10-04' }, { id: 'x', du: '2026-10-05' }]
    const r1 = normaliserOccurrences(brut)
    const r2 = normaliserOccurrences(brut)
    expect(r1.map(o => o.id)).toEqual(r2.map(o => o.id))
    expect(r1[0].id).toMatch(/^o-[0-9a-z]{1,7}$/)
    expect(r1[1].id).toBe(`${r1[0].id}-2`)
    expect(r1.slice(2).map(o => o.id)).toEqual(['x', 'x-2'])
  })

  it('rend un identifiant sûr pour un UID', () => {
    const [o] = normaliserOccurrences([{ id: 'a b;c@d', du: '2026-10-03' }])
    expect(o.id).toBe('a-b-c-d')
  })

  it('est idempotente', () => {
    const une = normaliserOccurrences([{ du: '2026-10-05', deHeure: '9h' }, { id: 'z', du: '2026-10-03', au: '2026-10-04', statut: 'complet' }])
    expect(normaliserOccurrences(une)).toEqual(une)
  })

  it('plafonne le nombre de dates', () => {
    const beaucoup = Array.from({ length: MAX_OCCURRENCES + 50 }, (_, i) => ({ id: `d${i}`, du: '2026-10-03' }))
    expect(normaliserOccurrences(beaucoup)).toHaveLength(MAX_OCCURRENCES)
  })
})

describe('normaliserEvenement', () => {
  it('refuse une ligne sans identifiant ni slug', () => {
    expect(normaliserEvenement({ titre: 'x' })).toBeNull()
    expect(normaliserEvenement(null)).toBeNull()
  })

  it('nettoie une ligne de la base', () => {
    const e = normaliserEvenement({
      id: 'e1', slug: 'concert', titre: ' Concert ', resume: '', categorie: ' Musique   live ',
      billetterie: 'inconnue', billet_url: 'javascript:alert(1)', prix_des: '12.5', publie: true,
      dates: [{ id: 'a', du: '2026-10-03' }], organization_id: 'secret',
    })
    expect(e).toEqual({
      id: 'e1', slug: 'concert', slug_legacy: null, titre: 'Concert', resume: null, description: null,
      image_url: null, lieu: null, adresse: null, categorie: 'Musique live', organisateur: null,
      dates: [{ id: 'a', du: '2026-10-03' }], billetterie: 'aucune', billet_url: null, prix_des: 12.5,
      publie: true, updated_at: null,
    })
  })

  it('garde l’entrée libre, distincte du prix non précisé', () => {
    expect(normaliserEvenement({ id: 'e', slug: 's', prix_des: 0 })!.prix_des).toBe(0)
    expect(normaliserEvenement({ id: 'e', slug: 's', prix_des: null })!.prix_des).toBeNull()
    expect(normaliserEvenement({ id: 'e', slug: 's', prix_des: -5 })!.prix_des).toBeNull()
  })

  it('garde un lien de billetterie complet', () => {
    const e = normaliserEvenement({ id: 'e', slug: 's', billetterie: 'externe', billet_url: 'https://eventfrog.ch/x' })!
    expect(e.billetterie).toBe('externe')
    expect(e.billet_url).toBe('https://eventfrog.ch/x')
  })
})

describe('bornesOccurrence', () => {
  it('journée entière : fin exclue au lendemain à 0 h', () => {
    const b = bornesOccurrence(occ({ du: '2026-07-15' }))
    expect(b.journee).toBe(true)
    expect(iso(b.debut)).toBe('2026-07-14T22:00:00.000Z')
    expect(iso(b.fin)).toBe('2026-07-15T22:00:00.000Z')
  })

  it('plusieurs jours : jusqu’au lendemain du dernier', () => {
    const b = bornesOccurrence(occ({ du: '2026-12-30', au: '2027-01-02' }))
    expect(iso(b.debut)).toBe('2026-12-29T23:00:00.000Z')
    expect(iso(b.fin)).toBe('2027-01-02T23:00:00.000Z')
  })

  it('heure d’été et heure d’hiver, la veille et le jour du changement', () => {
    expect(iso(bornesOccurrence(occ({ du: '2026-03-28', deHeure: '10:00' })).debut)).toBe('2026-03-28T09:00:00.000Z')
    expect(iso(bornesOccurrence(occ({ du: '2026-03-29', deHeure: '10:00' })).debut)).toBe('2026-03-29T08:00:00.000Z')
    expect(iso(bornesOccurrence(occ({ du: '2026-10-24', deHeure: '10:00' })).debut)).toBe('2026-10-24T08:00:00.000Z')
    expect(iso(bornesOccurrence(occ({ du: '2026-10-25', deHeure: '10:00' })).debut)).toBe('2026-10-25T09:00:00.000Z')
  })

  it('une journée entière le jour du changement dure 23 h ou 25 h', () => {
    const mars = bornesOccurrence(occ({ du: '2026-03-29' }))
    const octobre = bornesOccurrence(occ({ du: '2026-10-25' }))
    expect((mars.fin.getTime() - mars.debut.getTime()) / 3600_000).toBe(23)
    expect((octobre.fin.getTime() - octobre.debut.getTime()) / 3600_000).toBe(25)
  })

  it('passe minuit : la fin tombe le lendemain', () => {
    const b = bornesOccurrence(occ({ du: '2026-07-18', deHeure: '22:00', aHeure: '02:00' }))
    expect(iso(b.debut)).toBe('2026-07-18T20:00:00.000Z')
    expect(iso(b.fin)).toBe('2026-07-19T00:00:00.000Z')
  })

  it('passe minuit la nuit du changement d’heure, en durée réelle', () => {
    const mars = bornesOccurrence(occ({ du: '2026-03-28', deHeure: '22:00', aHeure: '03:00' }))
    expect((mars.fin.getTime() - mars.debut.getTime()) / 3600_000).toBe(4)
    const octobre = bornesOccurrence(occ({ du: '2026-10-24', deHeure: '22:00', aHeure: '03:00' }))
    expect((octobre.fin.getTime() - octobre.debut.getTime()) / 3600_000).toBe(6)
  })

  it('sans heure de fin : deux heures réelles, même à travers le changement', () => {
    const b = bornesOccurrence(occ({ du: '2026-03-29', deHeure: '01:30' }))
    expect(b.fin.getTime() - b.debut.getTime()).toBe(2 * 3600_000)
    expect(iso(b.fin)).toBe('2026-03-29T02:30:00.000Z')
  })

  it('plusieurs jours avec heures : une plage continue', () => {
    const b = bornesOccurrence(occ({ du: '2026-10-02', au: '2026-10-04', deHeure: '18:00', aHeure: '23:00' }))
    expect(iso(b.debut)).toBe('2026-10-02T16:00:00.000Z')
    expect(iso(b.fin)).toBe('2026-10-04T21:00:00.000Z')
    const sansFin = bornesOccurrence(occ({ du: '2026-10-02', au: '2026-10-04', deHeure: '18:00' }))
    expect(iso(sansFin.fin)).toBe('2026-10-04T22:00:00.000Z')
  })
})

describe('état et prochaine date', () => {
  const soir = occ({ id: 's', du: '2026-10-03', deHeure: '19:30', aHeure: '22:00' })

  it('à venir, en cours, passé', () => {
    expect(etatOccurrence(soir, new Date('2026-10-03T17:29:00Z'))).toBe('a-venir')
    expect(etatOccurrence(soir, new Date('2026-10-03T17:30:00Z'))).toBe('en-cours')
    expect(etatOccurrence(soir, new Date('2026-10-03T20:00:00Z'))).toBe('passe')
  })

  it('une journée entière est en cours jusqu’à minuit de Zurich', () => {
    const jour = occ({ du: '2026-10-03' })
    expect(etatOccurrence(jour, new Date('2026-10-03T21:59:00Z'))).toBe('en-cours')
    expect(etatOccurrence(jour, new Date('2026-10-03T22:00:00Z'))).toBe('passe')
  })

  it('préfère une date qui a lieu à une date annulée plus proche', () => {
    const e = evt({ dates: [
      occ({ id: 'a', du: '2026-10-03', statut: 'annule' }),
      occ({ id: 'b', du: '2026-10-10' }),
    ] })
    expect(prochaineOccurrence(e, new Date('2026-10-01T10:00:00Z'))!.id).toBe('b')
  })

  it('garde un événement dont il ne reste qu’une date annulée', () => {
    const e = evt({ dates: [occ({ id: 'a', du: '2026-10-03', statut: 'annule' })] })
    expect(prochaineOccurrence(e, new Date('2026-10-01T10:00:00Z'))!.id).toBe('a')
    expect(prochaineOccurrence(e, new Date('2026-10-05T10:00:00Z'))).toBeNull()
  })

  it('ne dépend pas de l’ordre des dates', () => {
    const e = evt({ dates: [occ({ id: 'tard', du: '2026-11-01' }), occ({ id: 'tot', du: '2026-10-10' })] })
    expect(prochaineOccurrence(e, new Date('2026-10-01T10:00:00Z'))!.id).toBe('tot')
  })

  it('dernière date et passé', () => {
    const e = evt({ dates: [occ({ id: 'a', du: '2026-10-03', au: '2026-10-05' }), occ({ id: 'b', du: '2026-10-04' })] })
    expect(derniereDate(e)).toBe('2026-10-05')
    expect(estPasse(e, new Date('2026-10-05T21:00:00Z'))).toBe(false)
    expect(estPasse(e, new Date('2026-10-05T22:00:00Z'))).toBe(true)
    expect(estPasse(evt(), new Date())).toBe(false)
    expect(derniereDate(evt())).toBe('')
  })

  // La base compare les chaînes du / au : une soirée jusqu'à 2 h reste datée
  // de son premier jour, des deux côtés.
  it('date une soirée qui passe minuit de son premier jour', () => {
    expect(derniereDate(evt({ dates: [occ({ du: '2026-10-03', deHeure: '22:00', aHeure: '02:00' })] }))).toBe('2026-10-03')
  })
})

describe('listes', () => {
  const maintenant = new Date('2026-10-01T10:00:00Z')
  const liste = [
    evt({ id: '1', slug: 'jazz', titre: 'Jazz', categorie: 'Musique', dates: [occ({ du: '2026-10-20' })] }),
    evt({ id: '2', slug: 'expo', titre: 'Expo', categorie: 'Exposition', dates: [occ({ du: '2026-09-01', au: '2026-10-31' })] }),
    evt({ id: '3', slug: 'rock', titre: 'Rock', categorie: 'musique ', dates: [occ({ du: '2026-10-05', deHeure: '20:00' })] }),
    evt({ id: '4', slug: 'vieux', titre: 'Vieux', dates: [occ({ du: '2025-06-01' })] }),
    evt({ id: '5', slug: 'ancien', titre: 'Ancien', dates: [occ({ du: '2025-11-01' })] }),
    evt({ id: '6', slug: 'hier', titre: 'Hier', categorie: 'Musique', dates: [occ({ du: '2026-09-30' })] }),
  ]

  it('à venir, en cours compris, du plus proche au plus lointain', () => {
    expect(evenementsAVenir(liste, maintenant).map(x => x.evenement.slug)).toEqual(['expo', 'rock', 'jazz'])
  })

  it('filtre une catégorie sans casse ni accents', () => {
    expect(evenementsAVenir(liste, maintenant, { categorie: 'MUSIQUE' }).map(x => x.evenement.slug)).toEqual(['rock', 'jazz'])
    expect(cleCategorie(' Musée  d’art ')).toBe('musee d’art')
  })

  it('passés depuis moins de 12 mois, le plus récent d’abord', () => {
    expect(evenementsPasses(liste, maintenant).map(e => e.slug)).toEqual(['hier', 'ancien'])
    expect(recentOuAVenir(liste[3], maintenant)).toBe(false)
    expect(recentOuAVenir(liste[0], maintenant)).toBe(true)
  })

  it('les catégories une fois chacune, dans un ordre stable', () => {
    expect(categoriesDe(liste)).toEqual(['Exposition', 'Musique'])
  })

  it('vue du mois : chaque jour d’une date longue, les soirées à leur premier jour', () => {
    const m = occurrencesDuMois([
      ...liste,
      evt({ id: '7', slug: 'nuit', titre: 'Nuit', dates: [occ({ du: '2026-10-31', deHeure: '22:00', aHeure: '03:00' })] }),
    ], 2026, 10)
    expect(m.get('2026-10-01')!.map(x => x.evenement.slug)).toEqual(['expo'])
    expect(m.get('2026-10-05')!.map(x => x.evenement.slug)).toEqual(['expo', 'rock'])
    expect(m.get('2026-10-31')!.map(x => x.evenement.slug)).toEqual(['expo', 'nuit'])
    expect([...m.keys()]).toHaveLength(31)
    expect(m.has('2026-09-30')).toBe(false)
  })

  it('nombre du bloc : 3 sans réglage, de 1 à 12', () => {
    expect(nombreAgenda(undefined)).toBe(3)
    expect(nombreAgenda(6)).toBe(6)
    expect(nombreAgenda('4')).toBe(4)
    expect(nombreAgenda(0)).toBe(1)
    expect(nombreAgenda(40)).toBe(12)
    expect(nombreAgenda('beaucoup')).toBe(3)
  })
})

describe('lieuDeLEvenement', () => {
  const site = { nom: 'Domaine des Mélèzes', adresse: 'Rue du Village 1, 1964 Conthey' }

  it('sans lieu : le site, son nom et son adresse', () => {
    expect(lieuDeLEvenement(evt(), site)).toEqual(site)
  })

  it('un autre lieu ne reçoit jamais l’adresse du site', () => {
    expect(lieuDeLEvenement(evt({ lieu: 'Salle de la Matze' }), site)).toEqual({ nom: 'Salle de la Matze', adresse: null })
  })

  it('une adresse seule : chez le site, à cette adresse', () => {
    expect(lieuDeLEvenement(evt({ adresse: 'Cave, 1955 Chamoson' }), site)).toEqual({ nom: site.nom, adresse: 'Cave, 1955 Chamoson' })
  })
})

describe('libellés', () => {
  it('un soir, avec heures', () => {
    expect(lisible(libelleOccurrence(occ({ du: '2026-10-03', deHeure: '19:30', aHeure: '22:00' })))).toBe('sam. 3 oct. · 19 h 30 – 22 h')
    expect(lisible(libelleOccurrence(occ({ du: '2026-10-03', deHeure: '19:30', aHeure: '22:00' }), 'en'))).toBe('Sat 3 Oct · 19:30 – 22:00')
  })

  it('les espaces des heures sont insécables', () => {
    expect(libelleOccurrence(occ({ du: '2026-10-03', deHeure: '19:30', aHeure: '22:00' }))).toBe('sam. 3\u00a0oct. · 19\u00a0h\u00a030\u00a0– 22\u00a0h')
  })

  it('journée entière, premier du mois, passage de minuit', () => {
    expect(lisible(libelleOccurrence(occ({ du: '2026-10-01' })))).toBe('jeu. 1er oct.')
    expect(lisible(libelleOccurrence(occ({ du: '2026-10-03', deHeure: '22:00', aHeure: '00:00' })))).toBe('sam. 3 oct. · 22 h – minuit')
    // En début, « minuit » se lirait la nuit suivante : 24 h trop tard.
    expect(lisible(libelleOccurrence(occ({ du: '2026-10-25', deHeure: '00:00', aHeure: '04:00' })))).toBe('dim. 25 oct. · 0 h – 4 h')
    expect(lisible(libelleOccurrence(occ({ du: '2026-10-24', au: '2026-10-26', deHeure: '00:00', aHeure: '00:00' })))).toBe('sam. 24 oct., 0 h – lun. 26 oct., minuit')
    expect(lisible(libelleOccurrence(occ({ du: '2026-10-03', deHeure: '22:00', aHeure: '02:00' })))).toBe('sam. 3 oct. · 22 h – 2 h')
  })

  it('plusieurs jours', () => {
    expect(lisible(libelleOccurrence(occ({ du: '2026-10-02', au: '2026-10-04' })))).toBe('ven. 2 – dim. 4 oct.')
    expect(lisible(libelleOccurrence(occ({ du: '2026-09-30', au: '2026-10-02' })))).toBe('mer. 30 sept. – ven. 2 oct.')
    expect(lisible(libelleOccurrence(occ({ du: '2026-12-31', au: '2027-01-01' })))).toBe('jeu. 31 déc. 2026 – ven. 1er janv. 2027')
    expect(lisible(libelleOccurrence(occ({ du: '2026-10-02', au: '2026-10-04', deHeure: '18:00', aHeure: '23:00' }))))
      .toBe('ven. 2 oct., 18 h – dim. 4 oct., 23 h')
    expect(lisible(libelleOccurrence(occ({ du: '2026-10-02', au: '2026-10-04' }), 'fr', { annee: true }))).toBe('ven. 2 – dim. 4 oct. 2026')
  })

  it('le jour seul, pour un titre', () => {
    expect(lisible(jourCourt('2026-10-03', 'fr', { semaine: false, annee: true }))).toBe('3 oct. 2026')
  })
})

describe('schema.org', () => {
  it('écrit l’heure de Zurich avec son décalage, été comme hiver', () => {
    expect(isoZurich('2026-03-28', '10:00')).toBe('2026-03-28T10:00:00+01:00')
    expect(isoZurich('2026-03-29', '10:00')).toBe('2026-03-29T10:00:00+02:00')
    expect(isoZurich('2026-10-24', '20:00')).toBe('2026-10-24T20:00:00+02:00')
    expect(isoZurich('2026-10-25', '20:00')).toBe('2026-10-25T20:00:00+01:00')
  })

  it('sans heure, la date seule', () => {
    expect(isoZurich('2026-10-03')).toBe('2026-10-03')
  })

  it('une heure qui n’existe pas s’écrit à l’heure réelle', () => {
    expect(isoZurich('2026-03-29', '02:30')).toBe('2026-03-29T03:30:00+02:00')
  })

  it('une heure qui existe deux fois reste cohérente avec l’instant', () => {
    const d = isoZurich('2026-10-25', '02:30')
    expect(Date.parse(d)).toBe(bornesOccurrence(occ({ du: '2026-10-25', deHeure: '02:30' })).debut.getTime())
  })

  it('début et fin d’une occurrence ; pas de fin inventée', () => {
    expect(datesSchemaOrg(occ({ du: '2026-10-03', deHeure: '22:00', aHeure: '02:00' })))
      .toEqual({ startDate: '2026-10-03T22:00:00+02:00', endDate: '2026-10-04T02:00:00+02:00' })
    expect(datesSchemaOrg(occ({ du: '2026-10-03', deHeure: '19:30' }))).toEqual({ startDate: '2026-10-03T19:30:00+02:00' })
    expect(datesSchemaOrg(occ({ du: '2026-10-03', au: '2026-10-05' }))).toEqual({ startDate: '2026-10-03', endDate: '2026-10-05' })
  })
})

describe('iCalendar', () => {
  const maintenant = new Date('2026-09-22T08:00:00Z')
  const base: OptionsIcs = {
    nom: 'Agenda — Domaine des Mélèzes',
    domaine: 'https://www.melezes.ch/agenda',
    urlFiche: slug => `https://www.melezes.ch/agenda/${slug}`,
    maintenant,
    evenements: [],
  }
  const lignesDe = (ics: string) => ics.replace(/\r\n /g, '').split('\r\n')
  const vevents = (ics: string) => lignesDe(ics).filter(l => l === 'BEGIN:VEVENT').length

  it('CRLF partout, y compris après la dernière ligne', () => {
    const ics = genererIcs(base)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/)
    expect(ics).toContain('PRODID:-//Moontain Studio//Agenda//FR')
  })

  it('échappe le nom du calendrier', () => {
    const ics = genererIcs({ ...base, nom: 'Caves; concerts, et\r\nvins' })
    expect(lignesDe(ics)).toContain('X-WR-CALNAME:Caves\\; concerts\\, et\\nvins')
  })

  it('un VEVENT par occurrence, journée entière en VALUE=DATE à fin exclue', () => {
    const ics = genererIcs({ ...base, evenements: [evt({ dates: [
      occ({ id: 'a', du: '2026-10-03' }),
      occ({ id: 'b', du: '2026-10-10', au: '2026-10-12' }),
    ] })] })
    const l = lignesDe(ics)
    expect(vevents(ics)).toBe(2)
    expect(l).toContain('DTSTART;VALUE=DATE:20261003')
    expect(l).toContain('DTEND;VALUE=DATE:20261004')
    expect(l).toContain('DTSTART;VALUE=DATE:20261010')
    expect(l).toContain('DTEND;VALUE=DATE:20261013')
  })

  it('heures en UTC, justes des deux côtés du changement d’heure', () => {
    const ics = genererIcs({ ...base, evenements: [evt({ dates: [
      occ({ id: 'a', du: '2026-10-24', deHeure: '20:00', aHeure: '23:00' }),
      occ({ id: 'b', du: '2026-10-25', deHeure: '20:00', aHeure: '23:00' }),
      occ({ id: 'c', du: '2026-10-31', deHeure: '22:00', aHeure: '02:00' }),
    ] })] })
    const l = lignesDe(ics)
    expect(l).toContain('DTSTART:20261024T180000Z')
    expect(l).toContain('DTEND:20261024T210000Z')
    expect(l).toContain('DTSTART:20261025T190000Z')
    expect(l).toContain('DTSTART:20261031T210000Z')
    expect(l).toContain('DTEND:20261101T010000Z')
  })

  it('UID stables, signés du domaine, distincts entre deux événements dupliqués', () => {
    const dates = [occ({ id: 'a', du: '2026-10-03' })]
    const opts = { ...base, evenements: [evt({ id: 'e1', dates }), evt({ id: 'e2', slug: 'copie', dates })] }
    const uids = (ics: string) => lignesDe(ics).filter(l => l.startsWith('UID:'))
    const un = uids(genererIcs(opts))
    const deux = uids(genererIcs({ ...opts, maintenant: new Date('2026-12-01T00:00:00Z') }))
    expect(un).toEqual(['UID:e1-a@www.melezes.ch', 'UID:e2-a@www.melezes.ch'])
    expect(deux).toEqual(un)
  })

  it('un identifiant tiré du contenu donne le même UID d’une requête à l’autre', () => {
    const brut = { id: 'e1', slug: 'x', dates: [{ du: '2026-10-03', deHeure: '20:00' }] }
    const uid = () => lignesDe(genererIcs({ ...base, evenements: [normaliserEvenement(brut)!] })).find(l => l.startsWith('UID:'))
    expect(uid()).toBe(uid())
  })

  it('tient des dates brutes, telles que la base les rend', () => {
    const brut = { ...evt(), dates: [{ du: '2026-10-03', deHeure: '20h' }, { du: 'jamais' }] } as unknown as Evenement
    const l = lignesDe(genererIcs({ ...base, evenements: [brut] }))
    expect(l.filter(x => x.startsWith('UID:'))).toHaveLength(1)
    expect(l.find(x => x.startsWith('UID:'))).toMatch(/^UID:e1-o-[0-9a-z]+@www\.melezes\.ch$/)
    expect(l).toContain('DTSTART:20261003T180000Z')
  })

  it('une date annulée reste, en STATUS:CANCELLED, et son titre le dit', () => {
    const ics = genererIcs({ ...base, evenements: [evt({ dates: [occ({ id: 'a', du: '2026-10-03', statut: 'annule' }), occ({ id: 'b', du: '2026-10-10' })] })] })
    const l = lignesDe(ics)
    expect(l).toContain('STATUS:CANCELLED')
    expect(l).toContain('SUMMARY:Annulé · Concert')
    const en = lignesDe(genererIcs({ ...base, langue: 'en', evenements: [evt({ dates: [occ({ id: 'a', du: '2026-10-03', statut: 'annule' }), occ({ id: 'b', du: '2026-10-10', statut: 'reporte' })] })] }))
    expect(en).toContain('SUMMARY:Cancelled · Concert')
    expect(en).toContain('SUMMARY:Postponed · Concert')
    expect(l).toContain('STATUS:CONFIRMED')
    expect(l).toContain('SUMMARY:Concert')
  })

  it('SEQUENCE et LAST-MODIFIED suivent updated_at', () => {
    const ics = (updated_at: string) => lignesDe(genererIcs({ ...base, evenements: [evt({ updated_at, dates: [occ({ du: '2026-10-03' })] })] }))
    const avant = ics('2026-09-01T10:00:00+00:00'), apres = ics('2026-09-02T10:00:00+00:00')
    const seq = (l: string[]) => Number(l.find(x => x.startsWith('SEQUENCE:'))!.slice(9))
    expect(seq(apres)).toBeGreaterThan(seq(avant))
    expect(apres).toContain('LAST-MODIFIED:20260902T100000Z')
    expect(lignesDe(genererIcs({ ...base, evenements: [evt({ dates: [occ({ du: '2026-10-03' })] })] }))).toContain('SEQUENCE:0')
  })

  it('URL, lieu, résumé et catégorie, échappés', () => {
    const ics = genererIcs({ ...base, lieuParDefaut: { nom: 'Domaine des Mélèzes', adresse: 'Rue du Village 1, 1964 Conthey' }, evenements: [evt({
      slug: 'nuit-des-caves', resume: 'Dégustation; musique, et plus', categorie: 'Vin, fête',
      dates: [occ({ du: '2026-10-03' })],
    })] })
    const l = lignesDe(ics)
    expect(l).toContain('URL:https://www.melezes.ch/agenda/nuit-des-caves')
    expect(l).toContain('LOCATION:Domaine des Mélèzes\\, Rue du Village 1\\, 1964 Conthey')
    expect(l).toContain('DESCRIPTION:Dégustation\\; musique\\, et plus\\n\\nhttps://www.melezes.ch/agenda/nuit-des-caves')
    expect(l).toContain('CATEGORIES:Vin\\, fête')
  })

  it('omet les dates finies avant `depuis`, et tout événement non publié', () => {
    const ics = genererIcs({ ...base, depuis: '2026-07-01', evenements: [
      evt({ dates: [occ({ id: 'vieux', du: '2026-05-01' }), occ({ id: 'ok', du: '2026-06-28', au: '2026-07-02' })] }),
      evt({ id: 'brouillon', publie: false, dates: [occ({ du: '2026-10-03' })] }),
    ] })
    expect(lignesDe(ics).filter(l => l.startsWith('UID:'))).toEqual(['UID:e1-ok@www.melezes.ch'])
  })

  it('replie à 75 octets sans couper un caractère, et le dépliage rend la ligne', () => {
    const titre = 'Soirée dégustation à l’Œnothèque — été indien, fête des vendanges 🍇 et crème brûlée '.repeat(3)
    const ics = genererIcs({ ...base, evenements: [evt({ titre, dates: [occ({ du: '2026-10-03' })] })] })
    for (const physique of ics.split('\r\n')) {
      expect(octets(physique)).toBeLessThanOrEqual(75)
      // Une moitié de paire de substitution trahirait un emoji coupé en deux.
      expect(physique).not.toMatch(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/)
    }
    expect(lignesDe(ics)).toContain(`SUMMARY:${echapperTexteIcs(titre.trim())}`)
  })

  it('repli : 75 octets pour la première ligne, 74 plus l’espace pour les suivantes', () => {
    const r = replierLigneIcs(`SUMMARY:${'é'.repeat(80)}`).split('\r\n')
    expect(octets(r[0])).toBe(74) // 8 + 33 × 2 ; un « é » de plus ferait 76
    for (const s of r.slice(1)) {
      expect(s.startsWith(' ')).toBe(true)
      expect(octets(s)).toBeLessThanOrEqual(75)
    }
    expect(replierLigneIcs('court')).toBe('court')
  })

  it('échappement : barre oblique inverse d’abord, retours chariot normalisés, contrôles retirés', () => {
    expect(echapperTexteIcs('a\\b;c,d\r\ne\rfg')).toBe('a\\\\b\\;c\\,d\\ne\\nfg')
  })
})

describe('finDeVente, venteOuverte', () => {
  const Z = (iso: string) => new Date(iso)
  it('à heure précise, sur un jour : jusqu’au début (20 h à Zurich, heure d’été = 18 h UTC)', () => {
    expect(finDeVente(occ({ du: '2026-10-03', deHeure: '20:00', aHeure: '22:00' })).toISOString()).toBe('2026-10-03T18:00:00.000Z')
  })
  it('sans heure : jusqu’à la fin du jour (minuit suivant à Zurich)', () => {
    expect(finDeVente(occ({ du: '2026-10-03' })).toISOString()).toBe('2026-10-03T22:00:00.000Z')
  })
  it('sur plusieurs jours : jusqu’à la fin — une exposition se vend tant qu’elle dure', () => {
    expect(finDeVente(occ({ du: '2026-09-10', au: '2027-01-10' })).toISOString()).toBe('2027-01-10T23:00:00.000Z')
    expect(finDeVente(occ({ du: '2026-10-02', au: '2026-10-04', deHeure: '10:00', aHeure: '18:00' })).toISOString()).toBe('2026-10-04T16:00:00.000Z')
  })
  it('venteOuverte : avant la fin de vente, et sans statut', () => {
    const expo = occ({ du: '2026-09-10', au: '2027-01-10' })
    expect(venteOuverte(expo, Z('2026-10-01T12:00:00Z'))).toBe(true)
    expect(venteOuverte({ ...expo, statut: 'complet' }, Z('2026-10-01T12:00:00Z'))).toBe(false)
    const concert = occ({ du: '2026-10-03', deHeure: '20:00' })
    expect(venteOuverte(concert, Z('2026-10-03T17:59:00Z'))).toBe(true)
    expect(venteOuverte(concert, Z('2026-10-03T18:00:00Z'))).toBe(false)
  })
})

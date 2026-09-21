// Horaires d'ouverture structurés.
//
// Jusqu'ici, un site portait ses horaires en texte libre — « Lundi au
// vendredi · 9h00–18h00 ». Lisible par un humain, inutilisable par une
// machine : impossible de dire « ouvert » ou « fermé » à 17 h 40, impossible
// de savoir qu'on est un 1er août, impossible de les donner à Google sous une
// forme qu'il comprend.
//
// Ce module est pur : aucune dépendance au navigateur, à la base ou à React.
// Le CMS s'en sert pour l'éditeur et l'aperçu, le site public pour l'état en
// direct, le résumé affiché par les gabarits et le balisage JSON-LD. Une seule
// implémentation, donc un seul comportement.
//
// Tout se calcule à l'heure murale de Zurich, celle de l'établissement : un
// visiteur qui consulte le site depuis Montréal doit lire « ouvert jusqu'à
// 18 h », pas une heure convertie dans son fuseau.

import { FERIES_SUISSES, ajouterJours, jourDeSemaine, paques, type FerieDef } from './feries-suisses'

export const FUSEAU_HORAIRES = 'Europe/Zurich'

// ── Modèle ──────────────────────────────────────────────────────────────────

/** Une plage d'ouverture, en heures murales « HH:MM ». Une fin inférieure ou
 *  égale au début passe minuit : 18:00–02:00 se termine le lendemain, et
 *  00:00–00:00 couvre la journée entière. */
export interface Plage { debut: string; fin: string }

/** Les plages d'un jour de semaine. 0 = dimanche, comme `Date.getDay()` et
 *  `extract(dow)` en SQL : une seule convention dans toute la plateforme. */
export interface JourHoraires { jour: number; plages: Plage[] }

/** Une fermeture sur plusieurs jours (vacances, travaux), bornes comprises. */
export interface Fermeture { du: string; au: string; motif?: string | null }

/** Un jour qui ne suit pas la semaine type : fermé (plages vides) ou ouvert
 *  autrement. Prioritaire sur tout le reste, jours fériés compris. */
export interface Exception { date: string; plages: Plage[]; motif?: string | null }

export interface Horaires {
  semaine: JourHoraires[]
  /** Code du canton (VS, VD…) : décide des jours fériés proposés. */
  canton?: string | null
  /** Choix de l'établissement, jour férié par jour férié : `true` = fermé,
   *  `false` = ouvert comme un jour ordinaire. Absent = la règle du canton. */
  feries?: Record<string, boolean>
  fermetures?: Fermeture[]
  exceptions?: Exception[]
  /** Une précision affichée sous les horaires, ex. « Sur rendez-vous le samedi ». */
  note?: string | null
  /** Le texte `business.hours` écrit en même temps que ces horaires. S'il a
   *  changé depuis — l'espace client édite encore le texte —, la semaine
   *  structurée est périmée et c'est le texte qui fait foi. */
  signature?: string | null
}

export const JOURS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'] as const
export const JOURS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
/** Ordre d'une semaine de travail, du lundi au dimanche. */
export const ORDRE_SEMAINE = [1, 2, 3, 4, 5, 6, 0] as const

export const CANTONS: readonly (readonly [string, string])[] = [
  ['AG', 'Argovie'], ['AI', 'Appenzell Rhodes-Intérieures'], ['AR', 'Appenzell Rhodes-Extérieures'],
  ['BE', 'Berne'], ['BL', 'Bâle-Campagne'], ['BS', 'Bâle-Ville'], ['FR', 'Fribourg'], ['GE', 'Genève'],
  ['GL', 'Glaris'], ['GR', 'Grisons'], ['JU', 'Jura'], ['LU', 'Lucerne'], ['NE', 'Neuchâtel'],
  ['NW', 'Nidwald'], ['OW', 'Obwald'], ['SG', 'Saint-Gall'], ['SH', 'Schaffhouse'], ['SO', 'Soleure'],
  ['SZ', 'Schwytz'], ['TG', 'Thurgovie'], ['TI', 'Tessin'], ['UR', 'Uri'], ['VD', 'Vaud'],
  ['VS', 'Valais'], ['ZG', 'Zoug'], ['ZH', 'Zurich'],
]

// ── Heures et dates ─────────────────────────────────────────────────────────

const HEURE = /^([01]\d|2[0-3]):([0-5]\d)$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

export const heureValide = (h: string) => HEURE.test(h)
export const dateValide = (d: string) => DATE.test(d) && !Number.isNaN(Date.parse(`${d}T12:00:00Z`))

/** « 9:5 », « 9h », « 09.30 » → « 09:05 », « 09:00 », « 09:30 ». null si illisible. */
export function normaliserHeure(v: string): string | null {
  const m = String(v ?? '').trim().match(/^(\d{1,2})(?:\s*[h:.]\s*(\d{1,2})?)?$/i)
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2] ?? 0)
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null
  return `${String(h === 24 ? 0 : h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export const enMinutes = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
export const passeMinuit = (p: Plage) => enMinutes(p.fin) <= enMinutes(p.debut)

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** L'heure murale de Zurich à cet instant : date, minutes depuis minuit, jour. */
export function maintenantZurich(instant: Date = new Date()): { date: string; minutes: number; jour: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSEAU_HORAIRES, hourCycle: 'h23', weekday: 'short',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(instant)
  const g = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  return {
    date: `${g('year')}-${g('month')}-${g('day')}`,
    minutes: (Number(g('hour')) % 24) * 60 + Number(g('minute')),
    jour: WD[g('weekday')] ?? 0,
  }
}

// ── Jours fériés ────────────────────────────────────────────────────────────

/** Date d'un jour férié une année donnée, ou null s'il n'a pas lieu. */
export function dateDuFerie(def: FerieDef, annee: number): string | null {
  const r = def.regle
  if (r.type === 'fixe') return `${annee}-${String(r.mois).padStart(2, '0')}-${String(r.jour).padStart(2, '0')}`
  if (r.type === 'paques') return ajouterJours(paques(annee), r.decalage)
  return r.calcul(annee)
}

/** Ce que le canton prévoit pour ce jour férié : `oui` sur tout le canton,
 *  `partiel` dans une partie des communes seulement, `non` sinon. */
export function statutCantonal(def: FerieDef, canton?: string | null): 'oui' | 'partiel' | 'non' {
  if (def.partout) return 'oui'
  if (!canton) return 'non'
  if (def.cantons.includes(canton)) return 'oui'
  if (def.partiel?.includes(canton)) return 'partiel'
  return 'non'
}

/** L'établissement est-il fermé ce jour férié ? Son choix l'emporte ; sinon,
 *  fermé là où le jour est férié sur tout le canton. Un jour férié dans une
 *  partie des communes seulement n'est pas présumé : l'établissement coche. */
export function fermeCeFerie(h: Pick<Horaires, 'canton' | 'feries'>, def: FerieDef): boolean {
  const choix = h.feries?.[def.cle]
  if (typeof choix === 'boolean') return choix
  return statutCantonal(def, h.canton) === 'oui'
}

/** Des jours souvent chômés là où ils ne sont pas fériés — le lundi de
 *  Pâques en Valais. Proposés partout, jamais cochés d'office. */
export const FERIES_USUELS: ReadonlySet<string> = new Set(['vendredi-saint', 'lundi-de-paques', 'lundi-de-pentecote', 'saint-etienne', 'saint-berchtold'])

/** Les jours fériés proposés à un établissement : ceux de son canton, entiers
 *  ou partiels, les jours souvent chômés, et ceux qu'il a réglés lui-même. */
export function feriesProposes(h: Pick<Horaires, 'canton' | 'feries'>): FerieDef[] {
  return FERIES_SUISSES.filter(d => statutCantonal(d, h.canton) !== 'non' || FERIES_USUELS.has(d.cle) || h.feries?.[d.cle] !== undefined)
}

/** Les jours fériés où l'établissement est fermé, datés, pour une année. */
export function feriesFermes(h: Pick<Horaires, 'canton' | 'feries'>, annee: number): { date: string; cle: string; libelle: string }[] {
  const out: { date: string; cle: string; libelle: string }[] = []
  for (const def of FERIES_SUISSES) {
    if (!fermeCeFerie(h, def)) continue
    const date = dateDuFerie(def, annee)
    if (date) out.push({ date, cle: def.cle, libelle: def.libelle })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

// ── Un jour donné ───────────────────────────────────────────────────────────

export type Special = 'exception' | 'fermeture' | 'ferie'
export interface Journee {
  date: string; plages: Plage[]; motif: string | null; special: Special | null
  /** Les plages de la semaine type ce jour-là, pour savoir si le jour
   *  particulier change vraiment quelque chose. */
  habituel: Plage[]
}

const memePlages = (a: Plage[], b: Plage[]) =>
  a.length === b.length && a.every((p, i) => p.debut === b[i].debut && p.fin === b[i].fin)

/** Un jour particulier qui ne change rien — la Toussaint un dimanche déjà
 *  fermé — n'a pas à être annoncé. */
export const changeQuelqueChose = (j: Journee) => !!j.special && !memePlages(j.plages, j.habituel)

/** Crée une fonction « journée » qui mémorise les jours fériés par année :
 *  l'état en direct et le balisage interrogent des dizaines de jours. */
export function calendrier(h: Horaires): (date: string) => Journee {
  const parAnnee = new Map<number, Map<string, string>>()
  const feriesDe = (annee: number) => {
    let m = parAnnee.get(annee)
    if (!m) { m = new Map(feriesFermes(h, annee).map(f => [f.date, f.libelle])); parAnnee.set(annee, m) }
    return m
  }
  const semaine = new Map((h.semaine ?? []).map(j => [j.jour, triees(j.plages)]))
  return (date: string): Journee => {
    const habituel = semaine.get(jourDeSemaine(date)) ?? []
    const ex = (h.exceptions ?? []).find(e => e.date === date)
    if (ex) return { date, plages: triees(ex.plages), motif: ex.motif?.trim() || null, special: 'exception', habituel }
    const f = (h.fermetures ?? []).find(x => x.du <= date && date <= x.au)
    if (f) return { date, plages: [], motif: f.motif?.trim() || null, special: 'fermeture', habituel }
    const ferie = feriesDe(Number(date.slice(0, 4))).get(date)
    if (ferie) return { date, plages: [], motif: ferie, special: 'ferie', habituel }
    return { date, plages: habituel, motif: null, special: null, habituel }
  }
}

const triees = (plages: Plage[] = []) =>
  plages.filter(p => heureValide(p.debut) && heureValide(p.fin)).slice().sort((a, b) => a.debut.localeCompare(b.debut))

export const aDesHoraires = (h?: Horaires | null) =>
  !!h && (h.semaine ?? []).some(j => (j.plages ?? []).length > 0)

// ── L'état en direct ────────────────────────────────────────────────────────

export interface Moment { date: string; heure: string; dans: number }

export interface EtatOuverture {
  ouvert: boolean
  /** Si ouvert : quand ça ferme. */
  jusqua?: Moment
  /** Si fermé : la prochaine ouverture, dans les quinze jours. */
  prochaine?: Moment
  /** Pourquoi c'est fermé aujourd'hui, quand ce n'est pas la semaine type. */
  motif?: string | null
  special?: Special | null
}

/** Ouvert ou fermé, maintenant, et jusqu'à quand. */
export function etatOuverture(h: Horaires, instant: Date = new Date()): EtatOuverture {
  const { date, minutes } = maintenantZurich(instant)
  const jour = calendrier(h)
  const auj = jour(date)
  const hier = jour(ajouterJours(date, -1))

  // Une plage d'hier qui passe minuit peut encore être en cours.
  for (const p of hier.plages) {
    if (passeMinuit(p) && minutes < enMinutes(p.fin)) {
      return { ouvert: true, jusqua: prolonger(jour, date, p.fin, enMinutes(p.fin) - minutes) }
    }
  }
  for (const p of auj.plages) {
    const d = enMinutes(p.debut), f = enMinutes(p.fin)
    if (!passeMinuit(p) && d <= minutes && minutes < f) {
      return { ouvert: true, jusqua: prolonger(jour, date, p.fin, f - minutes) }
    }
    if (passeMinuit(p) && minutes >= d) {
      return { ouvert: true, jusqua: prolonger(jour, ajouterJours(date, 1), p.fin, 1440 - minutes + f) }
    }
  }

  // Fermé : la prochaine plage qui commence, aujourd'hui plus tard ou après.
  // Le motif du jour n'est donné que s'il explique la fermeture : « Fermé ·
  // Toussaint » un dimanche où l'on est fermé de toute façon induirait en erreur.
  const motif = changeQuelqueChose(auj) ? auj.motif : null
  const special = changeQuelqueChose(auj) ? auj.special : null
  for (let i = 0; i <= 14; i++) {
    const d = ajouterJours(date, i)
    const p = jour(d).plages.find(x => i > 0 || enMinutes(x.debut) > minutes)
    if (p) {
      return {
        ouvert: false, motif, special,
        prochaine: { date: d, heure: p.debut, dans: i * 1440 + enMinutes(p.debut) - minutes },
      }
    }
  }
  return { ouvert: false, motif, special }
}

/** Deux plages qui se touchent (9–12 puis 12–14) ne ferment pas à midi. */
function prolonger(jour: (d: string) => Journee, date: string, fin: string, dans: number): Moment {
  let heure = fin, total = dans
  for (let n = 0; n < 6; n++) {
    const suite = jour(date).plages.find(p => p.debut === heure && !passeMinuit(p))
    if (!suite) break
    total += enMinutes(suite.fin) - enMinutes(suite.debut)
    heure = suite.fin
  }
  return { date, heure, dans: total }
}

// ── Textes ──────────────────────────────────────────────────────────────────

export type LangueHoraires = 'fr' | 'en'

/** « 18:00 » → « 18h », « 13:30 » → « 13h30 » ; en anglais, « 18:00 ». */
export function heureLisible(hhmm: string, lang: LangueHoraires = 'fr'): string {
  if (lang === 'en') return hhmm
  const [h, m] = hhmm.split(':')
  return `${Number(h)}h${m === '00' ? '' : m}`
}

const plagesLisibles = (plages: Plage[], lang: LangueHoraires) =>
  plages.map(p => `${heureLisible(p.debut, lang)}–${heureLisible(p.fin, lang)}`).join(', ')

/** Le bandeau d'état : un ton (pour la pastille), un titre court, un détail. */
export function phraseEtat(
  e: EtatOuverture, instant: Date = new Date(), lang: LangueHoraires = 'fr',
): { ton: 'ouvert' | 'bientot' | 'ferme'; titre: string; detail: string } {
  const fr = lang === 'fr'
  const { date } = maintenantZurich(instant)
  const quand = (m: Moment) => {
    if (m.date === date) return fr ? `à ${heureLisible(m.heure)}` : `at ${m.heure}`
    if (m.date === ajouterJours(date, 1)) return fr ? `demain à ${heureLisible(m.heure)}` : `tomorrow at ${m.heure}`
    const ecart = Math.round((Date.parse(`${m.date}T12:00:00Z`) - Date.parse(`${date}T12:00:00Z`)) / 864e5)
    const jourNom = (fr ? JOURS_FR : JOURS_EN)[jourDeSemaine(m.date)]
    if (ecart < 7) return fr ? `${jourNom.toLowerCase()} à ${heureLisible(m.heure)}` : `${jourNom} at ${m.heure}`
    const d = new Intl.DateTimeFormat(fr ? 'fr-CH' : 'en-CH', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${m.date}T12:00:00Z`))
    return fr ? `le ${d}` : `on ${d}`
  }
  const duree = (min: number) => min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`

  if (e.ouvert && e.jusqua) {
    // La fermeture tombe presque toujours dans les vingt-quatre heures : l'heure
    // suffit, même quand un bar ferme à 2 h le lendemain.
    const fin = heureLisible(e.jusqua.heure, lang)
    if (e.jusqua.dans <= 60) return { ton: 'bientot', titre: fr ? `Ferme dans ${duree(e.jusqua.dans)}` : `Closes in ${duree(e.jusqua.dans)}`, detail: fr ? `Fermeture à ${fin}` : `Closing at ${fin}` }
    return { ton: 'ouvert', titre: fr ? 'Ouvert' : 'Open', detail: fr ? `Jusqu’à ${fin}` : `Until ${fin}` }
  }
  const motif = e.motif ? ` · ${e.motif}` : ''
  if (e.prochaine) {
    if (e.prochaine.date === date && e.prochaine.dans <= 60) {
      return { ton: 'ferme', titre: fr ? `Ouvre dans ${duree(e.prochaine.dans)}` : `Opens in ${duree(e.prochaine.dans)}`, detail: fr ? `Ouverture ${quand(e.prochaine)}` : `Opening ${quand(e.prochaine)}` }
    }
    return { ton: 'ferme', titre: (fr ? 'Fermé' : 'Closed') + motif, detail: fr ? `Ouvre ${quand(e.prochaine)}` : `Opens ${quand(e.prochaine)}` }
  }
  return { ton: 'ferme', titre: (fr ? 'Fermé' : 'Closed') + motif, detail: '' }
}

/** La semaine type en lignes lisibles, les jours identiques regroupés :
 *  « Lundi – vendredi · 9h–12h, 13h30–18h ». C'est la forme `{ day, hours }`
 *  que les gabarits affichent déjà ; ils n'ont rien à changer. */
export function resumeSemaine(h: Horaires, lang: LangueHoraires = 'fr'): { day: string; hours: string; jours: number[] }[] {
  const noms = lang === 'fr' ? JOURS_FR : JOURS_EN
  const signature = (j: number) => plagesLisibles(triees(h.semaine?.find(x => x.jour === j)?.plages ?? []), lang)
  const groupes: { jours: number[]; hours: string }[] = []
  for (const j of ORDRE_SEMAINE) {
    const s = signature(j)
    const dernier = groupes[groupes.length - 1]
    if (dernier && dernier.hours === s) dernier.jours.push(j)
    else groupes.push({ jours: [j], hours: s })
  }
  const ferme = lang === 'fr' ? 'Fermé' : 'Closed'
  return groupes.map(g => {
    const a = noms[g.jours[0]], b = noms[g.jours[g.jours.length - 1]]
    const day = g.jours.length === 1 ? a
      : g.jours.length === 2 ? `${a} ${lang === 'fr' ? 'et' : 'and'} ${lang === 'fr' ? b.toLowerCase() : b}`
      : `${a} – ${lang === 'fr' ? b.toLowerCase() : b}`
    return { day, hours: g.hours || ferme, jours: g.jours }
  })
}

/** Les jours particuliers à venir (fériés, vacances, exceptions), pour les
 *  annoncer : « Fermé le 1er août, Fête nationale ». */
export function joursParticuliers(h: Horaires, instant: Date = new Date(), nbJours = 30): Journee[] {
  const { date } = maintenantZurich(instant)
  const jour = calendrier(h)
  const out: Journee[] = []
  for (let i = 0; i < nbJours; i++) {
    const j = jour(ajouterJours(date, i))
    if (changeQuelqueChose(j)) out.push(j)
  }
  return out
}

// ── Google ──────────────────────────────────────────────────────────────────

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Les horaires sous la forme que Google lit (schema.org). Les jours
 *  particuliers des `nbJours` suivants partent en `specialOpeningHoursSpecification` ;
 *  « fermé toute la journée » s'écrit 00:00–00:00, c'est la convention que
 *  Google documente. */
export function horairesJsonLd(h: Horaires, instant: Date = new Date(), nbJours = 60): Record<string, unknown> | null {
  if (!aDesHoraires(h)) return null
  const parPlage = new Map<string, number[]>()
  for (const j of ORDRE_SEMAINE) {
    for (const p of triees(h.semaine.find(x => x.jour === j)?.plages ?? [])) {
      const k = `${p.debut}-${p.fin}`
      parPlage.set(k, [...(parPlage.get(k) ?? []), j])
    }
  }
  const openingHoursSpecification = [...parPlage.entries()].map(([k, jours]) => {
    const [opens, closes] = k.split('-')
    return { '@type': 'OpeningHoursSpecification', dayOfWeek: jours.map(j => DOW[j]), opens, closes }
  })
  const special = joursParticuliers(h, instant, nbJours).flatMap(j => j.plages.length
    ? j.plages.map(p => ({ '@type': 'OpeningHoursSpecification', validFrom: j.date, validThrough: j.date, opens: p.debut, closes: p.fin }))
    : [{ '@type': 'OpeningHoursSpecification', validFrom: j.date, validThrough: j.date, opens: '00:00', closes: '00:00' }])
  return special.length ? { openingHoursSpecification, specialOpeningHoursSpecification: special } : { openingHoursSpecification }
}

// ── Lire des horaires écrits en texte libre ────────────────────────────────
//
// Les sites existants portent des phrases : « Lundi au vendredi · 9h00–18h00 »,
// « Mardi–samedi 9h–12h / 13h30–18h30 », « Dimanche fermé ». On en tire des
// plages quand c'est sans ambiguïté, et on rend à part ce qu'on n'a pas su
// lire : l'éditeur le montre, rien ne se perd en silence.

const NOMS_JOURS: [RegExp, number][] = [
  [/^(lundi|lun|lu|mo|mon|monday|montag)$/, 1], [/^(mardi|mar|ma|tu|tue|tuesday|dienstag|di)$/, 2],
  [/^(mercredi|mer|me|we|wed|wednesday|mittwoch|mi)$/, 3], [/^(jeudi|jeu|je|th|thu|thursday|donnerstag|do)$/, 4],
  [/^(vendredi|ven|ve|fr|fri|friday|freitag)$/, 5], [/^(samedi|sam|sa|sat|saturday|samstag)$/, 6],
  [/^(dimanche|dim|di|su|sun|sunday|sonntag|so)$/, 0],
]

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function jourDuMot(mot: string): number | null {
  const m = mot.replace(/[^a-z]/g, '')
  // « di » est dimanche en français et Dienstag en allemand : en français d'abord.
  for (const [re, n] of NOMS_JOURS) if (re.test(m)) return m === 'di' ? 0 : n
  return null
}

/** Rang d'un jour dans la semaine de travail : lundi = 0 … dimanche = 6. */
const rang = (j: number) => (j + 6) % 7
const deRang = (r: number) => (r + 1) % 7

function lireJours(texte: string): number[] | null {
  const t = sansAccents(texte).replace(/\b(du|le|les|de|et les|jours?)\b/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t) return null
  if (/tous les jours|chaque jour|7\s*\/\s*7|7 jours|daily|every day|taglich/.test(sansAccents(texte))) return [0, 1, 2, 3, 4, 5, 6]
  if (/^(en )?semaine$/.test(t)) return [1, 2, 3, 4, 5]
  if (/^week-?end$/.test(t)) return [6, 0]
  const jours = new Set<number>()
  // Morceaux séparés par virgule, « et », « & », « + », « / ».
  for (const morceau of t.split(/\s*(?:,|\bet\b|&|\+|\/|\band\b|\bund\b)\s*/)) {
    if (!morceau) continue
    // Un intervalle : un tiret, ou un mot (« au », « à ») entouré d'espaces.
    // Sans les espaces, « samedi » se lisait « s » à « medi ».
    const intervalle = morceau.match(/^([a-z.]+)\s*[-–—]\s*([a-z.]+)$/) ?? morceau.match(/^([a-z.]+)\s+(?:au|a|to|bis)\s+([a-z.]+)$/)
    if (intervalle) {
      const a = jourDuMot(intervalle[1]), b = jourDuMot(intervalle[2])
      if (a === null || b === null) return null
      for (let r = rang(a); ; r = (r + 1) % 7) { jours.add(deRang(r)); if (r === rang(b)) break }
      continue
    }
    const seul = jourDuMot(morceau)
    if (seul === null) return null
    jours.add(seul)
  }
  return jours.size ? [...jours] : null
}

const RE_PLAGE = /(\d{1,2})\s*(?:[h:.]\s*(\d{2})?)?\s*(?:-|–|—|à|a|to|bis|jusqu'?a|jusqu’a)\s*(\d{1,2})\s*(?:[h:.]\s*(\d{2})?)?/g

function lirePlages(texte: string): Plage[] | 'ferme' | null {
  const t = sansAccents(texte)
  if (/\b(ferme|fermee|closed|geschlossen|repos)\b/.test(t) && !/\d/.test(t)) return 'ferme'
  const plages: Plage[] = []
  for (const m of t.matchAll(RE_PLAGE)) {
    const debut = normaliserHeure(`${m[1]}:${m[2] ?? '00'}`), fin = normaliserHeure(`${m[3]}:${m[4] ?? '00'}`)
    if (!debut || !fin) return null
    plages.push({ debut, fin })
  }
  return plages.length ? plages : null
}

export interface LectureHoraires {
  horaires: Horaires
  /** Les lignes qu'on n'a pas su lire, telles quelles. */
  ignorees: string[]
  /** Des jours ont-ils été trouvés ? Faux = rien d'exploitable. */
  lu: boolean
}

/** Tire des horaires structurés d'un texte libre ou d'une liste `{ day, hours }`. */
export function lireHorairesTexte(entree: unknown): LectureHoraires {
  const lignes: string[] = Array.isArray(entree)
    ? (entree as { day?: string; hours?: string }[]).map(c => `${c.day ?? ''} · ${c.hours ?? ''}`)
    : typeof entree === 'string' ? entree.split(/\r?\n|;|\s\|\s/) : []

  const parJour = new Map<number, Plage[]>()
  const ignorees: string[] = []
  let note: string | null = null

  // Une ligne peut porter plusieurs groupes séparés par un point médian —
  // « Mardi–vendredi 9h–18h30 · Samedi 9h–17h » — ou un seul, coupé entre
  // jours et heures — « Lundi au vendredi · 9h00–18h00 ». Un morceau sans
  // heure ni « fermé » est un début de groupe : on le recolle au suivant.
  const groupes: string[] = []
  for (const ligne of lignes.map(l => l.trim()).filter(Boolean)) {
    let enAttente = ''
    for (const morceau of ligne.split(/\s+[·•]\s+|\s+[·•]$|^[·•]\s+/).map(m => m.trim()).filter(Boolean)) {
      // Complet = une vraie plage horaire, ou « fermé ». Un simple chiffre ne
      // suffit pas : « Assistance 7 j/7 » est un début de groupe.
      const complet = /\d{1,2}\s*(?:[h:.]\s*\d{0,2})?\s*(?:-|–|—|à|to|bis)\s*\d/i.test(morceau) || /ferm[ée]|closed|geschlossen/i.test(morceau)
      if (!complet) { enAttente = enAttente ? `${enAttente} ${morceau}` : morceau; continue }
      groupes.push(enAttente ? `${enAttente} ${morceau}` : morceau)
      enAttente = ''
    }
    if (enAttente) groupes.push(enAttente)
  }

  for (const brute of groupes) {
    if (/rendez-vous|rdv|appointment/i.test(brute) && !/\d/.test(brute)) { note = brute; continue }
    // « Assistance 7 j/7 · 7h–21h », « Tous les jours 8h–20h » : tous les jours.
    const partout = brute.match(/7\s*j(?:ours)?\s*\/\s*7|7\s*\/\s*7|tous les jours|chaque jour|every day|daily/i)
    let jours: number[] | null, partieHeures: string
    if (partout) {
      jours = [0, 1, 2, 3, 4, 5, 6]
      partieHeures = brute.slice((partout.index ?? 0) + partout[0].length)
    } else {
      // La partie « jours » s'arrête au premier chiffre ou au mot « fermé ».
      const coupe = brute.search(/\d|ferm[ée]|closed|geschlossen/i)
      const partieJours = (coupe >= 0 ? brute.slice(0, coupe) : brute).replace(/[·•:|,\-–—\s]+$/, '').trim()
      partieHeures = coupe >= 0 ? brute.slice(coupe) : ''
      jours = lireJours(partieJours)
    }
    const plages = lirePlages(partieHeures)
    if (!jours || !plages) { ignorees.push(brute); continue }
    for (const j of jours) parJour.set(j, plages === 'ferme' ? [] : [...(parJour.get(j) ?? []), ...plages])
  }

  const semaine: JourHoraires[] = [0, 1, 2, 3, 4, 5, 6].map(j => ({ jour: j, plages: triees(parJour.get(j) ?? []) }))
  return { horaires: { semaine, note }, ignorees, lu: parJour.size > 0 }
}

/** Nettoie des horaires reçus d'un formulaire ou de la base : heures valides,
 *  dates valides, sept jours au plus, rien d'autre. Sert à la validation
 *  serveur comme à la lecture d'une donnée ancienne. */
export function assainirHoraires(v: unknown): Horaires {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<Horaires>
  const plagesPropres = (ps: unknown): Plage[] => (Array.isArray(ps) ? ps : [])
    .map(p => ({ debut: normaliserHeure(String((p as Plage)?.debut ?? '')), fin: normaliserHeure(String((p as Plage)?.fin ?? '')) }))
    .filter((p): p is Plage => !!p.debut && !!p.fin)
    .slice(0, 6)
  const texte = (s: unknown, max = 120) => typeof s === 'string' && s.trim() ? s.trim().slice(0, max) : null
  const semaine = [0, 1, 2, 3, 4, 5, 6].map(j => ({
    jour: j, plages: triees(plagesPropres((o.semaine ?? []).find(x => Number(x?.jour) === j)?.plages)),
  }))
  const cantonsValides = new Set(CANTONS.map(c => c[0]))
  const cles = new Set(FERIES_SUISSES.map(d => d.cle))
  const feries: Record<string, boolean> = {}
  for (const [k, b] of Object.entries(o.feries ?? {})) if (cles.has(k) && typeof b === 'boolean') feries[k] = b
  return {
    semaine,
    canton: typeof o.canton === 'string' && cantonsValides.has(o.canton) ? o.canton : null,
    feries,
    fermetures: (Array.isArray(o.fermetures) ? o.fermetures : [])
      .filter(f => dateValide(String(f?.du)) && dateValide(String(f?.au)) && String(f.du) <= String(f.au))
      .map(f => ({ du: f.du, au: f.au, motif: texte(f.motif) }))
      .slice(0, 50),
    exceptions: (Array.isArray(o.exceptions) ? o.exceptions : [])
      .filter(e => dateValide(String(e?.date)))
      .map(e => ({ date: e.date, plages: triees(plagesPropres(e.plages)), motif: texte(e.motif) }))
      .slice(0, 100),
    note: texte(o.note, 200),
    signature: typeof o.signature === 'string' ? o.signature.slice(0, 4000) : null,
  }
}

// ── Les horaires d'un site ──────────────────────────────────────────────────

/** Une empreinte stable du texte des horaires, sous ses deux formes (liste
 *  `{ day, hours }` ou chaîne). Sert à savoir si quelqu'un l'a retouché. */
export function signatureTexte(hours: unknown): string {
  if (Array.isArray(hours)) return hours.map(c => `${String(c?.day ?? '').trim()} · ${String(c?.hours ?? '').trim()}`).join('\n')
  return typeof hours === 'string' ? hours.trim() : ''
}

/** Le texte que les gabarits affichent, tiré des horaires structurés. */
export const lignesHoraires = (h: Horaires, lang: LangueHoraires = 'fr') =>
  resumeSemaine(h, lang).map(({ day, hours }) => ({ day, hours }))

export interface HorairesDuSite {
  /** Les horaires à utiliser, ou null s'il n'y en a pas d'exploitables. */
  horaires: Horaires | null
  /** D'où ils viennent : l'écran Horaires du CMS, ou la lecture du texte. */
  source: 'structure' | 'texte' | null
  /** Le texte brut, ligne par ligne, pour l'afficher quand rien n'est lisible. */
  lignes: string[]
}

/** Les horaires d'un site, à partir de son `business`.
 *
 *  - Horaires structurés et texte inchangé depuis : on les prend tels quels.
 *  - Texte retouché depuis (espace client), ou pas de structure : on lit le
 *    texte. S'il se lit sans reste, on s'en sert pour la semaine, et on garde
 *    ce que le texte ne sait pas dire — canton, fériés, vacances.
 *  - Texte illisible : pas d'état en direct. Mieux vaut ne rien dire qu'un
 *    « ouvert » faux.
 *
 *  Sans configuration explicite, aucun jour férié n'est présumé : un musée
 *  ouvert le 1er août ne doit pas se voir annoncé fermé parce qu'il n'a
 *  jamais réglé ses horaires. */
export function horairesDuSite(business: unknown): HorairesDuSite {
  const b = (business && typeof business === 'object' ? business : {}) as { hours?: unknown; horaires?: unknown }
  const sig = signatureTexte(b.hours)
  const lignes = sig ? sig.split('\n').map(l => l.replace(/\s·\s*$/, '').trim()).filter(Boolean) : []
  const structure = b.horaires && typeof b.horaires === 'object' ? assainirHoraires(b.horaires) : null

  if (structure && aDesHoraires(structure) && (structure.signature == null || structure.signature === sig)) {
    return { horaires: structure, source: 'structure', lignes }
  }
  const lu = lireHorairesTexte(b.hours)
  if (lu.lu && lu.ignorees.length === 0) {
    const sansFeries = Object.fromEntries(FERIES_SUISSES.map(d => [d.cle, false]))
    const horaires: Horaires = structure
      ? { ...structure, semaine: lu.horaires.semaine, note: structure.note ?? lu.horaires.note }
      : { ...lu.horaires, feries: sansFeries }
    return { horaires, source: 'texte', lignes }
  }
  return { horaires: null, source: null, lignes }
}

/** Le canton qu'une adresse laisse deviner, seulement quand c'est sûr : le nom
 *  du canton écrit en toutes lettres, ou un NPA valaisan ou genevois. Ailleurs
 *  les numéros postaux chevauchent les frontières cantonales : on ne devine
 *  pas, l'établissement choisit. */
export function cantonDeLAdresse(adresse: unknown): string | null {
  const a = sansAccents(String(adresse ?? ''))
  const noms: [RegExp, string][] = [
    [/\bvalais\b|\bwallis\b/, 'VS'], [/\bgeneve\b|\bgenf\b/, 'GE'], [/\bvaud\b|\bwaadt\b/, 'VD'],
    [/\bfribourg\b|\bfreiburg\b/, 'FR'], [/\bneuchatel\b/, 'NE'], [/\bjura\b/, 'JU'], [/\btessin\b|\bticino\b/, 'TI'],
  ]
  for (const [re, c] of noms) if (re.test(a)) return c
  const npa = a.match(/(?:\bch-?\s*)?\b(\d{4})\b/)
  if (!npa) return null
  const n = Number(npa[1])
  if ((n >= 1870 && n <= 1875) || (n >= 1890 && n <= 1999) || (n >= 3900 && n <= 3999)) return 'VS'
  if (n >= 1200 && n <= 1299) return 'GE'
  return null
}

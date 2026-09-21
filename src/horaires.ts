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
//
// Règle de conduite : dans le doute, se taire. Un « ouvert » faux coûte un
// client devant une porte fermée ; un état absent ne coûte rien.

import { FERIES_SUISSES, ajouterJours, jourDeSemaine, paques, type FerieDef } from './feries-suisses'

export const FUSEAU_HORAIRES = 'Europe/Zurich'

// ── Modèle ──────────────────────────────────────────────────────────────────

/** Une plage d'ouverture, en heures murales « HH:MM ». Une fin inférieure au
 *  début passe minuit : 18:00–02:00 se termine le lendemain. 00:00–00:00 est
 *  la journée entière — c'est la seule plage dont le début égale la fin. */
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
  /** Une précision, ex. « Sur rendez-vous le samedi ». Elle fait partie du
   *  texte affiché par les gabarits (dernière ligne). */
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
const JOUR = 1440

export const heureValide = (h: unknown): h is string => typeof h === 'string' && HEURE.test(h)
export const dateValide = (d: unknown): d is string => typeof d === 'string' && DATE.test(d) && !Number.isNaN(Date.parse(`${d}T12:00:00Z`))

/** « 9:5 », « 9h », « 09.30 », « 24h » → « 09:05 », « 09:00 », « 09:30 », « 00:00 ». null si illisible. */
export function normaliserHeure(v: string): string | null {
  const m = String(v ?? '').trim().match(/^(\d{1,2})(?:\s*[h:.]\s*(\d{1,2})?)?$/i)
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2] ?? 0)
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null
  return `${String(h === 24 ? 0 : h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export const enMinutes = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
export const journeeEntiere = (p: Plage) => p.debut === '00:00' && p.fin === '00:00'
export const passeMinuit = (p: Plage) => enMinutes(p.fin) <= enMinutes(p.debut)
/** Fin d'une plage, en minutes depuis le minuit de son jour : au-delà de 1440
 *  quand elle passe minuit, 1440 pour la journée entière. */
const finDe = (p: Plage) => { const d = enMinutes(p.debut), f = enMinutes(p.fin); return f <= d ? f + JOUR : f }
const dureeDe = (p: Plage) => finDe(p) - enMinutes(p.debut)

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

function partsZurich(instant: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSEAU_HORAIRES, hourCycle: 'h23', weekday: 'short',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(instant)
  const g = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  return { y: Number(g('year')), m: Number(g('month')), d: Number(g('day')), h: Number(g('hour')) % 24, mi: Number(g('minute')), wd: g('weekday') }
}

/** L'heure murale de Zurich à cet instant : date, minutes depuis minuit, jour. */
export function maintenantZurich(instant: Date = new Date()): { date: string; minutes: number; jour: number } {
  const p = partsZurich(instant)
  return {
    date: `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`,
    minutes: p.h * 60 + p.mi,
    jour: WD[p.wd] ?? 0,
  }
}

/** L'instant qui correspond à une heure murale de Zurich. Sert à compter les
 *  minutes réelles jusqu'à une fermeture, y compris la nuit d'un changement
 *  d'heure, où l'heure murale saute ou se répète. */
export function instantZurich(date: string, minutes: number): number {
  const [y, m, d] = date.split('-').map(Number)
  const naif = Date.UTC(y, m - 1, d, 0, minutes)
  const decalage = (t: number) => { const p = partsZurich(new Date(t)); return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - t }
  const t = naif - decalage(naif)
  return naif - decalage(t)
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

/** Aucun jour férié : ce que vaut un site qui n'a jamais réglé ses horaires. */
export const SANS_FERIES: Readonly<Record<string, boolean>> = Object.fromEntries(FERIES_SUISSES.map(d => [d.cle, false]))

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
const totalMinutes = (ps: Plage[]) => ps.reduce((t, p) => t + dureeDe(p), 0)

/** Un jour particulier qui ne change rien — la Toussaint un dimanche déjà
 *  fermé — n'a pas à être annoncé. */
export const changeQuelqueChose = (j: Journee) => !!j.special && !memePlages(j.plages, j.habituel)

const triees = (plages: Plage[] = []) =>
  plages.filter(p => heureValide(p?.debut) && heureValide(p?.fin)).slice().sort((a, b) => a.debut.localeCompare(b.debut))

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

export const aDesHoraires = (h?: Horaires | null) =>
  !!h && (h.semaine ?? []).some(j => (j.plages ?? []).length > 0)

// ── L'état en direct ────────────────────────────────────────────────────────

export interface Moment { date: string; heure: string; dans: number }

export interface EtatOuverture {
  ouvert: boolean
  /** Ouvert sans fermeture dans les deux semaines : « 24 h/24 ». */
  continu?: boolean
  /** Si ouvert : quand ça ferme. */
  jusqua?: Moment
  /** Si fermé : la prochaine ouverture, dans les deux semaines. */
  prochaine?: Moment
  /** Pourquoi c'est fermé aujourd'hui, quand ce n'est pas la semaine type. */
  motif?: string | null
  special?: Special | null
}

const HORIZON = 15

/** Les ouvertures de la veille à J+15, en minutes depuis le minuit du jour
 *  donné, fusionnées : des plages qui se touchent ou se chevauchent — 9–12 et
 *  12–14, 17–22 et 22–2, deux journées entières — n'en font qu'une. */
function blocs(jour: (d: string) => Journee, date: string): { debut: number; fin: number }[] {
  const bruts: { debut: number; fin: number }[] = []
  for (let i = -1; i <= HORIZON; i++) {
    for (const p of jour(ajouterJours(date, i)).plages) {
      bruts.push({ debut: i * JOUR + enMinutes(p.debut), fin: i * JOUR + finDe(p) })
    }
  }
  bruts.sort((a, b) => a.debut - b.debut)
  const out: { debut: number; fin: number }[] = []
  for (const b of bruts) {
    const d = out[out.length - 1]
    if (d && b.debut <= d.fin) d.fin = Math.max(d.fin, b.fin)
    else out.push({ ...b })
  }
  return out
}

function momentDe(date: string, offset: number, instant: Date): Moment {
  const jours = Math.floor(offset / JOUR), reste = offset - jours * JOUR
  const d = ajouterJours(date, jours)
  const heure = `${String(Math.floor(reste / 60)).padStart(2, '0')}:${String(reste % 60).padStart(2, '0')}`
  return { date: d, heure, dans: Math.max(0, Math.round((instantZurich(d, reste) - instant.getTime()) / 60000)) }
}

/** Ouvert ou fermé, maintenant, et jusqu'à quand. */
export function etatOuverture(h: Horaires, instant: Date = new Date()): EtatOuverture {
  const { date, minutes } = maintenantZurich(instant)
  const jour = calendrier(h)
  const liste = blocs(jour, date)

  const encours = liste.find(b => b.debut <= minutes && minutes < b.fin)
  if (encours) {
    if (encours.fin >= HORIZON * JOUR) return { ouvert: true, continu: true }
    return { ouvert: true, jusqua: momentDe(date, encours.fin, instant) }
  }

  // Le motif du jour n'est donné que s'il explique la fermeture : un jour
  // particulier qui RÉDUIT l'ouverture. « Fermé · Toussaint » un dimanche où
  // l'on est fermé de toute façon, ou « Fermé · Ouverture dominicale » avant
  // l'ouverture exceptionnelle, induiraient en erreur.
  const auj = jour(date)
  const explique = !!auj.special && totalMinutes(auj.plages) < totalMinutes(auj.habituel)
  const motif = explique ? auj.motif : null
  const special = explique ? auj.special : null
  const suivant = liste.find(b => b.debut > minutes)
  return suivant
    ? { ouvert: false, motif, special, prochaine: momentDe(date, suivant.debut, instant) }
    : { ouvert: false, motif, special }
}

// ── Textes ──────────────────────────────────────────────────────────────────

export type LangueHoraires = 'fr' | 'en'

/** « 18:00 » → « 18h », « 13:30 » → « 13h30 », « 00:00 » → « minuit » ;
 *  en anglais, « 18:00 ». */
export function heureLisible(hhmm: string, lang: LangueHoraires = 'fr'): string {
  if (lang === 'en') return hhmm
  if (hhmm === '00:00') return 'minuit'
  const [h, m] = hhmm.split(':')
  return `${Number(h)}h${m === '00' ? '' : m}`
}

const plageLisible = (p: Plage, lang: LangueHoraires) =>
  journeeEntiere(p) ? (lang === 'fr' ? '24 h/24' : '24 hours') : `${heureLisible(p.debut, lang)}–${heureLisible(p.fin, lang)}`

export const plagesLisibles = (plages: Plage[], lang: LangueHoraires = 'fr') =>
  plages.map(p => plageLisible(p, lang)).join(', ')

/** Le bandeau d'état : un ton (pour la pastille), un titre court, un détail. */
export function phraseEtat(
  e: EtatOuverture, instant: Date = new Date(), lang: LangueHoraires = 'fr',
): { ton: 'ouvert' | 'bientot' | 'ferme'; titre: string; detail: string } {
  const fr = lang === 'fr'
  const { date } = maintenantZurich(instant)
  const h = (m: Moment) => heureLisible(m.heure, lang)
  const quand = (m: Moment) => {
    if (m.date === date) return `${fr ? 'à' : 'at'} ${h(m)}`
    if (m.date === ajouterJours(date, 1)) return fr ? `demain à ${h(m)}` : `tomorrow at ${h(m)}`
    const ecart = Math.round((Date.parse(`${m.date}T12:00:00Z`) - Date.parse(`${date}T12:00:00Z`)) / 864e5)
    const jourNom = (fr ? JOURS_FR : JOURS_EN)[jourDeSemaine(m.date)]
    if (ecart < 7) return fr ? `${jourNom.toLowerCase()} à ${h(m)}` : `${jourNom} at ${h(m)}`
    const d = new Intl.DateTimeFormat(fr ? 'fr-CH' : 'en-CH', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${m.date}T12:00:00Z`))
    return fr ? `le ${d}` : `on ${d}`
  }
  const duree = (min: number) => {
    if (min <= 60) return `${min} min`
    const r = min % 60
    return r ? `${Math.floor(min / 60)} h ${String(r).padStart(2, '0')}` : `${Math.floor(min / 60)} h`
  }

  if (e.ouvert && e.continu) return { ton: 'ouvert', titre: fr ? 'Ouvert 24 h/24' : 'Open 24 hours', detail: '' }
  if (e.ouvert && e.jusqua) {
    // La fermeture tombe presque toujours dans les vingt-quatre heures : l'heure
    // suffit, même quand un bar ferme à 2 h le lendemain.
    const fin = h(e.jusqua)
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

/** Les jours particuliers à venir (fériés, vacances, exceptions) qui changent
 *  quelque chose, pour les annoncer : « Fermé le 1er août, Fête nationale ». */
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

/** Les jours particuliers regroupés : des vacances font une seule ligne, même
 *  quand elles englobent un dimanche déjà fermé, qui n'est pas annoncé. */
export function regrouperParticuliers(h: Horaires, jours: Journee[]): { du: string; au: string; plages: Plage[]; motif: string | null; special: Special | null }[] {
  const jour = calendrier(h)
  const out: { du: string; au: string; plages: Plage[]; motif: string | null; special: Special | null }[] = []
  for (const j of jours) {
    const d = out[out.length - 1]
    let suite = !!d && !d.plages.length && !j.plages.length && d.special === j.special && d.motif === j.motif
    // Entre les deux, seulement des jours fermés d'habitude, eux aussi pris dans
    // la même fermeture ou le même jour particulier.
    for (let x = d ? ajouterJours(d.au, 1) : j.date; suite && x < j.date; x = ajouterJours(x, 1)) {
      const entre = jour(x)
      if (entre.plages.length || entre.special !== j.special || entre.motif !== j.motif) suite = false
    }
    if (suite && d) d.au = j.date
    else out.push({ du: j.date, au: j.date, plages: j.plages, motif: j.motif, special: j.special })
  }
  return out
}

// ── Google ──────────────────────────────────────────────────────────────────

const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Google : ouvert 24 h s'écrit 00:00–23:59, fermé toute la journée
 *  00:00–00:00. La journée entière du modèle doit donc être traduite. */
const pourGoogle = (p: Plage) => journeeEntiere(p) ? { opens: '00:00', closes: '23:59' } : { opens: p.debut, closes: p.fin }

/** Les horaires sous la forme que Google lit (schema.org). Les jours
 *  particuliers des `nbJours` suivants partent en `specialOpeningHoursSpecification`. */
export function horairesJsonLd(h: Horaires, instant: Date = new Date(), nbJours = 60): Record<string, unknown> | null {
  if (!aDesHoraires(h)) return null
  const parPlage = new Map<string, number[]>()
  for (const j of ORDRE_SEMAINE) {
    for (const p of triees(h.semaine.find(x => x.jour === j)?.plages ?? [])) {
      const { opens, closes } = pourGoogle(p)
      const k = `${opens}-${closes}`
      parPlage.set(k, [...(parPlage.get(k) ?? []), j])
    }
  }
  const openingHoursSpecification = [...parPlage.entries()].map(([k, jours]) => {
    const [opens, closes] = k.split('-')
    return { '@type': 'OpeningHoursSpecification', dayOfWeek: jours.map(j => DOW[j]), opens, closes }
  })
  const special = joursParticuliers(h, instant, nbJours).flatMap(j => j.plages.length
    ? j.plages.map(p => ({ '@type': 'OpeningHoursSpecification', validFrom: j.date, validThrough: j.date, ...pourGoogle(p) }))
    : [{ '@type': 'OpeningHoursSpecification', validFrom: j.date, validThrough: j.date, opens: '00:00', closes: '00:00' }])
  return special.length ? { openingHoursSpecification, specialOpeningHoursSpecification: special } : { openingHoursSpecification }
}

// ── Lire des horaires écrits en texte libre ────────────────────────────────
//
// Les sites existants portent des phrases : « Lundi au vendredi · 9h00–18h00 »,
// « Mardi–samedi 9h–12h / 13h30–18h30 », « Dimanche fermé ». On en tire des
// plages quand c'est sans ambiguïté, et seulement alors. Tout le reste —
// « sauf le lundi », « l'après-midi », une saison, un mot inconnu — rend la
// ligne ignorée, montrée telle quelle dans l'éditeur. Une ligne mal lue
// deviendrait un état faux sur le site ; une ligne ignorée ne coûte rien.

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const NOMS_JOURS: [RegExp, number][] = [
  [/^(lundi|lun|lu|mo|mon|monday|montag)$/, 1], [/^(mardi|mar|ma|tu|tue|tuesday|dienstag)$/, 2],
  [/^(mercredi|mer|me|we|wed|wednesday|mittwoch|mi)$/, 3], [/^(jeudi|jeu|je|th|thu|thursday|donnerstag|do)$/, 4],
  [/^(vendredi|ven|ve|fr|fri|friday|freitag)$/, 5], [/^(samedi|sam|sa|sat|saturday|samstag)$/, 6],
  [/^(dimanche|dim|su|sun|sunday|sonntag|so)$/, 0],
]
const MOT_JOUR = 'lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|lun|mar|mer|jeu|ven|sam|dim|mon|tue|wed|thu|fri|sat|sun|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|mo|di|mi|do|fr|sa|so|lu|ma|me|je|ve'

/** « di » est dimanche en français et Dienstag (mardi) en allemand. */
function jourDuMot(mot: string, allemand: boolean): number | null {
  const m = mot.replace(/[^a-z]/g, '')
  if (m === 'di') return allemand ? 2 : 0
  for (const [re, n] of NOMS_JOURS) if (re.test(m)) return n
  return null
}

/** Rang d'un jour dans la semaine de travail : lundi = 0 … dimanche = 6. */
const rang = (j: number) => (j + 6) % 7
const deRang = (r: number) => (r + 1) % 7

function lireJours(texte: string, allemand: boolean): number[] | null {
  const t = sansAccents(texte).replace(/[()]/g, ' ').replace(/\b(du|le|les|de|jours?)\b/g, ' ').replace(/\s+/g, ' ').trim()
  if (!t) return null
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
      const a = jourDuMot(intervalle[1], allemand), b = jourDuMot(intervalle[2], allemand)
      if (a === null || b === null) return null
      for (let r = rang(a); ; r = (r + 1) % 7) { jours.add(deRang(r)); if (r === rang(b)) break }
      continue
    }
    const seul = jourDuMot(morceau, allemand)
    if (seul === null) return null
    jours.add(seul)
  }
  return jours.size ? [...jours] : null
}

// Pas d'espace entre « h » et les minutes : « 8h-12h 14h-18h » est deux
// plages, pas « 8h–12h14 ».
const RE_PLAGE = /(\d{1,2})\s*(?:[h:.](\d{2})?)?\s*(?:-|–|—|à|a|to|bis|jusqu'?a|jusqu’a)\s*(\d{1,2})\s*(?:[h:.](\d{2})?)?/g
const RE_UNE_PLAGE = new RegExp(RE_PLAGE.source)
const LIAISONS = /\b(et|de|des|du|and|und|puis|h|uhr|heures?)\b/g

function lirePlages(texte: string): Plage[] | 'ferme' | null {
  const t = sansAccents(texte)
    .replace(/apres-?\s?midi/g, ' apresmidi ')
    .replace(/\bmidi\b/g, '12h').replace(/\bminuit\b/g, '24h')
  const nu = t.replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()
  if (/^(ferme|fermee|closed|geschlossen|repos|ferme toute la journee)$/.test(nu)) return 'ferme'
  const plages: Plage[] = []
  let reste = t
  for (const m of t.matchAll(RE_PLAGE)) {
    const debut = normaliserHeure(`${m[1]}:${m[2] ?? '00'}`), fin = normaliserHeure(`${m[3]}:${m[4] ?? '00'}`)
    if (!debut || !fin || (debut === fin && debut !== '00:00')) return null
    plages.push({ debut, fin })
    reste = reste.replace(m[0], ' ')
  }
  if (!plages.length) return null
  // Tout ce qui n'est pas une plage doit être de la liaison. « sauf mercredi »,
  // « samedi 9h–12h » glissé après une virgule, « (jeudi jusqu'à 20h) » :
  // ligne ignorée plutôt que plages attribuées au mauvais jour.
  const residu = reste.replace(/[^a-z]/g, ' ').replace(LIAISONS, ' ').trim()
  return residu ? null : plages
}

export interface LectureHoraires {
  horaires: Horaires
  /** Les lignes qu'on n'a pas su lire, telles quelles. */
  ignorees: string[]
  /** Des jours ont-ils été trouvés ? Faux = rien d'exploitable. */
  lu: boolean
}

const RE_PARTOUT = /7\s*j(?:ours)?\s*\/\s*7|7\s*\/\s*7|tous les jours|chaque jour|every day|daily|taglich/i
const PREFIXES_PARTOUT = /^(ouvert|open|assistance|service|permanence|accueil|horaires?)?$/

/** Tire des horaires structurés d'un texte libre ou d'une liste `{ day, hours }`. */
export function lireHorairesTexte(entree: unknown): LectureHoraires {
  const lignes: string[] = (Array.isArray(entree)
    ? entree.map(c => (c && typeof c === 'object')
      ? `${String((c as { day?: unknown }).day ?? '').trim()} · ${String((c as { hours?: unknown }).hours ?? '').trim()}`
      : typeof c === 'string' ? c : '')
    : typeof entree === 'string' ? entree.split(/\r?\n|;|\s\|\s/) : [])
    .map(l => l.trim())
    // Une entrée vide « · » (le bouton « ajouter un créneau » laissé tel quel)
    // n'est pas une ligne illisible : c'est une ligne absente.
    .filter(l => l && !/^[\s·•|\-–—:,]*$/.test(l))

  // « Fr » n'abrège pas vendredi en français (« ven ») : sa présence, comme
  // celle de « Mo », « Mi », « Do » ou « So », dit un texte allemand.
  const allemand = /\b(mo|mi|do|so|fr|bis|uhr|geschlossen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/.test(sansAccents(lignes.join(' ')))
  const parJour = new Map<number, Plage[]>()
  const ignorees: string[] = []
  let note: string | null = null

  // Une ligne peut porter plusieurs groupes séparés par un point médian —
  // « Mardi–vendredi 9h–18h30 · Samedi 9h–17h » — ou un seul, coupé entre
  // jours et heures — « Lundi au vendredi · 9h00–18h00 ». Un morceau sans
  // plage horaire ni « fermé » est un début de groupe : on le recolle au
  // suivant. Une virgule suivie d'un jour ouvre aussi un nouveau groupe :
  // « Lun–ven 9h–18h, sam 9h–12h ».
  const groupes: string[] = []
  const nouveauJour = new RegExp(`(?<=\\d|h)\\s*[,;/]\\s*(?=(?:${MOT_JOUR})\\b)`, 'i')
  for (const ligne of lignes) {
    let enAttente = ''
    for (const morceau of ligne.split(/\s+[·•]\s+|\s+[·•]$|^[·•]\s+/).map(m => m.trim()).filter(Boolean)) {
      const complet = RE_UNE_PLAGE.test(sansAccents(morceau).replace(/\bmidi\b/g, '12h').replace(/\bminuit\b/g, '24h')) || /ferm[ée]|closed|geschlossen/i.test(morceau)
      if (!complet) { enAttente = enAttente ? `${enAttente} ${morceau}` : morceau; continue }
      groupes.push(...(enAttente ? `${enAttente} ${morceau}` : morceau).split(nouveauJour))
      enAttente = ''
    }
    if (enAttente) groupes.push(enAttente)
  }

  for (const brute of groupes.map(g => g.trim()).filter(Boolean)) {
    const sa = sansAccents(brute)
    if (/rendez-vous|\brdv\b|appointment|sur demande|on request/.test(sa) && !RE_UNE_PLAGE.test(sa)) { note = brute; continue }
    let jours: number[] | null
    let partieHeures: string
    const partout = brute.match(RE_PARTOUT)
    if (partout) {
      // « Tous les jours » ne vaut que seul, ou après un mot sans portée
      // (« Assistance 7 j/7 »). « Juillet–août, tous les jours » est une saison.
      const avant = sansAccents(brute.slice(0, partout.index ?? 0)).replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim()
      jours = PREFIXES_PARTOUT.test(avant) ? [0, 1, 2, 3, 4, 5, 6] : null
      partieHeures = brute.slice((partout.index ?? 0) + partout[0].length)
    } else {
      // La partie « jours » s'arrête au premier chiffre, au mot « fermé », ou
      // à « midi »/« minuit » qui commencent une plage.
      const coupe = brute.search(/\d|ferm[ée]|closed|geschlossen|\bmidi\b|\bminuit\b/i)
      const partieJours = (coupe >= 0 ? brute.slice(0, coupe) : brute).replace(/[·•:|,\-–—\s]+$/, '').replace(/\b(de|dès|des)\s*$/i, '').trim()
      partieHeures = coupe >= 0 ? brute.slice(coupe) : ''
      jours = lireJours(partieJours, allemand)
    }
    const plages = lirePlages(partieHeures)
    if (!jours || !plages) { ignorees.push(brute); continue }
    for (const j of jours) parJour.set(j, plages === 'ferme' ? [] : [...(parJour.get(j) ?? []), ...plages])
  }

  const semaine: JourHoraires[] = [0, 1, 2, 3, 4, 5, 6].map(j => ({ jour: j, plages: triees(parJour.get(j) ?? []) }))
  return { horaires: { semaine, note }, ignorees, lu: parJour.size > 0 }
}

/** Nettoie des horaires reçus d'un formulaire ou de la base : heures valides,
 *  dates valides, sept jours au plus, rien d'autre. Ne lève jamais, quelle
 *  que soit la forme reçue. Avec `aujourdhui`, retire aussi les fermetures et
 *  jours particuliers passés depuis plus d'un mois : ce sont eux qui
 *  auraient fait déborder la liste, pas ceux à venir. */
export function assainirHoraires(v: unknown, aujourdhui?: string): Horaires {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
  const liste = (x: unknown) => (Array.isArray(x) ? x : []).filter(e => e && typeof e === 'object') as Record<string, unknown>[]
  const plagesPropres = (ps: unknown): Plage[] => liste(ps)
    .map(p => ({ debut: normaliserHeure(String(p.debut ?? '')), fin: normaliserHeure(String(p.fin ?? '')) }))
    // Début égal à la fin : seule la journée entière a un sens. 18:00–18:00
    // vient d'une saisie inachevée, pas d'une ouverture de vingt-quatre heures.
    .filter((p): p is Plage => !!p.debut && !!p.fin && (p.debut !== p.fin || p.debut === '00:00'))
    .slice(0, 6)
  const texte = (s: unknown, max = 120) => typeof s === 'string' && s.trim() ? s.trim().slice(0, max) : null
  const semaineBrute = liste(o.semaine)
  const semaine = [0, 1, 2, 3, 4, 5, 6].map(j => ({
    jour: j, plages: triees(plagesPropres(semaineBrute.find(x => Number(x.jour) === j)?.plages)),
  }))
  const cantonsValides = new Set(CANTONS.map(c => c[0]))
  const cles = new Set(FERIES_SUISSES.map(d => d.cle))
  const feries: Record<string, boolean> = {}
  const feriesBruts = o.feries && typeof o.feries === 'object' ? o.feries as Record<string, unknown> : {}
  for (const [k, b] of Object.entries(feriesBruts)) if (cles.has(k) && typeof b === 'boolean') feries[k] = b
  const seuil = aujourdhui ? ajouterJours(aujourdhui, -31) : null
  const fermetures = liste(o.fermetures)
    .filter(f => dateValide(f.du) && dateValide(f.au) && String(f.du) <= String(f.au))
    .map(f => ({ du: f.du as string, au: f.au as string, motif: texte(f.motif) }))
    .filter(f => !seuil || f.au >= seuil)
    .sort((a, b) => a.du.localeCompare(b.du))
    .slice(-50)
  const exceptions = liste(o.exceptions)
    .filter(e => dateValide(e.date))
    .map(e => ({ date: e.date as string, plages: triees(plagesPropres(e.plages)), motif: texte(e.motif) }))
    .filter(e => !seuil || e.date >= seuil)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-100)
  return {
    semaine,
    canton: typeof o.canton === 'string' && cantonsValides.has(o.canton) ? o.canton : null,
    feries, fermetures, exceptions,
    note: texte(o.note, 200),
    signature: typeof o.signature === 'string' ? o.signature.slice(0, 4000) : null,
  }
}

// ── Les horaires d'un site ──────────────────────────────────────────────────

/** Une empreinte stable du texte des horaires, sous ses deux formes (liste
 *  `{ day, hours }` ou chaîne). Sert à savoir si quelqu'un l'a retouché. */
export function signatureTexte(hours: unknown): string {
  if (Array.isArray(hours)) {
    return hours.map(c => (c && typeof c === 'object')
      ? `${String((c as { day?: unknown }).day ?? '').trim()} · ${String((c as { hours?: unknown }).hours ?? '').trim()}`
      : '').join('\n')
  }
  return typeof hours === 'string' ? hours.trim() : ''
}

/** Le texte que les gabarits affichent, tiré des horaires structurés. La
 *  précision vient en dernière ligne : un pied de page qui ne lit que ce texte
 *  doit dire, lui aussi, « Samedi sur rendez-vous ». */
export const lignesHoraires = (h: Horaires, lang: LangueHoraires = 'fr') => [
  ...resumeSemaine(h, lang).map(({ day, hours }) => ({ day, hours })),
  ...(h.note?.trim() ? [{ day: h.note.trim(), hours: '' }] : []),
]

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
 *  - Texte illisible : pas d'état en direct.
 *
 *  Sans configuration explicite, aucun jour férié n'est présumé : un musée
 *  ouvert le 1er août ne doit pas se voir annoncé fermé parce qu'il n'a
 *  jamais réglé ses horaires. Ne lève jamais : le layout de toutes les pages
 *  l'appelle. */
export function horairesDuSite(business: unknown): HorairesDuSite {
  try {
    const b = (business && typeof business === 'object' ? business : {}) as { hours?: unknown; horaires?: unknown }
    const sig = signatureTexte(b.hours)
    const lignes = sig ? sig.split('\n').map(l => l.replace(/\s·\s*$/, '').replace(/^\s*·\s/, '').trim()).filter(l => l && l !== '·') : []
    const structure = b.horaires && typeof b.horaires === 'object' ? assainirHoraires(b.horaires) : null

    if (structure && aDesHoraires(structure) && (structure.signature == null || structure.signature === sig)) {
      return { horaires: structure, source: 'structure', lignes }
    }
    // La précision écrite par le CMS en dernière ligne n'est pas un horaire :
    // on la retire avant de relire le texte.
    const note = structure?.note?.trim()
    const texte = note ? lignes.filter(l => l !== note) : b.hours
    const lu = lireHorairesTexte(note ? texte : b.hours)
    if (lu.lu && lu.ignorees.length === 0) {
      const horaires: Horaires = structure
        ? { ...structure, semaine: lu.horaires.semaine, note: structure.note ?? lu.horaires.note }
        : { ...lu.horaires, feries: { ...SANS_FERIES } }
      return { horaires, source: 'texte', lignes }
    }
    return { horaires: null, source: null, lignes }
  } catch {
    return { horaires: null, source: null, lignes: [] }
  }
}

/** Le canton qu'une adresse laisse deviner, seulement quand c'est sûr : un
 *  NPA dont toute la plage appartient au Valais ou à Genève, ou, sans NPA, le
 *  nom du canton écrit hors d'un nom de rue. Ailleurs les numéros postaux
 *  chevauchent les frontières cantonales (Nyon, Coppet, Lavey sont vaudois) :
 *  on ne devine pas, l'établissement choisit. */
export function cantonDeLAdresse(adresse: unknown): string | null {
  const a = sansAccents(String(adresse ?? ''))
  const npa = a.match(/(?:\bch-?\s*)?\b(\d{4})\b/)
  if (npa) {
    const n = Number(npa[1])
    if ((n >= 1868 && n <= 1875) || n === 1890 || n === 1891 || (n >= 1893 && n <= 1999) || (n >= 3900 && n <= 3999)) return 'VS'
    if ((n >= 1200 && n <= 1258) || (n >= 1281 && n <= 1288) || n === 1290 || (n >= 1292 && n <= 1294) || n === 1298) return 'GE'
    return null
  }
  const horsRues = a.replace(/\b(rue|route|rte|avenue|av|chemin|ch|place|pl|quai|boulevard|bd|allee|impasse|passage|promenade|sentier|faubourg)\b\.?\s+(de la |de l'|de |du |des |d')?[a-z-]+/g, ' ')
  const noms: [RegExp, string][] = [
    [/\bvalais\b|\bwallis\b/, 'VS'], [/\bgeneve\b|\bgenf\b/, 'GE'], [/\bvaud\b|\bwaadt\b/, 'VD'],
    [/\bfribourg\b|\bfreiburg\b/, 'FR'], [/\bneuchatel\b/, 'NE'], [/\bjura\b/, 'JU'], [/\btessin\b|\bticino\b/, 'TI'],
  ]
  for (const [re, c] of noms) if (re.test(horsRues)) return c
  return null
}

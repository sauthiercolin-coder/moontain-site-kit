// Agenda d'événements : le modèle, les dates, et le fichier iCalendar.
//
// Un événement a une ou plusieurs dates, les « occurrences ». Chacune est
// écrite en heure murale de Zurich : un jour, un jour de fin facultatif, des
// heures facultatives — la grammaire des annonces (`Programmation`), pour la
// même raison. Ce que l'organisateur écrit, « samedi 3 octobre à 19 h 30 »,
// est une heure de Zurich, pas un instant UTC. Garder des chaînes évite de
// convertir à la saisie (un champ datetime-local lu en UTC sur Vercel décale
// de deux heures) et de comparer le « +00:00 » de la base au « .000Z » du
// navigateur, ce qui faisait croire le brouillon modifié.
//
// Une occurrence est une plage continue. Trois soirées font trois
// occurrences, pas une occurrence « du 3 au 5, 18 h – 23 h », qui se lirait
// comme 53 heures d'affilée. Les répétitions sont dépliées de la même façon,
// jamais écrites en RRULE : chaque date peut être annulée seule, et un flux
// en UTC n'a besoin d'aucun VTIMEZONE (une RRULE en UTC glisserait d'une
// heure au changement d'heure).
//
// Ce module est pur : ni navigateur, ni base, ni React. Le site public s'en
// sert pour la liste, la vue du mois, la fiche, le balisage schema.org et le
// flux .ics ; le studio et l'espace client pour la saisie. Une seule règle,
// donc un seul comportement : un événement ne peut pas être « à venir » dans
// la liste et « passé » dans le calendrier de l'abonné.

import { FUSEAU_HORAIRES, dateValide, enMinutes, heureValide, instantZurich, maintenantZurich, normaliserHeure } from './horaires'
import { ajouterJours, jourDeSemaine } from './feries-suisses'
import { MOIS_COURTS, enTetesSemaine, type LangueCalendrier } from './calendrier'

// ── Modèle ──────────────────────────────────────────────────────────────────

/** Sans statut, l'occurrence a lieu comme prévu. Une date annulée ou reportée
 *  n'est jamais supprimée : l'adresse de la fiche est indexée, et les agendas
 *  abonnés doivent apprendre l'annulation plutôt que voir la date disparaître. */
export type StatutOccurrence = 'annule' | 'reporte' | 'complet'
export const STATUTS_OCCURRENCE: readonly StatutOccurrence[] = ['annule', 'reporte', 'complet']

export interface Occurrence {
  /** Stable : il signe l'UID iCalendar, qui doit survivre à un report. */
  id: string
  /** Premier jour, « AAAA-MM-JJ ». */
  du: string
  /** Dernier jour, compris ; absent pour une date d'un seul jour. */
  au?: string
  /** « HH:MM ». Sans heure de début, l'occurrence dure la journée entière. */
  deHeure?: string
  /** « HH:MM ». Inférieure au début sur un même jour : elle passe minuit. */
  aHeure?: string
  statut?: StatutOccurrence
  /** Séance de la billetterie Moontain (lot 2). Conservée, ignorée au rendu. */
  seance?: string
}

export type ModeBilletterie = 'aucune' | 'externe' | 'moontain'
export const MODES_BILLETTERIE: readonly ModeBilletterie[] = ['aucune', 'externe', 'moontain']

export interface Evenement {
  id: string
  /** Figé à la création : c'est l'adresse de la fiche. */
  slug: string
  /** L'ancien slug, redirigé en permanence vers le nouveau. */
  slug_legacy?: string | null
  titre: string
  /** Une ou deux phrases : la liste, la description des moteurs, le .ics. */
  resume?: string | null
  description?: string | null
  image_url?: string | null
  /** Nom du lieu. Vide : le site lui-même (voir lieuDeLEvenement). */
  lieu?: string | null
  /** Adresse postale. */
  adresse?: string | null
  categorie?: string | null
  /** Vide : le site lui-même. */
  organisateur?: string | null
  dates: Occurrence[]
  billetterie: ModeBilletterie
  billet_url?: string | null
  /** null : prix non précisé ; 0 : entrée libre. */
  prix_des?: number | null
  publie?: boolean
  updated_at?: string | null
}

/** Au-delà, une saisie a mal tourné (une répétition sans fin, un collage). Le
 *  CMS et l'espace client plafonnent « répéter chaque semaine » à ce nombre. */
export const MAX_OCCURRENCES = 200

// ── Petits outils ───────────────────────────────────────────────────────────

const deux = (n: number) => String(n).padStart(2, '0')

/** Comparaison de chaînes indépendante de la langue : même ordre partout. */
const ordre = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/** Chaîne nettoyée, ou null si vide. */
const propre = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

/** `dateValide` accepte le 30 février : `Date.parse` le range au 2 mars. Une
 *  date d'événement doit exister telle qu'elle est écrite. */
const jourExiste = (v: unknown): v is string => {
  if (!dateValide(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDate() === d
}

const lireHeure = (v: unknown): string | null => {
  const h = typeof v === 'string' ? normaliserHeure(v) : null
  return heureValide(h) ? h : null
}

/** Le dernier jour d'une occurrence (le jour de fin, sinon le premier). */
const dernierJour = (o: Occurrence) => (o.au && o.au > o.du ? o.au : o.du)

/** Empreinte courte et stable (FNV-1a 32 bits) : un identifiant tiré du
 *  contenu reste le même d'une lecture à l'autre, là où un tirage au sort
 *  changerait l'UID à chaque requête et doublerait l'événement chez l'abonné. */
function empreinte(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return (h >>> 0).toString(36)
}

const ID_SUR = /[^A-Za-z0-9_-]/g

/** Un identifiant neuf, pour l'éditeur qui ajoute une date. */
export const nouvelIdOccurrence = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

// ── Nettoyage ───────────────────────────────────────────────────────────────

/** Les dates d'un événement, telles qu'on peut s'y fier. Ne lève jamais.
 *
 *  - Une date sans premier jour valide n'existe pas : elle est écartée.
 *  - Un jour de fin qui n'est pas après le premier est retiré (la date devient
 *    d'un seul jour) : on garde l'événement visible à sa date de début plutôt
 *    que de le perdre pour une faute de frappe.
 *  - Les heures s'écrivent « 19h30 », « 19.30 » ou « 19:30 » ; illisibles, elles
 *    sont retirées. Une heure de fin sans heure de début aussi : « 0 h – 17 h »,
 *    personne ne le veut dire. Une fin égale au début, sur un même jour, est
 *    une saisie inachevée : on garde le début seul.
 *  - Tri chronologique ; les identifiants sont conservés, et tirés du contenu
 *    s'ils manquent. Un identifiant répété est dédoublé (`-2`, `-3`) : deux
 *    occurrences au même UID se fondraient en une chez l'abonné. */
export function normaliserOccurrences(brut: unknown): Occurrence[] {
  let v = brut
  if (typeof v === 'string') { try { v = JSON.parse(v) } catch { return [] } }
  if (!Array.isArray(v)) return []

  const propres: { o: Occurrence; idBrut: string | null }[] = []
  for (const x of v) {
    if (!x || typeof x !== 'object') continue
    const e = x as Record<string, unknown>
    const du = typeof e.du === 'string' ? e.du.trim() : ''
    if (!jourExiste(du)) continue
    const auBrut = typeof e.au === 'string' ? e.au.trim() : ''
    const au = jourExiste(auBrut) && auBrut > du ? auBrut : null
    const deHeure = lireHeure(e.deHeure)
    let aHeure = deHeure ? lireHeure(e.aHeure) : null
    if (!au && aHeure === deHeure) aHeure = null
    const statut = STATUTS_OCCURRENCE.find(s => s === e.statut)
    const seance = propre(e.seance)
    const o: Occurrence = { id: '', du }
    if (au) o.au = au
    if (deHeure) o.deHeure = deHeure
    if (aHeure) o.aHeure = aHeure
    if (statut) o.statut = statut
    if (seance) o.seance = seance.slice(0, 64)
    const id = propre(e.id)
    propres.push({ o, idBrut: id ? id.replace(ID_SUR, '-').slice(0, 40) : null })
  }

  // Champ par champ, un champ vide en premier : la journée entière passe avant
  // la soirée du même jour. (Une clé concaténée classerait « | » après les
  // chiffres, donc l'inverse.)
  const cle = (o: Occurrence) => `${o.du}|${o.deHeure ?? ''}|${o.au ?? ''}|${o.aHeure ?? ''}`
  propres.sort((a, b) =>
    ordre(a.o.du, b.o.du) || ordre(a.o.deHeure ?? '', b.o.deHeure ?? '') || ordre(a.o.au ?? '', b.o.au ?? '')
    || ordre(a.o.aHeure ?? '', b.o.aHeure ?? '') || ordre(a.idBrut ?? '', b.idBrut ?? ''))

  const pris = new Set<string>()
  return propres.slice(0, MAX_OCCURRENCES).map(({ o, idBrut }) => {
    const base = idBrut || `o-${empreinte(cle(o))}`
    let id = base
    for (let n = 2; pris.has(id); n++) id = `${base}-${n}`
    pris.add(id)
    return { ...o, id }
  })
}

/** Un événement lu de la base ou d'un formulaire, nettoyé. null s'il n'a ni
 *  identifiant ni slug : sans eux, ni fiche ni UID. Ne lève jamais. */
export function normaliserEvenement(brut: unknown): Evenement | null {
  if (!brut || typeof brut !== 'object') return null
  const o = brut as Record<string, unknown>
  const id = propre(o.id), slug = propre(o.slug)
  if (!id || !slug) return null
  const billetterie = MODES_BILLETTERIE.find(b => b === o.billetterie) ?? 'aucune'
  const lien = propre(o.billet_url)
  // PostgREST rend un numeric en nombre ; un formulaire, en texte.
  const prix = typeof o.prix_des === 'number' ? o.prix_des : typeof o.prix_des === 'string' && o.prix_des.trim() ? Number(o.prix_des) : NaN
  const categorie = propre(o.categorie)
  return {
    id, slug,
    slug_legacy: propre(o.slug_legacy),
    titre: propre(o.titre) ?? '',
    resume: propre(o.resume),
    description: propre(o.description),
    image_url: propre(o.image_url),
    lieu: propre(o.lieu),
    adresse: propre(o.adresse),
    categorie: categorie ? categorie.replace(/\s+/g, ' ') : null,
    organisateur: propre(o.organisateur),
    dates: normaliserOccurrences(o.dates),
    billetterie,
    // Un lien de billetterie mène ailleurs : seule une adresse complète a un sens.
    billet_url: lien && /^https?:\/\/\S+$/i.test(lien) ? lien : null,
    prix_des: Number.isFinite(prix) && prix >= 0 ? Math.round(prix * 100) / 100 : null,
    ...(typeof o.publie === 'boolean' ? { publie: o.publie } : {}),
    updated_at: propre(o.updated_at),
  }
}

// ── Bornes et état ──────────────────────────────────────────────────────────

const DEUX_HEURES = 2 * 3600_000

/** Le début et la fin (exclue) d'une occurrence normalisée, en instants réels.
 *
 *  - Sans heure : la journée entière, jusqu'au lendemain du dernier jour à 0 h.
 *  - Heure de début sans heure de fin : deux heures, comptées en temps réel —
 *    la nuit du changement d'heure aussi. Sur plusieurs jours, la fin du
 *    dernier jour.
 *  - Heure de fin inférieure au début sur un même jour : le lendemain
 *    (22 h – 2 h). */
export function bornesOccurrence(o: Occurrence): { debut: Date; fin: Date; journee: boolean } {
  const deH = heureValide(o.deHeure) ? o.deHeure : null
  const aH = deH && heureValide(o.aHeure) ? o.aHeure : null
  const au = o.au && o.au > o.du ? o.au : null
  const debut = instantZurich(o.du, deH ? enMinutes(deH) : 0)
  let fin: number
  if (!deH) fin = instantZurich(ajouterJours(au ?? o.du, 1), 0)
  else if (au) fin = aH ? instantZurich(au, enMinutes(aH)) : instantZurich(ajouterJours(au, 1), 0)
  else if (aH) fin = enMinutes(aH) > enMinutes(deH) ? instantZurich(o.du, enMinutes(aH)) : instantZurich(ajouterJours(o.du, 1), enMinutes(aH))
  else fin = debut + DEUX_HEURES
  // Une heure qui n'existe pas (2 h 30 le dernier dimanche de mars) peut
  // placer la fin avant le début : on retombe sur la durée par défaut.
  if (fin <= debut) fin = debut + DEUX_HEURES
  return { debut: new Date(debut), fin: new Date(fin), journee: !deH }
}

export type EtatOccurrence = 'a-venir' | 'en-cours' | 'passe'

export function etatOccurrence(o: Occurrence, maintenant: Date): EtatOccurrence {
  const { debut, fin } = bornesOccurrence(o)
  const t = maintenant.getTime()
  return t < debut.getTime() ? 'a-venir' : t < fin.getTime() ? 'en-cours' : 'passe'
}

/** La date à mettre en avant : la plus proche qui n'est pas passée, en
 *  préférant celles qui ont lieu. Si toutes celles qui restent sont annulées
 *  ou reportées, la plus proche quand même — l'événement reste dans la liste,
 *  avec son statut, au lieu de disparaître. null si tout est passé. */
export function prochaineOccurrence(e: Pick<Evenement, 'dates'>, maintenant: Date): Occurrence | null {
  let choix: Occurrence | null = null, debutChoix = Infinity
  let secours: Occurrence | null = null, debutSecours = Infinity
  for (const o of e.dates) {
    if (etatOccurrence(o, maintenant) === 'passe') continue
    const d = bornesOccurrence(o).debut.getTime()
    if (o.statut !== 'annule' && o.statut !== 'reporte') {
      if (d < debutChoix) { choix = o; debutChoix = d }
    } else if (d < debutSecours) { secours = o; debutSecours = d }
  }
  return choix ?? secours
}

/** Le dernier jour de l'événement, « AAAA-MM-JJ » ('' sans date). C'est la
 *  comparaison que fait la base (sur les chaînes `du` / `au`) : une soirée qui
 *  finit à 2 h du matin reste datée de son premier jour. */
export function derniereDate(e: Pick<Evenement, 'dates'>): string {
  let d = ''
  for (const o of e.dates) { const f = dernierJour(o); if (f > d) d = f }
  return d
}

/** Toutes les dates sont passées. Un événement sans date n'est pas passé : il
 *  n'est simplement nulle part. */
export const estPasse = (e: Pick<Evenement, 'dates'>, maintenant: Date) =>
  e.dates.length > 0 && e.dates.every(o => etatOccurrence(o, maintenant) === 'passe')

/** « AAAA-MM-JJ » décalé de n mois en arrière, jour ramené à la fin du mois
 *  s'il n'existe pas (31 mars − 1 mois = 28 ou 29 février). */
function moisAvant(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const total = y * 12 + (m - 1) - n
  const ya = Math.floor(total / 12), ma = total - ya * 12 + 1
  const nb = new Date(Date.UTC(ya, ma, 0)).getUTCDate()
  return `${ya}-${deux(ma)}-${deux(Math.min(d, nb))}`
}

/** À venir, ou passé depuis moins de `mois` mois : ce qui garde sa place dans
 *  la liste « Événements passés » et dans le plan du site. Au-delà, la fiche
 *  répond toujours, mais on ne la pousse plus. */
export function recentOuAVenir(e: Pick<Evenement, 'dates'>, maintenant: Date, mois = 12): boolean {
  if (!estPasse(e, maintenant)) return true
  return derniereDate(e) >= moisAvant(maintenantZurich(maintenant).date, mois)
}

// ── Listes ──────────────────────────────────────────────────────────────────

/** Clé de comparaison d'une catégorie : sans casse, sans accents, espaces
 *  resserrées. « Concert », « concert » et « Concert  » sont une seule
 *  catégorie — le filtre `?categorie=` et le bloc s'en servent. */
export const cleCategorie = (s: unknown): string =>
  typeof s === 'string' ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim() : ''


/** Les catégories présentes, une fois chacune, dans l'écriture rencontrée en
 *  premier. Triées sur leur clé plutôt qu'avec `localeCompare` : le serveur et
 *  le navigateur doivent rendre les pastilles dans le même ordre. */
export function categoriesDe(evenements: Pick<Evenement, 'categorie'>[]): string[] {
  const vues = new Map<string, string>()
  for (const e of evenements) {
    const k = cleCategorie(e.categorie)
    if (k && !vues.has(k)) vues.set(k, (e.categorie as string).trim().replace(/\s+/g, ' '))
  }
  return [...vues.entries()].sort((a, b) => ordre(a[0], b[0])).map(([, v]) => v)
}

const dansLaCategorie = (e: Pick<Evenement, 'categorie'>, cle: string) => !cle || cleCategorie(e.categorie) === cle

/** Les événements à venir (en cours compris), chacun avec la date à mettre en
 *  avant, du plus proche au plus lointain. C'est la liste de l'agenda et celle
 *  du bloc « Prochains événements » : le serveur et l'aperçu du CMS appellent
 *  la même fonction, ils ne peuvent pas diverger. */
export function evenementsAVenir<E extends Evenement>(
  evenements: E[], maintenant: Date, options: { categorie?: string | null } = {},
): { evenement: E; occurrence: Occurrence }[] {
  const cle = cleCategorie(options.categorie)
  const out: { evenement: E; occurrence: Occurrence; debut: number }[] = []
  for (const e of evenements) {
    if (!dansLaCategorie(e, cle)) continue
    const o = prochaineOccurrence(e, maintenant)
    if (o) out.push({ evenement: e, occurrence: o, debut: bornesOccurrence(o).debut.getTime() })
  }
  out.sort((a, b) => a.debut - b.debut || ordre(a.evenement.titre.toLowerCase(), b.evenement.titre.toLowerCase()))
  return out.map(({ evenement, occurrence }) => ({ evenement, occurrence }))
}

/** Les événements passés depuis moins de `mois` mois, le plus récent d'abord. */
export function evenementsPasses<E extends Evenement>(
  evenements: E[], maintenant: Date, options: { mois?: number; categorie?: string | null } = {},
): E[] {
  const cle = cleCategorie(options.categorie)
  return evenements
    .filter(e => dansLaCategorie(e, cle) && estPasse(e, maintenant) && recentOuAVenir(e, maintenant, options.mois ?? 12))
    .sort((a, b) => ordre(derniereDate(b), derniereDate(a)))
}

/** Les occurrences d'un mois, par jour (« AAAA-MM-JJ »), pour la vue mois.
 *  Une date sur plusieurs jours figure à chacun de ses jours dans le mois ; une
 *  soirée qui passe minuit, à son premier jour seulement. Dans un jour, par
 *  heure de début. */
export function occurrencesDuMois<E extends Evenement>(
  evenements: E[], annee: number, mois: number,
): Map<string, { evenement: E; occurrence: Occurrence }[]> {
  const premier = `${annee}-${deux(mois)}-01`
  const dernier = `${annee}-${deux(mois)}-${deux(new Date(Date.UTC(annee, mois, 0)).getUTCDate())}`
  const parJour = new Map<string, { evenement: E; occurrence: Occurrence; debut: number }[]>()
  for (const e of evenements) {
    for (const o of e.dates) {
      const fin = dernierJour(o)
      if (fin < premier || o.du > dernier) continue
      const debut = bornesOccurrence(o).debut.getTime()
      const borne = fin > dernier ? dernier : fin
      for (let j = o.du < premier ? premier : o.du; j <= borne; j = ajouterJours(j, 1)) {
        const liste = parJour.get(j) ?? []
        liste.push({ evenement: e, occurrence: o, debut })
        parJour.set(j, liste)
      }
    }
  }
  const out = new Map<string, { evenement: E; occurrence: Occurrence }[]>()
  for (const j of [...parJour.keys()].sort()) {
    const liste = parJour.get(j)!
    liste.sort((a, b) => a.debut - b.debut || ordre(a.evenement.titre.toLowerCase(), b.evenement.titre.toLowerCase()))
    out.set(j, liste.map(({ evenement, occurrence }) => ({ evenement, occurrence })))
  }
  return out
}

// ── Le bloc « Prochains événements » ────────────────────────────────────────

/** Combien d'événements le bloc montre : 3 sans réglage, de 1 à 12. */
export const NOMBRE_AGENDA = { defaut: 3, min: 1, max: 12 } as const

/** Le nombre réglé sur le bloc, ramené dans ses bornes. Ne lève jamais : un
 *  contenu écrit à la main ou par une ancienne version reste affichable. */
export function nombreAgenda(v: unknown): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN
  if (!Number.isFinite(n)) return NOMBRE_AGENDA.defaut
  return Math.min(NOMBRE_AGENDA.max, Math.max(NOMBRE_AGENDA.min, Math.round(n)))
}

// ── Lieu ────────────────────────────────────────────────────────────────────

/** Où a lieu l'événement : son lieu à lui, sinon le site.
 *
 *  L'adresse du site ne complète JAMAIS un autre lieu : « Salle de la Matze »
 *  sans adresse ne doit pas recevoir celle du domaine viticole qui organise.
 *  Elle ne vaut que pour un événement sans lieu — il a lieu chez soi. */
export function lieuDeLEvenement(
  e: Pick<Evenement, 'lieu' | 'adresse'>, site: { nom?: string | null; adresse?: string | null } = {},
): { nom: string | null; adresse: string | null } {
  const lieu = propre(e.lieu), adresse = propre(e.adresse)
  if (lieu) return { nom: lieu, adresse }
  return { nom: propre(site.nom), adresse: adresse ?? propre(site.adresse) }
}

// ── Dates lisibles ──────────────────────────────────────────────────────────

/** Espace insécable : « 19 h 30 » et « 3 oct. » ne se coupent pas en fin de
 *  ligne, ce qui arrive vite dans une carte étroite. */
const NB = '\u00a0'

function heureCourte(hhmm: string, langue: LangueCalendrier): string {
  if (langue === 'en') return hhmm
  if (hhmm === '00:00') return 'minuit'
  const [h, m] = hhmm.split(':')
  return m === '00' ? `${Number(h)}${NB}h` : `${Number(h)}${NB}h${NB}${m}`
}

/** « sam. 3 oct. », « jeu. 1er oct. 2026 », « Sat 3 Oct ». Le jour de la
 *  semaine et l'année se retirent ou s'ajoutent : le titre d'une fiche dit
 *  « 3 oct. 2026 ». Calculé sur la chaîne, aucun fuseau ne peut décaler le jour. */
export function jourCourt(
  ymd: string, langue: LangueCalendrier = 'fr', { semaine = true, annee = false }: { semaine?: boolean; annee?: boolean } = {},
): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const num = langue === 'fr' && d === 1 ? '1er' : String(d)
  const js = semaine ? `${enTetesSemaine(langue)[(jourDeSemaine(ymd) + 6) % 7].court} ` : ''
  return `${js}${num}${NB}${MOIS_COURTS[langue][m - 1]}${annee ? ` ${y}` : ''}`
}

/** La date d'une occurrence, telle que la liste et la fiche l'affichent :
 *
 *  - « sam. 3 oct. · 19 h 30 – 22 h » (et « 22 h – 2 h » passe minuit) ;
 *  - « ven. 2 – dim. 4 oct. », « mer. 30 sept. – ven. 2 oct. » ;
 *  - « ven. 2 oct., 18 h – dim. 4 oct., 23 h » pour une plage continue.
 *
 *  L'année s'ajoute sur demande, et d'office quand les deux jours ne sont pas
 *  de la même année. Les espaces autour des heures et avant le tiret sont
 *  insécables (U+00A0). */
export function libelleOccurrence(o: Occurrence, langue: LangueCalendrier = 'fr', options: { annee?: boolean } = {}): string {
  const deH = heureValide(o.deHeure) ? o.deHeure : null
  const aH = deH && heureValide(o.aHeure) ? o.aHeure : null
  const au = o.au && o.au > o.du ? o.au : null
  const tiret = `${NB}– `
  const h = (x: string) => heureCourte(x, langue)

  if (!au) {
    const jour = jourCourt(o.du, langue, { annee: options.annee })
    if (!deH) return jour
    return `${jour} · ${h(deH)}${aH ? `${tiret}${h(aH)}` : ''}`
  }

  const memeAnnee = o.du.slice(0, 4) === au.slice(0, 4)
  const anneeFin = !!options.annee || !memeAnnee
  if (deH) {
    const gauche = `${jourCourt(o.du, langue, { annee: !memeAnnee })}, ${h(deH)}`
    const droite = `${jourCourt(au, langue, { annee: anneeFin })}${aH ? `, ${h(aH)}` : ''}`
    return `${gauche}${tiret}${droite}`
  }
  if (o.du.slice(0, 7) === au.slice(0, 7)) {
    // Même mois : le mois ne se dit qu'une fois, à la fin.
    const [, , d] = o.du.split('-').map(Number)
    const num = langue === 'fr' && d === 1 ? '1er' : String(d)
    const js = enTetesSemaine(langue)[(jourDeSemaine(o.du) + 6) % 7].court
    return `${js} ${num}${tiret}${jourCourt(au, langue, { annee: anneeFin })}`
  }
  return `${jourCourt(o.du, langue, { annee: !memeAnnee })}${tiret}${jourCourt(au, langue, { annee: anneeFin })}`
}

// ── schema.org ──────────────────────────────────────────────────────────────

/** Un instant, écrit à l'heure murale de Zurich avec son décalage. */
function isoDeLInstant(t: number): string {
  const { date, minutes } = maintenantZurich(new Date(t))
  const [y, m, d] = date.split('-').map(Number)
  const ecart = Math.round((Date.UTC(y, m - 1, d, 0, minutes) - t) / 60_000)
  const a = Math.abs(ecart)
  return `${date}T${deux(Math.floor(minutes / 60))}:${deux(minutes % 60)}:00${ecart < 0 ? '-' : '+'}${deux(Math.floor(a / 60))}:${deux(a % 60)}`
}

/** « 2026-10-03T19:30:00+02:00 » : une heure de Zurich en ISO 8601 avec son
 *  décalage, +01:00 l'hiver, +02:00 l'été. C'est ce que schema.org attend ; un
 *  « Z » obligerait Google à deviner le fuseau, et une heure sans décalage
 *  serait lue dans le sien.
 *
 *  Sans heure, la date seule : inventer « minuit » serait faux. Une heure qui
 *  n'existe pas (2 h 30 le dernier dimanche de mars) est écrite à l'heure
 *  réelle de l'instant correspondant (3 h 30, +02:00). */
export function isoZurich(date: string, heure?: string | null): string {
  if (!heureValide(heure)) return date
  return isoDeLInstant(instantZurich(date, enMinutes(heure)))
}

/** `startDate` et `endDate` d'une occurrence pour un nœud schema.org `Event`.
 *  La fin n'est donnée que si l'organisateur l'a dite : les deux heures par
 *  défaut du calendrier sont une commodité, pas une information. */
export function datesSchemaOrg(o: Occurrence): { startDate: string; endDate?: string } {
  const deH = heureValide(o.deHeure) ? o.deHeure : null
  const aH = deH && heureValide(o.aHeure) ? o.aHeure : null
  const au = o.au && o.au > o.du ? o.au : null
  if (!deH) return { startDate: o.du, endDate: au ?? o.du }
  const startDate = isoZurich(o.du, deH)
  if (aH) return { startDate, endDate: isoDeLInstant(bornesOccurrence(o).fin.getTime()) }
  return au ? { startDate, endDate: au } : { startDate }
}

// ── iCalendar ───────────────────────────────────────────────────────────────
//
// RFC 5545, en ne gardant que ce que lisent Apple, Google et Outlook. Les
// heures partent en UTC (« Z ») et les journées entières en VALUE=DATE, fin
// exclue : aucun fuseau à déclarer, aucune ambiguïté au changement d'heure.

/** Échappe un TEXT iCalendar. Les fins de ligne sont normalisées d'abord : un
 *  retour chariot laissé tel quel coupe la ligne, et un lecteur strict rejette
 *  alors tout le calendrier, pas seulement l'événement fautif. Les autres
 *  caractères de contrôle sont interdits par la norme : retirés. */
export function echapperTexteIcs(s: string): string {
  return s.replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')
    .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

const octets = (cp: number) => (cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4)

/** Replie une ligne à 75 OCTETS (et non caractères), la suite commençant par
 *  une espace. On avance par point de code : couper au milieu d'un « é » (deux
 *  octets) ou d'un emoji (quatre) rendrait la ligne illisible en UTF-8, et
 *  certains téléphones tronquent alors le titre sans rien dire. */
export function replierLigneIcs(ligne: string): string {
  const morceaux: string[] = []
  let courant = '', taille = 0, limite = 75
  for (const c of ligne) {
    const n = octets(c.codePointAt(0)!)
    if (taille + n > limite) { morceaux.push(courant); courant = ''; taille = 0; limite = 74 }
    courant += c; taille += n
  }
  morceaux.push(courant)
  return morceaux.join('\r\n ')
}

const utcIcs = (t: number) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const jourIcs = (ymd: string) => ymd.replace(/-/g, '')

/** « https://www.exemple.ch/agenda » → « www.exemple.ch ». */
const domaineDe = (d: string) =>
  d.trim().toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/[/?#:].*$/, '') || 'moontain.ch'

/** SEQUENCE croît à chaque modification : secondes depuis le 1er janvier
 *  2026, tirées de `updated_at`. Petit entier, sûr jusqu'en 2094. */
const EPOQUE_SEQUENCE = Date.UTC(2026, 0, 1)

export interface OptionsIcs {
  /** Nom du calendrier, tel que l'abonné le voit dans son application. */
  nom: string
  /** Domaine du site (« ferme-du-chene.ch ») : il signe les UID. */
  domaine: string
  evenements: Evenement[]
  /** Adresse complète de la fiche d'un événement. */
  urlFiche: (slug: string) => string
  /** L'instant de production (DTSTAMP). */
  maintenant: Date
  /** « AAAA-MM-JJ » : les dates finies avant ce jour sont omises (le flux
   *  garde quelques mois de passé, pas des années). Absent : toutes. */
  depuis?: string | null
  /** Le site lui-même, pour un événement sans lieu (voir lieuDeLEvenement). */
  lieuParDefaut?: { nom?: string | null; adresse?: string | null }
}

/** Le fichier .ics d'un agenda (le flux d'abonnement) ou d'un seul événement.
 *
 *  Un VEVENT par occurrence. L'UID associe l'événement et l'occurrence, signés
 *  du domaine du site : `<id de l'événement>-<id de l'occurrence>@<domaine>`.
 *  L'identifiant de l'événement y est en plus de celui de l'occurrence parce
 *  qu'un événement dupliqué garde les identifiants de ses dates — deux UID
 *  égaux et l'application de l'abonné fondrait les deux concerts en un.
 *
 *  Une date annulée reste dans le flux en STATUS:CANCELLED (c'est ainsi que
 *  l'abonné apprend l'annulation), et son titre le dit, parce que Google
 *  n'affiche pas le statut. Un événement explicitement non publié n'y entre
 *  jamais, même passé par erreur. */
export function genererIcs(options: OptionsIcs): string {
  const domaine = domaineDe(options.domaine)
  const stamp = utcIcs(options.maintenant.getTime())
  const entete = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Moontain Studio//Agenda//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${echapperTexteIcs(propre(options.nom) ?? 'Agenda')}`,
    `X-WR-TIMEZONE:${FUSEAU_HORAIRES}`,
    // Le site garde ses pages une heure en cache : relire plus souvent ne
    // montrerait rien de neuf. Google ignore ces deux lignes, Apple les suit.
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ]

  const vevents: { debut: number; uid: string; lignes: string[] }[] = []
  for (const e of options.evenements) {
    if (e.publie === false) continue
    const idEvt = String(e.id).replace(ID_SUR, '-')
    const modifie = e.updated_at ? Date.parse(e.updated_at) : NaN
    const sequence = Number.isFinite(modifie) ? Math.max(0, Math.floor((modifie - EPOQUE_SEQUENCE) / 1000)) : 0
    const url = propre(options.urlFiche(e.slug))
    const urlSure = url && /^https?:\/\/\S+$/i.test(url) ? url : null
    const lieu = lieuDeLEvenement(e, options.lieuParDefaut)
    const location = [lieu.nom, lieu.adresse].filter(Boolean).join(', ')
    // Google n'affiche pas la propriété URL : l'adresse de la fiche est aussi
    // dans la description, où elle devient un lien.
    const description = [propre(e.resume), urlSure].filter(Boolean).join('\n\n')
    const titre = propre(e.titre) ?? 'Événement'
    const categorie = propre(e.categorie)

    // Normaliser encore ne coûte rien (c'est idempotent) et garantit ce dont
    // l'UID dépend : des dates valides, chacune avec un identifiant stable,
    // même si l'appelant a passé la colonne jsonb telle que la base la rend.
    for (const o of normaliserOccurrences(e.dates)) {
      const fin = dernierJour(o)
      if (options.depuis && fin < options.depuis) continue
      const b = bornesOccurrence(o)
      const uid = `${idEvt}-${o.id}@${domaine}`
      const prefixe = o.statut === 'annule' ? 'Annulé · ' : o.statut === 'reporte' ? 'Reporté · ' : ''
      const lignes = [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${stamp}`,
        ...(b.journee
          ? [`DTSTART;VALUE=DATE:${jourIcs(o.du)}`, `DTEND;VALUE=DATE:${jourIcs(ajouterJours(fin, 1))}`]
          : [`DTSTART:${utcIcs(b.debut.getTime())}`, `DTEND:${utcIcs(b.fin.getTime())}`]),
        `SUMMARY:${echapperTexteIcs(prefixe + titre)}`,
        ...(description ? [`DESCRIPTION:${echapperTexteIcs(description)}`] : []),
        ...(location ? [`LOCATION:${echapperTexteIcs(location)}`] : []),
        ...(urlSure ? [`URL:${urlSure}`] : []),
        ...(categorie ? [`CATEGORIES:${echapperTexteIcs(categorie)}`] : []),
        `STATUS:${o.statut === 'annule' ? 'CANCELLED' : o.statut === 'reporte' ? 'TENTATIVE' : 'CONFIRMED'}`,
        `SEQUENCE:${sequence}`,
        ...(Number.isFinite(modifie) ? [`LAST-MODIFIED:${utcIcs(modifie)}`] : []),
        'END:VEVENT',
      ]
      vevents.push({ debut: b.debut.getTime(), uid, lignes })
    }
  }
  vevents.sort((a, b) => a.debut - b.debut || ordre(a.uid, b.uid))

  return [...entete, ...vevents.flatMap(v => v.lignes), 'END:VCALENDAR'].map(replierLigneIcs).join('\r\n') + '\r\n'
}

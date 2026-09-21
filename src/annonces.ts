// Bandeaux et fenêtres d'annonce programmés.
//
// Un site en a plusieurs à l'avance — « fermés du 15 au 26 septembre », puis
// « permanence à la Foire du Valais », puis « vœux de fin d'année » — et n'en
// montre JAMAIS deux à la fois. Chacun est programmé : un jour de début et un
// jour de fin, compris, chacun avec une heure facultative. Sans heure, le
// début est le début de la journée et la fin, la fin de la journée. Sans
// début, c'est déjà commencé ; sans fin, ça ne finit pas.
//
// Tout se compare en heure murale de Zurich : le serveur est en UTC, et un
// bandeau « jusqu'au 26 à 18h » ne doit pas tomber à 16h ou à 20h.
//
// La règle vit ici, dans le kit, parce qu'elle est lue à trois endroits qui
// doivent dire la même chose : le site (qui DÉCIDE de l'affichage), le studio
// et l'espace client (qui le DISENT à celui qui règle). Avant, chacun en avait
// une copie à recopier à la main.

import { dateValide, heureValide, instantZurich, maintenantZurich } from './horaires'
import { ajouterJours } from './feries-suisses'

// ── Modèle ──────────────────────────────────────────────────────────────────

/** Ce qui est programmé. Jours « AAAA-MM-JJ », heures « HH:MM ». */
export interface Programmation {
  du?: string | null
  au?: string | null
  deHeure?: string | null
  aHeure?: string | null
}

/** Bandeau au-dessus de l'en-tête : une ligne, éventuellement cliquable. */
export interface Annonce extends Programmation {
  id: string
  texte: string
  href?: string | null
  /** Le visiteur peut le fermer d'une croix, pour sa visite. */
  fermable?: boolean
}

/** Fenêtre au centre de l'écran, par-dessus la page, une fois par visite. */
export interface Fenetre extends Programmation {
  id: string
  titre: string
  texte?: string | null
  image?: string | null
  bouton?: { label?: string | null; href?: string | null; nouvelOnglet?: boolean } | null
  /** Secondes avant l'ouverture, 0 à 30. */
  delai?: number | null
}

export type EtatProgrammation = 'permanente' | 'en-ligne' | 'programmee' | 'terminee'

// ── Bornes ──────────────────────────────────────────────────────────────────

const minutesDe = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }

/** L'instant où ça commence, ou null si c'est déjà commencé (pas de jour). */
export function debutDe(p: Programmation | null | undefined): number | null {
  const du = (p?.du ?? '').trim()
  if (!dateValide(du)) return null
  const h = (p?.deHeure ?? '').trim()
  return instantZurich(du, heureValide(h) ? minutesDe(h) : 0)
}

/** L'instant où ça finit — exclu —, ou null si ça ne finit pas. Le jour de
 *  fin est compris : sans heure, il se termine à minuit, c'est-à-dire au
 *  début du jour suivant. */
export function finDe(p: Programmation | null | undefined): number | null {
  const au = (p?.au ?? '').trim()
  if (!dateValide(au)) return null
  const h = (p?.aHeure ?? '').trim()
  return heureValide(h) ? instantZurich(au, minutesDe(h)) : instantZurich(ajouterJours(au, 1), 0)
}

export function etatProgrammation(p: Programmation | null | undefined, instant: Date = new Date()): EtatProgrammation {
  const debut = debutDe(p), fin = finDe(p)
  const t = instant.getTime()
  if (debut !== null && t < debut) return 'programmee'
  if (fin !== null && t >= fin) return 'terminee'
  return debut === null && fin === null ? 'permanente' : 'en-ligne'
}

export const estActive = (p: Programmation | null | undefined, instant: Date = new Date()) => {
  const e = etatProgrammation(p, instant)
  return e === 'en-ligne' || e === 'permanente'
}

/** Deux programmations se chevauchent si un instant appartient aux deux. Une
 *  borne absente vaut l'infini de son côté. */
export function seChevauchent(a: Programmation, b: Programmation): boolean {
  const da = debutDe(a) ?? -Infinity, fa = finDe(a) ?? Infinity
  const db = debutDe(b) ?? -Infinity, fb = finDe(b) ?? Infinity
  return da < fb && db < fa
}

/** Les paires qui se chevauchent : c'est ce que l'écran de réglage signale,
 *  parce que le site n'en montrera qu'une. */
export function chevauchements<T extends Programmation>(liste: T[]): [T, T][] {
  const paires: [T, T][] = []
  for (let i = 0; i < liste.length; i++) {
    for (let j = i + 1; j < liste.length; j++) {
      if (seChevauchent(liste[i], liste[j])) paires.push([liste[i], liste[j]])
    }
  }
  return paires
}

/** Celle qui s'affiche maintenant. S'il y en a plusieurs — la règle interdit
 *  le chevauchement, mais un réglage peut le contredire —, la plus récemment
 *  commencée l'emporte : une annonce posée après une autre est celle qu'on
 *  voulait voir. À égalité, la dernière de la liste. */
export function actif<T extends Programmation>(liste: T[], instant: Date = new Date()): T | null {
  let choix: T | null = null
  let debutChoix = -Infinity
  for (const p of liste) {
    if (!estActive(p, instant)) continue
    const d = debutDe(p) ?? -Infinity
    if (choix === null || d >= debutChoix) { choix = p; debutChoix = d }
  }
  return choix
}

/** La prochaine à venir : celle dont le début est le plus proche. */
export function prochain<T extends Programmation>(liste: T[], instant: Date = new Date()): T | null {
  let choix: T | null = null
  let debutChoix = Infinity
  for (const p of liste) {
    if (etatProgrammation(p, instant) !== 'programmee') continue
    const d = debutDe(p) ?? Infinity
    if (d < debutChoix) { choix = p; debutChoix = d }
  }
  return choix
}

// ── Dire l'état ─────────────────────────────────────────────────────────────

/** « 26 septembre 2026 » — à midi UTC, pour qu'aucun fuseau ne fasse glisser
 *  le jour. Sans l'année si c'est celle en cours. */
export function jourLisible(ymd: string, aujourdhui = maintenantZurich().date): string {
  const memeAnnee = ymd.slice(0, 4) === aujourdhui.slice(0, 4)
  return new Intl.DateTimeFormat('fr-CH', { day: 'numeric', month: 'long', ...(memeAnnee ? {} : { year: 'numeric' }), timeZone: 'UTC' })
    .format(new Date(`${ymd}T12:00:00Z`))
}

const heureLisibleFr = (hhmm: string) => { const [h, m] = hhmm.split(':'); return `${Number(h)}h${m === '00' ? '' : m}` }

/** « du 3 octobre à 8h », « jusqu'au 26 septembre à 18h » : la borne et son
 *  heure, si elle en a une. */
function borneLisible(jour: string, heure: string | null | undefined, aujourdhui: string): string {
  const h = (heure ?? '').trim()
  return jourLisible(jour, aujourdhui) + (heureValide(h) ? ` à ${heureLisibleFr(h)}` : '')
}

/** La phrase pour celui qui règle : elle dit exactement ce que le site fait.
 *  Au masculin pour un bandeau, au féminin pour une fenêtre. */
export function direProgrammation(p: Programmation | null | undefined, genre: 'm' | 'f' = 'm', instant: Date = new Date()): string {
  const auj = maintenantZurich(instant).date
  const e = genre === 'f' ? 'e' : ''
  const du = (p?.du ?? '').trim(), au = (p?.au ?? '').trim()
  switch (etatProgrammation(p, instant)) {
    case 'programmee':
      return `Programmé${e} : à partir du ${borneLisible(du, p?.deHeure, auj)}${dateValide(au) ? `, jusqu’au ${borneLisible(au, p?.aHeure, auj)}` : ''}.`
    case 'terminee':
      return `Terminé${e} : retiré${e} le ${borneLisible(au, p?.aHeure, auj)}.`
    case 'en-ligne':
      return dateValide(au)
        ? `En ligne jusqu’au ${borneLisible(au, p?.aHeure, auj)}${heureValide((p?.aHeure ?? '').trim()) ? '' : ' compris'}.`
        : 'En ligne, sans date de fin.'
    default:
      return 'En ligne en permanence, sans dates.'
  }
}

// ── Nettoyage et lecture ────────────────────────────────────────────────────

const texte = (s: unknown, max = 300) => typeof s === 'string' && s.trim() ? s.trim().slice(0, max) : null
const jour = (s: unknown) => (dateValide(s) ? s : null)
const heure = (s: unknown) => (heureValide(s) ? s : null)
const ident = (s: unknown, i: number, prefixe: string) => (typeof s === 'string' && s.trim() ? s.trim().slice(0, 40) : `${prefixe}-${i + 1}`)

/** Une programmation propre : jours et heures valides, fin après le début
 *  (sinon la fin est ramenée au jour du début). */
function programmationPropre(o: Record<string, unknown>): Programmation {
  let du = jour(o.du), au = jour(o.au)
  if (du && au && au < du) au = du
  const p: Programmation = { du, au, deHeure: du ? heure(o.deHeure) : null, aHeure: au ? heure(o.aHeure) : null }
  const d = debutDe(p), f = finDe(p)
  if (d !== null && f !== null && f <= d) p.aHeure = null
  return p
}

const liste = (v: unknown) => (Array.isArray(v) ? v : []).filter(e => e && typeof e === 'object') as Record<string, unknown>[]

/** Nettoie une liste de bandeaux reçue d'un formulaire ou de la base. Un
 *  bandeau sans texte n'existe pas. Ne lève jamais. */
export function assainirAnnonces(v: unknown): Annonce[] {
  return liste(v).map((o, i): Annonce | null => {
    const t = texte(o.texte)
    if (!t) return null
    return {
      id: ident(o.id, i, 'annonce'), texte: t, href: texte(o.href, 500),
      ...(o.fermable === true ? { fermable: true } : {}),
      ...programmationPropre(o),
    }
  }).filter((a): a is Annonce => !!a).slice(0, 50)
}

/** Nettoie une liste de fenêtres. Une fenêtre sans titre n'existe pas ; un
 *  bouton sans libellé non plus ; le délai est borné à trente secondes. */
export function assainirFenetres(v: unknown): Fenetre[] {
  return liste(v).map((o, i): Fenetre | null => {
    const t = texte(o.titre, 120)
    if (!t) return null
    const b = o.bouton && typeof o.bouton === 'object' ? o.bouton as Record<string, unknown> : null
    const label = b ? texte(b.label, 60) : null
    const delai = Number(o.delai)
    return {
      id: ident(o.id, i, 'fenetre'), titre: t, texte: texte(o.texte, 600), image: texte(o.image, 800),
      bouton: label ? { label, href: texte(b!.href, 500), ...(b!.nouvelOnglet === true ? { nouvelOnglet: true } : {}) } : null,
      delai: Number.isFinite(delai) ? Math.min(30, Math.max(0, Math.round(delai))) : 2,
      ...programmationPropre(o),
    }
  }).filter((f): f is Fenetre => !!f).slice(0, 50)
}

/** Les bandeaux d'un en-tête (`shell.header`). La liste `annonces` fait foi ;
 *  à défaut, l'ancien bandeau unique `annonce` en tient lieu — les sites
 *  réglés avant la liste continuent d'afficher le leur. */
export function annoncesDe(header: unknown): Annonce[] {
  const h = (header && typeof header === 'object' ? header : {}) as { annonces?: unknown; annonce?: unknown }
  if (Array.isArray(h.annonces)) return assainirAnnonces(h.annonces)
  return h.annonce ? assainirAnnonces([{ id: 'annonce-1', ...(h.annonce as object) }]) : []
}

/** Les fenêtres d'une coquille (`shell`). Même règle : `fenetres`, sinon
 *  l'ancienne `fenetre` unique. */
export function fenetresDe(shell: unknown): Fenetre[] {
  const s = (shell && typeof shell === 'object' ? shell : {}) as { fenetres?: unknown; fenetre?: unknown }
  if (Array.isArray(s.fenetres)) return assainirFenetres(s.fenetres)
  return s.fenetre ? assainirFenetres([{ id: 'fenetre-1', ...(s.fenetre as object) }]) : []
}

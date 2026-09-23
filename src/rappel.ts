import {
  JOURS_FR, JOURS_EN, calendrier, heureLisible, instantZurich, maintenantZurich,
  type Horaires, type LangueHoraires, type Plage,
} from './horaires'

// Les créneaux proposés au visiteur qui demande à être rappelé.
//
// La règle tient en une phrase : on ne propose que des moments où quelqu'un
// décroche vraiment. Le commerce a déjà déclaré ses horaires, ses jours fériés
// et ses vacances — les reprendre ici évite la promesse qu'on ne tient pas
// (« on vous rappelle » un dimanche soir, pour un appel qui viendra mardi).
//
// Pur : aucune base, aucun React. Le site s'en sert pour afficher les choix,
// le serveur pour vérifier celui qu'on lui renvoie — un visiteur peut poster
// ce qu'il veut, et le serveur ne croit que ce qu'il a lui-même calculé.

/** Un créneau proposé. `cle` voyage jusqu'au serveur ; `texte` est ce que le
 *  visiteur a lu, et qu'on garde tel quel dans la demande. */
export interface CreneauRappel {
  cle: string
  texte: string
  /** Début du créneau, en instant réel. Absent pour « dès que possible ». */
  debut?: number
}

export interface OptionsCreneaux {
  /** Combien de créneaux datés proposer, au plus. Trois suffisent à choisir. */
  nombre?: number
  langue?: LangueHoraires
  /** Jusqu'où chercher. Deux semaines : au-delà, personne ne planifie un rappel. */
  horizon?: number
}

const MIDI = 12 * 60
/** Un créneau plus court ne vaut pas d'être proposé : le temps d'y penser, il
 *  est passé. */
const DUREE_MINIMALE = 45
/** On ne propose pas un créneau qui commence dans dix minutes : le visiteur
 *  vient d'écrire, le commerçant n'a pas encore vu la demande. */
const DELAI_MINIMAL = 15

const mm = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

const jourDeLaDate = (date: string): number => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export const ajouterJour = (date: string, n: number): string => {
  const [y, m, d] = date.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`
}

/** « aujourd'hui », « demain », puis le nom du jour. */
function nomDuJour(date: string, aujourdhui: string, lang: LangueHoraires): string {
  if (date === aujourdhui) return lang === 'fr' ? 'aujourd’hui' : 'today'
  if (date === ajouterJour(aujourdhui, 1)) return lang === 'fr' ? 'demain' : 'tomorrow'
  const noms = lang === 'fr' ? JOURS_FR : JOURS_EN
  const nom = noms[jourDeLaDate(date)] ?? ''
  return lang === 'fr' ? nom.toLowerCase() : nom
}

/** Les deux moitiés d'une journée d'ouverture, quand elles existent vraiment.
 *  Un commerce ouvert 8 h – 18 h donne un matin et un après-midi ; ouvert
 *  9 h – 11 h, un matin seul. */
function moities(plages: Plage[]): { cle: 'matin' | 'apres_midi'; debut: number; fin: number }[] {
  const out: { cle: 'matin' | 'apres_midi'; debut: number; fin: number }[] = []
  for (const cle of ['matin', 'apres_midi'] as const) {
    const borneBas = cle === 'matin' ? 0 : MIDI
    const borneHaut = cle === 'matin' ? MIDI : 24 * 60
    let debut = Infinity, fin = -Infinity
    for (const p of plages) {
      const d = Math.max(mm(p.debut), borneBas)
      // Une plage qui passe minuit (fin ≤ début) court jusqu'au lendemain :
      // on la borne au jour courant, sinon « soir » deviendrait « matin ».
      const brut = mm(p.fin) <= mm(p.debut) ? 24 * 60 : mm(p.fin)
      const f = Math.min(brut, borneHaut)
      if (f - d >= DUREE_MINIMALE) { debut = Math.min(debut, d); fin = Math.max(fin, f) }
    }
    if (debut < fin) out.push({ cle, debut, fin })
  }
  return out
}

const libelleMoitie = (cle: 'matin' | 'apres_midi', lang: LangueHoraires): string =>
  lang === 'fr' ? (cle === 'matin' ? 'matin' : 'après-midi') : (cle === 'matin' ? 'morning' : 'afternoon')

/** Les créneaux à proposer, dans l'ordre. Le premier est toujours « dès que
 *  possible » : sa phrase dit la vérité du moment — tout de suite si c'est
 *  ouvert, sinon à la prochaine ouverture. */
export function creneauxDeRappel(
  h: Horaires | null | undefined,
  instant: Date = new Date(),
  o: OptionsCreneaux = {},
): CreneauRappel[] {
  const lang = o.langue ?? 'fr'
  const nombre = Math.max(1, Math.min(8, o.nombre ?? 3))
  const horizon = Math.max(1, Math.min(21, o.horizon ?? 14))
  const { date: aujourdhui, minutes } = maintenantZurich(instant)

  const desQuePossible: CreneauRappel = {
    cle: 'des_que_possible',
    texte: lang === 'fr' ? 'Dès que possible' : 'As soon as possible',
  }

  // Sans horaires déclarés, on ne sait rien : un seul choix, honnête.
  if (!h || !(h.semaine ?? []).length) return [desQuePossible]

  const jour = calendrier(h)
  const dates: CreneauRappel[] = []
  for (let n = 0; n < horizon && dates.length < nombre; n++) {
    const date = ajouterJour(aujourdhui, n)
    const j = jour(date)
    if (!j.plages.length) continue
    for (const m of moities(j.plages)) {
      if (dates.length >= nombre) break
      // Aujourd'hui, un créneau déjà commencé compte s'il reste du temps ;
      // déjà fini, il ne compte pas.
      const depart = n === 0 ? Math.max(m.debut, minutes + DELAI_MINIMAL) : m.debut
      if (m.fin - depart < DUREE_MINIMALE) continue
      const quand = nomDuJour(date, aujourdhui, lang)
      const plage = `${heureLisible(String(Math.floor(m.debut / 60)).padStart(2, '0') + ':' + String(m.debut % 60).padStart(2, '0'), lang)}–${heureLisible(String(Math.floor(m.fin / 60)).padStart(2, '0') + ':' + String(m.fin % 60).padStart(2, '0'), lang)}`
      dates.push({
        cle: `${date}:${m.cle}`,
        texte: `${quand.charAt(0).toUpperCase()}${quand.slice(1)} ${libelleMoitie(m.cle, lang)} (${plage})`,
        debut: instantZurich(date, m.debut),
      })
    }
  }

  return [desQuePossible, ...dates]
}

/** Le créneau que le visiteur dit avoir choisi, retrouvé parmi ceux qu'on
 *  propose vraiment. null s'il n'en fait pas partie : le serveur ne garde que
 *  ce qu'il a lui-même calculé, jamais le texte reçu. */
export function creneauChoisi(
  cle: string | null | undefined,
  h: Horaires | null | undefined,
  instant: Date = new Date(),
  o: OptionsCreneaux = {},
): CreneauRappel | null {
  const c = (cle ?? '').trim()
  if (!c) return null
  // On cherche large : le visiteur a pu réfléchir quelques minutes, et un
  // créneau proposé il y a dix minutes doit rester acceptable.
  const liste = creneauxDeRappel(h, instant, { ...o, nombre: 8, horizon: o.horizon ?? 14 })
  return liste.find(x => x.cle === c) ?? null
}

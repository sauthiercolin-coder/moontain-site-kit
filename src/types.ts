// Contrat de données partagé entre les éditeurs (espace-clients,
// moontain-gallerie) et les templates de rendu (vertdaltitude-site).
// Les champs de chaque section couvrent l'union de ce qu'utilisent les
// templates LeafLife et Aurora (un template ignore simplement les champs
// qu'il ne rend pas) — vérifié contre le contenu réel en base (Borges
// Paysagisme), pas seulement contre le code des templates.

export type SectionType =
  | 'hero'
  | 'featured'
  | 'stats'
  | 'values'
  | 'features'
  | 'process'
  | 'services'
  | 'testimonials'
  | 'projects'
  | 'beforeAfter'
  | 'cta'
  | 'contact'
  | 'posts'
  | 'faq'
  | 'team'
  | 'logos'
  | 'pricing'
  | 'gallery'
  | 'video'
  | 'map'
  | 'story'
  | 'manifesto'
  | 'marquee'
  | 'availability'
  | 'rooms'
  | 'deals'
  | 'booking'
  | 'properties'
  | 'wines'
  | 'moduleBooking'
  | 'moduleTickets'
  | 'moduleGiftcard'
  | 'moduleMembership'
  | 'moduleReviews'
  | 'form'
  | 'libre'
  | 'liste'
  | 'liens'

/** Nature d'un élément d'un bloc libre. Volontairement peu de valeurs : une
 *  palette qui enfle redevient une page blanche, et c'est justement ce qu'un
 *  bloc typé évite. Ces six-là couvrent le « je veux juste poser un bouton
 *  ici » qui manquait, sans rouvrir la porte au placement absolu. */
export type ElementLibreType =
  | 'titre' | 'texte' | 'image' | 'bouton' | 'trait' | 'espace'
  // Version 2. Vidéo, galerie et carte existent aussi comme blocs entiers : ce
  // sont ici des versions simples, et c'est tout l'intérêt du bloc libre —
  // poser un texte et une vidéo côte à côte dans deux colonnes, ce qu'un bloc
  // séparé ne sait pas faire. Les blocs dédiés restent pour les cas riches.
  | 'icone' | 'video' | 'galerie' | 'compte' | 'carte' | 'reseaux' | 'html'

/** Un élément d'un bloc libre. Tous les champs sont optionnels sauf `type` :
 *  un élément à peine posé doit pouvoir exister avant d'être rempli, comme un
 *  item de liste répétable. */
export interface ElementLibre {
  type: ElementLibreType
  /** Titre, paragraphe, ou libellé du bouton selon `type`. */
  texte?: string
  /** Titre seulement : 'h2' (défaut) ou 'h3'. Pas de h1 — il appartient à la
   *  bannière de la page, et deux h1 sur une page se disputent le sujet. */
  niveau?: string
  /** Image seulement. `alt` sert aux moteurs et aux lecteurs d'écran. */
  image?: string
  alt?: string
  /** Bouton seulement : destination, et apparence pleine ou en contour. */
  href?: string
  apparence?: string
  /** Espace seulement : 'petit' | 'moyen' | 'grand'. */
  taille?: string

  // ── Version 2 ─────────────────────────────────────────────────────────────
  /** Icône seulement : clé dans ICONES_LIBRE. */
  icone?: string
  /** Vidéo seulement : adresse YouTube, Vimeo ou fichier, et image d'attente. */
  videoUrl?: string
  poster?: string
  /** Galerie seulement. Une liste dans un élément, là où les autres champs sont
   *  plats : une galerie sans plusieurs images n'est pas une galerie. */
  images?: { image?: string; alt?: string }[]
  /** Compte à rebours seulement : date visée (ISO) et ce qu'on affiche après. */
  date?: string
  apres?: string
  /** Carte seulement : adresse postale, géocodée par le fournisseur de cartes. */
  adresse?: string
  /** Réseaux sociaux seulement. L'élément porte ses propres liens : les faire
   *  descendre depuis les coordonnées de l'entreprise demanderait de traverser
   *  une douzaine de gabarits. L'inspecteur du CMS propose de les recopier. */
  reseaux?: { nom?: string; href?: string }[]
  /** HTML brut seulement. Réservé au studio : un client pourrait y coller un
   *  traceur, ce qui ruinerait l'argument « aucun cookie, aucun bandeau ». */
  html?: string
}

/** Icônes disponibles pour l'élément « icône avec texte ».
 *
 *  Les tracés vivent ici plutôt que dans chaque application : l'inspecteur doit
 *  montrer le choix, le rendu doit le dessiner, et une bibliothèque d'icônes
 *  côté site ajouterait un paquet à charger pour douze traits.
 *
 *  Douze, et pas trois cents : au-delà, choisir devient une corvée et les sites
 *  se mettent à ressembler à des catalogues de pictogrammes. */
export const ICONES_LIBRE: { cle: string; label: string; d: string }[] = [
  { cle: 'check',   label: 'Coche',      d: 'M20 6 9 17l-5-5' },
  { cle: 'etoile',  label: 'Étoile',     d: 'm12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3L7 14.2l-5-4.9 6.9-1z' },
  { cle: 'coeur',   label: 'Cœur',       d: 'M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z' },
  { cle: 'tel',     label: 'Téléphone',  d: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z' },
  { cle: 'mail',    label: 'E-mail',     d: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm18 3-10 6L2 7' },
  { cle: 'lieu',    label: 'Lieu',       d: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0zm-8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
  { cle: 'horloge', label: 'Horloge',    d: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zm0-16v6l4 2' },
  { cle: 'agenda',  label: 'Agenda',     d: 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM3 10h18M8 2v4m8-4v4' },
  { cle: 'bouclier',label: 'Bouclier',   d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { cle: 'eclair',  label: 'Éclair',     d: 'M13 2 3 14h8l-1 8 10-12h-8z' },
  { cle: 'outil',   label: 'Outil',      d: 'M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2.8 2.8 0 0 1-4-4z' },
  { cle: 'feuille', label: 'Feuille',    d: 'M11 20A7 7 0 0 1 4 13c0-6 7-9 16-9 0 9-3 16-9 16zM4 20c2-4 5-7 9-9' },
]

/** Icônes de la page de liens.
 *
 *  Une liste à part d'ICONES_LIBRE, et non son extension : le bloc libre parle
 *  d'idées (une coche, un éclair), la page de liens parle de destinations (un
 *  compte, une boutique, une messagerie). Mélanger les deux donnerait un menu
 *  de trente entrées où l'on ne trouve plus ni les unes ni les autres.
 *
 *  Les marques sont dessinées au trait, comme le reste — pas leur logo
 *  officiel. C'est délibéré : un logo posé à sa couleur exacte au milieu d'une
 *  page qui a la sienne casse l'identité du site, et c'est justement ce qu'on
 *  vend. Le tracé suffit à faire reconnaître la destination.
 *
 *  `d` peut contenir plusieurs sous-chemins : un cercle s'y écrit en arcs,
 *  faute de pouvoir composer <circle> et <path> dans une seule valeur. */
export const ICONES_LIEN: { cle: string; label: string; d: string }[] = [
  { cle: 'instagram', label: 'Instagram', d: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zM8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0zM17.5 6.6h.01' },
  { cle: 'youtube',   label: 'YouTube',   d: 'M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49 49 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49 49 0 0 1-16.2 0A2 2 0 0 1 2.5 17zM10 9l5 3-5 3z' },
  { cle: 'linkedin',  label: 'LinkedIn',  d: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM2 4a2 2 0 1 0 4 0 2 2 0 1 0-4 0z' },
  { cle: 'facebook',  label: 'Facebook',  d: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' },
  { cle: 'whatsapp',  label: 'WhatsApp',  d: 'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z' },
  { cle: 'note',      label: 'Note de musique', d: 'M9 18V5l12-2v13M3 18a3 3 0 1 0 6 0 3 3 0 1 0-6 0zM15 16a3 3 0 1 0 6 0 3 3 0 1 0-6 0z' },
  { cle: 'site',      label: 'Site web',  d: 'M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0zM2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z' },
  { cle: 'photo',     label: 'Photo',     d: 'M3 6h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM8 13a4 4 0 1 0 8 0 4 4 0 1 0-8 0z' },
  { cle: 'video',     label: 'Vidéo',     d: 'M2 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zM15 10l7-4v12l-7-4z' },
  { cle: 'boutique',  label: 'Boutique',  d: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M8 10a4 4 0 0 0 8 0' },
  { cle: 'agenda',    label: 'Rendez-vous', d: 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM3 10h18M8 2v4m8-4v4' },
  { cle: 'mail',      label: 'E-mail',    d: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm18 3-10 6L2 7' },
  { cle: 'tel',       label: 'Téléphone', d: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z' },
  { cle: 'lieu',      label: 'Itinéraire', d: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0zm-8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
  // Nature et montagne. Elles ne sont pas décoratives : un guide, un
  // photographe de montagne ou un hébergeur nomme ses liens par ce qu'il y a
  // au bout — « Les sorties de l'hiver », « Le chalet » — et une icône de
  // marque ou de document ne dit rien de tout ça.
  { cle: 'montagne',  label: 'Montagne',  d: 'm8 3 4 8 5-5 5 15H2Z' },
  { cle: 'sommet',    label: 'Sommet enneigé', d: 'm8 3 4 8 5-5 5 15H2Z M4.1 15.1c2.6-1.6 5.2-1.4 7.9.4 2.7 1.9 5.5 2 8.2.2' },
  { cle: 'sapin',     label: 'Forêt',     d: 'M12 3 6 12h3l-4 6h14l-4-6h3zM12 18v3' },
  { cle: 'feuille',   label: 'Feuille',   d: 'M11 20A7 7 0 0 1 4 13c0-6 7-9 16-9 0 9-3 16-9 16zM4 20c2-4 5-7 9-9' },
  { cle: 'lac',       label: 'Lac',       d: 'M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 1.3 0 1.9-.5 2.5-1' },
  { cle: 'soleil',    label: 'Soleil',    d: 'M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0zM12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4' },
  { cle: 'flocon',    label: 'Neige',     d: 'M12 2v20M3.4 7l17.2 10M20.6 7 3.4 17M12 6.5 9.4 5m2.6 1.5L14.6 5M12 17.5 9.4 19m2.6-1.5 2.6 1.5' },
  { cle: 'tente',     label: 'Bivouac',   d: 'M3.5 21 14 3m6.5 18L10 3M15.5 21 12 15l-3.5 6M2 21h20' },
  { cle: 'chalet',    label: 'Chalet',    d: 'm3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10' },
  { cle: 'boussole',  label: 'Boussole',  d: 'M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0zM16.2 7.8l-2.9 6.6-6.6 2.9 2.9-6.6z' },
  { cle: 'document',  label: 'Document',  d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5' },
  { cle: 'lien',      label: 'Lien',      d: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7' },
]

export interface SectionInstance<T = unknown> {
  id: string
  organizationId: string
  type: SectionType
  position: number
  enabled: boolean
  editableByClient: boolean
  /** Mise en page choisie parmi SECTION_TYPES[type].variants — même contenu,
   * présentation différente. `undefined`/inconnue = 1re variante du type. */
  variant?: string
  content: T
}

export interface HeroGridItem {
  image?: string
  title?: string
  category?: string
  href?: string
}

export interface HeroContent {
  headline?: string
  subtext?: string
  images?: string[]   // LeafLife : plusieurs visuels (carrousel/collage)
  image?: string       // Aurora : un seul visuel principal
  imageAlt?: string    // texte alternatif de la 1re image (accessibilité) — l'image n'est pas décorative
  kicker?: string      // Aurora : accroche courte au-dessus du titre
  cta?: string         // Aurora : libellé du bouton principal
  cta2?: string        // Aurora : libellé du bouton secondaire
  subline?: string     // ligne courte sous le titre (variante éditoriale)
  ctaHref?: string
  grid?: HeroGridItem[]   // variante « grid » : mosaïque de projets sous le titre
  footerLeft?: string     // rangée bordée basse (gauche)
  footerRight?: string    // rangée bordée basse (droite)
}

export interface FeaturedContent {
  name?: string
  location?: string
  image?: string
}

export interface StatItem {
  value?: string
  label?: string
}

export interface ValueItem {
  label?: string       // LeafLife : simple libellé
  num?: string          // Aurora : numéro affiché ("01", "02"...)
  title?: string        // Aurora
  text?: string         // Aurora
  image?: string        // Aurora
}

export interface FeatureItem {
  title?: string
  description?: string
  image?: string   // Aurora ; variante « editorial » : image de fond au survol
  eyebrow?: string // numéro affiché (ex. « 01 »)
  sub?: string     // sous-titre court (repli sur description)
  href?: string    // lien de la carte / rangée de navigation
}

export interface ProcessItem {
  title?: string
  description?: string
}

export interface ServiceItem {
  title?: string
  description?: string
  image?: string
}

export interface ProjectItem {
  name?: string
  location?: string
  description?: string
  image?: string
  images?: string[]
  /** Slug de la fiche projet réelle, si cette réalisation en a une — sans lui,
   * la carte ne peut pointer que vers la liste générale des projets. */
  slug?: string
}

export interface TestimonialItem {
  author?: string
  location?: string
  text?: string
}

export interface BeforeAfterItem {
  title?: string
  before?: string
  after?: string
}

export interface PostItem {
  title?: string
  excerpt?: string
  body?: string
  image?: string
  date?: string
}

export interface CtaContent {
  title?: string
  text?: string
  button?: string
  image?: string
  eyebrow?: string        // variante split : accroche au-dessus (avec filet)
  emphasis?: string       // fin de titre mise en avant (cuivre)
  buttonHref?: string
  button2?: string        // variante split : second bouton
  button2Href?: string
}

/** Bandeau de disponibilité : pastille + phrase (avec fragment mis en avant) + lien. */
export interface AvailabilityContent {
  text?: string
  highlight?: string
  linkLabel?: string
  linkHref?: string
}

export interface ContactContent {
  title?: string
  subtitle?: string
}

export interface FaqItem {
  question?: string
  answer?: string
}

export interface TeamMemberItem {
  name?: string
  role?: string
  image?: string
  bio?: string
}

export interface LogoItem {
  name?: string
  image?: string
  url?: string
}

export interface PricingPlanItem {
  name?: string
  price?: string
  period?: string
  /** Une ligne = un avantage, découpée à l'affichage. */
  features?: string
  highlighted?: boolean
}

export interface GalleryImageItem {
  image?: string
  caption?: string
}

export interface VideoContent {
  title?: string
  videoUrl?: string
  poster?: string
}

export interface MapContent {
  title?: string
  /** Autonome : ne dépend pas de business.address pour rester déplaçable/
   * désactivable indépendamment de la section Contact. */
  address?: string
}

export interface StoryContent {
  eyebrow?: string
  title?: string
  text?: string
  image?: string
  imageAlt?: string    // texte alternatif de l'image (accessibilité) — l'image n'est pas décorative
}

/** Manifeste : bloc éditorial deux colonnes séparées d'un filet — accroche +
 * grande déclaration (avec un mot d'emphase optionnel) + signature à gauche,
 * paragraphes + lien à droite. */
export interface ManifestoContent {
  eyebrow?: string
  statement?: string
  emphasis?: string       // mot/fin de phrase mis en avant (cuivre, italique)
  signature?: string
  body?: string           // paragraphes (une ligne vide = nouveau paragraphe)
  linkLabel?: string
  linkHref?: string
}

/** Bandeau défilant : suite de libellés répétés en continu. */
export interface MarqueeItem {
  label?: string
}

/** Chambre / hébergement (template hôtelier Hoteru) : carte riche avec
 * équipements chiffrés et prix. */
export interface RoomItem {
  name?: string
  image?: string
  description?: string
  price?: string
  period?: string       // ex. « /nuit »
  beds?: string         // ex. « 2 lits »
  baths?: string        // ex. « 2 salles de bain »
  persons?: string      // ex. « 4 personnes »
  size?: string         // ex. « 60 m² »
  /** Une ligne = un équipement (Wifi, TV, chauffage…), découpée à l'affichage. */
  features?: string
}

/** Offre / forfait promotionnel (section « Meilleures offres »). */
export interface DealItem {
  name?: string
  image?: string
  price?: string
  rating?: string       // ex. « 4.9 »
  reviews?: string      // ex. « 8 avis »
  expiry?: string       // ex. « Expire le 30/12 »
  discount?: string     // ex. « -20 % »
}

/** Bloc « Vérifier les disponibilités » — formulaire de réservation. */
export interface BookingContent {
  title?: string
  image?: string
}

/** Bien immobilier (template agence immobilière) : carte avec statut, prix,
 * localisation et caractéristiques chiffrées. */
export interface PropertyItem {
  title?: string
  image?: string
  location?: string
  price?: string
  status?: string       // ex. « À vendre », « Vendu », « Sous offre »
  beds?: string         // ex. « 4 chambres »
  baths?: string        // ex. « 3 salles de bain »
  surface?: string      // ex. « 240 m² »
  description?: string
  slug?: string         // page détail du bien (ex. 'villa-contemporaine')
}

/** Vin / cru (template cave viticole) : carte de bouteille avec millésime,
 * cépage, région et notes de dégustation. */
export interface WineItem {
  name?: string
  image?: string
  vintage?: string      // millésime, ex. « 2019 »
  region?: string       // appellation / région, ex. « Valais AOC »
  grape?: string        // cépage, ex. « Cornalin »
  price?: string
  notes?: string        // notes de dégustation
  slug?: string         // page détail du vin
}

export interface RepeatableContent<T> {
  items: T[]
}

/** Un lien de la page de liens. Tout est optionnel : un lien à peine posé
 *  doit pouvoir exister avant d'être rempli, comme partout ailleurs. */
export interface LienItem {
  libelle?: string
  /** Deuxième ligne, plus petite. Sert à dire ce qu'on trouve derrière quand
   *  le libellé ne suffit pas (« Instagram » → « Les images de la semaine »). */
  sousTitre?: string
  href?: string
  /** Clé dans ICONES_LIEN. Absente = pas d'icône, le bouton reste du texte. */
  icone?: string
  /** Masqué sans être supprimé : un lien saisonnier revient chaque année, et
   *  le retirer ferait perdre son libellé, son icône et son compte de clics. */
  masque?: boolean
  /** Mis en avant : le bouton prend la couleur pleine du site quand les autres
   *  sont en contour. Une page où tout est mis en avant ne met rien en avant,
   *  l'inspecteur le rappelle. */
  vedette?: boolean
}

/** Contenu du bloc « page de liens ».
 *
 *  Le bloc porte son propre fond et sa propre encre, alors que partout ailleurs
 *  c'est le gabarit qui décide : une page de liens est presque toujours servie
 *  nue (sans en-tête ni pied), donc elle est seule à l'écran et n'a rien dont
 *  hériter. Sans ces champs, elle prendrait le blanc par défaut du navigateur. */
export interface LiensContent {
  /** Image ronde en haut — logo ou portrait. */
  avatar?: string
  nom?: string
  baseline?: string
  items?: LienItem[]
  /** Petits liens d'icônes en bas de page (réseaux sociaux). Séparés des
   *  boutons : ce sont des destinations secondaires, et les empiler avec le
   *  reste noierait ce qu'on veut vraiment faire cliquer. */
  reseaux?: { icone?: string; href?: string; nom?: string }[]
  /** Fond de la page : couleur, puis image par-dessus si les deux sont là. */
  fond?: string
  fondImage?: string
  /** Couleur du texte. 'auto' la déduit de la clarté du fond — ce qui suffit
   *  presque toujours, sauf sur une image de fond dont on ne sait rien. */
  encre?: 'auto' | 'clair' | 'sombre'
  bouton?: 'plein' | 'contour' | 'verre'
  forme?: 'pilule' | 'arrondi' | 'droit'
  /** Petit texte tout en bas (mentions, année). */
  pied?: string
}

export type SectionContent =
  | HeroContent
  | FeaturedContent
  | RepeatableContent<StatItem>
  | RepeatableContent<ValueItem>
  | RepeatableContent<FeatureItem>
  | RepeatableContent<ProcessItem>
  | RepeatableContent<ServiceItem>
  | RepeatableContent<TestimonialItem>
  | RepeatableContent<ProjectItem>
  | RepeatableContent<BeforeAfterItem>
  | RepeatableContent<PostItem>
  | RepeatableContent<FaqItem>
  | RepeatableContent<TeamMemberItem>
  | RepeatableContent<LogoItem>
  | RepeatableContent<PricingPlanItem>
  | RepeatableContent<GalleryImageItem>
  | RepeatableContent<RoomItem>
  | RepeatableContent<DealItem>
  | RepeatableContent<PropertyItem>
  | RepeatableContent<WineItem>
  | CtaContent
  | ContactContent
  | VideoContent
  | MapContent
  | StoryContent
  | BookingContent
  | LiensContent

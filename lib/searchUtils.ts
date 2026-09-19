import { Product } from '@/lib/products'

/**
 * Normalise une chaîne de texte :
 * - Décompose les accents (NFD) et supprime les diacritiques (é, è, ê, à, ç, ñ -> e, e, e, a, c, n)
 * - Convertit en minuscules
 * - Remplace la ponctuation et caractères spéciaux par des espaces
 * - Supprime les espaces multiples
 */
export function normalizeSearchText(text?: string | null): string {
  if (!text) return ''
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-_'/.,;:!?()"«»[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Dictionnaire bilingue intelligent (Français <-> Espagnol / Termes E-commerce)
 * Permet à un utilisateur francophone de trouver instantanément des articles décrits en espagnol ou français
 */
export const SEARCH_SYNONYMS: Record<string, string[]> = {
  // Chauffage, Poêles, Cheminées
  poele: ['estufa', 'pellet', 'pellets', 'poele', 'poele', 'chauffage', 'canadian', 'sannover', 'caldera'],
  poeles: ['estufa', 'pellet', 'pellets', 'poele', 'poele', 'chauffage'],
  pellet: ['pellet', 'pellets', 'biomasa', 'granule'],
  pellets: ['pellet', 'pellets', 'biomasa', 'granule'],
  granule: ['pellet', 'pellets', 'granule', 'granules', 'biomasa'],
  granules: ['pellet', 'pellets', 'granule', 'granules', 'biomasa'],
  bois: ['lena', 'bois'],
  cheminee: ['chimenea', 'cheminee', 'insert', 'feu', 'foyer'],
  cheminees: ['chimenea', 'cheminee', 'insert'],
  insert: ['insert', 'chimenea', 'estufa'],
  foyer: ['chimenea', 'foyer', 'feu'],

  // Froid & Réfrigération
  frigo: ['frigorifico', 'frigorifique', 'refrigerateur', 'americano', 'combi', 'midea', 'balay', 'samsung', 'bosch', 'lg', 'cecotec'],
  frigos: ['frigorifico', 'frigorifique', 'refrigerateur', 'americano', 'combi'],
  refrigerateur: ['frigorifico', 'frigorifique', 'refrigerateur', 'americano', 'combi'],
  refrigerateurs: ['frigorifico', 'frigorifique', 'refrigerateur', 'americano', 'combi'],
  congelateur: ['congelador', 'congelateur', 'frigorifico'],
  americain: ['americano', 'americain'],
  americains: ['americano', 'americain'],

  // Lavage & Cuisson
  lave: ['lavadora', 'lave', 'linge'],
  laver: ['lavadora', 'laver', 'linge'],
  linge: ['lavadora', 'secadora', 'linge'],
  machine: ['lavadora', 'machine'],
  seche: ['secadora', 'secador', 'seche'],
  sechoir: ['secadora', 'secador', 'sechoir'],
  four: ['horno', 'hornos', 'four', 'cuisson'],
  fours: ['horno', 'hornos', 'four'],
  plaque: ['placa', 'vitroceramica', 'induction', 'vitro'],
  plaques: ['placa', 'vitroceramica', 'induction', 'vitro'],
  induction: ['placa', 'vitroceramica', 'induction'],
  vitroceramique: ['vitroceramica', 'placa'],

  // Mobilier, Salon & Rangement
  table: ['mesa', 'table', 'comedor'],
  tables: ['mesa', 'table'],
  manger: ['comedor', 'manger', 'mesa'],
  canape: ['sofa', 'canape', 'fauteuil', 'salon'],
  canapes: ['sofa', 'canape'],
  sofa: ['sofa', 'canape'],
  sofas: ['sofa', 'canape'],
  fauteuil: ['silla', 'sillon', 'tumbona', 'fauteuil'],
  fauteuils: ['silla', 'sillon', 'tumbona', 'fauteuil'],
  chaise: ['silla', 'chaise'],
  chaises: ['silla', 'chaise'],
  meuble: ['mueble', 'meuble', 'modulo', 'armoire'],
  meubles: ['mueble', 'meuble', 'modulo'],
  tv: ['tv', 'modulo-tv', 'tele', 'television'],
  tele: ['tv', 'modulo-tv', 'tele'],
  lit: ['cama', 'lit', 'matelas'],
  lits: ['cama', 'lit'],
  armoire: ['armoire', 'mueble', 'columna'],

  // Salle de bain
  bain: ['bano', 'bain', 'vasque', 'douche'],
  salle: ['bano', 'salle'],
  baignoire: ['bano', 'baignoire'],
  vasque: ['vasque', 'lavabo', 'bano'],
  lavabo: ['lavabo', 'vasque', 'bano'],

  // Beauté, Soins & Parfums
  parfum: ['parfum', 'fragrance', 'extrait', 'edp', 'edt', 'oud'],
  parfums: ['parfum', 'fragrance', 'extrait'],
  creme: ['creme', 'cream', 'soin', 'luxe'],
  cremes: ['creme', 'cream', 'soin'],
  serum: ['serum', 'elixir', 'soin'],
  serums: ['serum', 'elixir'],
  cheveux: ['cabello', 'cheveux', 'shark', 'glam', 'moldeador', 'plancha', 'cepillo', 'secador'],
  brosse: ['cepillo', 'brosse', 'shark'],
  lisseur: ['plancha', 'lisseur', 'shark'],
  boucleur: ['rizador', 'coanda', 'boucleur', 'shark'],
  visage: ['visage', 'facial', 'peau', 'collagene'],
  antiage: ['antiage', 'anti-age', 'supreme', 'caviar'],
  led: ['led', 'luz', 'masque', 'booster'],
  masque: ['masque', 'mascara', 'led'],

  // Jardin, Loisirs & Plein Air
  billard: ['billar', 'billard', 'juego'],
  billards: ['billar', 'billard'],
  jeu: ['juego', 'jeu', 'billar'],
  jeux: ['juego', 'jeux', 'billar'],
  jardin: ['jardin', 'outdoor', 'exterieur', 'tumbona', 'ratan'],
  terrasse: ['jardin', 'terrasse', 'tumbona', 'outdoor'],
  exterieur: ['jardin', 'outdoor', 'exterieur', 'toldo'],
  piscine: ['piscina', 'piscine', 'spa'],
  piscines: ['piscina', 'piscine'],
  spa: ['spa', 'piscina', 'detente'],
  trampoline: ['cama elastica', 'trampoline', 'jumper'],
  tente: ['tienda', 'glamping', 'safari', 'tente'],
  tentes: ['tienda', 'glamping', 'safari'],
  glamping: ['tienda', 'glamping', 'safari'],
  pergola: ['toldo', 'pergola', 'auvent'],
  store: ['toldo', 'store', 'auvent'],
  auvent: ['toldo', 'auvent', 'pergola'],
}

/**
 * Filtre les produits de manière intelligente :
 * - Insensible à la casse et aux accents
 * - Multi-mots (chaque mot saisi doit être validé)
 * - Prise en compte automatique des synonymes bilingues
 * - Recherche globale si la catégorie active ne donne aucun résultat
 */
export function searchAndFilterProducts(
  allProducts: Product[],
  query: string,
  selectedCategory = 'Tous les produits'
): { products: Product[]; searchedGlobally: boolean } {
  const normQuery = normalizeSearchText(query)
  const words = normQuery ? normQuery.split(' ').filter(Boolean) : []

  // Si aucune recherche texte n'est saisie, simple filtre par catégorie
  if (words.length === 0) {
    if (!selectedCategory || selectedCategory === 'Tous les produits') {
      return { products: allProducts, searchedGlobally: false }
    }
    const normCategory = normalizeSearchText(selectedCategory)
    const filtered = allProducts.filter(
      (p) => normalizeSearchText(p.category) === normCategory
    )
    return { products: filtered, searchedGlobally: false }
  }

  // Fonction de validation d'un produit pour les mots-clés
  const matchesWords = (p: Product) => {
    const searchable = normalizeSearchText(
      `${p.name} ${p.category} ${p.type} ${p.description} ${p.tag || ''}`
    )
    return words.every((word) => {
      // 1. Correspondance exacte ou partielle du mot
      if (searchable.includes(word)) return true

      // 2. Correspondance via le dictionnaire de synonymes
      const synonyms = SEARCH_SYNONYMS[word]
      if (synonyms && synonyms.some((syn) => searchable.includes(normalizeSearchText(syn)))) {
        return true
      }

      return false
    })
  }

  // 1. Si une catégorie est sélectionnée, essayer d'abord dans cette catégorie
  if (selectedCategory && selectedCategory !== 'Tous les produits') {
    const normCategory = normalizeSearchText(selectedCategory)
    const categoryProducts = allProducts.filter(
      (p) => normalizeSearchText(p.category) === normCategory
    )
    const categoryMatches = categoryProducts.filter(matchesWords)

    if (categoryMatches.length > 0) {
      return { products: categoryMatches, searchedGlobally: false }
    }

    // Si 0 résultat dans cette catégorie spécifique, rechercher dans TOUTE la boutique
    // pour éviter de laisser le client avec une page vide
    const globalMatches = allProducts.filter(matchesWords)
    return { products: globalMatches, searchedGlobally: true }
  }

  // 2. Recherche sur l'ensemble de la boutique
  const results = allProducts.filter(matchesWords)
  return { products: results, searchedGlobally: false }
}

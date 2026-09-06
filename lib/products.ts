export interface MediaItem {
  url: string
  type: 'image' | 'video'
}

export interface Product {
  id: string
  name: string
  category: string
  type: string
  price: string
  rawPrice: number
  description: string
  image: string
  images?: string[]
  media?: MediaItem[]
  tag?: string
  rating: number
  reviewsCount: number
}

export const CATEGORIES = [
  'Tous les produits',
  'Haute Cosmétique',
  'Crèmes Anti-Âge',
  'Sérums & Élixirs',
  'Soins du Regard',
  'Coffrets Prestige',
  'Bougies & Parfums',
]

export const PRODUCTS: Product[] = [
  {
    id: 'creme-supreme-anti-age',
    name: 'Crème Suprême Jeunesse & Fermeté',
    category: 'Crèmes Anti-Âge',
    type: 'Soin anti-âge global aux peptides & rose de Damas',
    price: '185,00 €',
    rawPrice: 185,
    description: 'La crème culte plébiscitée : régénération cellulaire intense, comblement des rides et nutrition profonde pour une peau repulpée et lumineuse.',
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=85',
    tag: 'N°1 des Ventes',
    rating: 4.9,
    reviewsCount: 342,
  },
  {
    id: 'serum-elixir-cellulaire',
    name: 'Élixir Renaissance Cellulaire 30ml',
    category: 'Sérums & Élixirs',
    type: 'Sérum liftant d\'exception à l\'acide hyaluronique pur',
    price: '220,00 €',
    rawPrice: 220,
    description: 'Concentré haute performance aux cellules souches végétales et antioxydants rares. Effet tenseur immédiat et éclat jeunesse dès la première application.',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=85',
    tag: 'Coup de Cœur',
    rating: 5.0,
    reviewsCount: 289,
  },
  {
    id: 'emulsion-or-caviar',
    name: 'Émulsion Sublimatrice Caviar Botanique',
    category: 'Haute Cosmétique',
    type: 'Fluide hydratant d\'exception & éclat immédiat',
    price: '195,00 €',
    rawPrice: 195,
    description: 'Texture soyeuse ultra-légère infusée d\'extraits marins précieux et de caviar vert végétal pour un teint frais, unifié et éclatant.',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=85',
    tag: 'Iconique',
    rating: 4.9,
    reviewsCount: 174,
  },
  {
    id: 'concentre-yeux-lift',
    name: 'Concentré Yeux & Lèvres Lift Intense',
    category: 'Soins du Regard',
    type: 'Soin regard haute précision anti-cernes & anti-poches',
    price: '155,00 €',
    rawPrice: 155,
    description: 'Formule ciblée regard défatiguant : lisse instantanément les ridules de la patte d\'oie, décongestionne les poches et illumine le regard.',
    image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=900&q=85',
    tag: 'Best-Seller Regard',
    rating: 4.8,
    reviewsCount: 210,
  },
  {
    id: 'masque-nuit-regenerant',
    name: 'Masque Baume de Nuit Régénérant',
    category: 'Haute Cosmétique',
    type: 'Masque nuit réparateur à l\'huile d\'argan précieuse',
    price: '165,00 €',
    rawPrice: 165,
    description: 'Soin cocon nocturne qui restaure la barrière lipidique pendant le sommeil. Au réveil, les traits sont lissés, reposés et intensément hydratés.',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=85',
    tag: 'Soin Cocon',
    rating: 4.9,
    reviewsCount: 156,
  },
  {
    id: 'huile-immortelle-sauvage',
    name: 'Huile Somptueuse d\'Immortelle Sauvage',
    category: 'Sérums & Élixirs',
    type: 'Huile précieuse 100% pure de première pression',
    price: '175,00 €',
    rawPrice: 175,
    description: 'Le secret de longévité corse : stimule la synthèse de collagène, redonne élasticité et fermeté à la peau avec un fini satiné non gras.',
    image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=85',
    tag: '100% Naturel',
    rating: 5.0,
    reviewsCount: 198,
  },
  {
    id: 'coffret-prestige-supreme',
    name: 'Grand Coffret Rituel Prestige Anti-Âge',
    category: 'Coffrets Prestige',
    type: 'Crème Suprême + Sérum Élixir + Gua Sha en Quartz Rose',
    price: '340,00 €',
    rawPrice: 340,
    description: 'Le rituel de beauté complet dans un coffret d\'artisan doreur. Comprend le duo iconique et l\'outil de massage drainant en quartz naturel véritable.',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=85',
    tag: 'Prestige Absolu',
    rating: 5.0,
    reviewsCount: 182,
  },
  {
    id: 'extrait-parfum-grasse',
    name: 'Extrait de Parfum Absolu de Grasse 50ml',
    category: 'Bougies & Parfums',
    type: 'Haute Parfumerie · Jasmin, Néroli & Santal',
    price: '210,00 €',
    rawPrice: 210,
    description: 'Une concentration de 30% d\'essences pures récoltées à la main à Grasse. Sillage inoubliable, enveloppant et raffiné.',
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=85',
    tag: 'Haute Parfumerie',
    rating: 4.9,
    reviewsCount: 115,
  },
  {
    id: 'idole-now-lancome',
    name: 'Idôle Now — Eau de Parfum 100ml',
    category: 'Bougies & Parfums',
    type: 'Eau de Parfum Intense · Floral & Solaire',
    price: '100,00 €',
    rawPrice: 100,
    description: 'Un bouquet floral solaire et vibrant qui célèbre la liberté féminine. Notes de tête : pêche dorée & bergamote ensoleillée. Cœur : rose & jasmin fraîchement cueillis. Fond : musc blanc & santal doux. Un sillage lumineux, enveloppant et inoubliable.',
    image: '/idole-now.webp',
    tag: 'Nouveau · 100€',
    rating: 4.9,
    reviewsCount: 87,
  },
  {
    id: 'barenia-pleine-fleur-hermes',
    name: 'Barénia Pleine Fleur Eau de parfum 100 ml',
    category: 'Bougies & Parfums',
    type: 'Eau de Parfum · Floral & Sensuel',
    price: '155,00 €',
    rawPrice: 155,
    description: 'Con Barénia Pleine Fleur, Christine Nagel, perfumista de la Maison, reinventa el chipre emblemático de Hermès y firma un eau de parfum floral y sensual, como la caricia de un pétalo. La huella de una mujer radiante y plena. El nombre de la fragancia rinde homenaje al tacto de la flor y, al mismo tiempo, al de los cueros plena flor patrimoniales de la Maison, y su sello de excelencia.',
    image: '/barenia-pleine-fleur-2.webp',
    images: [
      '/barenia-pleine-fleur-2.webp',
      '/barenia-pleine-fleur-1.webp',
      '/barenia-pleine-fleur-3.webp',
      '/barenia-pleine-fleur-4.webp',
    ],
    media: [
      { url: '/barenia-pleine-fleur-2.webp', type: 'image' },
      { url: '/barenia-pleine-fleur-1.webp', type: 'image' },
      { url: '/barenia-pleine-fleur-3.webp', type: 'image' },
      { url: '/barenia-pleine-fleur-4.webp', type: 'image' },
    ],
    tag: 'Nouveauté · 155€',
    rating: 5.0,
    reviewsCount: 42,
  },
]


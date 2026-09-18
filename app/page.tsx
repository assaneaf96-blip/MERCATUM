'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CheckoutModal from '@/components/CheckoutModal'
import ProductMediaCarousel from '@/components/ProductMediaCarousel'
import { PRODUCTS, CATEGORIES, Product, stripImagesFromDescription } from '@/lib/products'
import {
  getProducts,
  getNouveautes,
  saveNouveautes,
  getSiteSettings,
  saveProductsBulk,
  DEFAULT_SETTINGS,
  type SiteSettings,
  type NewItem,
} from '@/lib/store'
import {
  fetchProductsFromDb,
  fetchNouveautesFromDb,
  fetchSettingsFromDb,
  subscribeToProductsChanges,
} from '@/lib/supabaseService'

interface CategoryDetails {
  eyebrow: string
  title: string
  subtitle: string
  badge: string
  description: string
  arguments: { icon: string; title: string; desc: string }[]
}

const CATEGORY_ARGUMENTS: Record<string, CategoryDetails> = {
  'Belleza & cabello': {
    eyebrow: 'Haute Technologie Capillaire & Coiffure d\'Exception',
    title: 'Beauté, Coiffage & Rituels Capillaires d\'Élite',
    subtitle: "L'art du coiffage professionnel et du soin thermique d'avant-garde.",
    badge: 'Technologie Thermo-Protectrice & Brillance Ultime',
    description: 'Des stylers intelligents ghd aux boucleurs et sèche-cheveux multifonctions Shark FlexStyle : sculptez, lissez et sublimez votre chevelure sans compromettre la santé de la fibre capillaire.',
    arguments: [
      { icon: '✨', title: 'Technologie HD Motion-Responsive', desc: 'Température constante optimale pour une brillance miroir et zéro dommage thermique.' },
      { icon: '💨', title: 'Séchage & Coiffage Ultra-Rapide', desc: 'Flux d\'air ionique puissant et embouts de précision pour tous types de cheveux.' },
      { icon: '👑', title: 'Finition Salons de Prestige', desc: 'Des outils d\'excellence plébiscités par les plus grands stylistes et professionnels.' },
    ],
  },
  'Mobilier & Décoration': {
    eyebrow: 'Le Sanctuaire du Foyer · Design & Confort',
    title: 'Mobilier de Créateur & Pièces de Vie',
    subtitle: "L'art d'aménager un intérieur raffiné et des terrasses au confort souverain.",
    badge: "Design d'Architecte & Matières Durables",
    description: "Chaque pièce est pensée comme un équilibre parfait entre pureté géométrique, ergonomie bienfaisante et résistance éprouvée. Du sofa de jardin au mobilier de salon, habitez votre quotidien avec grandeur.",
    arguments: [
      { icon: '🛋️', title: 'Confort Souverain & Assise Haute Densité', desc: 'Coussins généreux et ergonomie étudiée pour une relaxation absolue.' },
      { icon: '🛡️', title: 'Matériaux Nobles & Traitement Anti-Intempéries', desc: 'Structures renforcées, tissus déperlants et finitions durables.' },
      { icon: '✨', title: 'Design Intemporel & Harmonieux', desc: 'Des lignes pures qui subliment naturellement vos espaces de vie.' },
    ],
  },
  'Plein Air & Évasion': {
    eyebrow: 'Sanctuaire Extérieur · Vivre Sous le Ciel',
    title: "Glamping d'Exception, Pergolas & Abris Extérieurs",
    subtitle: 'Prolongez le confort de votre intérieur au cœur du jardin et de la nature.',
    badge: 'Confort 4 Saisons & Protection Totale',
    description: 'Tentes cloches safari, tonnelles de jardin étanches et auvents rétractables : nos solutions de plein air vous protègent des éléments tout en créant un cadre spectaculaire pour vos réceptions et votre détente.',
    arguments: [
      { icon: '⛺', title: 'Toiles Respirantes & Imperméables 100%', desc: 'Étanchéité renforcée et coutures scellées conçues pour affronter les saisons.' },
      { icon: '☀️', title: 'Isolation Thermique & Protection UV50+', desc: 'Ombrage optimal et fraîcheur préservée même sous forte exposition solaire.' },
      { icon: '🛠️', title: 'Structures Renforcées & Stabilité Totale', desc: 'Armatures en acier traité contre la corrosion et ancrages sécurisés.' },
    ],
  },
  'Haute Cosmétique & Visage': {
    eyebrow: 'Biotechnologie Botanique & Haute Régénération',
    title: 'Haute Cosmétique & Soins Rajeunissants',
    subtitle: 'La puissance des actifs purs les plus rares pour illuminer et raffermir la peau.',
    badge: 'Efficacité Clinique & Actifs Précieux',
    description: 'Caviar marin, cellules souches végétales, or et peptides biomimétiques : nos formulations concentrées agissent en profondeur pour stimuler le renouvellement cellulaire et lifter visiblement les contours du visage.',
    arguments: [
      { icon: '🔬', title: 'Résultats Visibles Dès 14 Jours', desc: 'Action ciblée sur la fermeté, la réduction des rides et le grain de peau.' },
      { icon: '💧', title: 'Pénétration Immédiate Sans Effet Gras', desc: 'Textures soyeuses hautement sensorielles qui gorgent la peau d\'hydratation.' },
      { icon: '💎', title: 'Formulations de Haut Prestige', desc: 'Des créations plébiscitées par les adeptes de soins les plus exigeants.' },
    ],
  },
  'Parfums d\'Exception': {
    eyebrow: 'Haute Parfumerie & Extraits Rares',
    title: 'Sillages Inoubliables & Nectars Précieux',
    subtitle: 'Affirmez votre présence avec des extraits et eaux de parfum d\'art.',
    badge: 'Concentration Pure & Sillage 24h',
    description: 'Élaborés à partir des matières premières les plus nobles de Grasse et d\'Orient — bois de oud, vanille noire, rose de mai et ambre précieux — nos parfums enveloppent la peau d\'une aura magnétique et sophistiquée.',
    arguments: [
      { icon: '🌸', title: 'Concentrations Hors Normes & Richesse', desc: 'Haute teneur en essences pures pour une diffusion subtile et constante.' },
      { icon: '⏳', title: 'Tenue Exceptionnelle Tout au Long du Jour', desc: 'Des notes de fond tenaces qui restent délicatement empreintes sur la peau.' },
      { icon: '👑', title: 'Flacons Sculptures & Écrins d\'Art', desc: 'Des objets précieux pensés pour sublimer votre espace et votre coiffeuse.' },
    ],
  },
  'Soins & Rituels du Corps': {
    eyebrow: 'Bien-Être Holistique & Vitalité',
    title: 'Rituels Corporels & Spa Technologique',
    subtitle: 'Prenez soin de votre corps comme du premier sanctuaire qui vous abrite.',
    badge: 'Technologies Électro-Beauté & Botanique',
    description: 'Entre photothérapie LED photo-stimulante, boosters de collagène et huiles somptueuses d\'immortelle sauvage, offrez à votre corps l\'attention complète qu\'il mérite pour dénouer les tensions et régénérer les tissus.',
    arguments: [
      { icon: '💡', title: 'Technologies Électro-Beauté de Pointe', desc: 'Micro-courants et luminothérapie pour tonifier et raffermir la peau.' },
      { icon: '🌿', title: 'Huiles Végétales Nobles & Nourrissantes', desc: 'Nutrition profonde, toucher soyeux et parfum délicatement apaisant.' },
      { icon: '🧘', title: 'Récupération & Détente Profonde', desc: 'Un véritable rituel quotidien pour retrouver énergie et sérénité.' },
    ],
  },
  'Maison & Atmosphère': {
    eyebrow: 'Art de Vivre & Sanctuaire Intérieur',
    title: 'Ambiance, Décoration & Douceur du Foyer',
    subtitle: 'Créer une atmosphère enveloppante, chaleureuse et raffinée chez soi.',
    badge: 'Atmosphère Sereine & Matières Naturelles',
    description: 'Parfums d\'ambiance, bougies signatures et objets choisis pour instaurer une paix intérieure et transformer chaque pièce de votre maison en havre de sérénité.',
    arguments: [
      { icon: '🕯️', title: 'Diffusion Harmonieuse & Équilibrée', desc: 'Senteurs subtiles créées pour éveiller les sens sans saturer l\'espace.' },
      { icon: '🏡', title: 'Harmonie Visuelle & Sensorielle', desc: 'Des pièces décoratives qui apportent chaleur, lumière et équilibre.' },
      { icon: '🍃', title: 'Bien-Être au Quotidien', desc: 'Un sanctuaire paisible pour se ressourcer pleinement après chaque journée.' },
    ],
  },
  'Juego de interior': {
    eyebrow: 'Loisirs & Convivialité d\'Exception · Art du Jeu',
    title: 'Billards Convertibles & Tables de Réception',
    subtitle: 'La double vie d\'un meuble prestigieux : table à manger d\'architecte et billard d\'élite.',
    badge: 'Design 2-en-1 & Finitions Haute Précision',
    description: 'Transformez en un instant votre espace de réception : nos tables de billard convertibles allient l\'élégance contemporaine d\'une table de repas conviviale aux sensations et à la précision d\'un véritable billard de compétition.',
    arguments: [
      { icon: '🎱', title: 'Transformation Instantanée 2-en-1', desc: 'Plateaux amovibles légers pour passer du dîner gastronomique à la partie de jeu en quelques secondes.' },
      { icon: '🪵', title: 'Structure Robuste & Matières Nobles', desc: 'Châssis haute stabilité, bois sélectionné et drap haute précision pour un roulement parfait.' },
      { icon: '🍷', title: 'Convivialité & Réceptions d\'Élite', desc: 'Accueillez confortablement vos convives autour d\'une table au design spectaculaire.' },
    ],
  },
  'Mueble de baño': {
    eyebrow: 'Sanctuaire d\'Eau & Bien-Être · Espace Bain',
    title: 'Mobilier de Salle de Bain & Colonnes Design',
    subtitle: 'L\'alliance du design contemporain et du rangement fonctionnel pour sublimer votre salle d\'eau.',
    badge: 'Résistance à l\'Humidité & Finitions Soignées',
    description: 'Meubles sous vasque suspendus, armoires murales et colonnes de rangement haut de gamme en finitions chêne doré, cachemire et laque soignée, conçus pour allier esthétique épurée et durabilité au quotidien.',
    arguments: [
      { icon: '🚿', title: 'Matériaux Hydrofuges Haute Durabilité', desc: 'Surfaces et revêtements traités contre l\'humidité, les vapeurs et les éclaboussures.' },
      { icon: '🪞', title: 'Ergonomie & Rangement Optimisé', desc: 'Tiroirs à fermeture amortie Soft-Close et compartiments spacieux pour un quotidien serein.' },
      { icon: '✨', title: 'Design Architectural Contemporain', desc: 'Lignes épurées et finitions texturées qui transforment votre salle de bain en véritable suite d\'hôtel.' },
    ],
  },
}

function CategorySliderSection({
  category,
  details,
  products,
  onAddToCart,
}: {
  category: string
  details?: CategoryDetails
  products: Product[]
  onAddToCart: (product: Product) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (trackRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350
      trackRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const defaultDetails: CategoryDetails = {
    eyebrow: `Collection Signature · ${category}`,
    title: category,
    subtitle: "Une sélection d'exception conçue pour sublimer votre quotidien.",
    badge: 'Art de Vivre & Qualité Supérieure',
    description: "Découvrez des créations sélectionnées avec une exigence absolue pour leur durabilité, leur beauté et leur confort d'usage.",
    arguments: [
      { icon: '✦', title: "Matières & Finitions d'Artisan", desc: 'Une sélection sans compromis pour une élégance durable.' },
      { icon: '🌿', title: 'Confort & Bien-Être au Quotidien', desc: 'Pensé pour enrichir chaque instant passé chez vous.' },
      { icon: '📦', title: 'Expédition Soignée & Sécurisée', desc: 'Livraison suivie avec remise contre signature.' },
    ],
  }

  const d = details || defaultDetails
  const categoryAnchor = 'cat-' + category.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  return (
    <section id={categoryAnchor} className="category-showcase-block">
      <div className="category-showcase-container">
        {/* En-tête & Argumentaire de la catégorie */}
        <div className="category-top-header">
          <div className="category-info-col">
            <div className="category-badge-pill">
              <span>✦</span> {d.badge}
            </div>
            <p className="eyebrow" style={{ marginBottom: '8px' }}>{d.eyebrow}</p>
            <h2 className="category-main-title">{d.title}</h2>
            <p className="category-subtitle-lead">{d.subtitle}</p>
            <p className="category-description-text">{d.description}</p>
          </div>

          <div className="category-header-actions">
            <Link
              href={`/boutique?cat=${encodeURIComponent(category)}`}
              className="category-explore-btn"
            >
              Voir tout l&apos;univers ({products.length} articles) <span>→</span>
            </Link>
            <div className="category-slider-nav-arrows" aria-label="Défilement des produits">
              <button
                type="button"
                className="category-nav-arrow"
                onClick={() => scroll('left')}
                title="Produits précédents"
                aria-label="Produits précédents"
              >
                ←
              </button>
              <button
                type="button"
                className="category-nav-arrow"
                onClick={() => scroll('right')}
                title="Produits suivants"
                aria-label="Produits suivants"
              >
                →
              </button>
            </div>
          </div>
        </div>

        {/* Grille des 3 arguments clés de la catégorie */}
        <div className="category-arguments-grid">
          {d.arguments.map((arg, idx) => (
            <div key={idx} className="category-arg-card">
              <span className="category-arg-icon">{arg.icon}</span>
              <div className="category-arg-content">
                <h4>{arg.title}</h4>
                <p>{arg.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Rail de défilement horizontal avec tous les produits */}
        <div className="category-slider-wrapper">
          <div ref={trackRef} className="category-products-track">
            {products.map((product) => (
              <article className="category-product-card" key={product.id}>
                <div>
                  <Link href={`/produit/${product.id}`} className="block" style={{ cursor: 'pointer' }}>
                    <div className="category-card-media">
                      <ProductMediaCarousel
                        media={product.media}
                        images={product.images}
                        fallbackImage={product.image}
                        alt={product.name}
                        aspectRatio="4 / 3"
                        showBadge={product.tag}
                      />
                    </div>
                  </Link>
                  <div className="category-card-info">
                    <span className="category-card-type-tag">{product.category}</span>
                    <h3 className="category-card-title">
                      <Link href={`/produit/${product.id}`}>
                        {product.name}
                      </Link>
                    </h3>
                    <p className="category-card-type-detail">{stripImagesFromDescription(product.type || product.description)}</p>
                  </div>
                </div>

                <div style={{ padding: '0 16px 16px' }}>
                  <div className="category-card-price-row">
                    <span className="category-card-price">{product.price}</span>
                    <span className="category-card-rating">★ {product.rating || 5.0} ({product.reviewsCount || 12})</span>
                  </div>
                  <div className="category-card-actions">
                    <Link
                      href={`/produit/${product.id}`}
                      className="category-card-buy-btn"
                    >
                      Acheter ⚡
                    </Link>
                    <button
                      type="button"
                      className="category-card-cart-btn"
                      onClick={() => onAddToCart(product)}
                    >
                      Panier +
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  const [productsList, setProductsList] = useState<Product[]>(PRODUCTS)
  const [nouveautesList, setNouveautesList] = useState<NewItem[]>([
    { productId: 'idole-now-lancome', customLabel: 'Parfumerie · Nouveau' },
    { productId: 'creme-supreme-anti-age', customLabel: 'Soins Anti-Âge · N°1 des Ventes' },
  ])
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)

  const [cartCount, setCartCount] = useState(0)
  const [buyingProduct, setBuyingProduct] = useState<Product | null>(null)
  const [newsletter, setNewsletter] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    // 1. Chargement local immédiat (0 délai d'affichage)
    const localProducts = getProducts()
    setProductsList(localProducts)
    setNouveautesList(getNouveautes())
    setSettings(getSiteSettings())

    // 2. Fonction de chargement direct et immédiat depuis Supabase
    const loadProducts = () => {
      fetchProductsFromDb(true).then((dbProducts) => {
        if (dbProducts && dbProducts.length > 0) {
          saveProductsBulk(dbProducts)
          const merged = new Map<string, Product>()
          const defaultMap = new Map<string, Product>()
          PRODUCTS.forEach((p) => defaultMap.set(p.id, p))

          dbProducts.forEach((p) => {
            const def = defaultMap.get(p.id)
            if (def) {
              const defCount = (def.images?.length || 0) + (def.media?.length || 0)
              const pCount = (p.images?.length || 0) + (p.media?.length || 0)
              if (defCount > pCount) {
                merged.set(p.id, {
                  ...p,
                  image: def.image || p.image,
                  images: def.images && def.images.length > 0 ? def.images : p.images,
                  media: def.media && def.media.length > 0 ? def.media : p.media,
                })
                return
              }
            }
            merged.set(p.id, p)
          })

          // Intégrer également les créations locales en mémoire pour ne perdre aucun produit
          const localItems = getProducts()
          localItems.forEach((lp) => {
            if (lp && lp.id && !merged.has(lp.id)) {
              merged.set(lp.id, lp)
            }
          })

          setProductsList(Array.from(merged.values()))
        }
      }).catch(() => {})
    }

    loadProducts()

    // 3. Abonnement Supabase Realtime + Événements locaux : intègre instantanément tout produit ajouté/modifié
    const handleUpdate = () => {
      loadProducts()
    }
    const unsubscribe = subscribeToProductsChanges(handleUpdate)
    window.addEventListener('mercatum:products_updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)

    fetchNouveautesFromDb().then((dbNouv) => {
      if (dbNouv && dbNouv.length > 0) {
        setNouveautesList(dbNouv)
        saveNouveautes(dbNouv)
      }
    }).catch(() => {})

    fetchSettingsFromDb().then((dbSettings) => {
      if (dbSettings) setSettings(dbSettings)
    }).catch(() => {})

    return () => {
      unsubscribe()
      window.removeEventListener('mercatum:products_updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleAddToCart = (product: Product) => {
    setCartCount((c) => c + 1)
    showToast(`« ${product.name} » ajouté au panier !`)
  }

  const handleBuyNow = (product: Product) => {
    setBuyingProduct(product)
  }

  const handleCheckoutSuccess = (product: Product) => {
    setCartCount((c) => c + 1)
    showToast(`Commande validée pour ${product.name} ! 🎉`)
  }

  const featuredProducts = useMemo(() => {
    return productsList.slice(0, 3)
  }, [productsList])

  const noveltyItems = useMemo(() => {
    const items = nouveautesList
      .map((item) => {
        const prod = productsList.find((p) => p.id === item.productId)
        if (!prod) return null
        return {
          product: prod,
          customLabel: item.customLabel || prod.tag || prod.type || 'Nouveauté',
        }
      })
      .filter(Boolean) as { product: Product; customLabel: string }[]

    // Fallback si la liste est vide
    if (items.length === 0 && productsList.length > 0) {
      return productsList.slice(0, 2).map((p) => ({
        product: p,
        customLabel: p.tag || 'Nouveauté',
      }))
    }
    return items
  }, [nouveautesList, productsList])

  const allCategories = useMemo(() => {
    const all = [
      ...CATEGORIES,
      ...productsList.map((p) => p.category).filter(Boolean),
    ]
    const unique: string[] = []
    const seen = new Set<string>()
    for (const c of all) {
      const clean = c.trim()
      if (!clean) continue
      const lower = clean.toLowerCase()
      if (!seen.has(lower)) {
        seen.add(lower)
        unique.push(clean)
      }
    }
    return unique
  }, [productsList])

  const heroFirstProduct = productsList[0] || PRODUCTS[0]

  const productsByCategory = useMemo(() => {
    const DISPLAY_CATEGORIES = [
      'Belleza & cabello',
      'Mobilier & Décoration',
      'Mueble de baño',
      'Juego de interior',
      'Haute Cosmétique & Visage',
      "Parfums d'Exception",
      'Plein Air & Évasion',
      'Soins & Rituels du Corps',
      'Maison & Atmosphère',
    ]
    const groups: { category: string; products: Product[] }[] = []
    const seen = new Set<string>()

    for (const cat of DISPLAY_CATEGORIES) {
      const prods = productsList.filter(
        (p) => (p.category || '').trim().toLowerCase() === cat.trim().toLowerCase()
      )
      if (prods.length > 0) {
        groups.push({ category: cat, products: prods })
        seen.add(cat.trim().toLowerCase())
      }
    }

    const allCustomCats = Array.from(
      new Set(productsList.map((p) => p.category).filter(Boolean))
    )
    for (const cat of allCustomCats) {
      if (!seen.has(cat.trim().toLowerCase())) {
        const prods = productsList.filter(
          (p) => (p.category || '').trim().toLowerCase() === cat.trim().toLowerCase()
        )
        if (prods.length > 0) {
          groups.push({ category: cat, products: prods })
          seen.add(cat.trim().toLowerCase())
        }
      }
    }

    return groups
  }, [productsList])

  const [heroSlideIndex, setHeroSlideIndex] = useState(0)
  const [isHeroPaused, setIsHeroPaused] = useState(false)
  const touchStartXRef = useRef<number | null>(null)

  const heroCategorySlides = useMemo(() => {
    return productsByCategory.map((group) => {
      const withImage = group.products.filter(
        (p) => (p.image && p.image.trim()) || (p.images && p.images.length > 0)
      )
      const featured = withImage[0] || group.products[0]
      const img = featured?.image || featured?.images?.[0] || '/maison-lune-hero.png'
      return {
        category: group.category,
        count: group.products.length,
        featuredProduct: featured,
        image: img,
      }
    })
  }, [productsByCategory])

  useEffect(() => {
    if (heroCategorySlides.length <= 1 || isHeroPaused) return
    const timer = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % heroCategorySlides.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [heroCategorySlides.length, isHeroPaused])

  const currentHeroSlide = heroCategorySlides.length > 0
    ? heroCategorySlides[heroSlideIndex % heroCategorySlides.length]
    : null

  const handlePrevHeroCategory = () => {
    if (heroCategorySlides.length === 0) return
    setHeroSlideIndex((prev) => (prev - 1 + heroCategorySlides.length) % heroCategorySlides.length)
  }

  const handleNextHeroCategory = () => {
    if (heroCategorySlides.length === 0) return
    setHeroSlideIndex((prev) => (prev + 1) % heroCategorySlides.length)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX
    setIsHeroPaused(true)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current !== null) {
      const diff = e.changedTouches[0].clientX - touchStartXRef.current
      if (diff > 45) {
        handlePrevHeroCategory()
      } else if (diff < -45) {
        handleNextHeroCategory()
      }
      touchStartXRef.current = null
    }
    setIsHeroPaused(false)
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Toast */}
      {toast && (
        <div className="toast-notification">
          <span>✓</span> {toast}
        </div>
      )}

      {/* Shared Navbar */}
      <Navbar
        cartCount={cartCount}
        onOpenCart={() => showToast(`Votre panier contient ${cartCount} article(s)`)}
      />

      {/* Hero Section - Entête immersif avec défilé de chaque catégorie et photos de leurs produits */}
      <section
        id="top"
        className="hero hero-unified-header"
        onMouseEnter={() => setIsHeroPaused(true)}
        onMouseLeave={() => setIsHeroPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Diaporama d'arrière-plan de l'entête : photos des produits de chaque catégorie */}
        <div className="hero-header-bg-slider" aria-hidden="true">
          {heroCategorySlides.map((slide, idx) => {
            const isActive = idx === (heroSlideIndex % (heroCategorySlides.length || 1))
            return (
              <div
                key={slide.category}
                className={`hero-header-bg-slide ${isActive ? 'is-active' : ''}`}
              >
                <img
                  src={slide.image}
                  alt={slide.category}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
                <div className="hero-header-bg-overlay" />
              </div>
            )
          })}
        </div>

        {/* Contenu principal de l'entête : Texte & Carte Produit de la catégorie */}
        <div className="hero-header-main-content">
          <div className="hero-copy">
            <div className="hero-header-badge-pill">
              <span className="hero-header-badge-sparkle">✦</span>
              <span>
                Catégorie en vedette : <strong>{currentHeroSlide?.category}</strong> ({currentHeroSlide?.count} créations)
              </span>
            </div>
            <p className="eyebrow">Art de Vivre · Sanctuaire du Foyer &amp; Soin de Soi</p>
            <h1>Le Luxe d&apos;habiter<br /><em>son quotidien.</em></h1>
            <p className="hero-text">
              {settings.heroSubtitle || "Un espace raffiné où vivre en harmonie. Des pièces de mobilier et des rituels de soin d'exception conçus pour sublimer votre intérieur et prendre soin de votre corps chaque jour."}
            </p>
            <div className="hero-cta-group">
              <Link href="/boutique" className="button dark">
                Explorer les collections <span>→</span>
              </Link>
              {heroFirstProduct && (
                <button
                  className="button outline"
                  onClick={() => handleBuyNow(heroFirstProduct)}
                >
                  Commander {heroFirstProduct.name.split(' ')[0]} ({heroFirstProduct.price}) ⚡
                </button>
              )}
            </div>
          </div>

          {/* Carte visuelle du produit normal de la catégorie en cours */}
          {currentHeroSlide && (
            <div className="hero-header-featured-card">
              <div className="hero-header-card-media">
                <img
                  src={currentHeroSlide.image}
                  alt={`${currentHeroSlide.category} - ${currentHeroSlide.featuredProduct?.name || 'MERCATUM'}`}
                />
                <span className="hero-header-card-cat-tag">
                  ✦ {currentHeroSlide.category}
                </span>
                <span className="hero-header-card-counter">
                  {String((heroSlideIndex % heroCategorySlides.length) + 1).padStart(2, '0')} / {String(heroCategorySlides.length).padStart(2, '0')}
                </span>
              </div>
              <div className="hero-header-card-body">
                {currentHeroSlide.featuredProduct && (
                  <>
                    <h3 className="hero-header-card-title">
                      {currentHeroSlide.featuredProduct.name}
                    </h3>
                    <div className="hero-header-card-row">
                      <span className="hero-header-card-price">
                        {currentHeroSlide.featuredProduct.price}
                      </span>
                      <Link
                        href={`/boutique?cat=${encodeURIComponent(currentHeroSlide.category)}`}
                        className="hero-header-card-btn"
                      >
                        Voir la collection <span>→</span>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rail de défilement horizontal de TOUTES les catégories avec leurs photos normales */}
        <div className="hero-header-categories-rail">
          <div className="hero-header-rail-top">
            <span className="hero-header-rail-label">
              ✦ Défilé des univers &amp; créations MERCATUM
            </span>
            <div className="hero-header-rail-arrows">
              <button
                type="button"
                onClick={handlePrevHeroCategory}
                className="hero-header-arrow-btn"
                aria-label="Catégorie précédente"
                title="Catégorie précédente"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={handleNextHeroCategory}
                className="hero-header-arrow-btn"
                aria-label="Catégorie suivante"
                title="Catégorie suivante"
              >
                ›
              </button>
            </div>
          </div>
          <div className="hero-header-rail-track">
            {heroCategorySlides.map((slide, idx) => {
              const isActive = idx === (heroSlideIndex % heroCategorySlides.length)
              return (
                <button
                  key={slide.category}
                  type="button"
                  onClick={() => setHeroSlideIndex(idx)}
                  className={`hero-header-category-item ${isActive ? 'is-active' : ''}`}
                  title={`Basculer vers la catégorie ${slide.category}`}
                >
                  <div className="hero-header-item-thumb">
                    <img src={slide.image} alt={slide.category} loading="lazy" />
                  </div>
                  <div className="hero-header-item-text">
                    <span className="hero-header-item-name">{slide.category}</span>
                    <span className="hero-header-item-count">{slide.count} pièces</span>
                  </div>
                  {isActive && <span className="hero-header-active-dot" />}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* 3 Pillars / Values Section */}
      <section className="values-section">
        <div className="values-grid">
          <div className="value-card">
            <span className="value-icon">🏡</span>
            <h3>Le Sanctuaire du Foyer</h3>
            <p>Du mobilier de créateur aux pièces d&apos;évasion extérieure, façonner un cadre de vie d&apos;un confort et d&apos;une beauté remarquables.</p>
          </div>
          <div className="value-card">
            <span className="value-icon">🌿</span>
            <h3>L&apos;Entretien du Corps &amp; de la Peau</h3>
            <p>Des soins d&apos;exception et rituels sensoriels quotidiens pour revitaliser la peau, apaiser l&apos;esprit et se sentir bien chez soi.</p>
          </div>
          <div className="value-card">
            <span className="value-icon">✦</span>
            <h3>Excellence &amp; Matières Nobles</h3>
            <p>Design intemporel, actifs purs et confection soignée pour des créations durables pensées pour vous accompagner.</p>
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className="manifesto">
        <p className="eyebrow">{settings.siteName || 'MERCATUM'} · L&apos;Équilibre Parfait</p>
        <h2>L&apos;harmonie entre<br /><em>votre espace et vous-même.</em></h2>
        <p>
          Votre maison est votre refuge, et votre corps est votre premier temple. Chez MERCATUM, nous réconcilions le plaisir d&apos;un aménagement raffiné et l&apos;exigence de rituels de soin quotidiens pour célébrer l&apos;art de vivre dans toute sa plénitude.
        </p>
        <Link className="text-link" href="/boutique">Explorer tous nos univers <span>↗</span></Link>
      </section>

      {/* Grand Showcase par Catégorie avec Défilement Horizontal & Arguments */}
      <section id="boutique-preview" style={{ paddingTop: '30px' }}>
        <div style={{ padding: '40px 4vw 20px', maxWidth: '1380px', margin: '0 auto', textAlign: 'center' }}>
          <p className="eyebrow" style={{ marginBottom: '12px' }}>
            L&apos;Art de Vivre · Nos Univers d&apos;Exception
          </p>
          <h2 style={{ fontSize: 'clamp(32px, 4.5vw, 54px)', margin: '0 0 16px', lineHeight: 1.05 }}>
            Tous nos Univers par Catégorie
          </h2>
          <p style={{ maxWidth: '680px', margin: '0 auto 28px', color: '#5f625c', fontSize: '15px', lineHeight: '1.65' }}>
            Mobilier de créateur, haute cosmétique, parfums d&apos;exception et aménagements de plein air. Faites défiler chaque univers ci-dessous pour découvrir nos pièces maîtresses et leurs arguments d&apos;excellence.
          </p>

          {/* Navigation rapide par ancres */}
          <div className="homepage-category-bar" style={{ justifyContent: 'center', marginBottom: '16px' }}>
            {productsByCategory.map(({ category, products }) => {
              const anchor = 'cat-' + category.toLowerCase().replace(/[^a-z0-9]+/g, '-')
              return (
                <a
                  key={category}
                  href={`#${anchor}`}
                  className="homepage-cat-btn"
                >
                  {category} ({products.length})
                </a>
              )
            })}
            <Link
              href="/boutique"
              className="homepage-cat-btn"
              style={{ background: 'var(--foreground)', color: 'var(--background)', borderColor: 'var(--foreground)' }}
            >
              Toute la boutique ({productsList.length}) ↗
            </Link>
          </div>
        </div>

        {/* Défilé complet de chaque catégorie avec ses arguments */}
        {productsByCategory.map(({ category, products }) => (
          <CategorySliderSection
            key={category}
            category={category}
            details={CATEGORY_ARGUMENTS[category]}
            products={products}
            onAddToCart={handleAddToCart}
          />
        ))}

        <div className="view-all-wrapper" style={{ padding: '60px 20px 20px', textAlign: 'center' }}>
          <Link href="/boutique" className="button dark" style={{ padding: '16px 36px' }}>
            Accéder à l&apos;ensemble de la boutique ({productsList.length} articles) <span>→</span>
          </Link>
        </div>
      </section>

      {/* Atelier / Story Section */}
      <section id="histoire" className="story">
        <div className="story-image">
          <img src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1100&q=85" alt="Intérieur raffiné et art de vivre" />
        </div>
        <div className="story-copy">
          <p className="eyebrow">Philosophie &amp; Art de Vivre</p>
          <h2>Deux univers indissociables,<br /><em>une même quête d&apos;harmonie.</em></h2>
          <p>
            Prendre soin de son cadre de vie et prendre soin de soi relèvent d&apos;une même attention. Du mobilier de caractère pensé pour durer aux rituels corporels créés pour ressourcer la peau au quotidien, chaque pièce est choisie avec passion pour sublimer chaque instant de votre quotidien.
          </p>
          <Link className="button outline" href="/boutique">
            Découvrir l&apos;ensemble de nos collections <span>↗</span>
          </Link>
        </div>
      </section>

      {/* Customer Reviews Section */}
      <section className="testimonials-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Avis vérifiés de nos clients</p>
            <h2>L&apos;expérience MERCATUM</h2>
          </div>
        </div>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="stars">★★★★★</div>
            <p>« Le canapé de jardin et les modules d&apos;extérieur ont complètement métamorphosé notre terrasse. Finitions remarquables et confort exceptionnel. »</p>
            <strong>— Alexandre &amp; Éléonore V., Paris</strong>
          </div>
          <div className="testimonial-card">
            <div className="stars">★★★★★</div>
            <p>« Les soins Skin Caviar et les rituels visage sont d&apos;une efficacité spectaculaire. Une texture divine qui revitalise immédiatement la peau. »</p>
            <strong>— Catherine B., Genève</strong>
          </div>
          <div className="testimonial-card">
            <div className="stars">★★★★★</div>
            <p>« Les parfums d&apos;exception et les pièces d&apos;art de vivre apportent une signature unique à notre intérieur. Un service de livraison parfait. »</p>
            <strong>— Julien M., Monaco</strong>
          </div>
        </div>
      </section>

      {/* Nouveautés Section (Gérée dynamiquement par l'Admin) */}
      <section id="nouveautes" className="journal">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Dernières arrivées</p>
            <h2>Nouveautés</h2>
          </div>
          <Link className="text-link" href="/boutique">Toutes les nouveautés <span>↗</span></Link>
        </div>
        <div className="journal-grid">
          {noveltyItems.map(({ product, customLabel }) => (
            <article key={product.id}>
              <Link href={`/produit/${product.id}`} className="block" style={{ cursor: 'pointer' }}>
                <ProductMediaCarousel
                  media={product.media}
                  images={product.images}
                  fallbackImage={product.image}
                  alt={product.name}
                  aspectRatio="16 / 11"
                  className="rounded-lg mb-3"
                />
              </Link>
              <p className="eyebrow">{customLabel}</p>
              <h3>
                <Link href={`/produit/${product.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {product.name}
                </Link>
              </h3>
              <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem' }}>
                {stripImagesFromDescription(product.type || product.description)} · {product.price}
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                <Link
                  href={`/produit/${product.id}`}
                  className="buy-now-card-btn"
                  style={{ textAlign: 'center', flex: 1, background: 'var(--foreground)', color: 'var(--background)' }}
                >
                  Acheter maintenant ⚡
                </Link>
                <button
                  type="button"
                  className="add-cart-outline-btn"
                  onClick={() => handleAddToCart(product)}
                  style={{ padding: '8px 14px' }}
                >
                  Panier +
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Contact Section (Dynamique via les paramètres Admin) */}
      <section className="newsletter" style={{ background: '#20251f', color: '#f4f0e9' }}>
        <p className="eyebrow" style={{ color: '#b8c8a6' }}>Nous contacter</p>
        <h2 style={{ color: '#f4f0e9' }}>{settings.siteName || 'MERCATUM'} Paris</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
            <span style={{ fontSize: '1.25rem' }}>📍</span>
            <span>{settings.contactAddress}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
            <span style={{ fontSize: '1.25rem' }}>📞</span>
            <a href={`tel:${settings.contactPhone.replace(/\s+/g, '')}`} style={{ color: '#b8c8a6', textDecoration: 'none' }}>
              {settings.contactPhone}
            </a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
            <span style={{ fontSize: '1.25rem' }}>✉️</span>
            <a href={`mailto:${settings.contactEmail}`} style={{ color: '#b8c8a6', textDecoration: 'none' }}>
              {settings.contactEmail}
            </a>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#888', textAlign: 'center' }}>
            {settings.contactHours}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="newsletter">
        <p className="eyebrow">Le Cercle Privilège {settings.siteName || 'MERCATUM'}</p>
        <h2>Recevez nos inspirations d&apos;art de vivre<br /><em>et invitations exclusives.</em></h2>
        <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}>
          <input
            type="email"
            required
            placeholder="Votre adresse email"
            value={newsletter}
            onChange={(e) => setNewsletter(e.target.value)}
          />
          <button type="submit">{submitted ? 'Bienvenue dans le Club' : "S'inscrire ↗"}</button>
        </form>
      </section>

      {/* Shared Footer */}
      <Footer />

      {/* Checkout Modal */}
      <CheckoutModal
        product={buyingProduct}
        onClose={() => setBuyingProduct(null)}
        onSuccess={handleCheckoutSuccess}
      />
    </main>
  )
}

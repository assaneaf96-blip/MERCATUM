'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CheckoutModal from '@/components/CheckoutModal'
import ProductMediaCarousel from '@/components/ProductMediaCarousel'
import { PRODUCTS, CATEGORIES, Product, stripImagesFromDescription, isVideoUrl } from '@/lib/products'
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
import { getClientCachedProducts } from '@/lib/clientCache'

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
    eyebrow: 'Alta Tecnología Capilar & Estilismo de Excepción',
    title: 'Belleza, Moldeado & Rituales Capilares de Élite',
    subtitle: "El arte del peinado profesional y del cuidado térmico de vanguardia.",
    badge: 'Tecnología Termoprotectora & Brillo Absoluto',
    description: 'Desde moldeadores inteligentes ghd hasta secadores multifunción Shark FlexStyle: esculpa, alise y sublime su cabello sin comprometer la salud de la fibra capilar.',
    arguments: [
      { icon: '✨', title: 'Tecnología HD Motion-Responsive', desc: 'Temperatura óptima constante para un brillo espejo y cero daño térmico.' },
      { icon: '💨', title: 'Secado & Moldeado Ultrarrápido', desc: 'Flujo de aire iónico potente y boquillas de precisión para todo tipo de cabello.' },
      { icon: '👑', title: 'Acabado de Salón de Prestigio', desc: 'Herramientas de excelencia elogiadas por los mejores estilistas profesionales.' },
    ],
  },
  'Mobilier & Décoration': {
    eyebrow: 'El Santuario del Hogar · Diseño & Confort',
    title: 'Mobiliario de Autor & Piezas de Vida',
    subtitle: "El arte de crear un interior refinado y terrazas de confort soberano.",
    badge: "Diseño de Arquitecto & Materiales Nobles",
    description: "Cada pieza está concebida como un equilibrio perfecto entre pureza geométrica, ergonomía reconfortante y resistencia duradera. Del sofá de exterior al mobiliario de salón, habite su espacio con distinción.",
    arguments: [
      { icon: '🛋️', title: 'Confort Soberano & Asiento Alta Densidad', desc: 'Cojines generosos y ergonomía estudiada para una relajación absoluta.' },
      { icon: '🛡️', title: 'Materiales Nobles & Tratamiento Intemperie', desc: 'Estructuras reforzadas, tejidos repelentes al agua y acabados duraderos.' },
      { icon: '✨', title: 'Diseño Intemporal & Armonioso', desc: 'Líneas puras que realzan con naturalidad sus espacios de vida.' },
    ],
  },
  'Plein Air & Évasion': {
    eyebrow: 'Santuario Exterior · Vivir Bajo el Cielo',
    title: "Glamping de Excepción, Pérgolas & Refugios Exteriores",
    subtitle: 'Extienda el confort de su interior en el corazón del jardín y la naturaleza.',
    badge: 'Confort 4 Estaciones & Protección Total',
    description: 'Carpas safari bell tent, pérgolas impermeables y toldos retráctiles: nuestras soluciones de exterior le protegen del clima mientras crean un marco espectacular para sus momentos de descanso.',
    arguments: [
      { icon: '⛺', title: 'Tejidos Transpirables & 100% Impermeables', desc: 'Estanqueidad reforzada y costuras selladas preparadas para todas las estaciones.' },
      { icon: '☀️', title: 'Aislamiento Térmico & Protección UV50+', desc: 'Sombra óptima y frescor preservado incluso bajo intensa exposición solar.' },
      { icon: '🛠️', title: 'Estructuras Reforzadas & Estabilidad Total', desc: 'Armaduras de acero con tratamiento anticorrosión y anclajes seguros.' },
    ],
  },
  'Haute Cosmétique & Visage': {
    eyebrow: 'Biotecnología Botánica & Alta Regeneración',
    title: 'Alta Cosmética & Cuidados Rejuvenecedores',
    subtitle: 'El poder de los activos puros más exclusivos para iluminar y reafirmar la piel.',
    badge: 'Eficacia Clínica & Activos Preciosos',
    description: 'Caviar marino, células madre vegetales, oro y péptidos biomiméticos: nuestras fórmulas concentradas actúan en profundidad para estimular la renovación celular y redefinir los contornos del rostro.',
    arguments: [
      { icon: '🔬', title: 'Resultados Visibles en 14 Días', desc: 'Acción enfocada en la firmeza, la atenuación de arrugas y la luminosidad de la piel.' },
      { icon: '💧', title: 'Absorción Inmediata Sin Efecto Graso', desc: 'Texturas sedosas y sensoriales que colman la piel de hidratación duradera.' },
      { icon: '💎', title: 'Formulaciones de Alto Prestigio', desc: 'Creaciones aclamadas por los adeptos a los tratamientos más exigentes.' },
    ],
  },
  'Parfums d\'Exception': {
    eyebrow: 'Alta Perfumería & Extractos Exclusivos',
    title: 'Estelas Inolvidables & Néctares Preciosos',
    subtitle: 'Afirme su presencia con extractos y aguas de perfume de autor.',
    badge: 'Concentración Pura & Fijación 24h',
    description: 'Elaborados a partir de las materias primas más selectas de Grasse y Oriente — madera de oud, vainilla negra, rosa de mayo y ámbar precioso — nuestros perfumes envuelven la piel en un aura sofisticada.',
    arguments: [
      { icon: '🌸', title: 'Concentraciones Extraordinarias', desc: 'Alta proporción de esencias puras para una difusión sutil y constante.' },
      { icon: '⏳', title: 'Fijación Excepcional Todo el Día', desc: 'Notas de fondo tenaces que permanecen delicadamente en la piel.' },
      { icon: '👑', title: 'Frascos Escultura & Estuches de Arte', desc: 'Piezas exclusivas pensadas para embellecer su tocador y su espacio.' },
    ],
  },
  'Soins & Rituels du Corps': {
    eyebrow: 'Bienestar Holístico & Vitalidad',
    title: 'Rituales Corporales & Spa Tecnológico',
    subtitle: 'Cuide su cuerpo como el primer santuario que habita.',
    badge: 'Tecnología Electro-Belleza & Botánica',
    description: 'Entre fototerapia LED, potenciadores de colágeno y aceites suntuosos, brinde a su cuerpo el cuidado integral que merece para disipar tensiones y revitalizar los tejidos.',
    arguments: [
      { icon: '💡', title: 'Tecnologías de Vanguardia', desc: 'Microcorrientes y luminoterapia para tonificar y reafirmar la piel.' },
      { icon: '🌿', title: 'Aceites Botánicos Nobles & Nutritivos', desc: 'Nutrición profunda, tacto aterciopelado y aroma relajante.' },
      { icon: '🧘', title: 'Recuperación & Bienestar Profundo', desc: 'Un verdadero ritual diario para recuperar energía y serenidad.' },
    ],
  },
  'Maison & Atmosphère': {
    eyebrow: 'Arte de Vivir & Santuario Interior',
    title: 'Ambiente, Decoración & Calidez del Hogar',
    subtitle: 'Cree una atmósfera envolvente, acogedora y refinada en su hogar.',
    badge: 'Atmósfera Serena & Materiales Naturales',
    description: 'Fragancias del hogar, velas aromáticas y objetos seleccionados para aportar paz interior y convertir cada rincón de su casa en un oasis de tranquilidad.',
    arguments: [
      { icon: '🕯️', title: 'Difusión Armoniosa & Equilibrada', desc: 'Aromas sutiles diseñados para despertar los sentidos sin saturar el espacio.' },
      { icon: '🏡', title: 'Armonía Visual & Sensorial', desc: 'Piezas decorativas que aportan calidez, luz y serenidad.' },
      { icon: '🍃', title: 'Bienestar Diario', desc: 'Un santuario pacífico donde renovar energías al final del día.' },
    ],
  },
  'Juego de interior': {
    eyebrow: 'Ocio & Convivencia de Excepción · Arte del Juego',
    title: 'Billares Convertibles & Mesas de Salón',
    subtitle: 'La doble vida de un mueble de prestigio: mesa de comedor de autor y billar de élite.',
    badge: 'Diseño 2 en 1 & Acabados de Alta Precisión',
    description: 'Transforme en un instante su salón: nuestras mesas de billar convertibles aúnan la elegancia contemporánea de una mesa de comedor con las sensaciones y la precisión de un billar de competición.',
    arguments: [
      { icon: '🎱', title: 'Transformación Instantánea 2 en 1', desc: 'Tableros ligeros desmontables para pasar de la cena al juego en segundos.' },
      { icon: '🪵', title: 'Estructura Robusta & Maderas Nobles', desc: 'Chasis de máxima estabilidad y paño de precisión para un rodaje perfecto.' },
      { icon: '🍷', title: 'Reuniones de Élite', desc: 'Reciba a sus invitados en torno a una mesa de diseño espectacular.' },
    ],
  },
  'Mueble de baño': {
    eyebrow: 'Santuario de Agua & Bienestar · Espacio Baño',
    title: 'Mobiliario de Baño & Columnas de Diseño',
    subtitle: 'La combinación de diseño contemporáneo y almacenaje funcional para su baño.',
    badge: 'Resistencia a la Humedad & Acabados Cuidados',
    description: 'Muebles bajo lavabo suspendidos, armarios y columnas de almacenaje de alta gama en acabados roble dorado, cachemira y lacados, diseñados para aunar estética y durabilidad.',
    arguments: [
      { icon: '🚿', title: 'Materiales Hidrófugos de Gran Durabilidad', desc: 'Superficies tratadas contra la humedad, vapores y salpicaduras.' },
      { icon: '🪞', title: 'Ergonomía & Almacenaje Óptimo', desc: 'Cajones con cierre amortiguado Soft-Close y compartimentos espaciosos.' },
      { icon: '✨', title: 'Diseño Arquitectónico Moderno', desc: 'Líneas depuradas que convierten su cuarto de baño en una suite de hotel.' },
    ],
  },
  'HORNOS': {
    eyebrow: 'Cocina de Alta Gama & Precisión Culinaria',
    title: 'Hornos Multifunción & Pirolíticos',
    subtitle: 'El rendimiento culinario profesional en el corazón de su cocina.',
    badge: 'Limpieza Pirolítica & Eficiencia A+',
    description: 'Hornos de última generación con cocción asistida, calor envolvente y autolimpieza pirolítica para sublimar cada una de sus recetas con la máxima sencillez.',
    arguments: [
      { icon: '🔥', title: 'Autolimpieza Pirolítica', desc: 'Eliminación total de grasas y residuos a más de 500 °C con solo pulsar un botón.' },
      { icon: '⏱️', title: 'Cocción Asistida & Homogénea', desc: 'Distribución térmica perfecta en varios niveles para resultados gourmet.' },
      { icon: '⚡', title: 'Eficiencia Energética Superior', desc: 'Aislamiento cuádruple cristal para un consumo reducido y seguridad total.' },
    ],
  },
  'HORNO DE PIZZA': {
    eyebrow: 'Gastronomía al Aire Libre & Tradición Italiana',
    title: 'Hornos de Pizza Profesionales & Portátiles',
    subtitle: 'Auténticas pizzas napolitanas cocinadas a la piedra en solo 60 segundos.',
    badge: 'Cocción a 500 °C en 60 Segundos',
    description: 'Diseñados para exteriores y jardines, nuestros hornos alcanzan los 500 °C para cocinar masas crujientes e ingredientes tiernos con el auténtico sabor tradicional.',
    arguments: [
      { icon: '🍕', title: 'Cocción Ultrarrápida en 60s', desc: 'Calor extremo concentrado sobre piedra refractaria de cordierita.' },
      { icon: '🔥', title: 'Combustión Óptima a Gas o Pellets', desc: 'Encendido rápido y control milimétrico de la temperatura de cocción.' },
      { icon: '✨', title: 'Diseño Portátil & Robusto', desc: 'Acero inoxidable premium resistente a la intemperie y fácil de transportar.' },
    ],
  },
  'Colchones': {
    eyebrow: 'Santuario del Descanso & Salud Vertebral',
    title: 'Colchones de Alta Gama & Descanso Reparador',
    subtitle: 'La combinación perfecta de soporte ortopédico y acogida envolvente.',
    badge: 'Espuma Viscoelástica & Muelle Ensacado',
    description: 'Materiales transpirables y tecnologías ergonómicas pensadas para aliviar los puntos de presión, alinear la columna y garantizar noches de sueño profundo y reparador.',
    arguments: [
      { icon: '🌙', title: 'Alivio de Puntos de Presión', desc: 'Adaptación anatómica que reduce tensiones musculares y articulares.' },
      { icon: '💨', title: 'Transpirabilidad & Termorregulación', desc: 'Fibras naturales y tejidos transpirables para un descanso fresco todo el año.' },
      { icon: '🛡️', title: 'Independencia de Lechos', desc: 'Absorción de movimientos para dormir plácidamente en pareja.' },
    ],
  },
  'Chimenea': {
    eyebrow: 'Calor Confortable & Elegancia del Fuego',
    title: 'Chimeneas de Interior & Fuego Acogedor',
    subtitle: 'El encanto del fuego combinado con la vanguardia tecnológica y seguridad.',
    badge: 'Alto Rendimiento & Confort Térmico',
    description: 'Cree una atmósfera cálida e inolvidable con chimeneas que aúnan potencia calorífica, diseño atemporal y un confort insuperable.',
    arguments: [
      { icon: '🔥', title: 'Calor Radiante & Envolvente', desc: 'Difusión térmica homogénea que calienta rápidamente amplias estancias.' },
      { icon: '🌿', title: 'Rendimiento Eficiente & Limpio', desc: 'Combustión optimizada para un menor consumo y respeto medioambiental.' },
      { icon: '✨', title: 'Diseño Focal Espectacular', desc: 'El auténtico corazón visual y acogedor del salón de su hogar.' },
    ],
  },
  'ESTUFA DE LEÑA': {
    eyebrow: 'Calefacción Sostenible & Auténtica',
    title: 'Estufas de Leña de Alto Rendimiento',
    subtitle: 'Calor ecológico, duradero y reconfortante con la belleza del fuego vivo.',
    badge: 'Hierro Fundido & Doble Combustión',
    description: 'Fabricadas en fundición de alta resistencia, nuestras estufas garantizan una doble combustión limpia, alto poder calorífico y un ahorro notable de energía.',
    arguments: [
      { icon: '🪵', title: 'Doble Combustión Limpia', desc: 'Máximo aprovechamiento de la leña con mínimas emisiones y cenizas.' },
      { icon: '🔥', title: 'Calor Prolongado & Inercia', desc: 'La fundición retiene y proyecta calor muchas horas tras apagar el fuego.' },
      { icon: '🏡', title: 'Estilo Rústico & Contemporáneo', desc: 'Aporta carácter y elegancia inconfundible a cualquier estancia.' },
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
    eyebrow: `Colección Signature · ${category}`,
    title: category,
    subtitle: "Una selección de excepción diseñada para sublimar su día a día.",
    badge: 'Arte de Vivir & Calidad Superior',
    description: "Descubra creaciones seleccionadas con una exigencia absoluta en durabilidad, belleza y confort de uso.",
    arguments: [
      { icon: '✦', title: "Materiales & Acabados de Artesano", desc: 'Una selección sin compromisos para una elegancia duradera.' },
      { icon: '🌿', title: 'Confort & Bienestar Diario', desc: 'Pensado para enriquecer cada momento en su hogar.' },
      { icon: '📦', title: 'Envío Cuidadoso & Seguro', desc: 'Entrega asegurada con seguimiento personalizado.' },
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
              Ver todo el universo ({products.length} artículos) <span>→</span>
            </Link>
            <div className="category-slider-nav-arrows" aria-label="Desplazamiento de productos">
              <button
                type="button"
                className="category-nav-arrow"
                onClick={() => scroll('left')}
                title="Productos anteriores"
                aria-label="Productos anteriores"
              >
                ←
              </button>
              <button
                type="button"
                className="category-nav-arrow"
                onClick={() => scroll('right')}
                title="Productos siguientes"
                aria-label="Productos siguientes"
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
            {products.slice(0, 8).map((product) => (
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
                      Comprar ⚡
                    </Link>
                    <button
                      type="button"
                      className="category-card-cart-btn"
                      onClick={() => onAddToCart(product)}
                    >
                      Cesta +
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {products.length > 8 && (
              <div
                className="category-product-card flex flex-col items-center justify-center text-center p-6 border-dashed"
                style={{
                  minWidth: '240px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.6)',
                  borderRadius: '16px',
                  border: '2px dashed #dcd5c9',
                  padding: '32px 20px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>✦</div>
                <h4 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
                  +{products.length - 8} artículos más
                </h4>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px', lineHeight: '1.4' }}>
                  Descubra la colección completa de {category}
                </p>
                <Link
                  href={`/boutique?cat=${encodeURIComponent(category)}`}
                  className="button dark"
                  style={{ fontSize: '13px', padding: '10px 20px', borderRadius: '9999px' }}
                >
                  Explorar todo →
                </Link>
              </div>
            )}
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

    // 1.1 Cache IndexedDB ultra-rapide (< 10ms) pour restaurer tous les produits instantanément
    getClientCachedProducts().then((cached) => {
      if (cached && cached.length > 0) {
        setProductsList(cached)
      }
    }).catch(() => {})

    // 2. Fonction de chargement direct et immédiat depuis le cache / Supabase
    const loadProducts = () => {
      fetchProductsFromDb(false).then((dbProducts) => {
        if (dbProducts && dbProducts.length > 0) {
          saveProductsBulk(dbProducts)
          const merged = new Map<string, Product>()
          const defaultMap = new Map<string, Product>()
          PRODUCTS.forEach((p) => defaultMap.set(p.id, p))

          dbProducts.forEach((p) => {
            const def = defaultMap.get(p.id)
            const chosenMain = (p.image || def?.image || '').trim()
            const rawImages = (p.images && p.images.length > 0)
              ? p.images
              : (def?.images && def.images.length > 0 ? def.images : (chosenMain ? [chosenMain] : []))
            const rawMedia = (p.media && p.media.length > 0)
              ? p.media
              : (def?.media && def.media.length > 0 ? def.media : rawImages.map((u) => ({ url: u, type: isVideoUrl(u) ? 'video' as const : 'image' as const })))

            const orderedImages = chosenMain
              ? [chosenMain, ...rawImages.filter((u) => u !== chosenMain)]
              : rawImages

            merged.set(p.id, {
              ...(def || {}),
              ...p,
              image: chosenMain,
              images: orderedImages,
              media: rawMedia,
            })
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
    showToast(`« ${product.name} » añadido a la cesta !`)
  }

  const handleBuyNow = (product: Product) => {
    setBuyingProduct(product)
  }

  const handleCheckoutSuccess = (product: Product) => {
    setCartCount((c) => c + 1)
    showToast(`¡Pedido confirmado para ${product.name}! 🎉`)
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
          customLabel: item.customLabel || prod.tag || prod.type || 'Novedad',
        }
      })
      .filter(Boolean) as { product: Product; customLabel: string }[]

    // Fallback si la liste est vide
    if (items.length === 0 && productsList.length > 0) {
      return productsList.slice(0, 2).map((p) => ({
        product: p,
        customLabel: p.tag || 'Novedad',
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
      'HORNOS',
      'HORNO DE PIZZA',
      'Chimenea',
      'ESTUFA DE LEÑA',
      'ESTUFA DE PELLETS',
      'Colchones',
      'Mueble de baño',
      'Mueble TV',
      'Cuadros y Láminas',
      'FRIGORIFIGO',
      'ASPIRADORA DYSON',
      'LAVADORA SECADORA',
      'Juego de interior',
      'Belleza & cabello',
      'Novedades televisores',
      'Jardin ',
      'Mobilier & Décoration',
      'Haute Cosmétique & Visage',
      "Parfums d'Exception",
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
  const [isHeroAutoPlaying, setIsHeroAutoPlaying] = useState(false)
  const [isHeroHovered, setIsHeroHovered] = useState(false)
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
    if (heroCategorySlides.length <= 1 || !isHeroAutoPlaying || isHeroHovered) return
    const timer = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % heroCategorySlides.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [heroCategorySlides.length, isHeroAutoPlaying, isHeroHovered])

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
        onOpenCart={() => showToast(`Tu cesta contiene ${cartCount} artículo(s)`)}
      />

      {/* Hero Section */}
      <section id="top" className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Arte de Vivir · Santuario del Hogar &amp; Cuidado Personal</p>
          <h1>El Lujo de Habitar<br /><em>su espacio.</em></h1>
          <p className="hero-text">
            {settings.heroSubtitle || "Un espacio refinado donde vivir en armonía. Piezas de mobiliario y artículos seleccionados para sublimar su interior y cuidar de su confort cada día."}
          </p>
          <div className="hero-cta-group">
            <Link href="/boutique" className="button dark">
              Explorar las colecciones <span>→</span>
            </Link>
            {heroFirstProduct && (
              <button
                className="button outline"
                onClick={() => handleBuyNow(heroFirstProduct)}
              >
                Comprar {heroFirstProduct.name.split(' ')[0]} ({heroFirstProduct.price}) ⚡
              </button>
            )}
          </div>
        </div>
        <div
          className="hero-image hero-category-carousel"
          onMouseEnter={() => setIsHeroHovered(true)}
          onMouseLeave={() => setIsHeroHovered(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {heroCategorySlides.map((slide, idx) => {
            const isActive = idx === (heroSlideIndex % (heroCategorySlides.length || 1))
            return (
              <div
                key={slide.category}
                className={`hero-category-slide ${isActive ? 'is-active' : ''}`}
                aria-hidden={!isActive}
              >
                <img
                  src={slide.image}
                  alt={`${slide.category} - ${slide.featuredProduct?.name || 'MERCATUM'}`}
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
                <div className="hero-slide-overlay" />
              </div>
            )
          })}

          {/* Flèches de navigation gauche / droite & Contrôle manuel */}
          {heroCategorySlides.length > 1 && (
            <>
              <button
                type="button"
                className="hero-slide-arrow prev"
                onClick={handlePrevHeroCategory}
                aria-label="Categoría anterior"
                title="Categoría anterior"
              >
                ‹
              </button>
              <button
                type="button"
                className="hero-slide-arrow next"
                onClick={handleNextHeroCategory}
                aria-label="Categoría siguiente"
                title="Categoría siguiente"
              >
                ›
              </button>

              {/* Bouton de contrôle : défilement manuel avec bouton Play/Pause */}
              <div className="hero-slide-controls-pill">
                <span className="hero-slide-count">
                  {(heroSlideIndex % heroCategorySlides.length) + 1} / {heroCategorySlides.length}
                </span>
                <button
                  type="button"
                  className={`hero-toggle-play-btn ${isHeroAutoPlaying ? 'playing' : ''}`}
                  onClick={() => setIsHeroAutoPlaying((prev) => !prev)}
                  aria-label={isHeroAutoPlaying ? 'Detener el desplazamiento automático' : 'Activar el desplazamiento automático'}
                  title={isHeroAutoPlaying ? 'Detener el desplazamiento' : 'Iniciar el desplazamiento automático'}
                >
                  {isHeroAutoPlaying ? '⏸' : '▶'}
                </button>
              </div>
            </>
          )}

          {/* Légende épurée au bas de la photo pour laisser l'image 100% visible */}
          {currentHeroSlide && (
            <Link
              href={`/boutique?cat=${encodeURIComponent(currentHeroSlide.category)}`}
              className="hero-caption"
              title={`Explorar la categoría ${currentHeroSlide.category}`}
              style={{ textDecoration: 'none', cursor: 'pointer' }}
            >
              ✦ {currentHeroSlide.category} {currentHeroSlide.featuredProduct ? `· ${currentHeroSlide.featuredProduct.name} (${currentHeroSlide.featuredProduct.price})` : ''} <span>→</span>
            </Link>
          )}

          {/* Points indicateurs de défilement discrets */}
          {heroCategorySlides.length > 1 && (
            <div className="hero-slider-dots">
              {heroCategorySlides.map((slide, idx) => (
                <button
                  key={slide.category}
                  type="button"
                  onClick={() => setHeroSlideIndex(idx)}
                  className={`hero-slider-dot ${idx === (heroSlideIndex % heroCategorySlides.length) ? 'active' : ''}`}
                  aria-label={`Ir a la categoría ${slide.category}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3 Pillars / Values Section */}
      <section className="values-section">
        <div className="values-grid">
          <div className="value-card">
            <span className="value-icon">🏡</span>
            <h3>El Santuario del Hogar</h3>
            <p>Desde muebles de autor hasta equipamiento exterior y descanso de alta gama, diseñamos un espacio vital de confort y belleza extraordinarios.</p>
          </div>
          <div className="value-card">
            <span className="value-icon">🌿</span>
            <h3>Cuidado y Bienestar Diario</h3>
            <p>Artículos seleccionados y piezas funcionales para aportar serenidad, calidez y un confort inigualable en el hogar.</p>
          </div>
          <div className="value-card">
            <span className="value-icon">✦</span>
            <h3>Excelencia y Materiales Nobles</h3>
            <p>Diseño atemporal, acabados minuciosos y confección cuidada para creaciones duraderas pensadas para acompañarle.</p>
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className="manifesto">
        <p className="eyebrow">{settings.siteName || 'MERCATUM'} · El Equilibrio Perfecto</p>
        <h2>La armonía entre<br /><em>su espacio y usted.</em></h2>
        <p>
          Su hogar es su refugio y el corazón de su descanso. En MERCATUM aunamos el diseño más refinado con la máxima exigencia de calidad para celebrar el arte de vivir en toda su plenitud.
        </p>
        <Link className="text-link" href="/boutique">Explorar todas nuestras colecciones <span>↗</span></Link>
      </section>

      {/* Grand Showcase par Catégorie avec Défilement Horizontal & Arguments */}
      <section id="boutique-preview" style={{ paddingTop: '30px' }}>
        <div style={{ padding: '40px 4vw 20px', maxWidth: '1380px', margin: '0 auto', textAlign: 'center' }}>
          <p className="eyebrow" style={{ marginBottom: '12px' }}>
            El Arte de Vivir · Nuestras Colecciones Exclusivas
          </p>
          <h2 style={{ fontSize: 'clamp(32px, 4.5vw, 54px)', margin: '0 0 16px', lineHeight: 1.05 }}>
            Todos nuestros Universos por Categoría
          </h2>
          <p style={{ maxWidth: '680px', margin: '0 auto 28px', color: '#5f625c', fontSize: '15px', lineHeight: '1.65' }}>
            Hornos de alta gama, chimeneas, estufas, descanso ortopédico y mobiliario de autor. Deslice cada colección para descubrir nuestras piezas maestras y sus especificaciones técnicas de excelencia.
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
              Toda la tienda ({productsList.length}) ↗
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
            Acceder a toda la tienda ({productsList.length} artículos) <span>→</span>
          </Link>
        </div>
      </section>

      {/* Atelier / Story Section */}
      <section id="histoire" className="story">
        <div className="story-image">
          <img src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1100&q=85" alt="Interior refinado y arte de vivir" />
        </div>
        <div className="story-copy">
          <p className="eyebrow">Filosofía &amp; Arte de Vivir</p>
          <h2>Dos universos inseparables,<br /><em>una misma búsqueda de armonía.</em></h2>
          <p>
            Cuidar de su entorno y de su descanso diario forman parte de una misma dedicación. Desde mobiliario de carácter concebido para perdurar hasta equipamiento técnico pensado para hacer la vida más confortable, cada pieza es seleccionada con pasión para enriquecer su día a día.
          </p>
          <Link className="button outline" href="/boutique">
            Descubrir todas nuestras colecciones <span>↗</span>
          </Link>
        </div>
      </section>

      {/* Customer Reviews Section */}
      <section className="testimonials-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Opiniones verificadas de nuestros clientes</p>
            <h2>La experiencia MERCATUM</h2>
          </div>
        </div>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="stars">★★★★★</div>
            <p>« El horno pirolítico y el mobiliario han transformado por completo nuestra cocina. Acabados impecables y una atención al cliente de primer nivel. »</p>
            <strong>— Alejandro &amp; Elena V., Madrid</strong>
          </div>
          <div className="testimonial-card">
            <div className="stars">★★★★★</div>
            <p>« El conjunto de baño y la estufa superaron con creces nuestras expectativas. Materiales de primera calidad y entrega rápida con seguro. »</p>
            <strong>— Carmen B., Barcelona</strong>
          </div>
          <div className="testimonial-card">
            <div className="stars">★★★★★</div>
            <p>« Piezas elegantes y robustas que aportan un toque único a nuestro hogar. La tramitación del pedido y la entrega fueron perfectas. »</p>
            <strong>— Javier M., Valencia</strong>
          </div>
        </div>
      </section>

      {/* Nouveautés Section (Gérée dynamiquement par l'Admin) */}
      <section id="nouveautes" className="journal">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Últimas llegadas</p>
            <h2>Novedades</h2>
          </div>
          <Link className="text-link" href="/boutique">Todas las novedades <span>↗</span></Link>
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
                  Comprar ahora ⚡
                </Link>
                <button
                  type="button"
                  className="add-cart-outline-btn"
                  onClick={() => handleAddToCart(product)}
                  style={{ padding: '8px 14px' }}
                >
                  Cesta +
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Contact Section (Dynamique via les paramètres Admin) */}
      <section className="newsletter" style={{ background: '#20251f', color: '#f4f0e9' }}>
        <p className="eyebrow" style={{ color: '#b8c8a6' }}>Contacto</p>
        <h2 style={{ color: '#f4f0e9' }}>{settings.siteName || 'MERCATUM'} Madrid</h2>
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
        <p className="eyebrow">El Círculo Privilegiado {settings.siteName || 'MERCATUM'}</p>
        <h2>Reciba nuestras novedades de diseño<br /><em>e invitaciones exclusivas.</em></h2>
        <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true) }}>
          <input
            type="email"
            required
            placeholder="Su dirección de correo electrónico"
            value={newsletter}
            onChange={(e) => setNewsletter(e.target.value)}
          />
          <button type="submit">{submitted ? 'Bienvenido al Club' : "Suscribirse ↗"}</button>
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

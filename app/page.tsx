'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Volume2, VolumeX, ArrowUp } from 'lucide-react'
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
  saveSiteSettings,
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
import { addToCart } from '@/lib/cart'
import { getClientCachedProducts, getSyncCachedProducts, setClientCachedProducts } from '@/lib/clientCache'

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
  'Mobiliario & Decoración': {
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
  'Hogar & Ambiente': {
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
  'Cuidado & Rituales Corporales': {
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
  'Aire Libre & Glamping': {
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
  'Alta Cosmética & Cuidado Facial': {
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
  'Alta Cosmética': {
    eyebrow: 'Biotecnología Botánica & Alta Regeneración',
    title: 'Alta Cosmética & Cuidado de Belleza',
    subtitle: 'El poder de los activos más selectos para realzar su belleza natural.',
    badge: 'Eficacia Comprobada & Fórmulas Puras',
    description: 'Selección de artículos de alta gama formulados con activos puros y tratamientos de vanguardia.',
    arguments: [
      { icon: '✨', title: 'Resultados Visibles', desc: 'Eficacia garantizada en revitalización y luminosidad.' },
      { icon: '🌿', title: 'Ingredientes Nobles', desc: 'Fórmulas respetuosas y de máxima pureza.' },
      { icon: '💎', title: 'Exclusividad & Prestigio', desc: 'Calidad superior en cada aplicación.' },
    ],
  },
  'Perfumes de Autor': {
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
  'Cuidado Corporal & Spa': {
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
  'Hogar & Confort': {
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
  'Jardín & Exterior': {
    eyebrow: 'Santuario Exterior · Vivir al Aire Libre',
    title: 'Mobiliario de Jardín & Terrazas de Autor',
    subtitle: 'El máximo confort y elegancia para disfrutar de sus espacios al aire libre.',
    badge: 'Resistencia Climática & Confort Premium',
    description: 'Conjuntos de aluminio, sofás modulares de exterior y piezas resistentes a la intemperie diseñadas para disfrutar del jardín todo el año.',
    arguments: [
      { icon: '☀️', title: 'Resistencia a Rayos UV & Lluvia', desc: 'Estructuras de aluminio inoxidable y telas hidrófugas lavables.' },
      { icon: '🌿', title: 'Confort de Salón en el Jardín', desc: 'Cojines gruesos de alta resiliencia para una relajación total.' },
      { icon: '🏡', title: 'Diseño Vanguardista', desc: 'Líneas arquitectónicas modernas que realzan cualquier terraza o porche.' },
    ],
  },
  'Velas & Aromas': {
    eyebrow: 'Alta Perfumería de Interior & Atmósferas',
    title: 'Velas Aromáticas & Esencias Nobles',
    subtitle: 'Cree un ambiente sensorial cálido, seductor y acogedor.',
    badge: 'Cera 100% Vegetal & Esencias Puras',
    description: 'Velas perfumadas vertidas a mano con ceras botánicas y mechas de algodón puro para una difusión limpia y envolvente.',
    arguments: [
      { icon: '🕯️', title: 'Combustión Limpia y Duradera', desc: 'Ceras naturales que queman de manera uniforme sin humos.' },
      { icon: '🌸', title: 'Esencias Concentradas de Autor', desc: 'Notas de salida, corazón y fondo que perfuman suavemente la estancia.' },
      { icon: '✨', title: 'Elegancia Visual', desc: 'Vasos lacados y diseño minimalista ideal para regalar o decorar.' },
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

        {/* Rail de défilement horizontal avec les produits phares de la catégorie */}
        <div className="category-slider-wrapper">
          <div ref={trackRef} className="category-products-track">
            {products.slice(0, 12).map((product, pIdx) => {
              const isAireAcondicionado =
                product.category === 'Aire acondicionado' ||
                (typeof product.category === 'string' && product.category.toLowerCase().includes('aire acondicionado'))

              return (
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
                          priority={pIdx < 2}
                          showArrows={!isAireAcondicionado}
                          showDots={!isAireAcondicionado}
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
                      🛒 Cesta +
                    </button>
                  </div>
                </div>
              </article>
            )})}

            {products.length > 12 && (
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
                  +{products.length - 12} artículos más
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

const FULL_HERO_SLIDES = [
  {
    id: 1,
    title: 'Nueva Colección Hogar & Cocina',
    subtitle: 'Placas de inducción con extracción y hornos pirolíticos de última generación',
    badge: 'NOVEDADES EXCLUSIVAS',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1600&q=85',
    link: '/boutique?cat=Placa%20inducci%C3%B3n',
    category: 'Electrodomésticos',
  },
  {
    id: 2,
    title: 'Alta Cosmética & Belleza de Élite',
    subtitle: 'Tratamientos botánicos regeneradores y perfumes de autor más selectos',
    badge: 'BELLEZA EXCLUSIVA',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1600&q=85',
    link: '/boutique?cat=Alta%20Cosm%C3%A9tica%20%26%20Cuidado%20Facial',
    category: 'Belleza',
  },
  {
    id: 3,
    title: 'Mobiliario de Autor & Salón',
    subtitle: 'El equilibrio perfecto entre pureza geométrica y confort supremo',
    badge: 'DISEÑO & CONFORT',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=85',
    link: '/boutique?cat=Mobiliario%20%26%20Decoraci%C3%B3n',
    category: 'Mobiliario & Decoración',
  },
  {
    id: 4,
    title: 'Chimeneas & Fuego Acogedor',
    subtitle: 'Calor radiante, estufas de leña y pellets para un confort duradero',
    badge: 'CALOR DE HOGAR',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=85',
    link: '/boutique?cat=Chimenea',
    category: 'Chimenea',
  },
]

const ECI_CATEGORIES = [
  {
    name: 'Electrodomésticos',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80',
    link: '/boutique?cat=Placa%20inducci%C3%B3n',
  },
  {
    name: 'Belleza',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
    link: '/boutique?cat=Alta%20Cosm%C3%A9tica%20%26%20Cuidado%20Facial',
  },
  {
    name: 'Joyería',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80',
    link: '/boutique?cat=Reloj%20de%20mujer',
  },
  {
    name: 'Mobiliario & Decoración',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
    link: '/boutique?cat=Mobiliario%20%26%20Decoraci%C3%B3n',
  },
  {
    name: 'Placa inducción',
    image: '/uploads/placa-de-induccion-cata-con-campana-extractora-as-600-negro.jpg',
    link: '/boutique?cat=Placa%20inducci%C3%B3n',
  },
  {
    name: 'Hornos',
    image: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=600&q=80',
    link: '/boutique?cat=HORNOS',
  },
  {
    name: 'Chimenea',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=600&q=80',
    link: '/boutique?cat=Chimenea',
  },
  {
    name: 'Colchones',
    image: 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=600&q=80',
    link: '/boutique?cat=Colchones',
  },
  {
    name: 'Bolsos',
    image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80',
    link: '/boutique?cat=BOLSOS%20MUJER',
  },
  {
    name: 'Aire Libre & Glamping',
    image: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=600&q=80',
    link: '/boutique?cat=Aire%20Libre%20%26%20Glamping',
  },
  {
    name: 'Cámaras Digitales',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80',
    link: '/boutique?cat=C%C3%A1maras%20Digitales',
  },
  {
    name: 'Mueble de baño',
    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
    link: '/boutique?cat=Mueble%20de%20ba%C3%B1o',
  },
]

const SANTUARIO_SLIDES = [
  {
    image: '/uploads/santuario-slide-1.jpg',
    title: 'Salón Multimedia & Entretenimiento de Élite',
    subtitle: 'El equilibrio entre tecnología audiovisual de gran formato y confort soberano.',
  },
  {
    image: '/uploads/santuario-slide-2.jpg',
    title: 'El Refugio del Descanso & Texturas Nobles',
    subtitle: 'Sofás modulares de línea limpia, tejidos confort y serenidad absoluta.',
  },
  {
    image: '/uploads/santuario-slide-3.jpg',
    title: 'Mobiliario de Autor & Vitrinas Clásicas',
    subtitle: 'Armonía y carpintería arquitectónica para organizar su espacio vital.',
  },
  {
    image: '/uploads/santuario-slide-4.jpg',
    title: 'Santuario de Agua & Espacio Baño',
    subtitle: 'Maderas cálidas, lavabos escultóricos y detalles contemporáneos en negro mate.',
  },
  {
    image: '/uploads/santuario-slide-5.jpg',
    title: 'Espacios Híbridos & Despachos de Diseño',
    subtitle: 'Integración fluida de zona de trabajo, biblioteca y sala de estar.',
  },
]

const CUIDADO_SLIDES = [
  {
    image: '/uploads/cuidado-slide-1.jpg',
    title: 'Alta Cosmética & Cuidado Facial de Lujo',
    subtitle: 'Fórmulas regeneradoras y activos excepcionales para una piel luminosa.',
  },
  {
    image: '/uploads/cuidado-slide-2.jpg',
    title: 'Belleza Radiante & Pureza Intemporal',
    subtitle: 'Rituales de cuidado dermatológico y rejuvenecimiento celular.',
  },
  {
    image: '/uploads/cuidado-slide-3.jpg',
    title: 'Rituales de Baño & Serenidad Termal',
    subtitle: 'Texturas envolventes, bienestar corporal y momentos de calma absoluta.',
  },
  {
    image: '/uploads/cuidado-slide-4.jpg',
    title: 'Estilismo Capilar Inteligente & Brillo Térmico',
    subtitle: 'Tecnología de moldeado avanzada sin daño térmico para un acabado de salón.',
  },
]

const EXCELENCIA_SLIDES = [
  {
    image: '/uploads/excelencia-slide-1.jpg',
    title: 'Limpieza Robótica Inteligente & Estación Todo en Uno',
    subtitle: 'Potencia de aspiración sin precedentes y navegación láser de máxima precisión.',
  },
  {
    image: '/uploads/excelencia-slide-2.jpg',
    title: 'Aspiración Silenciosa & Filtración HEPA de Alta Gama',
    subtitle: 'Ingeniería de vanguardia pensada para un aire puro y un cuidado absoluto de sus suelos.',
  },
  {
    image: '/uploads/excelencia-slide-3.jpg',
    title: 'Estufas de Pellets de Rendimiento Ecológico Superior',
    subtitle: 'Calor acogedor, encendido programable y diseño contemporáneo arquitectónico.',
  },
  {
    image: '/uploads/excelencia-slide-4.jpg',
    title: 'Pantallas Crystal 4K AI & Imagen Cinematográfica',
    subtitle: 'Procesamiento inteligente, colores vivos y sonido envolvente para su hogar.',
  },
  {
    image: '/uploads/excelencia-slide-5.jpg',
    title: 'Cafeteras Integrables & Extracción Barista Gourmet',
    subtitle: 'La precisión del café en grano perfecto fusionada en su mobiliario de cocina.',
  },
  {
    image: '/uploads/excelencia-slide-6.jpg',
    title: 'Chimeneas Eléctricas & Fuego Acogedor Esculpido',
    subtitle: 'Elegancia de salón, calidez inmediata y la belleza del fuego sin humos ni cenizas.',
  },
]

export default function HomePage() {
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0)
  const [heroSlideIdx, setHeroSlideIdx] = useState(0)
  const [santuarioSlideIdx, setSantuarioSlideIdx] = useState(0)
  const [cuidadoSlideIdx, setCuidadoSlideIdx] = useState(0)
  const [excelenciaSlideIdx, setExcelenciaSlideIdx] = useState(0)
  const [isMuted, setIsMuted] = useState(true)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const catCarouselRef = useRef<HTMLDivElement>(null)

  const scrollCatCarousel = (direction: 'left' | 'right') => {
    if (catCarouselRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340
      catCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const [productsList, setProductsList] = useState<Product[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = getSyncCachedProducts()
      if (cached && cached.length > 0) return cached
      const local = getProducts()
      if (local && local.length > 0) return local
    }
    return PRODUCTS
  })
  const [nouveautesList, setNouveautesList] = useState<NewItem[]>(() => {
    if (typeof window !== 'undefined') {
      const local = getNouveautes()
      if (local && local.length > 0) return local
    }
    return [
      { productId: 'idole-now-lancome', customLabel: 'Parfumerie · Nouveau' },
      { productId: 'creme-supreme-anti-age', customLabel: 'Soins Anti-Âge · N°1 des Ventes' },
    ]
  })
  const [settings, setSettings] = useState<SiteSettings>(() => getSiteSettings())

  const [cartCount, setCartCount] = useState(0)
  const [buyingProduct, setBuyingProduct] = useState<Product | null>(null)
  const [newsletter, setNewsletter] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const novedadesTrackRef = useRef<HTMLDivElement>(null)
  const categoryBarRef = useRef<HTMLDivElement>(null)

  const scrollNovedades = (direction: 'left' | 'right') => {
    if (novedadesTrackRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320
      novedadesTrackRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const scrollCategoryBar = (direction: 'left' | 'right') => {
    if (categoryBarRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280
      categoryBarRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const handleSelectCategory = (index: number, e?: React.MouseEvent) => {
    setActiveCategoryIndex(index)
    if (e?.currentTarget) {
      (e.currentTarget as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      })
    }
  }

  useEffect(() => {
    // 1. Chargement local immédiat (0 délai d'affichage)
    const localProducts = getProducts()
    if (localProducts && localProducts.length > PRODUCTS.length) {
      setProductsList((prev) => (localProducts.length > prev.length ? localProducts : prev))
    }
    setNouveautesList(getNouveautes())
    setSettings(getSiteSettings())

    // 1.1 Cache IndexedDB ultra-rapide (< 10ms) pour restaurer tous les produits instantanément
    getClientCachedProducts().then((cached) => {
      if (cached && cached.length > 0) {
        setProductsList((prev) => (cached.length >= prev.length ? cached : prev))
      }
    }).catch(() => {})

    // 2. Fonction de chargement direct et immédiat depuis le cache / Supabase
    const loadProducts = (force = false) => {
      fetchProductsFromDb(force).then((dbProducts) => {
        if (dbProducts && dbProducts.length > 0) {
          saveProductsBulk(dbProducts)
          const merged = new Map<string, Product>()
          // 1. Initialiser avec l'ensemble complet des produits par défaut
          PRODUCTS.forEach((p) => merged.set(p.id, p))

          // 2. Fusionner tous les produits issus de Supabase Cloud
          dbProducts.forEach((p) => {
            const def = merged.get(p.id)
            const chosenMain = (p.image || def?.image || '').trim()
            const pImgs = Array.isArray(p.images) ? p.images.filter(Boolean) : []
            const pMedia = Array.isArray(p.media) ? p.media.filter(Boolean) : []
            const pMediaUrls = pMedia.map((m: any) => (typeof m === 'string' ? m : m?.url)).filter(Boolean)
            const authoritativePImgs = pMediaUrls.length > pImgs.length ? pMediaUrls : pImgs

            const defImgs = Array.isArray(def?.images) ? def.images.filter(Boolean) : []
            const rawImages = authoritativePImgs.length > 1
              ? authoritativePImgs
              : (defImgs.length > 0 ? defImgs : (authoritativePImgs.length > 0 ? authoritativePImgs : (chosenMain ? [chosenMain] : [])))

            const defMedia = Array.isArray(def?.media) ? def.media.filter(Boolean) : []
            const rawMedia = pMedia.length > 1
              ? pMedia
              : (defMedia.length > 0 ? defMedia : rawImages.map((u) => ({ url: u, type: isVideoUrl(u) ? 'video' as const : 'image' as const })))

            const orderedImages = chosenMain
              ? Array.from(new Set([chosenMain, ...rawImages]))
              : rawImages

            merged.set(p.id, {
              ...(def || {}),
              ...p,
              image: chosenMain,
              images: orderedImages,
              media: rawMedia,
            })
          })

          // 3. Intégrer également les créations locales récentes sans écraser les images officielles
          const localItems = getProducts()
          localItems.forEach((lp) => {
            if (lp && lp.id) {
              const def = merged.get(lp.id)
              if (!def) {
                merged.set(lp.id, lp)
              } else {
                const defHasOfficial = (def.images && def.images.length > 0) || (def.image && !def.image.includes('placeholder'))
                merged.set(lp.id, {
                  ...lp,
                  ...def,
                  image: defHasOfficial ? def.image : (lp.image || def.image),
                  images: defHasOfficial ? def.images : (lp.images || def.images),
                  media: defHasOfficial ? def.media : (lp.media || def.media),
                })
              }
            }
          })

          const finalProducts = Array.from(merged.values())
          setProductsList(finalProducts)
          saveProductsBulk(finalProducts)
          setClientCachedProducts(finalProducts).catch(() => {})
        }
      }).catch(() => {})
    }

    loadProducts(true)

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
      if (dbSettings) {
        setSettings(dbSettings)
        saveSiteSettings(dbSettings)
      }
    }).catch(() => {})

    return () => {
      unsubscribe()
      window.removeEventListener('mercatum:products_updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroSlideIdx((prev) => (prev + 1) % FULL_HERO_SLIDES.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setSantuarioSlideIdx((prev) => (prev + 1) % SANTUARIO_SLIDES.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCuidadoSlideIdx((prev) => (prev + 1) % CUIDADO_SLIDES.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setExcelenciaSlideIdx((prev) => (prev + 1) % EXCELENCIA_SLIDES.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1)
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
    const seen = new Set<string>()
    const items = nouveautesList
      .map((item) => {
        if (!item?.productId || seen.has(item.productId)) return null
        seen.add(item.productId)
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
      return productsList.slice(0, 8).map((p) => ({
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
      'Mobiliario & Decoración',
      'Cuadros y Láminas',
      'FRIGORIFIGO',
      'LAVADORA SECADORA',
      'ASPIRADORA DYSON',
      'Juego de interior',
      'Belleza & cabello',
      'Jardín & Exterior',
      'Novedades televisores',
      'Aire Libre & Glamping',
      'Alta Cosmética & Cuidado Facial',
      'Perfumes de Autor',
      'Cuidado Corporal & Spa',
      'Hogar & Confort',
      'Velas & Aromas',
      'Alta Cosmética',
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
      <Navbar />

      {/* Immersive Full-Width Hero Section (El Corte Inglés Style) */}
      <section id="top" className="relative w-full overflow-hidden bg-black">
        <div className="relative w-full h-[54vh] sm:h-[62vh] md:h-[72vh] min-h-[440px] sm:min-h-[460px] max-h-[700px] overflow-hidden">
          {FULL_HERO_SLIDES.map((slide, idx) => {
            const isActive = idx === (heroSlideIdx % FULL_HERO_SLIDES.length)
            return (
              <div
                key={slide.id}
                className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                  isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full object-cover object-center select-none"
                  loading={idx === 0 ? 'eager' : 'lazy'}
                />
                {/* Subtle gradient vignette at top and bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 pointer-events-none" />

                {/* Hero Slide Content */}
                <div className="absolute bottom-5 sm:bottom-10 left-4 sm:left-10 max-w-xl text-white z-20 pointer-events-auto pr-14 sm:pr-24">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold tracking-wider uppercase mb-2 sm:mb-3 border border-white/25">
                    <span>✦</span> {slide.badge}
                  </div>
                  <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-2 leading-tight drop-shadow-md">
                    {slide.title}
                  </h1>
                  <p className="text-xs sm:text-sm md:text-base text-white/90 mb-4 line-clamp-2 drop-shadow">
                    {slide.subtitle}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3.5 mt-2">
                    <Link
                      href={slide.link}
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#111827',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm shadow-xl transition-all duration-200 hover:scale-105 hover:bg-stone-100 active:scale-95 select-none"
                    >
                      <span style={{ color: '#111827', fontWeight: 700 }}>Descubrir colección</span>
                      <span style={{ color: '#111827', fontWeight: 700 }}>→</span>
                    </Link>
                    {heroFirstProduct && (
                      <button
                        type="button"
                        onClick={() => handleBuyNow(heroFirstProduct)}
                        style={{
                          backgroundColor: 'rgba(18, 22, 18, 0.88)',
                          color: '#ffffff',
                          border: '1px solid rgba(255, 255, 255, 0.45)',
                          backdropFilter: 'blur(8px)',
                          fontWeight: 600,
                        }}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold shadow-xl transition-all duration-200 hover:scale-105 hover:bg-black active:scale-95 cursor-pointer select-none"
                      >
                        <span style={{ color: '#ffffff', fontWeight: 600 }}>Comprar destacado ⚡</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Audio Mute/Unmute toggle (Exact match to screenshot bottom-right) */}
          <button
            type="button"
            onClick={() => setIsMuted((prev) => !prev)}
            className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/50 backdrop-blur-md text-white flex items-center justify-center border border-white/30 hover:bg-black/75 transition shadow-lg cursor-pointer"
            aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
            title={isMuted ? 'Activar sonido' : 'Silenciar'}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-white stroke-[2]" />
            ) : (
              <Volume2 className="w-5 h-5 text-white stroke-[2]" />
            )}
          </button>
        </div>

        {/* Progress Bar under hero (Exact match to screenshot) */}
        <div className="w-full flex justify-center py-2.5 sm:py-3.5 bg-white border-b border-stone-100">
          <div className="w-36 sm:w-48 h-[2.5px] sm:h-[3px] bg-stone-200 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-stone-950 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${((heroSlideIdx + 1) / FULL_HERO_SLIDES.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </section>

      {/* Categorías Section (Exact match to screenshot: Title + horizontal scroll cards + labels) */}
      <section className="bg-white py-6 sm:py-8 border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-stone-950 font-sans">
              Categorías
            </h2>
            <div className="flex items-center gap-2">
              <Link
                href="/boutique"
                className="text-xs sm:text-sm font-semibold text-stone-500 hover:text-stone-900 transition flex items-center gap-1 mr-2"
              >
                Ver todo <span>→</span>
              </Link>
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => scrollCatCarousel('left')}
                  className="w-8 h-8 rounded-full border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 flex items-center justify-center transition"
                  aria-label="Categorías anteriores"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => scrollCatCarousel('right')}
                  className="w-8 h-8 rounded-full border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 flex items-center justify-center transition"
                  aria-label="Categorías siguientes"
                >
                  ›
                </button>
              </div>
            </div>
          </div>

          <div
            ref={catCarouselRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth no-scrollbar"
            style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
          >
            {ECI_CATEGORIES.map((cat) => (
              <Link
                key={cat.name}
                href={cat.link}
                className="group flex flex-col items-center shrink-0 w-32 sm:w-40 md:w-44 select-none"
                style={{ scrollSnapAlign: 'start' }}
              >
                <div className="w-full aspect-square rounded-2xl overflow-hidden bg-stone-100 border border-stone-200/80 shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-md relative">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>
                <span className="mt-2.5 text-center text-xs sm:text-sm font-semibold text-stone-900 tracking-tight leading-snug group-hover:text-stone-600 transition-colors line-clamp-2 px-1">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3 Pillars / Values Section - Editorial Banners */}
      <section className="values-section" style={{ padding: '40px 4vw 50px', background: '#f8f6f2' }}>
        <div
          style={{
            maxWidth: '1380px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {/* 1. El Santuario del Hogar - Carrousel Défilant Dynamique */}
          <div
            className="group relative overflow-hidden rounded-2xl shadow-sm border border-stone-200/80 bg-stone-900 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 select-none"
            style={{ aspectRatio: '16/9' }}
          >
            {/* Diapositives qui défilent */}
            {SANTUARIO_SLIDES.map((slide, idx) => {
              const isActive = idx === santuarioSlideIdx
              return (
                <div
                  key={slide.image}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Dégradé doux et texte superposé dans le style El Santuario del Hogar */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10 flex flex-col justify-end p-4 sm:p-5 text-white">
                    <p className="text-[10px] sm:text-xs uppercase tracking-widest text-amber-300 font-semibold mb-1">
                      El Santuario del Hogar
                    </p>
                    <h4 className="font-serif text-sm sm:text-base md:text-lg font-normal text-white leading-snug drop-shadow-sm">
                      {slide.title}
                    </h4>
                    <p className="hidden sm:block text-xs text-stone-200/90 mt-1 line-clamp-1 drop-shadow-sm">
                      {slide.subtitle}
                    </p>
                  </div>
                </div>
              )
            })}

            {/* Boutons flèches précédent / suivant */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setSantuarioSlideIdx((prev) => (prev - 1 + SANTUARIO_SLIDES.length) % SANTUARIO_SLIDES.length)
              }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white/20 backdrop-blur-sm cursor-pointer"
              aria-label="Foto anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setSantuarioSlideIdx((prev) => (prev + 1) % SANTUARIO_SLIDES.length)
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white/20 backdrop-blur-sm cursor-pointer"
              aria-label="Siguiente foto"
            >
              ›
            </button>

            {/* Puces de pagination en bas */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
              {SANTUARIO_SLIDES.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSantuarioSlideIdx(dotIdx)
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    dotIdx === santuarioSlideIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Ir a la diapositiva ${dotIdx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* 2. Cuidado y Bienestar Diario - Carrousel Défilant Dynamique */}
          <div
            className="group relative overflow-hidden rounded-2xl shadow-sm border border-stone-200/80 bg-stone-900 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 select-none"
            style={{ aspectRatio: '16/9' }}
          >
            {/* Diapositives qui défilent */}
            {CUIDADO_SLIDES.map((slide, idx) => {
              const isActive = idx === cuidadoSlideIdx
              return (
                <div
                  key={slide.image}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Dégradé doux et texte superposé dans le style Cuidado y Bienestar Diario */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10 flex flex-col justify-end p-4 sm:p-5 text-white">
                    <p className="text-[10px] sm:text-xs uppercase tracking-widest text-emerald-300 font-semibold mb-1">
                      Cuidado y Bienestar Diario
                    </p>
                    <h4 className="font-serif text-sm sm:text-base md:text-lg font-normal text-white leading-snug drop-shadow-sm">
                      {slide.title}
                    </h4>
                    <p className="hidden sm:block text-xs text-stone-200/90 mt-1 line-clamp-1 drop-shadow-sm">
                      {slide.subtitle}
                    </p>
                  </div>
                </div>
              )
            })}

            {/* Boutons flèches précédent / suivant */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setCuidadoSlideIdx((prev) => (prev - 1 + CUIDADO_SLIDES.length) % CUIDADO_SLIDES.length)
              }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white/20 backdrop-blur-sm cursor-pointer"
              aria-label="Foto anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setCuidadoSlideIdx((prev) => (prev + 1) % CUIDADO_SLIDES.length)
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white/20 backdrop-blur-sm cursor-pointer"
              aria-label="Siguiente foto"
            >
              ›
            </button>

            {/* Puces de pagination en bas */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
              {CUIDADO_SLIDES.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCuidadoSlideIdx(dotIdx)
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    dotIdx === cuidadoSlideIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Ir a la diapositiva ${dotIdx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* 3. Excelencia y Materiales Nobles - Carrousel Défilant Dynamique */}
          <div
            className="group relative overflow-hidden rounded-2xl shadow-sm border border-stone-200/80 bg-stone-900 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 select-none"
            style={{ aspectRatio: '16/9' }}
          >
            {/* Diapositives qui défilent */}
            {EXCELENCIA_SLIDES.map((slide, idx) => {
              const isActive = idx === excelenciaSlideIdx
              return (
                <div
                  key={slide.image}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Dégradé doux et texte superposé dans le style Excelencia y Materiales Nobles */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10 flex flex-col justify-end p-4 sm:p-5 text-white">
                    <p className="text-[10px] sm:text-xs uppercase tracking-widest text-amber-200 font-semibold mb-1">
                      Excelencia y Materiales Nobles
                    </p>
                    <h4 className="font-serif text-sm sm:text-base md:text-lg font-normal text-white leading-snug drop-shadow-sm">
                      {slide.title}
                    </h4>
                    <p className="hidden sm:block text-xs text-stone-200/90 mt-1 line-clamp-1 drop-shadow-sm">
                      {slide.subtitle}
                    </p>
                  </div>
                </div>
              )
            })}

            {/* Boutons flèches précédent / suivant */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setExcelenciaSlideIdx((prev) => (prev - 1 + EXCELENCIA_SLIDES.length) % EXCELENCIA_SLIDES.length)
              }}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white/20 backdrop-blur-sm cursor-pointer"
              aria-label="Foto anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setExcelenciaSlideIdx((prev) => (prev + 1) % EXCELENCIA_SLIDES.length)
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white/20 backdrop-blur-sm cursor-pointer"
              aria-label="Siguiente foto"
            >
              ›
            </button>

            {/* Puces de pagination en bas */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
              {EXCELENCIA_SLIDES.map((_, dotIdx) => (
                <button
                  key={dotIdx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setExcelenciaSlideIdx(dotIdx)
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    dotIdx === excelenciaSlideIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                  }`}
                  aria-label={`Ir a la diapositiva ${dotIdx + 1}`}
                />
              ))}
            </div>
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

      {/* Nouveautés Section (Grille Verticale - 4 produits par rangée) */}
      <section id="nouveautes" className="journal novedades-vertical-section">
        <div className="section-heading" style={{ alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <p className="eyebrow">Últimas llegadas</p>
            <h2 style={{ marginBottom: 0 }}>Novedades</h2>
          </div>
          <Link className="text-link" href="/boutique" style={{ margin: 0 }}>
            Todas las novedades <span>↗</span>
          </Link>
        </div>

        {/* Grille verticale 4 produits par rangée */}
        <div className="novedades-grid-wrapper">
          <div className="novedades-products-track">
            {noveltyItems.map(({ product, customLabel }, nIdx) => (
              <article key={product.id} className="novedades-product-card">
                <Link href={`/produit/${product.id}`} className="block" style={{ cursor: 'pointer' }}>
                  <ProductMediaCarousel
                    media={product.media}
                    images={product.images}
                    fallbackImage={product.image}
                    alt={product.name}
                    aspectRatio="16 / 11"
                    priority={nIdx < 4}
                    className="rounded-lg mb-3"
                  />
                </Link>
                <div className="novedades-card-body">
                  <p className="eyebrow" style={{ marginBottom: '6px' }}>{customLabel}</p>
                  <h3 className="novedades-card-title">
                    <Link href={`/produit/${product.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {product.name}
                    </Link>
                  </h3>
                  <p className="novedades-card-desc">
                    {stripImagesFromDescription(product.type || product.description)}
                  </p>
                  <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                    <div style={{ marginBottom: '0.6rem' }}>
                      <strong className="product-price-tag">{product.price}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Link
                        href={`/produit/${product.id}`}
                        className="buy-now-card-btn"
                        style={{ textAlign: 'center', flex: 1, background: 'var(--foreground)', color: 'var(--background)', whiteSpace: 'nowrap' }}
                      >
                        Comprar ahora ⚡
                      </Link>
                      <button
                        type="button"
                        className="add-cart-outline-btn"
                        onClick={() => handleAddToCart(product)}
                        style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}
                        title="Añadir a la cesta"
                      >
                        🛒 Cesta +
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
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

      {/* Floating Back to Top Button (Exact match to screenshot) */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed right-4 sm:right-6 bottom-6 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white text-stone-900 shadow-xl border border-stone-200/90 flex items-center justify-center transition-all duration-300 hover:bg-stone-50 hover:scale-110 active:scale-95 cursor-pointer"
          aria-label="Volver arriba"
          title="Volver arriba"
        >
          <ArrowUp className="w-5 h-5 text-stone-900 stroke-[2.5]" />
        </button>
      )}
    </main>
  )
}

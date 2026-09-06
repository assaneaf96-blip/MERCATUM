'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CheckoutModal from '@/components/CheckoutModal'
import ProductMediaCarousel from '@/components/ProductMediaCarousel'
import { PRODUCTS, Product } from '@/lib/products'
import {
  getProducts,
  getNouveautes,
  getSiteSettings,
  DEFAULT_SETTINGS,
  type SiteSettings,
  type NewItem,
} from '@/lib/store'
import {
  fetchProductsFromDb,
  fetchNouveautesFromDb,
  fetchSettingsFromDb,
} from '@/lib/supabaseService'

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
    // 1. Chargement local immédiat
    const localProducts = getProducts()
    setProductsList(localProducts)
    setNouveautesList(getNouveautes())
    setSettings(getSiteSettings())

    // 2. Synchronisation en direct depuis Supabase
    fetchProductsFromDb().then((dbProducts) => {
      if (dbProducts && dbProducts.length > 0) {
        const merged = new Map<string, Product>()
        localProducts.forEach((p) => merged.set(p.id, p))
        dbProducts.forEach((p) => merged.set(p.id, p))
        setProductsList(Array.from(merged.values()))
      }
    }).catch(() => {})

    fetchNouveautesFromDb().then((dbNouv) => {
      if (dbNouv && dbNouv.length > 0) setNouveautesList(dbNouv)
    }).catch(() => {})

    fetchSettingsFromDb().then((dbSettings) => {
      if (dbSettings) setSettings(dbSettings)
    }).catch(() => {})
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

  const heroFirstProduct = productsList[0] || PRODUCTS[0]

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

      {/* Hero Section */}
      <section id="top" className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Haute Cosmétique Botanique · Soins d'Exception</p>
          <h1>La Jeunesse,<br /><em>sublimée.</em></h1>
          <p className="hero-text">
            {settings.heroSubtitle || "Des soins anti-âge d'exception, formulés avec les actifs botaniques les plus précieux et concentrés. Une efficacité prouvée pour révéler l'éclat et la fermeté de votre peau."}
          </p>
          <div className="hero-cta-group">
            <Link href="/boutique" className="button dark">
              Découvrir la Haute Cosmétique <span>→</span>
            </Link>
            {heroFirstProduct && (
              <button
                className="button outline"
                onClick={() => handleBuyNow(heroFirstProduct)}
              >
                Acheter {heroFirstProduct.name.split(' ')[0]} ({heroFirstProduct.price}) ⚡
              </button>
            )}
          </div>
        </div>
        <div className="hero-image">
          <img src="/maison-lune-hero.png" alt="Haute Cosmétique Maison Lune" />
          <span className="hero-caption">Collection Haute Cosmétique · Dès 150 €</span>
        </div>
      </section>

      {/* 3 Pillars / Values Section */}
      <section className="values-section">
        <div className="values-grid">
          <div className="value-card">
            <span className="value-icon">💎</span>
            <h3>Actifs Botaniques Rares</h3>
            <p>Cellules souches végétales, caviar marin et peptides biomimétiques à haute concentration.</p>
          </div>
          <div className="value-card">
            <span className="value-icon">✨</span>
            <h3>Efficacité Anti-Âge Prouvée</h3>
            <p>Résultats visibles sur la fermeté, la réduction des rides et l'éclat du teint dès 14 jours.</p>
          </div>
          <div className="value-card">
            <span className="value-icon">🎁</span>
            <h3>Livraison Express & Écrin Cadeau</h3>
            <p>Livraison offerte, échantillons haute cosmétique inclus et coffret d'exception offert.</p>
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className="manifesto">
        <p className="eyebrow">{settings.siteName || 'Maison Lune'} · L'Excellence Cosmétique</p>
        <h2>L'art de la régénération,<br /><em>au plus haut niveau.</em></h2>
        <p>
          Chaque formule est le fruit de plusieurs années de recherche en biotechnologie végétale. Nous sélectionnons des actifs d'une pureté absolue pour offrir aux femmes les soins anti-âge les plus performants et sensoriels.
        </p>
        <Link className="text-link" href="/boutique">Explorer tous nos soins de prestige <span>↗</span></Link>
      </section>

      {/* Featured Products Collection */}
      <section id="boutique-preview" className="products-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Soins Iconiques Plébiscités</p>
            <h2>Les Indispensables Beauté des Femmes</h2>
          </div>
          <Link className="text-link" href="/boutique">
            Voir la collection complète ({productsList.length} soins) <span>↗</span>
          </Link>
        </div>

        <div className="product-grid">
          {featuredProducts.map((product) => (
            <article className="product" key={product.id}>
              <div className="product-image">
                <ProductMediaCarousel
                  media={product.media}
                  images={product.images}
                  fallbackImage={product.image}
                  alt={product.name}
                  showBadge={product.tag}
                />
                <div className="product-overlay-buttons">
                  <button
                    className="quick-add"
                    onClick={() => handleAddToCart(product)}
                  >
                    Ajouter au panier +
                  </button>
                  <button
                    className="quick-buy"
                    onClick={() => handleBuyNow(product)}
                  >
                    Acheter maintenant ⚡
                  </button>
                </div>
              </div>
              <div className="product-meta">
                <div>
                  <span className="product-category-sub">{product.category}</span>
                  <h3>{product.name}</h3>
                  <p>{product.type}</p>
                </div>
                <strong className="product-price-tag">{product.price}</strong>
              </div>
              <div className="product-card-cta">
                <button
                  className="buy-now-card-btn"
                  onClick={() => handleBuyNow(product)}
                >
                  Acheter maintenant — {product.price}
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="view-all-wrapper">
          <Link href="/boutique" className="button dark">
            Accéder à toute la boutique de soins <span>→</span>
          </Link>
        </div>
      </section>

      {/* Atelier / Story Section */}
      <section id="histoire" className="story">
        <div className="story-image">
          <img src="https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=1100&q=85" alt="Laboratoire cosmétique de précision" />
        </div>
        <div className="story-copy">
          <p className="eyebrow">Excellence & Formulation</p>
          <h2>Des soins d'exception,<br /><em>conçus à Paris.</em></h2>
          <p>
            Dans notre laboratoire parisien, la haute technologie cosmétique rencontre la pureté botanique. Chaque pot et chaque flacon est rempli et scellé à la main, garantissant une fraîcheur et une efficacité inégalées.
          </p>
          <Link className="button outline" href="/boutique">
            Découvrir nos rituels de beauté <span>↗</span>
          </Link>
        </div>
      </section>

      {/* Customer Reviews Section */}
      <section className="testimonials-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Avis vérifiés de clientes</p>
            <h2>L'expérience Haute Cosmétique</h2>
          </div>
        </div>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="stars">★★★★★</div>
            <p>« La Crème Suprême a transformé ma peau en deux semaines. Mes rides d'expression sont visiblement lissées et mon teint n'a jamais été aussi lumineux. Un investissement indispensable. »</p>
            <strong>— Éléonore V., 48 ans, Paris</strong>
          </div>
          <div className="testimonial-card">
            <div className="stars">★★★★★</div>
            <p>« L'Élixir Cellulaire est un chef-d'œuvre. La texture pénètre immédiatement et lifte les traits sans effet collant. Le meilleur sérum anti-âge que j'ai utilisé. »</p>
            <strong>— Catherine B., 54 ans, Genève</strong>
          </div>
          <div className="testimonial-card">
            <div className="stars">★★★★★</div>
            <p>« Le Grand Coffret Rituel Prestige est somptueux. Les soins sont d'une efficacité spectaculaire et le packaging est un bijou dans la salle de bain. »</p>
            <strong>— Isabelle M., 42 ans, Monaco</strong>
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
              <ProductMediaCarousel
                media={product.media}
                images={product.images}
                fallbackImage={product.image}
                alt={product.name}
                aspectRatio="16 / 11"
                className="rounded-lg mb-3"
              />
              <p className="eyebrow">{customLabel}</p>
              <h3>{product.name}</h3>
              <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem' }}>
                {product.type || product.description} · {product.price}
              </p>
              <button
                className="buy-now-card-btn"
                onClick={() => handleBuyNow(product)}
                style={{ marginTop: '0.5rem' }}
              >
                Acheter maintenant — {product.price}
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Contact Section (Dynamique via les paramètres Admin) */}
      <section className="newsletter" style={{ background: '#20251f', color: '#f4f0e9' }}>
        <p className="eyebrow" style={{ color: '#b8c8a6' }}>Nous contacter</p>
        <h2 style={{ color: '#f4f0e9' }}>{settings.siteName || 'Maison Lune'} Paris</h2>
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
        <p className="eyebrow">Le Club Privilège {settings.siteName || 'Maison Lune'}</p>
        <h2>Recevez nos conseils de soin<br /><em>et invitations exclusives.</em></h2>
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

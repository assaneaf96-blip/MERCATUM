'use client'

import { useState, useEffect } from 'react'
import { Product } from '@/lib/products'
import { getSiteSettings, DEFAULT_SETTINGS, saveOrder, type SiteSettings } from '@/lib/store'
import { createOrderInDb } from '@/lib/supabaseService'

interface CheckoutModalProps {
  product: Product | null
  onClose: () => void
  onSuccess: (product: Product) => void
}

export default function CheckoutModal({ product, onClose, onSuccess }: CheckoutModalProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [copied, setCopied] = useState(false)
  const [orderRef, setOrderRef] = useState('')

  // Form states
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  useEffect(() => {
    setSettings(getSiteSettings())
  }, [])

  if (!product) return null

  const totalPrice = (product.rawPrice * quantity).toFixed(2).replace('.', ',') + ' €'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Génération d'une référence de commande unique
    const randomNum = Math.floor(100000 + Math.random() * 900000)
    const ref = `ML-${randomNum}`
    setOrderRef(ref)
    setConfirmed(true)

    // Enregistrer la commande dans le store local & Supabase
    const newOrder = {
      id: ref,
      customerName: fullName,
      customerEmail: email,
      customerPhone: phone,
      customerAddress: address,
      productId: product.id,
      productName: `${quantity}x ${product.name}`,
      totalPrice: product.rawPrice * quantity,
      currency: 'EUR',
      paymentMethod: 'Virement Bancaire',
      status: 'En attente de virement' as const,
      createdAt: new Date().toISOString(),
    }
    saveOrder(newOrder)
    createOrderInDb({
      id: ref,
      customerName: fullName,
      customerEmail: email,
      customerPhone: phone,
      customerAddress: address,
      productId: product.id,
      productName: `${quantity}x ${product.name}`,
      totalPrice: product.rawPrice * quantity,
    }).catch((err) => console.warn('Erreur Supabase sync order:', err))

    onSuccess(product)

    // Événements de conversion pour les pixels publicitaires
    const rawTotal = product.rawPrice * quantity
    if (typeof window !== 'undefined') {
      try {
        if (window.fbq) {
          window.fbq('track', 'Purchase', {
            value: rawTotal,
            currency: 'EUR',
            content_name: product.name,
            content_ids: [product.id],
            num_items: quantity,
          })
        }
        if (window.ttq) {
          window.ttq.track('CompletePayment', {
            content_id: product.id,
            content_name: product.name,
            quantity: quantity,
            value: rawTotal,
            currency: 'EUR',
          })
        }
        if (window.gtag) {
          window.gtag('event', 'purchase', {
            transaction_id: ref,
            value: rawTotal,
            currency: 'EUR',
            items: [{ item_id: product.id, item_name: product.name, price: product.rawPrice, quantity }],
          })
        }
      } catch {
        // Ignorer les erreurs de tracking
      }
    }
  }

  const handleCopyIban = () => {
    if (settings.bankIban && navigator.clipboard) {
      navigator.clipboard.writeText(settings.bankIban.replace(/\s+/g, ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: confirmed ? '520px' : '460px' }}
      >
        <button className="modal-close" onClick={onClose} aria-label="Fermer">✕</button>

        {confirmed ? (
          <div className="space-y-4 text-left">
            <div className="text-center pb-2">
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: '#20251f',
                  color: '#b8c8a6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  margin: '0 auto 12px',
                }}
              >
                ✓
              </div>
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', margin: '0 0 6px', color: '#20251f' }}>
                Commande Enregistrée !
              </h3>
              <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                Merci <strong>{fullName || 'Chère Cliente / Cher Client'}</strong>. Votre commande de{' '}
                <strong>{quantity}x {product.name}</strong> ({totalPrice}) est en attente de virement.
              </p>
            </div>

            {/* Encadré Coordonnées Bancaires */}
            <div
              style={{
                background: '#ffffff',
                border: '2px solid #b8c8a6',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 'bold', color: '#20251f' }}>
                  🏛️ Virement Bancaire
                </span>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                  Montant : {totalPrice}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888', display: 'block' }}>
                    Référence obligatoire à indiquer
                  </span>
                  <strong style={{ fontSize: '15px', color: '#991b1b', letterSpacing: '0.05em' }}>
                    {orderRef}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888', display: 'block' }}>
                    Bénéficiaire / Titulaire du compte
                  </span>
                  <strong style={{ color: '#20251f' }}>{settings.bankAccountHolder}</strong>
                </div>

                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888', display: 'block' }}>
                    Banque
                  </span>
                  <span style={{ color: '#20251f' }}>{settings.bankName}</span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888' }}>
                      IBAN
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyIban}
                      style={{
                        background: copied ? '#166534' : '#20251f',
                        color: '#f4f0e9',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '2px 8px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: '0.2s',
                      }}
                    >
                      {copied ? '✓ Copié !' : 'Copier l\'IBAN'}
                    </button>
                  </div>
                  <strong style={{ fontFamily: 'monospace', fontSize: '12px', color: '#20251f', letterSpacing: '0.05em', wordBreak: 'break-all' }}>
                    {settings.bankIban}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888', display: 'block' }}>
                    Code BIC / SWIFT
                  </span>
                  <strong style={{ fontFamily: 'monospace', fontSize: '12px', color: '#20251f' }}>
                    {settings.bankSwift}
                  </strong>
                </div>

                {settings.bankInstructions && (
                  <p style={{ fontSize: '11px', color: '#555', fontStyle: 'italic', margin: '4px 0 0', borderTop: '1px dashed #e5e5e5', paddingTop: '6px' }}>
                    💡 {settings.bankInstructions}
                  </p>
                )}
              </div>
            </div>

            <p style={{ fontSize: '11px', color: '#777', textAlign: 'center', margin: '8px 0 0' }}>
              📦 Votre colis sera préparé et expédié dès réception des fonds. Un récapitulatif a été noté pour votre adresse de livraison.
            </p>

            <div style={{ textAlign: 'center', paddingTop: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#20251f',
                  color: '#f4f0e9',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '10px 24px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                J'ai noté les coordonnées / Fermer
              </button>
            </div>
          </div>
        ) : (
          <div>
            <span className="modal-eyebrow">Paiement par virement bancaire</span>
            <h3 className="modal-title">Commander cet article</h3>

            <div className="modal-product-summary">
              <img
                src={product.image}
                alt={product.name}
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = '/placeholder.svg'
                }}
              />
              <div className="flex-1">
                <h4>{product.name}</h4>
                <p>{product.type}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="quantity-selector">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      -
                    </button>
                    <span>{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <span className="modal-product-price">{totalPrice}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Nom et Prénom *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ex: Sophie Laurent"
                />
              </div>

              <div className="form-group">
                <label>Adresse email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: sophie.laurent@gmail.com"
                />
              </div>

              <div className="form-group">
                <label>Téléphone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ex: +33 6 12 34 56 78"
                />
              </div>

              <div className="form-group">
                <label>Adresse complète de livraison *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Numéro, rue, code postal, ville"
                />
              </div>

              <div className="form-group">
                <label>Mode de règlement</label>
                <div
                  style={{
                    background: '#e8e2d6',
                    padding: '10px 14px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <span>🏛️ Virement Bancaire Sécurisé</span>
                  <strong>{totalPrice}</strong>
                </div>
                <span style={{ fontSize: '10px', color: '#666', marginTop: '4px', display: 'block' }}>
                  L'IBAN, le BIC et la référence de virement vous seront présentés à l'étape suivante.
                </span>
              </div>

              <button type="submit" className="button-confirm-buy" style={{ marginTop: '8px' }}>
                Valider ma commande ({totalPrice}) →
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

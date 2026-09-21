'use client'

import { useState, useEffect } from 'react'
import { Product, isVideoUrl } from '@/lib/products'
import { getSiteSettings, DEFAULT_SETTINGS, saveOrder, type SiteSettings } from '@/lib/store'
import { createOrderInDb } from '@/lib/supabaseService'
import { trackPixel } from '@/components/PixelTracker'

interface CheckoutModalProps {
  product: Product | null
  initialQuantity?: number
  onClose: () => void
  onSuccess: (product: Product) => void
}

export default function CheckoutModal({
  product,
  initialQuantity = 1,
  onClose,
  onSuccess,
}: CheckoutModalProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [quantity, setQuantity] = useState(initialQuantity)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [copied, setCopied] = useState(false)
  const [orderRef, setOrderRef] = useState('')

  useEffect(() => {
    if (initialQuantity) {
      setQuantity(initialQuantity)
    }
  }, [initialQuantity, product])

  useEffect(() => {
    setSettings(getSiteSettings())
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.settings) {
          setSettings(data.settings)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (product) {
      trackPixel('InitiateCheckout', {
        id: product.id,
        name: product.name,
        price: product.rawPrice * quantity,
        quantity,
      })
    }
  }, [product?.id])

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
    trackPixel('Purchase', {
      id: product.id,
      name: product.name,
      price: rawTotal,
      quantity,
      orderId: ref,
    })
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
        style={{
          maxWidth: confirmed ? '520px' : '460px',
          maxHeight: '92dvh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
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
                ¡Pedido Registrado con Éxito!
              </h3>
              <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                Gracias <strong>{fullName || 'Estimado/a Cliente/a'}</strong>. Su pedido de{' '}
                <strong>{quantity}x {product.name}</strong> ({totalPrice}) está pendiente de transferencia bancaria inmediata.
              </p>
            </div>

            {/* Alerta Transferencia Inmediata Requerida */}
            <div
              style={{
                background: '#fef2f2',
                border: '1.5px solid #ef4444',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '22px', lineHeight: 1 }}>⚡</span>
              <div>
                <strong style={{ fontSize: '12.5px', color: '#991b1b', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Aviso Importante: Transferencia Inmediata Requerida
                </strong>
                <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#7f1d1d', lineHeight: '1.45' }}>
                  Al emitir el pago desde su app bancaria o banca online, seleccione la opción <strong>&quot;Transferencia Inmediata&quot;</strong>. Así recibiremos los fondos en segundos y su pedido será preparado y enviado hoy mismo en 24/48h.
                </p>
              </div>
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
                  ⚡ Transferencia Inmediata
                </span>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#166534', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>
                  Importe : {totalPrice}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ background: '#f0fdf4', padding: '8px 10px', borderRadius: '4px', borderLeft: '3px solid #166534' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#166534', display: 'block', fontWeight: 700 }}>
                    Modalidad obligatoria
                  </span>
                  <strong style={{ fontSize: '12.5px', color: '#14532d' }}>
                    ⚡ Transferencia Inmediata (Acreditación al instante)
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888', display: 'block' }}>
                    Referencia obligatoria a indicar
                  </span>
                  <strong style={{ fontSize: '15px', color: '#991b1b', letterSpacing: '0.05em' }}>
                    {orderRef}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888', display: 'block' }}>
                    Beneficiario / Titular de la cuenta
                  </span>
                  <strong style={{ color: '#20251f' }}>{settings.bankAccountHolder}</strong>
                </div>

                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888', display: 'block' }}>
                    Banco
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
                      {copied ? '✓ ¡Copiado!' : 'Copiar IBAN'}
                    </button>
                  </div>
                  <strong style={{ fontFamily: 'monospace', fontSize: '12px', color: '#20251f', letterSpacing: '0.05em', wordBreak: 'break-all' }}>
                    {settings.bankIban}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888', display: 'block' }}>
                    Código BIC / SWIFT
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

            {/* Transmission du Justificatif de Virement */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '12px 14px',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '16px' }}>📄</span>
                <strong style={{ fontSize: '12px', color: '#1e293b' }}>
                  ¿Cómo enviar su justificante de pago?
                </strong>
              </div>
              <p style={{ fontSize: '11px', color: '#475569', margin: '0 0 10px', lineHeight: '1.4' }}>
                Una vez realizada la transferencia, envíenos su comprobante o captura con su referencia <strong>{orderRef}</strong>:
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  href={`mailto:${settings.contactEmail || 'contact@mercatum.fr'}?subject=${encodeURIComponent(`Justificante de transferencia - Pedido ${orderRef} - ${fullName}`)}&body=${encodeURIComponent(`Hola,\n\nAdjunto el justificante de transferencia bancaria para el pedido ${orderRef} por un importe de ${totalPrice}.\n\nNombre: ${fullName}\nTeléfono: ${phone}\nDirección de entrega: ${address}\n\nGracias.`)}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: '#1e293b',
                    color: '#ffffff',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textDecoration: 'none',
                    flex: '1',
                    minWidth: '160px',
                  }}
                >
                  ✉️ Enviar por correo electrónico
                </a>
                {settings.contactPhone && (
                  <a
                    href={`https://wa.me/${settings.contactPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola, aquí tiene mi comprobante de pago para el pedido ${orderRef} (${fullName} - ${totalPrice}).`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      background: '#166534',
                      color: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      textDecoration: 'none',
                      flex: '1',
                      minWidth: '160px',
                    }}
                  >
                    💬 Enviar por WhatsApp
                  </a>
                )}
              </div>
            </div>

            <p style={{ fontSize: '11px', color: '#777', textAlign: 'center', margin: '8px 0 0' }}>
              📦 Su paquete será preparado y enviado inmediatamente tras la validación de su transferencia.
            </p>

            <div style={{ textAlign: 'center', paddingTop: '12px', paddingBottom: '18px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#20251f',
                  color: '#f4f0e9',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px 24px',
                  fontSize: '12.5px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  width: '100%',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                He anotado los datos bancarios / Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div>
            <span className="modal-eyebrow">Pago por transferencia bancaria inmediata</span>
            <h3 className="modal-title">Comprar este artículo</h3>

            <div className="modal-product-summary">
              {isVideoUrl(product.image) ? (
                <video
                  src={product.image}
                  className="w-16 h-16 rounded object-cover flex-shrink-0"
                  muted
                  playsInline
                  autoPlay
                  loop
                />
              ) : (
                <img
                  src={product.image}
                  alt={product.name}
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = '/placeholder.svg'
                  }}
                />
              )}
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
                <label>Nombre y Apellidos *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej: Carlos García"
                />
              </div>

              <div className="form-group">
                <label>Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej: carlos.garcia@gmail.com"
                />
              </div>

              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej: +34 612 34 56 78"
                />
              </div>

              <div className="form-group">
                <label>Dirección completa de envío *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle, número, código postal, ciudad, provincia"
                />
              </div>

              <div className="form-group">
                <label>Método de pago</label>
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
                  <span>⚡ Transferencia Bancaria Inmediata</span>
                  <strong>{totalPrice}</strong>
                </div>

                <div
                  style={{
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '6px',
                    padding: '9px 12px',
                    marginTop: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontWeight: 'bold', fontSize: '11.5px', marginBottom: '2px' }}>
                    <span>⚠️</span>
                    <span>Modalidad requerida : Transferencia Inmediata</span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#92400e', lineHeight: '1.45', display: 'block' }}>
                    Para procesar y despachar su pedido en 24/48h sin esperas, deberá seleccionar la opción de <strong>Transferencia Inmediata</strong> al realizar el pago desde su app bancaria. El IBAN, BIC y número de referencia se le facilitarán en la siguiente pantalla.
                  </span>
                </div>
              </div>

              <button type="submit" className="button-confirm-buy" style={{ marginTop: '8px' }}>
                Confirmar mi pedido ({totalPrice}) →
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

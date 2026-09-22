'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  CartItem,
  getCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  getCartTotal,
  getCartConsolidatedProduct,
} from '@/lib/cart'
import { Product, isVideoUrl } from '@/lib/products'

interface CartModalProps {
  isOpen: boolean
  onClose: () => void
  onCheckout: (consolidatedProduct: Product) => void
}

export default function CartModal({ isOpen, onClose, onCheckout }: CartModalProps) {
  const [items, setItems] = useState<CartItem[]>([])

  const refreshItems = () => {
    setItems(getCart())
  }

  useEffect(() => {
    if (isOpen) {
      refreshItems()
      // Empêcher le défilement de la page en arrière-plan
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    const handleUpdate = () => {
      refreshItems()
    }
    window.addEventListener('mercatum:cart_updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('mercatum:cart_updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  if (!isOpen) return null

  const total = getCartTotal()
  const totalItemsCount = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0)

  const handleProceedCheckout = () => {
    const consolidated = getCartConsolidatedProduct()
    if (!consolidated) return
    onCheckout(consolidated)
  }

  return (
    <div
      className="fixed inset-0 z-[99999] flex justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Cesta de compra"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md h-full bg-[#faf8f5] text-stone-900 shadow-2xl flex flex-col border-l border-stone-200 animate-slideLeft"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl" aria-hidden="true">🛒</span>
            <h2 className="text-base font-bold tracking-wide uppercase text-stone-900 font-sans">
              Cesta de Compra
            </h2>
            <span className="bg-stone-900 text-stone-100 text-xs px-2 py-0.5 rounded-full font-semibold">
              {totalItemsCount}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition text-lg font-bold"
            aria-label="Cerrar cesta"
          >
            ✕
          </button>
        </div>

        {/* Promo bar */}
        <div className="bg-[#1c221d] text-[#f4f0e9] text-[11.5px] px-4 py-2 text-center font-medium flex items-center justify-center gap-2">
          <span>🚚</span>
          <span><strong>Envío gratis 24/48h</strong> en toda España · Garantía 2 años</span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-3xl mb-4">
                🛒
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-1">Tu cesta está vacía</h3>
              <p className="text-xs text-stone-600 max-w-xs mb-6 leading-relaxed">
                Descubra nuestra exclusiva selección de electrodomésticos, estufas, mobiliario y cuidado personal.
              </p>
              <Link
                href="/boutique"
                onClick={onClose}
                className="inline-flex items-center gap-2 bg-[#1c221d] text-[#f4f0e9] px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition shadow-md"
              >
                <span>Descubrir la tienda</span>
                <span>→</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const imgUrl =
                  (!isVideoUrl(item.product.image) && item.product.image) ||
                  (Array.isArray(item.product.images) && item.product.images.find((u) => !isVideoUrl(u))) ||
                  '/placeholder.svg'

                const itemPrice = Number(item.product.rawPrice) || 0
                const lineTotal = itemPrice * item.quantity

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-stone-200 rounded-xl p-3.5 flex gap-3.5 shadow-sm hover:border-stone-300 transition"
                  >
                    {/* Thumbnail */}
                    <div className="w-20 h-20 bg-stone-50 rounded-lg overflow-hidden border border-stone-100 flex-shrink-0 relative">
                      <Image
                        src={imgUrl}
                        alt={item.product.name}
                        fill
                        sizes="80px"
                        className="object-contain p-1"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/produit/${item.product.id}`}
                            onClick={onClose}
                            className="text-xs font-bold text-stone-900 hover:text-stone-600 transition line-clamp-2 leading-tight"
                          >
                            {item.product.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="text-stone-400 hover:text-red-600 transition text-sm p-0.5"
                            title="Eliminar artículo"
                            aria-label="Eliminar artículo"
                          >
                            🗑️
                          </button>
                        </div>

                        {/* Variants */}
                        {(item.selectedColor || item.selectedVolume) && (
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {item.selectedColor && (
                              <span className="text-[10px] font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
                                Color: {item.selectedColor}
                              </span>
                            )}
                            {item.selectedVolume && (
                              <span className="text-[10px] font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-200">
                                Formato: {item.selectedVolume}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Quantity and Price */}
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-100">
                        <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-stone-50">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-stone-200 transition font-bold text-xs"
                            aria-label="Disminuir cantidad"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-stone-900">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-stone-200 transition font-bold text-xs"
                            aria-label="Aumentar cantidad"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-stone-900 block">
                            {lineTotal.toFixed(2).replace('.', ',')} €
                          </span>
                          {item.quantity > 1 && (
                            <span className="text-[10px] text-stone-500 block">
                              ({itemPrice.toFixed(2).replace('.', ',')} € / ud.)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => clearCart()}
                  className="text-[11px] text-stone-500 hover:text-red-600 transition underline underline-offset-2"
                >
                  Vaciar cesta
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with totals and checkout */}
        {items.length > 0 && (
          <div className="p-5 bg-white border-t border-stone-200 space-y-3.5 shadow-lg">
            {/* Price lines */}
            <div className="space-y-1.5 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal ({totalItemsCount} artículos)</span>
                <span className="font-semibold text-stone-900">
                  {total.toFixed(2).replace('.', ',')} €
                </span>
              </div>
              <div className="flex justify-between items-center text-emerald-700">
                <span className="flex items-center gap-1">
                  <span>Envío asegurado 24/48h</span>
                </span>
                <span className="font-bold uppercase tracking-wider text-[11px]">
                  Gratis · 0,00 €
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-stone-200 text-stone-900">
                <span className="text-sm font-bold uppercase tracking-wide">Total a Pagar</span>
                <span className="text-xl font-black">
                  {total.toFixed(2).replace('.', ',')} €
                </span>
              </div>
            </div>

            {/* Trust badge */}
            <div className="flex items-center justify-center gap-2 text-[10.5px] text-stone-500 bg-stone-50 py-1.5 px-2 rounded-lg border border-stone-200">
              <span>🔒</span>
              <span>Pago 100% seguro por Transferencia Santander Oficial</span>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleProceedCheckout}
                className="w-full bg-[#1c221d] hover:bg-stone-800 text-[#f4f0e9] py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Tramitar Pedido / Pagar Ahora ⚡</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer"
              >
                Continuar comprando
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import { getSiteSettings, SiteSettings } from '@/lib/store'

declare global {
  interface Window {
    fbq?: any
    ttq?: any
    pintrk?: any
    dataLayer?: any[]
    gtag?: (...args: any[]) => void
  }
}

export function trackPixel(
  event: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase',
  data?: any
) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('mercatum:track_pixel', { detail: { event, data } }))
}

export default function PixelTracker() {
  const initializedRef = useRef(false)

  const initPixels = (settings: SiteSettings) => {
    if (initializedRef.current) return
    initializedRef.current = true

    // 1. Meta / Facebook Pixel
    const fbId = (settings.facebookPixelId || '').trim()
    if (fbId) {
      if (!window.fbq) {
        ;(function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
          if (f.fbq) return
          n = f.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
          }
          if (!f._fbq) f._fbq = n
          n.push = n
          n.loaded = !0
          n.version = '2.0'
          n.queue = []
          t = b.createElement(e)
          t.async = !0
          t.src = v
          s = b.getElementsByTagName(e)[0]
          s.parentNode.insertBefore(t, s)
        })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')

        if (window.fbq) {
          window.fbq('init', fbId)
          window.fbq('track', 'PageView')
        }
      }
    }

    // 2. TikTok Pixel
    const ttId = (settings.tiktokPixelId || '').trim()
    if (ttId) {
      if (!window.ttq) {
        ;(function (w: any, d: any, t: any) {
          w.TiktokAnalyticsObject = t
          var ttq = (w[t] = w[t] || [])
          ttq.methods = [
            'page',
            'track',
            'identify',
            'instances',
            'debug',
            'on',
            'off',
            'once',
            'ready',
            'alias',
            'group',
            'enableCookie',
            'disableCookie',
            'holdConsent',
            'revokeConsent',
            'grantConsent',
          ]
          ttq.setAndDefer = function (t: any, e: any) {
            t[e] = function () {
              t.push([e].concat(Array.prototype.slice.call(arguments, 0)))
            }
          }
          for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i])
          ttq.instance = function (t: any) {
            for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n])
            return e
          }
          ttq.load = function (e: any, n: any) {
            var r = 'https://analytics.tiktok.com/i18n/pixel/events.js',
              o = n && n.partner
            ttq._i = ttq._i || {}
            ttq._i[e] = []
            ttq._i[e]._u = r
            ttq._t = ttq._t || {}
            ttq._t[e] = +new Date()
            ttq._o = ttq._o || {}
            ttq._o[e] = o || {}
            n = document.createElement('script')
            n.type = 'text/javascript'
            n.async = !0
            n.src = r + '?sdkid=' + e + '&lib=' + t
            var s = document.getElementsByTagName('script')[0]
            s?.parentNode?.insertBefore(n, s)
          }

          ttq.load(ttId)
          ttq.page()
        })(window, document, 'ttq')
      }
    }

    // 3. Google Tag (gtag.js / Google Ads / GA4)
    const gId = (settings.googleTagId || '').trim()
    if (gId) {
      if (!window.gtag) {
        const script = document.createElement('script')
        script.async = true
        script.src = `https://www.googletagmanager.com/gtag/js?id=${gId}`
        document.head.appendChild(script)

        window.dataLayer = window.dataLayer || []
        window.gtag = function () {
          window.dataLayer?.push(arguments)
        }
        window.gtag('js', new Date())
        window.gtag('config', gId)
      }
    }

    // 4. Pinterest Tag
    const pinId = (settings.pinterestTagId || '').trim()
    if (pinId && !window.pintrk) {
      ;(function (e: any) {
        if (!e.pintrk) {
          e.pintrk = function () {
            e.pintrk.queue.push(Array.prototype.slice.call(arguments))
          }
          var n = window.pintrk
          ;(n.queue = []), (n.version = '3.0')
          var t = document.createElement('script')
          ;(t.async = !0), (t.src = 'https://s.pinimg.com/ct/core.js')
          var r = document.getElementsByTagName('script')[0]
          r?.parentNode?.insertBefore(t, r)
        }
      })(window)
      if (window.pintrk) {
        window.pintrk('load', pinId)
        window.pintrk('page')
      }
    }

    // 5. Custom Pixel Script / HTML Tags
    if (settings.customPixelScript && settings.customPixelScript.trim() !== '') {
      const scriptContent = settings.customPixelScript.trim()
      if (!document.getElementById('ml-custom-pixel')) {
        const container = document.createElement('div')
        container.id = 'ml-custom-pixel'
        container.style.display = 'none'

        if (!scriptContent.includes('<script')) {
          const scriptTag = document.createElement('script')
          scriptTag.textContent = scriptContent
          container.appendChild(scriptTag)
        } else {
          const range = document.createRange()
          const fragment = range.createContextualFragment(scriptContent)
          container.appendChild(fragment)
        }
        document.body.appendChild(container)
      }
    }
  }

  useEffect(() => {
    // Initialiser immédiatement avec les paramètres locaux si disponibles
    const local = getSiteSettings()
    if (local.facebookPixelId || local.tiktokPixelId || local.googleTagId || local.pinterestTagId) {
      initPixels(local)
    }

    // Charger les paramètres officiels depuis Supabase via /api/settings
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.settings) {
          initPixels(data.settings)
        }
      })
      .catch(() => {})

    // Écouter les événements de tracking custom
    const handlePixelEvent = (e: any) => {
      const { event, data } = e.detail || {}
      if (!event) return

      try {
        const val = Number(data?.price || data?.value || 0)
        const qty = Number(data?.quantity || 1)
        const itemId = String(data?.id || '')
        const itemName = String(data?.name || '')

        if (event === 'ViewContent') {
          window.fbq?.('track', 'ViewContent', {
            content_name: itemName,
            content_ids: itemId ? [itemId] : undefined,
            content_type: 'product',
            value: val,
            currency: 'EUR',
          })
          window.ttq?.track('ViewContent', {
            content_id: itemId,
            content_name: itemName,
            content_type: 'product',
            value: val,
            currency: 'EUR',
          })
          window.gtag?.('event', 'view_item', {
            currency: 'EUR',
            value: val,
            items: itemId ? [{ item_id: itemId, item_name: itemName, price: val }] : undefined,
          })
          window.pintrk?.('track', 'pagevisit', {
            line_items: itemId ? [{ product_name: itemName, product_id: itemId }] : undefined,
          })
        } else if (event === 'AddToCart') {
          window.fbq?.('track', 'AddToCart', {
            content_name: itemName,
            content_ids: itemId ? [itemId] : undefined,
            content_type: 'product',
            value: val,
            currency: 'EUR',
          })
          window.ttq?.track('AddToCart', {
            content_id: itemId,
            content_name: itemName,
            content_type: 'product',
            value: val,
            currency: 'EUR',
          })
          window.gtag?.('event', 'add_to_cart', {
            currency: 'EUR',
            value: val,
            items: itemId ? [{ item_id: itemId, item_name: itemName, price: val, quantity: qty }] : undefined,
          })
          window.pintrk?.('track', 'addtocart', {
            value: val,
            order_quantity: qty,
            currency: 'EUR',
          })
        } else if (event === 'InitiateCheckout') {
          window.fbq?.('track', 'InitiateCheckout', {
            content_name: itemName,
            content_ids: itemId ? [itemId] : undefined,
            value: val,
            currency: 'EUR',
            num_items: qty,
          })
          window.ttq?.track('InitiateCheckout', {
            content_id: itemId,
            content_name: itemName,
            value: val,
            currency: 'EUR',
            quantity: qty,
          })
          window.gtag?.('event', 'begin_checkout', {
            currency: 'EUR',
            value: val,
            items: itemId ? [{ item_id: itemId, item_name: itemName, price: val, quantity: qty }] : undefined,
          })
        } else if (event === 'Purchase') {
          window.fbq?.('track', 'Purchase', {
            value: val,
            currency: 'EUR',
            content_name: itemName,
            content_ids: itemId ? [itemId] : undefined,
            num_items: qty,
          })
          window.ttq?.track('CompletePayment', {
            content_id: itemId,
            content_name: itemName,
            quantity: qty,
            value: val,
            currency: 'EUR',
          })
          window.gtag?.('event', 'purchase', {
            transaction_id: data?.orderId || `ORDER_${Date.now()}`,
            value: val,
            currency: 'EUR',
            items: itemId ? [{ item_id: itemId, item_name: itemName, price: val, quantity: qty }] : undefined,
          })
          window.pintrk?.('track', 'checkout', {
            value: val,
            order_quantity: qty,
            currency: 'EUR',
            order_id: data?.orderId,
          })
        }
      } catch (err) {
        console.warn('Pixel tracking error:', err)
      }
    }

    window.addEventListener('mercatum:track_pixel', handlePixelEvent)
    return () => {
      window.removeEventListener('mercatum:track_pixel', handlePixelEvent)
    }
  }, [])

  return null
}


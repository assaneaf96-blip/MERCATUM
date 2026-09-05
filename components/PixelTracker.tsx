'use client'

import { useEffect } from 'react'
import { getSiteSettings } from '@/lib/store'

declare global {
  interface Window {
    fbq?: any
    ttq?: any
    dataLayer?: any[]
    gtag?: (...args: any[]) => void
  }
}

export default function PixelTracker() {
  useEffect(() => {
    const settings = getSiteSettings()

    // 1. Meta / Facebook Pixel
    if (settings.facebookPixelId && settings.facebookPixelId.trim() !== '') {
      const fbId = settings.facebookPixelId.trim()
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
    if (settings.tiktokPixelId && settings.tiktokPixelId.trim() !== '') {
      const ttId = settings.tiktokPixelId.trim()
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
    if (settings.googleTagId && settings.googleTagId.trim() !== '') {
      const gId = settings.googleTagId.trim()
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

    // 4. Custom Pixel Script / HTML Tags
    if (settings.customPixelScript && settings.customPixelScript.trim() !== '') {
      const scriptContent = settings.customPixelScript.trim()
      // Éviter la double injection
      if (!document.getElementById('ml-custom-pixel')) {
        const container = document.createElement('div')
        container.id = 'ml-custom-pixel'
        container.style.display = 'none'

        // Si c'est du pur code JS sans balises <script>
        if (!scriptContent.includes('<script')) {
          const scriptTag = document.createElement('script')
          scriptTag.textContent = scriptContent
          container.appendChild(scriptTag)
        } else {
          // Si le code contient des balises <script> ou HTML
          const range = document.createRange()
          const fragment = range.createContextualFragment(scriptContent)
          container.appendChild(fragment)
        }
        document.body.appendChild(container)
      }
    }
  }, [])

  return null
}

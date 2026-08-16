'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'

// ssr: false is ONLY valid inside Client Components — this wrapper exists for that reason.
// Both widgets use browser APIs (localStorage, window) so they must never SSR.
const WhatsAppButton = dynamic(
  () => import('@/components/whatsapp-button').then((m) => ({ default: m.WhatsAppButton })),
  { ssr: false, loading: () => null }
)

const ChatWidgetWrapper = dynamic(
  () => import('@/components/chat-widget-wrapper').then((m) => ({ default: m.ChatWidgetWrapper })),
  { ssr: false, loading: () => null }
)

const UnifiedWidget = dynamic(
  () => import('@/components/unified-widget').then((m) => ({ default: m.UnifiedWidget })),
  { ssr: false, loading: () => null }
)

const GoogleOneTap = dynamic(
  () => import('@/components/google-one-tap').then((m) => ({ default: m.GoogleOneTap })),
  { ssr: false, loading: () => null }
)


import { useState, useEffect } from 'react'

export function ClientWidgets() {
  const pathname = usePathname()
  const isAdminRoute = pathname.startsWith('/admin')
  const [shouldMount, setShouldMount] = useState(false)

  useEffect(() => {
    // Storefront assistance and sign-in widgets add no value inside the
    // authenticated admin. Avoid their timers, event listeners, and chunks.
    if (isAdminRoute) return

    // Delay loading heavy third-party-like widgets until 3s after initial paint.
    // This dramatically improves Time to Interactive (TTI) for the main page content.
    const timer = setTimeout(() => setShouldMount(true), 3000)
    
    // Mount immediately for an intentional interaction. Passive movement and
    // scrolling no longer trigger four widget chunks during a critical mobile
    // scroll frame; the short fallback still keeps every widget available.
    const handleInteraction = () => {
      setShouldMount(true)
      clearTimeout(timer)
      window.removeEventListener('pointerdown', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }

    window.addEventListener('pointerdown', handleInteraction, { passive: true, once: true })
    window.addEventListener('keydown', handleInteraction, { once: true })

    return () => {
      clearTimeout(timer)
      window.removeEventListener('pointerdown', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }
  }, [isAdminRoute])

  if (isAdminRoute || !shouldMount) return null

  return (
    <>
      <WhatsAppButton />
      <ChatWidgetWrapper />
      <UnifiedWidget />
      <GoogleOneTap />
    </>
  )
}

'use client'

import dynamic from 'next/dynamic'

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
  const [shouldMount, setShouldMount] = useState(false)

  useEffect(() => {
    // Delay loading heavy third-party-like widgets until 3s after initial paint.
    // This dramatically improves Time to Interactive (TTI) for the main page content.
    const timer = setTimeout(() => setShouldMount(true), 3000)
    
    // Also mount immediately if user interacts (scrolls, clicks, moves mouse)
    const handleInteraction = () => {
      setShouldMount(true)
      clearTimeout(timer)
      window.removeEventListener('scroll', handleInteraction)
      window.removeEventListener('mousemove', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
    }

    window.addEventListener('scroll', handleInteraction, { passive: true })
    window.addEventListener('mousemove', handleInteraction, { passive: true })
    window.addEventListener('touchstart', handleInteraction, { passive: true })

    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', handleInteraction)
      window.removeEventListener('mousemove', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
    }
  }, [])

  if (!shouldMount) return null

  return (
    <>
      <WhatsAppButton />
      <ChatWidgetWrapper />
      <UnifiedWidget />
      <GoogleOneTap />
    </>
  )
}

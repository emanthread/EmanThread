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


export function ClientWidgets() {
  return (
    <>
      <WhatsAppButton />
      <ChatWidgetWrapper />
      <UnifiedWidget />
      <GoogleOneTap />
    </>
  )
}

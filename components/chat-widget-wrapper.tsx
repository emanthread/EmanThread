'use client'

import { usePathname } from 'next/navigation'
import { ChatWidget } from './chat-widget'

/**
 * Renders the ChatWidget on all storefront pages.
 * Hidden on all /admin/* routes to avoid cluttering the admin panel.
 */
export function ChatWidgetWrapper() {
  const pathname = usePathname()

  // Hide on all admin routes
  if (pathname.startsWith('/admin')) return null

  return <ChatWidget />
}

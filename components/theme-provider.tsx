'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

// Workaround for React 19 / Next.js 15 script tag warning with next-themes
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const orig = console.error
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag while rendering React component')) {
      return
    }
    orig.apply(console, args)
  }
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

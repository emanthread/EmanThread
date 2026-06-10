import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely extract the first product image URL.
 * Returns a fallback placeholder when images array is empty, null, or undefined.
 */
export function getProductImage(images: string[] | undefined | null, fallback = '/placeholder.jpg'): string {
  if (!images || images.length === 0) return fallback
  return images[0] || fallback
}

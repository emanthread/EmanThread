import { prisma } from '@/lib/db'

// ── Intent extraction ────────────────────────────────────────────
export function extractSearchIntent(message: string, activeFabricTypes: string[] = []): {
  type: 'product' | 'order' | 'shipping' | 'payment' | 'return' | 'general'
  keywords: string[]
  orderNumber?: string
} {
  const lower = message.toLowerCase()

  // Check for order inquiry
  const orderMatch = message.match(/(?:order|#)\s*([A-Z0-9-]{6,})/i)
  if (orderMatch || (lower.includes('order') && lower.includes('status'))) {
    return {
      type: 'order',
      keywords: [],
      orderNumber: orderMatch?.[1],
    }
  }

  // Check for shipping inquiry
  if (lower.includes('shipping') || lower.includes('delivery') || lower.includes('ship') || 
      lower.includes('shipping rate') || lower.includes('delivery time') || lower.includes('shipping cost') ||
      lower.includes('free shipping') || lower.includes('track') || lower.includes('tracking') ||
      lower.includes('shipping zone')) {
    return { type: 'shipping', keywords: [] }
  }

  // Check for payment inquiry
  if (lower.includes('payment') || lower.includes('pay') || lower.includes('cod') || 
      lower.includes('meezan') || lower.includes('nayapay') || lower.includes('bank transfer') ||
      lower.includes('screenshot') || lower.includes('upload') || lower.includes('verify') ||
      lower.includes('how to pay') || lower.includes('payment method')) {
    return { type: 'payment', keywords: [] }
  }

  // Check for return inquiry
  if (lower.includes('return') || lower.includes('refund') || lower.includes('exchange') ||
      lower.includes('cancel')) {
    return { type: 'return', keywords: [] }
  }

  // Check for product inquiry — check DB fabric types + hardcoded fallbacks
  const productKeywords = [
    'fabric', 'product', 'suit', 'kameez',
    'price', 'available', 'stock', 'show me', 'do you have',
    'color', 'colour', 'what do you have',
  ]
  // Add active fabric type names in lowercase
  activeFabricTypes.forEach((ft) => {
    if (!productKeywords.includes(ft.toLowerCase())) {
      productKeywords.push(ft.toLowerCase())
    }
  })
  // Always include common hardcoded ones as fallback
  const fallbackFabricKeywords = ['boski', 'cotton', 'wash', 'khaddar', 'wool']
  fallbackFabricKeywords.forEach((kw) => {
    if (!productKeywords.includes(kw)) productKeywords.push(kw)
  })

  const isProductQuery = productKeywords.some((kw) => lower.includes(kw))

  if (isProductQuery) {
    const fabricTypes: string[] = []
    // Check against active DB fabric types first, then fallback
    if (lower.includes('boski')) fabricTypes.push('BOSKI')
    if (lower.includes('cotton')) fabricTypes.push('COTTON')
    if (lower.includes('wash')) fabricTypes.push('WASH_AND_WEAR')
    if (lower.includes('khaddar')) fabricTypes.push('KHADDAR')
    if (lower.includes('wool')) fabricTypes.push('WOOL_BLEND')
    // Also check dynamic fabric types
    activeFabricTypes.forEach((ft) => {
      const slug = ft.toLowerCase().replace(/\s+/g, '')
      if (lower.includes(slug) && !fabricTypes.includes(ft.toUpperCase().replace(/\s+/g, '_'))) {
        fabricTypes.push(ft.toUpperCase().replace(/\s+/g, '_'))
      }
    })

    return { type: 'product', keywords: fabricTypes }
  }

  return { type: 'general', keywords: [] }
}

// ── Active fabric types from DB ───────────────────────────────────
export async function getActiveFabricTypes(): Promise<string[]> {
  try {
    const fabricTypes = await prisma.fabricType.findMany({
      where: { isActive: true },
      select: { name: true },
    })
    return fabricTypes.map((ft) => ft.name)
  } catch {
    return ['Cotton', 'Wash & Wear', 'Boski', 'Wool Blend', 'Khaddar']
  }
}

// ── Shipping zones context ────────────────────────────────────────
export async function getShippingZoneContext(): Promise<string> {
  try {
    const zones = await prisma.shippingZone.findMany({
      where: { isActive: true },
      orderBy: { shippingRate: 'asc' },
    })

    if (zones.length === 0) {
      return 'No shipping zones configured in the database.'
    }

    const zoneList = zones
      .map((z) => {
        const cities = z.cities ? (JSON.parse(z.cities) as string[]).join(', ') : ''
        const provinces = z.provinces ? (JSON.parse(z.provinces) as string[]).join(', ') : ''
        return `
Zone: ${z.name}
Cities: ${cities || 'All cities in province'}
Provinces: ${provinces || 'All'}
Rate: PKR ${z.shippingRate.toString()}
Estimated Delivery: ${z.estimatedDays || 'N/A'}
        `.trim()
      })
      .join('\n\n---\n\n')

    return zoneList
  } catch {
    return ''
  }
}

// ── Store config context ──────────────────────────────────────────
export async function getStoreConfigContext(): Promise<string> {
  try {
    const configs = await prisma.storeConfig.findMany()

    if (configs.length === 0) {
      return ''
    }

    const configList = configs
      .map((c) => `${c.key}: ${c.value}`)
      .join('\n')

    return configList
  } catch {
    return ''
  }
}

// ── Product search ───────────────────────────────────────────────
export async function searchProductsForChat(keywords: string[]): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { inStock: true }

    if (keywords.length > 0) {
      where.fabricType = { in: keywords }
    }

    const products = await prisma.product.findMany({
      where,
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        name: true,
        fabricType: true,
        price: true,
        originalPrice: true,
        color: true,
        description: true,
        badge: true,
        inStock: true,
        stockQuantity: true,
      },
    })

    if (products.length === 0) {
      return 'No matching products found in our current inventory.'
    }

    const productList = products
      .map((p) =>
        `
Product: ${p.name}
Fabric: ${p.fabricType.replace(/_/g, ' ')}
Color: ${p.color}
Price: PKR ${p.price.toString()}${p.originalPrice ? ` (was PKR ${p.originalPrice.toString()})` : ''}
Status: ${p.inStock ? `In Stock (${p.stockQuantity ?? 'available'} units)` : 'Out of Stock'}
${p.badge ? `Badge: ${p.badge}` : ''}
Description: ${p.description}
      `.trim()
      )
      .join('\n\n---\n\n')

    return productList
  } catch {
    return ''
  }
}

// ── Order search ─────────────────────────────────────────────────
export async function searchOrderForChat(
  orderNumber: string,
  userId?: string
): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (orderNumber) {
      where.orderNumber = { contains: orderNumber.toUpperCase() }
    }

    if (userId) {
      where.userId = userId
    }

    const order = await prisma.order.findFirst({
      where,
      include: {
        items: {
          include: {
            product: { select: { name: true, fabricType: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!order) {
      return 'No order found with that order number.'
    }

    const items = order.items
      .map(
        (i) =>
          `- ${i.product.name} (${i.product.fabricType}) x${i.quantity} @ PKR ${i.priceAtTimeOfPurchase.toString()}`
      )
      .join('\n')

    return `
Order Number: ${order.orderNumber}
Status: ${order.status}
Payment: ${order.paymentMethod} — ${order.paymentStatus}
Total: PKR ${order.grandTotal.toString()}
Items:
${items}
Order Date: ${order.createdAt.toLocaleDateString('en-PK')}
    `.trim()
  } catch {
    return ''
  }
}

// ── Main: build DB context for a message ─────────────────────────
export async function getDBContextForMessage(
  message: string,
  userId?: string
): Promise<string> {
  const activeFabricTypes = await getActiveFabricTypes()
  const intent = extractSearchIntent(message, activeFabricTypes)

  const contextParts: string[] = []

  if (intent.type === 'product') {
    const data = await searchProductsForChat(intent.keywords)
    if (data) contextParts.push(`[STORE DATA — Products]\n${data}`)
  }

  if (intent.type === 'order') {
    if (!intent.orderNumber && !userId) {
      return '' // Ask user for order number
    }
    const data = await searchOrderForChat(intent.orderNumber ?? '', userId)
    if (data) contextParts.push(`[STORE DATA — Order]\n${data}`)
  }

  if (intent.type === 'shipping') {
    const zones = await getShippingZoneContext()
    if (zones) contextParts.push(`[STORE DATA — Shipping Zones]\n${zones}`)
  }

  if (intent.type === 'payment') {
    // Return the accepted payment methods from store config context
    contextParts.push(`[STORE DATA — Payment Info]\nAccepted Payment Methods: Cash on Delivery (COD), Meezan Bank (bank transfer + screenshot verification), Nayapay (app payment + screenshot verification). For Meezan Bank and Nayapay: The customer must make the payment, upload the screenshot from their account dashboard, and the admin team will review and verify before processing the order.`)
  }

  if (intent.type === 'return') {
    const config = await getStoreConfigContext()
    if (config) contextParts.push(`[STORE DATA — Store Config]\n${config}`)
    // Append generic return info if config is empty
    if (!config) {
      contextParts.push(`[STORE DATA — Returns]\nReturn policy is configured in the admin panel. The customer should log into their account and initiate a return from the orders section. The admin team will review and process it.`)
    }
  }

  return contextParts.join('\n\n')
}
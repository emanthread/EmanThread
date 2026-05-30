import { prisma } from '@/lib/db'

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

// ── Intent extraction ────────────────────────────────────────────
export function extractSearchIntent(
  message: string,
  activeFabricTypes: string[] = []
): {
  type: 'product' | 'order' | 'shipping' | 'payment' | 'return' | 'general'
  keywords: string[]        // fabric type filters
  nameSearch?: string       // free-text name search
  colorSearch?: string      // color filter
  orderNumber?: string
} {
  const lower = message.toLowerCase().trim()

  // ── 1. Order inquiry ──────────────────────────────────────────
  const orderMatch = message.match(/(?:order|#)\s*([A-Z0-9-]{6,})/i)
  if (
    orderMatch ||
    (lower.includes('order') && lower.includes('status')) ||
    lower.includes('mera order') ||
    lower.includes('my order') ||
    lower.includes('order number') ||
    lower.includes('order ka status')
  ) {
    return {
      type: 'order',
      keywords: [],
      orderNumber: orderMatch?.[1],
    }
  }

  // ── 2. Shipping inquiry ───────────────────────────────────────
  if (
    lower.includes('shipping') ||
    lower.includes('delivery') ||
    lower.includes('deliver') ||
    lower.includes('ship') ||
    lower.includes('shipping rate') ||
    lower.includes('delivery time') ||
    lower.includes('shipping cost') ||
    lower.includes('free shipping') ||
    lower.includes('track') ||
    lower.includes('tracking') ||
    lower.includes('shipping zone') ||
    lower.includes('kitne din') ||
    lower.includes('kab ayega') ||
    lower.includes('parcel') ||
    lower.includes('courier')
  ) {
    return { type: 'shipping', keywords: [] }
  }

  // ── 3. Payment inquiry ────────────────────────────────────────
  if (
    lower.includes('payment') ||
    lower.includes('pay karna') ||
    lower.includes('pay kar') ||
    lower.includes('cod') ||
    lower.includes('meezan') ||
    lower.includes('nayapay') ||
    lower.includes('bank transfer') ||
    lower.includes('screenshot') ||
    lower.includes('upload') ||
    lower.includes('verify') ||
    lower.includes('how to pay') ||
    lower.includes('payment method') ||
    lower.includes('kaise pay') ||
    lower.includes('payment kaise') ||
    (lower.includes('pay') && !lower.includes('product'))
  ) {
    return { type: 'payment', keywords: [] }
  }

  // ── 4. Return/refund inquiry ──────────────────────────────────
  if (
    lower.includes('return') ||
    lower.includes('refund') ||
    lower.includes('exchange') ||
    lower.includes('cancel') ||
    lower.includes('wapas') ||
    lower.includes('vapas') ||
    lower.includes('badlna') ||
    lower.includes('badal')
  ) {
    return { type: 'return', keywords: [] }
  }

  // ── 5. Product inquiry ────────────────────────────────────────
  // Build the full set of recognized product-related keywords
  const productTriggers = [
    // English
    'fabric', 'product', 'suit', 'kameez', 'shalwar', 'cloth', 'clothes', 'collection',
    'price', 'pricing', 'cost', 'rate', 'available', 'availability', 'in stock', 'out of stock',
    'stock', 'show me', 'do you have', 'what do you have', 'what do you sell',
    'color', 'colour', 'colours', 'colors',
    'buy', 'purchase', 'order', 'add to cart',
    'cheapest', 'cheap', 'affordable', 'expensive', 'budget',
    'new', 'latest', 'trending', 'popular', 'best', 'featured',
    'discount', 'sale', 'offer', 'deal',
    'formal', 'casual', 'wedding', 'party', 'summer', 'winter',
    // Roman Urdu
    'kapra', 'kapray', 'kaprhe', 'dikhao', 'dikhayen', 'dikhayn',
    'kya hai', 'kya hain', 'kya milta', 'milta hai', 'milti hai',
    'suit dikhao', 'fabric dikhao', 'price kya', 'kitna', 'kitne',
    'mahenga', 'sasta', 'sasta suit', 'sasta kapra',
    'range', 'designs', 'design', 'rang', 'color kya', 'colours kya',
    'nayi collection', 'naya', 'nayi',
  ]

  // Inject active fabric type names as additional triggers
  activeFabricTypes.forEach((ft) => {
    const lower_ft = ft.toLowerCase()
    if (!productTriggers.includes(lower_ft)) productTriggers.push(lower_ft)
  })

  // Always include fallback fabric keywords
  const fallbackFabricKeywords = ['boski', 'cotton', 'wash', 'khaddar', 'wool']
  fallbackFabricKeywords.forEach((kw) => {
    if (!productTriggers.includes(kw)) productTriggers.push(kw)
  })

  const isProductQuery = productTriggers.some((kw) => lower.includes(kw))

  if (isProductQuery) {
    // Extract fabric type filters
    const fabricTypes: string[] = []

    // Check active DB fabric types
    activeFabricTypes.forEach((ft) => {
      const slug = ft.toLowerCase().replace(/\s+/g, '')
      if (
        lower.includes(ft.toLowerCase()) ||
        lower.includes(slug)
      ) {
        const key = ft.toUpperCase().replace(/\s+/g, '_')
        if (!fabricTypes.includes(key)) fabricTypes.push(key)
      }
    })

    // Also check hardcoded fabric type slug mapping
    const fabricSlugMap: Record<string, string> = {
      boski: 'BOSKI',
      cotton: 'COTTON',
      'wash & wear': 'WASH_AND_WEAR',
      'wash and wear': 'WASH_AND_WEAR',
      wash: 'WASH_AND_WEAR',
      khaddar: 'KHADDAR',
      wool: 'WOOL_BLEND',
      'wool blend': 'WOOL_BLEND',
    }
    for (const [kw, fabricKey] of Object.entries(fabricSlugMap)) {
      if (lower.includes(kw) && !fabricTypes.includes(fabricKey)) {
        fabricTypes.push(fabricKey)
      }
    }

    // Extract color hints
    const colorKeywords = [
      'white', 'black', 'blue', 'red', 'green', 'grey', 'gray', 'beige',
      'brown', 'navy', 'cream', 'off-white', 'maroon', 'pink', 'golden',
      'sufaid', 'kala', 'neela', 'lal', 'hara', 'grey', 'dhani',
    ]
    let colorSearch: string | undefined
    for (const color of colorKeywords) {
      if (lower.includes(color)) {
        colorSearch = color
        break
      }
    }

    // Extract potential product name hints (remove common trigger words to get meaningful keywords)
    const stopWords = new Set([
      'show', 'me', 'tell', 'about', 'do', 'you', 'have', 'what', 'are', 'your',
      'a', 'an', 'the', 'in', 'is', 'it', 'i', 'want', 'need', 'please', 'can',
      'suit', 'fabric', 'product', 'kya', 'hai', 'hain', 'mujhe', 'dikhao',
      'price', 'kya', 'aap', 'ke', 'pas', 'check', 'look', 'for',
    ])
    const words = lower.split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w))
    const nameSearch = words.length > 0 ? words.join(' ') : undefined

    return {
      type: 'product',
      keywords: fabricTypes,
      nameSearch,
      colorSearch,
    }
  }

  // ── 6. General (fallback) ─────────────────────────────────────
  return { type: 'general', keywords: [] }
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
export async function searchProductsForChat(
  keywords: string[],
  nameSearch?: string,
  colorSearch?: string,
  limit = 6
): Promise<string> {
  try {
    // Build the WHERE clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseWhere: any = { inStock: true }

    // If fabric types were detected, filter by those
    if (keywords.length > 0) {
      baseWhere.fabricType = { in: keywords }
    }

    // If a color was detected, filter by color (case-insensitive contains)
    if (colorSearch) {
      baseWhere.color = { contains: colorSearch, mode: 'insensitive' }
    }

    let products = await prisma.product.findMany({
      where: baseWhere,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        name: true,
        slug: true,
        sku: true,
        fabricType: true,
        price: true,
        originalPrice: true,
        color: true,
        description: true,
        badge: true,
        inStock: true,
        stockQuantity: true,
        tags: true,
      },
    })

    // If name/text search terms exist, also try a name-based search to enrich results
    if (nameSearch && nameSearch.trim().length > 2) {
      const nameResults = await prisma.product.findMany({
        where: {
          inStock: true,
          OR: [
            { name: { contains: nameSearch, mode: 'insensitive' } },
            { description: { contains: nameSearch, mode: 'insensitive' } },
            { tags: { contains: nameSearch, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          name: true,
          slug: true,
          sku: true,
          fabricType: true,
          price: true,
          originalPrice: true,
          color: true,
          description: true,
          badge: true,
          inStock: true,
          stockQuantity: true,
          tags: true,
        },
      })

      // Merge results: prefer name matches, deduplicate by SKU
      const seenSkus = new Set(products.map((p) => p.sku))
      for (const p of nameResults) {
        if (!seenSkus.has(p.sku)) {
          seenSkus.add(p.sku)
          products.push(p)
        }
      }

      // Cap at limit
      products = products.slice(0, limit)
    }

    // If still no results and we had fabric filters, widen search without color/name constraints
    if (products.length === 0 && (keywords.length > 0 || colorSearch)) {
      products = await prisma.product.findMany({
        where: { inStock: true },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          name: true,
          slug: true,
          sku: true,
          fabricType: true,
          price: true,
          originalPrice: true,
          color: true,
          description: true,
          badge: true,
          inStock: true,
          stockQuantity: true,
          tags: true,
        },
      })
    }

    if (products.length === 0) {
      return 'No matching products found in our current inventory.'
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://emanthread.com'

    const productList = products
      .map((p) => {
        const productUrl = p.slug
          ? `${siteUrl}/product/${p.slug}`
          : `${siteUrl}/shop`
        const discountNote =
          p.originalPrice && Number(p.originalPrice) > Number(p.price)
            ? ` (was PKR ${p.originalPrice.toString()} — SALE!)`
            : ''
        return `
Product: ${p.name}
Fabric: ${p.fabricType.replace(/_/g, ' ')}
Color: ${p.color}
Price: PKR ${p.price.toString()}${discountNote}
Status: ${p.inStock ? `In Stock (${p.stockQuantity ?? 'available'} units)` : 'Out of Stock'}
${p.badge ? `Badge: ${p.badge}` : ''}
Description: ${p.description}
Link: ${productUrl}
        `.trim()
      })
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

// ── General product overview (for browsing/general queries) ────────
export async function getGeneralProductOverview(): Promise<string> {
  try {
    // Get fabric type summary with counts and price ranges
    const summary = await prisma.product.groupBy({
      by: ['fabricType'],
      where: { inStock: true },
      _count: { fabricType: true },
      _min: { price: true },
      _max: { price: true },
    })

    if (summary.length === 0) {
      return ''
    }

    const lines = summary.map(
      (s) =>
        `${s.fabricType.replace(/_/g, ' ')}: ${s._count.fabricType} products, PKR ${s._min.price?.toString()} – PKR ${s._max.price?.toString()}`
    )

    return `Currently In Stock by Fabric Type:\n${lines.join('\n')}`
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
    const data = await searchProductsForChat(
      intent.keywords,
      intent.nameSearch,
      intent.colorSearch
    )
    if (data) contextParts.push(`[STORE DATA — Products]\n${data}`)
  }

  if (intent.type === 'order') {
    if (!intent.orderNumber && !userId) {
      return '' // Ask user for order number — AI system prompt handles this
    }
    const data = await searchOrderForChat(intent.orderNumber ?? '', userId)
    if (data) contextParts.push(`[STORE DATA — Order]\n${data}`)
  }

  if (intent.type === 'shipping') {
    const zones = await getShippingZoneContext()
    if (zones) contextParts.push(`[STORE DATA — Shipping Zones]\n${zones}`)
  }

  if (intent.type === 'payment') {
    contextParts.push(
      `[STORE DATA — Payment Info]\nAccepted Payment Methods: Cash on Delivery (COD), Meezan Bank (bank transfer + screenshot verification), Nayapay (app payment + screenshot verification). For Meezan Bank and Nayapay: The customer must make the payment, upload the screenshot from their account dashboard, and the admin team will review and verify before processing the order.`
    )
  }

  if (intent.type === 'return') {
    const config = await getStoreConfigContext()
    if (config) {
      contextParts.push(`[STORE DATA — Store Config]\n${config}`)
    } else {
      contextParts.push(
        `[STORE DATA — Returns]\nReturn policy is configured in the admin panel. The customer should log into their account and initiate a return from the orders section. The admin team will review and process it.`
      )
    }
  }

  if (intent.type === 'general') {
    // For general browsing questions, provide an overview of what's in stock
    const overview = await getGeneralProductOverview()
    if (overview) contextParts.push(`[STORE DATA — Inventory Overview]\n${overview}`)
  }

  return contextParts.join('\n\n')
}
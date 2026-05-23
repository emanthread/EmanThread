import { prisma } from '@/lib/db'

// ── Intent extraction ────────────────────────────────────────────
export function extractSearchIntent(message: string): {
  type: 'product' | 'order' | 'general'
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

  // Check for product inquiry
  const productKeywords = [
    'fabric', 'product', 'suit', 'kameez', 'boski',
    'cotton', 'wash wear', 'wash & wear', 'khaddar', 'wool', 'price',
    'available', 'stock', 'show me', 'do you have', 'color', 'colour',
  ]
  const isProductQuery = productKeywords.some((kw) => lower.includes(kw))

  if (isProductQuery) {
    const fabricTypes: string[] = []
    if (lower.includes('boski')) fabricTypes.push('BOSKI')
    if (lower.includes('cotton')) fabricTypes.push('COTTON')
    if (lower.includes('wash')) fabricTypes.push('WASH_AND_WEAR')
    if (lower.includes('khaddar')) fabricTypes.push('KHADDAR')
    if (lower.includes('wool')) fabricTypes.push('WOOL_BLEND')

    return { type: 'product', keywords: fabricTypes }
  }

  return { type: 'general', keywords: [] }
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
  const intent = extractSearchIntent(message)

  if (intent.type === 'product') {
    const data = await searchProductsForChat(intent.keywords)
    return data ? `[STORE DATA — Products]\n${data}` : ''
  }

  if (intent.type === 'order') {
    if (!intent.orderNumber && !userId) {
      return '' // Ask user for order number
    }
    const data = await searchOrderForChat(intent.orderNumber ?? '', userId)
    return data ? `[STORE DATA — Order]\n${data}` : ''
  }

  return '' // General question — use system prompt only
}

// DeepSeek API is OpenAI-compatible — using openai package with custom baseURL
import OpenAI from 'openai'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { CHAT_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT_URDU } from '@/lib/chat-system-prompt'
import { getDBContextForMessage, getStructuredChatData } from '@/lib/chat-db-search'
import { checkRateLimit } from '@/lib/rate-limiter'
import { validateCsrf } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

// Lazy-initialize client inside handler to avoid module-level crash when key is empty
function getClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured.')
  }
  return new OpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com',
  })
}

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(2000),
})

const requestSchema = z.object({
  messages: z.array(messageSchema).max(20),
  language: z.enum(['en', 'ur']).default('en'),
})

export async function POST(request: Request) {
  // Handle preflight CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_URL || 'https://emanthread.com',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  // Check API key is configured
  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json(
      { reply: "Chat is temporarily unavailable. Please contact us on WhatsApp." },
      { status: 200 }
    )
  }

  // ── CSRF protection ────────────────────────────────────────────
  try {
    await validateCsrf(request)
  } catch {
    return NextResponse.json({ error: 'Forbidden: invalid CSRF token' }, { status: 403 })
  }

  // ── Rate limiting ──────────────────────────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous'
  const rateLimitResult = checkRateLimit(`chat:${ip}`, {
    windowMs: 60_000,
    maxRequests: parseInt(process.env.API_RATE_LIMIT_CHAT || '20', 10),
    keyPrefix: 'chat',
  })

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { reply: "You're sending messages too quickly. Please wait a moment before sending another message." },
      { status: 200 }
    )
  }

  try {
    const body = await request.json()
    const { messages, language } = requestSchema.parse(body)

    // Get current user session (optional — used for order lookup)
    const session = await auth()
    const userId = session?.user?.id

    // Get the latest user message for RAG context
    const latestMessage = messages[messages.length - 1]?.content ?? ''

    // Option 1: Search DB for relevant context (RAG)
    const dbContext = await getDBContextForMessage(latestMessage, userId)

    // Option 2: Get structured data for the frontend (product cards, recs, payment verification)
    const structuredData = await getStructuredChatData(latestMessage, userId)

    // Pick system prompt based on chosen language
    const basePrompt = language === 'ur' ? CHAT_SYSTEM_PROMPT_URDU : CHAT_SYSTEM_PROMPT

    // Build final system prompt = base policies + real DB data
    const systemPrompt = dbContext
      ? `${basePrompt}\n\n${dbContext}`
      : basePrompt

    // Call DeepSeek — same interface as OpenAI SDK with timeout
    const client = getClient()
    const response = await Promise.race([
      client.chat.completions.create({
        model: 'deepseek-chat',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 15000)
      ),
    ])

    const rawReply =
      response.choices[0]?.message?.content ??
      'Sorry, I could not process that. Please try again.'
    // Safety net: strip any remaining Markdown formatting the AI may still generate
    const reply = rawReply.replace(/\*{1,2}/g, '')

    // Return both the AI reply AND structured data for the frontend
    return NextResponse.json({
      reply,
      products: structuredData.products,
      recommendations: structuredData.recommendations,
      paymentVerification: structuredData.paymentVerification,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    console.error('[Chat API] Error:', error)
    // Always return 200 — never expose raw API errors to customers
    return NextResponse.json(
      {
        reply:
          "Sorry, I'm having trouble right now. Please contact us on WhatsApp for immediate assistance.",
        products: [],
        recommendations: [],
        paymentVerification: '',
      },
      { status: 200 }
    )
  }
}
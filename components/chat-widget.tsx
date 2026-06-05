'use client'

import { useState, useRef, useEffect, useCallback, FormEvent } from 'react'
import { MessageCircle, X, Send, User } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────
type Language = 'en' | 'ur'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ProductCard {
  name: string
  slug: string
  sku: string
  fabricType: string
  price: string
  originalPrice?: string
  color: string
  colorHex?: string
  image: string
  link: string
  badge?: string | null
  inStock: boolean
  stockQuantity?: number | null
}

interface ChatResponse {
  reply: string
  products: ProductCard[]
  recommendations: ProductCard[]
  paymentVerification: string
}

// ── Language config ───────────────────────────────────────────────
const LANG_CONFIG = {
  en: {
    label: 'English',
    flag: '🇬🇧',
    greeting:
      "Hello! I'm your Eman Threads assistant. How can I help you today? I can help with products, orders, shipping, payments, or anything else!",
    placeholder: 'Type your message...',
    quickReplies: [
      'Show me your fabrics',
      'What are your shipping rates?',
      'How do I return an item?',
    ],
    subtitle: 'AI Assistant - Eman Thread',
    sendLabel: 'Send',
    chooseLang: 'Choose your language',
    langPrompt: '',
    viewProduct: 'View',
    recommendations: 'Recommended for you',
    paymentVerification: 'Payment Status',
  },
  ur: {
    label: 'Roman Urdu',
    flag: '🇵🇰',
    greeting:
      'Assalam o Alaikum! Main Eman Threads ki assistant hoon. Aaj main aap ki kya madad kar sakti hoon? Products, orders, shipping, payment — sab ke baare mein pooch sakte hain!',
    placeholder: 'Apna sawal likhein...',
    quickReplies: [
      'Fabrics dikhao',
      'Shipping rates kya hain?',
      'Return kaise karoon?',
    ],
    subtitle: 'AI Assistant - Eman Thread',
    sendLabel: 'Bhejen',
    chooseLang: 'Choose your language',
    langPrompt: '',
    viewProduct: 'Dekhein',
    recommendations: 'Aap ke liye tajweez',
    paymentVerification: 'Payment Status',
  },
}

// ── Product Card Component ────────────────────────────────────────
function ProductCardView({ card }: { card: ProductCard }) {
  return (
    <a
      href={card.link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-shrink-0 w-40 bg-white dark:bg-zinc-800 rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="h-32 w-full bg-muted overflow-hidden">
        <img
          src={card.image}
          alt={card.name}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg'
          }}
        />
      </div>
      <div className="p-2 space-y-1">
        <p className="text-xs font-semibold text-foreground truncate leading-tight">
          {card.name}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">
          {card.color}
        </p>
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            PKR {card.price}
          </span>
          {card.originalPrice && Number(card.originalPrice) > Number(card.price) && (
            <span className="text-[10px] text-muted-foreground line-through">
              PKR {card.originalPrice}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span
            className={`text-[9px] px-1 py-0.5 rounded-full ${
              card.inStock
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {card.inStock ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>
      </div>
    </a>
  )
}

// ── Chat Widget ───────────────────────────────────────────────────
export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [language, setLanguage] = useState<Language | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const [lastProducts, setLastProducts] = useState<ProductCard[]>([])
  const [lastRecommendations, setLastRecommendations] = useState<ProductCard[]>([])
  const [lastPaymentVerification, setLastPaymentVerification] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input after language is chosen
  useEffect(() => {
    if (language) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [language])

  // Track the last message count we saw when the chat was last open
  const lastSeenCountRef = useRef(0)

  // When chat opens, record the current message count as "seen"
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false)
      lastSeenCountRef.current = messages.length
    }
  }, [isOpen])

  // Listen for open-chat-widget and close-chat-widget events
  useEffect(() => {
    function handleOpen() {
      setIsOpen(true)
    }
    function handleClose() {
      setIsOpen(false)
    }
    window.addEventListener('open-chat-widget', handleOpen)
    window.addEventListener('close-chat-widget', handleClose)
    return () => {
      window.removeEventListener('open-chat-widget', handleOpen)
      window.removeEventListener('close-chat-widget', handleClose)
    }
  }, [])

  // Dispatch unread status for unified widget
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('chat-unread-status', { detail: { hasUnread } }));
  }, [hasUnread])

  // Only trigger unread if a NEW assistant message arrives while chat is closed
  useEffect(() => {
    if (isOpen) return
    const last = messages[messages.length - 1]
    if (last?.role === 'assistant' && messages.length > lastSeenCountRef.current) {
      setHasUnread(true)
    }
  }, [messages, isOpen])

  // Choose language and show greeting
  const chooseLanguage = useCallback(
    (lang: Language) => {
      setLanguage(lang)
      setMessages([
        { role: 'assistant', content: LANG_CONFIG[lang].greeting },
      ])
    },
    []
  )

  const sendMessage = useCallback(async () => {
    if (!language) return
    const text = input.trim()
    if (!text || isLoading) return

    const userMessage: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setLastProducts([])
    setLastRecommendations([])
    setLastPaymentVerification('')

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, language }),
      })
      const data: ChatResponse = await res.json()
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply },
      ])
      if (data.products && data.products.length > 0) {
        setLastProducts(data.products)
      }
      if (data.recommendations && data.recommendations.length > 0) {
        setLastRecommendations(data.recommendations)
      }
      if (data.paymentVerification) {
        setLastPaymentVerification(data.paymentVerification)
      }
    } catch {
      const fallback =
        language === 'ur'
          ? 'Maafi chahti hoon, kuch masla aa gaya. WhatsApp par humse rabta karein.'
          : 'Sorry, something went wrong. Please contact us on WhatsApp.'
      setMessages((prev) => [...prev, { role: 'assistant', content: fallback }])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, language])

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      sendMessage()
    },
    [sendMessage]
  )

  const cfg = language ? LANG_CONFIG[language] : LANG_CONFIG.en

  return (
    <>
      {/* ── Chat bubble button ──────────────────────────────────── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #4f46e5, #6d28d9)',
          }}
          aria-label="Open chat"
        >
          <MessageCircle className="w-7 h-7 text-white" />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full" />
          )}
        </button>
      )}

      {/* ── Chat window ─────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-5 z-50 w-80 sm:w-96 bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: '600px', maxHeight: '80vh' }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between flex-shrink-0"
            style={{
              background:
                'linear-gradient(135deg, #4f46e5, #6d28d9)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center overflow-hidden">
                  <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
              </div>
              <div>
                  <p className="text-white font-semibold text-sm leading-tight">
                    AI Assistant
                  </p>
                  <p className="text-white/80 text-xs mt-0.5">
                    Eman Thread
                  </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white transition-colors rounded-full p-1 hover:bg-white/10"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Language picker ──────────────────────────────────── */}
          {!language ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5">
              <div className="text-center">
                <p className="font-semibold text-base text-foreground mb-4">
                  {LANG_CONFIG.en.chooseLang}
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => chooseLanguage('en')}
                  className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all cursor-pointer"
                >
                  <img src="https://flagcdn.com/gb.svg" alt="English" className="w-10 h-auto rounded-sm drop-shadow-sm mb-1" />
                  <span className="text-sm font-semibold text-foreground">English</span>
                </button>
                <button
                  onClick={() => chooseLanguage('ur')}
                  className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-all cursor-pointer"
                >
                  <img src="https://flagcdn.com/pk.svg" alt="Roman Urdu" className="w-10 h-auto rounded-sm drop-shadow-sm mb-1" />
                  <span className="text-sm font-semibold text-foreground">Roman Urdu</span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground text-center opacity-60">
                Eman Thread
              </p>
            </div>
          ) : (
            <>
              {/* ── Messages ─────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1 overflow-hidden ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <User className="w-3 h-3" />
                      ) : (
                        <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap [overflow-wrap:break-word] [word-break:break-word] ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-tr-sm'
                          : 'bg-muted text-foreground rounded-tl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {/* ── Product Cards Carousel ─────────────────── */}
                {lastProducts.length > 0 && (
                  <div className="pt-2">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      {lastProducts.map((card, idx) => (
                        <ProductCardView key={`prod-${card.sku}-${idx}`} card={card} />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Recommendations ───────────────────────── */}
                {lastRecommendations.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
                      {cfg.recommendations}
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                      {lastRecommendations.map((card, idx) => (
                        <ProductCardView key={`rec-${card.sku}-${idx}`} card={card} />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Payment Verification ──────────────────── */}
                {lastPaymentVerification && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                      {cfg.paymentVerification}
                    </p>
                    <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-3 text-xs whitespace-pre-wrap text-foreground leading-relaxed">
                      {lastPaymentVerification}
                    </div>
                  </div>
                )}

                {/* Typing indicator */}
                {isLoading && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center overflow-hidden">
                      <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-muted px-3 py-3 rounded-2xl rounded-tl-sm">
                      <div className="flex gap-1 items-center">
                        <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                        <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                        <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick replies — first message only */}
              {messages.length === 1 && !isLoading && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
                  {cfg.quickReplies.map((reply) => (
                    <button
                      key={reply}
                      onClick={() => {
                        setInput(reply)
                        inputRef.current?.focus()
                      }}
                      className="text-xs px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:border-indigo-400 transition-colors text-foreground/70 hover:text-foreground cursor-pointer"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}

              {/* Input area */}
              <form onSubmit={handleSubmit} className="border-t border-border p-3 flex gap-2 flex-shrink-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={cfg.placeholder}
                  disabled={isLoading}
                  enterKeyHint="send"
                  autoComplete="off"
                  autoCorrect="off"
                  style={{ fontSize: '16px' }}
                  className="flex-1 text-sm bg-muted rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 placeholder:text-muted-foreground/60"
                  maxLength={500}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-all flex-shrink-0 active:scale-95 text-white cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #6d28d9)' }}
                  aria-label={cfg.sendLabel}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  )
}
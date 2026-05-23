'use client'

import { useState } from 'react'
import { Bot, MessageCircle, Sparkles, Globe } from 'lucide-react'

/**
 * HomeChatSection — appears on the homepage between Testimonials and Footer.
 * Clicking "Start Chatting" opens the floating ChatWidget.
 * Emits a custom DOM event that ChatWidgetWrapper listens to.
 */
export function HomeChatSection() {
  const [hovered, setHovered] = useState(false)

  function openChat() {
    // Dispatch a custom event so the floating widget opens
    window.dispatchEvent(new CustomEvent('open-chat-widget'))
  }

  return (
    <section className="relative overflow-hidden py-20 px-4" aria-label="AI Customer Support">
      {/* Background gradient */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(135deg, #f0f0ff 0%, #ede9fe 50%, #f5f3ff 100%)',
        }}
      />
      {/* Dark mode overlay */}
      <div
        className="absolute inset-0 -z-10 dark:opacity-100 opacity-0"
        style={{
          background:
            'linear-gradient(135deg, #1e1b4b 0%, #2e1065 50%, #1e1b4b 100%)',
        }}
      />

      <div className="max-w-4xl mx-auto text-center">

        {/* Icon */}
        <div className="flex items-center justify-center mb-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #6d28d9)' }}
          >
            <Bot className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Heading */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            AI-Powered Support
          </span>
          <Sparkles className="w-5 h-5 text-indigo-500" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-serif">
          Meet Zara — Your Personal Assistant
        </h2>
        <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-3 leading-relaxed">
          Available 24/7 to help you with products, orders, shipping, returns and more.
          Chat in <strong className="text-indigo-600 dark:text-indigo-400">English</strong> or{' '}
          <strong className="text-indigo-600 dark:text-indigo-400">Roman Urdu</strong> — your choice.
        </p>
        <p className="text-muted-foreground/70 text-sm mb-10">
          Zara ka jawab fori milta hai — bina wait kiye, 24 ghante
        </p>

        {/* Feature chips */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {[
            { icon: '🛍️', label: 'Product Info' },
            { icon: '📦', label: 'Order Tracking' },
            { icon: '🚚', label: 'Shipping Rates' },
            { icon: '↩️', label: 'Returns' },
            { icon: '🧵', label: 'Fabric Care' },
            { icon: '✂️', label: 'Stitching' },
          ].map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-white dark:bg-white/10 border border-indigo-100 dark:border-indigo-800 text-foreground/80 shadow-sm"
            >
              <span>{chip.icon}</span>
              {chip.label}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Choose your language when you start:
          </span>
          <span className="text-sm font-medium bg-white dark:bg-white/10 border border-indigo-100 dark:border-indigo-800 rounded-full px-3 py-0.5 flex items-center gap-1.5">
            <img src="https://flagcdn.com/gb.svg" alt="English" className="w-4 h-3 rounded-sm object-cover" /> English
          </span>
          <span className="text-sm text-muted-foreground">or</span>
          <span className="text-sm font-medium bg-white dark:bg-white/10 border border-indigo-100 dark:border-indigo-800 rounded-full px-3 py-0.5 flex items-center gap-1.5">
            <img src="https://flagcdn.com/pk.svg" alt="Roman Urdu" className="w-4 h-3 rounded-sm object-cover" /> Roman Urdu
          </span>
        </div>

        {/* CTA button */}
        <button
          onClick={openChat}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-semibold text-lg shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            background: hovered
              ? 'linear-gradient(135deg, #6d28d9, #4f46e5)'
              : 'linear-gradient(135deg, #4f46e5, #6d28d9)',
            boxShadow: hovered
              ? '0 20px 40px rgba(99,60,180,0.4)'
              : '0 10px 30px rgba(79,70,229,0.3)',
          }}
        >
          <MessageCircle className="w-5 h-5" />
          Start Chatting with Zara
          <span className="text-sm font-normal opacity-80">→</span>
        </button>

        <p className="mt-4 text-xs text-muted-foreground/60">
          Free · No account needed · Instant answers
        </p>
      </div>
    </section>
  )
}

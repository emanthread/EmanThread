"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Bot, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

export function UnifiedWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleUnread = (e: any) => {
      setHasUnreadChat(e.detail?.hasUnread || false);
    };
    window.addEventListener("chat-unread-status", handleUnread);
    return () => window.removeEventListener("chat-unread-status", handleUnread);
  }, []);

  const openWhatsApp = () => {
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent("close-chat-widget"));
    window.dispatchEvent(new CustomEvent("open-whatsapp-widget"));
  };

  const openChat = () => {
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent("close-whatsapp-widget"));
    window.dispatchEvent(new CustomEvent("open-chat-widget"));
  };

  // When clicking the main widget, close other windows if they are open
  const toggleMenu = () => {
    if (!isOpen) {
      window.dispatchEvent(new CustomEvent("close-whatsapp-widget"));
      window.dispatchEvent(new CustomEvent("close-chat-widget"));
    }
    setIsOpen(!isOpen);
  };

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
      {/* Menu Options */}
      <div
        className={cn(
          "flex flex-col items-end gap-3 transition-all duration-300 origin-bottom-right",
          isOpen
            ? "scale-100 opacity-100 pointer-events-auto"
            : "scale-50 opacity-0 pointer-events-none translate-y-4"
        )}
      >
        <button
          onClick={openChat}
          className="flex items-center gap-3 bg-background border border-border shadow-lg rounded-full py-2 px-4 hover:bg-muted transition-colors cursor-pointer"
        >
          <span className="font-medium text-sm">AI Chat</span>
          <div className="relative w-8 h-8">
            <div className="w-full h-full rounded-full flex items-center justify-center overflow-hidden bg-white shadow-sm border border-border/50">
              <img src="/logo.jpg" alt="AI Chat" className="w-full h-full object-cover" />
            </div>
            {hasUnreadChat && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-background" />
            )}
          </div>
        </button>

        <button
          onClick={openWhatsApp}
          className="flex items-center gap-3 bg-background border border-border shadow-lg rounded-full py-2 px-4 hover:bg-muted transition-colors cursor-pointer"
        >
          <span className="font-medium text-sm">WhatsApp</span>
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white">
            <Phone className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Main Toggle Button */}
      <div className="relative pointer-events-auto">
        <button
          onClick={toggleMenu}
          className="relative w-14 h-14 rounded-full metallic-gradient text-primary-foreground shadow-xl flex items-center justify-center hover:scale-110 hover:shadow-xl hover:brightness-110 transition-all duration-300 active:scale-95 cursor-pointer"
          aria-label="Support options"
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}

          {/* Unread badge on main button if menu is closed */}
          {!isOpen && hasUnreadChat && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full border-2 border-background" />
          )}
        </button>

        {/* Pulse ring — visible when closed */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-30 pointer-events-none bg-primary" />
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send, Phone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OrderShareData {
  orderNumber: string;
  total: number;
  items: { name: string; quantity: number }[];
  status: string;
}

interface WhatsAppButtonProps {
  productName?: string;
  productPrice?: number;
  productUrl?: string;
  orderShare?: OrderShareData;
}

function normalizeWhatsAppNumber(raw: string): string {
  // Remove everything except digits
  let digits = raw.replace(/\D/g, "");
  // Ensure Pakistan numbers start with 92, not 0
  if (digits.startsWith("0")) {
    digits = "92" + digits.slice(1);
  }
  if (!digits.startsWith("92")) {
    digits = "92" + digits;
  }
  return digits;
}

export function WhatsAppButton({ productName, productPrice, productUrl, orderShare }: WhatsAppButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/store/public")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.whatsappNumber) {
          setPhoneNumber(normalizeWhatsAppNumber(data.whatsappNumber));
        }
      })
      .catch((err) => {
        console.error("Failed to load WhatsApp number:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    const handleClose = () => setIsOpen(false);
    window.addEventListener("open-whatsapp-widget", handleOpen);
    window.addEventListener("close-whatsapp-widget", handleClose);
    return () => {
      window.removeEventListener("open-whatsapp-widget", handleOpen);
      window.removeEventListener("close-whatsapp-widget", handleClose);
    };
  }, []);

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const quickMessages = [
    { label: "Product Inquiry", message: "Hi! I would like to know more about your products." },
    { label: "Order Status", message: "Hi! I want to check my order status." },
    { label: "Return/Exchange", message: "Hi! I need help with a return/exchange." },
    { label: "Custom Order", message: "Hi! I am interested in a custom order." },
  ];

  const handleSendMessage = (message: string) => {
    let fullMessage = message;

    if (orderShare) {
      const items = orderShare.items
        .map((i) => `• ${i.name} x${i.quantity}`)
        .join("\n");
      fullMessage = `🧵 *Eman Threads Order*\n\nOrder #: ${orderShare.orderNumber}\nStatus: ${orderShare.status}\nTotal: PKR ${orderShare.total.toLocaleString()}\n\n*Items:*\n${items}\n\nTrack your order at: https://emaanthreads.com/account/orders`;
    } else if (productName) {
      fullMessage = `Hi! I'm interested in: ${productName}`;
      if (productPrice) {
        fullMessage += ` (PKR ${productPrice.toLocaleString()})`;
      }
      if (productUrl) {
        fullMessage += `\n\nProduct link: ${productUrl}`;
      }
    }

    const encodedMessage = encodeURIComponent(fullMessage);
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, "_blank");
    setIsOpen(false);
  };

  return (
    <>
      {/* Chat Widget */}
      <div
        className={cn(
          "fixed bottom-24 right-6 z-50 w-80 transition-all duration-300 origin-bottom-right",
          isOpen
            ? "scale-100 opacity-100 pointer-events-auto"
            : "scale-95 opacity-0 pointer-events-none"
        )}
      >
        <div className="bg-background rounded-2xl shadow-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="bg-emerald-600 text-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Emaan Thread</p>
                  <p className="text-sm text-white/80">Customer Support</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/90">
              <Clock className="h-4 w-4" />
              <span>Typically replies within minutes</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            <p className="text-sm text-muted-foreground">
              Hi there! How can we help you today?
            </p>

            {/* Product Info (if on product page) */}
            {productName && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm font-medium mb-1">Inquiring about:</p>
                <p className="text-sm text-muted-foreground">{productName}</p>
                {productPrice && (
                  <p className="text-sm font-medium text-accent mt-1">
                    PKR {productPrice.toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {/* Quick Messages */}
            <div className="space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-5 w-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : orderShare ? (
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-2 px-3 text-left"
                  onClick={() => handleSendMessage("")}
                >
                  <Send className="h-4 w-4 mr-2 shrink-0 text-emerald-600" />
                  <span className="text-sm">Share order on WhatsApp</span>
                </Button>
              ) : productName ? (
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-2 px-3 text-left"
                  onClick={() => handleSendMessage("")}
                >
                  <Send className="h-4 w-4 mr-2 shrink-0 text-emerald-600" />
                  <span className="text-sm">Ask about this product</span>
                </Button>
              ) : (
                quickMessages.map((item) => (
                  <Button
                    key={item.label}
                    variant="outline"
                    className="w-full justify-start h-auto py-2 px-3 text-left"
                    onClick={() => handleSendMessage(item.message)}
                  >
                    <Send className="h-4 w-4 mr-2 shrink-0 text-emerald-600" />
                    <span className="text-sm">{item.label}</span>
                  </Button>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-muted/30">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleSendMessage("Hi! I have a question.")}
              disabled={loading || !phoneNumber}
            >
              <Phone className="h-4 w-4 mr-2" />
              Start Chat on WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
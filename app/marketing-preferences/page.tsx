"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/lazy-cart-drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MarketingPreferencesPage() {
  const [phone, setPhone] = useState("");
  const [stopWhatsApp, setStopWhatsApp] = useState(true);
  const [stopPhoneCalls, setStopPhoneCalls] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch("/api/marketing-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, stopWhatsApp, stopPhoneCalls }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update preferences.");
      setStatus("saved");
      setMessage(data.message);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to update preferences.");
    }
  };

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="min-h-screen bg-muted/30 pb-16 pt-32">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <div className="rounded-xl border border-border bg-background p-6 shadow-sm sm:p-8">
            <h1 className="text-3xl font-serif font-bold">Marketing preferences</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Stop marketing messages or calls sent by Eman Thread. Order confirmations,
              payment notices, and delivery updates are transactional and may still be sent
              when needed to complete your order.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="marketing-phone">Mobile / WhatsApp number</Label>
                <Input
                  id="marketing-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="03XX XXXXXXX"
                  required
                />
              </div>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox
                  checked={stopWhatsApp}
                  onCheckedChange={(checked) => setStopWhatsApp(checked === true)}
                />
                <span>Stop marketing messages on WhatsApp</span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <Checkbox
                  checked={stopPhoneCalls}
                  onCheckedChange={(checked) => setStopPhoneCalls(checked === true)}
                />
                <span>Stop marketing phone calls</span>
              </label>
              <Button
                type="submit"
                className="w-full"
                disabled={status === "saving" || (!stopWhatsApp && !stopPhoneCalls)}
              >
                {status === "saving" ? "Updating..." : "Update preferences"}
              </Button>
              {message ? (
                <p
                  role="status"
                  className={status === "error" ? "text-sm text-destructive" : "text-sm text-emerald-700"}
                >
                  {message}
                </p>
              ) : null}
            </form>
            <p className="mt-6 text-xs text-muted-foreground">
              For access, correction, or deletion requests, see the{" "}
              <Link href="/privacy-policy" className="underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

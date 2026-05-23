"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Instagram, Facebook, Music2, Video } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SocialLinks {
  instagram: string;
  facebook: string;
  youtube: string;
  tiktok: string;
}

const footerLinks = {
  shop: [
    { label: "All Products", href: "/shop" },
    { label: "Cotton", href: "/shop?category=cotton" },
    { label: "Wash & Wear", href: "/shop?category=wash-wear" },
    { label: "Boski", href: "/shop?category=boski" },
    { label: "Wool Blend", href: "/shop?category=wool-blend" },
    { label: "Stitching", href: "/account/measurements" },
  ],
  support: [
    { label: "Contact Us", href: "/contact" },
    { label: "FAQs", href: "/faqs" },
    { label: "Shipping Info", href: "/shipping" },
    { label: "Returns", href: "/returns" },
    { label: "Size Guide", href: "/size-guide" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Our Story", href: "/story" },
    { label: "Careers", href: "/careers" },
  ],
};

export function Footer() {
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    instagram: "",
    facebook: "",
    youtube: "",
    tiktok: "",
  });

  useEffect(() => {
    async function loadSocialLinks() {
      try {
        const res = await fetch("/api/store/social-links");
        if (!res.ok) return;
        const data = await res.json();
        setSocialLinks(data);
      } catch {
        // silently use empty links
      }
    }
    loadSocialLinks();
  }, []);

  const socialItems = [
    { key: "instagram" as const, label: "Instagram", icon: Instagram },
    { key: "facebook" as const, label: "Facebook", icon: Facebook },
    { key: "youtube" as const, label: "YouTube", icon: Video },
    { key: "tiktok" as const, label: "TikTok", icon: Music2 },
  ];

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-4 group">
              <div className="relative h-16 w-16 bg-white rounded-full p-1 shadow-2xl transition-transform duration-500 transform group-hover:scale-110">
                <Image
                  src="/logo.jpg"
                  alt="Eman Thread"
                  fill
                  sizes="64px"
                  className="object-contain rounded-full"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold tracking-[0.2em] uppercase">
                  Eman Thread
                </span>
                <span className="block text-xs tracking-[0.3em] text-primary-foreground/70 uppercase mt-1">
                  The Style Never Dies
                </span>
              </div>
            </Link>
            <p className="mt-6 text-sm leading-relaxed text-primary-foreground/80 max-w-sm">
              Discover the finest collection of premium men's unstitched
              fabrics. Crafted for the distinguished gentleman who appreciates
              quality and elegance.
            </p>

            {/* Newsletter */}
            <div className="mt-8">
              <h4 className="text-sm font-medium tracking-wider uppercase mb-4">
                Subscribe to our newsletter
              </h4>
              <form
                className="flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const input = form.elements.namedItem("email") as HTMLInputElement;
                  const email = input.value.trim();

                  if (!email) {
                    toast({ title: "Please enter an email address", variant: "destructive" });
                    return;
                  }

                  try {
                    const res = await fetch("/api/newsletter/subscribe", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email, source: "footer" }),
                    });

                    const data = await res.json();

                    if (!res.ok) {
                      toast({
                        title: data.error || "Subscription failed",
                        variant: "destructive",
                      });
                      return;
                    }

                    toast({ title: "Subscribed successfully!" });
                    input.value = "";
                  } catch {
                    toast({
                      title: "Something went wrong. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Input
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
                />
                <Button
                  type="submit"
                  variant="secondary"
                  className="shrink-0"
                >
                  Subscribe
                </Button>
              </form>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-medium tracking-wider uppercase mb-4">
              Shop
            </h4>
            <ul className="space-y-3">
              {footerLinks.shop.map((link, index) => (
                <li key={`${index}-${link.href}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium tracking-wider uppercase mb-4">
              Support
            </h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link, index) => (
                <li key={`${index}-${link.href}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium tracking-wider uppercase mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link, index) => (
                <li key={`${index}-${link.href}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Social Links */}
            <div className="mt-8">
              <h4 className="text-sm font-medium tracking-wider uppercase mb-4">
                Follow Us
              </h4>
              <div className="flex gap-4">
                {socialItems.map((item) => {
                  const url = socialLinks[item.key];
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.key}
                      href={url || "#"}
                      target={url ? "_blank" : undefined}
                      rel={url ? "noopener noreferrer" : undefined}
                      className="text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                      title={item.label}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="sr-only">{item.label}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-primary-foreground/20">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-primary-foreground/60">
              {new Date().getFullYear()} Eman Thread. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link
                href="/privacy-policy"
                className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
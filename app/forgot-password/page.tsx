"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      setIsSuccess(true);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary/5">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1580870058814-8f2441c9f28d?q=90&w=1920&h=2560&fit=crop)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <h2 className="text-4xl font-serif text-foreground mb-4">
            Reset Your Password
          </h2>
          <p className="text-lg text-muted-foreground max-w-md">
            Don&apos;t worry, it happens to the best of us. Enter your email and we&apos;ll
            send you instructions to reset your password.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          {/* Back Link */}
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Link>

          {/* Logo */}
          <div className="mb-8">
            <Link href="/" className="flex items-center gap-3 mb-2">
              <div className="relative h-12 w-12 bg-white rounded-full p-0.5 shadow-sm border border-border">
                <Image
                  src="/logo.jpg"
                  alt="Emaan Thread"
                  fill
                  className="object-contain rounded-full"
                />
              </div>
              <h1 className="text-2xl font-serif tracking-wider uppercase">
                Emaan Thread
              </h1>
            </Link>
            <p className="text-sm text-muted-foreground mt-1">
              Reset your password
            </p>
          </div>

          {/* Form */}
          {isSuccess ? (
            <div className="text-center p-8 rounded-lg border border-border bg-muted/30">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-medium mb-2">Check your email</h3>
              <p className="text-muted-foreground text-sm mb-6">
                We&apos;ve sent password reset instructions to <strong>{email}</strong>
              </p>
              <Button asChild className="w-full h-12 text-base">
                <Link href="/login">Return to Login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          )}

          {/* Contact Support Link */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Having trouble?{" "}
            <Link href="/contact" className="text-accent font-medium hover:underline">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

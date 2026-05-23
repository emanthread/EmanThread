"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowLeft, Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const passwordRequirements = [
  { id: "length", label: "At least 8 characters", check: (p: string) => p.length >= 8 },
  { id: "uppercase", label: "One uppercase letter", check: (p: string) => /[A-Z]/.test(p) },
  { id: "number", label: "One number", check: (p: string) => /[0-9]/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [resendSuccess, setResendSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!acceptTerms) {
      setError("Please accept the terms and conditions");
      return;
    }

    const allPassed = passwordRequirements.every((req) => req.check(password));
    if (!allPassed) {
      setError("Password does not meet requirements");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Registration failed");
        setIsLoading(false);
        return;
      }

      setIsRegistered(true);
    } catch {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  const resendVerification = async () => {
    setError("");
    setResendSuccess("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to resend verification email");
        return;
      }

      setResendSuccess("Verification email sent! Please check your inbox.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isRegistered) {
    return (
      <div className="min-h-screen flex">
        {/* Left Side - Image */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-primary/5">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1550596334-7bb40a71b6bc?q=90&w=1920&h=2560&fit=crop)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent" />
          <div className="relative z-10 flex flex-col justify-end p-12">
            <h2 className="text-4xl font-serif text-foreground mb-4">
              Join Emaan Thread
            </h2>
            <p className="text-lg text-muted-foreground max-w-md">
              Create an account to save your tailor measurements, manage custom stitching profiles, and enjoy a personalized shopping experience. Your fit, saved forever.
            </p>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12">
          <div className="mx-auto w-full max-w-md text-center">
            <div className="mb-8">
              <Link href="/" className="flex items-center justify-center gap-3 mb-6">
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
            </div>

            <div className="p-8 rounded-lg bg-muted/30 border border-border">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-accent" />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2">Check your inbox</h2>
              <p className="text-muted-foreground mb-6">
                We've sent a verification email to <strong>{email}</strong>. Please check your inbox and click the verification link to activate your account.
              </p>
              {resendSuccess && (
                <p className="text-sm text-emerald-600 mb-4">{resendSuccess}</p>
              )}
              <p className="text-sm text-muted-foreground mb-6">
                Can't find the email? Check your spam folder or{" "}
                <button
                  onClick={resendVerification}
                  className="text-accent hover:underline font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "click here to resend"}
                </button>
              </p>
              <Link href="/login">
                <Button className="w-full h-12 text-base">
                  Go to Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary/5">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1550596334-7bb40a71b6bc?q=90&w=1920&h=2560&fit=crop)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <h2 className="text-4xl font-serif text-foreground mb-4">
            Join Emaan Thread
          </h2>
          <p className="text-lg text-muted-foreground max-w-md">
            Create an account to save your tailor measurements, manage custom stitching profiles, and enjoy a personalized shopping experience. Your fit, saved forever.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12">
        <div className="mx-auto w-full max-w-md">
          {/* Back Link */}
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
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
              Create your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Ahmed Khan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12"
                autoComplete="name"
              />
            </div>

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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              
              {/* Password Requirements */}
              {password && (
                <div className="mt-2 space-y-1">
                  {passwordRequirements.map((req) => {
                    const passed = req.check(password);
                    return (
                      <div
                        key={req.id}
                        className={cn(
                          "flex items-center gap-2 text-xs transition-colors",
                          passed ? "text-emerald-600" : "text-muted-foreground"
                        )}
                      >
                        <div
                          className={cn(
                            "h-4 w-4 rounded-full flex items-center justify-center border transition-colors",
                            passed
                              ? "bg-emerald-600 border-emerald-600"
                              : "border-muted-foreground/30"
                          )}
                        >
                          {passed && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                        {req.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12"
                autoComplete="new-password"
              />
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="text-sm font-normal cursor-pointer leading-relaxed">
                I agree to the{" "}
                <Link href="/terms" className="text-accent hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-accent hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          {/* Login Link */}
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-accent font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
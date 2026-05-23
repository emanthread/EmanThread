"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const passwordRequirements = [
  { id: "length", label: "At least 8 characters", check: (p: string) => p.length >= 8 },
  { id: "uppercase", label: "One uppercase letter", check: (p: string) => /[A-Z]/.test(p) },
  { id: "number", label: "One number", check: (p: string) => /[0-9]/.test(p) },
];

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token. Please request a new password reset link.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid reset token");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const allPassed = passwordRequirements.every((req) => req.check(password));
    if (!allPassed) {
      setError("Password does not meet requirements");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }

      setIsSuccess(true);

      // Automatically redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch {
      setError("Something went wrong. Please try again.");
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
            Set New Password
          </h2>
          <p className="text-lg text-muted-foreground max-w-md">
            Create a strong, unique password for your account.
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
              {isSuccess ? "Password reset successful" : "Create a new password"}
            </p>
          </div>

          {/* Form */}
          {isSuccess ? (
            <div className="text-center p-8 rounded-lg border border-border bg-muted/30">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xl font-medium mb-2">Password Reset Complete</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Your password has been updated successfully. Redirecting to login...
              </p>
              <Button asChild className="w-full h-12 text-base">
                <Link href="/login">Return to Login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pr-10"
                    autoComplete="new-password"
                    disabled={!token || isLoading}
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
                            {passed && (
                              <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                            )}
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
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12"
                  autoComplete="new-password"
                  disabled={!token || isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={!token || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Resetting password...
                  </>
                ) : (
                  "Reset Password"
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground text-sm">Loading password reset...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
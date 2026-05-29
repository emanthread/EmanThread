"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/lib/auth-store";
import { signIn } from "next-auth/react";
import { GoogleOneTap } from "@/components/google-one-tap";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const verified = searchParams.get("verified");
    const errorParam = searchParams.get("error");

    if (verified === "true") {
      setSuccessMessage("Email verified successfully! You can now sign in.");
    }

    if (errorParam === "expired_token") {
      setError("The verification link has expired. Please register again.");
    } else if (errorParam === "invalid_token") {
      setError("Invalid verification link.");
    } else if (errorParam === "verification_failed") {
      setError("Email verification failed. Please try again.");
    } else if (errorParam === "missing_token") {
      setError("Invalid verification link.");
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/" });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    // Before attempting signIn, check if this email belongs to a staff/admin account.
    // The server silently rejects staff logins from the customer login page (loginOrigin="customer"),
    // which results in the misleading "check your inbox" error. We check upfront so we can
    // show a clear message directing staff users to the admin login page.
    try {
      const roleCheck = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (roleCheck.ok) {
        const { isStaff } = await roleCheck.json();
        if (isStaff) {
          setError("Admin access is restricted. Please use the admin login page.");
          return;
        }
      }
    } catch {
      // If the check fails, fall through to normal login (don't block the user)
    }

    const success = await login(email, password, rememberMe); // FIXED: L1
    
    if (success) {
      const role = useAuthStore.getState().user?.role;
      const staffRoles = ["ADMIN", "SUPER_ADMIN", "MANAGER", "SUPPORT"];
      
      // Prevent admin/staff users from logging in via the customer login page
      if (role && staffRoles.includes(role)) {
        await useAuthStore.getState().logout();
        setError("Admin access is restricted. Please use the admin login page.");
        return;
      }
      
      router.push("/");
    } else {
      setError("Invalid email or password. If you recently registered, please check your inbox to verify your email first.");
    }
  };

  return (
    <>
      <GoogleOneTap />
      <div className="min-h-screen flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary via-primary/90 to-primary/80">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-10"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1618220048045-10a1100f7236?q=80&w=1920&h=2560&fit=crop)",
            }}
          />
          <div className="relative z-10 flex flex-col justify-center items-center p-12 text-center w-full">
            <div className="relative w-32 h-32 mb-6">
              <Image
                src="/logo-circle.png"
                alt="Eman Thread"
                fill
                className="object-contain"
              />
            </div>
            <h1 className="text-4xl font-serif text-white mb-4 tracking-wider uppercase">
              Eman Thread
            </h1>
            <p className="text-lg text-white/80 max-w-md">
              Sign in to manage your orders, measurements, and stitching profiles.
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
                    alt="Eman Thread"
                    fill
                    className="object-contain rounded-full"
                  />
                </div>
                <h1 className="text-2xl font-serif tracking-wider uppercase">
                  Eman Thread
                </h1>
              </Link>
              <p className="text-sm text-muted-foreground mt-1">
                Sign in to your account
              </p>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    {successMessage}
                  </p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className="h-12"
                  autoComplete="email"
                  defaultValue=""
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-accent hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="h-12 pr-10"
                    autoComplete="current-password"
                    defaultValue=""
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
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                  Remember me for 30 days
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
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-base"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Sign in with Google
            </Button>

            {/* Register Link */}
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="text-accent font-medium hover:underline">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
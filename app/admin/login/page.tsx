"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "next-auth/react";
import { useAuthStore } from "@/lib/auth-store";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        loginOrigin: "admin",
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid credentials. Admin access required.");
        setIsLoading(false);
        return;
      }

      // Wait for session cookie to propagate — retry with delay
      let profile: any = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          profile = await res.json();
          break;
        }
        if (attempt < 4) await new Promise((r) => setTimeout(r, 300));
      }

      if (!profile) {
        setError("Failed to verify admin access. Please try again.");
        setIsLoading(false);
        return;
      }
      
      // Check if user has staff role
      const staffRoles = ["ADMIN", "SUPER_ADMIN", "MANAGER", "SUPPORT"];
      if (!staffRoles.includes(profile.role)) {
        setError("You do not have admin access. Please use the customer login.");
        setIsLoading(false);
        return;
      }

      // Update auth store
      useAuthStore.setState({
        user: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          whatsappConsent: profile.whatsappConsent,
          whatsappPhone: profile.whatsappPhone,
          role: profile.role,
          isVerified: profile.isVerified ?? true,
          addresses: profile.addresses,
          createdAt: profile.createdAt,
        },
        isAuthenticated: true,
      });

      router.push("/admin");
    } catch {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary via-primary/90 to-primary/80">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618220048045-10a1100f7236?q=80&w=1920&h=2560&fit=crop')] bg-cover bg-center opacity-10" />
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
            Admin Portal — Manage your store, orders, products, and customers from one place.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 bg-muted/30">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo for mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="relative h-16 w-16">
              <Image
                src="/logo-circle.png"
                alt="Eman Thread"
                fill
                className="object-contain"
              />
            </div>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <div className="flex items-center gap-2 justify-center lg:justify-start mb-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-2xl font-semibold">Admin Login</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Sign in with your admin credentials to access the dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-email">Email Address</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@emanthread.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="admin-password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-accent hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pr-10"
                  autoComplete="current-password"
                  disabled={isLoading}
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
                "Sign In to Admin"
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Customer?{" "}
            <Link href="/login" className="text-accent font-medium hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
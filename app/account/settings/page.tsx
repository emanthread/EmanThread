"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Save, Eye, EyeOff, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const passwordRequirements = [
  { id: "length", label: "At least 8 characters", check: (p: string) => p.length >= 8 },
  { id: "uppercase", label: "One uppercase letter", check: (p: string) => /[A-Z]/.test(p) },
  { id: "number", label: "One number", check: (p: string) => /[0-9]/.test(p) },
];

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, updateProfile } = useAuthStore();
  const { toast } = useToast();

  // Profile state
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast({
          title: "Error",
          description: data.error || "Failed to update settings",
          variant: "destructive",
        });
        return;
      }

      const updated = await res.json();
      updateProfile({
        name: updated.name,
        phone: updated.phone,
      });

      toast({
        title: "Settings Saved",
        description: "Your notification preferences have been updated.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    const allPassed = passwordRequirements.every((req) => req.check(newPassword));
    if (!allPassed) {
      toast({
        title: "Error",
        description: "New password does not meet requirements",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await fetch("/api/user/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          title: "Error",
          description: data.error || "Failed to change password",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });

      // Clear fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      <Header />
      <CartDrawer />

      <main className="min-h-screen bg-muted/30 pt-28 pb-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <Link
            href="/account"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Account
          </Link>

          <h1 className="text-3xl font-serif font-bold mb-8">Account Settings</h1>

          {/* Profile Info (Editable) */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="settings-name">Name</Label>
                  <Input
                    id="settings-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <p className="font-medium text-muted-foreground">
                    {user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact support for assistance.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-phone">Phone</Label>
                  <Input
                    id="settings-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Profile Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full mb-8"
            size="lg"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>

          <Separator className="mb-8" />

          {/* Change Password */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Change Password</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter your current password"
                    autoComplete="current-password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPasswords ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className="pr-10"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswords ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Password Requirements */}
                  {newPassword && (
                    <div className="mt-2 space-y-1">
                      {passwordRequirements.map((req) => {
                        const passed = req.check(newPassword);
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
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <Input
                    id="confirm-new-password"
                    type={showPasswords ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    autoComplete="new-password"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Changing password...
                    </>
                  ) : (
                    "Change Password"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </>
  );
}
import { useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, Check, Eye, EyeOff, KeyRound, Loader2, Save, User } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { uploadProductImageServer } from "@/lib/upload.server";

export const Route = createFileRoute("/admin/profile")({
  component: AdminProfilePage,
});

function AdminProfilePage() {
  const { session } = useAuth();
  const user = session?.user;
  const meta = user?.user_metadata ?? {};

  const [fullName, setFullName] = useState(
    (meta.full_name as string) || (meta.name as string) || ""
  );
  const [avatarUrl, setAvatarUrl] = useState(
    (meta.avatar_url as string) || ""
  );
  const [phone, setPhone] = useState(
    (meta.phone as string) || ""
  );
  const [email, setEmail] = useState(user?.email || "");

  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle avatar upload using server function
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file must be under 5MB");
      return;
    }

    setUploadingAvatar(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await uploadProductImageServer({
        data: {
          base64,
          fileName: file.name,
          contentType: file.type || "image/jpeg",
        },
      });

      // Get public URL
      const { data: pub } = supabase.storage
        .from("product-images")
        .getPublicUrl(res.path);

      const publicUrl = pub.publicUrl;
      setAvatarUrl(publicUrl);

      // Immediately save to user metadata
      const { error } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      if (error) throw error;
      toast.success("Profile picture updated!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload avatar";
      toast.error(msg);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Save Name, Phone & Email
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    setSavingProfile(true);
    try {
      const updates: { email?: string; data: { full_name: string; phone: string; avatar_url?: string } } = {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          avatar_url: avatarUrl,
        },
      };

      // If email has changed, request update
      if (email.trim() && email.trim().toLowerCase() !== user?.email?.toLowerCase()) {
        updates.email = email.trim().toLowerCase();
      }

      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;

      if (updates.email) {
        toast.success("Profile updated! Confirmation links sent to your old and new email addresses.");
      } else {
        toast.success("Profile details updated successfully!");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      toast.error(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password changed successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      toast.error(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Profile Info Section */}
      <section className="rounded-sm border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold tracking-tight">Admin Profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your administrator avatar, display name, and email address.
        </p>

        {/* Avatar Upload */}
        <div className="mt-6 flex items-center gap-6">
          <div className="relative">
            <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Admin Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-10 w-10 text-muted-foreground" />
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition hover:opacity-90 disabled:opacity-60"
              title="Upload profile picture"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div>
            <h3 className="font-semibold text-base text-foreground">
              {fullName || "Admin"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click the camera icon to upload a profile picture (PNG, JPG, max 5MB).
            </p>
          </div>
        </div>

        {/* Edit Name, Phone & Email Form */}
        <form onSubmit={handleSaveProfile} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Display Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Emmanuel Onyedikachi"
                className="mt-1.5 w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 08012345678"
                className="mt-1.5 w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="mt-1.5 w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
            >
              {savingProfile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Profile Changes
            </button>
          </div>
        </form>
      </section>

      {/* Change Password Section */}
      <section className="rounded-sm border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-semibold tracking-tight">Change Password</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Ensure your admin account is protected with a secure password.
        </p>

        <form onSubmit={handleChangePassword} className="mt-6 space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              New Password
            </label>
            <div className="relative mt-1.5">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full rounded-sm border border-input bg-background pl-3.5 pr-10 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition"
                title={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Confirm New Password
            </label>
            <div className="relative mt-1.5">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-sm border border-input bg-background pl-3.5 pr-10 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition"
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={changingPassword}
              className="inline-flex items-center gap-2 rounded-sm border border-border bg-background px-5 py-2.5 text-sm font-semibold transition hover:bg-accent disabled:opacity-60"
            >
              {changingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Update Password
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

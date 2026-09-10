import { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Check,
  CreditCard,
  ExternalLink,
  KeyRound,
  Loader2,
  LogOut,
  MessageCircle,
  Package,
  Phone,
  Save,
  ShoppingBag,
  Upload,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, signOut } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/store";
import { reuploadReceipt, type Order } from "@/lib/orders";
import { fetchStoreSettings, storeSettingsQuery, whatsappHref } from "@/lib/settings";
import { getSignedReceiptUrlServer, uploadProductImageServer, uploadReceiptServer } from "@/lib/upload.server";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Customer Dashboard — EMMYKING STORES" },
      {
        name: "description",
        content: "Track your orders, view verified payments, and manage your store profile.",
      },
    ],
  }),
  component: CustomerDashboardPage,
});

function useMyOrders(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-orders", userId],
    enabled: !!userId,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, reference, customer_name, phone, email, address, items, total, status, payment_status, receipt_path, admin_note, receipt_uploaded_at, created_at"
        )
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });
}

// 3 OFFICIAL STATUSES HELPER
function getOfficialStatus(order: Order): "pending" | "successful" | "declined" {
  const pStatus = (order.payment_status || "").toLowerCase();
  const oStatus = (order.status || "").toLowerCase();

  if (pStatus === "declined" || oStatus === "cancelled" || oStatus === "declined") {
    return "declined";
  }
  if (pStatus === "approved" || pStatus === "successful" || pStatus === "paid" || oStatus === "delivered" || oStatus === "paid") {
    return "successful";
  }
  return "pending";
}

function StatusBadge({ status }: { status: "pending" | "successful" | "declined" }) {
  if (status === "successful") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 border border-emerald-500/20">
        Successful
      </span>
    );
  }
  if (status === "declined") {
    return (
      <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-bold text-destructive border border-destructive/20">
        Declined
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 border border-amber-500/20">
      Pending
    </span>
  );
}

function CustomerDashboardPage() {
  const { session, loading, displayName } = useAuth();
  const navigate = useNavigate();
  const { data: settings } = useQuery(storeSettingsQuery);

  const [activeTab, setActiveTab] = useState<"orders" | "payments" | "profile">("orders");
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const qc = useQueryClient();

  // Profile Edit State
  const meta = session?.user?.user_metadata ?? {};
  const [profileName, setProfileName] = useState((meta.full_name as string) || (meta.name as string) || "");
  const [profilePhone, setProfilePhone] = useState((meta.phone as string) || "");
  const [profileEmail, setProfileEmail] = useState(session?.user?.email || "");
  const [avatarUrl, setAvatarUrl] = useState((meta.avatar_url as string) || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Re-upload receipt state
  const [reuploadingOrder, setReuploadingOrder] = useState<Order | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);

  // Change Password State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth" });
    }
  }, [loading, session, navigate]);

  const { data: orders, isLoading: ordersLoading } = useMyOrders(session?.user?.id);

  // Avatar upload handler
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

      const { data: pub } = supabase.storage
        .from("product-images")
        .getPublicUrl(res.path);

      const publicUrl = pub.publicUrl;
      setAvatarUrl(publicUrl);

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

  // Receipt re-upload submit handler
  const handleReuploadSubmit = async () => {
    if (!reuploadingOrder) return;
    if (!receiptFile) {
      toast.error("Please select a receipt image first.");
      return;
    }

    setIsSubmittingReceipt(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(receiptFile);
      });

      const uploadRes = await uploadReceiptServer({
        data: {
          base64,
          fileName: receiptFile.name,
          contentType: receiptFile.type || "image/jpeg",
          reference: reuploadingOrder.reference,
        },
      });

      await reuploadReceipt(reuploadingOrder.id, uploadRes.path);

      toast.success("Receipt uploaded successfully! Your payment is now under review.");
      setReuploadingOrder(null);
      setReceiptFile(null);
      qc.invalidateQueries({ queryKey: ["my-orders"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload receipt";
      toast.error(msg);
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <h2 className="mt-5 font-display text-xl font-semibold tracking-tight">
          Loading your customer portal…
        </h2>
      </div>
    );
  }

  if (!session) return null;

  // Profile Save handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    setSavingProfile(true);
    try {
      const updates: { email?: string; data: { full_name: string; phone: string; avatar_url: string } } = {
        data: {
          full_name: profileName.trim(),
          phone: profilePhone.trim(),
          avatar_url: avatarUrl,
        },
      };

      const emailChanged =
        profileEmail.trim() &&
        profileEmail.trim().toLowerCase() !== session?.user?.email?.toLowerCase();

      if (emailChanged) {
        updates.email = profileEmail.trim().toLowerCase();
      }

      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;

      if (emailChanged) {
        toast.success(
          "Profile updated! A confirmation link has been sent to verify your new email address."
        );
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

  // Change Password handler
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
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      toast.error(msg);
    } finally {
      setChangingPassword(false);
    }
  };

  const successfulPayments = (orders ?? []).filter((o) => getOfficialStatus(o) === "successful");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Customer Portal Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Customer Portal
            </span>
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome, {displayName?.split(" ")[0] ?? "there"}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your order statuses, verify bank transfer payments, and contact support anytime.
          </p>
        </div>
      </div>

      {/* Navigation Tabs: Orders | Payments | Profile */}
      <div className="mt-6 flex border-b border-border overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`flex shrink-0 items-center gap-2 border-b-2 px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold transition ${
            activeTab === "orders"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package className="h-4 w-4" />
          Orders ({(orders ?? []).length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("payments")}
          className={`flex shrink-0 items-center gap-2 border-b-2 px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold transition ${
            activeTab === "payments"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Payments ({successfulPayments.length} Confirmed)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex shrink-0 items-center gap-2 border-b-2 px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold transition ${
            activeTab === "profile"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="h-4 w-4" />
          Profile & Security
        </button>
      </div>

      {/* TAB 1: ORDERS TAB */}
      {activeTab === "orders" && (
        <div className="mt-6 space-y-6">
          {ordersLoading ? (
            <div className="py-12 flex items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your orders…
            </div>
          ) : !orders || orders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center bg-card">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <h3 className="mt-3 text-base font-semibold text-foreground">No orders placed yet</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                Explore our catalog of genuine iPhones, laptops, and accessories to submit your first request.
              </p>
              <Link
                to="/products"
                className="mt-5 inline-flex items-center justify-center rounded-sm bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Browse Shop
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const officialStatus = getOfficialStatus(order);
                const waMessage = `Hello EMMYKING STORES, I am checking on my order ${order.reference} (Status: ${officialStatus.toUpperCase()}).`;
                const waLink = whatsappHref(settings?.whatsapp_number, waMessage);

                return (
                  <div
                    key={order.id}
                    className="rounded-lg border border-border bg-card p-5 transition hover:border-foreground/30 shadow-xs"
                  >
                    {/* Order Reference & Status Header */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-foreground">
                            {order.reference}
                          </span>
                          <StatusBadge status={officialStatus} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Submitted on{" "}
                          {new Date(order.created_at).toLocaleDateString("en-NG", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      {/* WhatsApp Notify Button */}
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-sm bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 shadow-xs"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Notify on WhatsApp
                      </a>
                    </div>

                    {/* Products In This Order */}
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        Products Ordered
                      </p>
                      <ul className="space-y-2">
                        {order.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between gap-3 rounded-sm bg-muted/40 px-3 py-2 text-sm"
                          >
                            <div className="min-w-0">
                              <span className="font-medium text-foreground block truncate">
                                {item.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Quantity: {item.qty}
                              </span>
                            </div>
                            <span className="font-semibold text-sm shrink-0">
                              {typeof item.price === "number"
                                ? formatPrice(item.price * item.qty)
                                : "On request"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Delivery Destination & Total */}
                    <div className="mt-4 grid gap-2 sm:grid-cols-2 border-t border-border/70 pt-3 text-xs">
                      <div>
                        <span className="font-semibold text-muted-foreground uppercase tracking-wider block">
                          Delivery Address:
                        </span>
                        <p className="text-foreground mt-0.5">
                          {order.address || "Store pickup requested"}
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <span className="font-semibold text-muted-foreground uppercase tracking-wider block">
                          Total Amount:
                        </span>
                        <span className="font-bold text-base text-primary block mt-0.5">
                          {order.total === null ? "Price on request" : formatPrice(order.total)}
                        </span>
                      </div>
                    </div>

                    {/* Admin Reason Note (especially if Declined or instructions added) */}
                    {order.admin_note && (
                      <div className="mt-3 rounded-sm bg-destructive/5 border border-destructive/20 p-3 text-xs">
                        <span className="font-semibold text-destructive">Store Note: </span>
                        <span className="text-foreground">{order.admin_note}</span>
                      </div>
                    )}

                    {/* Receipt proof and re-upload actions */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
                      <div className="flex items-center gap-2">
                        {order.receipt_path ? (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await getSignedReceiptUrlServer({ data: { path: order.receipt_path! } });
                                if (res?.url) {
                                  window.open(res.url, "_blank");
                                } else {
                                  toast.error("Could not load receipt file");
                                }
                              } catch (err: unknown) {
                                const msg = err instanceof Error ? err.message : "Failed to load receipt";
                                toast.error(msg);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-accent"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View Current Receipt
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No receipt uploaded yet</span>
                        )}
                      </div>

                      {/* If declined or pending, customer can re-upload/replace receipt */}
                      {officialStatus !== "successful" && (
                        <button
                          type="button"
                          onClick={() => {
                            setReuploadingOrder(order);
                            setReceiptFile(null);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-sm bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {order.receipt_path ? "Re-upload / Update Receipt" : "Upload Payment Receipt"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYMENTS TAB */}
      {activeTab === "payments" && (
        <div className="mt-6 space-y-4">
          <div className="rounded-sm bg-muted/30 border border-border p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Verified Bank Payments</p>
            <p className="mt-0.5">
              Review your submitted bank receipts and current payment confirmation statuses. Status is updated directly by store management upon bank reconciliation.
            </p>
          </div>

          {!orders || orders.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-12 text-center bg-card">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <h3 className="mt-3 text-base font-semibold text-foreground">No payments recorded</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                When you make an order and upload a transfer receipt, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const officialStatus = getOfficialStatus(order);
                const isSuccessful = officialStatus === "successful";

                return (
                  <div
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 shadow-xs"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        isSuccessful ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                      }`}>
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-bold text-foreground">
                            {order.reference}
                          </p>
                          <StatusBadge status={officialStatus} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(order.created_at).toLocaleString()} • Bank Transfer
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">Amount</span>
                        <span className="font-bold text-sm text-foreground">
                          {order.total === null ? "On request" : formatPrice(order.total)}
                        </span>
                      </div>

                      {/* View Receipt Proof */}
                      {order.receipt_path ? (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await getSignedReceiptUrlServer({ data: { path: order.receipt_path! } });
                              if (res?.url) {
                                window.open(res.url, "_blank");
                              } else {
                                toast.error("Could not load receipt file");
                              }
                            } catch (err: unknown) {
                              const msg = err instanceof Error ? err.message : "Failed to load receipt";
                              toast.error(msg);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-accent"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View Receipt
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No receipt file</span>
                      )}

                      {/* Re-upload button if not successful */}
                      {!isSuccessful && (
                        <button
                          type="button"
                          onClick={() => {
                            setReuploadingOrder(order);
                            setReceiptFile(null);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition hover:opacity-90"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {order.receipt_path ? "Re-upload" : "Upload Receipt"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PROFILE & SECURITY TAB */}
      {activeTab === "profile" && (
        <div className="mt-6 space-y-6 max-w-2xl">
          {/* Edit Profile Info */}
          <section className="rounded-lg border border-border bg-card p-6 shadow-xs">
            <h2 className="font-display text-lg font-semibold tracking-tight">Customer Information</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Update your profile photo and contact details used for delivery confirmations.
            </p>

            {/* Profile Avatar Upload */}
            <div className="mt-5 flex items-center gap-5 border-b border-border pb-5">
              <div className="relative">
                <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-9 w-9 text-muted-foreground" />
                  )}
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow transition hover:opacity-90 disabled:opacity-60"
                  title="Upload profile picture"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground">Profile Picture</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reflects across your account and top navigation. Max size 5MB.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-1 text-xs font-semibold hover:bg-accent disabled:opacity-60"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {uploadingAvatar ? "Uploading…" : "Change Photo"}
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="mt-1.5 w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="e.g. 08012345678"
                  className="mt-1.5 w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Used by our delivery team and for WhatsApp updates.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1.5 w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Changing your email address will send a confirmation link to verify your new email.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-2 rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
                >
                  {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Profile Details
                </button>
              </div>
            </form>
          </section>

          {/* Change Password */}
          <section className="rounded-lg border border-border bg-card p-6 shadow-xs">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg font-semibold tracking-tight">Security & Password</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose a secure password with at least 6 characters.
            </p>

            <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="mt-1.5 w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="mt-1.5 w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="inline-flex items-center gap-2 rounded-sm border border-border bg-background px-5 py-2.5 text-sm font-semibold transition hover:bg-accent disabled:opacity-60"
                >
                  {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Update Password
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* RE-UPLOAD RECEIPT MODAL */}
      {reuploadingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Upload Payment Receipt
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Order Reference: <strong className="font-mono text-foreground">{reuploadingOrder.reference}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReuploadingOrder(null);
                  setReceiptFile(null);
                }}
                className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Please upload a clear screenshot or photo of your bank transfer. Once submitted, your order status will update to <strong className="text-amber-600">Pending Review</strong> for our finance team.
              </p>

              {/* File picker input */}
              <div
                onClick={() => receiptInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center transition hover:border-primary/50 hover:bg-muted/30"
              >
                <Upload className="h-8 w-8 text-muted-foreground/60" />
                <span className="mt-2 text-xs font-semibold text-foreground">
                  {receiptFile ? receiptFile.name : "Click to select receipt image"}
                </span>
                <span className="mt-0.5 text-[11px] text-muted-foreground">
                  PNG, JPG, or JPEG up to 10MB
                </span>
                <input
                  ref={receiptInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setReceiptFile(f);
                  }}
                  className="hidden"
                />
              </div>

              {receiptFile && (
                <div className="rounded-sm bg-muted/40 p-2 text-xs text-foreground flex items-center justify-between">
                  <span className="truncate max-w-[240px] font-medium">{receiptFile.name}</span>
                  <span className="text-muted-foreground shrink-0">{(receiptFile.size / 1024).toFixed(0)} KB</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setReuploadingOrder(null);
                    setReceiptFile(null);
                  }}
                  disabled={isSubmittingReceipt}
                  className="flex-1 rounded-sm border border-border px-4 py-2 text-xs font-semibold hover:bg-accent disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReuploadSubmit}
                  disabled={!receiptFile || isSubmittingReceipt}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmittingReceipt ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" /> Submit Receipt
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { grantAdminByEmail, useAuth } from "@/lib/auth";
import { storeSettingsQuery, updateStoreSettings } from "@/lib/settings";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const qc = useQueryClient();
  const { email: currentEmail } = useAuth();
  const { data: settings, isLoading, isError } = useQuery(storeSettingsQuery);

  const [staffEmail, setStaffEmail] = useState("");
  const [addingStaff, setAddingStaff] = useState(false);

  const [form, setForm] = useState<{
    bank_name?: string;
    account_name?: string;
    account_number?: string;
    payment_instructions?: string;
    contact_phone?: string;
    whatsapp_number?: string;
    contact_email?: string;
  }>({});

  const save = useMutation({
    mutationFn: async () => {
      if (!settings?.id) return;
      await updateStoreSettings(settings.id, {
        bank_name: form.bank_name ?? settings.bank_name,
        account_name: form.account_name ?? settings.account_name,
        account_number: form.account_number ?? settings.account_number,
        payment_instructions: form.payment_instructions ?? settings.payment_instructions,
        contact_phone: form.contact_phone ?? settings.contact_phone,
        whatsapp_number: form.whatsapp_number ?? settings.whatsapp_number,
        contact_email: form.contact_email ?? settings.contact_email,
      });
    },
    onSuccess: () => {
      toast.success("Settings updated successfully");
      qc.invalidateQueries({ queryKey: ["store-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToGrant = staffEmail.trim().toLowerCase();
    if (!emailToGrant) return;
    setAddingStaff(true);
    try {
      const ok = await grantAdminByEmail(emailToGrant);
      if (ok) {
        toast.success(`Success: Admin permissions granted to ${emailToGrant}`);
        setStaffEmail("");
      } else {
        toast.error(`User "${emailToGrant}" does not exist yet. They must sign up or create an account on the store first before you can grant them admin permissions.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to grant admin access";
      toast.error(msg);
    } finally {
      setAddingStaff(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
      </div>
    );
  }

  if (isError || !settings) {
    return (
      <div className="rounded-sm border border-destructive/40 bg-destructive/5 p-6 text-sm">
        <p className="text-destructive">We couldn't load store settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="rounded-sm border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold tracking-tight">Bank & Payment Details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          These bank account details will appear on the checkout page when customers choose bank transfer.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="mt-6 space-y-4 max-w-2xl"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Bank Name
              </label>
              <input
                type="text"
                value={form.bank_name ?? settings.bank_name}
                onChange={(e) => setForm((prev) => ({ ...prev, bank_name: e.target.value }))}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. OPay / Moniepoint / GTBank"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Account Number
              </label>
              <input
                type="text"
                value={form.account_number ?? settings.account_number}
                onChange={(e) => setForm((prev) => ({ ...prev, account_number: e.target.value }))}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                placeholder="10-digit account number"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Account Name
            </label>
            <input
              type="text"
              value={form.account_name ?? settings.account_name}
              onChange={(e) => setForm((prev) => ({ ...prev, account_name: e.target.value }))}
              className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
              placeholder="e.g. EMMYKING STORES"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Payment Instructions
            </label>
            <textarea
              rows={3}
              value={form.payment_instructions ?? settings.payment_instructions}
              onChange={(e) => setForm((prev) => ({ ...prev, payment_instructions: e.target.value }))}
              className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
              placeholder="Instructions displayed to customer after order is placed..."
            />
          </div>

          <h3 className="pt-4 font-display text-lg font-semibold tracking-tight">Contact Information</h3>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phone Number
              </label>
              <input
                type="text"
                value={form.contact_phone ?? settings.contact_phone}
                onChange={(e) => setForm((prev) => ({ ...prev, contact_phone: e.target.value }))}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                WhatsApp Number
              </label>
              <input
                type="text"
                value={form.whatsapp_number ?? settings.whatsapp_number}
                onChange={(e) => setForm((prev) => ({ ...prev, whatsapp_number: e.target.value }))}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </label>
              <input
                type="email"
                value={form.contact_email ?? settings.contact_email}
                onChange={(e) => setForm((prev) => ({ ...prev, contact_email: e.target.value }))}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={save.isPending}
              className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Details
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-sm border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold tracking-tight">Staff & Administrator Access</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Logged in as: <span className="font-semibold text-foreground">{currentEmail}</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Grant admin access to another user by entering the email address they registered with.
        </p>

        <form onSubmit={grantAdmin} className="mt-6 flex flex-wrap gap-2 max-w-md">
          <input
            type="email"
            required
            value={staffEmail}
            onChange={(e) => setStaffEmail(e.target.value)}
            placeholder="staff@example.com"
            className="flex-1 rounded-sm border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={addingStaff}
            className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60"
          >
            {addingStaff ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Grant Access
          </button>
        </form>
      </section>
    </div>
  );
}

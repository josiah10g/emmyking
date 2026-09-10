import { useState, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  Copy,
  FileCheck,
  Loader2,
  MessageCircle,
  Package,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { placeOrder } from "@/lib/orders";
import { fetchStoreSettings, storeSettingsQuery, whatsappHref } from "@/lib/settings";
import { formatPrice, STORE } from "@/lib/store";
import { uploadReceiptServer } from "@/lib/upload.server";
import { sendOrderEmailServer } from "@/lib/email.server";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout & Payment — EMMYKING STORES" },
      {
        name: "description",
        content: "Submit your delivery details and transfer receipt to complete your EMMYKING order.",
      },
    ],
  }),
  component: CheckoutPage,
});

const schema = z.object({
  customer_name: z.string().trim().min(2, "Enter your full name").max(120),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number")
    .max(30)
    .regex(/^[0-9+()\-\s]+$/, "Phone can only contain digits and + ( ) -"),
  email: z.union([z.string().trim().email("Enter a valid email").max(255), z.literal("")]),
  address: z.string().trim().min(5, "Enter your full delivery address").max(500),
  notes: z.string().trim().max(1000),
});

type Errors = Partial<Record<keyof z.infer<typeof schema>, string>>;

function CheckoutPage() {
  const { items, knownTotal, clear } = useCart();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { data: settings } = useQuery(storeSettingsQuery);

  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<{ reference: string; phone: string } | null>(null);
  const [copiedBank, setCopiedBank] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Defaults from logged in user if available
  const meta = session?.user?.user_metadata ?? {};
  const defaultName = (meta.full_name as string) || (meta.name as string) || "";
  const defaultPhone = (meta.phone as string) || "";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error("Receipt image must be smaller than 8MB");
      return;
    }

    setReceiptFile(file);
    const previewUrl = URL.createObjectURL(file);
    setReceiptPreview(previewUrl);
  };

  const copyAccountNumber = (acc: string) => {
    navigator.clipboard.writeText(acc);
    setCopiedBank(true);
    toast.success("Account number copied to clipboard!");
    setTimeout(() => setCopiedBank(false), 2500);
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      customer_name: String(form.get("customer_name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      address: String(form.get("address") ?? ""),
      notes: String(form.get("notes") ?? ""),
    });

    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }

    // MANDATORY RECEIPT VALIDATION
    if (!receiptFile) {
      toast.error("Please upload your bank payment receipt before submitting.");
      return;
    }

    setErrors({});
    setSubmitting(true);

    try {
      // 1. Generate unique reference code
      const ref = `EK-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Date.now().toString().slice(-4)}`;

      // 2. Convert receipt file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(receiptFile);
      });

      // 3. Upload receipt to storage bucket
      const uploaded = await uploadReceiptServer({
        data: {
          base64,
          fileName: receiptFile.name,
          contentType: receiptFile.type || "image/jpeg",
          reference: ref,
        },
      });

      // 4. Save order to Supabase orders table
      await placeOrder(
        {
          customer_name: parsed.data.customer_name,
          phone: parsed.data.phone,
          email: parsed.data.email || session?.user?.email || "",
          address: parsed.data.address,
          notes: parsed.data.notes,
          receipt_path: uploaded.path,
        },
        items,
        knownTotal,
      );

      // 5. Trigger automated notification email (to Admin & Customer)
      sendOrderEmailServer({
        data: {
          type: "new_order",
          orderReference: ref,
          customerName: parsed.data.customer_name,
          customerPhone: parsed.data.phone,
          customerEmail: parsed.data.email || session?.user?.email || null,
          deliveryAddress: parsed.data.address,
          items: items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
          total: knownTotal,
          status: "pending",
        },
      }).catch((err) => console.error("Email send trigger:", err));

      clear();
      setCompletedOrder({ reference: ref, phone: parsed.data.phone });
      toast.success("Order and payment receipt received successfully!");
    } catch (err: unknown) {
      console.error("[Checkout error]", err);
      const msg = err instanceof Error ? err.message : "Failed to place order. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ORDER SUCCESS SCREEN
  if (completedOrder) {
    const waText = `Hello EMMYKING STORES, I just placed an order with reference ${completedOrder.reference} and uploaded my payment receipt. Please confirm my request.`;
    const waUrl = whatsappHref(settings?.whatsapp_number, waText);

    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <p className="eyebrow mt-4 text-muted-foreground uppercase tracking-widest text-xs font-semibold">
          Order & Payment Proof Received
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Thank you — your request is Pending Confirmation
        </h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Your order reference is <strong className="text-foreground">{completedOrder.reference}</strong>.
          Our team is reviewing your payment proof. Once confirmed, your status will turn to{" "}
          <strong className="text-emerald-600 font-semibold">Successful</strong> and dispatch will begin.
        </p>

        {/* WhatsApp Notification Button */}
        <div className="mt-6">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-sm bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" />
            Notify Owners on WhatsApp
          </a>
        </div>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/account"
            className="rounded-sm border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-accent"
          >
            Track in Customer Dashboard
          </Link>
          <Link
            to="/products"
            className="rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  // EMPTY CART SCREEN
  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <Package className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add items from our inventory to proceed with payment and delivery.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-block rounded-sm bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Browse Stock
        </Link>
      </div>
    );
  }

  const bankName = settings?.bank_name || "OPay / Moniepoint";
  const accountNum = settings?.account_number || "7030898561";
  const accountName = settings?.account_name || "EMMYKING STORES";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <p className="eyebrow text-muted-foreground uppercase tracking-widest text-xs font-semibold">Checkout</p>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Order & Payment
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Make your payment to the store bank details below, attach your transfer receipt, and provide your delivery address.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          {/* Section 1: Official Bank Details */}
          <div className="rounded-sm border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold tracking-tight">
                1. Make Transfer to Store Bank Account
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Transfer your order total to this account and capture a screenshot or photo of the payment receipt.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3 rounded-sm border border-border/80 bg-muted/30 p-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Bank Name
                </span>
                <span className="text-sm font-semibold text-foreground mt-0.5 block">{bankName}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Account Number
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-mono font-bold text-foreground">{accountNum}</span>
                  <button
                    type="button"
                    onClick={() => copyAccountNumber(accountNum)}
                    className="rounded p-1 text-muted-foreground hover:text-foreground transition"
                    title="Copy Account Number"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Account Name
                </span>
                <span className="text-sm font-semibold text-foreground mt-0.5 block">{accountName}</span>
              </div>
            </div>
            {settings?.payment_instructions && (
              <p className="mt-3 text-xs text-muted-foreground italic">
                Note: {settings.payment_instructions}
              </p>
            )}
          </div>

          {/* Section 2: Upload Payment Receipt (MANDATORY) */}
          <div className="rounded-sm border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  2. Upload Payment Receipt <span className="text-destructive">*</span>
                </h2>
              </div>
              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                Mandatory
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              You must upload an image of your transfer receipt before submitting. No request will be submitted without payment proof.
            </p>

            <div className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileSelect}
              />

              {receiptPreview ? (
                <div className="relative flex flex-col items-center justify-center rounded-sm border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-center">
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="max-h-48 rounded object-contain shadow-xs"
                  />
                  <p className="mt-2 text-xs font-semibold text-foreground truncate max-w-xs">
                    {receiptFile?.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-xs font-semibold text-primary underline hover:opacity-80"
                  >
                    Change Receipt Image
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center rounded-sm border-2 border-dashed border-border py-8 px-4 transition hover:border-foreground/40 hover:bg-muted/40"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="mt-2 text-sm font-semibold text-foreground">
                    Click to select payment receipt image
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    Supports JPG, PNG or PDF (Max 8MB)
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Section 3: Delivery & Contact Details */}
          <div className="rounded-sm border border-border bg-card p-5 shadow-xs space-y-4">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              3. Delivery & Contact Details
            </h2>

            <Field
              label="Full Name"
              name="customer_name"
              defaultValue={defaultName}
              error={errors.customer_name}
              required
              placeholder="e.g. John Doe"
            />

            <Field
              label="Phone Number"
              name="phone"
              type="tel"
              defaultValue={defaultPhone}
              error={errors.phone}
              required
              hint="We call or WhatsApp this number to confirm delivery."
              placeholder="e.g. 08012345678"
            />

            <Field
              label="Delivery Address"
              name="address"
              error={errors.address}
              required
              textarea
              placeholder="House/Street number, Area, City, State"
              hint="Your order will be packaged and delivered to this exact address."
            />

            <Field
              label="Email Address (Optional)"
              name="email"
              type="email"
              defaultValue={session?.user?.email || ""}
              error={errors.email}
              hint="If provided, order notifications and status updates are sent here."
              placeholder="e.g. customer@gmail.com"
            />

            <Field
              label="Order Notes (Optional)"
              name="notes"
              error={errors.notes}
              textarea
              placeholder="Any specific delivery instructions or preferences..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !receiptFile}
            className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {submitting
              ? "Submitting order & uploading receipt..."
              : !receiptFile
                ? "Attach payment receipt to submit"
                : "Submit Order & Payment Proof"}
          </button>
        </form>

        {/* Order Summary Aside */}
        <aside className="h-fit rounded-sm border border-border bg-card p-5 shadow-xs">
          <h2 className="font-display text-xl font-semibold tracking-tight">Order Summary</h2>
          <ul className="mt-4 divide-y divide-border border-y border-border text-sm">
            {items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{i.name}</span>
                  <span className="text-muted-foreground text-xs">Qty {i.qty}</span>
                </span>
                <span className="shrink-0 font-semibold text-sm">
                  {typeof i.price === "number" ? formatPrice(i.price * i.qty) : "On request"}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between text-base font-bold">
            <span>Total Payable</span>
            <span className="text-primary">{knownTotal === null ? "On request" : formatPrice(knownTotal)}</span>
          </div>

          <div className="mt-4 rounded-sm bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Status Guarantee</p>
            <p>Your order starts as <strong className="text-amber-600">Pending</strong> upon submission and is changed to <strong className="text-emerald-600">Successful</strong> as soon as payment is confirmed.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue = "",
  error,
  hint,
  type = "text",
  textarea,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  error?: string | undefined;
  hint?: string;
  type?: string;
  textarea?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  const base =
    "mt-1.5 w-full rounded-sm border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-ring";
  return (
    <div>
      <label htmlFor={name} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {textarea ? (
        <textarea
          id={name}
          name={name}
          rows={3}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={`${base} ${error ? "border-destructive" : "border-input"}`}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={`${base} ${error ? "border-destructive" : "border-input"}`}
        />
      )}
      {hint && !error && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

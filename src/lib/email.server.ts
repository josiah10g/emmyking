import { createServerFn } from "@tanstack/react-start";
import fs from "fs";
import path from "path";

function getEnvVar(key: string): string {
  if (process.env[key]) return process.env[key]!;
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith(`${key}=`)) {
        return trimmed.split("=")[1].trim().replace(/^['"]|['"]$/g, "");
      }
    }
  } catch {}
  return "";
}

export type OrderNotificationPayload = {
  type: "new_order" | "status_change";
  orderReference: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  deliveryAddress: string;
  items: { name: string; qty: number; price: number | null }[];
  total: number | null;
  status: "pending" | "successful" | "declined";
  adminNote?: string | null;
};

export const sendOrderEmailServer = createServerFn({ method: "POST" })
  .validator((payload: OrderNotificationPayload) => payload)
  .handler(async ({ data }) => {
    const resendApiKey = getEnvVar("RESEND_API_KEY");
    const adminNotificationEmail = getEnvVar("ADMIN_NOTIFICATION_EMAIL") || "emmanuelonyedikachi866@gmail.com";

    // Format currency
    const totalDisplay = data.total !== null 
      ? new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(data.total)
      : "Price on request";

    // Items list HTML
    const itemsListHtml = data.items
      .map((i) => `<li><strong>${i.name}</strong> × ${i.qty} — ${i.price ? '₦' + Number(i.price * i.qty).toLocaleString() : 'Price on request'}</li>`)
      .join("");

    console.log(`[Email Dispatcher] Triggered: ${data.type} for order ${data.orderReference} (${data.status})`);

    // If Resend API key is provided, send real live emails:
    if (resendApiKey) {
      try {
        if (data.type === "new_order") {
          // 1. Email to Admin
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "EMMYKING STORES <orders@emmyking.com>",
              to: [adminNotificationEmail],
              subject: `🚨 New Order & Payment Proof: ${data.orderReference} (${totalDisplay})`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
                  <h2 style="border-bottom: 2px solid #111; padding-bottom: 8px;">New Order Received</h2>
                  <p>A customer has placed an order and uploaded bank transfer proof.</p>
                  <p><strong>Order Reference:</strong> ${data.orderReference}</p>
                  <p><strong>Customer Name:</strong> ${data.customerName}</p>
                  <p><strong>Phone:</strong> ${data.customerPhone}</p>
                  <p><strong>Delivery Address:</strong> ${data.deliveryAddress}</p>
                  <h3>Items:</h3>
                  <ul>${itemsListHtml}</ul>
                  <p><strong>Total:</strong> ${totalDisplay}</p>
                  <p style="margin-top: 24px;">
                    <a href="https://emmyking.vercel.app/admin" style="background:#111; color:#fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                      Review Receipt in Admin Dashboard
                    </a>
                  </p>
                </div>
              `,
            }),
          });

          // 2. Email to Customer (if email provided)
          if (data.customerEmail) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "EMMYKING STORES <orders@emmyking.com>",
                to: [data.customerEmail],
                subject: `Your EMMYKING Order ${data.orderReference} is Pending Confirmation`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
                    <h2 style="border-bottom: 2px solid #111; padding-bottom: 8px;">Thank you for your order!</h2>
                    <p>Hello ${data.customerName},</p>
                    <p>We have received your order and payment receipt. Your order status is currently <span style="background: #fef08a; padding: 2px 8px; border-radius: 4px; font-weight: bold; color: #854d0e;">Pending</span> while our team verifies your transfer.</p>
                    <p><strong>Order Reference:</strong> ${data.orderReference}</p>
                    <p><strong>Delivery Address:</strong> ${data.deliveryAddress}</p>
                    <h3>Order Summary:</h3>
                    <ul>${itemsListHtml}</ul>
                    <p><strong>Total:</strong> ${totalDisplay}</p>
                    <p style="margin-top: 20px;">You can track your order status live in your <a href="https://emmyking.vercel.app/account">Customer Dashboard</a>.</p>
                  </div>
                `,
              }),
            });
          }
        } else if (data.type === "status_change" && data.customerEmail) {
          // Status change email to customer
          const isSuccess = data.status === "successful";
          const statusBadge = isSuccess
            ? '<span style="background: #bbf7d0; padding: 3px 10px; border-radius: 4px; font-weight: bold; color: #166534;">Successful</span>'
            : '<span style="background: #fecaca; padding: 3px 10px; border-radius: 4px; font-weight: bold; color: #991b1b;">Declined</span>';

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "EMMYKING STORES <orders@emmyking.com>",
              to: [data.customerEmail],
              subject: isSuccess 
                ? `🎉 Payment Confirmed: Order ${data.orderReference} is Successful!`
                : `⚠️ Update on your Order ${data.orderReference}: Declined`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
                  <h2>Order Status Update</h2>
                  <p>Hello ${data.customerName},</p>
                  <p>Your order <strong>${data.orderReference}</strong> status is now: ${statusBadge}</p>
                  ${data.adminNote ? `<div style="background: #f4f4f5; padding: 12px; border-left: 4px solid #111; margin: 16px 0;"><p style="margin: 0;"><strong>Store Note:</strong> ${data.adminNote}</p></div>` : ""}
                  <p><strong>Delivery Destination:</strong> ${data.deliveryAddress}</p>
                  <h3>Items:</h3>
                  <ul>${itemsListHtml}</ul>
                  <p style="margin-top: 24px;">
                    <a href="https://emmyking.vercel.app/account" style="background:#111; color:#fff; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                      View in Customer Dashboard
                    </a>
                  </p>
                </div>
              `,
            }),
          });
        }
      } catch (err) {
        console.error("[Email Server Error]", err);
      }
    }

    return { success: true };
  });

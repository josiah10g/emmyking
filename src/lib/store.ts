export const STORE = {
  name: "EMMYKING STORES",
  tagline: "Premium phones, laptops & gadgets",
  phone: "+234 703 089 8561",
  phoneHref: "tel:+2347030898561",
  whatsapp: "https://wa.me/2347030898561",
  email: "emmanuelonyedikachi866@gmail.com",
  emailHref: "mailto:emmanuelonyedikachi866@gmail.com",
} as const;

export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return "Price on request";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(price);
}

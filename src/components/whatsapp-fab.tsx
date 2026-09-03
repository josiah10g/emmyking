import { useRouterState } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { STORE } from "@/lib/store";

const MESSAGE = "Hi EMMYKING STORES, I'd like to enquire about a device.";

export function whatsappLink(text: string = MESSAGE) {
  return `${STORE.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function WhatsAppFab() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/checkout")) return null;

  return (
    <a
      href={whatsappLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with EMMYKING STORES on WhatsApp"
      className="fixed right-4 bottom-4 z-50 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-lg transition-transform hover:scale-105 sm:right-6 sm:bottom-6"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">Chat on WhatsApp</span>
    </a>
  );
}

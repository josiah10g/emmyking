import { useEffect, useState } from "react";

export function PageInitialLoader() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Check session storage so splash only animates once per browsing session
    const hasLoaded = sessionStorage.getItem("emmy_splash_shown");
    if (hasLoaded) {
      setVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      setFading(true);
      sessionStorage.setItem("emmy_splash_shown", "true");
      const removeTimer = setTimeout(() => setVisible(false), 500);
      return () => clearTimeout(removeTimer);
    }, 700);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="relative flex flex-col items-center">
        {/* Ambient glow */}
        <div className="absolute -inset-6 rounded-full bg-primary/15 blur-2xl animate-pulse" />

        {/* Animated Brand Badge */}
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card shadow-2xl">
          <span className="font-display text-3xl font-bold tracking-tighter text-primary">
            EK
          </span>
          <div className="absolute -inset-1 rounded-2xl border-2 border-primary/20 border-t-primary animate-spin" />
        </div>

        <h2 className="mt-6 font-display text-2xl font-semibold tracking-tight text-foreground">
          EMMYKING STORES
        </h2>
        <span className="eyebrow mt-1 text-xs tracking-[0.25em] text-muted-foreground uppercase">
          Authentic Gadget Retail
        </span>

        {/* Minimalist progress track */}
        <div className="mt-8 h-1 w-44 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-full bg-primary animate-pulse" />
        </div>
      </div>
    </div>
  );
}

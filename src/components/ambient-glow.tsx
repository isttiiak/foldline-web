import { cn } from "@/lib/utils";

/**
 * Soft, slowly drifting colour blobs behind a page. Pure CSS; the drift only
 * runs when the user has not asked the OS to reduce motion.
 */
export function AmbientGlow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      data-testid="ambient-glow"
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <div className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-amber/20 blur-3xl motion-safe:animate-drift" />
      <div className="absolute top-1/3 -right-32 size-[26rem] rounded-full bg-rose/15 blur-3xl motion-safe:animate-drift-slow" />
      <div className="absolute -bottom-40 left-1/4 size-[24rem] rounded-full bg-teal/15 blur-3xl motion-safe:animate-drift" />
    </div>
  );
}

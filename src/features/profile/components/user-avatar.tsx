import Image from "next/image";

import { cn } from "@/lib/utils";

import { initials } from "../schemas";

/**
 * A reader's photo, or their initials on a warm gradient. Photos are signed
 * Storage URLs or the sign-in provider's URL: shown as-is, not optimised.
 */
export function UserAvatar({
  src,
  name,
  size,
  className,
}: {
  src: string | null;
  name: string | null;
  size: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[linear-gradient(135deg,var(--amber),var(--coral)_55%,var(--rose))] font-semibold text-primary-foreground select-none",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={size}
          height={size}
          unoptimized
          referrerPolicy="no-referrer"
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}

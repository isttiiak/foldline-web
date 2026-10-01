"use client";

import { Camera, Check, Loader2, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import {
  startTransition,
  useActionState,
  useId,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { springs } from "@/lib/motion";

import { resizePhoto } from "@/lib/images";
import { AVATAR_TYPES, type AvatarState } from "../schemas";
import { removeAvatarAction, uploadAvatarAction } from "../server/actions";
import { UserAvatar } from "./user-avatar";

const idle: AvatarState = { status: "idle" };

/** Change the profile photo: pick, shrink in the browser, upload; or go back to Google's. */
export function AvatarEditor({
  avatarSrc,
  name,
  hasOwnPhoto,
  hasProviderPhoto,
}: {
  avatarSrc: string | null;
  name: string | null;
  hasOwnPhoto: boolean;
  hasProviderPhoto: boolean;
}) {
  const t = useTranslations("Profile.photo");
  const inputRef = useRef<HTMLInputElement>(null);
  const [preparing, setPreparing] = useState(false);
  const [localError, setLocalError] = useState<"type" | "generic" | null>(null);
  const [uploadState, upload, uploading] = useActionState(
    uploadAvatarAction,
    idle,
  );
  const [removeState, remove, removing] = useActionState(
    removeAvatarAction,
    idle,
  );
  const hintId = useId();

  const busy = preparing || uploading || removing;
  const latest =
    (uploadState.status === "saved" ? uploadState.savedAt : 0) >
    (removeState.status === "saved" ? removeState.savedAt : 0)
      ? uploadState
      : removeState;
  const serverError =
    uploadState.status === "error"
      ? uploadState.reason
      : removeState.status === "error"
        ? removeState.reason
        : null;
  const error = localError ?? serverError;

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setLocalError(null);
    if (!file.type.startsWith("image/")) {
      setLocalError("type");
      return;
    }
    setPreparing(true);
    try {
      const photo = await resizePhoto(file);
      const formData = new FormData();
      formData.set("avatar", photo);
      startTransition(() => upload(formData));
    } catch {
      setLocalError("generic");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
      <div className="relative">
        <UserAvatar
          src={avatarSrc}
          name={name}
          size={96}
          className="ring-2 ring-amber/40"
        />
        <AnimatePresence>
          {busy && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60"
            >
              <Loader2 className="size-6 animate-spin text-amber" aria-hidden />
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col gap-3">
        <p id={hintId} className="text-sm text-muted-foreground">
          {t("hint")}
        </p>
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <input
            ref={inputRef}
            type="file"
            accept={[...AVATAR_TYPES, "image/heic", "image/heif"].join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={onPick}
          />
          <Button
            type="button"
            size="lg"
            className="h-10 gap-2 rounded-xl px-4"
            disabled={busy}
            aria-describedby={hintId}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="size-4" aria-hidden />
            {t(hasOwnPhoto || hasProviderPhoto ? "change" : "add")}
          </Button>
          {hasOwnPhoto && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-10 gap-2 rounded-xl px-4"
              disabled={busy}
              onClick={() => startTransition(() => remove())}
            >
              <RotateCcw className="size-4" aria-hidden />
              {t(hasProviderPhoto ? "useProvider" : "remove")}
            </Button>
          )}
        </div>
        <div aria-live="polite" className="min-h-5 text-sm">
          {error ? (
            <p role="alert" className="text-destructive">
              {t(`errors.${error}`)}
            </p>
          ) : (
            latest.status === "saved" &&
            !busy && (
              <motion.p
                key={latest.savedAt}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springs.gentle}
                className="flex items-center justify-center gap-1.5 text-teal sm:justify-start"
              >
                <Check className="size-4" aria-hidden />
                {t("saved")}
              </motion.p>
            )
          )}
        </div>
      </div>
    </div>
  );
}

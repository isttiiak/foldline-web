"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

/** Chromium's install event (not in the DOM types yet). */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const STANDALONE = "(display-mode: standalone)";

function subscribeStandalone(onChange: () => void) {
  const query = window.matchMedia(STANDALONE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function isIos(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/**
 * Install Foldline as an app. Uses the browser's own prompt where there is one
 * (Chromium), explains "Add to Home Screen" on iPhone and iPad, and says so
 * when it is already installed. Never nags: it only lives on this page.
 */
export function InstallApp() {
  const t = useTranslations("Pwa.install");
  const standalone = useSyncExternalStore(
    subscribeStandalone,
    () => window.matchMedia(STANDALONE).matches,
    () => false,
  );
  const ios = useSyncExternalStore(
    () => () => undefined,
    isIos,
    () => false,
  );
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    setPrompt(null);
    if (choice.outcome === "accepted") setInstalled(true);
  }

  if (standalone || installed) {
    return <p className="text-sm text-teal">{t("installed")}</p>;
  }
  if (prompt) {
    return (
      <div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-11 gap-2 rounded-xl px-4"
          onClick={install}
        >
          <Download className="size-4" aria-hidden />
          {t("button")}
        </Button>
      </div>
    );
  }
  return (
    <p className="text-sm text-muted-foreground">
      {ios ? t("ios") : t("other")}
    </p>
  );
}

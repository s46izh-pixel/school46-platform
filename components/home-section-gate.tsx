"use client";

import { defaultHomeSectionSettings, type HomeSectionId } from "@/lib/home-sections";
import { getPublicHomeSections } from "@/lib/public-admin-store-client";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export function HomeSectionGate({ id, children }: { id: HomeSectionId; children: ReactNode }) {
  const [settings, setSettings] = useState<Record<HomeSectionId, boolean> | null>(null);

  useEffect(() => {
    function loadSettings() {
      getPublicHomeSections()
        .then((homeSections) => setSettings({ ...defaultHomeSectionSettings(), ...homeSections } as Record<HomeSectionId, boolean>))
        .catch(() => setSettings(defaultHomeSectionSettings()));
    }

    loadSettings();
    window.addEventListener("storage", loadSettings);
    window.addEventListener("school46.home-sections-updated", loadSettings);
    return () => {
      window.removeEventListener("storage", loadSettings);
      window.removeEventListener("school46.home-sections-updated", loadSettings);
    };
  }, []);

  if (!settings) return null;
  return settings[id] === false ? null : <>{children}</>;
}

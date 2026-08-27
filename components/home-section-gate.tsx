"use client";

import { getAdminStore } from "@/lib/admin-store-client";
import { defaultHomeSectionSettings, homeSectionSettingsKey, type HomeSectionId, type HomeSectionSettings } from "@/lib/home-sections";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export function HomeSectionGate({ id, children }: { id: HomeSectionId; children: ReactNode }) {
  const [settings, setSettings] = useState(defaultHomeSectionSettings);

  useEffect(() => {
    function loadSettings() {
      getAdminStore()
        .then((store) => setSettings({ ...defaultHomeSectionSettings(), ...store.homeSections } as Record<HomeSectionId, boolean>))
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

  return settings[id] === false ? null : <>{children}</>;
}

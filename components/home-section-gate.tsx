"use client";

import { defaultHomeSectionSettings, type HomeSectionId, type HomeSectionSettings } from "@/lib/home-sections";
import { getPublicHomeSections } from "@/lib/public-admin-store-client";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

type ResolvedHomeSectionSettings = Record<HomeSectionId, boolean>;

const HomeSectionsContext = createContext<ResolvedHomeSectionSettings | null>(null);

export function HomeSectionsProvider({
  initialSettings,
  children
}: {
  initialSettings: HomeSectionSettings;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState<ResolvedHomeSectionSettings>(() => resolveSettings(initialSettings));

  useEffect(() => {
    let active = true;

    function loadSettings() {
      getPublicHomeSections()
        .then((homeSections) => {
          if (active) setSettings(resolveSettings(homeSections));
        })
        .catch(() => null);
    }

    window.addEventListener("storage", loadSettings);
    window.addEventListener("school46.home-sections-updated", loadSettings);
    return () => {
      active = false;
      window.removeEventListener("storage", loadSettings);
      window.removeEventListener("school46.home-sections-updated", loadSettings);
    };
  }, []);

  return <HomeSectionsContext.Provider value={settings}>{children}</HomeSectionsContext.Provider>;
}

export function HomeSectionGate({ id, children }: { id: HomeSectionId; children: ReactNode }) {
  const settings = useContext(HomeSectionsContext) ?? defaultHomeSectionSettings();
  return settings[id] === false ? null : <>{children}</>;
}

function resolveSettings(settings: HomeSectionSettings): ResolvedHomeSectionSettings {
  return { ...defaultHomeSectionSettings(), ...settings };
}

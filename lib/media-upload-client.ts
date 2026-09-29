import type { ApplicationAttachment } from "./types";

type MediaScope = "events" | "news" | "applications";

export async function uploadMediaFile(
  file: File,
  options: {
    scope: MediaScope;
    slug?: string;
    variant?: string;
    eventId?: string;
    applicationId?: string;
  }
): Promise<ApplicationAttachment | null> {
  const body = new FormData();
  body.set("file", file);
  body.set("scope", options.scope);
  if (options.slug) body.set("slug", options.slug);
  if (options.variant) body.set("variant", options.variant);
  if (options.eventId) body.set("eventId", options.eventId);
  if (options.applicationId) body.set("applicationId", options.applicationId);

  const response = await fetch("/api/media/upload", { method: "POST", body });
  const data = await response.json().catch(() => ({})) as ApplicationAttachment & { code?: string; message?: string };
  if (response.status === 503 && data.code === "media_storage_unconfigured") return null;
  if (!response.ok) throw new Error(data.message || "Не удалось загрузить файл в хранилище.");
  return data;
}

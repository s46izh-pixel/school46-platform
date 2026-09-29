import { createHash, createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import type { ApplicationAttachment, ApplicationItem } from "./types";

const defaultSpreadsheetId = "179lCdPI8cELOP4Zl5ny5mbcwcNKe6Bfrd54QppwpDG0";
const sheetsApiBase = "https://sheets.googleapis.com/v4/spreadsheets";
const tokenEndpoint = "https://oauth2.googleapis.com/token";
const sheetsScope = "https://www.googleapis.com/auth/spreadsheets";

let cachedToken: { value: string; expiresAt: number } | null = null;

export type GoogleApplicationsExportResult = {
  spreadsheetUrl: string;
  sheets: string[];
  applications: number;
};

export async function exportApplicationsToGoogleSheets(applications: ApplicationItem[], siteUrl: string): Promise<GoogleApplicationsExportResult> {
  if (!applications.length) throw new GoogleExportError("Нет заявок для выгрузки.", 400);
  const config = googleConfig();
  const token = await accessToken(config);
  const groups = groupByEvent(applications);
  const allocatedTitles = allocateSheetTitles(Array.from(groups.keys()));
  let sheets = await getSheets(config.spreadsheetId, token);
  const existingTitles = new Set(sheets.map((sheet) => sheet.title));
  const missingTitles = Array.from(allocatedTitles.values()).filter((title) => !existingTitles.has(title));

  if (missingTitles.length) {
    await googleRequest(`${sheetsApiBase}/${config.spreadsheetId}:batchUpdate`, token, {
      method: "POST",
      body: JSON.stringify({ requests: missingTitles.map((title) => ({ addSheet: { properties: { title } } })) })
    });
    sheets = await getSheets(config.spreadsheetId, token);
  }

  const sheetByTitle = new Map(sheets.map((sheet) => [sheet.title, sheet]));
  const formattedSheetIds: number[] = [];

  for (const [eventTitle, items] of groups) {
    const sheetTitle = allocatedTitles.get(eventTitle) ?? safeSheetTitle(eventTitle);
    const sheet = sheetByTitle.get(sheetTitle);
    if (!sheet) throw new GoogleExportError(`Не удалось создать лист «${sheetTitle}».`);
    const rangeTitle = quoteSheetTitle(sheetTitle);
    await googleRequest(`${sheetsApiBase}/${config.spreadsheetId}/values/${encodeURIComponent(`${rangeTitle}!A:Z`)}:clear`, token, {
      method: "POST",
      body: "{}"
    });
    await googleRequest(
      `${sheetsApiBase}/${config.spreadsheetId}/values/${encodeURIComponent(`${rangeTitle}!A1`)}?valueInputOption=USER_ENTERED`,
      token,
      {
        method: "PUT",
        body: JSON.stringify({ values: applicationRows(items, siteUrl) })
      }
    );
    formattedSheetIds.push(sheet.id);
  }

  if (formattedSheetIds.length) {
    await googleRequest(`${sheetsApiBase}/${config.spreadsheetId}:batchUpdate`, token, {
      method: "POST",
      body: JSON.stringify({
        requests: formattedSheetIds.flatMap((sheetId) => [
          { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
          { repeatCell: { range: { sheetId, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.91, green: 0.95, blue: 1 } } }, fields: "userEnteredFormat(textFormat,backgroundColor)" } },
          { autoResizeDimensions: { dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 18 } } }
        ])
      })
    });
  }

  return {
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`,
    sheets: Array.from(allocatedTitles.values()),
    applications: applications.length
  };
}

export class GoogleExportError extends Error {
  constructor(message: string, public readonly status = 500) {
    super(message);
  }
}

function googleConfig() {
  const spreadsheetId = (process.env.GOOGLE_APPLICATIONS_SHEET_ID || defaultSpreadsheetId).trim();
  const credentialsFile = (process.env.GOOGLE_SERVICE_ACCOUNT_FILE || "").trim();
  let clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
  let privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();

  if (credentialsFile) {
    try {
      const credentials = JSON.parse(readFileSync(credentialsFile, "utf8")) as {
        client_email?: string;
        private_key?: string;
      };
      clientEmail = credentials.client_email?.trim() || clientEmail;
      privateKey = credentials.private_key?.trim() || privateKey;
    } catch {
      throw new GoogleExportError("Не удалось прочитать локальный файл сервисного аккаунта Google.", 503);
    }
  }

  if (!clientEmail || !privateKey) {
    throw new GoogleExportError("Выгрузка в Google Таблицу ещё не подключена: нужны данные сервисного аккаунта.", 503);
  }
  return { spreadsheetId, clientEmail, privateKey };
}

async function accessToken(config: ReturnType<typeof googleConfig>) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: config.clientEmail,
    scope: sheetsScope,
    aud: tokenEndpoint,
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(config.privateKey);
  const assertion = `${unsigned}.${base64Url(signature)}`;
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000)
  });
  const data = await response.json().catch(() => ({})) as { access_token?: string; expires_in?: number };
  if (!response.ok || !data.access_token) {
    throw new GoogleExportError("Google не принял данные сервисного аккаунта. Проверьте ключ и доступ к API.", 502);
  }
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cachedToken.value;
}

async function getSheets(spreadsheetId: string, token: string) {
  const data = await googleRequest(`${sheetsApiBase}/${spreadsheetId}?fields=sheets.properties(sheetId,title)`, token) as {
    sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
  };
  return (data.sheets ?? [])
    .map((sheet) => ({ id: sheet.properties?.sheetId, title: sheet.properties?.title }))
    .filter((sheet): sheet is { id: number; title: string } => typeof sheet.id === "number" && Boolean(sheet.title));
}

async function googleRequest(url: string, token: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) {
    if (response.status === 403) {
      throw new GoogleExportError("Нет доступа к Google Таблице. Откройте сервисному аккаунту права редактора.", 403);
    }
    if (response.status === 404) throw new GoogleExportError("Указанная Google Таблица не найдена.", 404);
    throw new GoogleExportError(`Google Sheets вернул ошибку ${response.status}.`, 502);
  }
  return response.status === 204 ? {} : response.json();
}

function applicationRows(items: ApplicationItem[], siteUrl: string) {
  const maxAttachments = Math.max(1, ...items.map((item) => item.files?.length ?? 0));
  const header = [
    "Дата", "ID заявки", "Мероприятие", "Тип", "Приём заявок до", "Статус", "Класс", "ФИО участника", "Педагог",
    "Номинация", "Контакт", "Ссылка на работу", "Комментарий", "Согласие",
    ...Array.from({ length: maxAttachments }, (_, index) => `Вложение ${index + 1}`)
  ];
  return [header, ...items.map((item) => [
    safeCell(formatDateTime(item.createdAt)),
    safeCell(item.applicationId || item.id),
    safeCell(item.eventTitle || item.contest),
    safeCell(eventTypeLabel(item.eventType)),
    safeCell(item.eventDeadline),
    safeCell(statusLabel(item.status)),
    safeCell(item.className),
    safeCell(item.student),
    safeCell(item.mentor),
    safeCell(item.nomination),
    safeCell(item.contact),
    safeCell(item.workUrl),
    safeCell(item.comment),
    item.consent ? "Да" : "Нет",
    ...Array.from({ length: maxAttachments }, (_, index) => safeCell(attachmentCell(item.files?.[index], siteUrl)))
  ])];
}

function attachmentCell(file: ApplicationAttachment | undefined, siteUrl: string) {
  if (!file) return "";
  const url = absoluteAttachmentUrl(file, siteUrl);
  return url || `${file.name} (старое вложение без отдельной ссылки)`;
}

function absoluteAttachmentUrl(file: ApplicationAttachment, siteUrl: string) {
  const value = file.url || (file.key ? `/api/media/file?key=${encodeURIComponent(file.key)}` : "");
  if (!value) return "";
  try {
    return new URL(value, siteUrl).toString();
  } catch {
    return "";
  }
}

function groupByEvent(applications: ApplicationItem[]) {
  const groups = new Map<string, ApplicationItem[]>();
  for (const application of applications) {
    const title = (application.eventTitle || application.contest || "Мероприятие").trim() || "Мероприятие";
    groups.set(title, [...(groups.get(title) ?? []), application]);
  }
  return new Map(Array.from(groups.entries()).sort(([first], [second]) => first.localeCompare(second, "ru")));
}

function allocateSheetTitles(eventTitles: string[]) {
  const result = new Map<string, string>();
  const used = new Set<string>();
  for (const eventTitle of eventTitles) {
    let title = safeSheetTitle(eventTitle);
    if (used.has(title.toLocaleLowerCase("ru"))) {
      const suffix = createHash("sha256").update(eventTitle).digest("hex").slice(0, 6);
      title = `${title.slice(0, 93)}-${suffix}`;
    }
    used.add(title.toLocaleLowerCase("ru"));
    result.set(eventTitle, title);
  }
  return result;
}

function safeSheetTitle(value: string) {
  return value.replace(/[\[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100) || "Мероприятие";
}

function quoteSheetTitle(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function safeCell(value: unknown) {
  const text = String(value ?? "").trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Samara"
  }).format(date);
}

function eventTypeLabel(type: ApplicationItem["eventType"]) {
  return type === "contest" ? "Конкурс" : type === "action" ? "Акция" : "Мероприятие";
}

function statusLabel(status: ApplicationItem["status"]) {
  return ({ new: "Новая", accepted: "Принята", revision: "На доработке", rejected: "Отклонена", sent: "Отправлена" } as const)[status] ?? status;
}

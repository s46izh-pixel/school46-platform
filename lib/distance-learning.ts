import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { DISTANCE_LEARNING_REVALIDATE_SECONDS } from "./cache";
import { normalizeClassName, sortClasses } from "./class-utils";
import { mutateAdminStore, readAdminStore } from "./admin-store";
import type { DistanceLearningDay, DistanceLearningLink, DistanceLearningLesson } from "./types";

const sheetsApiBase = "https://sheets.googleapis.com/v4/spreadsheets";
const tokenEndpoint = "https://oauth2.googleapis.com/token";
const readonlySheetsScope = "https://www.googleapis.com/auth/spreadsheets.readonly";
const fetchTimeoutMs = 15_000;

const saturdaySources = [
  {
    id: process.env.GOOGLE_DISTANCE_5_7_SHEET_ID ?? "1i1nnAgAi-LGvDge22hcFZ4tkkkrdl-svx0P9NxznBto",
    label: "5-7 классы",
    fallbackSheets: ["5 классы", "6 классы", "7 классы"]
  },
  {
    id: process.env.GOOGLE_DISTANCE_8_11_SHEET_ID ?? "1ncQGGHJ8-3yr2voXA5zrhj4qk2v0atDUu4Dg3xlk4vw",
    label: "8-11 классы",
    fallbackSheets: ["8 классы", "9 классы", "10-11 классы"]
  }
];

const temporarySources = [
  {
    id: process.env.GOOGLE_TEMPORARY_DISTANCE_1_4_SHEET_ID ?? "1atEGRD86Jyt4heRXHhl-yg0plvmLDuz34N07UJ_m1pE",
    label: "1-4 классы",
    fallbackSheets: ["1 классы", "2 классы", "3 классы", "4 классы"]
  },
  {
    id: process.env.GOOGLE_TEMPORARY_DISTANCE_5_8_SHEET_ID ?? "1s8VTg0uvx1_ygcngPnxFrdMt28UzHf4_8BRTLrWMlvo",
    label: "5-8 классы",
    fallbackSheets: ["5 классы", "6 классы", "7 классы", "8 классы"]
  },
  {
    id: process.env.GOOGLE_TEMPORARY_DISTANCE_9_11_SHEET_ID ?? "1AMbojiKLQ0U71K7k2-vqgDp1k-QwAf-QQn3OglQPHQo",
    label: "9-11 классы",
    fallbackSheets: ["9 классы", "10-11 классы"]
  }
];

type DistanceSource = {
  id: string;
  label: string;
  fallbackSheets: string[];
};

type DistanceCell = {
  text: string;
  links: DistanceLearningLink[];
};

type DistanceSheet = {
  title: string;
  rows: DistanceCell[][];
};

type GoogleCellData = {
  formattedValue?: string;
  hyperlink?: string;
  effectiveValue?: { stringValue?: string; numberValue?: number; boolValue?: boolean };
  userEnteredValue?: { stringValue?: string; numberValue?: number; boolValue?: boolean; formulaValue?: string };
  textFormatRuns?: Array<{ startIndex?: number; format?: { link?: { uri?: string } } }>;
};

type GoogleSpreadsheet = {
  sheets?: Array<{
    properties?: { title?: string };
    data?: Array<{
      startRow?: number;
      startColumn?: number;
      rowData?: Array<{ values?: GoogleCellData[] }>;
    }>;
  }>;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getDistanceLearningDays(): Promise<DistanceLearningDay[]> {
  return getDaysFromSources(saturdaySources);
}

export async function getTemporaryDistanceLearningDays(): Promise<DistanceLearningDay[]> {
  return getDaysFromSources(temporarySources);
}

export async function getDistanceLearningData(today: string) {
  const [saturdayLive, temporaryLive, store] = await Promise.all([
    getDistanceLearningDays(),
    getTemporaryDistanceLearningDays(),
    readAdminStore()
  ]);
  const saturday = mergeWithPastSnapshots(store.distanceLearningSnapshots.saturday, saturdayLive, today);
  const temporary = mergeWithPastSnapshots(store.distanceLearningSnapshots.temporary, temporaryLive, today);
  const nextSnapshots = {
    saturday: snapshotDays(store.distanceLearningSnapshots.saturday, saturdayLive, today),
    temporary: snapshotDays(store.distanceLearningSnapshots.temporary, temporaryLive, today)
  };

  if (JSON.stringify(nextSnapshots) !== JSON.stringify(store.distanceLearningSnapshots)) {
    await mutateAdminStore((current) => ({
      distanceLearningSnapshots: {
        saturday: snapshotDays(current.distanceLearningSnapshots.saturday, saturdayLive, today),
        temporary: snapshotDays(current.distanceLearningSnapshots.temporary, temporaryLive, today)
      }
    }));
  }

  return { saturdayDays: saturday, temporaryDays: temporary };
}

function mergeWithPastSnapshots(stored: DistanceLearningDay[], live: DistanceLearningDay[], today: string) {
  return mergeDays(live, stored.filter((day) => day.date < today));
}

function snapshotDays(stored: DistanceLearningDay[], live: DistanceLearningDay[], today: string) {
  return mergeDays(live, stored.filter((day) => day.date < today));
}

function mergeDays(first: DistanceLearningDay[], second: DistanceLearningDay[]) {
  const unique = new Map<string, DistanceLearningDay>();
  for (const day of [...first, ...second]) unique.set(`${day.date}|${day.className}`, day);
  return Array.from(unique.values()).sort((left, right) => (
    left.date.localeCompare(right.date) || compareClassNames(left.className, right.className)
  ));
}

async function getDaysFromSources(sources: DistanceSource[]) {
  const results = await Promise.allSettled(sources.map(async (source) => {
    const sheets = await readWorkbook(source.id, source.fallbackSheets);
    return sheets.flatMap((sheet) => mapDistanceSheet(sheet, source.label));
  }));

  const unique = new Map<string, DistanceLearningDay>();
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const day of result.value) unique.set(`${day.date}|${day.className}`, day);
  }

  return Array.from(unique.values()).sort((first, second) => (
    first.date.localeCompare(second.date) || compareClassNames(first.className, second.className)
  ));
}

async function readWorkbook(spreadsheetId: string, fallbackSheets: string[]) {
  try {
    const token = await getAccessToken();
    if (token) return await readWorkbookFromApi(spreadsheetId, token);
  } catch {
    // Public CSV remains available when the service account has not been granted access yet.
  }
  return readWorkbookFromCsv(spreadsheetId, fallbackSheets);
}

async function readWorkbookFromApi(spreadsheetId: string, token: string): Promise<DistanceSheet[]> {
  const response = await fetch(`${sheetsApiBase}/${spreadsheetId}?includeGridData=true`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: DISTANCE_LEARNING_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(fetchTimeoutMs)
  });
  if (!response.ok) throw new Error(`Google Sheets API: ${response.status}`);
  const workbook = await response.json() as GoogleSpreadsheet;
  return (workbook.sheets ?? []).flatMap((sheet) => {
    const title = sheet.properties?.title?.trim();
    if (!title) return [];
    const rows: DistanceCell[][] = [];
    for (const grid of sheet.data ?? []) {
      const startRow = grid.startRow ?? 0;
      const startColumn = grid.startColumn ?? 0;
      (grid.rowData ?? []).forEach((row, rowOffset) => {
        const rowIndex = startRow + rowOffset;
        rows[rowIndex] ??= [];
        (row.values ?? []).forEach((cell, columnOffset) => {
          rows[rowIndex][startColumn + columnOffset] = mapGoogleCell(cell);
        });
      });
    }
    return [{ title, rows }];
  });
}

async function readWorkbookFromCsv(spreadsheetId: string, sheetNames: string[]): Promise<DistanceSheet[]> {
  const results = await Promise.allSettled(sheetNames.map(async (title) => {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(title)}`;
    const response = await fetch(url, {
      next: { revalidate: DISTANCE_LEARNING_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(fetchTimeoutMs)
    });
    if (!response.ok) throw new Error(`Google Sheets CSV: ${response.status}`);
    const rows = parseCsv(await response.text()).map((row) => row.map((text) => ({ text, links: linksFromText(text) })));
    return { title, rows };
  }));
  const sheets = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  if (!sheets.length) throw new Error("Таблицы дистанционного обучения недоступны");
  return sheets;
}

function mapGoogleCell(cell: GoogleCellData): DistanceCell {
  const text = cell.formattedValue ?? primitiveValue(cell.effectiveValue) ?? primitiveValue(cell.userEnteredValue) ?? "";
  const links = new Map<string, DistanceLearningLink>();
  const addLink = (url: string | undefined, label = "Открыть ссылку") => {
    const safeUrl = safeExternalUrl(url);
    if (safeUrl) links.set(safeUrl, { url: safeUrl, label: label.trim() || "Открыть ссылку" });
  };

  addLink(cell.hyperlink, text);
  const runs = cell.textFormatRuns ?? [];
  runs.forEach((run, index) => {
    const start = run.startIndex ?? 0;
    const end = runs[index + 1]?.startIndex ?? text.length;
    addLink(run.format?.link?.uri, text.slice(start, end));
  });

  const formula = cell.userEnteredValue?.formulaValue ?? "";
  const hyperlinkFormula = formula.match(/HYPERLINK\(\s*["']([^"']+)["']\s*[;,]\s*["']([^"']*)["']/i);
  if (hyperlinkFormula) addLink(hyperlinkFormula[1], hyperlinkFormula[2]);
  linksFromText(text).forEach((link) => links.set(link.url, link));
  return { text: text.trim(), links: Array.from(links.values()) };
}

function primitiveValue(value: GoogleCellData["effectiveValue"] | GoogleCellData["userEnteredValue"]) {
  if (!value) return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("numberValue" in value) return String(value.numberValue);
  if ("boolValue" in value) return value.boolValue ? "TRUE" : "FALSE";
  return undefined;
}

function mapDistanceSheet(sheet: DistanceSheet, source: string): DistanceLearningDay[] {
  const days = new Map<string, DistanceLearningDay>();
  let classColumns: Array<{ index: number; className: string }> = [];
  let date = "";

  for (let rowIndex = 0; rowIndex < sheet.rows.length; rowIndex += 1) {
    const row = sheet.rows[rowIndex] ?? [];
    const detectedClasses = row
      .map((cell, index) => ({ index, className: normalizeClassName(cell?.text ?? "") }))
      .filter((item) => item.index > 0 && Boolean(item.className));

    if (detectedClasses.length && /дата|время/i.test(row[0]?.text ?? "")) {
      classColumns = detectedClasses;
      date = findDate(sheet.rows, rowIndex + 1);
      continue;
    }

    const rowDate = parseDate(row[0]?.text ?? "");
    if (classColumns.length && rowDate) {
      date = rowDate;
      continue;
    }

    if (!date || !classColumns.length) continue;
    const descriptor = parseLessonDescriptor(row[0]?.text ?? "");
    if (!descriptor) continue;
    const teacherRow = findLabeledRow(sheet.rows, rowIndex + 1, 3, /педагог/i);
    const assignmentRow = findLabeledRow(sheet.rows, rowIndex + 1, 4, /задани/i);

    classColumns.forEach(({ index, className }) => {
      const subject = row[index]?.text?.trim() ?? "";
      if (!subject) return;
      const assignmentCell = assignmentRow?.[index] ?? emptyCell();
      const lesson: DistanceLearningLesson = {
        number: descriptor.number,
        time: descriptor.time,
        subject,
        teacher: teacherRow?.[index]?.text?.trim() ?? "",
        assignment: assignmentCell.text.trim(),
        links: assignmentCell.links
      };
      const key = `${date}|${className}`;
      const day = days.get(key) ?? { date, className, source, lessons: [] };
      day.lessons.push(lesson);
      days.set(key, day);
    });
  }

  return Array.from(days.values()).map((day) => ({
    ...day,
    lessons: deduplicateLessons(day.lessons).sort((first, second) => first.number - second.number)
  }));
}

function deduplicateLessons(lessons: DistanceLearningLesson[]) {
  const unique = new Map<string, DistanceLearningLesson>();
  for (const lesson of lessons) {
    const key = `${lesson.number}|${lesson.subject.toLowerCase()}|${lesson.teacher.toLowerCase()}`;
    const current = unique.get(key);
    if (!current || (!hasAssignment(current) && hasAssignment(lesson))) unique.set(key, lesson);
  }
  return Array.from(unique.values());
}

function hasAssignment(lesson: DistanceLearningLesson) {
  return Boolean(lesson.assignment.trim() || lesson.links.length);
}

function findDate(rows: DistanceCell[][], startIndex: number) {
  for (let index = startIndex; index < Math.min(rows.length, startIndex + 3); index += 1) {
    const parsed = parseDate(rows[index]?.[0]?.text ?? "");
    if (parsed) return parsed;
  }
  return "";
}

function findLabeledRow(rows: DistanceCell[][], startIndex: number, distance: number, pattern: RegExp) {
  for (let index = startIndex; index < Math.min(rows.length, startIndex + distance); index += 1) {
    const row = rows[index] ?? [];
    if (pattern.test(row[0]?.text ?? "")) return row;
  }
  return undefined;
}

function parseLessonDescriptor(value: string) {
  const lessonMatch = value.match(/(\d+)\s*урок/i);
  if (!lessonMatch) return undefined;
  const number = Number(lessonMatch[1]);
  const timeMatch = value.match(/(\d{1,2})[.:](\d{2})\s*[-–—]\s*(\d{1,2})[.:](\d{2})/);
  return {
    number,
    time: timeMatch ? `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}-${timeMatch[3].padStart(2, "0")}:${timeMatch[4]}` : ""
  };
}

function parseDate(value: string) {
  const iso = value.match(/\b(20\d{2})[-./](\d{1,2})[-./](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const local = value.match(/\b(\d{1,2})[./](\d{1,2})[./](20\d{2})\b/);
  if (local) return `${local[3]}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}`;
  return "";
}

function linksFromText(value: string) {
  const urls = value.match(/https?:\/\/[^\s<>()]+/gi) ?? [];
  return Array.from(new Set(urls.map((url) => url.replace(/[.,;!?]+$/, ""))))
    .flatMap((url) => {
      const safeUrl = safeExternalUrl(url);
      return safeUrl ? [{ label: safeUrl, url: safeUrl }] : [];
    });
}

function safeExternalUrl(value: string | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function emptyCell(): DistanceCell {
  return { text: "", links: [] };
}

function parseCsv(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value.trim());
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  row.push(value.trim());
  rows.push(row);
  return rows;
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const credentials = readGoogleCredentials();
  if (!credentials) return "";
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: credentials.clientEmail,
    scope: readonlySheetsScope,
    aud: tokenEndpoint,
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(credentials.privateKey);
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${base64Url(signature)}` }),
    cache: "no-store",
    signal: AbortSignal.timeout(fetchTimeoutMs)
  });
  const data = await response.json().catch(() => ({})) as { access_token?: string; expires_in?: number };
  if (!response.ok || !data.access_token) return "";
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return cachedToken.value;
}

function readGoogleCredentials() {
  const credentialsFile = (process.env.GOOGLE_SERVICE_ACCOUNT_FILE || "").trim();
  let clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
  let privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  if (credentialsFile) {
    try {
      const file = JSON.parse(readFileSync(credentialsFile, "utf8")) as { client_email?: string; private_key?: string };
      clientEmail = file.client_email?.trim() || clientEmail;
      privateKey = file.private_key?.trim() || privateKey;
    } catch {
      return undefined;
    }
  }
  return clientEmail && privateKey ? { clientEmail, privateKey } : undefined;
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function compareClassNames(first: string, second: string) {
  if (first === second) return 0;
  return sortClasses([first, second])[0] === first ? -1 : 1;
}

import { actions, applications, bells, events, lessons, news, rating } from "./mock-data";
import { sheetsConfig } from "./sheets-config";
import type { EventItem, RatingItem, RatingSheet, ScheduleLesson } from "./types";

export type DatasetName = keyof typeof sheetsConfig.sources;

const mockDatasets = {
  news,
  events,
  actions,
  applications,
  rating,
  schedule: lessons,
  bells,
  preferences: []
};

export async function getDataset(name: DatasetName) {
  const source = sheetsConfig.sources[name];
  if (!source.spreadsheetId) return mockDatasets[name];

  try {
    const rows = await readGoogleSheet(source.spreadsheetId, source.sheet);
    if (!rows.length) return mockDatasets[name];
    if (name === "rating") return mapRatingRows(rows);
    if (name === "events" || name === "actions") return mapEventRows(rows, name === "actions");
    if (name === "schedule") return mapScheduleRows(rows);
    return mockDatasets[name];
  } catch {
    return mockDatasets[name];
  }
}

export async function getRatingSheetTable(): Promise<RatingSheet> {
  const source = sheetsConfig.sources.rating;
  if (!source.spreadsheetId) return mockRatingSheet();

  try {
    const csv = await readGoogleSheetCsv(source.spreadsheetId, source.sheet);
    const rows = parseCsv(csv).filter((row) => row.some(Boolean));
    if (!rows.length) return mockRatingSheet();
    return mapRatingSheet(rows);
  } catch {
    return mockRatingSheet();
  }
}

export async function appendDatasetItem(name: DatasetName, item: unknown) {
  // В mock-режиме возвращаем объект как будто запись уже добавлена в таблицу.
  return { ok: true, source: "mock", sheet: sheetsConfig.sources[name].sheet, item };
}

export async function readGoogleSheet(spreadsheetId: string, sheet: string) {
  const csv = await readGoogleSheetCsv(spreadsheetId, sheet);
  return csvToObjects(csv);
}

async function readGoogleSheetCsv(spreadsheetId: string, sheet: string) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Google Sheets недоступны");
  return response.text();
}

function csvToObjects(csv: string) {
  const rows = parseCsv(csv).filter((row) => row.some(Boolean));
  const [header = [], ...body] = rows;
  const normalizedHeader = header.map((key, index) => normalizeHeaderKey(key, index));
  return body.map((row) =>
    Object.fromEntries(normalizedHeader.map((key, index) => [key, row[index] ?? ""]))
  );
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

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replaceAll(" ", "_");
}

function normalizeHeaderKey(key: string, index: number) {
  const normalized = normalizeKey(key);
  return normalized || `column_${index + 1}`;
}

function pick(row: Record<string, string>, keys: string[], fallback = "") {
  const found = keys.find((key) => row[normalizeKey(key)]);
  return found ? row[normalizeKey(found)] : fallback;
}

function mapRatingRows(rows: Array<Record<string, string>>): RatingItem[] {
  return rows
    .map((row, index) => {
      const className = pick(row, ["класс", "class", "className"], `${index + 1}А`);
      const points = parseSheetNumber(pick(row, ["баллы", "кол-во баллов", "количество баллов", "итого", "points", "score"], "0"));
      const fields = Object.entries(row)
        .filter(([key, value]) => isRatingField(key, value))
        .map(([key, value]) => ({
          title: formatRatingFieldTitle(key),
          value
        }));

      return {
        className,
        points,
        place: Number(pick(row, ["место", "place"], "0")) || 0,
        activity: fields.length,
        wins: parseSheetNumber(pick(row, ["победы", "wins"], "0")),
        media: parseSheetNumber(pick(row, ["медиа", "работа пресс-службы", "media"], "0")),
        volunteering: parseSheetNumber(pick(row, ["волонтерство", "шефская миссия", "volunteering"], "0")),
        comment: pick(row, ["комментарий", "comment"], fields.slice(0, 3).map((field) => `${field.title}: ${field.value}`).join(" · ")),
        fields
      };
    })
    .filter((item) => item.className && item.className.toLowerCase() !== "класс")
    .sort((first, second) => second.points - first.points)
    .map((item, index) => ({
      ...item,
      place: item.place || index + 1
    }));
}

function parseSheetNumber(value: string) {
  return Number(value.replace(",", ".")) || 0;
}

function isRatingField(key: string, value: string) {
  if (!value) return false;
  if (["класс", "column_2", "кол-во_баллов", "количество_баллов", "баллы", "итого", "points", "score", "место", "place"].includes(key)) {
    return false;
  }
  return parseSheetNumber(value) !== 0;
}

function formatRatingFieldTitle(key: string) {
  return key
    .replace(/^column_\d+$/, "Без названия")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapRatingSheet(rows: string[][]): RatingSheet {
  const [header = [], ...body] = rows;
  const width = Math.max(...rows.map((row) => row.length), 0);
  const columns: RatingSheet["columns"] = [];
  const months: string[] = [];
  let currentMonth = "Итоги";

  for (let index = 0; index < width; index += 1) {
    const rawTitle = header[index]?.trim() || `Колонка ${index + 1}`;
    const month = detectMonth(rawTitle);
    if (month) currentMonth = month;
    if (!months.includes(currentMonth)) months.push(currentMonth);
    columns.push({
      id: `column-${index}`,
      title: rawTitle,
      month: currentMonth
    });
  }

  return {
    columns,
    rows: body
      .filter((row) => row.some((cell) => cell.trim()))
      .map((row, index) => ({
        id: row[0]?.trim() || `row-${index + 1}`,
        cells: Array.from({ length: width }, (_, cellIndex) => row[cellIndex]?.trim() ?? "")
      })),
    months
  };
}

function mockRatingSheet(): RatingSheet {
  const columns = [
    { id: "column-0", title: "Класс", month: "Итоги" },
    { id: "column-1", title: "Кол-во баллов", month: "Итоги" }
  ];
  return {
    columns,
    rows: rating.map((item) => ({
      id: item.className,
      cells: [item.className, String(item.points)]
    })),
    months: ["Итоги"]
  };
}

function detectMonth(value: string) {
  const normalized = value.trim().toUpperCase();
  const months = ["СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРЬ", "ДЕКАБРЬ", "ЯНВАРЬ", "ФЕВРАЛЬ", "МАРТ", "АПРЕЛЬ", "МАЙ", "ИЮНЬ"];
  return months.find((month) => normalized.startsWith(month)) ?? "";
}

function mapEventRows(rows: Array<Record<string, string>>, onlyActions: boolean): EventItem[] {
  return rows
    .map((row, index) => {
      const type = normalizeEventType(pick(row, ["тип", "type"], "event"));
      const title = pick(row, ["название", "title"], `Событие ${index + 1}`);
      return {
        id: pick(row, ["id"], `event-${index + 1}`),
        slug: slugify(pick(row, ["slug"], title)),
        date: pick(row, ["дата", "дата_начала", "startDate", "start_date"], ""),
        startDate: pick(row, ["дата_начала", "дата", "startDate", "start_date"], ""),
        endDate: pick(row, ["дата_окончания", "endDate", "end_date"], ""),
        time: pick(row, ["время", "time"], ""),
        title,
        type,
        category: pick(row, ["категория", "category"], "Школьное событие"),
        place: pick(row, ["место", "place"], ""),
        description: pick(row, ["описание", "description"], ""),
        participants: pick(row, ["участники", "классы", "participants"], "Все классы"),
        owner: pick(row, ["ответственный", "owner"], ""),
        status: normalizeEventStatus(pick(row, ["статус", "status"], "planned")),
        cover: pick(row, ["обложка", "cover", "photo"], "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80"),
        tags: splitList(pick(row, ["теги", "tags"], "")),
        acceptApplications: ["true", "да", "yes", "1"].includes(pick(row, ["принимать_заявки", "acceptApplications", "accept_applications"], "false").toLowerCase()),
        applicationDeadline: pick(row, ["дедлайн_заявок", "applicationDeadline", "application_deadline"], ""),
        applicationFields: splitList(pick(row, ["поля_заявки", "applicationFields", "application_fields"], "")),
        applicationButtonText: pick(row, ["текст_кнопки", "applicationButtonText", "application_button_text"], "Подать заявку")
      };
    })
    .filter((item) => (onlyActions ? item.type === "action" || item.type === "contest" : true));
}

function mapScheduleRows(rows: Array<Record<string, string>>): ScheduleLesson[] {
  return rows.map((row, index) => ({
    className: pick(row, ["класс", "class", "className"], ""),
    day: pick(row, ["день", "day"], ""),
    number: Number(pick(row, ["урок", "номер", "number"], `${index + 1}`)) || index + 1,
    subject: pick(row, ["предмет", "subject"], ""),
    teacher: pick(row, ["учитель", "педагог", "teacher"], ""),
    room: pick(row, ["кабинет", "room"], "")
  }));
}

function normalizeEventType(value: string): EventItem["type"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("конкурс") || normalized === "contest") return "contest";
  if (normalized.includes("акц") || normalized === "action") return "action";
  return "event";
}

function normalizeEventStatus(value: string): EventItem["status"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("ид") || normalized === "active") return "active";
  if (normalized.includes("зав") || normalized === "finished") return "finished";
  return "planned";
}

function splitList(value: string) {
  return value.split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

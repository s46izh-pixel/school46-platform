import { actions, applications, bells, events, lessons, news, rating } from "./mock-data";
import { sheetsConfig } from "./sheets-config";
import type { EventItem, RatingItem, RatingSheet, ScheduleChange, ScheduleLesson } from "./types";

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
    if (name === "schedule") return getScheduleLessons();
    if (name === "bells") return mockDatasets.bells;
    if (name === "events" || name === "actions") return getEventDatasetFromSource(source.spreadsheetId, source.sheet, name === "actions");
    const rows = await readGoogleSheet(source.spreadsheetId, source.sheet);
    if (!rows.length) return mockDatasets[name];
    if (name === "rating") return mapRatingRows(rows);
    return mockDatasets[name];
  } catch {
    return mockDatasets[name];
  }
}

export async function getScheduleLessons(): Promise<ScheduleLesson[]> {
  const source = sheetsConfig.sources.schedule;
  if (!source.spreadsheetId) return lessons;

  try {
    const [primaryCsv, secondaryCsv] = await Promise.all([
      readGoogleSheetCsv(source.spreadsheetId, "1-4 классы"),
      readGoogleSheetCsv(source.spreadsheetId, "5-11 классы")
    ]);
    return [
      ...mapScheduleMatrix(parseCsv(primaryCsv), "primary"),
      ...mapScheduleMatrix(parseCsv(secondaryCsv), "secondary")
    ];
  } catch {
    return lessons;
  }
}

export async function getScheduleChanges(): Promise<ScheduleChange[]> {
  const source = sheetsConfig.sources.schedule;
  if (!source.spreadsheetId) return [];

  try {
    const csv = await readGoogleSheetCsv(source.spreadsheetId, "Изменения");
    return mapScheduleMatrix(parseCsv(csv), "changes").map((lesson, index) => ({
      id: `change-${index + 1}`,
      className: lesson.className,
      day: lesson.day,
      time: lesson.time ?? "",
      number: lesson.number,
      subject: lesson.subject,
      teacher: lesson.teacher,
      room: lesson.room,
      note: "Изменение в расписании"
    }));
  } catch {
    return [];
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

export async function getMonthlyEventNotes(): Promise<EventItem[]> {
  const source = sheetsConfig.sources.events;
  if (!source.spreadsheetId) return [];

  try {
    const csv = await readGoogleSheetCsv(source.spreadsheetId, source.sheet);
    return mapEventCalendarSheet(parseCsv(csv).filter((row) => row.some(Boolean))).monthly;
  } catch {
    return [];
  }
}

async function getEventDatasetFromSource(spreadsheetId: string, sheet: string, onlyActions: boolean) {
  const csv = await readGoogleSheetCsv(spreadsheetId, sheet);
  const rows = parseCsv(csv).filter((row) => row.some(Boolean));
  if (!rows.length) return onlyActions ? actions : events;
  const calendar = mapEventCalendarSheet(rows);
  const parsed = calendar.events.length ? calendar.events : mapEventRows(csvToObjects(csv), onlyActions);
  return parsed.filter((item) => (onlyActions ? item.type === "action" || item.type === "contest" : true));
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

function mapEventCalendarSheet(rows: string[][]): { events: EventItem[]; monthly: EventItem[] } {
  const events: EventItem[] = [];
  const monthly: EventItem[] = [];
  const month = detectCalendarMonth(rows[0] ?? []) || currentRussianMonth();
  const year = new Date().getFullYear();

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex].map((cell) => cell.trim());
    const label = normalizeEventLabel(row[0] ?? "");

    if (label === "в течении месяца" || label === "в течение месяца") {
      const seen = new Set<string>();
      for (let index = rowIndex + 1; index < rows.length; index += 1) {
        const title = rows[index]?.[0]?.trim() ?? "";
        if (!title || seen.has(title)) continue;
        seen.add(title);
        monthly.push(createEventItem({
          id: `month-${monthly.length + 1}`,
          title,
          date: toIsoDate(1, month, year),
          startDate: toIsoDate(1, month, year),
          endDate: "",
          time: "В течение месяца",
          place: "",
          participants: "Все классы",
          typeText: "Мероприятие"
        }));
      }
      break;
    }

    if (label !== "дата") continue;

    const blockRows: Record<string, string[]> = {};
    let nextIndex = rowIndex + 1;
    while (nextIndex < rows.length) {
      const nextRow = rows[nextIndex].map((cell) => cell.trim());
      const nextLabel = normalizeEventLabel(nextRow[0] ?? "");
      if (nextLabel === "дата" || nextLabel === "в течении месяца" || nextLabel === "в течение месяца") break;
      if (nextLabel) {
        blockRows[nextLabel] = nextLabel === "категория классов для фильтра" ? mergeBlockRows(blockRows[nextLabel], nextRow) : nextRow;
      }
      nextIndex += 1;
    }

    for (let column = 1; column < row.length; column += 1) {
      const day = Number(row[column]);
      const title = blockRows["название мероприятия"]?.[column]?.trim() ?? "";
      if (!day || !title) continue;

      const startText = blockRows["дата начала мероприятия"]?.[column]?.trim() ?? "";
      const endText = (
        blockRows["дата окончания мероприятия"]?.[column] ??
        blockRows["дата оканчания мероприятия"]?.[column] ??
        blockRows["датат оканчания мероприятия"]?.[column] ??
        ""
      ).trim();
      const startDate = parseRussianEventDate(startText, month, year) || toIsoDate(day, month, year);
      const endDate = parseRussianEventDate(endText, month, year);
      events.push(createEventItem({
        id: `event-${events.length + 1}`,
        title,
        date: startDate,
        startDate,
        endDate,
        time: blockRows["время"]?.[column]?.trim() ?? "",
        place: blockRows["место"]?.[column]?.trim() ?? "",
        participants: blockRows["классы"]?.[column]?.trim() || "Все классы",
        classCategory: blockRows["категория классов для фильтра"]?.[column]?.trim() ?? "",
        typeText: blockRows["тип события"]?.[column]?.trim() ?? "Мероприятие",
        description: blockRows["дополнительная информация"]?.[column]?.trim() ?? ""
      }));
    }

    rowIndex = nextIndex - 1;
  }

  return {
    events: events.sort((first, second) => first.date.localeCompare(second.date)),
    monthly
  };
}

function createEventItem({
  id,
  title,
  date,
  startDate,
  endDate,
  time,
  place,
  participants,
  classCategory = "",
  typeText,
  description = ""
}: {
  id: string;
  title: string;
  date: string;
  startDate: string;
  endDate: string;
  time: string;
  place: string;
  participants: string;
  classCategory?: string;
  typeText: string;
  description?: string;
}): EventItem {
  const type = normalizeEventType(typeText);
  return {
    id,
    slug: slugify(`${date}-${title}`),
    date,
    startDate,
    endDate,
    time,
    title,
    type,
    category: normalizeEventCategory(typeText),
    classCategory,
    place,
    description,
    participants,
    owner: "Школа №46",
    status: "planned",
    cover: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
    tags: [typeText].filter(Boolean),
    acceptApplications: false,
    applicationFields: [],
    applicationButtonText: "Подать заявку"
  };
}

function normalizeEventLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function mergeBlockRows(current: string[] | undefined, next: string[]) {
  if (!current) return next;
  const length = Math.max(current.length, next.length);
  return Array.from({ length }, (_, index) => [current[index], next[index]].filter(Boolean).join("\n"));
}

function detectCalendarMonth(row: string[]) {
  const normalized = row.join(" ").toLowerCase();
  return russianMonths.find((month) => normalized.includes(month)) ?? "";
}

function currentRussianMonth() {
  return russianMonths[new Date().getMonth()];
}

const russianMonths = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"];

function parseRussianEventDate(value: string, fallbackMonth: string, fallbackYear: number) {
  const match = value.toLowerCase().match(/(\d{1,2})(?:\s+([а-яё]+))?/i);
  if (!match) return "";
  return toIsoDate(Number(match[1]), match[2] ?? fallbackMonth, fallbackYear);
}

function toIsoDate(day: number, monthName: string, year: number) {
  const monthIndex = russianMonths.indexOf(normalizeRussianMonthName(monthName));
  if (monthIndex < 0 || !day) return "";
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeRussianMonthName(value: string) {
  const normalized = value.trim().toLowerCase();
  const map: Record<string, string> = {
    января: "январь",
    февраля: "февраль",
    марта: "март",
    апреля: "апрель",
    мая: "май",
    июня: "июнь",
    июля: "июль",
    августа: "август",
    сентября: "сентябрь",
    октября: "октябрь",
    ноября: "ноябрь",
    декабря: "декабрь"
  };
  return map[normalized] ?? normalized;
}

function mapScheduleRows(rows: Array<Record<string, string>>): ScheduleLesson[] {
  return rows.map((row, index) => ({
    className: pick(row, ["класс", "class", "className"], ""),
    day: pick(row, ["день", "day"], ""),
    time: pick(row, ["время", "time"], ""),
    number: Number(pick(row, ["урок", "номер", "number"], `${index + 1}`)) || index + 1,
    subject: pick(row, ["предмет", "subject"], ""),
    teacher: pick(row, ["учитель", "педагог", "teacher"], ""),
    room: pick(row, ["кабинет", "room"], "")
  }));
}

function mapScheduleMatrix(rows: string[][], mode: "primary" | "secondary" | "changes"): ScheduleLesson[] {
  const lessons: ScheduleLesson[] = [];
  let day = "";
  let classColumns: Array<{ index: number; className: string; room: string }> = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex].map((cell) => cell.trim());
    const dayCell = row.find((cell) => isWeekday(cell));

    if (dayCell) {
      day = normalizeDay(dayCell);
      if (isClassHeaderRow(row)) {
        classColumns = row
          .map((cell, index) => ({ index, className: normalizeClassName(cell), room: "" }))
          .filter((item) => item.index >= 2 && isClassName(item.className));
      } else {
        classColumns = [];
        const classRow = findClassRow(rows, rowIndex + 1);
        if (classRow) {
          classColumns = classRow.row
            .map((cell, index) => ({ index, className: normalizeClassName(cell), room: "" }))
            .filter((item) => item.index >= 2 && isClassName(item.className));
          rowIndex = Math.max(rowIndex, classRow.index - 1);
        }
      }
      continue;
    }

    if (!day) continue;
    if (isClassHeaderRow(row)) {
      classColumns = row
        .map((cell, index) => ({ index, className: normalizeClassName(cell), room: "" }))
        .filter((item) => item.index >= 2 && isClassName(item.className));
      continue;
    }

    if (isRoomRow(row)) {
      classColumns = classColumns.map((item) => ({
        ...item,
        room: row[item.index] ?? item.room
      }));
      continue;
    }

    if (!isLessonRow(row)) continue;

    const time = row[0] ?? "";
    const number = Number(row[1]) || 0;
    const teacherRow = isMetaRow(rows[rowIndex + 1], "педагог") ? rows[rowIndex + 1] : undefined;
    const roomRow = isMetaRow(rows[rowIndex + 1], "кабинет")
      ? rows[rowIndex + 1]
      : isMetaRow(rows[rowIndex + 2], "кабинет")
        ? rows[rowIndex + 2]
        : undefined;

    classColumns.forEach((item) => {
      const rawSubject = row[item.index]?.trim() ?? "";
      if (!rawSubject) return;
      const parsed = splitSubjectAndRoom(rawSubject);
      const teacher = teacherRow?.[item.index]?.trim() ?? "";
      const room = roomRow?.[item.index]?.trim() || parsed.room || item.room;
      lessons.push({
        className: item.className,
        day,
        time,
        number,
        subject: parsed.subject,
        teacher,
        room
      });
    });

    if (teacherRow && roomRow) rowIndex += 2;
    else if (teacherRow || roomRow) rowIndex += 1;
  }

  return mode === "changes" ? lessons.filter((lesson) => lesson.subject) : lessons;
}

function findClassRow(rows: string[][], startIndex: number) {
  for (let index = startIndex; index < Math.min(rows.length, startIndex + 4); index += 1) {
    const row = rows[index]?.map((cell) => cell.trim()) ?? [];
    if (isClassHeaderRow(row)) return { index, row };
  }
  return undefined;
}

function isWeekday(value: string) {
  return ["ПОНЕДЕЛЬНИК", "ВТОРНИК", "СРЕДА", "ЧЕТВЕРГ", "ПЯТНИЦА", "СУББОТА"].includes(value.trim().toUpperCase());
}

function normalizeDay(value: string) {
  const normalized = value.trim().toUpperCase();
  const map: Record<string, string> = {
    ПОНЕДЕЛЬНИК: "Понедельник",
    ВТОРНИК: "Вторник",
    СРЕДА: "Среда",
    ЧЕТВЕРГ: "Четверг",
    ПЯТНИЦА: "Пятница",
    СУББОТА: "Суббота"
  };
  return map[normalized] ?? value.trim();
}

function normalizeClassName(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function isClassName(value: string) {
  return /^\d{1,2}[а-я]$/i.test(value);
}

function isClassHeaderRow(row: string[]) {
  return row.filter((cell) => isClassName(normalizeClassName(cell))).length >= 3;
}

function isRoomRow(row: string[]) {
  return row[0]?.trim().toLowerCase() === "кабинет";
}

function isLessonRow(row: string[]) {
  return Boolean(row[0]?.match(/\d{1,2}[.:]\d{2}/) && Number(row[1]));
}

function isMetaRow(row: string[] | undefined, label: string) {
  return row?.[0]?.trim().toLowerCase() === label;
}

function splitSubjectAndRoom(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  const match = normalized.match(/^(.*?)(?:\s+)?((?:\d{3})(?:\/\d{3})?)$/);
  if (!match) return { subject: normalized, room: "" };
  return {
    subject: match[1].trim(),
    room: match[2].trim()
  };
}

function normalizeEventType(value: string): EventItem["type"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("конкурс") || normalized.includes("олимпиад") || normalized.includes("викторин") || normalized === "contest") return "contest";
  if (normalized.includes("акц") || normalized === "action") return "action";
  return "event";
}

function normalizeEventCategory(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("акц")) return "Акция";
  if (normalized.includes("конкурс")) return "Конкурс";
  if (normalized.includes("линейк")) return "Линейка";
  if (normalized.includes("олимпиад")) return "Олимпиада";
  if (normalized.includes("викторин")) return "Викторина";
  if (normalized.includes("спорт")) return "Спорт";
  if (normalized.includes("профориентац")) return "Профориентация";
  if (normalized.includes("безопас")) return "Безопасность";
  if (normalized.includes("педагог")) return "Педагогам";
  if (normalized.includes("родител")) return "Родителям";
  if (normalized.includes("культур")) return "Культура";
  return "Мероприятие";
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

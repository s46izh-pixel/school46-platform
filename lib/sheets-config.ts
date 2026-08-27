export const sheetsConfig = {
  sources: {
    news: {
      spreadsheetId: process.env.GOOGLE_NEWS_SHEET_ID ?? process.env.GOOGLE_SHEETS_ID ?? "",
      sheet: process.env.GOOGLE_NEWS_SHEET_NAME ?? "Новости"
    },
    events: {
      spreadsheetId: process.env.GOOGLE_EVENTS_SHEET_ID ?? "1lSH-KBbhocfYSadrJUQUyJvo2Xlf7aj72VXsv1WYiL0",
      sheet: process.env.GOOGLE_EVENTS_SHEET_NAME ?? "Основной"
    },
    actions: {
      spreadsheetId: process.env.GOOGLE_EVENTS_SHEET_ID ?? "1lSH-KBbhocfYSadrJUQUyJvo2Xlf7aj72VXsv1WYiL0",
      sheet: process.env.GOOGLE_EVENTS_SHEET_NAME ?? "Основной"
    },
    applications: {
      spreadsheetId: process.env.GOOGLE_APPLICATIONS_SHEET_ID ?? process.env.GOOGLE_SHEETS_ID ?? "",
      sheet: process.env.GOOGLE_APPLICATIONS_SHEET_NAME ?? "Заявки"
    },
    rating: {
      spreadsheetId: process.env.GOOGLE_RATING_SHEET_ID ?? "1Szn0mOGV9lnZO7ODrZftiBVEnUYHxcAii408GXuwnqI",
      sheet: process.env.GOOGLE_RATING_SHEET_NAME ?? "1"
    },
    schedule: {
      spreadsheetId: process.env.GOOGLE_SCHEDULE_SHEET_ID ?? "1uEvu2RU9JT67n4erJu6U0F2sS2MxZGeh1QmTd8qfZ-Q",
      sheet: process.env.GOOGLE_SCHEDULE_SHEET_NAME ?? "Изменения"
    },
    bells: {
      spreadsheetId: process.env.GOOGLE_SCHEDULE_SHEET_ID ?? "1uEvu2RU9JT67n4erJu6U0F2sS2MxZGeh1QmTd8qfZ-Q",
      sheet: process.env.GOOGLE_SCHEDULE_SHEET_NAME ?? "Изменения"
    },
    preferences: {
      spreadsheetId: process.env.GOOGLE_SHEETS_ID ?? "",
      sheet: "Настройки"
    }
  }
};

export function hasConfiguredSheets() {
  return Object.values(sheetsConfig.sources).some((source) => Boolean(source.spreadsheetId));
}

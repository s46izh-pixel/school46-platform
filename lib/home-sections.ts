export const homeSectionSettingsKey = "school46.homeSections";

export const homeSections = [
  { id: "news", title: "Последние новости", description: "Лента школы на главной странице" },
  { id: "schedule", title: "Расписание уроков и звонков", description: "Блок расписания и звонков" },
  { id: "personalization", title: "Персонализация пользователя", description: "Настройки класса, педагога и избранных разделов" },
  { id: "rating", title: "Рейтинг и достижения", description: "Таблица активности классов" },
  { id: "events", title: "Ближайшие события", description: "События, акции и конкурсы" }
] as const;

export type HomeSectionId = typeof homeSections[number]["id"];
export type HomeSectionSettings = Partial<Record<HomeSectionId, boolean>>;

export function defaultHomeSectionSettings(): Record<HomeSectionId, boolean> {
  return homeSections.reduce((settings, section) => {
    settings[section.id] = true;
    return settings;
  }, {} as Record<HomeSectionId, boolean>);
}

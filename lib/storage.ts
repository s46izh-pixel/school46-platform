import { UserPreferences } from "./types";

export const defaultPreferences: UserPreferences = {
  role: "student",
  onboardingDone: false,
  onboardingVersion: 0,
  selectedClass: "8А",
  selectedClasses: ["8А"],
  selectedTeacher: "Иванова Е. А.",
  theme: "light",
  design: "silver",
  userName: "",
  groupName: "8А",
  rtx4k: false,
  favoriteSections: ["Новости", "Расписание", "Рейтинг"],
  defaultSchedule: "class",
  cardView: "expanded",
  lastSection: "Главная"
};

export const preferencesStorageKey = "school46.preferences";
export const roleStorageKey = "school46.role";

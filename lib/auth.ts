import { UserRole } from "./types";

export const roles: Array<{ id: UserRole; title: string; description: string }> = [
  { id: "admin", title: "Администратор", description: "Полный доступ ко всем разделам" },
  { id: "news_editor", title: "Редактор новостей", description: "Новости и архив публикаций" },
  { id: "event_manager", title: "Менеджер событий", description: "Мероприятия, акции и заявки" },
  { id: "class_teacher", title: "Классный руководитель", description: "Новости, события и заявки своего класса" },
  { id: "viewer", title: "Пользователь", description: "Публичный просмотр без админки" }
];

const permissions: Record<UserRole, string[]> = {
  admin: ["Dashboard", "Новости", "Мероприятия", "Акции", "Заявки", "Рейтинг", "Расписание", "Настройки", "Пользователи и роли"],
  news_editor: ["Dashboard", "Новости"],
  event_manager: ["Dashboard", "Мероприятия", "Акции", "Заявки"],
  class_teacher: ["Dashboard", "Новости", "Мероприятия", "Заявки"],
  viewer: []
};

export function getAllowedAdminSections(role: UserRole) {
  return permissions[role];
}

export function canAccessAdmin(role: UserRole) {
  return role !== "viewer";
}

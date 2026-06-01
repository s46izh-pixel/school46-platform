export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(date: string) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return date || "Дата уточняется";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(value);
}

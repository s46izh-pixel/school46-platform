export function sortClasses(values: string[]) {
  return values.map(normalizeClassName).filter(Boolean).sort((first, second) => {
    const a = parseClassName(first);
    const b = parseClassName(second);
    if (a.grade !== b.grade) return a.grade - b.grade;
    return a.letter.localeCompare(b.letter, "ru");
  });
}

export function uniqueClasses(values: string[], fallback: string[]) {
  const unique = Array.from(new Map(
    values
      .map(normalizeClassName)
      .filter(Boolean)
      .map((value) => [classKey(value), value])
  ).values());
  return sortClasses(unique.length ? unique : fallback);
}

function parseClassName(value: string) {
  const normalized = normalizeClassName(value);
  const match = normalized.match(/^(\d{1,2})([а-я])$/i);
  return {
    grade: Number(match?.[1] ?? 0),
    letter: (match?.[2] ?? normalized).toLowerCase()
  };
}

export function normalizeClassName(value: string) {
  const normalized = value
    .trim()
    .replace(/\s+/g, "")
    .replace(/[А-ЯЁ]/g, (letter) => letter.toLowerCase());
  return /^\d{1,2}[а-яё]$/.test(normalized) ? normalized : "";
}

function classKey(value: string) {
  const parsed = parseClassName(value);
  return `${parsed.grade}:${parsed.letter}`;
}

export function sortClasses(values: string[]) {
  return [...values].sort((first, second) => {
    const a = parseClassName(first);
    const b = parseClassName(second);
    if (a.grade !== b.grade) return a.grade - b.grade;
    return a.letter.localeCompare(b.letter, "ru");
  });
}

export function uniqueClasses(values: string[], fallback: string[]) {
  const unique = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  return sortClasses(unique.length ? unique : fallback);
}

function parseClassName(value: string) {
  const match = value.match(/^(\d{1,2})([а-я])$/i);
  return {
    grade: Number(match?.[1] ?? 0),
    letter: (match?.[2] ?? value).toLowerCase()
  };
}

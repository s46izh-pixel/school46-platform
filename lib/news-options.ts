export const defaultNewsClasses = [
  "1а", "1б", "1в",
  "2а", "2б", "2в",
  "3а", "3б", "3в", "3г",
  "4а", "4б", "4в", "4г",
  "5а", "5б", "5в", "5г",
  "6а", "6б", "6в", "6г",
  "7а", "7б", "7в", "7г",
  "8а", "8б", "8в", "8г",
  "9а", "9в", "9г", "9д",
  "10а", "11а", "11б"
];

export function sameNewsClass(first: string, second: string) {
  return first.trim().toLocaleLowerCase("ru") === second.trim().toLocaleLowerCase("ru");
}

export function uniqueNewsClasses(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.trim().toLocaleLowerCase("ru");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

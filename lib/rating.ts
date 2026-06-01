import { RatingItem } from "./types";

export const ratingGroups = [
  { id: "primary", title: "1-4 классы", min: 1, max: 4 },
  { id: "middle", title: "5-8 классы", min: 5, max: 8 },
  { id: "senior", title: "9-11 классы", min: 9, max: 11 }
];

export function getClassGrade(className: string) {
  return Number(className.match(/\d+/)?.[0] ?? 0);
}

export function getRatingLeaders(items: RatingItem[]) {
  return ratingGroups.map((group) => {
    const groupItems = items.filter((item) => {
      const grade = getClassGrade(item.className);
      return grade >= group.min && grade <= group.max;
    });
    const top = [...groupItems]
      .sort((first, second) => second.points - first.points)
      .slice(0, 3);
    const maxPoints = Math.max(...groupItems.map((item) => item.points), 0);
    return {
      ...group,
      top,
      leaders: groupItems.filter((item) => item.points === maxPoints && maxPoints > 0),
      maxPoints
    };
  });
}

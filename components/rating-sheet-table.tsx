"use client";

import type { RatingSheet } from "@/lib/types";
import { Eye, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";

const monthStyles = [
  "bg-blue-50 text-blue-800",
  "bg-emerald-50 text-emerald-800",
  "bg-amber-50 text-amber-800",
  "bg-rose-50 text-rose-800",
  "bg-cyan-50 text-cyan-800",
  "bg-violet-50 text-violet-800",
  "bg-lime-50 text-lime-800",
  "bg-orange-50 text-orange-800",
  "bg-sky-50 text-sky-800",
  "bg-slate-100 text-slate-700"
];

const stickyColumnStyles = [
  "sticky left-0 z-30 w-12 min-w-12 max-w-12",
  "sticky left-12 z-30 w-12 min-w-12 max-w-12",
  "sticky left-24 z-30 w-12 min-w-12 max-w-12 border-r-4 border-r-ink"
];

export function RatingSheetTable({ sheet }: { sheet: RatingSheet }) {
  const toggleableMonths = sheet.months.filter((month) => month !== "Итоги");
  const [hiddenMonths, setHiddenMonths] = useState<string[]>([]);
  const [hiddenClassGroups, setHiddenClassGroups] = useState<string[]>([]);

  const visibleColumnIndexes = useMemo(
    () =>
      sheet.columns
        .map((column, index) => ({ column, index }))
        .filter(({ column }) => !hiddenMonths.includes(column.month))
        .map(({ index }) => index),
    [hiddenMonths, sheet.columns]
  );

  const monthGroups = useMemo(() => {
    const groups: Array<{ month: string; span: number }> = [];
    visibleColumnIndexes.forEach((columnIndex) => {
      const month = sheet.columns[columnIndex].month;
      const last = groups[groups.length - 1];
      if (last?.month === month) {
        last.span += 1;
      } else {
        groups.push({ month, span: 1 });
      }
    });
    return groups;
  }, [sheet.columns, visibleColumnIndexes]);

  function toggleMonth(month: string) {
    setHiddenMonths((current) =>
      current.includes(month) ? current.filter((item) => item !== month) : [...current, month]
    );
  }

  function toggleClassGroup(group: string) {
    setHiddenClassGroups((current) =>
      current.includes(group) ? current.filter((item) => item !== group) : [...current, group]
    );
  }

  function monthClass(month: string) {
    const index = Math.max(sheet.months.indexOf(month), 0);
    return monthStyles[index % monthStyles.length];
  }

  function cellSizeClass(columnIndex: number) {
    return stickyColumnStyles[columnIndex] ?? "w-[68px] min-w-[68px] max-w-[68px]";
  }

  function cellLayerClass(columnIndex: number, header = false) {
    if (columnIndex > 2) return "";
    return header ? "z-40" : "z-30";
  }

  return (
    <div className="grid gap-4" data-testid="rating-sheet-table">
      <div className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          {classGroups.map((group) => {
            const hidden = hiddenClassGroups.includes(group.id);
            return (
              <button
                key={group.id}
                data-class-group-toggle={group.id}
                onClick={() => toggleClassGroup(group.id)}
                className={`focus-ring flex items-center gap-2 rounded-[8px] border px-3 py-2 text-sm font-semibold transition ${
                  hidden ? "border-line bg-white text-slate-500" : "border-transparent bg-ink text-white"
                }`}
              >
                {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                {group.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {toggleableMonths.map((month) => {
            const hidden = hiddenMonths.includes(month);
            return (
              <button
                key={month}
                data-month-toggle={month}
                onClick={() => toggleMonth(month)}
                className={`focus-ring flex items-center gap-2 rounded-[8px] border px-3 py-2 text-sm font-semibold transition ${
                  hidden ? "border-line bg-white text-slate-500" : `border-transparent ${monthClass(month)}`
                }`}
              >
                {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                {month}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[8px] border border-line bg-white">
        <table className="min-w-max border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              {monthGroups.map((group, index) => (
                <th
                  key={`${group.month}-${index}`}
                  colSpan={group.span}
                  className={`border-b border-r border-line px-3 py-3 text-center text-[11px] font-semibold uppercase ${monthClass(group.month)}`}
                >
                  {group.month}
                </th>
              ))}
            </tr>
            <tr>
              {visibleColumnIndexes.map((columnIndex) => (
                <th
                  key={sheet.columns[columnIndex].id}
                  className={`${cellSizeClass(columnIndex)} ${cellLayerClass(columnIndex, true)} h-20 whitespace-normal break-words border-b border-r border-line px-1 py-2 text-center align-middle text-[10px] font-semibold uppercase leading-4 text-slate-700 ${monthClass(sheet.columns[columnIndex].month)}`}
                >
                  {sheet.columns[columnIndex].title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows(sheet.rows, hiddenClassGroups).map((row, rowIndex, rows) => (
              <tr key={row.id} className={`${rowDividerClass(row, rows[rowIndex - 1])} odd:bg-white even:bg-slate-50/60`}>
                {visibleColumnIndexes.map((columnIndex) => (
                  <td
                    key={`${row.id}-${sheet.columns[columnIndex].id}`}
                    className={`${cellSizeClass(columnIndex)} ${cellLayerClass(columnIndex)} h-[30px] whitespace-normal break-words border-b border-r border-line bg-inherit px-1 py-1 text-center align-middle text-[10px] leading-3 text-slate-700 ${columnIndex <= 2 ? "font-bold text-ink" : ""} ${negativeCellClass(row.cells[columnIndex])}`}
                  >
                    {row.cells[columnIndex]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const classGroups = [
  { id: "primary", label: "1-4 классы", min: 1, max: 4 },
  { id: "middle", label: "5-8 классы", min: 5, max: 8 },
  { id: "senior", label: "9-11 классы", min: 9, max: 11 }
];

function visibleRows(rows: RatingSheet["rows"], hiddenGroups: string[]) {
  return rows.filter((row) => {
    const grade = getGrade(row.cells[0]);
    const group = classGroups.find((item) => grade >= item.min && grade <= item.max);
    return !group || !hiddenGroups.includes(group.id);
  });
}

function rowDividerClass(current: RatingSheet["rows"][number], previous?: RatingSheet["rows"][number]) {
  if (!previous) return "";
  const currentGrade = getGrade(current.cells[0]);
  const previousGrade = getGrade(previous.cells[0]);
  if ((currentGrade === 5 && previousGrade <= 4) || (currentGrade === 9 && previousGrade <= 8)) {
    return "border-t-4 border-t-ink";
  }
  if (currentGrade === previousGrade) {
    return "border-t-4 border-t-slate-300";
  }
  return "";
}

function getGrade(className: string) {
  return Number(className.match(/\d+/)?.[0] ?? 0);
}

function negativeCellClass(value: string) {
  return Number(value.replace(",", ".")) < 0 ? "bg-rose-100 font-bold text-rose-800" : "";
}

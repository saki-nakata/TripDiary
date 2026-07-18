"use client";

import { useEffect, useRef, useState } from "react";
import { TwemojiIcon } from "@/components/ui/twemoji-icon";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

type Props = {
  value: string;
  onChange: (value: string) => void;
  max?: string;
  error?: boolean;
};

function parseLocalDate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

export function DateField({ value, onChange, max, error }: Props) {
  const [open, setOpen] = useState(false);
  const selected = parseLocalDate(value);
  const maxDate = parseLocalDate(max ?? "");
  const [viewDate, setViewDate] = useState(() => selected ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function openCalendar() {
    setViewDate(selected ?? maxDate ?? new Date());
    setOpen(true);
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isNextMonthDisabled = !!maxDate && year === maxDate.getFullYear() && month === maxDate.getMonth();

  function isDisabled(day: number): boolean {
    if (!maxDate) return false;
    return new Date(year, month, day) > maxDate;
  }

  function isSelected(day: number): boolean {
    return !!selected && selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === day;
  }

  function isToday(day: number): boolean {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  }

  function pickDay(day: number) {
    if (isDisabled(day)) return;
    onChange(formatValue(new Date(year, month, day)));
    setOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openCalendar())}
        className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-green-500 ${
          error ? "border-red-400" : "border-zinc-200"
        }`}
      >
        <span className={selected ? "text-zinc-900" : "text-zinc-400"}>
          {selected ? formatDisplay(selected) : "選択してください"}
        </span>
        <TwemojiIcon codepoint="1f4c5" alt="📅" className="h-4 w-4 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-200 bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="h-8 w-8 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-zinc-700">
              {year}年{month + 1}月
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              disabled={isNextMonthDisabled}
              className="h-8 w-8 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((w) => (
              <span key={w} className="h-7 flex items-center justify-center text-xs font-medium text-zinc-400">
                {w}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) =>
              day == null ? (
                <span key={i} />
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickDay(day)}
                  disabled={isDisabled(day)}
                  className={`h-8 w-8 flex items-center justify-center rounded-full text-sm transition-colors ${
                    isSelected(day)
                      ? "bg-green-600 text-white font-semibold"
                      : isDisabled(day)
                        ? "text-zinc-300"
                        : isToday(day)
                          ? "text-green-600 font-semibold hover:bg-green-50"
                          : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {day}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

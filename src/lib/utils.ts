import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...values: ClassValue[]) => twMerge(clsx(values));
export const percent = (value: number, total: number) =>
  total ? Math.round((value / total) * 100) : 0;
export const secondsLabel = (seconds: number) =>
  `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, "0")}`;
export function dateLabel(date: string | Date, timezone = "Asia/Kolkata") {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

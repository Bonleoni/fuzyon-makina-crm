import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind sınıf birleştirme yardımcısı */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

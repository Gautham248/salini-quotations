import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date): string {
  const m = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const d = new Date(date);
  return `${d.getDate()}-${m[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
}

export function formatCurrency(v: number): string { return v.toFixed(2); }

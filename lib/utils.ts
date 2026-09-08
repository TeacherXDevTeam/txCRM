import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Tarihler HER ZAMAN Europe/Istanbul'da biçimlenir.
 *
 * Sebep: bu bileşenler hem sunucuda (SSR) hem tarayıcıda render ediliyor.
 * Vercel sunucuları UTC'de çalışır, kullanıcının tarayıcısı UTC+3'te —
 * timeZone verilmezse iki taraf farklı metin üretir ve React hydration
 * hatasıyla çöker ("Application error: a client-side exception has occurred").
 * Ayrıca CRM Türkiye operasyonu için; saatler zaten TR saatiyle okunmalı.
 */
export const TR_TZ = "Europe/Istanbul";

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TR_TZ,
  }).format(new Date(date));
}

/** Gün + saat — "08.09.2026 14:32" */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TR_TZ,
  }).format(new Date(date));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 0,
  }).format(amount);
}

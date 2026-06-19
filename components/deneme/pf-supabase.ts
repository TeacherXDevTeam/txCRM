"use client";

import { createBrowserClient } from "@supabase/ssr";

// PoC: pf_ tabloları generated types'ta olmadığı için tipsiz (untyped) client.
// Asıl uygulama lib/supabase/client.ts'i (typed) kullanmaya devam eder.
export function createPfClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type PfRecord = {
  id: string;
  title: string;
  owner: string | null;
  status: "yeni" | "teklif_bekleniyor" | "hazir";
  amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PfActivity = {
  id: string;
  entity_type: string;
  entity_id: string;
  kind: string;
  summary: string;
  created_at: string;
};

export type PfNotification = {
  id: string;
  recipient_role: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
};

export const STATUS_LABEL: Record<PfRecord["status"], string> = {
  yeni: "Yeni",
  teklif_bekleniyor: "Teklif Bekleniyor",
  hazir: "Hazır",
};

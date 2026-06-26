"use client";

import { createBrowserClient } from "@supabase/ssr";

// notifications tablosu henüz generated types'ta olmadığı için tipsiz client.
// (types/database.ts yeniden üretilince typed client'a geçilebilir.)
export function createNotifClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type AppNotification = {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
};

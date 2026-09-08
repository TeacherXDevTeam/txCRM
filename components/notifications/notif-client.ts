"use client";

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

/** Paylaşılan typed browser client — notifications artık generated types'ta. */
export const createNotifClient = createClient;

export type AppNotification = Database["public"]["Tables"]["notifications"]["Row"];

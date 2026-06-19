"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Check } from "lucide-react";
import { createPfClient, type PfNotification } from "./pf-supabase";

// Demo: "finans" rolünün zil akışı. status 'teklif_bekleniyor'a geçince
// DB trigger buraya satır atar; Realtime ile anlık düşer.
const ROLE = "finans";

export function NotificationBell() {
  const [items, setItems] = useState<PfNotification[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const sb = createPfClient();
    const { data } = await sb
      .from("pf_notifications")
      .select("*")
      .eq("recipient_role", ROLE)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data ?? []) as PfNotification[]);
  }, []);

  useEffect(() => {
    load();
    const sb = createPfClient();
    const ch = sb
      .channel("pf_notifications_poc")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "pf_notifications" },
        () => load()
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [load]);

  const unread = items.filter((i) => !i.is_read).length;

  async function markRead(id: string) {
    const sb = createPfClient();
    await sb.from("pf_notifications").update({ is_read: true }).eq("id", id);
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_read: true } : i))
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-2 hover:bg-gray-100"
        title={`finans bildirimleri (${unread} okunmamış)`}
      >
        <Bell className="h-5 w-5 text-gray-700" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border bg-white shadow-xl">
          <div className="border-b px-4 py-2 text-sm font-semibold">
            Bildirimler · <span className="text-gray-500">finans</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-gray-400">
                Henüz bildirim yok
              </p>
            )}
            {items.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-2 border-b px-4 py-3 text-sm last:border-0 ${
                  n.is_read ? "opacity-50" : "bg-blue-50/40"
                }`}
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{n.title}</p>
                  {n.body && <p className="text-gray-600">{n.body}</p>}
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {new Date(n.created_at).toLocaleString("tr-TR")}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => markRead(n.id)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-green-600"
                    title="Okundu işaretle"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

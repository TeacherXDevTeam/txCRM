"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck } from "lucide-react";
import { createNotifClient, type AppNotification } from "./notif-client";

interface Props {
  memberId: string;
}

export function NotificationBell({ memberId }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const sb = createNotifClient();
    const { data } = await sb
      .from("notifications")
      .select("*")
      .eq("recipient_id", memberId)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data ?? []) as AppNotification[]);
  }, [memberId]);

  useEffect(() => {
    load();
    const sb = createNotifClient();
    const ch = sb
      .channel(`notifications_${memberId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${memberId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [memberId, load]);

  const unread = items.filter((i) => !i.is_read).length;

  async function markRead(id: string) {
    const sb = createNotifClient();
    await sb.from("notifications").update({ is_read: true }).eq("id", id);
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_read: true } : i))
    );
  }

  async function markAllRead() {
    const sb = createNotifClient();
    await sb
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", memberId)
      .eq("is_read", false);
    setItems((prev) => prev.map((i) => ({ ...i, is_read: true })));
  }

  function handleClick(n: AppNotification) {
    if (!n.is_read) markRead(n.id);
    if (n.entity_type === "lead") {
      setOpen(false);
      router.push("/leadler");
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-md p-2 hover:bg-gray-100 transition-colors"
        title={`Bildirimler${unread ? ` (${unread} okunmamış)` : ""}`}
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* dışına tıklayınca kapansın */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <span className="text-sm font-semibold">Bildirimler</span>
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Tümünü okundu
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-gray-400">
                  Henüz bildirim yok
                </p>
              )}
              {items.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-2 border-b px-4 py-3 text-sm last:border-0 ${
                    n.is_read ? "opacity-60" : "bg-blue-50/40"
                  }`}
                >
                  <button
                    onClick={() => handleClick(n)}
                    className="flex-1 text-left"
                  >
                    <p className="font-medium text-gray-900">{n.title}</p>
                    {n.body && <p className="text-gray-600">{n.body}</p>}
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {new Date(n.created_at).toLocaleString("tr-TR")}
                    </p>
                  </button>
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
        </>
      )}
    </div>
  );
}

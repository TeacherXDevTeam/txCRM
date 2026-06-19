"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "./notification-bell";
import { EntityDrawer } from "./entity-drawer";
import { createPfClient, STATUS_LABEL, type PfRecord } from "./pf-supabase";

const STATUS_STYLE: Record<PfRecord["status"], string> = {
  yeni: "bg-gray-100 text-gray-700",
  teklif_bekleniyor: "bg-amber-100 text-amber-800",
  hazir: "bg-green-100 text-green-800",
};

export function PocClient() {
  const [records, setRecords] = useState<PfRecord[]>([]);
  const [drawer, setDrawer] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const load = useCallback(async () => {
    const sb = createPfClient();
    const { data } = await sb
      .from("pf_records")
      .select("*")
      .order("created_at", { ascending: false });
    setRecords((data ?? []) as PfRecord[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Platform Foundation — Deneme</h1>
          <p className="text-sm text-gray-500">
            Status-driven mutasyon → polymorphic olay günlüğü + bildirim (DB
            trigger). Form yerine yan panel + auto-save.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button onClick={() => setDrawer({ open: true, id: null })}>
            <Plus className="mr-1 h-4 w-4" /> Yeni Kayıt
          </Button>
        </div>
      </header>

      <div className="space-y-2">
        {records.length === 0 && (
          <div className="rounded-xl border border-dashed py-12 text-center text-sm text-gray-400">
            Henüz kayıt yok. &quot;Yeni Kayıt&quot; ile başla.
          </div>
        )}
        {records.map((r) => (
          <button
            key={r.id}
            onClick={() => setDrawer({ open: true, id: r.id })}
            className="flex w-full items-center justify-between rounded-lg border bg-white px-4 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/30"
          >
            <div>
              <p className="font-medium text-gray-900">{r.title}</p>
              <p className="text-xs text-gray-500">
                {r.owner ?? "—"}
                {r.amount
                  ? ` · ₺${r.amount.toLocaleString("tr-TR")}`
                  : ""}
              </p>
            </div>
            <Badge className={STATUS_STYLE[r.status]}>
              {STATUS_LABEL[r.status]}
            </Badge>
          </button>
        ))}
      </div>

      {drawer.open && (
        <EntityDrawer
          recordId={drawer.id}
          onClose={() => setDrawer({ open: false, id: null })}
          onChanged={load}
        />
      )}
    </div>
  );
}

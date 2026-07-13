"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createReportClient } from "./report-client";

interface Props {
  rowCount: number;
}

export function ClearUploadButton({ rowCount }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClear() {
    if (!confirm(`Tüm yüklenmiş rapor verisi (${rowCount.toLocaleString("tr-TR")} kayıt) silinsin mi?\nDashboard temizlenir, sonra yeni rapor yükleyebilirsin. Bu işlem geri alınamaz.`)) return;
    setBusy(true);
    const sb = createReportClient();
    // Tüm yüklemeleri sil (eski/yetim kayıtlar dahil); report_kurum_stats cascade ile gider
    const { error } = await sb.from("report_uploads").delete().gte("satir_sayisi", 0);
    setBusy(false);
    if (error) { alert("Silinemedi: " + error.message); return; }
    router.refresh();
  }

  return (
    <button
      onClick={handleClear}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
      {busy ? "Siliniyor..." : "Veriyi Temizle"}
    </button>
  );
}

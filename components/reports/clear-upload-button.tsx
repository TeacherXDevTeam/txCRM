"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createReportClient } from "./report-client";

interface Props {
  uploadId: string;
  rowCount: number;
}

export function ClearUploadButton({ uploadId, rowCount }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClear() {
    if (!confirm(`Bu yükleme ve ${rowCount.toLocaleString("tr-TR")} kayıt tamamen silinsin mi?\nDashboard temizlenir, sonra yeni rapor yükleyebilirsin. Bu işlem geri alınamaz.`)) return;
    setBusy(true);
    const sb = createReportClient();
    // report_uploads silinince report_rows cascade ile silinir
    const { error } = await sb.from("report_uploads").delete().eq("id", uploadId);
    if (error) { alert("Silinemedi: " + error.message); setBusy(false); return; }
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

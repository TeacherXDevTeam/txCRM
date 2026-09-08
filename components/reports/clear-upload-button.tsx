"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createReportClient } from "./report-client";

interface Props {
  /** Hangi rapor türü temizlenecek — diğer sekmenin verisine dokunulmaz. */
  format: "ogretmen" | "kurs";
  rowCount: number;
  /** Onay metnindeki birim, örn. "öğretmen" / "kurs kaydı". */
  label: string;
}

export function ClearUploadButton({ format, rowCount, label }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const tur = format === "ogretmen" ? "Öğretmen Özeti" : "Kurs Bazlı";

  async function handleClear() {
    const ok = confirm(
      `"${tur}" raporundaki tüm veri (${rowCount.toLocaleString("tr-TR")} ${label}) silinsin mi?\n\n` +
      `Diğer sekmedeki rapor etkilenmez. Bu işlem geri alınamaz.`
    );
    if (!ok) return;

    setBusy(true);
    const sb = createReportClient();
    // Yalnızca bu türdeki yüklemeler; report_kurum_stats cascade ile gider
    const { error } = await sb.from("report_uploads").delete().eq("format", format);
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createReportClient, computeStatsByKurum, type CourseRow } from "./report-client";
import { norm, num } from "./parse-utils";

interface Props { currentUserId: string }

type Field = "ad" | "soyad" | "eposta" | "kurum" | "sube" | "kurs" | "ilerleme" | "sertifika";
const MAP: Record<string, Field> = {
  ad: "ad", adi: "ad", adisoyadi: "ad",
  soyad: "soyad", soyadi: "soyad",
  eposta: "eposta", email: "eposta",
  kurum: "kurum", kurumadi: "kurum",
  sube: "sube",
  kurs: "kurs", kursadi: "kurs", egitim: "kurs",
  ilerlemeyuzdesi: "ilerleme", ilerleme: "ilerleme", "tamamlama%": "ilerleme", tamamlamayuzde: "ilerleme", tamamlama: "ilerleme",
  sertifikaninalindigitarih: "sertifika", sertifikatarihi: "sertifika", sertifika: "sertifika",
};

export function ReportUpload({ currentUserId }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "array" });
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
        const parsed: CourseRow[] = raw.map((r: Record<string, unknown>) => {
          let ad = "", soyad = "", eposta = "", kurum = "", sube = "", kurs = "", ilerleme = 0, sertifika = "";
          for (const key of Object.keys(r)) {
            const f = MAP[norm(key)];
            if (!f) continue;
            const v = r[key];
            if (f === "ilerleme") ilerleme = num(v);
            else if (f === "ad") ad = String(v ?? "").trim();
            else if (f === "soyad") soyad = String(v ?? "").trim();
            else if (f === "eposta") eposta = String(v ?? "").trim();
            else if (f === "kurum") kurum = String(v ?? "").trim();
            else if (f === "sube") sube = String(v ?? "").trim();
            else if (f === "kurs") kurs = String(v ?? "").trim();
            else if (f === "sertifika") sertifika = String(v ?? "").trim();
          }
          return { ad: `${ad} ${soyad}`.trim(), eposta, kurum, sube, kurs, ilerleme, sertifika };
        }).filter((r) => r.eposta || r.ad);

        if (parsed.length === 0) { setError("Geçerli satır yok. Beklenen sütunlar: Ad, Soyad, E-posta, Kurum, Şube, Kurs, İlerleme Yüzdesi."); return; }
        if (!parsed.some((r) => r.kurs)) {
          setError("'Kurs' sütunu bulunamadı. Dosyanızda 'Tamamlanan' / 'Devam Eden' sütunları varsa bu bir öğretmen özeti raporudur — \"Öğretmen Özeti\" sekmesinden yükleyin.");
          return;
        }
        if (!parsed.some((r) => r.kurum)) { setError("'Kurum' sütunu bulunamadı. Bu rapor kurum bilgisi içermiyor."); return; }

        // % ölçek: 0-100 ise 0-1'e indir
        const maxI = Math.max(...parsed.map((r) => r.ilerleme), 0);
        if (maxI > 1.5) parsed.forEach((r) => (r.ilerleme = r.ilerleme / 100));

        setRows(parsed);
      } catch {
        setError("Excel okunamadı. Geçerli bir .xlsx dosyası seç.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleUpload() {
    if (rows.length === 0) return;
    setBusy(true); setError(null);
    const sb = createReportClient();

    const { data: up, error: upErr } = await sb
      .from("report_uploads")
      .insert({ uploaded_by: currentUserId, dosya_adi: fileName, satir_sayisi: rows.length, format: "kurs" })
      .select("id").single();
    if (upErr || !up) { setError(upErr?.message ?? "Yükleme oluşturulamadı."); setBusy(false); return; }

    const uploadId = (up as { id: string }).id;
    const stats = computeStatsByKurum(rows).map((s) => ({ upload_id: uploadId, ...s }));
    const { error: stErr } = await sb.from("report_kurum_stats").insert(stats);
    if (stErr) { setError(stErr.message); setBusy(false); return; }

    setRows([]); setFileName("");
    router.refresh();
  }

  const kurumCount = new Set(rows.map((r: CourseRow) => r.kurum)).size;
  const teacherCount = new Set(rows.map((r: CourseRow) => r.eposta || r.ad)).size;

  return (
    <div className="ic-arac rounded-lg border border-tx-cizgi bg-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <Upload className="h-4 w-4 text-tx-gri" />
        <h2 className="font-baslik text-base font-semibold text-tx-metin">Excel Rapor Yükle</h2>
      </div>

      {rows.length === 0 ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-tx-cizgi py-8 text-center hover:border-tx-kirmizi">
          <FileSpreadsheet className="h-8 w-8 text-tx-cizgi" />
          <span className="text-sm text-tx-metin">.xlsx dosyasını seç</span>
          <span className="text-xs text-tx-gri">Sütunlar: Ad · Soyad · E-posta · Kurum · Şube · Kurs · İlerleme Yüzdesi · Sertifika Tarihi</span>
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
        </label>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-tx-cizgi bg-tx-kagit px-4 py-3">
          <div className="text-sm">
            <p className="font-medium text-tx-metin">{fileName}</p>
            <p className="text-tx-gri">{rows.length.toLocaleString("tr-TR")} kurs kaydı · {teacherCount} öğretmen · {kurumCount} kurum</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setRows([]); setFileName(""); }} className="text-tx-gri hover:text-tx-metin" title="Vazgeç"><X className="h-5 w-5" /></button>
            <Button onClick={handleUpload} disabled={busy}>{busy ? "İşleniyor..." : "Yükle ve İşle"}</Button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 rounded-md border-l-[3px] border-tx-kirmizi bg-white px-3 py-2 text-sm text-tx-metin">{error}</p>}
    </div>
  );
}

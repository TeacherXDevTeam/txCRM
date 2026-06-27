"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createReportClient, computeStatsByKurum, type CourseRow } from "./report-client";

interface Props { currentUserId: string }

function norm(s: string) {
  return s.toString()
    .replace(/[İIı]/g, "i").replace(/[Şş]/g, "s").replace(/[Çç]/g, "c")
    .replace(/[Öö]/g, "o").replace(/[Üü]/g, "u").replace(/[Ğğ]/g, "g")
    .toLowerCase().replace(/[^a-z0-9%]/g, "");
}

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

function num(v: unknown): number {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? "").replace(",", ".").replace("%", "").trim());
  return isNaN(n) ? 0 : n;
}

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
        const parsed: CourseRow[] = raw.map((r) => {
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
      .insert({ uploaded_by: currentUserId, dosya_adi: fileName, satir_sayisi: rows.length })
      .select("id").single();
    if (upErr || !up) { setError(upErr?.message ?? "Yükleme oluşturulamadı."); setBusy(false); return; }

    const uploadId = (up as { id: string }).id;
    const stats = computeStatsByKurum(rows).map((s) => ({ upload_id: uploadId, ...s }));
    const { error: stErr } = await sb.from("report_kurum_stats").insert(stats);
    if (stErr) { setError(stErr.message); setBusy(false); return; }

    setRows([]); setFileName("");
    router.refresh();
  }

  const kurumCount = new Set(rows.map((r) => r.kurum)).size;
  const teacherCount = new Set(rows.map((r) => r.eposta || r.ad)).size;

  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <Upload className="h-4 w-4 text-gray-400" />
        <h2 className="text-base font-semibold text-gray-900">Excel Rapor Yükle</h2>
      </div>

      {rows.length === 0 ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-8 text-center hover:border-blue-400">
          <FileSpreadsheet className="h-8 w-8 text-gray-300" />
          <span className="text-sm text-gray-600">.xlsx dosyasını seç</span>
          <span className="text-xs text-gray-400">Sütunlar: Ad · Soyad · E-posta · Kurum · Şube · Kurs · İlerleme Yüzdesi · Sertifika Tarihi</span>
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
        </label>
      ) : (
        <div className="flex items-center justify-between rounded-lg bg-blue-50/50 border border-blue-200 px-4 py-3">
          <div className="text-sm">
            <p className="font-medium text-gray-800">{fileName}</p>
            <p className="text-gray-500">{rows.length.toLocaleString("tr-TR")} kurs kaydı · {teacherCount} öğretmen · {kurumCount} kurum</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setRows([]); setFileName(""); }} className="text-gray-400 hover:text-gray-600" title="Vazgeç"><X className="h-5 w-5" /></button>
            <Button onClick={handleUpload} disabled={busy}>{busy ? "İşleniyor..." : "Yükle ve İşle"}</Button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

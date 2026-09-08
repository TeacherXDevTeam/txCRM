"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createReportClient } from "./report-client";
import { computeTeacherStatsByKurum, type TeacherRow } from "./teacher-report-client";
import { norm, num, intNum } from "./parse-utils";

interface Props {
  currentUserId: string;
  /**
   * Yükleme başarılı olunca ham satırları üst bileşene verir — öğretmen
   * listesi çıktısı bunları kullanır. Bu satırlar DB'ye YAZILMAZ; yalnızca
   * bu oturumun belleğinde yaşar ve sayfa yenilenince kaybolur.
   */
  onYuklendi?: (rows: TeacherRow[]) => void;
}

type Field = "ad" | "soyad" | "eposta" | "kurum" | "sube" | "tamamlanan" | "devam" | "yuzde";

const MAP: Record<string, Field> = {
  adisoyadi: "ad", adsoyad: "ad", adsoyadi: "ad", isimsoyisim: "ad", adisoyad: "ad",
  ad: "ad", adi: "ad", isim: "ad",
  soyad: "soyad", soyadi: "soyad", soyisim: "soyad",
  eposta: "eposta", email: "eposta", mail: "eposta", epostaadresi: "eposta",
  kurum: "kurum", kurumadi: "kurum", okul: "kurum", okuladi: "kurum",
  sube: "sube", subeadi: "sube", kampus: "sube",
  tamamlanan: "tamamlanan", tamamlanankurs: "tamamlanan", tamamlanankurssayisi: "tamamlanan",
  bitirilen: "tamamlanan", tamamlananegitim: "tamamlanan",
  devameden: "devam", devamedenkurs: "devam", devamedenkurssayisi: "devam",
  devam: "devam", devamedenegitim: "devam",
  "tamamlama%": "yuzde", tamamlamayuzdesi: "yuzde", tamamlamayuzde: "yuzde",
  tamamlamaorani: "yuzde", "ilerleme%": "yuzde", ilerlemeyuzdesi: "yuzde", yuzde: "yuzde",
};

const BEKLENEN = "Adı Soyadı · E-posta · Kurum · Şube · Tamamlanan · Devam Eden · Tamamlama %";

export function TeacherReportUpload({ currentUserId, onYuklendi }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<TeacherRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null); setWarn(null); setRows([]);
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "array" });
        const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(
          wb.Sheets[wb.SheetNames[0]], { defval: "" }
        );
        if (raw.length === 0) { setError("Dosyanın ilk sayfası boş."); return; }

        // Hangi alanlar başlıklardan bulunabildi?
        const found = new Set<Field>();
        for (const key of Object.keys(raw[0])) {
          const f = MAP[norm(key)];
          if (f) found.add(f);
        }

        // Bu formatın ayırt edici sütunları — yoksa muhtemelen kurs bazlı rapor
        const eksik: string[] = [];
        if (!found.has("tamamlanan")) eksik.push("Tamamlanan");
        if (!found.has("devam")) eksik.push("Devam Eden");
        if (!found.has("yuzde")) eksik.push("Tamamlama %");
        if (!found.has("kurum")) eksik.push("Kurum");
        if (eksik.length > 0) {
          setError(
            `Şu sütunlar bulunamadı: ${eksik.join(", ")}. Beklenen başlıklar: ${BEKLENEN}. ` +
            `Elinizdeki dosyada "Kurs" sütunu varsa bu bir kurs bazlı rapordur — "Kurs Bazlı" sekmesinden yükleyin.`
          );
          return;
        }

        const parsed: TeacherRow[] = raw.map((r) => {
          let ad = "", soyad = "", eposta = "", kurum = "", sube = "";
          let tamamlanan = 0, devamEden = 0, yuzde = 0;
          for (const key of Object.keys(r)) {
            const f = MAP[norm(key)];
            if (!f) continue;
            const v = r[key];
            if (f === "tamamlanan") tamamlanan = intNum(v);
            else if (f === "devam") devamEden = intNum(v);
            else if (f === "yuzde") yuzde = num(v);
            else if (f === "ad") ad = String(v ?? "").trim();
            else if (f === "soyad") soyad = String(v ?? "").trim();
            else if (f === "eposta") eposta = String(v ?? "").trim();
            else if (f === "kurum") kurum = String(v ?? "").trim();
            else if (f === "sube") sube = String(v ?? "").trim();
          }
          return { ad: `${ad} ${soyad}`.trim(), eposta, kurum, sube, tamamlanan, devamEden, yuzde };
        }).filter((r) => r.eposta || r.ad);

        if (parsed.length === 0) {
          setError(`Geçerli satır yok — her satırda ad veya e-posta olmalı. Beklenen başlıklar: ${BEKLENEN}`);
          return;
        }
        if (!parsed.some((r) => r.kurum)) {
          setError("'Kurum' sütunu var ama tamamen boş. Kurum bazlı özet üretilemez.");
          return;
        }

        // Yüzde ölçeği: dosya 0-1 aralığında veriyorsa 0-100'e çevir
        const maxY = Math.max(...parsed.map((r) => r.yuzde), 0);
        if (maxY > 0 && maxY <= 1.5) parsed.forEach((r) => (r.yuzde = r.yuzde * 100));
        parsed.forEach((r) => (r.yuzde = Math.min(100, Math.max(0, r.yuzde))));

        // Kayıt yok ama yüzde var (ya da tersi) → kullanıcıyı uyar, engelleme
        const bosKayit = parsed.filter((r) => r.tamamlanan + r.devamEden === 0).length;
        if (bosKayit > 0) {
          setWarn(`${bosKayit} satırda tamamlanan ve devam eden kurs sayısı sıfır. Bu öğretmenler "hiç başlamamış" sayılacak.`);
        }

        setRows(parsed);
      } catch {
        setError("Excel okunamadı. Geçerli bir .xlsx/.xls dosyası seçin.");
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
      .insert({ uploaded_by: currentUserId, dosya_adi: fileName, satir_sayisi: rows.length, format: "ogretmen" })
      .select("id").single();
    if (upErr || !up) { setError(upErr?.message ?? "Yükleme kaydı oluşturulamadı."); setBusy(false); return; }

    const uploadId = (up as { id: string }).id;
    const stats = computeTeacherStatsByKurum(rows).map((s) => ({ upload_id: uploadId, ...s }));
    const { error: stErr } = await sb.from("report_kurum_stats").insert(stats);
    if (stErr) { setError(stErr.message); setBusy(false); return; }

    onYuklendi?.(rows);
    setRows([]); setFileName(""); setWarn(null); setBusy(false);
    router.refresh();
  }

  const kurumCount = new Set(rows.map((r) => r.kurum)).size;
  const subeCount = new Set(rows.map((r) => r.sube).filter(Boolean)).size;

  return (
    <div className="ic-arac rounded-lg border border-tx-cizgi bg-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <Upload className="h-4 w-4 text-tx-gri" />
        <h2 className="font-baslik text-base font-semibold text-tx-metin">Öğretmen Özeti Yükle</h2>
      </div>

      {rows.length === 0 ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-tx-cizgi py-8 text-center hover:border-tx-kirmizi">
          <FileSpreadsheet className="h-8 w-8 text-tx-cizgi" />
          <span className="text-sm text-tx-metin">.xlsx dosyasını seç</span>
          <span className="text-xs text-tx-gri">Sütunlar: {BEKLENEN}</span>
          <span className="text-xs text-tx-gri">Dosya tarayıcıda işlenir; sunucuya yalnızca kurum bazlı sayısal özet gider.</span>
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
        </label>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-tx-cizgi bg-tx-kagit px-4 py-3">
          <div className="text-sm">
            <p className="font-medium text-tx-metin">{fileName}</p>
            <p className="text-tx-gri">
              {rows.length.toLocaleString("tr-TR")} öğretmen · {kurumCount} kurum{subeCount > 0 ? ` · ${subeCount} şube` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setRows([]); setFileName(""); setWarn(null); }} className="text-tx-gri hover:text-tx-metin" title="Vazgeç">
              <X className="h-5 w-5" />
            </button>
            <Button onClick={handleUpload} disabled={busy}>{busy ? "İşleniyor..." : "Yükle ve İşle"}</Button>
          </div>
        </div>
      )}

      {warn && (
        <p className="mt-3 flex items-start gap-2 rounded-md border-l-[3px] border-tx-kirmizi bg-white px-3 py-2 text-sm text-tx-metin">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{warn}
        </p>
      )}
      {error && <p className="mt-3 rounded-md border-l-[3px] border-tx-kirmizi bg-white px-3 py-2 text-sm text-tx-metin">{error}</p>}
    </div>
  );
}

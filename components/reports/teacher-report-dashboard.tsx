"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LabelList,
} from "recharts";
import { Printer, Info } from "lucide-react";
import { Select } from "@/components/ui/select";
import type { TeacherKurumStats } from "./teacher-report-client";

interface KurumEntry { kurum: string; teacher_count: number; stats: TeacherKurumStats }
interface Props {
  kurumStats: KurumEntry[];
  expectedByKurum: Record<string, number>;
  uploadInfo: { dosya_adi: string | null; uploaded_at: string; satir_sayisi: number } | null;
}

const normKurum = (s: string) => s.toLowerCase().trim();
const DONUT_COLORS = ["#22c55e", "#eab308"];
const PCT_COLORS = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e", "#16a34a"];
const tr = (n: number) => n.toLocaleString("tr-TR");
// Recharts formatter'ları değeri geniş bir birleşim tipiyle veriyor → güvenli çevirim
const trv = (v: unknown) => Number(v ?? 0).toLocaleString("tr-TR");
const pctv = (v: unknown) => `%${Number(v ?? 0)}`;

export function TeacherReportDashboard({ kurumStats, expectedByKurum, uploadInfo }: Props) {
  const kurumlar = useMemo(
    () => kurumStats.map((k) => k.kurum).sort((a, b) => a.localeCompare(b, "tr")),
    [kurumStats]
  );
  const [kurum, setKurum] = useState(kurumlar[0] ?? "");

  const entry = kurumStats.find((k) => k.kurum === kurum);
  const s = entry?.stats;
  if (!s) return null;

  const expected = expectedByKurum[normKurum(kurum)] ?? null;
  const coverage = expected ? Math.round((s.teacherCount / expected) * 100) : null;

  const donut = [
    { name: "Tamamlanan", value: s.totalCompleted },
    { name: "Devam Eden", value: s.totalInProgress },
  ];

  const bitirenOran = s.teacherCount ? Math.round((s.fullyCompleted / s.teacherCount) * 100) : 0;
  const baslamayanOran = s.teacherCount ? Math.round((s.notStarted / s.teacherCount) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Kurum seçici + yazdır — ekranda görünür, çıktıda gizli */}
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div className="w-80">
          <label className="block text-sm font-medium text-gray-700 mb-1">Kurum ({kurumlar.length})</label>
          <Select value={kurum} onChange={(e) => setKurum(e.target.value)}>
            {kurumlar.map((kk) => <option key={kk} value={kk}>{kk}</option>)}
          </Select>
        </div>
        <div className="flex items-center gap-3">
          {uploadInfo && (
            <p className="text-xs text-gray-400 text-right">
              {uploadInfo.dosya_adi}<br />
              {new Date(uploadInfo.uploaded_at).toLocaleString("tr-TR")} · {tr(uploadInfo.satir_sayisi)} öğretmen
            </p>
          )}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            title="Yazdırma penceresinde 'Hedef: PDF olarak kaydet' seçin"
          >
            <Printer className="h-4 w-4" />
            PDF olarak indir
          </button>
        </div>
      </div>

      {/* Yalnızca çıktıda görünen başlık */}
      <div className="hidden print:block border-b border-gray-300 pb-3 mb-4">
        <h1 className="text-xl font-bold text-gray-900">{kurum}</h1>
        <p className="text-xs text-gray-600 mt-1">
          Eğitim Tamamlama Raporu · TeacherX CRM
          {uploadInfo && <> · Kaynak: {uploadInfo.dosya_adi} ({new Date(uploadInfo.uploaded_at).toLocaleDateString("tr-TR")})</>}
          {" · "}Çıktı tarihi: {new Date().toLocaleDateString("tr-TR")}
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 print:grid-cols-6 print:gap-2 print:break-inside-avoid">
        <Kpi label="Öğretmen" value={tr(s.teacherCount)} />
        <Kpi label="Toplam Kurs Kaydı" value={tr(s.enrollments)} sub={`kişi başı ${s.avgCoursesPerTeacher}`} />
        <Kpi label="Ort. Tamamlama" value={`%${s.avgCompletion}`} sub={`medyan %${s.medianCompletion}`} />
        <Kpi label="Kurs Bazlı Tamamlama" value={`%${s.weightedCompletion}`} sub={`${tr(s.totalCompleted)}/${tr(s.enrollments)} kurs`} />
        <Kpi label="Tümünü Bitiren" value={`${tr(s.fullyCompleted)}`} sub={`%${bitirenOran} öğretmen`} accent="green" />
        <Kpi label="Hiç Başlamayan" value={`${tr(s.notStarted)}`} sub={`%${baslamayanOran} öğretmen`} accent={s.notStarted > 0 ? "red" : "blue"} />
      </div>

      {/* Sözleşme karşılaştırması */}
      {expected !== null ? (
        <div className={`rounded-lg border px-4 py-3 text-sm print:break-inside-avoid ${s.teacherCount >= expected ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          Sözleşmeye göre <b>{tr(expected)}</b> öğretmen olmalı, raporda <b>{tr(s.teacherCount)}</b> var
          {s.teacherCount < expected
            ? <> → <b>{tr(expected - s.teacherCount)}</b> öğretmen eksik (%{coverage} kapsama).</>
            : <> → hedef karşılanıyor (%{coverage}).</>}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 print:hidden">
          Bu kurum için sözleşmede &quot;olması gereken öğretmen sayısı&quot; tanımlı değil (kurum adı eşleşmedi). Sözleşmeler&apos;den eklenince karşılaştırma burada çıkar.
        </div>
      )}

      {/* Veri kalitesi notları */}
      {(s.pctMismatch > 0 || s.mergedDuplicates > 0) && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3 text-sm text-blue-900 print:break-inside-avoid">
          <p className="flex items-center gap-1.5 font-medium"><Info className="h-4 w-4" /> Veri notu</p>
          <ul className="mt-1 ml-5 list-disc space-y-0.5 text-xs">
            {s.pctMismatch > 0 && (
              <li>
                <b>{tr(s.pctMismatch)}</b> öğretmende platformun verdiği tamamlama yüzdesi, tamamlanan/devam eden adetlerinden
                hesaplanana uymuyor. Genellikle bu, henüz başlanmamış kursların &quot;Devam Eden&quot; sayısına dahil edilmediği anlamına gelir.
                KPI&apos;larda platformun yüzdesi esas alındı.
              </li>
            )}
            {s.mergedDuplicates > 0 && (
              <li><b>{tr(s.mergedDuplicates)}</b> tekrar eden öğretmen satırı tek kayıtta birleştirildi (adetler toplandı, yüzde ağırlıklı ortalandı).</li>
            )}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
        <Card title="Tamamlama Yüzdesi Dağılımı (öğretmen sayısı)">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={s.pctBuckets} margin={{ left: -20, top: 12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="aralik" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => [trv(v), "Öğretmen"]} />
              <Bar dataKey="sayi" name="Öğretmen" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="sayi" position="top" style={{ fontSize: 11, fill: "#6b7280" }} />
                {s.pctBuckets.map((_, i) => <Cell key={i} fill={PCT_COLORS[i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Tamamlanan Kurs Adedi Dağılımı (öğretmen sayısı)">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={s.countBuckets} margin={{ left: -20, top: 12 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="aralik" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: unknown) => [trv(v), "Öğretmen"]} />
              <Bar dataKey="sayi" name="Öğretmen" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="sayi" position="top" style={{ fontSize: 11, fill: "#6b7280" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Şube Bazında Ortalama Tamamlama %">
          <ResponsiveContainer width="100%" height={Math.max(240, s.subeler.length * 28)}>
            <BarChart data={s.subeler} layout="vertical" margin={{ left: 10, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="sube" width={140} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: unknown) => [pctv(v), "Ort. tamamlama"]} />
              <Bar dataKey="ort" name="Ort. %" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="ort" position="right" formatter={pctv} style={{ fontSize: 10, fill: "#6b7280" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Kurs Kayıtlarının Durumu">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={donut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {donut.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={trv} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <p className="mt-1 text-center text-xs text-gray-500">
            {tr(s.totalCompleted)} tamamlanan · {tr(s.totalInProgress)} devam eden · toplam {tr(s.enrollments)} kayıt
          </p>
        </Card>
      </div>

      {/* Şube tablosu */}
      {s.subeler.length > 1 && (
        <Card title={`Şube Karşılaştırması — ${s.subeler.length} şube`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-3 font-medium">Şube</th>
                  <th className="py-2 px-3 text-right font-medium">Öğretmen</th>
                  <th className="py-2 px-3 text-right font-medium">Ort. Tamamlama</th>
                  <th className="py-2 px-3 text-right font-medium">Tümünü Bitiren</th>
                  <th className="py-2 pl-3 text-right font-medium">Tamamlanan Kurs</th>
                </tr>
              </thead>
              <tbody>
                {s.subeler.map((b) => (
                  <tr key={b.sube} className="border-b border-gray-100">
                    <td className="py-1.5 pr-3">{b.sube}</td>
                    <td className="py-1.5 px-3 text-right tabular-nums">{tr(b.ogretmen)}</td>
                    <td className={`py-1.5 px-3 text-right font-medium tabular-nums ${b.ort < 50 ? "text-red-600" : b.ort >= 80 ? "text-green-600" : "text-gray-700"}`}>%{b.ort}</td>
                    <td className="py-1.5 px-3 text-right tabular-nums">{tr(b.bitiren)}</td>
                    <td className="py-1.5 pl-3 text-right tabular-nums">{tr(b.tamamlananKurs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Risk listesi */}
      <Card title={`Risk Listesi (tamamlama < %50) — ${s.risk.length}${s.risk.length === 50 ? "+" : ""} öğretmen`}>
        {s.risk.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">Tamamlaması %50&apos;nin altında öğretmen yok 🎉</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 print:grid-cols-2">
            {s.risk.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-3 border-b border-gray-100 py-1.5 text-sm">
                <span className="truncate">{r.ad}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {r.sube && <span className="text-xs text-gray-400">{r.sube}</span>}
                  <span className="text-xs text-gray-400 tabular-nums">{r.tamamlanan}/{r.tamamlanan + r.devamEden}</span>
                  <span className="w-10 text-right font-medium text-red-600 tabular-nums">%{r.yuzde}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Kpi({ label, value, sub, accent = "blue" }: { label: string; value: string; sub?: string; accent?: "blue" | "green" | "red" }) {
  const color = accent === "green" ? "text-green-600" : accent === "red" ? "text-red-600" : "text-gray-900";
  return (
    <div className="rounded-lg border bg-white px-4 py-3 print:px-2 print:py-2">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-xl font-bold print:text-base ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4 print:break-inside-avoid print:p-3">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{title}</h3>
      {children}
    </div>
  );
}

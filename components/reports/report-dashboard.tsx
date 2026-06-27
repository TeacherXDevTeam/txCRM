"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Select } from "@/components/ui/select";
import type { KurumStats } from "./report-client";

interface KurumEntry { kurum: string; teacher_count: number; stats: KurumStats }
interface Props {
  kurumStats: KurumEntry[];
  expectedByKurum: Record<string, number>;
  uploadInfo: { dosya_adi: string | null; uploaded_at: string; satir_sayisi: number } | null;
}

const normKurum = (s: string) => s.toLowerCase().trim();
const COLORS = ["#22c55e", "#eab308", "#ef4444"];

export function ReportDashboard({ kurumStats, expectedByKurum, uploadInfo }: Props) {
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
    { name: "Başlamayan", value: s.totalNotStarted },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-80">
          <label className="block text-sm font-medium text-gray-700 mb-1">Kurum ({kurumlar.length})</label>
          <Select value={kurum} onChange={(e) => setKurum(e.target.value)}>
            {kurumlar.map((kk) => <option key={kk} value={kk}>{kk}</option>)}
          </Select>
        </div>
        {uploadInfo && (
          <p className="text-xs text-gray-400">
            {uploadInfo.dosya_adi} · {new Date(uploadInfo.uploaded_at).toLocaleString("tr-TR")} · {uploadInfo.satir_sayisi.toLocaleString("tr-TR")} kayıt
          </p>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Öğretmen" value={s.teacherCount} />
        <Kpi label="Kurs Sayısı" value={s.courseCount} />
        <Kpi label="Ort. Tamamlama" value={`%${s.avgCompletion}`} />
        <Kpi label="Tümünü Bitiren" value={`${s.fullyCompleted} (${s.teacherCount ? Math.round((s.fullyCompleted / s.teacherCount) * 100) : 0}%)`} accent="green" />
        <Kpi label="Sözleşme Kapsamı" value={expected ? `${s.teacherCount}/${expected} (%${coverage})` : "—"} accent={coverage !== null && coverage < 90 ? "red" : "blue"} />
      </div>

      {/* Sözleşme karşılaştırma */}
      {expected !== null ? (
        <div className={`rounded-lg border px-4 py-3 text-sm ${s.teacherCount >= expected ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          Sözleşmeye göre <b>{expected}</b> öğretmen olmalı, raporda <b>{s.teacherCount}</b> var
          {s.teacherCount < expected ? <> → <b>{expected - s.teacherCount}</b> eksik (%{coverage} kapsama).</> : <> → hedef karşılanıyor (%{coverage}).</>}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
          Bu kurum için sözleşmede &quot;olması gereken öğretmen sayısı&quot; tanımlı değil (kurum adı eşleşmedi). Sözleşmeler&apos;den eklenince karşılaştırma çıkar.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Şube Bazında Ortalama Tamamlama %">
          <ResponsiveContainer width="100%" height={Math.max(220, s.subeler.length * 26)}>
            <BarChart data={s.subeler} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="sube" width={140} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="ort" name="Ort. %" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Kurs Bazında Tamamlama % (en düşük üstte)">
          <ResponsiveContainer width="100%" height={Math.max(220, s.kurslar.length * 26)}>
            <BarChart data={s.kurslar} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="kurs" width={160} tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="oran" name="Tamamlama %" fill="#a855f7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Öğretmen Başına Tamamlanan Kurs Dağılımı">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={s.buckets} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="aralik" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="sayi" name="Öğretmen" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Kurs Kayıtları (durum dağılımı)">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={donut} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                {donut.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <p className="mt-2 text-center text-xs text-gray-400">{s.certCount.toLocaleString("tr-TR")} sertifika alındı</p>
        </Card>
      </div>

      {/* Risk listesi */}
      <Card title={`Risk Listesi (tamamlama < %50) — ${s.risk.length}`}>
        {s.risk.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">Düşük tamamlamalı öğretmen yok 🎉</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            {s.risk.map((r, i) => (
              <div key={i} className="flex items-center justify-between border-b border-gray-100 py-1.5 text-sm">
                <span>{r.ad}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{r.sube}</span>
                  <span className="font-medium text-red-600">%{r.yuzde}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Kpi({ label, value, accent = "blue" }: { label: string; value: string | number; accent?: "blue" | "green" | "red" }) {
  const color = accent === "green" ? "text-green-600" : accent === "red" ? "text-red-600" : "text-gray-900";
  return (
    <div className="rounded-lg border bg-white px-4 py-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">{title}</h3>
      {children}
    </div>
  );
}

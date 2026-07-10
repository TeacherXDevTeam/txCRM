"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";

export interface IncompleteSchool {
  id: string;
  name: string;
  missing: string[]; // eksik alan etiketleri
}

interface Props {
  total: number;
  incomplete: IncompleteSchool[];
  missingCounts: Record<string, number>; // etiket → kaç okulda eksik
}

const FIELDS = ["Konum", "Koordinatör", "Sözleşme", "Beklenen öğretmen"];

export function SchoolCompleteness({ total, incomplete, missingCounts }: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const complete = total - incomplete.length;
  const pct = total ? Math.round((complete / total) * 100) : 0;

  const list = filter ? incomplete.filter((s) => s.missing.includes(filter)) : incomplete;

  return (
    <div className="rounded-xl border bg-white">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
          <div>
            <h2 className="text-base font-semibold text-gray-900">Profil Tamamlama</h2>
            <p className="text-xs text-gray-500">
              {complete}/{total} okul tamam · {incomplete.length} okulda eksik bilgi
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block w-40 h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-sm font-bold text-gray-700 w-10 text-right">%{pct}</span>
        </div>
      </button>

      {open && (
        <div className="border-t px-5 py-4">
          {incomplete.length === 0 ? (
            <p className="flex items-center gap-2 py-4 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" /> Tüm okul profilleri tamam 🎉
            </p>
          ) : (
            <>
              {/* eksik türüne göre filtre */}
              <div className="mb-3 flex flex-wrap gap-2">
                <button onClick={() => setFilter(null)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${!filter ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  Tümü ({incomplete.length})
                </button>
                {FIELDS.map((f) => (
                  <button key={f} onClick={() => setFilter(f === filter ? null : f)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {f} eksik ({missingCounts[f] ?? 0})
                  </button>
                ))}
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                {list.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/okullar/${s.id}`} className="text-sm font-medium text-gray-800 hover:text-blue-600">
                      {s.name}
                    </Link>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {s.missing.map((m) => (
                        <span key={m} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          <AlertTriangle className="h-3 w-3" /> {m}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

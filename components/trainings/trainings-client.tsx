"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Trash2, Clock, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TrainingForm } from "@/components/trainings/training-form";
import { PackageForm } from "@/components/trainings/package-form";
import { CATEGORY_CONFIG, FORMAT_CONFIG, STATUS_CONFIG } from "@/components/trainings/training-config";
import type { Database } from "@/types/database";

type Training = Database["public"]["Tables"]["trainings"]["Row"];
type Package  = Database["public"]["Tables"]["packages"]["Row"] & {
  training_ids: string[];
  trainings: { id: string; title: string }[];
};

interface TrainingsClientProps {
  trainings: Training[];
  packages:  Package[];
  canWrite:  boolean;
}

export function TrainingsClient({ trainings, packages, canWrite }: TrainingsClientProps) {
  const router = useRouter();
  const [tab, setTab]   = useState<"catalog" | "packages">("catalog");
  const [search, setSearch]           = useState("");
  const [catFilter, setCat]           = useState("");
  const [fmtFilter, setFmt]           = useState("");
  const [statusFilter, setStatus]     = useState("aktif");
  const [showTrainingForm, setShowTF] = useState(false);
  const [editTraining, setEditT]      = useState<Training | null>(null);
  const [showPkgForm, setShowPF]      = useState(false);
  const [editPkg, setEditPkg]         = useState<Package | null>(null);

  const filtered = trainings.filter((t) => {
    const q = search.toLowerCase();
    const matchQ      = !q || t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
    const matchCat    = !catFilter    || t.category   === catFilter;
    const matchFmt    = !fmtFilter    || t.format     === fmtFilter;
    const matchStatus = !statusFilter || t.status     === statusFilter;
    return matchQ && matchCat && matchFmt && matchStatus;
  });

  async function deleteTraining(id: string) {
    if (!confirm("Bu eğitimi silmek istediğinizden emin misiniz?")) return;
    await createClient().from("trainings").delete().eq("id", id);
    router.refresh();
  }

  async function deletePackage(id: string) {
    if (!confirm("Bu paketi silmek istediğinizden emin misiniz?")) return;
    await createClient().from("package_trainings").delete().eq("package_id", id);
    await createClient().from("packages").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { key: "catalog",  label: "Eğitim Kataloğu", count: trainings.length },
          { key: "packages", label: "Paketler",         count: packages.length  },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── Catalog tab ── */}
      {tab === "catalog" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Eğitim ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={catFilter} onChange={(e) => setCat(e.target.value)} className="w-full sm:w-44">
              <option value="">Tüm kategoriler</option>
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
            <Select value={fmtFilter} onChange={(e) => setFmt(e.target.value)} className="w-full sm:w-36">
              <option value="">Tüm formatlar</option>
              {Object.entries(FORMAT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </Select>
            <Select value={statusFilter} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-36">
              <option value="">Tüm durumlar</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </Select>
            {canWrite && (
              <Button onClick={() => { setEditT(null); setShowTF(true); }} className="shrink-0">
                <Plus className="h-4 w-4 mr-1.5" /> Yeni Eğitim
              </Button>
            )}
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-gray-400">Eğitim bulunamadı.</div>
            ) : (
              filtered.map((t) => {
                const cat    = CATEGORY_CONFIG[t.category];
                const fmt    = FORMAT_CONFIG[t.format];
                const status = STATUS_CONFIG[t.status];
                return (
                  <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900 text-sm leading-snug">{t.title}</h3>
                      {canWrite && (
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setEditT(t); setShowTF(true); }} className="p-1 text-gray-400 hover:text-blue-600" title="Düzenle">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteTraining(t.id)} className="p-1 text-gray-400 hover:text-red-600" title="Sil">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {t.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">{t.description}</p>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat?.color}`}>{cat?.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{fmt?.icon} {fmt?.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status?.color}`}>{status?.label}</span>
                    </div>

                    {t.duration_hours && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-1 border-t border-gray-100">
                        <Clock className="h-3.5 w-3.5" />
                        {t.duration_hours} saat
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <p className="text-xs text-gray-400">{filtered.length} eğitim</p>
        </div>
      )}

      {/* ── Packages tab ── */}
      {tab === "packages" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canWrite && (
              <Button onClick={() => { setEditPkg(null); setShowPF(true); }}>
                <Plus className="h-4 w-4 mr-1.5" /> Yeni Paket
              </Button>
            )}
          </div>

          {packages.length === 0 ? (
            <div className="text-center py-12 text-gray-400">Henüz paket oluşturulmamış.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {packages.map((pkg) => (
                <div key={pkg.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-500 shrink-0" />
                      <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                    </div>
                    {canWrite && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => { setEditPkg(pkg); setShowPF(true); }} className="p-1 text-gray-400 hover:text-blue-600" title="Düzenle">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deletePackage(pkg.id)} className="p-1 text-gray-400 hover:text-red-600" title="Sil">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {pkg.description && (
                    <p className="text-sm text-gray-500">{pkg.description}</p>
                  )}

                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-1.5">{pkg.trainings.length} eğitim içeriyor:</p>
                    <ul className="space-y-1">
                      {pkg.trainings.map((t) => (
                        <li key={t.id} className="text-xs text-gray-600 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                          {t.title}
                        </li>
                      ))}
                      {pkg.trainings.length === 0 && (
                        <li className="text-xs text-gray-400 italic">Eğitim eklenmemiş</li>
                      )}
                    </ul>
                  </div>

                  <span className={`text-xs px-2 py-0.5 rounded-full inline-block ${pkg.status === "aktif" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {pkg.status === "aktif" ? "Aktif" : "Pasif"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showTrainingForm && (
        <TrainingForm training={editTraining ?? undefined} onClose={() => { setShowTF(false); setEditT(null); }} />
      )}
      {showPkgForm && (
        <PackageForm pkg={editPkg ?? undefined} trainings={trainings} onClose={() => { setShowPF(false); setEditPkg(null); }} />
      )}
    </div>
  );
}

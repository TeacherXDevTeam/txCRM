"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CATEGORY_CONFIG } from "@/components/trainings/training-config";
import type { Database } from "@/types/database";

type Package  = Database["public"]["Tables"]["packages"]["Row"];
type Training = Database["public"]["Tables"]["trainings"]["Row"];

interface PackageFormProps {
  pkg?: Package & { training_ids?: string[] };
  trainings: Training[];
  onClose: () => void;
}

export function PackageForm({ pkg, trainings, onClose }: PackageFormProps) {
  const router = useRouter();
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [selectedIds, setSelected]  = useState<Set<string>>(new Set(pkg?.training_ids ?? []));

  const [form, setForm] = useState({
    name:        pkg?.name        ?? "",
    description: pkg?.description ?? "",
    status:      (pkg?.status ?? "aktif") as "aktif" | "pasif",
  });

  function toggleTraining(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("Paket adı zorunludur."); return; }

    setLoading(true);
    const supabase = createClient();
    const payload  = {
      name:        form.name.trim(),
      description: form.description.trim() || null,
      status:      form.status as Package["status"],
    };

    let pkgId = pkg?.id;
    if (pkg) {
      const { error } = await supabase.from("packages").update(payload).eq("id", pkg.id);
      if (error) { setError(error.message); setLoading(false); return; }
    } else {
      const { data, error } = await supabase.from("packages").insert(payload).select("id").single();
      if (error) { setError(error.message); setLoading(false); return; }
      pkgId = (data as any).id;
    }

    // Sync package_trainings
    if (pkgId) {
      await supabase.from("package_trainings").delete().eq("package_id", pkgId);
      if (selectedIds.size > 0) {
        await supabase.from("package_trainings").insert(
          [...selectedIds].map((tid) => ({ package_id: pkgId!, training_id: tid }))
        );
      }
    }

    router.refresh();
    onClose();
  }

  const activeTrainings = trainings.filter((t) => t.status === "aktif");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">{pkg ? "Paketi Düzenle" : "Yeni Paket"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paket Adı <span className="text-red-500">*</span>
            </label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Temel Eğitim Paketi" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Paket içeriği..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
            <Select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as "aktif" | "pasif" }))}>
              <option value="aktif">Aktif</option>
              <option value="pasif">Pasif</option>
            </Select>
          </div>

          {/* Training picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Eğitimler ({selectedIds.size} seçili)
            </label>
            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
              {activeTrainings.map((t) => {
                const selected = selectedIds.has(t.id);
                const catColor = CATEGORY_CONFIG[t.category]?.color ?? "bg-gray-100 text-gray-600";
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTraining(t.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${selected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                  >
                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${selected ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}>
                      {selected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{t.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${catColor}`}>
                          {CATEGORY_CONFIG[t.category]?.label}
                        </span>
                        {t.duration_hours && <span className="text-xs text-gray-400">{t.duration_hours} saat</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : pkg ? "Güncelle" : "Kaydet"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

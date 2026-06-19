"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { Database } from "@/types/database";

type WG = Database["public"]["Tables"]["working_groups"]["Row"];

interface WGFormProps {
  wg?:     WG;
  onClose: () => void;
}

export function WGForm({ wg, onClose }: WGFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [form, setForm] = useState({
    name:          wg?.name          ?? "",
    description:   wg?.description   ?? "",
    status:        wg?.status        ?? "aktif",
    start_date:    wg?.start_date    ?? "",
    end_date:      wg?.end_date      ?? "",
    current_phase: wg?.current_phase ?? "",
  });

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("İsim zorunludur."); return; }
    setLoading(true);

    const payload = {
      name:          form.name.trim(),
      description:   form.description.trim() || null,
      status:        form.status as WG["status"],
      start_date:    form.start_date || null,
      end_date:      form.end_date   || null,
      current_phase: form.current_phase.trim() || null,
    };

    const supabase = createClient();
    const { error } = wg
      ? await supabase.from("working_groups").update(payload).eq("id", wg.id)
      : await supabase.from("working_groups").insert(payload);

    if (error) { setError(error.message); setLoading(false); return; }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{wg ? "Grubu Düzenle" : "Yeni Çalışma Grubu"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad <span className="text-red-500">*</span></label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Okul Liderliği Çalışma Grubu" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="aktif">Aktif</option>
                <option value="beklemede">Beklemede</option>
                <option value="tamamlandi">Tamamlandı</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mevcut Faz</label>
              <Input value={form.current_phase} onChange={(e) => set("current_phase", e.target.value)} placeholder="Faz 2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç</label>
              <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş</label>
              <Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={loading}>{loading ? "Kaydediliyor..." : wg ? "Güncelle" : "Kaydet"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

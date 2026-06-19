"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { Database } from "@/types/database";

type Trainer = Database["public"]["Tables"]["trainers"]["Row"];
type Contact = { id: string; full_name: string; email: string | null };

interface TrainerFormProps {
  trainer?:  Trainer & { contact?: Contact };
  contacts:  Contact[];
  onClose:   () => void;
}

const EXPERTISE_OPTIONS = [
  "Yapay Zeka",
  "Olumlu Okul İklimi",
  "Etkili Öğretmenlik",
  "Sınıf Yönetimi",
  "Dijital Dönüşüm",
  "Liderlik",
  "Ölçme & Değerlendirme",
  "Öğrenme Tasarımı",
];

export function TrainerForm({ trainer, contacts, onClose }: TrainerFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [customExpertise, setCustom] = useState("");

  const [form, setForm] = useState({
    contact_id:      trainer?.contact_id ?? "",
    status:          trainer?.status     ?? "aktif",
    bio:             trainer?.bio        ?? "",
    expertise_areas: trainer?.expertise_areas ?? [] as string[],
  });

  function toggleExpertise(area: string) {
    setForm((p) => ({
      ...p,
      expertise_areas: p.expertise_areas.includes(area)
        ? p.expertise_areas.filter((a) => a !== area)
        : [...p.expertise_areas, area],
    }));
  }

  function addCustom() {
    const v = customExpertise.trim();
    if (v && !form.expertise_areas.includes(v)) {
      setForm((p) => ({ ...p, expertise_areas: [...p.expertise_areas, v] }));
    }
    setCustom("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.contact_id) { setError("Kişi seçilmesi zorunludur."); return; }

    setLoading(true);
    const payload = {
      contact_id:      form.contact_id,
      status:          form.status as Trainer["status"],
      bio:             form.bio.trim() || null,
      expertise_areas: form.expertise_areas,
    };

    const supabase = createClient();
    const { error } = trainer
      ? await supabase.from("trainers").update(payload).eq("id", trainer.id)
      : await supabase.from("trainers").insert(payload);

    if (error) { setError(error.message); setLoading(false); return; }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">{trainer ? "Eğitmeni Düzenle" : "Yeni Eğitmen"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kişi <span className="text-red-500">*</span>
            </label>
            <Select value={form.contact_id} onChange={(e) => setForm((p) => ({ ...p, contact_id: e.target.value }))} disabled={!!trainer}>
              <option value="">Kişi seçin...</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.email ? ` — ${c.email}` : ""}</option>)}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
            <Select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as Trainer["status"] }))}>
              <option value="aktif">Aktif</option>
              <option value="pasif">Pasif</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Uzmanlık Alanları ({form.expertise_areas.length} seçili)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {EXPERTISE_OPTIONS.map((area) => {
                const sel = form.expertise_areas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleExpertise(area)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      sel ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {area}
                  </button>
                );
              })}
            </div>
            {/* Custom expertise */}
            <div className="flex gap-2">
              <Input value={customExpertise} onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                placeholder="Özel uzmanlık ekle..." className="flex-1 text-sm" />
              <Button type="button" variant="outline" onClick={addCustom} className="shrink-0"><Plus className="h-4 w-4" /></Button>
            </div>
            {/* Custom ones not in EXPERTISE_OPTIONS */}
            {form.expertise_areas.filter((a) => !EXPERTISE_OPTIONS.includes(a)).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.expertise_areas.filter((a) => !EXPERTISE_OPTIONS.includes(a)).map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                    {a}
                    <button type="button" onClick={() => toggleExpertise(a)} className="hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Biyografi</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              rows={3}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Eğitmen hakkında kısa bilgi..."
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : trainer ? "Güncelle" : "Kaydet"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

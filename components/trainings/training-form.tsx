"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CATEGORY_CONFIG, FORMAT_CONFIG, STATUS_CONFIG } from "@/components/trainings/training-config";
import type { Database } from "@/types/database";

type Training = Database["public"]["Tables"]["trainings"]["Row"];

interface TrainingFormProps {
  training?: Training;
  onClose: () => void;
}

export function TrainingForm({ training, onClose }: TrainingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [form, setForm] = useState({
    title:          training?.title          ?? "",
    description:    training?.description    ?? "",
    category:       training?.category       ?? "diger",
    format:         training?.format         ?? "yuz_yuze",
    duration_hours: training?.duration_hours?.toString() ?? "",
    status:         training?.status         ?? "aktif",
  });

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) { setError("Eğitim adı zorunludur."); return; }

    setLoading(true);
    const supabase = createClient();
    const payload = {
      title:          form.title.trim(),
      description:    form.description.trim() || null,
      category:       form.category as Training["category"],
      format:         form.format   as Training["format"],
      duration_hours: form.duration_hours ? parseInt(form.duration_hours) : null,
      status:         form.status   as Training["status"],
    };

    const { error } = training
      ? await supabase.from("trainings").update(payload).eq("id", training.id)
      : await supabase.from("trainings").insert(payload);

    if (error) { setError(error.message); setLoading(false); return; }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{training ? "Eğitimi Düzenle" : "Yeni Eğitim"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Eğitim Adı <span className="text-red-500">*</span>
            </label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Yapay Zeka ile Ders Tasarımı" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Eğitim içeriği hakkında kısa açıklama..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
                {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <Select value={form.format} onChange={(e) => set("format", e.target.value)}>
                {Object.entries(FORMAT_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Süre (saat)</label>
              <Input
                type="number"
                min="1"
                value={form.duration_hours}
                onChange={(e) => set("duration_hours", e.target.value)}
                placeholder="6"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : training ? "Güncelle" : "Kaydet"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

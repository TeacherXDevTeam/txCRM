"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { Database } from "@/types/database";

type School = Database["public"]["Tables"]["schools"]["Row"];

interface SchoolFormProps {
  school?: School;
  onClose: () => void;
}

export function SchoolForm({ school, onClose }: SchoolFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name:                  school?.name                  ?? "",
    city:                  school?.city                  ?? "İstanbul",
    district:              school?.district              ?? "",
    school_type:           school?.school_type           ?? "devlet",
    status:                school?.status                ?? "potansiyel",
    partnership_start_date: school?.partnership_start_date ?? "",
    notes:                 school?.notes                 ?? "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) { setError("Okul adı zorunludur."); return; }

    setLoading(true);
    const supabase = createClient();

    const payload = {
      name: form.name.trim(),
      city: form.city.trim() || "İstanbul",
      district: form.district.trim() || null,
      school_type: form.school_type as School["school_type"],
      status: form.status as School["status"],
      partnership_start_date: form.partnership_start_date || null,
      notes: form.notes.trim() || null,
    };

    if (school) {
      const { error } = await supabase.from("schools").update(payload).eq("id", school.id);
      if (error) { setError(error.message); setLoading(false); return; }
      router.refresh();
    } else {
      const { data, error } = await supabase.from("schools").insert(payload).select("id").single();
      if (error) { setError(error.message); setLoading(false); return; }
      router.push(`/okullar/${(data as any).id}`);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {school ? "Okulu Düzenle" : "Yeni Okul Ekle"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Okul Adı <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Kadıköy Anadolu Lisesi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şehir</label>
              <Input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="İstanbul"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İlçe</label>
              <Input
                value={form.district}
                onChange={(e) => set("district", e.target.value)}
                placeholder="Kadıköy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Okul Tipi</label>
              <Select value={form.school_type} onChange={(e) => set("school_type", e.target.value)}>
                <option value="devlet">Devlet</option>
                <option value="ozel">Özel</option>
                <option value="vakif">Vakıf</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="potansiyel">Potansiyel</option>
                <option value="aktif">Aktif</option>
                <option value="pasif">Pasif</option>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ortaklık Başlangıç Tarihi</label>
              <Input
                type="date"
                value={form.partnership_start_date}
                onChange={(e) => set("partnership_start_date", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Ek notlar..."
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : school ? "Güncelle" : "Kaydet"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

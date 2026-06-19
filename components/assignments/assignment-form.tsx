"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { Database } from "@/types/database";

type Assignment = Database["public"]["Tables"]["assignments"]["Row"];
type School     = { id: string; name: string };
type Training   = { id: string; title: string };
type Trainer    = { id: string; contact: { full_name: string } | null };
type Member     = { id: string; full_name: string };

interface AssignmentFormProps {
  assignment?: Assignment;
  schools:   School[];
  trainings: Training[];
  trainers:  Trainer[];
  members:   Member[];
  onClose:   () => void;
}

export function AssignmentForm({ assignment, schools, trainings, trainers, members, onClose }: AssignmentFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [form, setForm] = useState({
    school_id:     assignment?.school_id     ?? "",
    training_id:   assignment?.training_id   ?? "",
    trainer_id:    assignment?.trainer_id    ?? "",
    assigned_to:   assignment?.assigned_to   ?? "",
    status:        assignment?.status        ?? "planlanmis",
    scheduled_date: assignment?.scheduled_date ?? "",
    completed_date: assignment?.completed_date ?? "",
    period:        assignment?.period        ?? "",
    notes:         assignment?.notes         ?? "",
    completion_notes: assignment?.completion_notes ?? "",
  });

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.school_id)   { setError("Okul seçilmesi zorunludur.");    return; }
    if (!form.training_id) { setError("Eğitim seçilmesi zorunludur.");  return; }
    if (!form.assigned_to) { setError("Sorumlu kişi seçilmesi zorunludur."); return; }

    setLoading(true);
    const supabase = createClient();
    const payload = {
      school_id:        form.school_id,
      training_id:      form.training_id,
      trainer_id:       form.trainer_id   || null,
      assigned_to:      form.assigned_to,
      status:           form.status as Assignment["status"],
      scheduled_date:   form.scheduled_date || null,
      completed_date:   form.completed_date || null,
      period:           form.period.trim() || null,
      notes:            form.notes.trim() || null,
      completion_notes: form.completion_notes.trim() || null,
    };

    const { error } = assignment
      ? await supabase.from("assignments").update(payload).eq("id", assignment.id)
      : await supabase.from("assignments").insert(payload);

    if (error) { setError(error.message); setLoading(false); return; }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">{assignment ? "Atamayı Düzenle" : "Yeni Atama"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Okul <span className="text-red-500">*</span>
              </label>
              <Select value={form.school_id} onChange={(e) => set("school_id", e.target.value)}>
                <option value="">Okul seçin...</option>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Eğitim <span className="text-red-500">*</span>
              </label>
              <Select value={form.training_id} onChange={(e) => set("training_id", e.target.value)}>
                <option value="">Eğitim seçin...</option>
                {trainings.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </Select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Eğitmen</label>
              <Select value={form.trainer_id} onChange={(e) => set("trainer_id", e.target.value)}>
                <option value="">Eğitmen yok</option>
                {trainers.map((tr) => (
                  <option key={tr.id} value={tr.id}>{tr.contact?.full_name ?? "—"}</option>
                ))}
              </Select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sorumlu <span className="text-red-500">*</span>
              </label>
              <Select value={form.assigned_to} onChange={(e) => set("assigned_to", e.target.value)}>
                <option value="">Kişi seçin...</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="planlanmis">Planlanmış</option>
                <option value="devam_ediyor">Devam Ediyor</option>
                <option value="tamamlandi">Tamamlandı</option>
                <option value="iptal">İptal</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Periyot</label>
              <Input value={form.period} onChange={(e) => set("period", e.target.value)} placeholder="2026-Q3" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Planlanan Tarih</label>
              <Input type="date" value={form.scheduled_date} onChange={(e) => set("scheduled_date", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tamamlanma Tarihi</label>
              <Input type="date" value={form.completed_date} onChange={(e) => set("completed_date", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Atama hakkında notlar..."
            />
          </div>

          {(form.status === "tamamlandi") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tamamlanma Notu</label>
              <textarea
                value={form.completion_notes}
                onChange={(e) => set("completion_notes", e.target.value)}
                rows={2}
                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Tamamlanma sonuçları..."
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : assignment ? "Güncelle" : "Kaydet"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

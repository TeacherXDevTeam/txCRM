"use client";

import { useEffect, useState, useCallback } from "react";
import { X, Check, Loader2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  createPfClient,
  STATUS_LABEL,
  type PfRecord,
  type PfActivity,
} from "./pf-supabase";

// Wizard DEĞİL: yan panel + onBlur auto-save (progressive profiling).
// Az alanla oluştur → panel kapanmaz, detay moduna geçer → kalanı doldur,
// her input çıkışında arka planda kaydedilir.
interface Props {
  recordId: string | null; // null => yeni kayıt modu
  onClose: () => void;
  onChanged: () => void; // dışarıdaki listeyi tazele
}

type SaveState = "idle" | "saving" | "saved";

export function EntityDrawer({ recordId, onClose, onChanged }: Props) {
  const [record, setRecord] = useState<PfRecord | null>(null);
  const [activities, setActivities] = useState<PfActivity[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [save, setSave] = useState<SaveState>("idle");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecord = useCallback(async (id: string) => {
    const sb = createPfClient();
    const [{ data: rec }, { data: acts }] = await Promise.all([
      sb.from("pf_records").select("*").eq("id", id).single(),
      sb
        .from("pf_activities")
        .select("*")
        .eq("entity_type", "pf_record")
        .eq("entity_id", id)
        .order("created_at", { ascending: false }),
    ]);
    setRecord((rec as PfRecord) ?? null);
    setActivities((acts ?? []) as PfActivity[]);
  }, []);

  useEffect(() => {
    if (recordId) loadRecord(recordId);
    else setRecord(null);
  }, [recordId, loadRecord]);

  // Adım 1: minimal oluştur
  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    setError(null);
    const sb = createPfClient();
    const { data, error: err } = await sb
      .from("pf_records")
      .insert({ title: newTitle.trim() })
      .select("*")
      .single();
    setCreating(false);
    if (err || !data) {
      setError(err?.message ?? "Kayıt oluşturulamadı (bilinmeyen hata).");
      return;
    }
    setNewTitle("");
    setRecord(data as PfRecord); // panel kapanmaz, detay moduna geçer
    loadRecord((data as PfRecord).id);
    onChanged();
  }

  // Adım 2+: alan bazlı auto-save (onBlur)
  async function patch(field: keyof PfRecord, value: unknown) {
    if (!record) return;
    if (record[field] === value) return; // değişmemişse kaydetme
    setSave("saving");
    const sb = createPfClient();
    const { error } = await sb
      .from("pf_records")
      .update({ [field]: value })
      .eq("id", record.id);
    if (!error) {
      setRecord({ ...record, [field]: value } as PfRecord);
      setSave("saved");
      onChanged();
      // status değişince trigger activity/notification üretir → timeline tazele
      if (field === "status") loadRecord(record.id);
      setTimeout(() => setSave("idle"), 1200);
    } else {
      setSave("idle");
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold">
            {record ? "Kayıt Detayı" : "Yeni Kayıt"}
          </h2>
          <div className="flex items-center gap-3">
            {save === "saving" && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Kaydediliyor
              </span>
            )}
            {save === "saved" && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <Check className="h-3 w-3" /> Kaydedildi
              </span>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {!record ? (
            // Adım 1 — minimal
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Sadece başlık gir, oluştur. Detayları sonra aynı panelde
                doldurabilirsin.
              </p>
              <Input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Örn: Kadıköy Anadolu Lisesi — eğitim talebi"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? "Oluşturuluyor..." : "Oluştur"}
              </Button>
              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>
          ) : (
            // Adım 2+ — auto-save'li detay
            <>
              <Field label="Başlık">
                <Input
                  defaultValue={record.title}
                  onBlur={(e) => patch("title", e.target.value.trim())}
                />
              </Field>
              <Field label="Sorumlu">
                <Input
                  defaultValue={record.owner ?? ""}
                  placeholder="Örn: satış / Ahmet"
                  onBlur={(e) => patch("owner", e.target.value.trim() || null)}
                />
              </Field>
              <Field label="Tahmini Tutar (₺)">
                <Input
                  type="number"
                  defaultValue={record.amount ?? ""}
                  onBlur={(e) =>
                    patch("amount", e.target.value ? Number(e.target.value) : null)
                  }
                />
              </Field>
              <Field label="Durum">
                <Select
                  value={record.status}
                  onChange={(e) => patch("status", e.target.value)}
                >
                  {(["yeni", "teklif_bekleniyor", "hazir"] as const).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-[11px] text-gray-400">
                  &quot;Teklif Bekleniyor&quot;a çekince finans rolüne bildirim
                  gider (DB trigger).
                </p>
              </Field>
              <Field label="Notlar">
                <textarea
                  defaultValue={record.notes ?? ""}
                  rows={3}
                  onBlur={(e) => patch("notes", e.target.value.trim() || null)}
                  className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </Field>

              {/* Polymorphic olay günlüğü = bu kaydın zaman çizelgesi */}
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                  <Clock className="h-4 w-4" /> Geçmiş
                </h3>
                <div className="space-y-2">
                  {activities.length === 0 && (
                    <p className="text-xs text-gray-400">Henüz kayıt yok</p>
                  )}
                  {activities.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-md border-l-2 border-blue-300 bg-gray-50 px-3 py-1.5 text-xs"
                    >
                      <p className="text-gray-800">{a.summary}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(a.created_at).toLocaleString("tr-TR")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ALL_STAGES, SOURCE_LABEL } from "@/components/leads/lead-stage-config";
import type { Database } from "@/types/database";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

interface ContactOption { id: string; full_name: string; organization: string | null }
interface MemberOption  { id: string; full_name: string }

interface LeadFormProps {
  lead?: Lead;
  defaultStage?: string;
  onClose: () => void;
}

export function LeadForm({ lead, defaultStage = "yeni_baglanti", onClose }: LeadFormProps) {
  const router = useRouter();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [members, setMembers]   = useState<MemberOption[]>([]);

  // Kişi: mevcut listeden seç ("select") veya hızlı yeni kişi ekle ("new")
  const [contactMode, setContactMode] = useState<"select" | "new">("select");
  const [newContact, setNewContact] = useState({
    full_name: "", organization: "", phone: "", contact_type: "potansiyel",
  });
  function setNew(field: string, value: string) {
    setNewContact((prev) => ({ ...prev, [field]: value }));
  }

  const [form, setForm] = useState({
    contact_id:      lead?.contact_id      ?? "",
    stage:           lead?.stage           ?? defaultStage,
    assigned_to:     lead?.assigned_to     ?? "",
    source:          lead?.source          ?? "diger",
    estimated_value: lead?.estimated_value?.toString() ?? "",
    next_action_date: lead?.next_action_date ?? "",
    notes:           lead?.notes           ?? "",
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.from("contacts").select("id, full_name, organization").order("full_name").then(({ data }) => {
      setContacts((data as unknown as ContactOption[]) ?? []);
    });
    supabase.from("team_members").select("id, full_name").eq("is_active", true).order("full_name").then(({ data }) => {
      setMembers((data as unknown as MemberOption[]) ?? []);
    });
  }, []);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (contactMode === "new") {
      if (!newContact.full_name.trim()) { setError("Kişi adı zorunludur."); return; }
    } else if (!form.contact_id) {
      setError("Kişi seçimi zorunludur."); return;
    }

    setLoading(true);
    const supabase = createClient();

    // Hızlı yeni kişi: önce contacts'a ekle, sonra o id ile lead oluştur
    let contactId = form.contact_id;
    if (contactMode === "new") {
      const { data: c, error: cErr } = await supabase
        .from("contacts")
        .insert({
          full_name:    newContact.full_name.trim(),
          organization: newContact.organization.trim() || null,
          phone:        newContact.phone.trim() || null,
          contact_type: newContact.contact_type as never,
        })
        .select("id")
        .single();
      if (cErr || !c) { setError(cErr?.message ?? "Kişi oluşturulamadı."); setLoading(false); return; }
      contactId = (c as { id: string }).id;
    }

    const payload = {
      contact_id:       contactId,
      stage:            form.stage as Lead["stage"],
      assigned_to:      form.assigned_to || null,
      source:           form.source as Lead["source"],
      estimated_value:  form.estimated_value ? parseFloat(form.estimated_value) : null,
      next_action_date: form.next_action_date || null,
      notes:            form.notes.trim() || null,
    };

    if (lead) {
      const { error } = await supabase.from("leads").update(payload).eq("id", lead.id);
      if (error) { setError(error.message); setLoading(false); return; }
    } else {
      const { error } = await supabase.from("leads").insert(payload);
      if (error) { setError(error.message); setLoading(false); return; }
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">{lead ? "Lead Düzenle" : "Yeni Lead"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Kişi <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => { setContactMode((m) => (m === "select" ? "new" : "select")); setError(null); }}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                {contactMode === "select" ? "+ Yeni kişi ekle" : "← Listeden seç"}
              </button>
            </div>

            {contactMode === "select" ? (
              <Select value={form.contact_id} onChange={(e) => set("contact_id", e.target.value)}>
                <option value="">Kişi seçin...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}{c.organization ? ` — ${c.organization}` : ""}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3">
                <Input
                  autoFocus
                  value={newContact.full_name}
                  onChange={(e) => setNew("full_name", e.target.value)}
                  placeholder="Ad Soyad *"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newContact.organization}
                    onChange={(e) => setNew("organization", e.target.value)}
                    placeholder="Kurum"
                  />
                  <Input
                    value={newContact.phone}
                    onChange={(e) => setNew("phone", e.target.value)}
                    placeholder="Telefon"
                  />
                </div>
                <Select value={newContact.contact_type} onChange={(e) => setNew("contact_type", e.target.value)}>
                  <option value="potansiyel">Potansiyel</option>
                  <option value="okul_koordinatoru">Okul Koordinatörü</option>
                  <option value="partner">Partner</option>
                  <option value="egitmen">Eğitmen</option>
                  <option value="diger">Diğer</option>
                </Select>
                <p className="text-[11px] text-gray-500">
                  Bu kişi Kişiler listesine de eklenecek.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aşama</label>
              <Select value={form.stage} onChange={(e) => set("stage", e.target.value)}>
                {ALL_STAGES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kaynak</label>
              <Select value={form.source} onChange={(e) => set("source", e.target.value)}>
                {Object.entries(SOURCE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tahmini Değer (₺)</label>
              <Input
                type="number"
                value={form.estimated_value}
                onChange={(e) => set("estimated_value", e.target.value)}
                placeholder="45000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sonraki Aksiyon</label>
              <Input
                type="date"
                value={form.next_action_date}
                onChange={(e) => set("next_action_date", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Atanan Kişi</label>
            <Select value={form.assigned_to} onChange={(e) => set("assigned_to", e.target.value)}>
              <option value="">Atanmadı</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Görüşme notları..."
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : lead ? "Güncelle" : "Kaydet"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

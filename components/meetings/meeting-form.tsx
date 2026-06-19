"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Tag, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { TiptapEditor } from "@/components/meetings/tiptap-editor";
import type { Database } from "@/types/database";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"];
type Contact = { id: string; full_name: string; organization: string | null };
type Member  = { id: string; full_name: string };

interface MeetingFormProps {
  meeting?:    Meeting & { attendee_ids?: string[] };
  contacts:    Contact[];
  members:     Member[];
  currentUserId: string;
  onClose:     () => void;
}

export function MeetingForm({ meeting, contacts, members, currentUserId, onClose }: MeetingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [form, setForm] = useState({
    title:        meeting?.title        ?? "",
    meeting_date: meeting?.meeting_date ?? new Date().toISOString().split("T")[0],
    meeting_type: meeting?.meeting_type ?? "ekip",
    notes:        meeting?.notes        ?? "",
    tags:         meeting?.tags         ?? [] as string[],
  });

  const [tagInput, setTagInput] = useState("");
  const [attendeeIds, setAttendees] = useState<Set<string>>(
    new Set(meeting?.attendee_ids ?? [])
  );

  // Okul ziyareti: okul + koordinatör bağlama (polymorphic related_entity)
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [coordinators, setCoordinators] = useState<
    { school_id: string; contact_id: string; full_name: string }[]
  >([]);
  const [schoolId, setSchoolId] = useState<string>(
    meeting?.related_entity_type === "school" ? meeting?.related_entity_id ?? "" : ""
  );
  const [coordinatorId, setCoordinatorId] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("schools").select("id, name").order("name").then(({ data }) => {
      setSchools((data as unknown as { id: string; name: string }[]) ?? []);
    });
    supabase
      .from("coordinators")
      .select("school_id, contact_id, contact:contacts(full_name)")
      .then(({ data }) => {
        setCoordinators(
          ((data as unknown as { school_id: string; contact_id: string; contact: { full_name: string } | null }[]) ?? [])
            .map((c) => ({ school_id: c.school_id, contact_id: c.contact_id, full_name: c.contact?.full_name ?? "—" }))
        );
      });
  }, []);

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) {
      setForm((p) => ({ ...p, tags: [...p.tags, t] }));
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    setForm((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }));
  }

  function toggleAttendee(id: string) {
    setAttendees((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim())  { setError("Başlık zorunludur."); return; }
    if (!form.meeting_date)  { setError("Tarih zorunludur.");  return; }

    const isVisit = form.meeting_type === "okul_ziyareti";
    if (isVisit && !schoolId) { setError("Okul ziyareti için okul seçin."); return; }

    setLoading(true);
    const supabase = createClient();
    const base = {
      title:        form.title.trim(),
      meeting_date: form.meeting_date,
      meeting_type: form.meeting_type as Meeting["meeting_type"],
      notes:        form.notes || null,
      tags:         form.tags,
      related_entity_type: isVisit && schoolId ? "school" : null,
      related_entity_id:   isVisit && schoolId ? schoolId : null,
    };

    let meetingId = meeting?.id;
    if (meeting) {
      const { error } = await supabase.from("meetings").update(base).eq("id", meeting.id);
      if (error) { setError(error.message); setLoading(false); return; }
    } else {
      const { data, error } = await supabase.from("meetings").insert({ ...base, created_by: currentUserId }).select("id").single();
      if (error) { setError(error.message); setLoading(false); return; }
      meetingId = (data as any).id;
    }

    if (meetingId) {
      // koordinatör seçildiyse katılımcılara da ekle
      const finalAttendees = new Set(attendeeIds);
      if (isVisit && coordinatorId) finalAttendees.add(coordinatorId);

      await supabase.from("meeting_contacts").delete().eq("meeting_id", meetingId);
      if (finalAttendees.size > 0) {
        await supabase.from("meeting_contacts").insert(
          [...finalAttendees].map((cid) => ({ meeting_id: meetingId!, contact_id: cid }))
        );
      }
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold">{meeting ? "Toplantıyı Düzenle" : "Yeni Toplantı"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Başlık <span className="text-red-500">*</span>
            </label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Mayıs Ekip Toplantısı" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarih <span className="text-red-500">*</span>
              </label>
              <Input type="date" value={form.meeting_date} onChange={(e) => set("meeting_date", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tür</label>
              <Select value={form.meeting_type} onChange={(e) => set("meeting_type", e.target.value)}>
                <option value="ekip">Ekip Toplantısı</option>
                <option value="core_group">Core Group</option>
                <option value="okul_ziyareti">Okul Ziyareti</option>
                <option value="wg_oturumu">WG Oturumu</option>
                <option value="diger">Diğer</option>
              </Select>
            </div>
          </div>

          {/* Okul ziyareti → okul + koordinatör bağlama */}
          {form.meeting_type === "okul_ziyareti" && (
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-blue-200 bg-blue-50/40 p-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Okul <span className="text-red-500">*</span>
                </label>
                <Select
                  value={schoolId}
                  onChange={(e) => { setSchoolId(e.target.value); setCoordinatorId(""); }}
                >
                  <option value="">Okul seçin...</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Koordinatör</label>
                <Select
                  value={coordinatorId}
                  onChange={(e) => setCoordinatorId(e.target.value)}
                  disabled={!schoolId}
                >
                  <option value="">{schoolId ? "Koordinatör seçin..." : "Önce okul seçin"}</option>
                  {coordinators
                    .filter((c) => c.school_id === schoolId)
                    .map((c) => (
                      <option key={c.contact_id} value={c.contact_id}>{c.full_name}</option>
                    ))}
                </Select>
              </div>
              <p className="col-span-2 text-[11px] text-gray-500">
                Bu toplantı seçilen okula bağlanır ve &quot;Çalıştığımız Okullar&quot; sayfasında okulun altında listelenir.
              </p>
            </div>
          )}

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Katılımcılar ({attendeeIds.size} seçili)
            </label>
            <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
              {contacts.map((c) => {
                const sel = attendeeIds.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleAttendee(c.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${sel ? "bg-blue-50" : "hover:bg-gray-50"}`}
                  >
                    <div className={`h-4 w-4 rounded border-2 shrink-0 ${sel ? "bg-blue-600 border-blue-600" : "border-gray-300"}`} />
                    <span className="text-sm text-gray-800">{c.full_name}</span>
                    {c.organization && <span className="text-xs text-gray-400">{c.organization}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes (Tiptap) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
            <TiptapEditor content={form.notes} onChange={(html) => setForm((p) => ({ ...p, notes: html }))} />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Etiketler</label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="etiket ekle..."
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addTag} className="shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                    <Tag className="h-3 w-3" />
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 text-gray-400 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : meeting ? "Güncelle" : "Kaydet"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

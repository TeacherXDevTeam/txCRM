"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Users, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PHASE_STATUS_CONFIG, MEMBER_ROLE_CONFIG, FORMAT_CONFIG } from "@/components/working-groups/wg-config";
import type { Database } from "@/types/database";

type Phase   = Database["public"]["Tables"]["wg_phases"]["Row"];
type Member  = Database["public"]["Tables"]["wg_members"]["Row"] & { contact: { full_name: string; organization: string | null } | null };
type Session = Database["public"]["Tables"]["wg_sessions"]["Row"];
type Contact = { id: string; full_name: string; organization: string | null };

interface WGDetailClientProps {
  wgId:     string;
  phases:   Phase[];
  members:  Member[];
  sessions: Session[];
  contacts: Contact[];
  canWrite: boolean;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

export function WGDetailClient({ wgId, phases, members, sessions, contacts, canWrite }: WGDetailClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"phases" | "members" | "sessions">("phases");

  // Phase form
  const [addingPhase, setAddingPhase] = useState(false);
  const [phaseForm, setPhaseForm] = useState({ name: "", phase_number: String(phases.length + 1), start_date: "", end_date: "" });

  // Member form
  const [addingMember, setAddingMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ contact_id: "", role: "katilimci" });

  // Session form
  const [addingSession, setAddingSession] = useState(false);
  const [sessionForm, setSessionForm] = useState({ title: "", session_date: "", format: "yuz_yuze", notes: "" });
  const [expandedSession, setExpandedSession] = useState<Set<string>>(new Set());

  async function addPhase() {
    if (!phaseForm.name.trim()) return;
    await createClient().from("wg_phases").insert({
      working_group_id: wgId,
      name:             phaseForm.name.trim(),
      phase_number:     parseInt(phaseForm.phase_number) || phases.length + 1,
      start_date:       phaseForm.start_date || null,
      end_date:         phaseForm.end_date   || null,
      status:           "planlandi",
    });
    setPhaseForm({ name: "", phase_number: String(phases.length + 2), start_date: "", end_date: "" });
    setAddingPhase(false);
    router.refresh();
  }

  async function updatePhaseStatus(id: string, status: Phase["status"]) {
    await createClient().from("wg_phases").update({ status }).eq("id", id);
    router.refresh();
  }

  async function deletePhase(id: string) {
    await createClient().from("wg_phases").delete().eq("id", id);
    router.refresh();
  }

  async function addMember() {
    if (!memberForm.contact_id) return;
    await createClient().from("wg_members").insert({
      working_group_id: wgId,
      contact_id:       memberForm.contact_id,
      role:             memberForm.role as "kolaylastirici" | "katilimci" | "gozlemci",
    });
    setMemberForm({ contact_id: "", role: "katilimci" });
    setAddingMember(false);
    router.refresh();
  }

  async function removeMember(id: string) {
    await createClient().from("wg_members").delete().eq("id", id);
    router.refresh();
  }

  async function addSession() {
    if (!sessionForm.title.trim() || !sessionForm.session_date) return;
    await createClient().from("wg_sessions").insert({
      working_group_id: wgId,
      title:            sessionForm.title.trim(),
      session_date:     sessionForm.session_date,
      format:           sessionForm.format as "yuz_yuze" | "cevrimici" | "hibrit",
      notes:            sessionForm.notes.trim() || null,
      attendee_ids:     [],
    });
    setSessionForm({ title: "", session_date: "", format: "yuz_yuze", notes: "" });
    setAddingSession(false);
    router.refresh();
  }

  async function deleteSession(id: string) {
    await createClient().from("wg_sessions").delete().eq("id", id);
    router.refresh();
  }

  const existingContactIds = new Set(members.map((m) => m.contact_id));
  const availableContacts = contacts.filter((c) => !existingContactIds.has(c.id));

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {([
          { key: "phases",   label: "Fazlar",   count: phases.length   },
          { key: "members",  label: "Üyeler",   count: members.length  },
          { key: "sessions", label: "Oturumlar", count: sessions.length },
        ] as const).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t.label}
            <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── Phases ── */}
      {tab === "phases" && (
        <div className="space-y-3">
          {phases.length === 0 && <p className="text-sm text-gray-400 italic">Henüz faz eklenmemiş.</p>}
          {phases.sort((a, b) => a.phase_number - b.phase_number).map((p) => {
            const cfg = PHASE_STATUS_CONFIG[p.status];
            return (
              <div key={p.id} className="flex items-start gap-3 bg-white border border-gray-200 rounded-lg p-4">
                <div className={`mt-1 h-3 w-3 rounded-full shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-mono">#{p.phase_number}</span>
                    <span className="font-medium text-gray-900 text-sm">{p.name}</span>
                  </div>
                  {p.description && <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span>{fmtDate(p.start_date)} – {fmtDate(p.end_date)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canWrite ? (
                    <select value={p.status} onChange={(e) => updatePhaseStatus(p.id, e.target.value as Phase["status"])}
                      className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${cfg.color}`}>
                      <option value="planlandi">Planlandı</option>
                      <option value="devam_ediyor">Devam Ediyor</option>
                      <option value="tamamlandi">Tamamlandı</option>
                    </select>
                  ) : (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                  )}
                  {canWrite && (
                    <button onClick={() => deletePhase(p.id)} className="text-gray-300 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {canWrite && (
            addingPhase ? (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Faz No</label>
                    <Input type="number" value={phaseForm.phase_number} onChange={(e) => setPhaseForm((p) => ({ ...p, phase_number: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Ad</label>
                    <Input value={phaseForm.name} onChange={(e) => setPhaseForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Faz adı..." className="h-8 text-sm" autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPhase(); } if (e.key === "Escape") setAddingPhase(false); }} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Başlangıç</label>
                    <Input type="date" value={phaseForm.start_date} onChange={(e) => setPhaseForm((p) => ({ ...p, start_date: e.target.value }))} className="h-8 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Bitiş</label>
                    <Input type="date" value={phaseForm.end_date} onChange={(e) => setPhaseForm((p) => ({ ...p, end_date: e.target.value }))} className="h-8 text-sm" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setAddingPhase(false)} className="h-7 text-xs px-2">İptal</Button>
                  <Button type="button" onClick={addPhase} className="h-7 text-xs px-2">Ekle</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingPhase(true)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600">
                <Plus className="h-3.5 w-3.5" /> Faz ekle
              </button>
            )
          )}
        </div>
      )}

      {/* ── Members ── */}
      {tab === "members" && (
        <div className="space-y-3">
          {members.length === 0 && <p className="text-sm text-gray-400 italic">Henüz üye eklenmemiş.</p>}
          <div className="space-y-2">
            {members.map((m) => {
              const roleCfg = MEMBER_ROLE_CONFIG[m.role];
              return (
                <div key={m.id} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-blue-600">
                      {m.contact?.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{m.contact?.full_name ?? "—"}</p>
                    {m.contact?.organization && <p className="text-xs text-gray-400">{m.contact.organization}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleCfg.color}`}>{roleCfg.label}</span>
                  {canWrite && (
                    <button onClick={() => removeMember(m.id)} className="text-gray-300 hover:text-red-500 ml-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {canWrite && (
            addingMember ? (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs text-gray-500 mb-1">Kişi</label>
                    <Select value={memberForm.contact_id} onChange={(e) => setMemberForm((p) => ({ ...p, contact_id: e.target.value }))}>
                      <option value="">Seçin...</option>
                      {availableContacts.map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.organization ? ` · ${c.organization}` : ""}</option>)}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Rol</label>
                    <Select value={memberForm.role} onChange={(e) => setMemberForm((p) => ({ ...p, role: e.target.value }))}>
                      <option value="kolaylastirici">Kolaylaştırıcı</option>
                      <option value="katilimci">Katılımcı</option>
                      <option value="gozlemci">Gözlemci</option>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setAddingMember(false)} className="h-7 text-xs px-2">İptal</Button>
                  <Button type="button" onClick={addMember} disabled={!memberForm.contact_id} className="h-7 text-xs px-2">Ekle</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingMember(true)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600">
                <Users className="h-3.5 w-3.5" /> Üye ekle
              </button>
            )
          )}
        </div>
      )}

      {/* ── Sessions ── */}
      {tab === "sessions" && (
        <div className="space-y-3">
          {sessions.length === 0 && <p className="text-sm text-gray-400 italic">Henüz oturum eklenmemiş.</p>}
          {[...sessions].sort((a, b) => b.session_date.localeCompare(a.session_date)).map((s) => {
            const fmt = FORMAT_CONFIG[s.format];
            const isOpen = expandedSession.has(s.id);
            return (
              <div key={s.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">{s.title}</span>
                      <span className="text-xs text-gray-400">{fmt.icon} {fmt.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />{fmtDate(s.session_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canWrite && (
                      <button onClick={() => deleteSession(s.id)} className="p-1 text-gray-300 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {s.notes && (
                      <button onClick={() => setExpandedSession((prev) => { const next = new Set(prev); next.has(s.id) ? next.delete(s.id) : next.add(s.id); return next; })}
                        className="p-1 text-gray-400 hover:text-gray-700">
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
                {isOpen && s.notes && (
                  <div className="px-4 pb-3 pt-0 border-t border-gray-100">
                    <p className="text-sm text-gray-600 whitespace-pre-line">{s.notes}</p>
                  </div>
                )}
              </div>
            );
          })}

          {canWrite && (
            addingSession ? (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Başlık</label>
                    <Input value={sessionForm.title} onChange={(e) => setSessionForm((p) => ({ ...p, title: e.target.value }))} placeholder="1. Oturum" className="text-sm" autoFocus />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tarih</label>
                    <Input type="date" value={sessionForm.session_date} onChange={(e) => setSessionForm((p) => ({ ...p, session_date: e.target.value }))} className="text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Format</label>
                    <Select value={sessionForm.format} onChange={(e) => setSessionForm((p) => ({ ...p, format: e.target.value }))}>
                      <option value="yuz_yuze">🏫 Yüz Yüze</option>
                      <option value="cevrimici">💻 Çevrimiçi</option>
                      <option value="hibrit">🔀 Hibrit</option>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Notlar</label>
                    <textarea value={sessionForm.notes} onChange={(e) => setSessionForm((p) => ({ ...p, notes: e.target.value }))} rows={2}
                      className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setAddingSession(false)} className="h-7 text-xs px-2">İptal</Button>
                  <Button type="button" onClick={addSession} disabled={!sessionForm.title.trim() || !sessionForm.session_date} className="h-7 text-xs px-2">Ekle</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingSession(true)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600">
                <Calendar className="h-3.5 w-3.5" /> Oturum ekle
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

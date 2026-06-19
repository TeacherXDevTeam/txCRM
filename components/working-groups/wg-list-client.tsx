"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Trash2, Users, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { WGForm } from "@/components/working-groups/wg-form";
import { WGDetailClient } from "@/components/working-groups/wg-detail-client";
import { WG_STATUS_CONFIG, PHASE_STATUS_CONFIG } from "@/components/working-groups/wg-config";
import type { Database } from "@/types/database";

type WG = Database["public"]["Tables"]["working_groups"]["Row"] & {
  member_count: number;
  session_count: number;
  phases:   Database["public"]["Tables"]["wg_phases"]["Row"][];
  members:  (Database["public"]["Tables"]["wg_members"]["Row"] & { contact: { full_name: string; organization: string | null } | null })[];
  sessions: Database["public"]["Tables"]["wg_sessions"]["Row"][];
};
type Contact = { id: string; full_name: string; organization: string | null };

interface WGListClientProps {
  wgs:      WG[];
  contacts: Contact[];
  canWrite: boolean;
}

function fmtDate(d: string | null) {
  if (!d) return null;
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

export function WGListClient({ wgs, contacts, canWrite }: WGListClientProps) {
  const router = useRouter();
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<WG | null>(null);
  const [selected, setSelected] = useState<WG | null>(null);

  const filtered = wgs.filter((g) => {
    const q = search.toLowerCase();
    const matchQ = !q || g.name.toLowerCase().includes(q) || g.description?.toLowerCase().includes(q);
    const matchS = !statusFilter || g.status === statusFilter;
    return matchQ && matchS;
  });

  async function deleteWG(id: string) {
    if (!confirm("Bu çalışma grubunu silmek istediğinizden emin misiniz?")) return;
    const supabase = createClient();
    await supabase.from("wg_sessions").delete().eq("working_group_id", id);
    await supabase.from("wg_phases").delete().eq("working_group_id", id);
    await supabase.from("wg_members").delete().eq("working_group_id", id);
    await supabase.from("working_groups").delete().eq("id", id);
    if (selected?.id === id) setSelected(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {(["aktif", "beklemede", "tamamlandi"] as const).map((s) => (
          <button key={s} onClick={() => setStatus(statusFilter === s ? "" : s)}
            className={`bg-white border rounded-xl p-4 text-left hover:shadow-sm transition-all ${statusFilter === s ? "ring-2 ring-blue-500" : ""}`}>
            <p className="text-2xl font-bold text-gray-900">{wgs.filter((g) => g.status === s).length}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${WG_STATUS_CONFIG[s].color}`}>{WG_STATUS_CONFIG[s].label}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Grup ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-36">
          <option value="">Tüm durumlar</option>
          <option value="aktif">Aktif</option>
          <option value="beklemede">Beklemede</option>
          <option value="tamamlandi">Tamamlandı</option>
        </Select>
        {canWrite && (
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="shrink-0">
            <Plus className="h-4 w-4 mr-1.5" /> Yeni Grup
          </Button>
        )}
      </div>

      {/* Split layout */}
      <div className={`${selected ? "grid grid-cols-1 lg:grid-cols-5 gap-4" : ""}`}>
        {/* List */}
        <div className={`space-y-2 ${selected ? "lg:col-span-2" : ""}`}>
          {filtered.length === 0 && <p className="text-center py-12 text-gray-400">Çalışma grubu bulunamadı.</p>}
          {filtered.map((g) => {
            const cfg = WG_STATUS_CONFIG[g.status];
            const activeFaz = g.phases.find((p) => p.status === "devam_ediyor");
            const isSelected = selected?.id === g.id;
            return (
              <div key={g.id}
                onClick={() => setSelected(isSelected ? null : g)}
                className={`bg-white border rounded-xl p-4 cursor-pointer hover:shadow-sm transition-all ${isSelected ? "ring-2 ring-blue-500 border-blue-300" : "border-gray-200"}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{g.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    {g.description && <p className="text-xs text-gray-500 line-clamp-1">{g.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{g.member_count} üye</span>
                      {activeFaz && (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PHASE_STATUS_CONFIG.devam_ediyor.color}`}>
                          {activeFaz.name}
                        </span>
                      )}
                      {g.start_date && <span>{fmtDate(g.start_date)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canWrite && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); setEditing(g); setShowForm(true); }} className="p-1 text-gray-400 hover:text-blue-600">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteWG(g.id); }} className="p-1 text-gray-400 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-5">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-gray-900">{selected.name}</h3>
              {selected.current_phase && <p className="text-xs text-gray-500 mt-0.5">Mevcut faz: {selected.current_phase}</p>}
            </div>
            <WGDetailClient
              wgId={selected.id}
              phases={selected.phases}
              members={selected.members}
              sessions={selected.sessions}
              contacts={contacts}
              canWrite={canWrite}
            />
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">{filtered.length} grup</p>

      {showForm && (
        <WGForm wg={editing ?? undefined} onClose={() => { setShowForm(false); setEditing(null); }} />
      )}
    </div>
  );
}

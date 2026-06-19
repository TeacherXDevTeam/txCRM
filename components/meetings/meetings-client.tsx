"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Trash2, Tag, Users, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MeetingForm } from "@/components/meetings/meeting-form";
import { TodoPanel } from "@/components/meetings/todo-panel";
import { MEETING_TYPE_CONFIG } from "@/components/meetings/meeting-config";
import type { Database } from "@/types/database";

type Meeting = Database["public"]["Tables"]["meetings"]["Row"] & {
  attendees:   { id: string; full_name: string; organization: string | null }[];
  attendee_ids: string[];
  todos:       (Database["public"]["Tables"]["todo_items"]["Row"] & { assignee: { full_name: string } | null })[];
};
type Contact = { id: string; full_name: string; organization: string | null };
type Member  = { id: string; full_name: string };

interface MeetingsClientProps {
  meetings:      Meeting[];
  contacts:      Contact[];
  members:       Member[];
  currentUserId: string;
  canWrite:      boolean;
}

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

export function MeetingsClient({ meetings, contacts, members, currentUserId, canWrite }: MeetingsClientProps) {
  const router = useRouter();
  const [search, setSearch]       = useState("");
  const [typeFilter, setType]     = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<Meeting | null>(null);
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());

  // Collect all unique tags
  const allTags = [...new Set(meetings.flatMap((m) => m.tags))].sort();

  const filtered = meetings.filter((m) => {
    const q = search.toLowerCase();
    const matchQ    = !q || m.title.toLowerCase().includes(q) || m.notes?.toLowerCase().includes(q) || m.tags.some((t) => t.includes(q));
    const matchType = !typeFilter || m.meeting_type === typeFilter;
    const matchTag  = !tagFilter  || m.tags.includes(tagFilter);
    return matchQ && matchType && matchTag;
  });

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function deleteMeeting(id: string) {
    if (!confirm("Bu toplantıyı silmek istediğinizden emin misiniz?")) return;
    const supabase = createClient();
    await supabase.from("todo_items").delete().eq("meeting_id", id);
    await supabase.from("meeting_contacts").delete().eq("meeting_id", id);
    await supabase.from("meetings").delete().eq("id", id);
    router.refresh();
  }

  const openTodos = meetings.reduce((sum, m) => sum + m.todos.filter((t) => t.status === "acik").length, 0);

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">{meetings.length}</p>
          <p className="text-xs text-gray-500 mt-1">Toplam toplantı</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">{openTodos}</p>
          <p className="text-xs text-gray-500 mt-1">Açık todo</p>
        </div>
        <div className="bg-white border rounded-xl p-4 hidden sm:block">
          <p className="text-2xl font-bold text-gray-900">{allTags.length}</p>
          <p className="text-xs text-gray-500 mt-1">Farklı etiket</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Başlık, not veya etiket ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={typeFilter} onChange={(e) => setType(e.target.value)} className="w-full sm:w-44">
          <option value="">Tüm türler</option>
          {Object.entries(MEETING_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="w-full sm:w-36">
          <option value="">Tüm etiketler</option>
          {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        {canWrite && (
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="shrink-0">
            <Plus className="h-4 w-4 mr-1.5" /> Yeni Toplantı
          </Button>
        )}
      </div>

      {/* Meeting cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Toplantı bulunamadı.</div>
        ) : (
          filtered.map((m) => {
            const cfg = MEETING_TYPE_CONFIG[m.meeting_type];
            const open = m.todos.filter((t) => t.status === "acik").length;
            const isExpanded = expanded.has(m.id);

            return (
              <div key={m.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-sm transition-shadow">
                {/* Header */}
                <div className="flex items-start gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-xs text-gray-400">{fmtDate(m.meeting_date)}</span>
                      {open > 0 && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                          {open} açık todo
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mt-1 text-sm">{m.title}</h3>
                    {m.attendees.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400">
                        <Users className="h-3.5 w-3.5" />
                        {m.attendees.map((a) => a.full_name).join(", ")}
                      </div>
                    )}
                    {m.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {m.tags.map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                            <Tag className="h-2.5 w-2.5" />{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canWrite && (
                      <>
                        <button onClick={() => { setEditing(m); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteMeeting(m.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    <button onClick={() => toggleExpand(m.id)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded: notes + todos */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
                    {m.notes ? (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Notlar</p>
                        <div
                          className="prose prose-sm max-w-none text-gray-700"
                          dangerouslySetInnerHTML={{ __html: m.notes }}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Not eklenmemiş.</p>
                    )}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Todo'lar</p>
                      <TodoPanel
                        meetingId={m.id}
                        todos={m.todos}
                        members={members}
                        canWrite={canWrite}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-gray-400">{filtered.length} toplantı</p>

      {showForm && (
        <MeetingForm
          meeting={editing ?? undefined}
          contacts={contacts}
          members={members}
          currentUserId={currentUserId}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

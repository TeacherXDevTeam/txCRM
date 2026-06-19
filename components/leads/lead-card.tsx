"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Calendar, TrendingUp, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LeadForm } from "@/components/leads/lead-form";
import { STAGE_LABEL, SOURCE_LABEL } from "@/components/leads/lead-stage-config";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface LeadCardData {
  id: string;
  stage: string;
  source: string;
  estimated_value: number | null;
  next_action_date: string | null;
  notes: string | null;
  contact: { id: string; full_name: string; organization: string | null };
  assignee: { full_name: string } | null;
}

interface LeadCardProps {
  lead: LeadCardData;
  canWrite: boolean;
  stages: Array<{ key: string; label: string }>;
}

export function LeadCard({ lead, canWrite, stages }: LeadCardProps) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [moving, setMoving]     = useState(false);

  const isOverdue = lead.next_action_date && new Date(lead.next_action_date) < new Date();

  async function handleDelete() {
    if (!confirm("Bu lead'i silmek istediğinizden emin misiniz?")) return;
    const supabase = createClient();
    await supabase.from("leads").delete().eq("id", lead.id);
    router.refresh();
  }

  async function handleStageChange(newStage: string) {
    if (newStage === lead.stage) return;
    setMoving(true);
    const supabase = createClient();
    await supabase.from("leads").update({ stage: newStage as any }).eq("id", lead.id);
    router.refresh();
    setMoving(false);
  }

  return (
    <>
      <div className={`bg-white rounded-lg border border-gray-200 p-3 shadow-sm space-y-2 ${moving ? "opacity-50" : ""}`}>
        {/* Contact */}
        <div>
          <p className="font-medium text-sm text-gray-900 leading-tight">{lead.contact.full_name}</p>
          {lead.contact.organization && (
            <p className="text-xs text-gray-400 truncate">{lead.contact.organization}</p>
          )}
        </div>

        {/* Meta */}
        <div className="space-y-1">
          {lead.estimated_value && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <TrendingUp className="h-3 w-3 text-green-500" />
              {formatCurrency(lead.estimated_value)}
            </div>
          )}
          {lead.next_action_date && (
            <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? "text-red-600 font-medium" : "text-gray-500"}`}>
              <Calendar className="h-3 w-3" />
              {formatDate(lead.next_action_date)}
              {isOverdue && " ⚠️"}
            </div>
          )}
          {lead.assignee && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <User className="h-3 w-3" />
              {lead.assignee.full_name}
            </div>
          )}
        </div>

        {/* Source */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            {SOURCE_LABEL[lead.source] ?? lead.source}
          </span>
          {canWrite && (
            <div className="flex items-center gap-1">
              <button onClick={() => setShowEdit(true)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Düzenle">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={handleDelete} className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Sil">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Stage mover */}
        {canWrite && (
          <select
            value={lead.stage}
            onChange={(e) => handleStageChange(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded px-2 py-1 text-gray-500 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {stages.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        )}
      </div>

      {showEdit && (
        <LeadForm lead={lead as any} onClose={() => setShowEdit(false)} />
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Shield, Eye, User, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Database } from "@/types/database";

type Member = Database["public"]["Tables"]["team_members"]["Row"];

interface TeamClientProps {
  members:   Member[];
  currentId: string;
  isAdmin:   boolean;
}

const ROLE_CONFIG = {
  admin:  { label: "Admin",  color: "bg-purple-100 text-purple-700", Icon: Shield },
  member: { label: "Üye",   color: "bg-blue-100 text-blue-700",     Icon: User   },
  viewer: { label: "İzleyici", color: "bg-gray-100 text-gray-500",  Icon: Eye    },
} as const;

const DEPT_CONFIG: Record<string, { label: string; color: string }> = {
  satis:     { label: "Satış",     color: "bg-green-100 text-green-700"   },
  operasyon: { label: "Operasyon", color: "bg-orange-100 text-orange-700" },
  icerik:    { label: "İçerik",    color: "bg-pink-100 text-pink-700"     },
  egitim:    { label: "Eğitim",    color: "bg-blue-100 text-blue-700"     },
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
}

export function TeamClient({ members, currentId, isAdmin }: TeamClientProps) {
  const router = useRouter();
  const [search, setSearch]       = useState("");
  const [roleFilter, setRole]     = useState("");
  const [deptFilter, setDept]     = useState("");
  const [statusFilter, setStatus] = useState("aktif");
  const [updating, setUpdating]   = useState<string | null>(null);

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    const matchQ    = !q || m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    const matchRole = !roleFilter || m.role === roleFilter;
    const matchDept = !deptFilter || m.department === deptFilter;
    const matchStatus = statusFilter === "all" || (statusFilter === "aktif" ? m.is_active : !m.is_active);
    return matchQ && matchRole && matchDept && matchStatus;
  });

  async function updateRole(id: string, role: Member["role"]) {
    setUpdating(id);
    await createClient().from("team_members").update({ role }).eq("id", id);
    setUpdating(null);
    router.refresh();
  }

  async function toggleActive(id: string, current: boolean) {
    setUpdating(id);
    await createClient().from("team_members").update({ is_active: !current }).eq("id", id);
    setUpdating(null);
    router.refresh();
  }

  const activeCount = members.filter((m) => m.is_active).length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
          <p className="text-xs text-gray-500 mt-1">Aktif üye</p>
        </div>
        {(["admin", "member", "viewer"] as const).map((r) => (
          <div key={r} className="bg-white border rounded-xl p-4">
            <p className="text-2xl font-bold text-gray-900">{members.filter((m) => m.role === r).length}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${ROLE_CONFIG[r].color}`}>{ROLE_CONFIG[r].label}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="İsim veya e-posta ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onChange={(e) => setRole(e.target.value)} className="w-full sm:w-32">
          <option value="">Tüm roller</option>
          <option value="admin">Admin</option>
          <option value="member">Üye</option>
          <option value="viewer">İzleyici</option>
        </Select>
        <Select value={deptFilter} onChange={(e) => setDept(e.target.value)} className="w-full sm:w-36">
          <option value="">Tüm departmanlar</option>
          <option value="satis">Satış</option>
          <option value="operasyon">Operasyon</option>
          <option value="icerik">İçerik</option>
          <option value="egitim">Eğitim</option>
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-32">
          <option value="aktif">Aktif</option>
          <option value="pasif">Pasif</option>
          <option value="all">Tümü</option>
        </Select>
      </div>

      {/* Member cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 && <p className="col-span-3 text-center py-12 text-gray-400">Üye bulunamadı.</p>}
        {filtered.map((m) => {
          const roleCfg = ROLE_CONFIG[m.role];
          const RoleIcon = roleCfg.Icon;
          const dept = m.department ? DEPT_CONFIG[m.department] : null;
          const isSelf = m.id === currentId;

          return (
            <div key={m.id} className={`bg-white border rounded-xl p-5 space-y-4 ${!m.is_active ? "opacity-60" : ""}`}>
              {/* Avatar + name */}
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-white">{initials(m.full_name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-gray-900 text-sm truncate">{m.full_name}</p>
                    {isSelf && <span className="text-xs text-blue-500 shrink-0">(sen)</span>}
                  </div>
                  <a href={`mailto:${m.email}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 mt-0.5 truncate">
                    <Mail className="h-3 w-3 shrink-0" />{m.email}
                  </a>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${roleCfg.color}`}>
                  <RoleIcon className="h-3 w-3" />{roleCfg.label}
                </span>
                {dept && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dept.color}`}>{dept.label}</span>}
                {!m.is_active && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Pasif</span>}
              </div>

              {/* Last login */}
              <p className="text-xs text-gray-400">Son giriş: {fmtDate(m.last_login)}</p>

              {/* Admin controls */}
              {isAdmin && !isSelf && (
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 w-12">Rol</label>
                    <Select value={m.role} onChange={(e) => updateRole(m.id, e.target.value as Member["role"])}
                      className="flex-1 h-7 text-xs" disabled={updating === m.id}>
                      <option value="admin">Admin</option>
                      <option value="member">Üye</option>
                      <option value="viewer">İzleyici</option>
                    </Select>
                  </div>
                  <button onClick={() => toggleActive(m.id, m.is_active)} disabled={updating === m.id}
                    className={`text-xs w-full py-1 rounded-md border transition-colors ${
                      m.is_active
                        ? "border-red-200 text-red-600 hover:bg-red-50"
                        : "border-green-200 text-green-600 hover:bg-green-50"
                    }`}>
                    {updating === m.id ? "..." : m.is_active ? "Pasife al" : "Aktife al"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">{filtered.length} üye gösteriliyor</p>
    </div>
  );
}

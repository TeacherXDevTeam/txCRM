"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SchoolStatusBadge } from "@/components/schools/school-status-badge";
import { SchoolForm } from "@/components/schools/school-form";
import { formatDate } from "@/lib/utils";
import type { Database } from "@/types/database";

type School = Database["public"]["Tables"]["schools"]["Row"];

const TYPE_LABELS: Record<string, string> = {
  devlet: "Devlet",
  ozel:   "Özel",
  vakif:  "Vakıf",
};

export function SchoolsClient({ schools, canWrite }: { schools: School[]; canWrite: boolean }) {
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("");
  const [typeFilter, setType]       = useState("");
  const [showForm, setShowForm]     = useState(false);

  const filtered = schools.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.district?.toLowerCase().includes(q) || s.city.toLowerCase().includes(q);
    const matchStatus = !statusFilter || s.status === statusFilter;
    const matchType   = !typeFilter   || s.school_type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const counts = {
    aktif:      schools.filter((s) => s.status === "aktif").length,
    potansiyel: schools.filter((s) => s.status === "potansiyel").length,
    pasif:      schools.filter((s) => s.status === "pasif").length,
  };

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Aktif",      count: counts.aktif,      color: "bg-green-50 text-green-700 border-green-200",  filter: "aktif"      },
          { label: "Potansiyel", count: counts.potansiyel, color: "bg-yellow-50 text-yellow-700 border-yellow-200", filter: "potansiyel" },
          { label: "Pasif",      count: counts.pasif,      color: "bg-gray-50 text-gray-500 border-gray-200",     filter: "pasif"      },
        ].map((item) => (
          <button
            key={item.filter}
            onClick={() => setStatus(statusFilter === item.filter ? "" : item.filter)}
            className={`rounded-lg border px-4 py-3 text-left transition-all ${item.color} ${statusFilter === item.filter ? "ring-2 ring-offset-1 ring-blue-400" : "hover:opacity-80"}`}
          >
            <div className="text-2xl font-bold">{item.count}</div>
            <div className="text-sm">{item.label}</div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Okul adı veya ilçe ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-40">
          <option value="">Tüm durumlar</option>
          <option value="aktif">Aktif</option>
          <option value="potansiyel">Potansiyel</option>
          <option value="pasif">Pasif</option>
        </Select>
        <Select value={typeFilter} onChange={(e) => setType(e.target.value)} className="w-full sm:w-36">
          <option value="">Tüm tipler</option>
          <option value="devlet">Devlet</option>
          <option value="ozel">Özel</option>
          <option value="vakif">Vakıf</option>
        </Select>
        {canWrite && (
          <Button onClick={() => setShowForm(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-1.5" />
            Yeni Okul
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Okul</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Konum</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Tip</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Ortaklık</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    <Building2 className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    {search || statusFilter || typeFilter ? "Sonuç bulunamadı." : "Henüz okul eklenmemiş."}
                  </td>
                </tr>
              ) : (
                filtered.map((school) => (
                  <tr key={school.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/okullar/${school.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {school.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {[school.district, school.city].filter(Boolean).join(", ")}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {TYPE_LABELS[school.school_type] ?? school.school_type}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                      {school.partnership_start_date ? formatDate(school.partnership_start_date) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <SchoolStatusBadge status={school.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t bg-gray-50 text-xs text-gray-500">
            {filtered.length} okul{schools.length !== filtered.length && ` (toplam ${schools.length})`}
          </div>
        )}
      </div>

      {showForm && <SchoolForm onClose={() => setShowForm(false)} />}
    </div>
  );
}

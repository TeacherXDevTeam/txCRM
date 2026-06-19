"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Trash2, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ContractForm } from "@/components/contracts/contract-form";
import { STATUS_CONFIG, PAYMENT_CONFIG } from "@/components/contracts/contract-config";
import type { Database } from "@/types/database";

type Contract = Database["public"]["Tables"]["contracts"]["Row"] & {
  school:   { id: string; name: string } | null;
  package:  { id: string; name: string } | null;
  orders:   (Database["public"]["Tables"]["orders"]["Row"] & {
    training: { title: string } | null;
  })[];
};
type School   = { id: string; name: string };
type Package  = { id: string; name: string };
type Training = { id: string; title: string };

interface ContractsClientProps {
  contracts:     Contract[];
  schools:       School[];
  packages:      Package[];
  trainings:     Training[];
  currentUserId: string;
  canWrite:      boolean;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

function fmtTL(n: number) {
  return "₺" + n.toLocaleString("tr-TR", { minimumFractionDigits: 0 });
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function orderTotal(o: Contract["orders"][number]) {
  return o.unit_price * o.quantity * (1 - o.discount_rate / 100);
}

export function ContractsClient({ contracts, schools, packages, trainings, currentUserId, canWrite }: ContractsClientProps) {
  const router = useRouter();
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("");
  const [paymentFilter, setPayment] = useState("");
  const [schoolFilter, setSchool]   = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<Contract | null>(null);
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());

  const today = new Date().toISOString().split("T")[0];
  const expiringSoon = contracts.filter(
    (c) => c.status === "aktif" && c.end_date && daysUntil(c.end_date) <= 30 && daysUntil(c.end_date) > 0
  );

  const filtered = contracts.filter((c) => {
    const q = search.toLowerCase();
    const matchQ       = !q || c.school?.name.toLowerCase().includes(q) || c.package?.name.toLowerCase().includes(q) || c.notes?.toLowerCase().includes(q);
    const matchStatus  = !statusFilter  || c.status         === statusFilter;
    const matchPayment = !paymentFilter || c.payment_status === paymentFilter;
    const matchSchool  = !schoolFilter  || c.school_id      === schoolFilter;
    return matchQ && matchStatus && matchPayment && matchSchool;
  });

  // Metric totals
  const totalValue  = contracts.filter((c) => c.status === "aktif").reduce((s, c) => s + c.contract_value, 0);
  const pendingPay  = contracts.filter((c) => c.payment_status === "odeme_bekleniyor").length;

  function toggleExpand(id: string) {
    setExpanded((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  async function deleteContract(id: string) {
    if (!confirm("Bu sözleşmeyi silmek istediğinizden emin misiniz?")) return;
    const supabase = createClient();
    await supabase.from("orders").delete().eq("contract_id", id);
    await supabase.from("contracts").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-2xl font-bold text-gray-900">{contracts.filter((c) => c.status === "aktif").length}</p>
          <p className="text-xs text-gray-500 mt-1">Aktif sözleşme</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-lg font-bold text-gray-900">{fmtTL(totalValue)}</p>
          <p className="text-xs text-gray-500 mt-1">Toplam aktif değer</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-2xl font-bold text-orange-600">{pendingPay}</p>
          <p className="text-xs text-gray-500 mt-1">Ödeme bekleyen</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-2xl font-bold text-yellow-600">{expiringSoon.length}</p>
          <p className="text-xs text-gray-500 mt-1">30 günde sona erecek</p>
        </div>
      </div>

      {/* Expiring alert */}
      {expiringSoon.length > 0 && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-yellow-800">
            <span className="font-semibold">{expiringSoon.length} sözleşme</span> 30 gün içinde sona eriyor:{" "}
            {expiringSoon.map((c) => `${c.school?.name} (${fmtDate(c.end_date)})`).join(", ")}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Okul, paket veya not ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={schoolFilter} onChange={(e) => setSchool(e.target.value)} className="w-full sm:w-52">
          <option value="">Tüm okullar</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatus(e.target.value)} className="w-full sm:w-40">
          <option value="">Tüm durumlar</option>
          <option value="aktif">Aktif</option>
          <option value="suresi_doldu">Süresi Doldu</option>
          <option value="iptal">İptal</option>
        </Select>
        <Select value={paymentFilter} onChange={(e) => setPayment(e.target.value)} className="w-full sm:w-44">
          <option value="">Tüm ödemeler</option>
          <option value="odeme_bekleniyor">Ödeme Bekleniyor</option>
          <option value="kismi">Kısmi</option>
          <option value="tamamlandi">Tamamlandı</option>
        </Select>
        {canWrite && (
          <Button onClick={() => { setEditing(null); setShowForm(true); }} className="shrink-0">
            <Plus className="h-4 w-4 mr-1.5" /> Yeni Sözleşme
          </Button>
        )}
      </div>

      {/* Contract cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Sözleşme bulunamadı.</div>
        ) : filtered.map((c) => {
          const remaining = daysUntil(c.end_date);
          const expiring  = c.status === "aktif" && remaining <= 30 && remaining > 0;
          const isExpanded = expanded.has(c.id);

          return (
            <div key={c.id} className={`bg-white border rounded-xl overflow-hidden hover:shadow-sm transition-shadow ${expiring ? "border-yellow-300" : "border-gray-200"}`}>
              {/* Header row */}
              <div className="flex items-start gap-4 p-4">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900">{c.school?.name ?? "—"}</span>
                    {c.package && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{c.package.name}</span>}
                    {c.auto_renew && (
                      <span className="text-xs flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        <RefreshCw className="h-3 w-3" /> Oto-yenile
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>{fmtDate(c.start_date)} – {fmtDate(c.end_date)}</span>
                    {expiring && <span className="text-yellow-600 font-medium">{remaining} gün kaldı</span>}
                    <span className="font-semibold text-gray-900">{fmtTL(c.contract_value)}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[c.status].color}`}>{STATUS_CONFIG[c.status].label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYMENT_CONFIG[c.payment_status].color}`}>{PAYMENT_CONFIG[c.payment_status].label}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canWrite && (
                    <>
                      <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteContract(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  <button onClick={() => toggleExpand(c.id)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded">
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded: orders + notes */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                  {c.orders.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Sipariş Kalemleri</p>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400">
                            <th className="text-left pb-1">Eğitim</th>
                            <th className="text-right pb-1">Birim</th>
                            <th className="text-right pb-1">Adet</th>
                            <th className="text-right pb-1">İndirim</th>
                            <th className="text-right pb-1">Toplam</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {c.orders.map((o) => (
                            <tr key={o.id}>
                              <td className="py-1 text-gray-700">{o.training?.title ?? "—"}</td>
                              <td className="py-1 text-right text-gray-600">{fmtTL(o.unit_price)}</td>
                              <td className="py-1 text-right text-gray-600">{o.quantity}</td>
                              <td className="py-1 text-right text-gray-600">{o.discount_rate > 0 ? `%${o.discount_rate}` : "—"}</td>
                              <td className="py-1 text-right font-medium text-gray-900">{fmtTL(orderTotal(o))}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-200">
                            <td colSpan={4} className="pt-1.5 text-right text-gray-500 font-medium">Genel Toplam</td>
                            <td className="pt-1.5 text-right font-bold text-gray-900">
                              {fmtTL(c.orders.reduce((s, o) => s + orderTotal(o), 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                  {c.notes && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notlar</p>
                      <p className="text-sm text-gray-600">{c.notes}</p>
                    </div>
                  )}
                  {!c.orders.length && !c.notes && (
                    <p className="text-sm text-gray-400 italic">Ek detay yok.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">{filtered.length} sözleşme</p>

      {showForm && (
        <ContractForm
          contract={editing ?? undefined}
          schools={schools}
          packages={packages}
          trainings={trainings}
          currentUserId={currentUserId}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

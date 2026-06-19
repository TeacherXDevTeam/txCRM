"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { Database } from "@/types/database";

type Contract = Database["public"]["Tables"]["contracts"]["Row"];
type Order    = Database["public"]["Tables"]["orders"]["Row"];
type School   = { id: string; name: string };
type Package  = { id: string; name: string };
type Training = { id: string; title: string };

interface ContractFormProps {
  contract?:     Contract & { orders?: Order[] };
  schools:       School[];
  packages:      Package[];
  trainings:     Training[];
  currentUserId: string;
  onClose:       () => void;
}

interface OrderRow {
  training_id:   string;
  unit_price:    string;
  quantity:      string;
  discount_rate: string;
}

function emptyOrder(): OrderRow {
  return { training_id: "", unit_price: "", quantity: "1", discount_rate: "0" };
}

export function ContractForm({ contract, schools, packages, trainings, currentUserId, onClose }: ContractFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [form, setForm] = useState({
    school_id:       contract?.school_id        ?? "",
    package_id:      contract?.package_id       ?? "",
    start_date:      contract?.start_date       ?? "",
    end_date:        contract?.end_date         ?? "",
    auto_renew:      contract?.auto_renew       ?? false,
    contract_value:  contract?.contract_value?.toString() ?? "",
    payment_status:  contract?.payment_status   ?? "odeme_bekleniyor",
    status:          contract?.status           ?? "aktif",
    notes:           contract?.notes            ?? "",
  });

  const [orders, setOrders] = useState<OrderRow[]>(
    contract?.orders?.map((o) => ({
      training_id:   o.training_id,
      unit_price:    o.unit_price.toString(),
      quantity:      o.quantity.toString(),
      discount_rate: o.discount_rate.toString(),
    })) ?? []
  );

  function set(field: string, value: string | boolean) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  function setOrder(idx: number, field: keyof OrderRow, value: string) {
    setOrders((prev) => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
  }

  function addOrder()        { setOrders((p) => [...p, emptyOrder()]); }
  function removeOrder(idx: number) { setOrders((p) => p.filter((_, i) => i !== idx)); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.school_id)      { setError("Okul seçilmesi zorunludur."); return; }
    if (!form.start_date)     { setError("Başlangıç tarihi zorunludur."); return; }
    if (!form.end_date)       { setError("Bitiş tarihi zorunludur."); return; }
    if (!form.contract_value) { setError("Sözleşme tutarı zorunludur."); return; }

    setLoading(true);
    const supabase = createClient();

    const payload = {
      school_id:      form.school_id,
      package_id:     form.package_id || null,
      start_date:     form.start_date,
      end_date:       form.end_date,
      auto_renew:     form.auto_renew,
      contract_value: parseFloat(form.contract_value),
      payment_status: form.payment_status as Contract["payment_status"],
      status:         form.status as Contract["status"],
      notes:          form.notes.trim() || null,
      created_by:     currentUserId,
    };

    let contractId = contract?.id;
    if (contract) {
      const { error } = await supabase.from("contracts").update(payload).eq("id", contract.id);
      if (error) { setError(error.message); setLoading(false); return; }
    } else {
      const { data, error } = await supabase.from("contracts").insert(payload).select("id").single();
      if (error) { setError(error.message); setLoading(false); return; }
      contractId = (data as any).id;
    }

    // Sync orders
    if (contractId) {
      await supabase.from("orders").delete().eq("contract_id", contractId);
      const validOrders = orders.filter((o) => o.training_id && o.unit_price);
      if (validOrders.length > 0) {
        await supabase.from("orders").insert(
          validOrders.map((o) => ({
            contract_id:   contractId!,
            training_id:   o.training_id,
            unit_price:    parseFloat(o.unit_price),
            quantity:      parseInt(o.quantity) || 1,
            discount_rate: parseFloat(o.discount_rate) || 0,
          }))
        );
      }
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold">{contract ? "Sözleşmeyi Düzenle" : "Yeni Sözleşme"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Okul & Paket */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Okul <span className="text-red-500">*</span></label>
              <Select value={form.school_id} onChange={(e) => set("school_id", e.target.value)}>
                <option value="">Okul seçin...</option>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Paket (opsiyonel)</label>
              <Select value={form.package_id} onChange={(e) => set("package_id", e.target.value)}>
                <option value="">Paket yok</option>
                {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
          </div>

          {/* Tarihler */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç <span className="text-red-500">*</span></label>
              <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş <span className="text-red-500">*</span></label>
              <Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
            </div>
          </div>

          {/* Değer & Durum */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tutar (₺) <span className="text-red-500">*</span></label>
              <Input type="number" min="0" step="0.01" value={form.contract_value} onChange={(e) => set("contract_value", e.target.value)} placeholder="50000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="aktif">Aktif</option>
                <option value="suresi_doldu">Süresi Doldu</option>
                <option value="iptal">İptal</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Durumu</label>
              <Select value={form.payment_status} onChange={(e) => set("payment_status", e.target.value)}>
                <option value="odeme_bekleniyor">Ödeme Bekleniyor</option>
                <option value="kismi">Kısmi Ödendi</option>
                <option value="tamamlandi">Tamamlandı</option>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="auto_renew" checked={form.auto_renew} onChange={(e) => set("auto_renew", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <label htmlFor="auto_renew" className="text-sm text-gray-700">Otomatik yenile</label>
            </div>
          </div>

          {/* Orders */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Sipariş Kalemleri</label>
              <button type="button" onClick={addOrder} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <Plus className="h-3 w-3" /> Kalem ekle
              </button>
            </div>
            {orders.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Sipariş kalemi yok.</p>
            ) : (
              <div className="space-y-2">
                {orders.map((o, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-5">
                      <Select value={o.training_id} onChange={(e) => setOrder(idx, "training_id", e.target.value)}>
                        <option value="">Eğitim seçin...</option>
                        {trainings.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                      </Select>
                    </div>
                    <div className="col-span-3">
                      <Input type="number" min="0" step="0.01" value={o.unit_price} onChange={(e) => setOrder(idx, "unit_price", e.target.value)} placeholder="₺ fiyat" />
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min="1" value={o.quantity} onChange={(e) => setOrder(idx, "quantity", e.target.value)} placeholder="Adet" />
                    </div>
                    <div className="col-span-1">
                      <Input type="number" min="0" max="100" value={o.discount_rate} onChange={(e) => setOrder(idx, "discount_rate", e.target.value)} placeholder="%" title="İndirim %" />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button type="button" onClick={() => removeOrder(idx)} className="text-gray-300 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-gray-400">Sütunlar: Eğitim — Birim Fiyat — Adet — İndirim%</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Sözleşme notları..." />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : contract ? "Güncelle" : "Kaydet"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

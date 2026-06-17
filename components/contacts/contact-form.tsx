"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { Database } from "@/types/database";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];

interface ContactFormProps {
  contact?: Contact;
  onClose: () => void;
}

export function ContactForm({ contact, onClose }: ContactFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name:    contact?.full_name    ?? "",
    email:        contact?.email        ?? "",
    phone:        contact?.phone        ?? "",
    title:        contact?.title        ?? "",
    organization: contact?.organization ?? "",
    contact_type: contact?.contact_type ?? "diger",
    notes:        contact?.notes        ?? "",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.full_name.trim()) { setError("Ad Soyad zorunludur."); return; }

    setLoading(true);
    const supabase = createClient();

    const payload = {
      ...form,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      title: form.title.trim() || null,
      organization: form.organization.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (contact) {
      const { error } = await supabase.from("contacts").update(payload).eq("id", contact.id);
      if (error) {
        setError(error.message.includes("unique") ? "Bu e-posta zaten kayıtlı." : error.message);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.from("contacts").insert(payload);
      if (error) {
        setError(error.message.includes("unique") ? "Bu e-posta zaten kayıtlı." : error.message);
        setLoading(false);
        return;
      }
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {contact ? "Kişiyi Düzenle" : "Yeni Kişi Ekle"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ad Soyad <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                placeholder="Ayşe Kaya"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="ayse@okul.edu.tr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <Input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="0532 111 2233"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unvan</label>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Okul Koordinatörü"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kurum</label>
              <Input
                value={form.organization}
                onChange={(e) => set("organization", e.target.value)}
                placeholder="Kadıköy Anadolu Lisesi"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Kişi Tipi</label>
              <Select
                value={form.contact_type}
                onChange={(e) => set("contact_type", e.target.value)}
              >
                <option value="okul_koordinatoru">Okul Koordinatörü</option>
                <option value="egitmen">Eğitmen</option>
                <option value="partner">Partner</option>
                <option value="potansiyel">Potansiyel</option>
                <option value="diger">Diğer</option>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Ek notlar..."
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Kaydediliyor..." : contact ? "Güncelle" : "Kaydet"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

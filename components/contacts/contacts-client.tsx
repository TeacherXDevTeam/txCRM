"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Pencil, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ContactTypeBadge } from "@/components/contacts/contact-type-badge";
import { ContactForm } from "@/components/contacts/contact-form";
import { DeleteContactButton } from "@/components/contacts/delete-contact-button";
import type { Database } from "@/types/database";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];

interface ContactsClientProps {
  contacts: Contact[];
  canWrite: boolean;
}

const TYPE_OPTIONS = [
  { value: "", label: "Tüm tipler" },
  { value: "okul_koordinatoru", label: "Okul Koordinatörü" },
  { value: "egitmen", label: "Eğitmen" },
  { value: "partner", label: "Partner" },
  { value: "potansiyel", label: "Potansiyel" },
  { value: "diger", label: "Diğer" },
];

export function ContactsClient({ contacts, canWrite }: ContactsClientProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c.full_name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.organization?.toLowerCase().includes(q);
    const matchType = !typeFilter || c.contact_type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="İsim, e-posta veya kurum ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="w-full sm:w-48"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
        {canWrite && (
          <Button onClick={() => { setEditContact(null); setShowForm(true); }} className="shrink-0">
            <Plus className="h-4 w-4 mr-1.5" />
            Yeni Kişi
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ad Soyad</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Kurum</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">İletişim</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tip</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    {search || typeFilter ? "Sonuç bulunamadı." : "Henüz kişi eklenmemiş."}
                  </td>
                </tr>
              ) : (
                filtered.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/kisiler/${contact.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {contact.full_name}
                      </Link>
                      {contact.title && (
                        <p className="text-xs text-gray-400 mt-0.5">{contact.title}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {contact.organization ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="space-y-0.5">
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 text-xs"
                          >
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </a>
                        )}
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 text-xs"
                          >
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ContactTypeBadge type={contact.contact_type} />
                    </td>
                    <td className="px-4 py-3">
                      {canWrite && (
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => { setEditContact(contact); setShowForm(true); }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Düzenle"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <DeleteContactButton id={contact.id} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t bg-gray-50 text-xs text-gray-500">
            {filtered.length} kişi{contacts.length !== filtered.length && ` (toplam ${contacts.length})`}
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <ContactForm
          contact={editContact ?? undefined}
          onClose={() => { setShowForm(false); setEditContact(null); }}
        />
      )}
    </div>
  );
}

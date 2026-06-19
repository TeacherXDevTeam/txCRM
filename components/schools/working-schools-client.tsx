"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, MapPin, CalendarCheck, Users } from "lucide-react";
import { formatDate } from "@/lib/utils";

export interface VisitMeeting {
  id: string;
  title: string;
  meeting_date: string;
  related_entity_id: string | null;
  attendees: string[];
}

export interface WorkingSchool {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
}

interface Props {
  schools: WorkingSchool[];
  meetings: VisitMeeting[];
}

export function WorkingSchoolsClient({ schools, meetings }: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (schools.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-12 text-center text-sm text-gray-400">
        Aktif sözleşmesi olan okul bulunamadı. (Çalıştığımız okullar, sözleşmesi
        &quot;aktif&quot; olan okullardır.)
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {schools.map((s) => {
        const visits = meetings.filter((m) => m.related_entity_id === s.id);
        const isOpen = open.has(s.id);
        return (
          <div key={s.id} className="rounded-lg border bg-white overflow-hidden">
            <button
              onClick={() => toggle(s.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
                <div>
                  <p className="font-medium text-gray-900">{s.name}</p>
                  {(s.district || s.city) && (
                    <p className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin className="h-3 w-3" />
                      {[s.district, s.city].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <CalendarCheck className="h-3.5 w-3.5" />
                {visits.length} ziyaret
              </span>
            </button>

            {isOpen && (
              <div className="border-t bg-gray-50/60 px-4 py-3">
                {visits.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    Henüz bu okula bağlı ziyaret toplantısı yok.{" "}
                    <Link href="/toplantilar" className="text-blue-600 hover:underline">
                      Toplantı ekle
                    </Link>
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {visits.map((m) => (
                      <li
                        key={m.id}
                        className="rounded-md border-l-2 border-blue-300 bg-white px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-800">{m.title}</span>
                          <span className="text-xs text-gray-400">{formatDate(m.meeting_date)}</span>
                        </div>
                        {m.attendees.length > 0 && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                            <Users className="h-3 w-3" />
                            {m.attendees.join(", ")}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

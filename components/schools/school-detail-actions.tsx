"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { SchoolForm } from "@/components/schools/school-form";
import { DeleteSchoolButton } from "@/components/schools/delete-school-button";
import type { Database } from "@/types/database";

type School = Database["public"]["Tables"]["schools"]["Row"];

export function SchoolDetailActions({ school }: { school: School }) {
  const [showEdit, setShowEdit] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setShowEdit(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
      >
        <Pencil className="h-4 w-4" />
        Düzenle
      </button>
      <DeleteSchoolButton id={school.id} />
      {showEdit && <SchoolForm school={school} onClose={() => setShowEdit(false)} />}
    </div>
  );
}

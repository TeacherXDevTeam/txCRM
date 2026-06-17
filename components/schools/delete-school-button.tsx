"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function DeleteSchoolButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Bu okulu silmek istediğinizden emin misiniz? İlgili tüm veriler de silinecek.")) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("schools").delete().eq("id", id);
    router.push("/okullar");
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
      Sil
    </button>
  );
}

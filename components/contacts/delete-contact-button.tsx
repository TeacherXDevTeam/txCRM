"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function DeleteContactButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Bu kişiyi silmek istediğinizden emin misiniz?")) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("contacts").delete().eq("id", id);
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
      title="Sil"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}

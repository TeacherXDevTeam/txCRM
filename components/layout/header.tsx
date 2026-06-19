"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, User } from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface HeaderProps {
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    avatar_url?: string | null;
  };
}

const roleLabels: Record<string, string> = {
  admin: "Admin",
  member: "Üye",
  viewer: "İzleyici",
};

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <NotificationBell memberId={user.id} />
        <div className="flex items-center gap-2 text-sm">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div className="hidden sm:block">
            <p className="font-medium text-gray-900 leading-none">
              {user.full_name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {roleLabels[user.role] ?? user.role}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Çıkış</span>
        </button>
      </div>
    </header>
  );
}

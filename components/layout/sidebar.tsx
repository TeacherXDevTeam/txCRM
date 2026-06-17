"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  School,
  TrendingUp,
  BookOpen,
  CalendarCheck,
  MessageSquare,
  GraduationCap,
  FileText,
  Users2,
  Users,
  BarChart3,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "member", "viewer"] },
  { href: "/kisiler", label: "Kişiler", icon: Users2, roles: ["admin", "member", "viewer"] },
  { href: "/okullar", label: "Okullar", icon: School, roles: ["admin", "member", "viewer"] },
  { href: "/leadler", label: "Leadler", icon: TrendingUp, roles: ["admin", "member"] },
  { href: "/egitimler", label: "Eğitimler", icon: BookOpen, roles: ["admin", "member", "viewer"] },
  { href: "/atamalar", label: "Atamalar", icon: CalendarCheck, roles: ["admin", "member", "viewer"] },
  { href: "/toplantilar", label: "Toplantılar", icon: MessageSquare, roles: ["admin", "member", "viewer"] },
  { href: "/egitmenler", label: "Eğitmenler", icon: GraduationCap, roles: ["admin", "member", "viewer"] },
  { href: "/sozlesmeler", label: "Sözleşmeler", icon: FileText, roles: ["admin"] },
  { href: "/calisma-gruplari", label: "Çalışma Grupları", icon: Users, roles: ["admin", "member", "viewer"] },
  { href: "/ekip", label: "Ekip", icon: Users, roles: ["admin"] },
];

interface SidebarProps {
  role: "admin" | "member" | "viewer";
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(role)
  );

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-6 py-5 border-b border-gray-200">
        <span className="text-lg font-bold text-blue-600">TeacherX CRM</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

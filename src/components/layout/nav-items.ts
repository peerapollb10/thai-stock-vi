import { LayoutDashboard, List, Star, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { href: "/", label: "ภาพรวม", icon: LayoutDashboard },
  { href: "/stocks", label: "รายชื่อหุ้น", icon: List },
  { href: "/watchlist", label: "Watchlist", icon: Star },
];

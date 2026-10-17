"use client";

import { useState, type ReactNode } from "react";
import { UserDataProvider } from "@/components/user-data/UserDataProvider";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export function AppShell({ children, sidebarFooter }: { children: ReactNode; sidebarFooter: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <UserDataProvider>
      <div className="flex min-h-screen">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} footer={sidebarFooter} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </UserDataProvider>
  );
}

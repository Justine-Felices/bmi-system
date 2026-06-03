import { useState, type ReactNode } from "react";
import type { User } from "../../firebase";
import type { ActiveTab } from "../../types";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  user: User;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  children: ReactNode;
}

export function AppShell({
  user,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="h-[100dvh] min-h-screen overflow-hidden app-shell-bg flex w-full min-w-0">
      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={onTabChange}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full max-w-full overflow-hidden">
        <TopBar
          user={user}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onSearchSubmit={onSearchSubmit}
          onMenuClick={() => setMobileOpen(true)}
        />

        <main className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full p-3 sm:p-4 lg:p-6 scrollbar-thin">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 right-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
            <div className="absolute top-24 left-10 h-16 w-16 rounded-full bg-info/10 blur-2xl" />
            <div className="absolute bottom-10 right-16 h-28 w-28 rounded-full bg-accent/10 blur-2xl" />
          </div>
          <div className="relative z-10 w-full min-w-0 max-w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}

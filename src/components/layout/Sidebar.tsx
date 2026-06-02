import {
  Activity,
  ChevronDown,
  Heart,
  LayoutDashboard,
  LogOut,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { auth, signOut, type User } from "../../firebase";
import type { ActiveTab } from "../../types";
import { cn } from "../../lib/utils";
import kidsInCloud from "../../assets/sidebar/kids-in-the-cloud.png";

interface SidebarProps {
  user: User;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navItems: {
  id: ActiveTab;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "students", label: "Students", icon: Users },
  { id: "mealPlanner", label: "Meal Planner", icon: UtensilsCrossed },
];



export function Sidebar({
  user,
  activeTab,
  onTabChange,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const handleLogout = () => {
    if (auth) signOut(auth);
  };

  const handleNav = (tab: ActiveTab) => {
    onTabChange(tab);
    onMobileClose?.();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col w-64 sidebar-sky border-r border-border h-full lg:h-screen shrink-0 overflow-hidden transition-transform duration-200 relative",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-8 right-6 h-16 w-24 rounded-full bg-card/70 blur-md" />
          <div className="absolute top-16 left-6 h-12 w-16 rounded-full bg-card/60 blur-md" />
          <div className="absolute bottom-40 left-4 h-20 w-28 rounded-full bg-card/50 blur-md" />
        </div>

        <div className="relative p-5 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-card rounded-xl flex items-center justify-center text-primary shrink-0 shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-text leading-tight">BMI Monitor</p>
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                Child Health System
              </p>
            </div>
          </div>
        </div>

        <nav className="relative flex-1 min-h-0 p-4 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleNav(id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-semibold transition-all",
                activeTab === id
                  ? "bg-primary text-white shadow-sm shadow-primary/30"
                  : "text-text-muted hover:bg-card/70 hover:text-text",
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}

        </nav>

        <div className="relative px-0 -mx-2 -my-1">
          <img
            src={kidsInCloud}
            alt="Kids in the cloud"
            className="w-full object-contain scale-[1.85] origin-center"
          />
        </div>

        <div className="relative shrink-0 p-4 pt-1 space-y-3">
          <div className="[@media(max-height:720px)]:hidden p-5 rounded-[24px] bg-[#fffbeb] border border-[#fef3c7] shadow-sm">
            <div className="flex gap-3 items-start">
              <Heart className="w-5 h-5 text-[#f87171] fill-[#fecaca]/20 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <p className="font-bold text-[#1e2a44] text-[13px] leading-tight">
                  Healthy kids,
                </p>
                <p className="font-bold text-[#1e2a44] text-[13px] leading-tight">
                  brighter future!
                </p>
                <p className="text-[11px] font-semibold text-[#6b7a99] mt-2">
                  Track. Care. Grow.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl border border-border/60 bg-card/80">
            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
              {(user.displayName || user.email || "A").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text truncate">
                {user.displayName || "Admin User"}
              </p>
              <p className="text-[10px] font-medium text-text-muted">
                Administrator
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleLogout}
                className="p-1.5 text-text-muted hover:text-danger rounded-lg hover:bg-card transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <ChevronDown className="w-4 h-4 text-text-muted hidden sm:block" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

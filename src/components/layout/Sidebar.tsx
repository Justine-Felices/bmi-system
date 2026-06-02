import {
  Activity,
  ChevronDown,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  UtensilsCrossed,
} from 'lucide-react';
import { auth, signOut, type User } from '../../firebase';
import type { ActiveTab } from '../../types';
import { cn } from '../../lib/utils';

interface SidebarProps {
  user: User;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navItems: { id: ActiveTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'students', label: 'Students', icon: ClipboardList },
  { id: 'mealPlanner', label: 'Meal Planner', icon: UtensilsCrossed },
];

export function Sidebar({ user, activeTab, onTabChange, mobileOpen, onMobileClose }: SidebarProps) {
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
        <div className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden" onClick={onMobileClose} />
      )}

      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 flex flex-col w-64 bg-card border-r border-border h-full lg:h-screen shrink-0 overflow-hidden transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center text-primary shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-text leading-tight">BMI Monitor</p>
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wide">Daycare Health System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 min-h-0 p-4 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleNav(id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all',
                activeTab === id
                  ? 'bg-primary-light text-primary'
                  : 'text-text-muted hover:bg-surface hover:text-text'
              )}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </nav>

        <div className="shrink-0 p-4 space-y-3">
          <div className="[@media(max-height:720px)]:hidden p-3 rounded-2xl bg-gradient-to-br from-primary-light to-accent-light border border-primary-muted/30">
            <HeartPulse className="w-5 h-5 text-primary mb-1.5" />
            <p className="text-[11px] font-semibold text-text leading-snug">
              Healthier students, brighter future. Track. Monitor. Improve.
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface">
            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
              {(user.displayName || user.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text truncate">
                {user.displayName || 'Admin User'}
              </p>
              <p className="text-[10px] font-medium text-primary uppercase tracking-wide">Authorized Staff</p>
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

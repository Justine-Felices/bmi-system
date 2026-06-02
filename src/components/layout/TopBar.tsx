import type React from 'react';
import { Menu, Moon, Search, ShieldCheck, Sun } from 'lucide-react';
import type { User } from '../../firebase';
import { useTheme } from '../../contexts/ThemeContext';

interface TopBarProps {
  user: User;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => void;
  onMenuClick?: () => void;
}

export function TopBar({
  user,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onMenuClick,
}: TopBarProps) {
  const { isDark, toggleTheme } = useTheme();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearchSubmit();
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center gap-4 px-4 lg:px-6 shrink-0 w-full">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 text-text-muted hover:text-text rounded-lg hover:bg-surface"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="search"
            placeholder="Search students, records, reports..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-card transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 text-text-muted hover:text-text rounded-xl hover:bg-surface transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-border">
          <div className="text-right">
            <p className="text-sm font-semibold text-text">{user.email}</p>
            <p className="text-[10px] font-semibold text-primary uppercase tracking-wide flex items-center justify-end gap-1">
              <ShieldCheck className="w-3 h-3" /> Authorized Staff
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
            {(user.displayName || user.email || 'A').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}

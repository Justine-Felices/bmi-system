import type React from "react";
import { ChevronDown, Menu, Moon, Search, Sun } from "lucide-react";
import type { User } from "../../firebase";
import { useTheme } from "../../contexts/ThemeContext";

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
    if (e.key === "Enter") onSearchSubmit();
  };

  return (
    <header className="bg-card border-b border-border shadow-sm shrink-0 w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-0 sm:h-16 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex items-center gap-2 sm:gap-4 w-full min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-text-muted hover:text-text rounded-lg hover:bg-surface shrink-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="search"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-10 pl-10 pr-4 rounded-full border border-border bg-card text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-card transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:hidden shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 text-text-muted hover:text-text rounded-full hover:bg-surface transition-colors"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 text-text-muted hover:text-text rounded-full hover:bg-card transition-colors"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-border">
          <div className="text-right">
            <p className="text-sm font-semibold text-text">{user.email}</p>
            <p className="text-xs text-text-muted">Administrator</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
            {(user.displayName || user.email || "A").charAt(0).toUpperCase()}
          </div>
          <ChevronDown className="w-4 h-4 text-text-muted" />
        </div>
      </div>
    </header>
  );
}

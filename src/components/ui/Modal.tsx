import type { ReactNode } from 'react';
import { Crosshair, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './Button';

export function Modal({
  children,
  onClose,
  title,
  subtitle,
  icon,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-card rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden border border-border"
      >
        <div className="p-6 border-b border-border flex items-center justify-between bg-surface/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-light rounded-2xl flex items-center justify-center text-primary shadow-sm border border-border/60">
              {icon ?? <Crosshair className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-text tracking-tight leading-tight">{title}</h3>
              {subtitle ? (
                <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
              ) : null}
            </div>
          </div>
          <Button variant="ghost" onClick={onClose} className="p-1 h-8 w-8 rounded-lg">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-6 max-h-[85vh] overflow-y-auto scrollbar-thin">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

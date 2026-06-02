import type { ReactNode } from 'react';
import { Crosshair, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './Button';

export function Modal({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
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
        <div className="p-6 border-b border-border flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-card rounded-lg border border-border flex items-center justify-center text-primary shadow-sm">
              <Crosshair className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-text tracking-tight">{title}</h3>
          </div>
          <Button variant="ghost" onClick={onClose} className="p-1 h-8 w-8 rounded-lg">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-8 max-h-[85vh] overflow-y-auto scrollbar-thin">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

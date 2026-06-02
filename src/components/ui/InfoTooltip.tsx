import { Info } from 'lucide-react';

export function InfoTooltip({ content }: { content: string }) {
  return (
    <div className="group relative inline-block">
      <Info className="w-4 h-4 text-slate-400 cursor-help hover:text-teal-600 transition-colors" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 p-3 bg-slate-900/95 backdrop-blur-sm text-white text-[11px] font-medium leading-relaxed rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-50 shadow-2xl border border-white/10 translate-y-1 group-hover:translate-y-0 text-center">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900/95" />
      </div>
    </div>
  );
}

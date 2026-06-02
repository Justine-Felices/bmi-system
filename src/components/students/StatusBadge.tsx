import { cn } from '../../lib/utils';

const badgeStyles: Record<string, string> = {
  Normal: 'bg-success-light text-success border-success/20',
  Healthy: 'bg-success-light text-success border-success/20',
  Overweight: 'bg-accent-light text-amber-700 border-accent/30',
  Obese: 'bg-danger-light text-danger border-danger/20',
  Underweight: 'bg-info-light text-info border-info/20',
  'No Data': 'bg-slate-50 text-text-muted border-border',
};

export function StatusBadge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
      badgeStyles[label] ?? badgeStyles['No Data'],
      className
    )}>
      {label}
    </span>
  );
}

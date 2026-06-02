import { format } from 'date-fns';
import { ClipboardList, User as UserIcon, ChevronRight } from 'lucide-react';
import type { DashboardData } from '../../types';
import { calculateAge } from '../../utils/bmi';
import { cn } from '../../lib/utils';
import { Card } from '../ui/Card';

interface RecentEvaluationsCardProps {
  data: DashboardData;
  onViewAll?: () => void;
}

const categoryBadgeClass: Record<string, string> = {
  Normal: 'bg-teal-50 text-teal-700 border-teal-100',
  Overweight: 'bg-amber-50 text-amber-700 border-amber-100',
  Obese: 'bg-rose-50 text-rose-700 border-rose-100',
  Underweight: 'bg-blue-50 text-blue-700 border-blue-100',
};

export function RecentEvaluationsCard({ data, onViewAll }: RecentEvaluationsCardProps) {
  return (
    <Card className="p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-teal-600" />
          <h3 className="font-bold text-slate-900">Recent Evaluations</h3>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-0.5"
          >
            View all <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {data.recentEvaluations.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No recent evaluations</p>
        ) : (
          data.recentEvaluations.map(ev => (
            <div key={ev.recordId} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                {ev.student.photoUrl ? (
                  <img src={ev.student.photoUrl} alt={ev.student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{ev.student.name}</p>
                <p className="text-[11px] text-slate-500">
                  {format(ev.evaluatedAt, 'MMM d, yyyy')} · {calculateAge(ev.student.dob)}y · {ev.student.gender}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-800">{ev.bmi}</p>
                <span className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                  categoryBadgeClass[ev.category] ?? 'bg-slate-50 text-slate-600 border-slate-100'
                )}>
                  {ev.category}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {onViewAll && data.recentEvaluations.length > 0 && (
        <button
          onClick={onViewAll}
          className="mt-3 text-xs font-semibold text-teal-600 hover:text-teal-700 text-center"
        >
          View all evaluations
        </button>
      )}
    </Card>
  );
}

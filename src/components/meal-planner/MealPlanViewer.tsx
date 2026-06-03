import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { Calendar, Lightbulb, Trash2 } from 'lucide-react';
import type { MealPlan } from '../../types';
import { Button } from '../ui/Button';
import { MEAL_PLAN_PAGE_SIZE, Pagination } from '../ui/Pagination';
import { StatusBadge } from '../students/StatusBadge';
import { getPlanLifestyleTips } from '../../utils/meal-plans';
import { cn } from '../../lib/utils';

interface MealPlanViewerProps {
  plans: MealPlan[];
  selectedPlanId: string | null;
  onSelectPlan: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
}

const statusLabel: Record<MealPlan['status'], string> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
};

export function MealPlanViewer({
  plans,
  selectedPlanId,
  onSelectPlan,
  onDeletePlan,
}: MealPlanViewerProps) {
  if (plans.length === 0) {
    return (
      <div className="p-6 rounded-2xl border border-dashed border-border text-center text-sm text-text-muted">
        No saved meal plans yet. Click &quot;New plan&quot; to create one.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-text">Saved Plans</h3>
      <div className="space-y-2">
        {plans.map(plan => (
          <div
            key={plan.id}
            role="button"
            tabIndex={0}
            className={cn(
              'p-3 rounded-xl border cursor-pointer transition-colors',
              selectedPlanId === plan.id
                ? 'border-primary bg-primary-light/30'
                : 'border-border hover:bg-surface',
            )}
            onClick={() => onSelectPlan(plan.id)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectPlan(plan.id);
              }
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-text capitalize">{plan.periodType}</span>
                  <StatusBadge label={statusLabel[plan.status]} />
                </div>
                <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {plan.startDate} — {plan.endDate}
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  Baseline BMI {plan.baselineBmi} · {plan.baselineCategory}
                  {plan.createdAt && ` · ${format(plan.createdAt.toDate(), 'MMM d, yyyy')}`}
                </p>
              </div>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 text-text-muted hover:text-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this meal plan?')) onDeletePlan(plan.id);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LifestyleTipsBlock({ tips }: { tips: string[] }) {
  if (tips.length === 0) return null;

  return (
    <div className="p-4 border-t border-border bg-surface/50">
      <p className="text-[10px] font-bold text-text-muted uppercase mb-3 flex items-center gap-1.5">
        <Lightbulb className="w-3.5 h-3.5 text-accent" />
        Lifestyle tips (any day this week)
      </p>
      <ul className="space-y-2">
        {tips.map((tip, i) => (
          <li
            key={`${i}-${tip.slice(0, 24)}`}
            className="text-sm text-text-muted flex gap-2 p-3 rounded-xl bg-card border border-border"
          >
            <span className="w-6 h-6 rounded-lg bg-primary-light text-primary flex items-center justify-center text-xs font-bold shrink-0">
              {i + 1}
            </span>
            <span className="leading-relaxed">{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MealPlanReadOnlyView({ plan }: { plan: MealPlan }) {
  const [page, setPage] = useState(1);
  const lifestyleTips = getPlanLifestyleTips(plan);
  const totalPages = Math.max(1, Math.ceil(plan.meals.length / MEAL_PLAN_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * MEAL_PLAN_PAGE_SIZE;
  const visibleMeals = plan.meals.slice(start, start + MEAL_PLAN_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [plan.id]);

  return (
    <div className="rounded-2xl border border-border overflow-hidden" id="meal-plan-view">
      <div className="p-4 bg-surface border-b border-border">
        <p className="text-sm font-bold text-text capitalize">{plan.periodType} Plan</p>
        <p className="text-xs text-text-muted">{plan.startDate} — {plan.endDate}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left bg-card">
              <th className="p-3 text-[10px] font-bold text-text-muted uppercase">Day</th>
              <th className="p-3 text-[10px] font-bold text-text-muted uppercase">Breakfast</th>
              <th className="p-3 text-[10px] font-bold text-text-muted uppercase">AM Snack</th>
              <th className="p-3 text-[10px] font-bold text-text-muted uppercase">Lunch</th>
              <th className="p-3 text-[10px] font-bold text-text-muted uppercase">PM Snack</th>
              <th className="p-3 text-[10px] font-bold text-text-muted uppercase">Dinner</th>
            </tr>
          </thead>
          <tbody>
            {visibleMeals.map((day, i) => (
              <tr key={`${day.dayLabel}-${start + i}`} className="border-t border-border">
                <td className="p-3 font-medium text-text whitespace-nowrap">{day.dayLabel}</td>
                <td className="p-3 text-text-muted">{day.breakfast}</td>
                <td className="p-3 text-text-muted">{day.amSnack || '—'}</td>
                <td className="p-3 text-text-muted">{day.lunch}</td>
                <td className="p-3 text-text-muted">{day.pmSnack || '—'}</td>
                <td className="p-3 text-text-muted">{day.dinner || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={plan.meals.length}
        pageSize={MEAL_PLAN_PAGE_SIZE}
        onPageChange={setPage}
        itemLabel="days"
      />
      <LifestyleTipsBlock tips={lifestyleTips} />
      {plan.notes && (
        <div className="p-4 border-t border-border bg-surface">
          <p className="text-[10px] font-bold text-text-muted uppercase">Notes</p>
          <p className="text-sm text-text mt-1">{plan.notes}</p>
        </div>
      )}
    </div>
  );
}

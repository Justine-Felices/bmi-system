import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { Calendar, Lightbulb, Trash2 } from 'lucide-react';
import type { MealPlan } from '../../types';
import { Button } from '../ui/Button';
import { MEAL_PLAN_PAGE_SIZE, Pagination } from '../ui/Pagination';
import { StatusBadge } from '../students/StatusBadge';

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
        No saved meal plans yet. Generate one above.
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
            className={`p-3 rounded-xl border cursor-pointer transition-colors ${
              selectedPlanId === plan.id
                ? 'border-primary bg-primary-light/30'
                : 'border-border hover:bg-surface'
            }`}
            onClick={() => onSelectPlan(plan.id)}
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

export function MealPlanReadOnlyView({ plan }: { plan: MealPlan }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(plan.meals.length / MEAL_PLAN_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * MEAL_PLAN_PAGE_SIZE;
  const visibleMeals = plan.meals.slice(start, start + MEAL_PLAN_PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [plan.id]);

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
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
              <th className="p-3 text-[10px] font-bold text-text-muted uppercase">Suggestion</th>
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
                <td className="p-3 text-text-muted">
                  {day.suggestion ? (
                    <span className="inline-flex items-start gap-1 text-xs">
                      <Lightbulb className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                      {day.suggestion}
                    </span>
                  ) : '—'}
                </td>
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
      {plan.notes && (
        <div className="p-4 border-t border-border bg-surface">
          <p className="text-[10px] font-bold text-text-muted uppercase">Notes</p>
          <p className="text-sm text-text mt-1">{plan.notes}</p>
        </div>
      )}
    </div>
  );
}

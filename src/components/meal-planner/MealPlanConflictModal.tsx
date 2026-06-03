import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { MealPlan } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

const statusLabel: Record<MealPlan['status'], string> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
};

interface MealPlanConflictModalProps {
  existingPlan: MealPlan;
  newStartDate: string;
  newEndDate: string;
  saving: boolean;
  onOverride: () => void;
  onCancel: () => void;
}

export function MealPlanConflictModal({
  existingPlan,
  newStartDate,
  newEndDate,
  saving,
  onOverride,
  onCancel,
}: MealPlanConflictModalProps) {
  const createdLabel = existingPlan.createdAt?.toDate
    ? format(existingPlan.createdAt.toDate(), 'MMM d, yyyy')
    : null;

  return (
    <Modal
      title="Plan already exists this week"
      subtitle="This student already has a saved meal plan for the same week."
      icon={<AlertTriangle className="w-5 h-5 text-accent" />}
      onClose={onCancel}
    >
      <div className="p-6 space-y-4">
        <div className="p-4 rounded-xl bg-surface border border-border text-sm space-y-1">
          <p className="font-semibold text-text capitalize">
            Existing {existingPlan.periodType} plan · {statusLabel[existingPlan.status]}
          </p>
          <p className="text-text-muted">
            {existingPlan.startDate} — {existingPlan.endDate}
          </p>
          {createdLabel && (
            <p className="text-xs text-text-muted">Saved {createdLabel}</p>
          )}
        </div>

        <p className="text-sm text-text-muted">
          Your new plan ({newStartDate} — {newEndDate}) overlaps this week. Choose whether to
          replace the existing plan or keep it and cancel this save.
        </p>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={onCancel} disabled={saving} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={onOverride} disabled={saving} className="rounded-xl">
            {saving ? 'Saving...' : 'Replace existing plan'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

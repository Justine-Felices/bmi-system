import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface MealPlanGeneratorProps {
  periodType: 'weekly' | 'monthly';
  startDate: string;
  onPeriodTypeChange: (v: 'weekly' | 'monthly') => void;
  onStartDateChange: (v: string) => void;
  onGenerate: () => void;
  generating: boolean;
  disabled?: boolean;
}

export function MealPlanGenerator({
  periodType,
  startDate,
  onPeriodTypeChange,
  onStartDateChange,
  onGenerate,
  generating,
  disabled,
}: MealPlanGeneratorProps) {
  return (
    <div className="p-4 rounded-2xl bg-primary-light/50 border border-primary/10 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-bold text-text">Generate Meal Plan</h3>
      </div>
      <p className="text-xs text-text-muted">
        AI generates daycare-appropriate meals based on the student&apos;s BMI category, age, and allergies. Edit before saving.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Period</label>
          <Select
            value={periodType}
            onChange={e => onPeriodTypeChange(e.target.value as 'weekly' | 'monthly')}
            className="mt-1 h-10"
            disabled={generating}
          >
            <option value="weekly">Weekly (5 days)</option>
            <option value="monthly">Monthly (20 days)</option>
          </Select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Start Date</label>
          <Input
            type="date"
            value={startDate}
            onChange={e => onStartDateChange(e.target.value)}
            className="mt-1 h-10"
            disabled={generating}
          />
        </div>
        <div className="flex items-end">
          <Button
            onClick={onGenerate}
            disabled={disabled || generating}
            className="w-full h-10 rounded-xl"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generate with AI</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

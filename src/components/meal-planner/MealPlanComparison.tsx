import { ArrowRight, Loader2, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import type { MealPlanComparison } from '../../types';
import { Button } from '../ui/Button';
import { StatusBadge } from '../students/StatusBadge';

interface MealPlanComparisonProps {
  comparison: MealPlanComparison | null;
  loading: boolean;
  onGenerateUpdatedPlan: () => void;
  generating?: boolean;
}

export function MealPlanComparisonPanel({
  comparison,
  loading,
  onGenerateUpdatedPlan,
  generating,
}: MealPlanComparisonProps) {
  if (loading) {
    return (
      <div className="p-6 rounded-2xl border border-border bg-card flex items-center justify-center gap-2 text-sm text-text-muted">
        <Loader2 className="w-4 h-4 animate-spin" /> Analyzing BMI progress...
      </div>
    );
  }

  if (!comparison) return null;

  const improved = comparison.bmiDelta < 0 && comparison.baselineCategory !== 'Underweight'
    || comparison.bmiDelta > 0 && comparison.baselineCategory === 'Underweight'
    || comparison.categoryChanged && ['Healthy'].includes(comparison.currentCategory);

  return (
    <div className="p-5 rounded-2xl border border-accent/30 bg-accent-light/30 space-y-4">
      <div className="flex items-center gap-2">
        {improved ? (
          <TrendingDown className="w-5 h-5 text-success" />
        ) : (
          <TrendingUp className="w-5 h-5 text-accent" />
        )}
        <h3 className="text-sm font-bold text-text">BMI Progress Comparison</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-card border border-border text-center">
          <p className="text-[10px] font-bold text-text-muted uppercase">Baseline BMI</p>
          <p className="text-lg font-bold text-text mt-1">{comparison.baselineBmi}</p>
          <StatusBadge label={comparison.baselineCategory} className="mt-1" />
        </div>
        <div className="p-3 rounded-xl bg-card border border-border text-center flex flex-col items-center justify-center">
          <ArrowRight className="w-4 h-4 text-text-muted my-1" />
          <p className={`text-xs font-bold ${comparison.bmiDelta <= 0 ? 'text-success' : 'text-accent'}`}>
            {comparison.bmiDelta > 0 ? '+' : ''}{comparison.bmiDelta}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border text-center">
          <p className="text-[10px] font-bold text-text-muted uppercase">Current BMI</p>
          <p className="text-lg font-bold text-text mt-1">{comparison.currentBmi}</p>
          <StatusBadge label={comparison.currentCategory} className="mt-1" />
        </div>
        <div className="p-3 rounded-xl bg-card border border-border text-center">
          <p className="text-[10px] font-bold text-text-muted uppercase">Category</p>
          <p className="text-sm font-semibold text-text mt-2">
            {comparison.categoryChanged ? 'Changed' : 'Unchanged'}
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-card border border-border">
        <p className="text-[10px] font-bold text-text-muted uppercase mb-2">AI Progress Summary</p>
        <p className="text-sm text-text leading-relaxed">{comparison.aiSummary}</p>
      </div>

      <Button
        onClick={onGenerateUpdatedPlan}
        disabled={generating}
        className="w-full h-10 rounded-xl"
      >
        {generating ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
        ) : (
          <><RefreshCw className="w-4 h-4 mr-2" /> Generate Updated Plan</>
        )}
      </Button>
    </div>
  );
}

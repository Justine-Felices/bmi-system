import { useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { MealPlanComparison } from '../../types';
import { Button } from '../ui/Button';
import { StatusBadge } from '../students/StatusBadge';
import { cn } from '../../lib/utils';

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
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent-light/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-accent-light/50 transition-colors"
      >
        <span className="text-sm font-bold text-text flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" />
          BMI progress since this plan
          {loading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-text-muted" aria-hidden />
          )}
        </span>
        <ChevronDown
          className={cn('w-4 h-4 text-text-muted shrink-0 transition-transform', expanded && 'rotate-180')}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-accent/20">
          {loading && !comparison && (
            <p className="text-sm text-text-muted py-2">Analyzing BMI progress...</p>
          )}

          {comparison && (
            <>
              {(() => {
                const improved =
                  (comparison.bmiDelta < 0 && comparison.baselineCategory !== 'Underweight')
                  || (comparison.bmiDelta > 0 && comparison.baselineCategory === 'Underweight')
                  || (comparison.categoryChanged && ['Healthy'].includes(comparison.currentCategory));

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-card border border-border text-center">
                      <p className="text-[10px] font-bold text-text-muted uppercase">Baseline BMI</p>
                      <p className="text-lg font-bold text-text mt-1">{comparison.baselineBmi}</p>
                      <StatusBadge label={comparison.baselineCategory} className="mt-1" />
                    </div>
                    <div className="p-3 rounded-xl bg-card border border-border text-center flex flex-col items-center justify-center">
                      {improved ? (
                        <TrendingDown className="w-4 h-4 text-success my-1" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-accent my-1" />
                      )}
                      <ArrowRight className="w-4 h-4 text-text-muted" />
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
                );
              })()}

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
            </>
          )}
        </div>
      )}
    </div>
  );
}

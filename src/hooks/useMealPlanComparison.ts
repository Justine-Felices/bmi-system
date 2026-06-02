import { useState, useEffect, useMemo } from 'react';
import { generateMealPlanComparison } from '../services/ai';
import { getBMICategory } from '../utils/bmi';
import type { BMIRecord, MealPlan, MealPlanComparison, Student } from '../types';

export function useMealPlanComparison(
  student: Student | null,
  plan: MealPlan | null,
  records: BMIRecord[],
) {
  const [comparison, setComparison] = useState<MealPlanComparison | null>(null);
  const [loading, setLoading] = useState(false);

  const newerRecord = useMemo(() => {
    if (!plan || records.length === 0) return null;
    const planCreated = plan.createdAt?.toDate?.();
    if (!planCreated) return records[0];

    const sorted = [...records].sort((a, b) => {
      const ta = a.timestamp?.toDate?.()?.getTime() ?? 0;
      const tb = b.timestamp?.toDate?.()?.getTime() ?? 0;
      return tb - ta;
    });

    const baselineRecord = plan.baselineRecordId
      ? records.find(r => r.id === plan.baselineRecordId)
      : null;

    const baselineTime = baselineRecord?.timestamp?.toDate?.()?.getTime()
      ?? planCreated.getTime();

    return sorted.find(r => {
      const t = r.timestamp?.toDate?.()?.getTime() ?? 0;
      return t > baselineTime && r.id !== plan.baselineRecordId;
    }) ?? null;
  }, [plan, records]);

  useEffect(() => {
    if (!student || !plan || !newerRecord) {
      setComparison(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const run = async () => {
      const currentCategory = getBMICategory(newerRecord.bmi).label;
      const aiSummary = await generateMealPlanComparison({
        student,
        plan,
        previousBmi: plan.baselineBmi,
        currentBmi: newerRecord.bmi,
        previousCategory: plan.baselineCategory,
        currentCategory,
      });

      if (cancelled) return;

      setComparison({
        planId: plan.id,
        baselineBmi: plan.baselineBmi,
        currentBmi: newerRecord.bmi,
        baselineCategory: plan.baselineCategory,
        currentCategory,
        bmiDelta: parseFloat((newerRecord.bmi - plan.baselineBmi).toFixed(2)),
        categoryChanged: plan.baselineCategory !== currentCategory,
        aiSummary,
      });
      setLoading(false);
    };

    run();
    return () => { cancelled = true; };
  }, [student, plan, newerRecord]);

  return { comparison, loading, hasNewerRecord: !!newerRecord, newerRecord };
}

import { useEffect, useMemo, useState } from 'react';
import { generateDashboardInsights } from '../services/ai';
import type { DashboardData, DashboardInsight } from '../types';

function buildInsightsCacheKey(data: DashboardData): string {
  return JSON.stringify({
    totalStudents: data.totalStudents,
    totalRecords: data.totalRecords,
    avgBMI: data.avgBMI,
    healthyCount: data.healthyCount,
    healthyPercent: data.healthyPercent,
    atRiskCount: data.atRiskCount,
    atRiskPercent: data.atRiskPercent,
    evaluationsToday: data.evaluationsToday,
    studentGrowthPercent: data.studentGrowthPercent,
    healthStatusBreakdown: data.healthStatusBreakdown,
    trendData: data.trendData,
    genderData: data.genderData,
    gradeData: data.gradeData,
  });
}

export function useDashboardInsights(data: DashboardData) {
  const [insights, setInsights] = useState<DashboardInsight[]>(data.insights);
  const [loading, setLoading] = useState(false);
  const [isAiPowered, setIsAiPowered] = useState(false);

  const cacheKey = useMemo(() => buildInsightsCacheKey(data), [data]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setInsights(data.insights);

    generateDashboardInsights(data)
      .then(({ insights: nextInsights, source }) => {
        if (cancelled) return;
        setInsights(nextInsights);
        setIsAiPowered(source === 'ai');
      })
      .catch(() => {
        if (!cancelled) {
          setInsights(data.insights);
          setIsAiPowered(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey]);

  return { insights, loading, isAiPowered };
}

import type { BMIRecord, Student } from '../types';
import { chartColors } from '../lib/theme';

export type BMICategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export interface BMICategoryInfo {
  key: BMICategory;
  label: string;
  color: string;
}

const CATEGORY_MAP: Record<BMICategory, BMICategoryInfo> = {
  underweight: { key: 'underweight', label: 'Underweight', color: chartColors.info },
  normal: { key: 'normal', label: 'Normal', color: chartColors.success },
  overweight: { key: 'overweight', label: 'Overweight', color: chartColors.accent },
  obese: { key: 'obese', label: 'Obese', color: chartColors.danger },
};

export function categorizeBMI(bmi: number): BMICategoryInfo {
  if (bmi < 18.5) return CATEGORY_MAP.underweight;
  if (bmi < 25) return CATEGORY_MAP.normal;
  if (bmi < 30) return CATEGORY_MAP.overweight;
  return CATEGORY_MAP.obese;
}

export function getLatestRecordPerStudent(
  records: BMIRecord[],
  studentIds?: Set<string>
): Map<string, BMIRecord> {
  const latest = new Map<string, BMIRecord>();

  for (const record of records) {
    if (studentIds && !studentIds.has(record.studentId)) continue;
    const existing = latest.get(record.studentId);
    if (!existing) {
      latest.set(record.studentId, record);
      continue;
    }
    const existingTime = existing.timestamp?.toMillis() ?? 0;
    const recordTime = record.timestamp?.toMillis() ?? 0;
    if (recordTime > existingTime) {
      latest.set(record.studentId, record);
    }
  }

  return latest;
}

export function computeMonthOverMonthDelta(students: Student[]): number | null {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  let thisMonth = 0;
  let lastMonth = 0;

  for (const student of students) {
    if (!student.createdAt) continue;
    const created = student.createdAt.toDate();
    if (created >= thisMonthStart) thisMonth++;
    else if (created >= lastMonthStart && created < thisMonthStart) lastMonth++;
  }

  if (lastMonth === 0) return thisMonth > 0 ? 100 : null;
  return Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
}

interface InsightInput {
  students: Student[];
  latestRecords: Map<string, BMIRecord>;
  trendData: { date: string; bmi: number }[];
}

export function computeInsights({ students, latestRecords, trendData }: InsightInput) {
  const totalStudents = students.length;
  const latestList = Array.from(latestRecords.values());

  let healthyCount = 0;
  let atRiskCount = 0;

  for (const record of latestList) {
    const cat = categorizeBMI(record.bmi);
    if (cat.key === 'normal') healthyCount++;
    if (cat.key === 'overweight' || cat.key === 'obese') atRiskCount++;
  }

  const healthyPercent = totalStudents > 0 ? Math.round((healthyCount / totalStudents) * 100) : 0;

  let trendIncreasing = false;
  let trendPercent = 0;
  if (trendData.length >= 4) {
    const mid = Math.floor(trendData.length / 2);
    const firstHalf = trendData.slice(0, mid);
    const secondHalf = trendData.slice(mid);
    const avgFirst = firstHalf.reduce((s, d) => s + d.bmi, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, d) => s + d.bmi, 0) / secondHalf.length;
    if (avgFirst > 0) {
      trendPercent = Math.abs(Math.round(((avgSecond - avgFirst) / avgFirst) * 1000) / 10);
      trendIncreasing = avgSecond > avgFirst;
    }
  }

  const insights = [];

  if (trendData.length >= 4) {
    insights.push({
      type: 'trend' as const,
      title: trendIncreasing ? 'BMI trend is increasing' : 'BMI trend is stable or improving',
      description: trendIncreasing
        ? `Average BMI increased by ${trendPercent}% in the selected period.`
        : `Average BMI decreased or held steady over the selected period.`,
    });
  }

  insights.push({
    type: 'alert' as const,
    title: `${atRiskCount} student${atRiskCount !== 1 ? 's' : ''} need monitoring`,
    description: 'Focus on nutrition and physical activity programs.',
  });

  insights.push({
    type: 'success' as const,
    title: `${healthyPercent}% of students are healthy`,
    description: 'Keep promoting healthy lifestyle habits across all grades.',
  });

  return insights;
}

export function countEvaluationsToday(records: BMIRecord[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return records.filter(r => {
    if (!r.timestamp) return false;
    const d = r.timestamp.toDate();
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  }).length;
}

export { CATEGORY_MAP };

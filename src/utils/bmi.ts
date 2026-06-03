import { differenceInYears, parseISO } from 'date-fns';
import { AlertCircle, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';

export const getBMICategory = (bmi: number) => {
  if (bmi < 18.5) return { label: 'Underweight', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: TrendingDown };
  if (bmi < 25) return { label: 'Healthy', color: 'text-teal-600 bg-teal-50 border-teal-100', icon: ShieldCheck };
  if (bmi < 30) return { label: 'Overweight', color: 'text-amber-600 bg-amber-50 border-amber-100', icon: AlertCircle };
  return { label: 'Obese', color: 'text-rose-600 bg-rose-50 border-rose-100', icon: TrendingUp };
};

export const calculateBMI = (h: number, w: number) => {
  const heightInMeters = h / 100;
  if (!Number.isFinite(h) || !Number.isFinite(w) || h <= 0 || w <= 0) return NaN;
  return parseFloat((w / (heightInMeters * heightInMeters)).toFixed(2));
};

/** Resolves a numeric BMI from a record, computing from height/weight when bmi is missing or invalid. */
export function getRecordBmi(record: {
  bmi?: number;
  height?: number;
  weight?: number;
}): number | null {
  if (typeof record.bmi === 'number' && Number.isFinite(record.bmi) && record.bmi > 0 && record.bmi < 100) {
    return record.bmi;
  }
  if (
    typeof record.height === 'number' &&
    typeof record.weight === 'number' &&
    Number.isFinite(record.height) &&
    Number.isFinite(record.weight) &&
    record.height > 0 &&
    record.weight > 0
  ) {
    const computed = calculateBMI(record.height, record.weight);
    return Number.isFinite(computed) ? computed : null;
  }
  return null;
}

export function averageRecordBmi(
  records: { bmi?: number; height?: number; weight?: number }[],
): number {
  const values = records.map(getRecordBmi).filter((v): v is number => v !== null);
  if (values.length === 0) return 0;
  return parseFloat((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2));
}

export const calculateAge = (dob: string) => {
  try {
    return differenceInYears(new Date(), parseISO(dob));
  } catch {
    return 0;
  }
};

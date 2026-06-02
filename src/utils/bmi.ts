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
  return parseFloat((w / (heightInMeters * heightInMeters)).toFixed(2));
};

export const calculateAge = (dob: string) => {
  try {
    return differenceInYears(new Date(), parseISO(dob));
  } catch {
    return 0;
  }
};

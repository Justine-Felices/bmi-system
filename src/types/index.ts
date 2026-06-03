import type { Timestamp } from '../firebase';

export interface Student {
  id: string;
  name: string;
  grade?: string;
  sectionId?: string;
  dob: string;
  gender: 'male' | 'female' | 'other';
  allergies?: string[];
  photoUrl?: string;
  createdAt: Timestamp;
}

export interface Section {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  createdAt: Timestamp;
}

export interface BMIRecord {
  id: string;
  studentId: string;
  height: number;
  weight: number;
  bmi: number;
  healthIssues?: string[];
  timestamp: Timestamp;
  recordedBy: string;
}

export interface MealPlanDay {
  dayLabel: string;
  breakfast: string;
  amSnack?: string;
  lunch: string;
  pmSnack?: string;
  dinner?: string;
  suggestion?: string;
}

export interface MealPlan {
  id: string;
  studentId: string;
  periodType: 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  baselineBmi: number;
  baselineCategory: string;
  baselineRecordId?: string;
  meals: MealPlanDay[];
  /** General lifestyle tips for the whole plan (not tied to a specific day). */
  lifestyleTips?: string[];
  status: 'draft' | 'active' | 'completed';
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MealPlanComparison {
  planId: string;
  baselineBmi: number;
  currentBmi: number;
  baselineCategory: string;
  currentCategory: string;
  bmiDelta: number;
  categoryChanged: boolean;
  aiSummary: string;
}

export type DateFilter = '7d' | '30d' | '90d' | 'all';
export type GenderFilter = 'all' | 'male' | 'female' | 'other';
export type AgeFilter = 'all' | 'under10' | '10-15' | 'over15';
export type ActiveTab = 'dashboard' | 'students' | 'mealPlanner';

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface AnalyticsData {
  totalStudents: number;
  activeStudents: number;
  totalRecords: number;
  avgBMI: number;
  pieData: ChartDataPoint[];
  genderData: ChartDataPoint[];
  gradeData: { name: string; value: number }[];
  gradeBMIData: { name: string; value: number }[];
  trendData: { date: string; bmi: number }[];
  sectionDistribution?: ChartDataPoint[];
}

export interface RecentEvaluation {
  recordId: string;
  student: Student;
  bmi: number;
  category: string;
  categoryColor: string;
  evaluatedAt: Date;
}

export interface DashboardInsight {
  type: 'trend' | 'alert' | 'success';
  title: string;
  description: string;
}

export interface DashboardData extends AnalyticsData {
  healthyCount: number;
  healthyPercent: number;
  atRiskCount: number;
  atRiskPercent: number;
  healthStatusBreakdown: ChartDataPoint[];
  recentEvaluations: RecentEvaluation[];
  insights: DashboardInsight[];
  studentGrowthPercent: number | null;
  evaluationsToday: number;
  studentSparkline: { value: number }[];
  evaluationSparkline: { value: number }[];
}

export interface DeleteConfirmState {
  type: 'student' | 'record';
  id: string;
}

export const UNASSIGNED_SECTION_ID = '__unassigned__';

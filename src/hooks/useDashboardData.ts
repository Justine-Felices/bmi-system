import { useMemo } from 'react';
import { differenceInYears, format, parseISO, startOfDay, subDays } from 'date-fns';
import type {
  AgeFilter,
  BMIRecord,
  DashboardData,
  DateFilter,
  GenderFilter,
  Section,
  Student,
} from '../types';
import { UNASSIGNED_SECTION_ID } from '../types';
import {
  categorizeBMI,
  computeInsights,
  computeMonthOverMonthDelta,
  countEvaluationsToday,
  getLatestRecordPerStudent,
} from '../utils/analytics';
import { chartColors } from '../lib/theme';
import { averageRecordBmi, getRecordBmi } from '../utils/bmi';

function filterRecords(
  globalRecords: BMIRecord[],
  students: Student[],
  dateFilter: DateFilter,
  genderFilter: GenderFilter,
  ageFilter: AgeFilter
): BMIRecord[] {
  let filtered = globalRecords;

  if (dateFilter !== 'all') {
    const days = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90;
    const cutoff = subDays(new Date(), days);
    filtered = filtered.filter(r => r.timestamp && r.timestamp.toDate() >= cutoff);
  }

  return filtered.filter(r => {
    const student = students.find(s => s.id === r.studentId);
    if (!student) return false;

    if (genderFilter !== 'all' && student.gender !== genderFilter) return false;

    if (ageFilter !== 'all') {
      const age = differenceInYears(new Date(), parseISO(student.dob));
      if (ageFilter === 'under10' && age >= 10) return false;
      if (ageFilter === '10-15' && (age < 10 || age > 15)) return false;
      if (ageFilter === 'over15' && age <= 15) return false;
    }

    return true;
  });
}

export function useDashboardData(
  students: Student[],
  globalRecords: BMIRecord[],
  dateFilter: DateFilter,
  genderFilter: GenderFilter,
  ageFilter: AgeFilter,
  sections: Section[] = [],
): DashboardData {
  return useMemo(() => {
    const totalStudents = students.length;
    const filteredGlobalRecords = filterRecords(globalRecords, students, dateFilter, genderFilter, ageFilter);
    const totalRecords = filteredGlobalRecords.length;

    const activeStudentIds = new Set(filteredGlobalRecords.map(r => r.studentId));
    const demographyPopulation = students.filter(s => activeStudentIds.has(s.id));

    const latestRecords = getLatestRecordPerStudent(filteredGlobalRecords);
    const latestList = Array.from(latestRecords.values());

    const categoryCounts = { underweight: 0, normal: 0, overweight: 0, obese: 0 };
    let healthyCount = 0;
    let atRiskCount = 0;

    for (const record of latestList) {
      const bmi = getRecordBmi(record);
      if (bmi === null) continue;
      const cat = categorizeBMI(bmi);
      categoryCounts[cat.key]++;
      if (cat.key === 'normal') healthyCount++;
      if (cat.key === 'overweight' || cat.key === 'obese') atRiskCount++;
    }

    const monitoredCount = latestList.length || totalStudents;
    const healthyPercent = monitoredCount > 0 ? Math.round((healthyCount / monitoredCount) * 100) : 0;
    const atRiskPercent = monitoredCount > 0 ? Math.round((atRiskCount / monitoredCount) * 100) : 0;

    const healthStatusBreakdown = [
      { name: 'Normal', value: categoryCounts.normal, color: chartColors.success },
      { name: 'Overweight', value: categoryCounts.overweight, color: chartColors.accent },
      { name: 'Obese', value: categoryCounts.obese, color: chartColors.danger },
      { name: 'Underweight', value: categoryCounts.underweight, color: chartColors.info },
    ].filter(d => d.value > 0);

    const pieData = healthStatusBreakdown;

    const avgBMI = averageRecordBmi(filteredGlobalRecords);

    const genders = { male: 0, female: 0, other: 0 };
    demographyPopulation.forEach(s => {
      if (s.gender in genders) genders[s.gender as keyof typeof genders]++;
    });

    const genderData = [
      { name: 'Male', value: genders.male, color: chartColors.sky },
      { name: 'Female', value: genders.female, color: chartColors.pink },
      { name: 'Other', value: genders.other, color: chartColors.muted },
    ].filter(d => d.value > 0);

    const gradeMap: Record<string, number> = {};
    demographyPopulation.forEach(s => {
      const grade = s.grade || 'Unknown';
      gradeMap[grade] = (gradeMap[grade] || 0) + 1;
    });

    const gradeData = Object.entries(gradeMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => ({ name, value }));

    const sectionMap = new Map(sections.map(s => [s.id, s.name]));
    const sectionCounts: Record<string, number> = {};
    students.forEach(s => {
      const key = s.sectionId || UNASSIGNED_SECTION_ID;
      sectionCounts[key] = (sectionCounts[key] || 0) + 1;
    });
    const sectionDistribution = Object.entries(sectionCounts).map(([id, value]) => ({
      name: id === UNASSIGNED_SECTION_ID ? 'Unassigned' : (sectionMap.get(id) || id),
      value,
      color: chartColors.primary,
    })).filter(d => d.value > 0);

    const gradeBMIMap: Record<string, { sum: number; count: number }> = {};
    filteredGlobalRecords.forEach(r => {
      const bmi = getRecordBmi(r);
      if (bmi === null) return;
      const student = students.find(s => s.id === r.studentId);
      const grade = student?.grade || 'Unknown';
      if (!gradeBMIMap[grade]) gradeBMIMap[grade] = { sum: 0, count: 0 };
      gradeBMIMap[grade].sum += bmi;
      gradeBMIMap[grade].count++;
    });

    const gradeBMIData = Object.entries(gradeBMIMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, data]) => ({
        name,
        value: parseFloat((data.sum / data.count).toFixed(2)),
      }));

    const dailyMap: Record<string, { sum: number; count: number; rawDate: Date }> = {};
    filteredGlobalRecords.forEach(r => {
      const bmi = getRecordBmi(r);
      if (!r.timestamp || bmi === null) return;
      const dateObj = r.timestamp.toDate();
      const dateKey = format(dateObj, 'yyyy-MM-dd');
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { sum: 0, count: 0, rawDate: dateObj };
      dailyMap[dateKey].sum += bmi;
      dailyMap[dateKey].count++;
    });

    const trendData = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([, data]) => ({
        date: format(data.rawDate, 'MMM dd'),
        bmi: parseFloat((data.sum / data.count).toFixed(2)),
      }));

    const recentEvaluations = [...filteredGlobalRecords]
      .sort((a, b) => (b.timestamp?.toMillis() ?? 0) - (a.timestamp?.toMillis() ?? 0))
      .slice(0, 5)
      .map(record => {
        const student = students.find(s => s.id === record.studentId);
        const bmi = getRecordBmi(record);
        const cat = categorizeBMI(bmi ?? 0);
        return {
          recordId: record.id,
          student: student!,
          bmi: bmi ?? 0,
          category: cat.label,
          categoryColor: cat.color,
          evaluatedAt: record.timestamp?.toDate() ?? new Date(),
        };
      })
      .filter((r) => r.student && r.bmi > 0);

    const insights = computeInsights({ students, latestRecords, trendData });
    const studentGrowthPercent = computeMonthOverMonthDelta(students);
    const evaluationsToday = countEvaluationsToday(filteredGlobalRecords);

    const studentSparkline = Array.from({ length: 7 }, (_, i) => {
      const day = startOfDay(subDays(new Date(), 6 - i));
      const count = students.filter(s => {
        if (!s.createdAt) return false;
        const created = startOfDay(s.createdAt.toDate());
        return created <= day;
      }).length;
      return { value: count };
    });

    const evaluationSparkline = Array.from({ length: 7 }, (_, i) => {
      const day = startOfDay(subDays(new Date(), 6 - i));
      const count = filteredGlobalRecords.filter(r => {
        if (!r.timestamp) return false;
        return startOfDay(r.timestamp.toDate()).getTime() === day.getTime();
      }).length;
      return { value: count };
    });

    return {
      totalStudents,
      activeStudents: demographyPopulation.length,
      totalRecords,
      avgBMI,
      pieData,
      genderData,
      gradeData,
      gradeBMIData,
      trendData,
      sectionDistribution,
      healthyCount,
      healthyPercent,
      atRiskCount,
      atRiskPercent,
      healthStatusBreakdown,
      recentEvaluations,
      insights,
      studentGrowthPercent,
      evaluationsToday,
      studentSparkline,
      evaluationSparkline,
    };
  }, [students, globalRecords, dateFilter, genderFilter, ageFilter, sections]);
}

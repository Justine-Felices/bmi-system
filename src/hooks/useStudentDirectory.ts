import { useEffect, useMemo, useState } from 'react';
import { format, startOfMonth } from 'date-fns';
import type { BMIRecord, Section, Student } from '../types';
import { UNASSIGNED_SECTION_ID as UNASSIGNED } from '../types';
import { categorizeBMI, computeMonthOverMonthDelta, getLatestRecordPerStudent } from '../utils/analytics';
import { calculateAge } from '../utils/bmi';

export type StatusFilter = 'all' | 'normal' | 'overweight' | 'obese' | 'underweight' | 'no-data';
export type SortField = 'name' | 'bmi' | 'lastEvaluation';

export interface StudentRow {
  student: Student;
  latestRecord: BMIRecord | null;
  bmi: number | null;
  category: ReturnType<typeof categorizeBMI> | null;
  lastEvaluatedAt: Date | null;
  age: number;
}

export interface StudentDirectoryStats {
  totalStudents: number;
  activeMonitoring: number;
  activeMonitoringPercent: number;
  totalEvaluationsThisMonth: number;
  atRiskCount: number;
  studentGrowthPercent: number | null;
}

export interface SectionGroup {
  sectionId: string;
  sectionName: string;
  rows: StudentRow[];
}

const PAGE_SIZE = 10;

export function useStudentDirectory(students: Student[], globalRecords: BMIRecord[], sections: Section[] = []) {
  const [sectionFilter, setSectionFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female' | 'other'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPage(1);
  }, [sectionFilter, gradeFilter, genderFilter, statusFilter]);

  const sectionMap = useMemo(() => {
    const map = new Map<string, string>();
    sections.forEach(s => map.set(s.id, s.name));
    map.set(UNASSIGNED, 'Unassigned');
    return map;
  }, [sections]);

  const latestByStudent = useMemo(
    () => getLatestRecordPerStudent(globalRecords),
    [globalRecords]
  );

  const rows = useMemo((): StudentRow[] => {
    return students.map(student => {
      const latestRecord = latestByStudent.get(student.id) ?? null;
      const category = latestRecord ? categorizeBMI(latestRecord.bmi) : null;
      return {
        student,
        latestRecord,
        bmi: latestRecord?.bmi ?? null,
        category,
        lastEvaluatedAt: latestRecord?.timestamp?.toDate() ?? null,
        age: calculateAge(student.dob),
      };
    });
  }, [students, latestByStudent]);

  const stats = useMemo((): StudentDirectoryStats => {
    const totalStudents = students.length;
    const activeMonitoring = rows.filter(r => r.latestRecord).length;
    const monthStart = startOfMonth(new Date());
    const totalEvaluationsThisMonth = globalRecords.filter(r =>
      r.timestamp && r.timestamp.toDate() >= monthStart
    ).length;
    const atRiskCount = rows.filter(r =>
      r.category && (r.category.key === 'overweight' || r.category.key === 'obese')
    ).length;

    return {
      totalStudents,
      activeMonitoring,
      activeMonitoringPercent: totalStudents > 0 ? Math.round((activeMonitoring / totalStudents) * 100) : 0,
      totalEvaluationsThisMonth,
      atRiskCount,
      studentGrowthPercent: computeMonthOverMonthDelta(students),
    };
  }, [students, rows, globalRecords]);

  const grades = useMemo(() => {
    const set = new Set(students.map(s => s.grade || 'Unknown'));
    return Array.from(set).sort();
  }, [students]);

  const filteredRows = useMemo(() => {
    let result = rows.filter(row => {
      const { student, category, latestRecord } = row;
      const q = searchQuery.toLowerCase();
      const sid = student.sectionId || UNASSIGNED;

      if (q && !student.name.toLowerCase().includes(q) && !student.id.toLowerCase().includes(q)) return false;
      if (sectionFilter !== 'all' && sid !== sectionFilter) return false;
      if (gradeFilter !== 'all' && (student.grade || 'Unknown') !== gradeFilter) return false;
      if (genderFilter !== 'all' && student.gender !== genderFilter) return false;

      if (statusFilter === 'no-data' && latestRecord) return false;
      if (statusFilter !== 'all' && statusFilter !== 'no-data') {
        if (!category || category.key !== statusFilter) return false;
      }

      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.student.name.localeCompare(b.student.name);
      else if (sortField === 'bmi') cmp = (a.bmi ?? -1) - (b.bmi ?? -1);
      else if (sortField === 'lastEvaluation') {
        cmp = (a.lastEvaluatedAt?.getTime() ?? 0) - (b.lastEvaluatedAt?.getTime() ?? 0);
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [rows, searchQuery, sectionFilter, gradeFilter, genderFilter, statusFilter, sortField, sortAsc]);

  const groupedRows = useMemo((): SectionGroup[] => {
    const groups = new Map<string, StudentRow[]>();
    for (const row of filteredRows) {
      const sid = row.student.sectionId || UNASSIGNED;
      if (!groups.has(sid)) groups.set(sid, []);
      groups.get(sid)!.push(row);
    }

    const orderedSectionIds = [
      ...sections.map(s => s.id),
      ...(groups.has(UNASSIGNED) ? [UNASSIGNED] : []),
    ].filter(id => groups.has(id));

    return orderedSectionIds.map(sectionId => ({
      sectionId,
      sectionName: sectionMap.get(sectionId) ?? sectionId,
      rows: groups.get(sectionId) ?? [],
    }));
  }, [filteredRows, sections, sectionMap]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, currentPage]);

  const paginatedGroupedRows = useMemo((): SectionGroup[] => {
    const groups = new Map<string, StudentRow[]>();
    for (const row of paginatedRows) {
      const sid = row.student.sectionId || UNASSIGNED;
      if (!groups.has(sid)) groups.set(sid, []);
      groups.get(sid)!.push(row);
    }

    const orderedSectionIds = [
      ...sections.map(s => s.id),
      ...(groups.has(UNASSIGNED) ? [UNASSIGNED] : []),
    ].filter(id => groups.has(id));

    return orderedSectionIds.map(sectionId => ({
      sectionId,
      sectionName: sectionMap.get(sectionId) ?? sectionId,
      rows: groups.get(sectionId) ?? [],
    }));
  }, [paginatedRows, sections, sectionMap]);

  const sectionTotalCounts = useMemo(() => {
    const counts = new Map<string, number>();
    groupedRows.forEach(g => counts.set(g.sectionId, g.rows.length));
    return counts;
  }, [groupedRows]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(prev => !prev);
    else { setSortField(field); setSortAsc(true); }
  };

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const resetFilters = () => {
    setSectionFilter('all');
    setGradeFilter('all');
    setGenderFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
    setPage(1);
  };

  return {
    stats,
    grades,
    sections,
    sectionMap,
    filteredRows,
    groupedRows,
    paginatedGroupedRows,
    sectionTotalCounts,
    paginatedRows,
    totalPages,
    currentPage,
    pageSize: PAGE_SIZE,
    sectionFilter,
    setSectionFilter,
    gradeFilter,
    setGradeFilter,
    genderFilter,
    setGenderFilter,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    sortField,
    sortAsc,
    toggleSort,
    setPage,
    resetFilters,
    collapsedSections,
    toggleSectionCollapse,
  };
}

export function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Never';
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return format(date, 'MMM d, yyyy');
}

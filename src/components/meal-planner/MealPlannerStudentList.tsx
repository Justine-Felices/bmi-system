import { Fragment, useEffect, useMemo, useState } from 'react';
import { Search, User as UserIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getBMICategory, calculateAge } from '../../utils/bmi';
import { getLatestRecordPerStudent } from '../../utils/analytics';
import type { BMIRecord, Section, Student } from '../../types';
import { UNASSIGNED_SECTION_ID } from '../../types';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Pagination } from '../ui/Pagination';
import { StatusBadge } from '../students/StatusBadge';

const PAGE_SIZE = 10;

interface MealPlannerStudentListProps {
  students: Student[];
  sections: Section[];
  globalRecords: BMIRecord[];
  selectedStudentId: string | null;
  onSelectStudent: (id: string) => void;
}

interface StudentListItemProps {
  student: Student;
  record: BMIRecord | undefined;
  category: ReturnType<typeof getBMICategory> | null;
  selected: boolean;
  onSelect: () => void;
}

function StudentListItem({
  student,
  record,
  category,
  selected,
  onSelect,
}: StudentListItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors',
        selected
          ? 'bg-primary-light border border-primary/20'
          : 'hover:bg-surface border border-transparent',
      )}
    >
      <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center shrink-0 overflow-hidden">
        {student.photoUrl ? (
          <img src={student.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <UserIcon className="w-4 h-4 text-text-muted" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">{student.name}</p>
        <p className="text-[10px] text-text-muted">
          {calculateAge(student.dob)} yrs · BMI {record?.bmi ?? '—'}
        </p>
      </div>
      {category && <StatusBadge label={category.label} className="shrink-0" />}
    </button>
  );
}

export function MealPlannerStudentList({
  students,
  sections,
  globalRecords,
  selectedStudentId,
  onSelectStudent,
}: MealPlannerStudentListProps) {
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [sectionFilter, statusFilter]);

  const latestByStudent = useMemo(() => getLatestRecordPerStudent(globalRecords), [globalRecords]);

  const sectionMap = useMemo(() => {
    const map = new Map<string, string>();
    sections.forEach(s => map.set(s.id, s.name));
    map.set(UNASSIGNED_SECTION_ID, 'Unassigned');
    return map;
  }, [sections]);

  const filtered = useMemo(() => {
    return students.filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
      const sectionId = s.sectionId || UNASSIGNED_SECTION_ID;
      const matchSection = sectionFilter === 'all' || sectionId === sectionFilter;
      const record = latestByStudent.get(s.id);
      const category = record ? getBMICategory(record.bmi).label : 'No Data';
      const matchStatus = statusFilter === 'all'
        || (statusFilter === 'no-data' && !record)
        || category.toLowerCase() === statusFilter;
      return matchSearch && matchSection && matchStatus;
    });
  }, [students, search, sectionFilter, statusFilter, latestByStudent]);

  const orderedFiltered = useMemo(() => {
    if (sectionFilter !== 'all') {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }

    const groups = new Map<string, Student[]>();
    filtered.forEach(s => {
      const key = s.sectionId || UNASSIGNED_SECTION_ID;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    });

    const orderedIds = [
      ...sections.map(s => s.id),
      ...(groups.has(UNASSIGNED_SECTION_ID) ? [UNASSIGNED_SECTION_ID] : []),
    ].filter(id => groups.has(id));

    return orderedIds.flatMap(id =>
      groups.get(id)!.sort((a, b) => a.name.localeCompare(b.name)),
    );
  }, [filtered, sectionFilter, sections]);

  const sectionTotalCounts = useMemo(() => {
    const counts = new Map<string, number>();
    filtered.forEach(s => {
      const key = s.sectionId || UNASSIGNED_SECTION_ID;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(orderedFiltered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return orderedFiltered.slice(start, start + PAGE_SIZE);
  }, [orderedFiltered, currentPage]);

  const paginatedGrouped = useMemo(() => {
    if (sectionFilter !== 'all') return [];

    const groups = new Map<string, Student[]>();
    paginatedStudents.forEach(s => {
      const key = s.sectionId || UNASSIGNED_SECTION_ID;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    });

    const orderedIds = [
      ...sections.map(s => s.id),
      ...(groups.has(UNASSIGNED_SECTION_ID) ? [UNASSIGNED_SECTION_ID] : []),
    ].filter(id => groups.has(id));

    return orderedIds.map(id => ({
      sectionId: id,
      sectionName: sectionMap.get(id) || 'Unknown',
      students: groups.get(id) ?? [],
    }));
  }, [paginatedStudents, sectionFilter, sections, sectionMap]);

  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col h-full min-h-0 max-h-full xl:min-h-[400px]">
      <div className="p-4 border-b border-border space-y-3 shrink-0">
        <h2 className="text-sm font-bold text-text">Students</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search students..."
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} className="h-9 text-xs">
            <option value="all">All Sections</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            <option value={UNASSIGNED_SECTION_ID}>Unassigned</option>
          </Select>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 text-xs">
            <option value="all">All BMI</option>
            <option value="healthy">Healthy</option>
            <option value="underweight">Underweight</option>
            <option value="overweight">Overweight</option>
            <option value="obese">Obese</option>
            <option value="no-data">No Data</option>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4 scrollbar-thin min-h-0">
        {orderedFiltered.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">No students match filters</p>
        ) : sectionFilter === 'all' ? (
          paginatedGrouped.map(group => {
            const sectionTotal = sectionTotalCounts.get(group.sectionId) ?? group.students.length;
            return (
              <div key={group.sectionId}>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider px-2 mb-1">
                  {group.sectionName}{' '}
                  ({group.students.length}{sectionTotal > group.students.length ? ` of ${sectionTotal}` : ''})
                </p>
                <div className="space-y-1">
                  {group.students.map(student => {
                    const record = latestByStudent.get(student.id);
                    const category = record ? getBMICategory(record.bmi) : null;
                    return (
                      <Fragment key={student.id}>
                        <StudentListItem
                          student={student}
                          record={record}
                          category={category}
                          selected={selectedStudentId === student.id}
                          onSelect={() => onSelectStudent(student.id)}
                        />
                      </Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="space-y-1">
            {paginatedStudents.map(student => {
              const record = latestByStudent.get(student.id);
              const category = record ? getBMICategory(record.bmi) : null;
              return (
                <Fragment key={student.id}>
                  <StudentListItem
                    student={student}
                    record={record}
                    category={category}
                    selected={selectedStudentId === student.id}
                    onSelect={() => onSelectStudent(student.id)}
                  />
                </Fragment>
              );
            })}
          </div>
        )}
      </div>

      {orderedFiltered.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={orderedFiltered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          itemLabel="students"
        />
      )}
    </div>
  );
}

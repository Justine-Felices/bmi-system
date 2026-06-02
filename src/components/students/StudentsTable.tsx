import { Fragment } from 'react';
import { format } from 'date-fns';
import {
  ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, Search, User as UserIcon,
} from 'lucide-react';
import type { SectionGroup, StudentRow, SortField } from '../../hooks/useStudentDirectory';
import { formatRelativeTime } from '../../hooks/useStudentDirectory';
import { cn } from '../../lib/utils';
import type { Section } from '../../types';
import { UNASSIGNED_SECTION_ID } from '../../types';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { StatusBadge } from './StatusBadge';
import type { StatusFilter } from '../../hooks/useStudentDirectory';

interface StudentsTableProps {
  paginatedGroupedRows: SectionGroup[];
  sectionTotalCounts: Map<string, number>;
  paginatedRows: StudentRow[];
  selectedStudentId: string | null;
  onSelectStudent: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sectionFilter: string;
  onSectionFilterChange: (s: string) => void;
  sections: Section[];
  gradeFilter: string;
  onGradeFilterChange: (g: string) => void;
  genderFilter: string;
  onGenderFilterChange: (g: 'all' | 'male' | 'female' | 'other') => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (s: StatusFilter) => void;
  grades: string[];
  sortField: SortField;
  onToggleSort: (field: SortField) => void;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  collapsedSections: Set<string>;
  onToggleSectionCollapse: (sectionId: string) => void;
  groupView?: boolean;
}

interface StudentTableRowProps {
  row: StudentRow;
  selectedStudentId: string | null;
  onSelectStudent: (id: string) => void;
}

function StudentTableRow({
  row,
  selectedStudentId,
  onSelectStudent,
}: StudentTableRowProps) {
  const isSelected = selectedStudentId === row.student.id;
  const statusLabel = row.category?.label ?? 'No Data';

  return (
    <tr
      onClick={() => onSelectStudent(row.student.id)}
      className={cn(
        'cursor-pointer transition-colors',
        isSelected ? 'bg-primary-light/60 border-l-2 border-l-primary' : 'hover:bg-surface'
      )}
    >
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <input type="checkbox" className="rounded border-border" checked={isSelected} readOnly />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface overflow-hidden shrink-0 flex items-center justify-center">
            {row.student.photoUrl ? (
              <img src={row.student.photoUrl} alt={row.student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <UserIcon className="w-5 h-5 text-text-muted" />
            )}
          </div>
          <div>
            <p className="font-semibold text-text">{row.student.name}</p>
            <p className="text-xs text-text-muted">{row.student.id} · {row.student.grade || 'N/A'}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <p className="text-text">{row.age} yrs · {row.student.gender}</p>
      </td>
      <td className="px-4 py-3">
        {row.bmi !== null ? (
          <div className="flex items-center gap-2">
            <span className="font-bold text-text">{row.bmi}</span>
            <StatusBadge label={statusLabel} />
          </div>
        ) : (
          <StatusBadge label="No Data" />
        )}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <StatusBadge label={statusLabel} />
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        {row.lastEvaluatedAt ? (
          <>
            <p className="text-text">{format(row.lastEvaluatedAt, 'MMM d, yyyy')}</p>
            <p className="text-xs text-text-muted">{formatRelativeTime(row.lastEvaluatedAt)}</p>
          </>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <ChevronRight className={cn('w-4 h-4', isSelected ? 'text-primary' : 'text-slate-300')} />
      </td>
    </tr>
  );
}

export function StudentsTable({
  paginatedGroupedRows,
  sectionTotalCounts,
  paginatedRows,
  selectedStudentId,
  onSelectStudent,
  searchQuery,
  onSearchChange,
  sectionFilter,
  onSectionFilterChange,
  sections,
  gradeFilter,
  onGradeFilterChange,
  genderFilter,
  onGenderFilterChange,
  statusFilter,
  onStatusFilterChange,
  grades,
  sortField,
  onToggleSort,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  collapsedSections,
  onToggleSectionCollapse,
  groupView = true,
}: StudentsTableProps) {
  const startIdx = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalCount);

  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="search"
            placeholder="Search students..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-card"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={sectionFilter} onChange={e => onSectionFilterChange(e.target.value)} className="w-auto min-w-[130px] h-10 rounded-xl text-sm">
            <option value="all">All Sections</option>
            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            <option value={UNASSIGNED_SECTION_ID}>Unassigned</option>
          </Select>
          <Select value={gradeFilter} onChange={e => onGradeFilterChange(e.target.value)} className="w-auto min-w-[120px] h-10 rounded-xl text-sm">
            <option value="all">All Grades</option>
            {grades.map(g => <option key={g} value={g}>{g}</option>)}
          </Select>
          <Select value={genderFilter} onChange={e => onGenderFilterChange(e.target.value as 'all' | 'male' | 'female' | 'other')} className="w-auto min-w-[120px] h-10 rounded-xl text-sm">
            <option value="all">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </Select>
          <Select value={statusFilter} onChange={e => onStatusFilterChange(e.target.value as StatusFilter)} className="w-auto min-w-[120px] h-10 rounded-xl text-sm">
            <option value="all">All Statuses</option>
            <option value="normal">Normal</option>
            <option value="overweight">Overweight</option>
            <option value="obese">Obese</option>
            <option value="underweight">Underweight</option>
            <option value="no-data">No Data</option>
          </Select>
          <button onClick={() => onToggleSort(sortField)} className="h-10 w-10 flex items-center justify-center rounded-xl border border-border text-text-muted hover:bg-surface" title="Toggle sort">
            <ChevronsUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface text-text-muted text-xs font-semibold uppercase tracking-wide border-b border-border">
              <th className="px-4 py-3 w-10"><input type="checkbox" className="rounded border-border" disabled /></th>
              <th className="px-4 py-3 text-left">Student</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Info</th>
              <th className="px-4 py-3 text-left">BMI</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Status</th>
              <th className="px-4 py-3 text-left hidden sm:table-cell">Last Evaluation</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {totalCount === 0 ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-text-muted">No students match your filters</td></tr>
            ) : groupView && sectionFilter === 'all' ? (
              paginatedGroupedRows.map(group => {
                const collapsed = collapsedSections.has(group.sectionId);
                const sectionTotal = sectionTotalCounts.get(group.sectionId) ?? group.rows.length;
                return (
                  <Fragment key={group.sectionId}>
                    <tr key={`header-${group.sectionId}`} className="bg-surface">
                      <td colSpan={7} className="px-4 py-2">
                        <button
                          onClick={() => onToggleSectionCollapse(group.sectionId)}
                          className="flex items-center gap-2 text-sm font-bold text-text w-full text-left"
                        >
                          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                          {group.sectionName}
                          <span className="text-xs font-normal text-text-muted">
                            ({group.rows.length}{sectionTotal > group.rows.length ? ` of ${sectionTotal}` : ''})
                          </span>
                        </button>
                      </td>
                    </tr>
                    {!collapsed && group.rows.map(row => (
                      <Fragment key={row.student.id}>
                        <StudentTableRow row={row} selectedStudentId={selectedStudentId} onSelectStudent={onSelectStudent} />
                      </Fragment>
                    ))}
                  </Fragment>
                );
              })
            ) : (
              paginatedRows.map(row => (
                <Fragment key={row.student.id}>
                  <StudentTableRow row={row} selectedStudentId={selectedStudentId} onSelectStudent={onSelectStudent} />
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalCount > 0 && (
        <div className="px-4 py-3 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-text-muted">Showing {startIdx} to {endIdx} of {totalCount} students</p>
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} className="p-2 rounded-lg border border-border disabled:opacity-40 hover:bg-surface">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
              return (
                <button key={pageNum} onClick={() => onPageChange(pageNum)} className={cn('w-8 h-8 rounded-lg text-sm font-medium', currentPage === pageNum ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface')}>
                  {pageNum}
                </button>
              );
            })}
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages} className="p-2 rounded-lg border border-border disabled:opacity-40 hover:bg-surface">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

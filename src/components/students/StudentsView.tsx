import { useEffect, useState } from 'react';
import { Filter, FolderOpen, Plus, UserPlus2, FilePlus2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { db, doc, deleteDoc } from '../../firebase';
import { deleteStudentPhoto } from '../../lib/supabase';
import { useStudentDirectory } from '../../hooks/useStudentDirectory';
import type { Section, Student, BMIRecord, DeleteConfirmState } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { SectionManager } from '../sections/SectionManager';
import { StudentForm } from './StudentForm';
import { AddRecordForm } from './AddRecordForm';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { StudentsStatCards } from './StudentsStatCards';
import { StudentsTable } from './StudentsTable';
import { StudentDetailPanel } from './StudentDetailPanel';

interface StudentsViewProps {
  students: Student[];
  sections: Section[];
  selectedStudent: Student | null;
  setSelectedStudent: (s: Student | null) => void;
  records: BMIRecord[];
  globalRecords: BMIRecord[];
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  onCreateSection: (name: string, description: string) => Promise<void>;
  onUpdateSection: (section: Section) => Promise<void>;
  onDeleteSection: (sectionId: string) => Promise<void>;
  onNavigateToMealPlanner?: (studentId: string) => void;
}

export function StudentsView({
  students,
  sections,
  selectedStudent,
  setSelectedStudent,
  records,
  globalRecords,
  searchQuery: externalSearchQuery,
  onSearchQueryChange,
  onCreateSection,
  onUpdateSection,
  onDeleteSection,
  onNavigateToMealPlanner,
}: StudentsViewProps) {
  const directory = useStudentDirectory(students, globalRecords, sections);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(false);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteConfirmState | null>(null);
  const [showSectionManager, setShowSectionManager] = useState(false);

  useEffect(() => {
    if (externalSearchQuery !== undefined && externalSearchQuery !== directory.searchQuery) {
      directory.setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  const handleSearchChange = (q: string) => {
    directory.setSearchQuery(q);
    onSearchQueryChange?.(q);
  };

  const handleSelectStudent = (id: string) => {
    setSelectedStudent(students.find(s => s.id === id) ?? null);
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;
    const { type, id } = showDeleteConfirm;
    try {
      if (type === 'student') {
        const studentToDelete = students.find(s => s.id === id);
        if (studentToDelete?.photoUrl) {
          try { await deleteStudentPhoto(studentToDelete.photoUrl); } catch (e) { console.error(e); }
        }
        await deleteDoc(doc(db!, 'students', id));
        if (selectedStudent?.id === id) setSelectedStudent(null);
      } else if (type === 'record' && selectedStudent) {
        await deleteDoc(doc(db!, `students/${selectedStudent.id}/records`, id));
      }
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Removal Failure', error);
      alert('Failed to remove record');
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text">Students Directory</h1>
          <p className="text-sm text-text-muted mt-0.5">Manage and monitor student health records by section.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowSectionManager(true)} className="h-10 rounded-xl text-sm">
            <FolderOpen className="w-4 h-4 mr-2" /> Manage Sections
          </Button>
          <Button variant="outline" onClick={directory.resetFilters} className="h-10 rounded-xl text-sm">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
          <Button onClick={() => setShowAddStudent(true)} className="h-10 rounded-xl text-sm" disabled={sections.length === 0}>
            <Plus className="w-4 h-4 mr-2" /> Add Student
          </Button>
        </div>
      </div>

      {sections.length === 0 && (
        <div className="p-4 rounded-xl bg-accent-light border border-accent/30 text-sm text-amber-800">
          Create daycare sections (e.g. Daycare 1, Daycare 2) before adding students.
        </div>
      )}

      <StudentsStatCards stats={directory.stats} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className={selectedStudent ? 'xl:col-span-8 min-w-0' : 'xl:col-span-12 min-w-0'}>
          <StudentsTable
            paginatedGroupedRows={directory.paginatedGroupedRows}
            sectionTotalCounts={directory.sectionTotalCounts}
            paginatedRows={directory.paginatedRows}
            selectedStudentId={selectedStudent?.id ?? null}
            onSelectStudent={handleSelectStudent}
            searchQuery={directory.searchQuery}
            onSearchChange={handleSearchChange}
            sectionFilter={directory.sectionFilter}
            onSectionFilterChange={directory.setSectionFilter}
            sections={sections}
            gradeFilter={directory.gradeFilter}
            onGradeFilterChange={directory.setGradeFilter}
            genderFilter={directory.genderFilter}
            onGenderFilterChange={directory.setGenderFilter}
            statusFilter={directory.statusFilter}
            onStatusFilterChange={directory.setStatusFilter}
            grades={directory.grades}
            sortField={directory.sortField}
            onToggleSort={directory.toggleSort}
            currentPage={directory.currentPage}
            totalPages={directory.totalPages}
            totalCount={directory.filteredRows.length}
            pageSize={directory.pageSize}
            onPageChange={directory.setPage}
            collapsedSections={directory.collapsedSections}
            onToggleSectionCollapse={directory.toggleSectionCollapse}
          />
        </div>

        {selectedStudent && (
          <div className="hidden xl:block xl:col-span-4 sticky top-4 min-w-0">
            <StudentDetailPanel
              student={selectedStudent}
              records={records}
              onClose={() => setSelectedStudent(null)}
              onAddRecord={() => setShowAddRecord(true)}
              onEdit={() => setShowEditStudent(true)}
              onDelete={() => setShowDeleteConfirm({ type: 'student', id: selectedStudent.id })}
              onDeleteRecord={(recordId) => setShowDeleteConfirm({ type: 'record', id: recordId })}
              onViewMealPlan={onNavigateToMealPlanner ? () => onNavigateToMealPlanner(selectedStudent.id) : undefined}
            />
          </div>
        )}
      </div>

      {selectedStudent && (
        <div className="xl:hidden fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Close student details"
            onClick={() => setSelectedStudent(null)}
          />
          <div className="relative w-full max-w-md h-full max-h-[100dvh] shadow-2xl">
            <StudentDetailPanel
              student={selectedStudent}
              records={records}
              onClose={() => setSelectedStudent(null)}
              onAddRecord={() => setShowAddRecord(true)}
              onEdit={() => setShowEditStudent(true)}
              onDelete={() => setShowDeleteConfirm({ type: 'student', id: selectedStudent.id })}
              onDeleteRecord={(recordId) => setShowDeleteConfirm({ type: 'record', id: recordId })}
              onViewMealPlan={onNavigateToMealPlanner ? () => onNavigateToMealPlanner(selectedStudent.id) : undefined}
            />
          </div>
        </div>
      )}

      <AnimatePresence>
        {showSectionManager && (
          <SectionManager
            sections={sections}
            students={students}
            onCreate={onCreateSection}
            onUpdate={onUpdateSection}
            onDelete={onDeleteSection}
            onClose={() => setShowSectionManager(false)}
          />
        )}
        {showAddStudent && (
          <Modal
            onClose={() => setShowAddStudent(false)}
            title="Add New Student"
            subtitle="Enter student details to create a new profile."
            icon={<UserPlus2 className="w-5 h-5" />}
          >
            <StudentForm sections={sections} onSuccess={() => setShowAddStudent(false)} onCancel={() => setShowAddStudent(false)} />
          </Modal>
        )}
        {showEditStudent && selectedStudent && (
          <Modal
            onClose={() => setShowEditStudent(false)}
            title="Edit Student Profile"
            subtitle="Update student details and health notes."
            icon={<UserPlus2 className="w-5 h-5" />}
          >
            <StudentForm student={selectedStudent} sections={sections} onSuccess={() => setShowEditStudent(false)} onCancel={() => setShowEditStudent(false)} />
          </Modal>
        )}
        {showAddRecord && selectedStudent && (
          <Modal
            onClose={() => setShowAddRecord(false)}
            title={`New Record for ${selectedStudent.name}`}
            subtitle="Add a new height, weight, and BMI evaluation."
            icon={<FilePlus2 className="w-5 h-5" />}
          >
            <AddRecordForm studentId={selectedStudent.id} onSuccess={() => setShowAddRecord(false)} />
          </Modal>
        )}
        {showDeleteConfirm && (
          <DeleteConfirmModal onClose={() => setShowDeleteConfirm(null)} onConfirm={handleDelete} />
        )}
      </AnimatePresence>
    </div>
  );
}

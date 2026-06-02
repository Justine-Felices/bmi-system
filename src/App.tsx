/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { DashboardPage } from './components/dashboard/DashboardPage';
import { AccessDeniedScreen } from './components/auth/AccessDeniedScreen';
import { ConfigErrorScreen } from './components/auth/ConfigErrorScreen';
import { LoadingScreen } from './components/auth/LoadingScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { AppShell } from './components/layout/AppShell';
import { MealPlannerPage } from './components/meal-planner/MealPlannerPage';
import { StudentsView } from './components/students/StudentsView';
import { useDashboardData } from './hooks/useDashboardData';
import { useAuth } from './hooks/useAuth';
import { useGlobalRecords } from './hooks/useGlobalRecords';
import { useSections } from './hooks/useSections';
import { useStudentRecords } from './hooks/useStudentRecords';
import { useStudents } from './hooks/useStudents';
import type { ActiveTab, AgeFilter, DateFilter, GenderFilter } from './types';

export default function App() {
  const { user, isAdmin, loading, configError, setConfigError } = useAuth();
  const { students, selectedStudent, setSelectedStudent } = useStudents(isAdmin);
  const { sections, createSection, updateSection, deleteSection } = useSections(isAdmin);
  const records = useStudentRecords(selectedStudent?.id);
  const { globalRecords, loading: analyticsLoading, error: analyticsError } = useGlobalRecords(isAdmin);

  const [dateFilter, setDateFilter] = useState<DateFilter>('30d');
  const [genderFilter] = useState<GenderFilter>('all');
  const [ageFilter] = useState<AgeFilter>('all');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [mealPlannerStudentId, setMealPlannerStudentId] = useState<string | null>(null);

  const dashboardData = useDashboardData(students, globalRecords, dateFilter, genderFilter, ageFilter, sections);

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      setActiveTab('students');
    }
  };

  const handleViewAllEvaluations = () => {
    setActiveTab('students');
  };

  const handleNavigateToMealPlanner = (studentId: string) => {
    setMealPlannerStudentId(studentId);
    setActiveTab('mealPlanner');
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab !== 'mealPlanner') {
      setMealPlannerStudentId(null);
    }
  };

  if (configError) {
    return (
      <ConfigErrorScreen
        configError={configError}
        onDismiss={() => setConfigError(null)}
      />
    );
  }

  if (loading || (user && isAdmin === null)) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (isAdmin === false) {
    return <AccessDeniedScreen user={user} />;
  }

  return (
    <AppShell
      user={user}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onSearchSubmit={handleSearchSubmit}
    >
      {activeTab === 'dashboard' ? (
        <DashboardPage
          data={dashboardData}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          loading={analyticsLoading}
          error={analyticsError}
          onViewAllEvaluations={handleViewAllEvaluations}
        />
      ) : activeTab === 'mealPlanner' ? (
        <MealPlannerPage
          students={students}
          sections={sections}
          globalRecords={globalRecords}
          initialStudentId={mealPlannerStudentId}
        />
      ) : (
        <StudentsView
          students={students}
          sections={sections}
          selectedStudent={selectedStudent}
          setSelectedStudent={setSelectedStudent}
          records={records}
          globalRecords={globalRecords}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onCreateSection={createSection}
          onUpdateSection={updateSection}
          onDeleteSection={deleteSection}
          onNavigateToMealPlanner={handleNavigateToMealPlanner}
        />
      )}
    </AppShell>
  );
}

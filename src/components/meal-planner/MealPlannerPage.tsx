import { useEffect, useMemo, useState } from 'react';
import { Plus, Save, UtensilsCrossed } from 'lucide-react';
import { generateMealPlan, getLifestyleSuggestionsForCategory } from '../../services/ai';
import { useMealPlans, buildPlanDates, createDraftPlanId } from '../../hooks/useMealPlans';
import { useMealPlanComparison } from '../../hooks/useMealPlanComparison';
import { handleFirestoreError, OperationType } from '../../services/firestore-errors';
import { getLatestRecordPerStudent } from '../../utils/analytics';
import { getBMICategory, calculateAge } from '../../utils/bmi';
import type { BMIRecord, MealPlan, Section, Student } from '../../types';
import { Button } from '../ui/Button';
import { StatusBadge } from '../students/StatusBadge';
import { MealPlannerStudentList } from './MealPlannerStudentList';
import { MealPlanGenerator } from './MealPlanGenerator';
import { MealPlanEditor } from './MealPlanEditor';
import { MealPlanViewer, MealPlanReadOnlyView } from './MealPlanViewer';
import { MealPlanComparisonPanel } from './MealPlanComparison';
import { MealPlanConflictModal } from './MealPlanConflictModal';
import { findConflictingPlan, stripMealDaySuggestions } from '../../utils/meal-plans';
import { collectDietaryRestrictions, sanitizeMealPlanDays } from '../../utils/dietary-restrictions';

interface MealPlannerPageProps {
  students: Student[];
  sections: Section[];
  globalRecords: BMIRecord[];
  initialStudentId?: string | null;
}

type UiPhase = 'view' | 'create';

export function MealPlannerPage({
  students,
  sections,
  globalRecords,
  initialStudentId,
}: MealPlannerPageProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(initialStudentId ?? null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [uiPhase, setUiPhase] = useState<UiPhase>('view');
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('weekly');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [draftMeals, setDraftMeals] = useState<MealPlan['meals']>([]);
  const [draftNotes, setDraftNotes] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [draftPlanId, setDraftPlanId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [conflictPlan, setConflictPlan] = useState<MealPlan | null>(null);
  const [pendingSaveDates, setPendingSaveDates] = useState<{ startDate: string; endDate: string } | null>(null);

  const selectedStudent = students.find(s => s.id === selectedStudentId) ?? null;
  const { plans, savePlan, deletePlan } = useMealPlans(selectedStudentId);
  const studentRecords = useMemo(() => {
    if (!selectedStudentId) return [];
    return globalRecords
      .filter(r => r.studentId === selectedStudentId)
      .sort((a, b) => (b.timestamp?.toDate?.()?.getTime() ?? 0) - (a.timestamp?.toDate?.()?.getTime() ?? 0));
  }, [globalRecords, selectedStudentId]);

  const latestByStudent = useMemo(() => getLatestRecordPerStudent(globalRecords), [globalRecords]);
  const latestRecord = selectedStudentId ? latestByStudent.get(selectedStudentId) ?? null : null;
  const latestCategory = latestRecord ? getBMICategory(latestRecord.bmi) : null;

  const activePlan = selectedPlanId ? plans.find(p => p.id === selectedPlanId) ?? null : null;
  const dietaryRestrictions = useMemo(() => {
    if (!selectedStudent) return [];
    return collectDietaryRestrictions(selectedStudent, latestRecord?.healthIssues);
  }, [selectedStudent, latestRecord?.healthIssues]);
  const {
    comparison,
    loading: comparisonLoading,
    hasNewerRecord,
  } = useMealPlanComparison(selectedStudent, activePlan, studentRecords);

  useEffect(() => {
    if (initialStudentId) setSelectedStudentId(initialStudentId);
  }, [initialStudentId]);

  useEffect(() => {
    setSelectedPlanId(null);
    setDraftMeals([]);
    setDraftNotes('');
    setSuggestions([]);
    setDraftPlanId(null);
    setMode('view');
    setUiPhase('view');
    setSaveNotice(false);
  }, [selectedStudentId]);

  useEffect(() => {
    if (uiPhase !== 'view' || plans.length === 0) return;
    if (!selectedPlanId || !plans.some(p => p.id === selectedPlanId)) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, uiPhase, selectedPlanId]);

  const clearDraft = () => {
    setDraftMeals([]);
    setDraftNotes('');
    setSuggestions([]);
    setDraftPlanId(null);
    setMode('view');
  };

  const handleNewPlan = () => {
    clearDraft();
    setSelectedPlanId(null);
    setUiPhase('create');
    setSaveNotice(false);
  };

  const handleGenerate = async () => {
    if (!selectedStudent || !latestRecord || !latestCategory) {
      alert('Student needs at least one BMI evaluation before generating a meal plan.');
      return;
    }

    setGenerating(true);
    try {
      const meals = await generateMealPlan({
        student: selectedStudent,
        latestBmi: latestRecord.bmi,
        category: latestCategory.label,
        allergies: selectedStudent.allergies || [],
        healthIssues: latestRecord.healthIssues,
        age: calculateAge(selectedStudent.dob),
        periodType,
      });
      setDraftMeals(meals);
      setDraftPlanId(createDraftPlanId());
      setDraftNotes('');
      setSuggestions(
        getLifestyleSuggestionsForCategory(
          latestCategory.label,
          collectDietaryRestrictions(selectedStudent, latestRecord.healthIssues),
        ),
      );
      setMode('edit');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateUpdated = async () => {
    if (!selectedStudent || !latestRecord || !latestCategory) return;
    setUiPhase('create');
    setSelectedPlanId(null);
    setGenerating(true);
    try {
      const meals = await generateMealPlan({
        student: selectedStudent,
        latestBmi: latestRecord.bmi,
        category: latestCategory.label,
        allergies: selectedStudent.allergies || [],
        healthIssues: latestRecord.healthIssues,
        age: calculateAge(selectedStudent.dob),
        periodType: activePlan?.periodType || periodType,
      });
      setDraftMeals(meals);
      setDraftPlanId(createDraftPlanId());
      setDraftNotes('');
      setSuggestions(
        getLifestyleSuggestionsForCategory(
          latestCategory.label,
          collectDietaryRestrictions(selectedStudent, latestRecord.healthIssues),
        ),
      );
      setMode('edit');
    } finally {
      setGenerating(false);
    }
  };

  const performSave = async (targetPlanId: string, status: MealPlan['status'] = 'active') => {
    if (!selectedStudent || !latestRecord || !latestCategory || draftMeals.length === 0) return;

    setSaving(true);
    try {
      const dates = buildPlanDates(periodType, startDate);
      await savePlan(targetPlanId, {
        studentId: selectedStudent.id,
        periodType,
        ...dates,
        baselineBmi: latestRecord.bmi,
        baselineCategory: latestCategory.label,
        baselineRecordId: latestRecord.id,
        meals: stripMealDaySuggestions(
          sanitizeMealPlanDays(draftMeals, dietaryRestrictions),
        ),
        lifestyleTips: suggestions,
        status,
        notes: draftNotes || undefined,
      });

      if (draftPlanId && draftPlanId !== targetPlanId) {
        await deletePlan(draftPlanId);
      }

      clearDraft();
      setSelectedPlanId(targetPlanId);
      setUiPhase('view');
      setSaveNotice(true);
      setConflictPlan(null);
      setPendingSaveDates(null);
      requestAnimationFrame(() => {
        document.getElementById('meal-plan-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (error) {
      const info = handleFirestoreError(error, OperationType.CREATE, `students/${selectedStudent.id}/mealPlans`);
      alert(`Failed to save meal plan: ${info.error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = (status: MealPlan['status'] = 'active') => {
    if (!selectedStudent || !latestRecord || !latestCategory || draftMeals.length === 0 || !draftPlanId) return;

    const dates = buildPlanDates(periodType, startDate);
    const conflict = findConflictingPlan(plans, dates.startDate, dates.endDate);

    if (conflict) {
      setConflictPlan(conflict);
      setPendingSaveDates(dates);
      return;
    }

    void performSave(draftPlanId, status);
  };

  const handleConflictOverride = () => {
    if (!conflictPlan) return;
    void performSave(conflictPlan.id);
  };

  const handleConflictCancel = () => {
    setConflictPlan(null);
    setPendingSaveDates(null);
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    clearDraft();
    setUiPhase('view');
    setSaveNotice(false);
  };

  const handleDeletePlan = async (planId: string) => {
    await deletePlan(planId);
    if (selectedPlanId === planId) {
      const remaining = plans.filter(p => p.id !== planId);
      setSelectedPlanId(remaining[0]?.id ?? null);
      if (remaining.length === 0) setUiPhase('create');
    }
  };

  const showViewPanel = uiPhase === 'view' && (plans.length > 0 || activePlan);
  const showCreatePanel = uiPhase === 'create' || plans.length === 0;

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2">
          <UtensilsCrossed className="w-7 h-7 text-primary" />
          Meal Planner
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          AI-powered meal plans tailored to each student&apos;s BMI category and allergies.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-3 max-h-[45vh] xl:max-h-none overflow-hidden flex flex-col min-h-0">
          <MealPlannerStudentList
            students={students}
            sections={sections}
            globalRecords={globalRecords}
            selectedStudentId={selectedStudentId}
            onSelectStudent={setSelectedStudentId}
          />
        </div>

        <div className="xl:col-span-9 space-y-4">
          {!selectedStudent ? (
            <div className="p-12 rounded-2xl border border-dashed border-border text-center text-text-muted">
              Select a student to create or view meal plans.
            </div>
          ) : (
            <>
              <div className="p-4 rounded-2xl bg-card border border-border flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-text">{selectedStudent.name}</p>
                  <p className="text-xs text-text-muted">
                    {selectedStudent.id} · Age {calculateAge(selectedStudent.dob)}
                    {dietaryRestrictions.length > 0
                      ? ` · Health alerts: ${dietaryRestrictions.join(', ')}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {latestCategory && latestRecord && (
                    <div className="text-right mr-2">
                      <p className="text-xs text-text-muted">Latest BMI</p>
                      <p className="text-xl font-bold text-text">{latestRecord.bmi}</p>
                      <StatusBadge label={latestCategory.label} />
                    </div>
                  )}
                  {showViewPanel && (
                    <Button
                      variant="outline"
                      onClick={handleNewPlan}
                      className="h-9 rounded-xl text-sm shrink-0"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      New plan
                    </Button>
                  )}
                </div>
              </div>

              {saveNotice && (
                <p className="text-sm text-success font-medium px-1">Plan saved successfully.</p>
              )}

              {showViewPanel && (
                <div className="space-y-4">
                  <MealPlanViewer
                    plans={plans}
                    selectedPlanId={selectedPlanId}
                    onSelectPlan={handleSelectPlan}
                    onDeletePlan={handleDeletePlan}
                  />

                  {activePlan && <MealPlanReadOnlyView plan={activePlan} />}

                  {activePlan && hasNewerRecord && (
                    <MealPlanComparisonPanel
                      comparison={comparison}
                      loading={comparisonLoading}
                      onGenerateUpdatedPlan={handleGenerateUpdated}
                      generating={generating}
                    />
                  )}
                </div>
              )}

              {showCreatePanel && (
                <div className="space-y-4">
                  {plans.length > 0 && uiPhase === 'create' && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setUiPhase('view');
                        if (plans[0]) setSelectedPlanId(plans[0].id);
                      }}
                      className="h-8 text-sm text-text-muted"
                    >
                      ← Back to saved plan
                    </Button>
                  )}

                  {dietaryRestrictions.length > 0 && (
                    <div className="p-3 rounded-xl border border-danger/30 bg-danger-light/40 text-sm text-danger">
                      <span className="font-semibold">Health alerts active:</span>{' '}
                      {dietaryRestrictions.join(', ')}. Generated meals will exclude these ingredients.
                    </div>
                  )}

                  <MealPlanGenerator
                    periodType={periodType}
                    startDate={startDate}
                    onPeriodTypeChange={setPeriodType}
                    onStartDateChange={setStartDate}
                    onGenerate={handleGenerate}
                    generating={generating}
                    disabled={!latestRecord}
                  />

                  {mode === 'edit' && draftMeals.length > 0 && (
                    <div className="space-y-4 p-4 rounded-2xl bg-card border border-border">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-text">Edit Draft Plan</h3>
                        <Button onClick={() => handleSave('active')} disabled={saving} className="h-9 rounded-xl text-sm">
                          <Save className="w-4 h-4 mr-1.5" />
                          {saving ? 'Saving...' : 'Save Plan'}
                        </Button>
                      </div>
                      <MealPlanEditor
                        meals={draftMeals}
                        onChange={setDraftMeals}
                        notes={draftNotes}
                        onNotesChange={setDraftNotes}
                      />
                    </div>
                  )}

                  {mode === 'edit' && draftMeals.length > 0 && latestCategory && suggestions.length > 0 && (
                    <div className="p-4 rounded-2xl bg-card/80 backdrop-blur border border-border">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-sm font-bold text-text">Lifestyle tips</p>
                          <p className="text-xs text-text-muted mt-0.5">
                            General guidance for parents — apply any day this week ·{' '}
                            <span className="font-semibold text-text">{latestCategory.label}</span>
                          </p>
                        </div>
                        <StatusBadge label={latestCategory.label} />
                      </div>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {suggestions.slice(0, 6).map((s, i) => (
                          <div
                            key={`${i}-${s}`}
                            className="p-3 rounded-2xl bg-surface/70 border border-border text-sm text-text flex items-start gap-2"
                          >
                            <span className="mt-0.5 w-6 h-6 rounded-xl bg-primary-light text-primary flex items-center justify-center text-xs font-bold shrink-0">
                              {i + 1}
                            </span>
                            <span className="text-sm text-text-muted leading-relaxed">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {conflictPlan && pendingSaveDates && (
        <MealPlanConflictModal
          existingPlan={conflictPlan}
          newStartDate={pendingSaveDates.startDate}
          newEndDate={pendingSaveDates.endDate}
          saving={saving}
          onOverride={handleConflictOverride}
          onCancel={handleConflictCancel}
        />
      )}
    </div>
  );
}

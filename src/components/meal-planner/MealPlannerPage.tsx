import { useEffect, useMemo, useState } from 'react';
import { Save, UtensilsCrossed } from 'lucide-react';
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

interface MealPlannerPageProps {
  students: Student[];
  sections: Section[];
  globalRecords: BMIRecord[];
  initialStudentId?: string | null;
}

export function MealPlannerPage({
  students,
  sections,
  globalRecords,
  initialStudentId,
}: MealPlannerPageProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(initialStudentId ?? null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('weekly');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [draftMeals, setDraftMeals] = useState<MealPlan['meals']>([]);
  const [draftNotes, setDraftNotes] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [draftPlanId, setDraftPlanId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'view' | 'edit'>('view');

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
  const { comparison, loading: comparisonLoading } = useMealPlanComparison(
    selectedStudent,
    activePlan,
    studentRecords,
  );

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
  }, [selectedStudentId]);

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
        age: calculateAge(selectedStudent.dob),
        periodType,
      });
      setDraftMeals(meals);
      setDraftPlanId(createDraftPlanId());
      setDraftNotes('');
      setSuggestions(getLifestyleSuggestionsForCategory(latestCategory.label));
      setSelectedPlanId(null);
      setMode('edit');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateUpdated = async () => {
    if (!selectedStudent || !latestRecord || !latestCategory) return;
    setGenerating(true);
    try {
      const meals = await generateMealPlan({
        student: selectedStudent,
        latestBmi: latestRecord.bmi,
        category: latestCategory.label,
        allergies: selectedStudent.allergies || [],
        age: calculateAge(selectedStudent.dob),
        periodType: activePlan?.periodType || periodType,
      });
      setDraftMeals(meals);
      setDraftPlanId(createDraftPlanId());
      setDraftNotes('');
      setSuggestions(getLifestyleSuggestionsForCategory(latestCategory.label));
      setSelectedPlanId(null);
      setMode('edit');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (status: MealPlan['status'] = 'active') => {
    if (!selectedStudent || !latestRecord || !latestCategory || draftMeals.length === 0 || !draftPlanId) return;

    setSaving(true);
    try {
      const dates = buildPlanDates(periodType, startDate);
      await savePlan(draftPlanId, {
        studentId: selectedStudent.id,
        periodType,
        ...dates,
        baselineBmi: latestRecord.bmi,
        baselineCategory: latestCategory.label,
        baselineRecordId: latestRecord.id,
        meals: draftMeals,
        status,
        notes: draftNotes || undefined,
      });
      setSelectedPlanId(draftPlanId);
      setMode('view');
    } catch (error) {
      const info = handleFirestoreError(error, OperationType.CREATE, `students/${selectedStudent.id}/mealPlans`);
      alert(`Failed to save meal plan: ${info.error}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setDraftMeals([]);
    setDraftPlanId(null);
    setMode('view');
  };

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
                    {selectedStudent.allergies?.length ? ` · Allergies: ${selectedStudent.allergies.join(', ')}` : ''}
                  </p>
                </div>
                {latestCategory && latestRecord && (
                  <div className="text-right">
                    <p className="text-xs text-text-muted">Latest BMI</p>
                    <p className="text-xl font-bold text-text">{latestRecord.bmi}</p>
                    <StatusBadge label={latestCategory.label} />
                  </div>
                )}
              </div>

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

              {(mode === 'edit' ? draftMeals.length > 0 : !!activePlan) && latestCategory && suggestions.length > 0 && (
                <div className="p-4 rounded-2xl bg-card/80 backdrop-blur border border-border">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-bold text-text">Suggestions</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        Based on BMI status: <span className="font-semibold text-text">{latestCategory.label}</span>
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

              <MealPlanViewer
                plans={plans}
                selectedPlanId={selectedPlanId}
                onSelectPlan={handleSelectPlan}
                onDeletePlan={deletePlan}
              />

              {activePlan && mode === 'view' && (
                <MealPlanReadOnlyView plan={activePlan} />
              )}

              {activePlan && (
                <MealPlanComparisonPanel
                  comparison={comparison}
                  loading={comparisonLoading}
                  onGenerateUpdatedPlan={handleGenerateUpdated}
                  generating={generating}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
